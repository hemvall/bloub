import type { EnvironmentId } from '../scene/model'
import { bed, burst, rng, seedOf, tone, type Track } from './dsp'
/** Room tone per set: what a microphone would hear before anyone speaks. Deterministic, like the sets themselves. */
export function renderAmbience(out: Track, set: EnvironmentId, duration: number) {
  const random = rng(seedOf(set))
  switch (set) {
    case 'office-night':
      bed(out, { duration, gain: 0.05, filter: 'lowpass', freq: 160, wobble: 0.15, rate: 0.09 })
      bed(out, { duration, gain: 0.012, filter: 'bandpass', freq: 1200, q: 0.4, wobble: 0.5, rate: 0.23, seed: 2 })
      // A faraway car now and then.
      for (let t = random() * 6; t < duration; t += 5 + random() * 8)
        burst(out, { time: t, duration: 2.4, gain: 0.03, filter: 'lowpass', freq: 220, freqEnd: 120, attack: 1.2, decay: 0.5 })
      break
    case 'meeting-room':
      bed(out, { duration, gain: 0.03, filter: 'bandpass', freq: 900, q: 0.3, wobble: 0.1, rate: 0.17 })
      bed(out, { duration, gain: 0.025, filter: 'lowpass', freq: 110, seed: 3 })
      break
    case 'ai-lab':
      for (const [freq, detune] of [
        [55, 0],
        [82.4, 5],
        [110, -4]
      ] as const)
        tone(out, { freq, time: 0, duration, type: 'sine', gain: 0.045, attack: 1.5, release: 1.5, detune })
      for (let t = 1 + random() * 3; t < duration; t += 2 + random() * 4)
        tone(out, { freq: 1760 * (1 + Math.floor(random() * 3) * 0.5), time: t, duration: 0.25, type: 'sine', gain: 0.03, attack: 0.005, release: 0.2 })
      bed(out, { duration, gain: 0.015, filter: 'highpass', freq: 6000, wobble: 0.6, rate: 0.31 })
      break
    case 'night-bar':
      bed(out, { duration, gain: 0.06, filter: 'highpass', freq: 2500, wobble: 0.35, rate: 0.19 })
      bed(out, { duration, gain: 0.03, filter: 'lowpass', freq: 500, q: 0.5, wobble: 0.5, rate: 0.13, seed: 4 })
      break
    case 'rooftop':
      bed(out, { duration, gain: 0.07, filter: 'bandpass', freq: 400, q: 0.3, wobble: 0.7, rate: 0.08 })
      bed(out, { duration, gain: 0.02, filter: 'lowpass', freq: 90, wobble: 0.3, rate: 0.05, seed: 5 })
      break
    case 'stage':
      bed(out, { duration, gain: 0.03, filter: 'lowpass', freq: 200 })
      break
  }
}
