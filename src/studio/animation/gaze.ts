import * as T from 'three'
import type { CharacterData, GazeTarget, SceneData, Vec3 } from '../scene/model'
import { cameraAt, characterAt, ordered, smooth } from '../timeline/evaluate'
export type TargetResolver = (id: string, time: number) => Vec3 | undefined
function angles(
  scene: SceneData,
  data: CharacterData,
  target: GazeTarget,
  time: number,
  resolve: TargetResolver
) {
  const point =
    target.kind === 'camera'
      ? cameraAt(scene, time).position
      : target.kind === 'point'
        ? target.position
        : (resolve(target.id, time) ?? [0, 2, 0])
  const delta = new T.Vector3(...point).sub(
    new T.Vector3(...data.position).add(new T.Vector3(0, 1.55 * data.scale, 0))
  )
  delta.applyAxisAngle(new T.Vector3(0, 1, 0), -data.rotation[1])
  return [
    T.MathUtils.clamp(Math.atan2(delta.x, delta.z), -0.75, 0.75),
    T.MathUtils.clamp(Math.atan2(delta.y, Math.hypot(delta.x, delta.z)), -0.4, 0.4)
  ] as const
}
function eyesAt(scene: SceneData, original: CharacterData, time: number, resolve: TargetResolver) {
  const data = characterAt(scene, original, time)
  let from = original.gaze,
    to = original.gaze,
    changed = -10
  for (const e of ordered(
    scene.timeline.filter((e) => e.type === 'gaze' && e.character === original.id)
  )) {
    if (e.time > time) break
    if (e.type === 'gaze') {
      from = to
      to = e.target
      changed = e.time
    }
  }
  const a = angles(scene, data, from, time, resolve),
    b = angles(scene, data, to, time, resolve),
    blend = smooth(Math.min(1, Math.max(0, (time - changed) / 0.18)))
  return [a[0] + (b[0] - a[0]) * blend, a[1] + (b[1] - a[1]) * blend] as const
}
/** Analytic exponential response sampled from scene history, never previous rendered frame.
 * Eyes lead (180ms); head has a 450ms response. Random seeks and offline frames agree. */
export function gazeAt(
  scene: SceneData,
  data: CharacterData,
  time: number,
  resolve: TargetResolver
) {
  const eye = eyesAt(scene, data, time, resolve)
  let yaw = 0,
    pitch = 0,
    weight = 0
  for (let i = 0; i < 32; i++) {
    const age = i / 12,
      w = Math.exp(-age / 0.45),
      sample = eyesAt(scene, data, Math.max(0, time - age), resolve)
    yaw += sample[0] * w
    pitch += sample[1] * w
    weight += w
  }
  return {
    eyeYaw: eye[0],
    eyePitch: eye[1],
    headYaw: (yaw / weight) * 0.65,
    headPitch: (pitch / weight) * 0.55
  }
}
