import type { Aspect, CameraPose, Vec3 } from '../scene/model'
import type { Subject } from './presets'
/**
 * Shots: what a script asks for instead of camera keyframes. A shot is a
 * framing rule on a subject plus an optional movement; `shotPoses` turns it
 * into the start (and end) poses the compiler records as camera keys.
 */
export type ShotType = 'wide' | 'medium' | 'close-up' | 'over-shoulder' | 'profile' | 'two-shot'
export type ShotMovement = 'static' | 'slow-push' | 'push-in' | 'pull-out' | 'slow-pan'
export const SHOT_TYPES: ShotType[] = ['wide', 'medium', 'close-up', 'over-shoulder', 'profile', 'two-shot']
export const SHOT_MOVEMENTS: ShotMovement[] = ['static', 'slow-push', 'push-in', 'pull-out', 'slow-pan']
export const SHOT_LABELS: Record<ShotType, string> = {
  wide: 'Wide',
  medium: 'Medium',
  'close-up': 'Close-up',
  'over-shoulder': 'Over the shoulder',
  profile: 'Profile',
  'two-shot': 'Two-shot'
}
export function isShotType(value: string): value is ShotType {
  return (SHOT_TYPES as string[]).includes(value)
}
export function isShotMovement(value: string): value is ShotMovement {
  return (SHOT_MOVEMENTS as string[]).includes(value)
}
export interface ShotSubjects {
  target: Subject
  /** The second character: the foreground shoulder of an over-shoulder, the partner of a two-shot. */
  other?: Subject
  /** Where the set's establishing camera stands: tells a two-shot which side is "front". */
  front: Vec3
}
/**
 * A framing says what must fit in the frame, in metres: a height (the subject's
 * head and shoulders, body, or the whole set) and a width. The distance follows
 * from the lens and the frame's aspect, so a portrait close-up steps back on its
 * own instead of landing inside a wide head.
 */
interface Framing {
  height: number
  width: number
  fov: number
  /** Angle off the subject's facing, in radians: 0 is dead front, π/2 a full profile. */
  side: number
  /** Camera height above the eyes, as a fraction of the distance. */
  rise: number
  /** Aim point relative to the eyes. */
  aim: number
}
const FRAMINGS: Record<Exclude<ShotType, 'over-shoulder' | 'two-shot'>, Framing> = {
  wide: { height: 4.6, width: 4.6, fov: 42, side: 0.42, rise: 0.2, aim: -0.6 },
  medium: { height: 2.7, width: 2.3, fov: 38, side: 0.24, rise: 0.09, aim: -0.2 },
  'close-up': { height: 1.7, width: 1.6, fov: 32, side: 0.15, rise: 0.04, aim: 0 },
  profile: { height: 2.0, width: 1.8, fov: 36, side: 1.45, rise: 0.04, aim: -0.05 }
}
function local(subject: Subject, v: Vec3): Vec3 {
  const c = Math.cos(subject.yaw),
    s = Math.sin(subject.yaw)
  return [
    subject.position[0] + v[0] * c + v[2] * s,
    subject.position[1] + subject.eyeHeight + v[1],
    subject.position[2] - v[0] * s + v[2] * c
  ]
}
const eyes = (s: Subject): Vec3 => [s.position[0], s.position[1] + s.eyeHeight, s.position[2]]
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k]
function flat(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[2]) || 1
  return [v[0] / l, 0, v[2] / l]
}
const RATIO: Record<Aspect, number> = { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1 }
/** The distance at which both the wanted height and the wanted width fit the frame. */
function fit(height: number, width: number, fov: number, aspect: Aspect) {
  const halfTan = Math.tan((fov * Math.PI) / 360)
  return Math.max(height / (2 * halfTan), width / (2 * halfTan * RATIO[aspect]))
}
/** Portrait frames aim a little lower so the face sits in the upper third, above the subtitles. */
function portraitAim(aspect: Aspect) {
  return aspect === '9:16' ? -0.22 : aspect === '1:1' ? -0.1 : 0
}
function basePose(type: ShotType, subjects: ShotSubjects, aspect: Aspect, zoom = 1): CameraPose {
  const dy = portraitAim(aspect)
  if (type === 'two-shot' && subjects.other) {
    const a = eyes(subjects.target),
      b = eyes(subjects.other)
    const mid = mul(add(a, b), 0.5)
    const separation = Math.hypot(a[0] - b[0], a[2] - b[2])
    const forward = flat(sub(subjects.front, mid))
    const fov = aspect === '9:16' ? 44 : 38
    const distance = Math.max(3.4, fit(2.8, separation + 2.0, fov, aspect)) * zoom
    const position = add(add(mid, mul(forward, distance)), [0, 0.4, 0])
    return { position, target: add(mid, [0, -0.1 + dy * 0.5, 0]), fov }
  }
  if (type === 'over-shoulder' && subjects.other) {
    const target = eyes(subjects.target),
      shoulder = eyes(subjects.other)
    const back = flat(sub(shoulder, target))
    const side: Vec3 = [-back[2], 0, back[0]]
    const behind = (aspect === '9:16' ? 1.5 : 1.0) * zoom
    const position = add(add(add(shoulder, mul(back, behind)), mul(side, 0.6)), [0, 0.3, 0])
    return { position, target: add(target, [0, dy * 0.5, 0]), fov: 40 }
  }
  const f = FRAMINGS[type === 'two-shot' || type === 'over-shoulder' ? 'medium' : type]
  const d = fit(f.height, f.width, f.fov, aspect) * zoom
  const offset: Vec3 = [Math.sin(f.side) * d, f.rise * d, Math.cos(f.side) * d]
  return { position: local(subjects.target, offset), target: local(subjects.target, [0, f.aim + dy, 0]), fov: f.fov }
}
export function shotPoses(type: ShotType, movement: ShotMovement, subjects: ShotSubjects, aspect: Aspect): { start: CameraPose; end?: CameraPose } {
  const start = basePose(type, subjects, aspect)
  switch (movement) {
    case 'static':
      return { start }
    case 'slow-push':
      return { start, end: { ...basePose(type, subjects, aspect, 0.86), fov: start.fov - 1.5 } }
    case 'push-in':
      return { start, end: { ...basePose(type, subjects, aspect, 0.7), fov: start.fov - 3 } }
    case 'pull-out':
      return { start, end: { ...basePose(type, subjects, aspect, 1.32), fov: start.fov + 2 } }
    case 'slow-pan': {
      const dir = flat(sub(start.target, start.position))
      const side: Vec3 = [-dir[2], 0, dir[0]]
      return { start: { ...start, position: add(start.position, mul(side, -0.35)) }, end: { ...start, position: add(start.position, mul(side, 0.35)) } }
    }
  }
}
