import type { MusicTrack } from './plan'
import { add, bed, burst, delay, hat, hz, kick, lowpass, rng, seedOf, snare, tone, track, type Track } from './dsp'
/**
 * Procedural, royalty-free music beds rendered straight into samples. Each
 * track is a function of (duration, sample rate) and a fixed seed: the same
 * bytes every time. Placeholders with a pulse, not a soundtrack; an imported
 * file replaces them.
 */
type Chord = string[]
function bars(duration: number, bpm: number, bar: (barIndex: number, t: number, beat: number) => void) {
  const beat = 60 / bpm
  const barLength = beat * 4
  for (let b = 0; b * barLength < duration; b++) bar(b, b * barLength, beat)
}
function lofi(out: Track, duration: number) {
  const random = rng(seedOf('lofi'))
  const chords: Chord[] = [
    ['A2', 'E3', 'G3', 'C4'],
    ['D3', 'A3', 'C4', 'F4'],
    ['G2', 'F3', 'B3', 'D4'],
    ['C3', 'G3', 'B3', 'E4']
  ]
  const keys = track(duration, out.sampleRate)
  const drums = track(duration, out.sampleRate)
  bars(duration, 82, (i, t, beat) => {
    const chord = chords[i % chords.length]!
    const swing = beat * 0.08
    // Keys: the chord on the one, a softer stab on the and-of-three.
    chord.forEach((name, k) => {
      tone(keys, { freq: hz(name), time: t + k * 0.012, duration: beat * 2.6, type: 'triangle', gain: 0.16, attack: 0.02, release: 0.6, detune: random() * 8 - 4 })
      tone(keys, { freq: hz(name), time: t + beat * 2.5 + swing + k * 0.01, duration: beat * 1.2, type: 'triangle', gain: 0.1, attack: 0.02, release: 0.4 })
    })
    // Bass on the root.
    const root = hz(chord[0]!) / 2
    tone(out, { freq: root, time: t, duration: beat * 1.4, type: 'sine', gain: 0.32, attack: 0.01, release: 0.2 })
    tone(out, { freq: root, time: t + beat * 2.5 + swing, duration: beat * 0.9, type: 'sine', gain: 0.26, attack: 0.01, release: 0.15 })
    // Boom-bap: kick on 1 and the and-of-2, snare on 2 and 4, swung hats.
    kick(drums, t, 0.9)
    kick(drums, t + beat * 1.75 + swing, 0.6)
    snare(drums, t + beat, 0.42)
    snare(drums, t + beat * 3, 0.45)
    for (let h = 0; h < 8; h++) hat(drums, t + h * beat * 0.5 + (h % 2 ? swing : 0), h % 2 ? 0.07 : 0.11, h === 7 && i % 2 === 1)
    // Vinyl: a few clicks per bar.
    for (let c = 0; c < 3; c++) burst(out, { time: t + random() * beat * 4, duration: 0.012, gain: 0.08, filter: 'highpass', freq: 3000 })
  })
  lowpass(keys, 1400)
  add(out, keys, 0.55)
  add(out, drums, 0.7)
  bed(out, { duration, gain: 0.025, filter: 'lowpass', freq: 2500, wobble: 0.3, rate: 0.5 })
}
function pulse(out: Track, duration: number) {
  const random = rng(seedOf('pulse'))
  const chords: Chord[] = [
    ['F2', 'C3', 'F3', 'A3'],
    ['D2', 'A2', 'D3', 'F3'],
    ['A#1', 'F2', 'A#2', 'D3'],
    ['C2', 'G2', 'C3', 'E3']
  ]
  const pad = track(duration, out.sampleRate)
  const drums = track(duration, out.sampleRate)
  const pluck = track(duration, out.sampleRate)
  // Side-chain: the pad dips on every kick.
  const duck = new Float32Array(pad.data.length).fill(0.3)
  bars(duration, 112, (i, t, beat) => {
    const chord = chords[i % chords.length]!
    for (const name of chord.slice(1)) {
      tone(pad, { freq: hz(name), time: t, duration: beat * 4, type: 'sawtooth', gain: 0.1, attack: 0.08, release: 0.3, detune: 6 })
      tone(pad, { freq: hz(name), time: t, duration: beat * 4, type: 'sawtooth', gain: 0.1, attack: 0.08, release: 0.3, detune: -6 })
    }
    for (let b = 0; b < 4; b++) {
      const at = t + b * beat
      const from = Math.round(at * out.sampleRate),
        to = Math.min(duck.length, Math.round((at + beat * 0.45) * out.sampleRate))
      for (let n = from; n < to; n++) duck[n] = 0.08 + (0.22 * (n - from)) / Math.max(1, to - from)
      kick(drums, at, 0.9, 42)
      tone(out, { freq: hz(chord[0]!), time: at, duration: beat * 0.42, type: 'sawtooth', gain: 0.18, attack: 0.005, release: 0.08, lowpass: 420 })
      tone(out, { freq: hz(chord[0]!), time: at + beat * 0.5, duration: beat * 0.42, type: 'sawtooth', gain: 0.14, attack: 0.005, release: 0.08, lowpass: 420 })
    }
    snare(drums, t + beat, 0.35)
    snare(drums, t + beat * 3, 0.38)
    for (let h = 0; h < 16; h++) hat(drums, t + h * beat * 0.25, h % 4 === 2 ? 0.09 : 0.05)
    // Arpeggio on chord tones, one note skipped now and then.
    for (let s = 0; s < 16; s++) {
      if (random() < 0.18) continue
      const name = chord[(s + (i % 2)) % chord.length]!
      tone(pluck, { freq: hz(name) * 2, time: t + s * beat * 0.25, duration: beat * 0.22, type: 'triangle', gain: 0.12, attack: 0.003, release: 0.12 })
    }
  })
  lowpass(pad, 900)
  add(out, pad, duck)
  add(out, drums, 0.75)
  add(out, pluck, 0.35)
}
function ambient(out: Track, duration: number) {
  const random = rng(seedOf('ambient'))
  const chords: Chord[] = [
    ['D3', 'A3', 'F4', 'E5'],
    ['A#2', 'F3', 'D4', 'C5'],
    ['F3', 'C4', 'A4', 'G5'],
    ['G3', 'D4', 'A#4', 'F5']
  ]
  const pad = track(duration, out.sampleRate)
  const bells = track(duration, out.sampleRate)
  const period = 5.2
  for (let i = 0; i * period < duration; i++) {
    const chord = chords[i % chords.length]!
    const t = i * period
    for (const name of chord) {
      tone(pad, { freq: hz(name), time: t, duration: period + 1.5, type: 'sine', gain: 0.1, attack: 1.6, release: 1.8, detune: 4 })
      tone(pad, { freq: hz(name), time: t, duration: period + 1.5, type: 'triangle', gain: 0.04, attack: 1.8, release: 1.8, detune: -5, lowpass: 1200 })
    }
    for (let b = 0; b < 3; b++) {
      if (random() < 0.3) continue
      const name = chord[Math.floor(random() * chord.length)]!
      tone(bells, { freq: hz(name) * 2, time: t + random() * period, duration: 1.6, type: 'sine', gain: 0.16, attack: 0.004, release: 1.4 })
    }
  }
  add(pad, bells, 0.65)
  delay(pad, 0.42, 0.38, 0.35)
  add(out, pad, 0.28)
  bed(out, { duration, gain: 0.03, filter: 'lowpass', freq: 600, wobble: 0.4, rate: 0.07 })
}
export function renderMusic(out: Track, kind: MusicTrack, duration: number) {
  switch (kind) {
    case 'lofi':
      return lofi(out, duration)
    case 'pulse':
      return pulse(out, duration)
    case 'ambient':
      return ambient(out, duration)
    default:
      return
  }
}
