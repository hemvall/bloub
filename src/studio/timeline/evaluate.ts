import type { CameraPose, CharacterData, SceneData, TimelineEvent, Vec3 } from '../scene/model'
export const smooth = (t: number) => t * t * (3 - 2 * t)
export function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return a.map((v, i) => v + (b[i]! - v) * t) as Vec3
}
export function mixCamera(a: CameraPose, b: CameraPose, t: number): CameraPose {
  return {
    position: lerp3(a.position, b.position, t),
    target: lerp3(a.target, b.target, t),
    fov: a.fov + (b.fov - a.fov) * t
  }
}
export function ordered<T extends TimelineEvent>(events: T[]): T[] {
  return [...events].sort((a, b) => a.time - b.time)
}
export function sample<T>(
  keys: { time: number; value: T }[],
  base: T,
  time: number,
  mix: (a: T, b: T, t: number) => T
): T {
  const all = [{ time: 0, value: base }, ...keys].sort((a, b) => a.time - b.time)
  let previous = all[0]!
  for (const next of all.slice(1)) {
    if (next.time > time)
      return mix(
        previous.value,
        next.value,
        smooth(Math.max(0, (time - previous.time) / (next.time - previous.time)))
      )
    previous = next
  }
  return previous.value
}
export function cameraAt(scene: SceneData, time: number): CameraPose {
  return sample(
    scene.timeline.filter((e) => e.type === 'camera').map((e) => ({ time: e.time, value: e.pose })),
    scene.camera,
    time,
    mixCamera
  )
}
export function characterAt(
  scene: SceneData,
  character: CharacterData,
  time: number
): CharacterData {
  const events = ordered(
    scene.timeline.filter((e) => 'character' in e && e.character === character.id)
  )
  const result = {
    ...character,
    position: sample(
      events.filter((e) => e.type === 'position').map((e) => ({ time: e.time, value: e.position })),
      character.position,
      time,
      lerp3
    )
  }
  for (const e of events) {
    if (e.time > time) break
    if (e.type === 'expression') result.expression = e.expression
    if (e.type === 'gaze') result.gaze = e.target
  }
  return result
}
