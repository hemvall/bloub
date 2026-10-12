/** Pure time signals; no frame history or random calls, including blinks. */
export function idleAt(time: number, seed = 0) {
  const t = time + seed * 0.73
  const phase = ((t % 4.7) + 4.7) % 4.7
  const blink = 1 - Math.max(0, 1 - Math.abs(phase - 3.8) / 0.115) * 0.96
  return {
    breath: Math.sin(t * 1.65) * 0.018,
    drift: Math.sin(t * 0.67) * 0.025,
    tilt: Math.sin(t * 0.93) * 0.025,
    ear: Math.pow(Math.max(0, Math.sin(t * 0.82)), 18) * 0.17,
    blink,
    eye: Math.sin(t * 1.13) * 0.018
  }
}
