import type { SfxCue } from './plan'
import { burst, kick, tone, type Track } from './dsp'
/** Short-form punctuation: a whoosh on cuts, a riser into the punchline and a hit on it, a tick per caption chunk. */
export function renderSfx(out: Track, cue: SfxCue) {
  const t = cue.time,
    g = cue.gain
  switch (cue.kind) {
    case 'whoosh':
      burst(out, { time: t - 0.08, duration: 0.3, gain: g, filter: 'bandpass', freq: 500, freqEnd: 3200, q: 1.2, attack: 0.06, decay: 0.35 })
      break
    case 'riser':
      burst(out, { time: t, duration: 1.45, gain: g, filter: 'highpass', freq: 300, freqEnd: 5000, attack: 1.2, decay: 0.12 })
      tone(out, { freq: 110, time: t, duration: 1.4, type: 'sawtooth', gain: g * 0.15, attack: 1.2, release: 0.1, lowpass: 600 })
      break
    case 'hit':
      kick(out, t, g, 36)
      burst(out, { time: t, duration: 0.5, gain: g * 0.5, filter: 'lowpass', freq: 1800, freqEnd: 200 })
      break
    case 'tick':
      burst(out, { time: t, duration: 0.03, gain: g, filter: 'bandpass', freq: 2600, q: 3 })
      break
  }
}
