import type { ActionId, TimelineEvent } from '../scene/model'
/** Short procedural gestures: a curve from local progress `u` in [0, 1] to pose offsets added on top of idle. */
export interface ActionPose {
  headPitch: number
  headYaw: number
  headRoll: number
  bodyY: number
  bodyPitch: number
  squash: number
  lid: number
  open: number
  smile: number
  armRaise: number
  armSwing: number
  ears: number
  eyeY: number
}
export const ACTION_DURATION: Record<ActionId, number> = {
  sigh: 1.9,
  nod: 0.9,
  shake: 1.0,
  bounce: 0.75,
  wave: 1.6,
  think: 2.2,
  laugh: 1.4,
  listen: 0.7,
  blink: 0.32,
  doubleBlink: 0.6,
  emphasis: 0.5,
  leanIn: 2.4,
  leanBack: 2.4,
  tilt: 1.6
}
export const ACTION_LABELS: Record<ActionId, string> = {
  sigh: 'Sigh',
  nod: 'Nod',
  shake: 'Shake head',
  bounce: 'Bounce',
  wave: 'Wave',
  think: 'Think',
  laugh: 'Laugh',
  listen: 'Listen',
  blink: 'Blink',
  doubleBlink: 'Double blink',
  emphasis: 'Emphasis',
  leanIn: 'Lean in',
  leanBack: 'Lean back',
  tilt: 'Head tilt'
}
const ZERO: ActionPose = {
  headPitch: 0,
  headYaw: 0,
  headRoll: 0,
  bodyY: 0,
  bodyPitch: 0,
  squash: 0,
  lid: 0,
  open: 0,
  smile: 0,
  armRaise: 0,
  armSwing: 0,
  ears: 0,
  eyeY: 0
}
const ease = (u: number) => u * u * (3 - 2 * u)
const bump = (u: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, u))) ** 2
/** Ease in over `edge`, hold, ease out over `edge`. */
const hold = (u: number, edge: number) => ease(Math.min(1, u / edge)) * ease(Math.min(1, (1 - u) / edge))
function poseOf(action: ActionId, u: number): Partial<ActionPose> {
  switch (action) {
    case 'sigh': {
      const inhale = ease(Math.min(1, u / 0.35)),
        exhale = ease(Math.max(0, (u - 0.4) / 0.6))
      return {
        headPitch: -0.12 * inhale + 0.3 * exhale,
        bodyY: 0.05 * inhale - 0.07 * exhale,
        squash: 0.03 * inhale - 0.045 * exhale,
        lid: 0.4 * exhale,
        open: 0.35 * inhale * (1 - exhale * 0.6),
        ears: -0.4 * exhale
      }
    }
    case 'nod':
      return { headPitch: Math.sin(u * Math.PI * 2) * 0.22 * bump(u * 0.5 + 0.25) }
    case 'shake':
      return { headYaw: Math.sin(u * Math.PI * 3) * 0.3 * bump(u) }
    case 'bounce': {
      const air = bump(u)
      return {
        bodyY: air * 0.32,
        squash: u < 0.15 ? -0.18 * (u / 0.15) : u > 0.85 ? -0.14 * ((u - 0.85) / 0.15) : air * 0.08,
        ears: air * 0.6,
        smile: air * 0.4
      }
    }
    case 'wave': {
      const up = hold(u, 0.2)
      return {
        armRaise: up,
        armSwing: Math.sin(u * Math.PI * 5) * 0.5 * up,
        headRoll: 0.08 * up,
        smile: 0.5 * up
      }
    }
    case 'think': {
      const in_ = hold(u, 0.25)
      return {
        headRoll: 0.16 * in_,
        headPitch: -0.08 * in_,
        eyeY: 0.1 * in_,
        lid: 0.15 * in_,
        smile: -0.2 * in_
      }
    }
    case 'laugh': {
      const env = bump(u)
      return {
        headPitch: -0.1 * env + Math.sin(u * Math.PI * 8) * 0.05 * env,
        bodyY: Math.abs(Math.sin(u * Math.PI * 8)) * 0.04 * env,
        squash: Math.sin(u * Math.PI * 8) * 0.03 * env,
        lid: 0.55 * env,
        open: 0.5 * env,
        smile: 1 * env,
        ears: 0.3 * env
      }
    }
    // Conversational micro-gestures: small enough to layer under a line without reading as a beat.
    case 'listen':
      return { headPitch: Math.sin(u * Math.PI * 2) * 0.07 * bump(u), bodyY: -0.005 * bump(u) }
    case 'blink':
      return { lid: bump(u) }
    case 'doubleBlink':
      return { lid: Math.sin(u * Math.PI * 2) ** 2 }
    case 'emphasis':
      return { headPitch: 0.09 * bump(u), bodyY: -0.012 * bump(u) }
    case 'leanIn': {
      const env = hold(u, 0.18)
      return { bodyPitch: 0.16 * env, headPitch: -0.05 * env, bodyY: -0.02 * env }
    }
    case 'leanBack': {
      const env = hold(u, 0.18)
      return { bodyPitch: -0.12 * env, headPitch: 0.06 * env, lid: 0.1 * env }
    }
    case 'tilt': {
      const env = hold(u, 0.22)
      return { headRoll: 0.2 * env, headPitch: -0.04 * env, lid: 0.12 * env, ears: 0.3 * env }
    }
  }
}
/** Sum of the character's actions active at `time`; zero outside their windows. */
export function actionsAt(events: TimelineEvent[], character: string, time: number): ActionPose {
  const result = { ...ZERO }
  for (const e of events) {
    if (e.type !== 'action' || e.character !== character) continue
    const u = (time - e.time) / ACTION_DURATION[e.action]
    if (u < 0 || u >= 1) continue
    const p = poseOf(e.action, u)
    for (const key of Object.keys(ZERO) as (keyof ActionPose)[]) result[key] += p[key] ?? 0
  }
  return result
}
