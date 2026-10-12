/**
 * Plain-JS synthesis into sample buffers. No Web Audio graph: the offline
 * renderer of Chrome stalls at random under a few hundred scheduled nodes,
 * and samples computed here are the same in a test, a tab and a worker.
 * Everything adds into a mono `Track`; the mix converts it to stereo at the end.
 */
export interface Track {
  data: Float32Array
  sampleRate: number
}
export function track(seconds: number, sampleRate: number): Track {
  return { data: new Float32Array(Math.max(1, Math.ceil(seconds * sampleRate))), sampleRate }
}
/** mulberry32: a tiny seeded PRNG so a render is the same every time. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export function seedOf(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}
export type Wave = 'sine' | 'triangle' | 'sawtooth' | 'square'
function sample(wave: Wave, phase: number) {
  const p = phase - Math.floor(phase)
  switch (wave) {
    case 'sine':
      return Math.sin(p * 2 * Math.PI)
    case 'triangle':
      return 1 - 4 * Math.abs(p - 0.5)
    case 'sawtooth':
      return 2 * p - 1
    case 'square':
      return p < 0.5 ? 1 : -1
  }
}
/** RBJ biquad, recomputed when the frequency moves. */
class Biquad {
  private b0 = 1
  private b1 = 0
  private b2 = 0
  private a1 = 0
  private a2 = 0
  private x1 = 0
  private x2 = 0
  private y1 = 0
  private y2 = 0
  constructor(
    private readonly type: BiquadFilterType,
    private readonly sampleRate: number,
    private readonly q: number
  ) {}
  set(freq: number) {
    const f = Math.min(this.sampleRate * 0.45, Math.max(10, freq))
    const w = (2 * Math.PI * f) / this.sampleRate
    const cos = Math.cos(w),
      sin = Math.sin(w)
    const alpha = sin / (2 * this.q)
    let b0: number, b1: number, b2: number
    const a0 = 1 + alpha,
      a1 = -2 * cos,
      a2 = 1 - alpha
    switch (this.type) {
      case 'highpass':
        b0 = (1 + cos) / 2
        b1 = -(1 + cos)
        b2 = (1 + cos) / 2
        break
      case 'bandpass':
        b0 = alpha
        b1 = 0
        b2 = -alpha
        break
      default:
        b0 = (1 - cos) / 2
        b1 = 1 - cos
        b2 = (1 - cos) / 2
    }
    this.b0 = b0 / a0
    this.b1 = b1 / a0
    this.b2 = b2 / a0
    this.a1 = a1 / a0
    this.a2 = a2 / a0
  }
  run(x: number) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2
    this.x2 = this.x1
    this.x1 = x
    this.y2 = this.y1
    this.y1 = y
    return y
  }
}
export interface Tone {
  freq: number
  time: number
  duration: number
  type?: Wave
  gain?: number
  attack?: number
  release?: number
  /** Cents. */
  detune?: number
  lowpass?: number
}
/** One oscillator with a linear attack and release. */
export function tone(out: Track, t: Tone) {
  const sr = out.sampleRate
  const start = Math.round(t.time * sr),
    length = Math.round(t.duration * sr)
  if (length <= 0) return
  const g = t.gain ?? 0.2,
    attack = Math.max(1, Math.round((t.attack ?? 0.01) * sr)),
    release = Math.max(1, Math.round((t.release ?? 0.1) * sr))
  const freq = t.freq * 2 ** ((t.detune ?? 0) / 1200)
  const step = freq / sr
  const wave = t.type ?? 'sine'
  const k = t.lowpass ? 1 - Math.exp((-2 * Math.PI * t.lowpass) / sr) : 1
  let phase = 0,
    y = 0
  for (let i = 0; i < length; i++) {
    const n = start + i
    if (n < 0) {
      phase += step
      continue
    }
    if (n >= out.data.length) break
    const env = Math.min(1, i / attack, (length - i) / release)
    let v = sample(wave, phase)
    if (t.lowpass) {
      y += (v - y) * k
      v = y
    }
    out.data[n] = out.data[n]! + v * g * env
    phase += step
  }
}
export interface Burst {
  time: number
  duration: number
  gain?: number
  filter?: BiquadFilterType
  freq?: number
  freqEnd?: number
  q?: number
  attack?: number
  /** Decay time constant as a fraction of the duration (default a quarter). */
  decay?: number
}
/** Filtered noise with an attack and an exponential decay: hats, snares, whooshes, clicks. */
export function burst(out: Track, b: Burst) {
  const sr = out.sampleRate
  const start = Math.round(b.time * sr),
    length = Math.round(b.duration * sr)
  if (length <= 0) return
  const g = b.gain ?? 0.2,
    attack = Math.max(1, Math.round((b.attack ?? 0.003) * sr))
  const tau = Math.max(0.002, b.duration * (b.decay ?? 0.25)) * sr
  const random = rng(seedOf(`burst:${b.time.toFixed(4)}:${b.duration}`))
  const filter = new Biquad(b.filter ?? 'bandpass', sr, b.q ?? 0.8)
  const f0 = b.freq ?? 4000,
    f1 = b.freqEnd ?? f0
  filter.set(f0)
  for (let i = 0; i < length; i++) {
    const n = start + i
    if (i % 64 === 0 && f1 !== f0) filter.set(f0 + ((f1 - f0) * i) / length)
    const noise = filter.run(random() * 2 - 1)
    if (n < 0 || n >= out.data.length) continue
    const env = i < attack ? i / attack : Math.exp(-(i - attack) / tau)
    out.data[n] = out.data[n]! + noise * g * env
  }
}
/** A kick: a sine whose pitch drops, with an exponential decay. */
export function kick(out: Track, time: number, gain = 0.8, low = 48) {
  const sr = out.sampleRate
  const start = Math.round(time * sr),
    length = Math.round(0.35 * sr)
  let phase = 0
  for (let i = 0; i < length; i++) {
    const n = start + i
    const t = i / sr
    const freq = low + (160 - low) * Math.exp(-t / 0.035)
    phase += freq / sr
    if (n < 0 || n >= out.data.length) continue
    const env = Math.min(1, i / 8) * Math.exp(-t / 0.075)
    out.data[n] = out.data[n]! + Math.sin(phase * 2 * Math.PI) * gain * env
  }
}
export function snare(out: Track, time: number, gain = 0.5) {
  burst(out, { time, duration: 0.18, gain, filter: 'bandpass', freq: 1800, q: 0.6 })
  tone(out, { freq: 190, time, duration: 0.1, gain: gain * 0.5, release: 0.08 })
}
export function hat(out: Track, time: number, gain = 0.12, open = false) {
  burst(out, { time, duration: open ? 0.22 : 0.05, gain, filter: 'highpass', freq: 7000 })
}
export interface Bed {
  duration: number
  gain: number
  filter: BiquadFilterType
  freq: number
  q?: number
  wobble?: number
  rate?: number
  seed?: number
}
/** Steady filtered noise with a slow wobble: wind, hum, hiss, room tone. */
export function bed(out: Track, o: Bed) {
  const sr = out.sampleRate
  const length = Math.min(out.data.length, Math.round(o.duration * sr))
  const random = rng(o.seed ?? seedOf(`bed:${o.filter}:${o.freq}`))
  const filter = new Biquad(o.filter, sr, o.q ?? 0.7)
  filter.set(o.freq)
  const fade = Math.round(0.8 * sr)
  const rate = o.rate ?? 0.11
  for (let i = 0; i < length; i++) {
    const noise = filter.run(random() * 2 - 1)
    const env = Math.min(1, i / fade, (length - i) / fade)
    const wobble = o.wobble ? 1 + o.wobble * Math.sin((2 * Math.PI * rate * i) / sr) : 1
    out.data[i] = out.data[i]! + noise * o.gain * env * wobble
  }
}
/** A one-pole lowpass over a whole track, in place. */
export function lowpass(t: Track, freq: number) {
  const k = 1 - Math.exp((-2 * Math.PI * freq) / t.sampleRate)
  let y = 0
  for (let i = 0; i < t.data.length; i++) {
    y += (t.data[i]! - y) * k
    t.data[i] = y
  }
}
/** Feedback delay, in place: the wet signal is added on top of the dry one. */
export function delay(t: Track, seconds: number, feedback: number, wet: number) {
  const d = Math.round(seconds * t.sampleRate)
  if (d <= 0) return
  const line = new Float32Array(d)
  let pos = 0
  for (let i = 0; i < t.data.length; i++) {
    const delayed = line[pos]!
    line[pos] = t.data[i]! + delayed * feedback
    t.data[i] = t.data[i]! + delayed * wet
    pos = (pos + 1) % d
  }
}
/** Adds `src` into `dst` with a gain; the gain can be a curve with one value per sample. */
export function add(dst: Track, src: Track, gain: number | Float32Array) {
  const n = Math.min(dst.data.length, src.data.length)
  if (typeof gain === 'number') for (let i = 0; i < n; i++) dst.data[i] = dst.data[i]! + src.data[i]! * gain
  else for (let i = 0; i < n; i++) dst.data[i] = dst.data[i]! + src.data[i]! * gain[i]!
}
/** Adds a clip at `time`, resampling linearly when rates differ. */
export function place(dst: Track, clip: { sampleRate: number; samples: Float32Array }, time: number, gain: number) {
  const start = Math.round(time * dst.sampleRate)
  const ratio = clip.sampleRate / dst.sampleRate
  const length = Math.floor(clip.samples.length / ratio)
  for (let i = 0; i < length; i++) {
    const n = start + i
    if (n < 0) continue
    if (n >= dst.data.length) break
    const x = i * ratio,
      j = Math.floor(x),
      f = x - j
    const a = clip.samples[j] ?? 0,
      b = clip.samples[j + 1] ?? a
    dst.data[n] = dst.data[n]! + (a + (b - a) * f) * gain
  }
}
/** Soft limiter: keeps the sum of beds, voice and hits under the rail without pumping. */
export function limit(t: Track, drive = 1) {
  for (let i = 0; i < t.data.length; i++) t.data[i] = Math.tanh(t.data[i]! * drive)
}
export function peak(t: Track) {
  let p = 0
  for (let i = 0; i < t.data.length; i++) p = Math.max(p, Math.abs(t.data[i]!))
  return p
}
export const NOTE: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 }
/** Frequency of a note like "A3" or "F#4". */
export function hz(name: string) {
  const m = /^([A-G]#?)(-?\d)$/.exec(name)
  if (!m) throw new Error(`Bad note ${name}`)
  const semis = NOTE[m[1]!]! + (Number(m[2]) + 1) * 12
  return 440 * 2 ** ((semis - 69) / 12)
}
