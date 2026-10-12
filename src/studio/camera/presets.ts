import type { CameraPose, Vec3 } from '../scene/model'
export type PresetName = 'Wide' | 'Medium' | 'Close-up' | 'Profile' | 'Over-the-shoulder'
export const PRESET_NAMES: PresetName[] = [
  'Wide',
  'Medium',
  'Close-up',
  'Profile',
  'Over-the-shoulder'
]
export interface Subject {
  position: Vec3
  /** Rotation Y in radians; 0 faces +Z. */
  yaw: number
  eyeHeight: number
}
/** Offsets in the subject's frame: +z in front, +x to its right, +y up. */
interface Framing {
  offset: Vec3
  aim: Vec3
  fov: number
}
const FRAMINGS: Record<PresetName, Framing> = {
  Wide: { offset: [3.2, 1.6, 7.5], aim: [0, -0.6, 0], fov: 42 },
  Medium: { offset: [1.1, 0.45, 4.2], aim: [0, -0.15, 0], fov: 38 },
  'Close-up': { offset: [0.35, 0.12, 2.1], aim: [0, 0.02, 0], fov: 32 },
  Profile: { offset: [3.6, 0.2, 0.3], aim: [0, -0.05, 0], fov: 36 },
  'Over-the-shoulder': { offset: [-1.3, 0.7, -1.9], aim: [0.6, -0.35, 2.2], fov: 46 }
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
/** A preset is a framing rule, not a position: it follows the subject wherever it stands. */
export function presetPose(name: PresetName, subject: Subject): CameraPose {
  const f = FRAMINGS[name]
  return { position: local(subject, f.offset), target: local(subject, f.aim), fov: f.fov }
}
export function isPresetName(value: string): value is PresetName {
  return (PRESET_NAMES as string[]).includes(value)
}
