import { ENVELOPE_RATE, type CameraPose, type CharacterData, type SceneData, type TimelineEvent, type Vec3 } from '../scene/model'
import { CHARACTERS } from '../characters/catalog'
import { FACES, mixFaces, type FaceParams } from '../animation/expressions'
import type { Subject } from '../camera/presets'
export const smooth = (t: number) => t * t * (3 - 2 * t)
export function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
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
/** Samples keys with the base value at t=0 and a hold after the last key. */
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
      return next.time === previous.time
        ? previous.value
        : mix(
            previous.value,
            next.value,
            smooth(Math.max(0, (time - previous.time) / (next.time - previous.time)))
          )
    previous = next
  }
  return previous.value
}
/** Camera keys ease between each other, except that a key marked `cut` holds the previous pose until its time. */
export function cameraAt(scene: SceneData, time: number): CameraPose {
  let previous: { time: number; pose: CameraPose } = { time: 0, pose: scene.camera }
  for (const e of ordered(scene.timeline)) {
    if (e.type !== 'camera') continue
    if (e.time > time) {
      if (e.cut || e.time === previous.time) return previous.pose
      return mixCamera(previous.pose, e.pose, smooth(Math.max(0, (time - previous.time) / (e.time - previous.time))))
    }
    previous = e
  }
  return previous.pose
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
const FACE_BLEND = 0.35
/** Expression mid-blend: face changes never jump. */
export function faceAt(scene: SceneData, character: CharacterData, time: number): FaceParams {
  let from = character.expression,
    to = character.expression,
    changed = -10
  for (const e of ordered(scene.timeline)) {
    if (e.time > time) break
    if (e.type === 'expression' && e.character === character.id) {
      from = to
      to = e.expression
      changed = e.time
    }
  }
  return mixFaces(FACES[from], FACES[to], smooth(Math.min(1, (time - changed) / FACE_BLEND)))
}
export interface ActiveDialogue {
  character: CharacterData
  line: Extract<TimelineEvent, { type: 'dialogue' }>
  text: string
  progress: number
  since: number
  remaining: number
}
export function dialogueAt(scene: SceneData, time: number): ActiveDialogue[] {
  const result: ActiveDialogue[] = []
  for (const e of ordered(scene.timeline)) {
    if (e.type !== 'dialogue' || time < e.time || time >= e.time + e.duration) continue
    const character = scene.characters.find((c) => c.id === e.character)
    if (character)
      result.push({
        character,
        line: e,
        text: e.text,
        progress: (time - e.time) / e.duration,
        since: time - e.time,
        remaining: e.time + e.duration - time
      })
  }
  return result
}
export function speakingAt(scene: SceneData, character: string, time: number) {
  return scene.timeline.some(
    (e) =>
      e.type === 'dialogue' &&
      e.character === character &&
      time >= e.time &&
      time < e.time + e.duration
  )
}
/**
 * How loud the character is at `time`: 0 when silent, the clip's envelope when a
 * voice was generated, 1 when a line is timed by reading speed (the rig then
 * fakes the mouth). Linear between envelope samples so the mouth never steps.
 */
export function speechLevelAt(scene: SceneData, character: string, time: number) {
  for (const e of scene.timeline) {
    if (e.type !== 'dialogue' || e.character !== character || time < e.time || time >= e.time + e.duration) continue
    if (!e.envelope?.length) return 1
    const x = (time - e.time) * ENVELOPE_RATE
    const i = Math.min(e.envelope.length - 1, Math.floor(x))
    const a = e.envelope[i] ?? 0,
      b = e.envelope[Math.min(e.envelope.length - 1, i + 1)] ?? a
    return a + (b - a) * (x - i)
  }
  return 0
}
export function eyeHeight(character: CharacterData) {
  return CHARACTERS[character.kind].eyeHeight * character.scale
}
/** What gazes and framings aim at: the character's eyes at its current position. */
export function eyesOf(scene: SceneData, character: CharacterData, time: number): Vec3 {
  const p = characterAt(scene, character, time).position
  return [p[0], p[1] + eyeHeight(character), p[2]]
}
export function subjectOf(scene: SceneData, character: CharacterData, time: number): Subject {
  return {
    position: characterAt(scene, character, time).position,
    yaw: character.rotation[1],
    eyeHeight: eyeHeight(character)
  }
}
/** ~2.6 words per second, never under 1.2 s. */
export function readingTime(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1.2, Math.round((0.6 + words / 2.6) * 10) / 10)
}
