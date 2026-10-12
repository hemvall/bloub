import type { CharacterData, GazeTarget, SceneData, TimelineEvent, Vec3 } from '../scene/model'
import { cameraAt, characterAt, eyeHeight, ordered, smooth } from '../timeline/evaluate'
export type TargetResolver = (id: string, time: number) => Vec3 | undefined
export interface Gaze {
  eyeYaw: number
  eyePitch: number
  headYaw: number
  headPitch: number
}
const EYE_YAW = 0.75,
  EYE_PITCH = 0.42,
  EYE_BLEND = 0.18,
  HEAD_TAU = 0.45,
  HEAD_SAMPLES = 32,
  HEAD_STEP = 1 / 12
function angles(
  scene: SceneData,
  data: CharacterData,
  target: GazeTarget,
  time: number,
  resolve: TargetResolver
): [number, number] {
  const point =
    target.kind === 'camera'
      ? cameraAt(scene, time).position
      : target.kind === 'point'
        ? target.position
        : (resolve(target.id, time) ?? [0, 2, 0])
  const dx = point[0] - data.position[0],
    dy = point[1] - (data.position[1] + eyeHeight(data)),
    dz = point[2] - data.position[2]
  const c = Math.cos(-data.rotation[1]),
    s = Math.sin(-data.rotation[1])
  const lx = dx * c + dz * s,
    lz = -dx * s + dz * c
  return [
    clamp(Math.atan2(lx, lz), -EYE_YAW, EYE_YAW),
    clamp(Math.atan2(dy, Math.hypot(lx, lz)), -EYE_PITCH, EYE_PITCH)
  ]
}
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
function eyesAt(
  scene: SceneData,
  original: CharacterData,
  gazeEvents: TimelineEvent[],
  time: number,
  resolve: TargetResolver
): [number, number] {
  const data = characterAt(scene, original, time)
  let from = original.gaze,
    to = original.gaze,
    changed = -10
  for (const e of gazeEvents) {
    if (e.time > time) break
    if (e.type === 'gaze') {
      from = to
      to = e.target
      changed = e.time
    }
  }
  const a = angles(scene, data, from, time, resolve),
    b = angles(scene, data, to, time, resolve),
    blend = smooth(clamp((time - changed) / EYE_BLEND, 0, 1))
  return [a[0] + (b[0] - a[0]) * blend, a[1] + (b[1] - a[1]) * blend]
}
/**
 * Eyes lead (180 ms), the head follows with inertia (450 ms). The inertia is not
 * state: it is a weighted average of the recent gaze history recomputed from the
 * document, so seeks and offline frames match continuous playback exactly.
 */
export function gazeAt(
  scene: SceneData,
  data: CharacterData,
  time: number,
  resolve: TargetResolver
): Gaze {
  const gazeEvents = ordered(
    scene.timeline.filter((e) => e.type === 'gaze' && e.character === data.id)
  )
  const eye = eyesAt(scene, data, gazeEvents, time, resolve)
  let yaw = 0,
    pitch = 0,
    weight = 0
  for (let i = 0; i < HEAD_SAMPLES; i++) {
    const age = i * HEAD_STEP,
      w = Math.exp(-age / HEAD_TAU),
      s = eyesAt(scene, data, gazeEvents, Math.max(0, time - age), resolve)
    yaw += s[0] * w
    pitch += s[1] * w
    weight += w
  }
  return {
    eyeYaw: eye[0],
    eyePitch: eye[1],
    headYaw: (yaw / weight) * 0.65,
    headPitch: (pitch / weight) * 0.55
  }
}
