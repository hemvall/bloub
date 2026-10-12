import type { Expression } from '../scene/model'
/** Continuous face parameters, so expressions can be blended and each rig interprets them with its own geometry. */
export interface FaceParams {
  /** Upper lid drop, 0 open to 1 closed. */
  lid: number
  /** Lid tilt: positive frowns inward, negative droops outward. */
  lidTilt: number
  /** +1 smile, -1 pout. */
  smile: number
  open: number
  pupil: number
  /** Positive perks the ears up, negative flattens them. */
  ears: number
}
export const FACES: Record<Expression, FaceParams> = {
  neutral: { lid: 0.12, lidTilt: 0, smile: 0.1, open: 0, pupil: 1, ears: 0 },
  tired: { lid: 0.42, lidTilt: 0.18, smile: -0.25, open: 0, pupil: 0.92, ears: -0.25 },
  curious: { lid: 0, lidTilt: -0.1, smile: 0.25, open: 0.18, pupil: 1.18, ears: 0.35 },
  happy: { lid: 0.22, lidTilt: -0.22, smile: 1, open: 0.12, pupil: 1.05, ears: 0.2 },
  sad: { lid: 0.3, lidTilt: -0.4, smile: -0.8, open: 0, pupil: 1.1, ears: -0.55 },
  surprised: { lid: -0.08, lidTilt: -0.05, smile: 0, open: 0.75, pupil: 0.8, ears: 0.5 },
  annoyed: { lid: 0.34, lidTilt: 0.42, smile: -0.55, open: 0, pupil: 0.9, ears: -0.15 },
  confused: { lid: 0.16, lidTilt: 0.16, smile: -0.15, open: 0.16, pupil: 1.1, ears: 0.15 },
  deadpan: { lid: 0.38, lidTilt: 0.05, smile: -0.05, open: 0, pupil: 0.95, ears: -0.1 },
  smug: { lid: 0.3, lidTilt: 0.22, smile: 0.55, open: 0, pupil: 0.9, ears: 0.1 }
}
export function mixFaces(a: FaceParams, b: FaceParams, t: number): FaceParams {
  const m = (x: number, y: number) => x + (y - x) * t
  return {
    lid: m(a.lid, b.lid),
    lidTilt: m(a.lidTilt, b.lidTilt),
    smile: m(a.smile, b.smile),
    open: m(a.open, b.open),
    pupil: m(a.pupil, b.pupil),
    ears: m(a.ears, b.ears)
  }
}
