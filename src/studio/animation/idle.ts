/** Idle life as pure functions of time. Periods are coprime so the mix never visibly repeats. */
export interface IdleSignals {
  breath: number
  sway: number
  headYaw: number
  headPitch: number
  headRoll: number
  ear: number
  blink: number
  eyeX: number
  eyeY: number
  shift: number
}
export function idleAt(time: number, seed = 0): IdleSignals {
  const t = time + seed * 2.137
  const cycle = 4.3 + (seed % 3) * 0.37
  const phase = ((t % cycle) + cycle) % cycle
  // Fast close, slightly slower reopen; every third cycle gets a double blink.
  const closing = Math.max(0, 1 - Math.abs(phase - cycle * 0.78) / 0.07)
  const opening = Math.max(0, 1 - Math.abs(phase - cycle * 0.78 - 0.07) / 0.11)
  const blink = 1 - Math.min(1, closing + opening * 0.85) * 0.97
  const second =
    Math.floor(t / cycle) % 3 === 1
      ? Math.max(0, 1 - Math.abs(phase - cycle * 0.78 - 0.26) / 0.09) * 0.9
      : 0
  return {
    breath: Math.sin(t * 1.47) * 0.014 + Math.sin(t * 0.31) * 0.004,
    sway: Math.sin(t * 0.53) * 0.022 + Math.sin(t * 0.21 + 1) * 0.01,
    headYaw: Math.sin(t * 0.37) * 0.05 + Math.sin(t * 0.91 + 2) * 0.018,
    headPitch: Math.sin(t * 0.43 + 0.7) * 0.03,
    headRoll: Math.sin(t * 0.29 + 1.3) * 0.03,
    ear: Math.pow(Math.max(0, Math.sin(t * 0.71 + seed)), 24) * 0.22,
    blink: Math.min(blink, 1 - second),
    eyeX: Math.sin(t * 0.83) * 0.012 + Math.sin(t * 2.3) * 0.004,
    eyeY: Math.sin(t * 0.67 + 0.5) * 0.008,
    shift: Math.sin(t * 0.17) * 0.015
  }
}
