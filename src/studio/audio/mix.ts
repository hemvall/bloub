import type { MixPlan } from './plan'
import { add, limit, place, track } from './dsp'
import { renderMusic } from './music'
import { renderAmbience } from './ambience'
import { renderSfx } from './sfx'
/**
 * Renders a mix plan into samples. Pure JS: the same bytes in a test, in the
 * preview and in the MP4. Voice clips and imported music are looked up by hash;
 * missing ones are reported, never faked. `renderMix` wraps the result in an
 * AudioBuffer for the browser.
 */
export interface Clip {
  sampleRate: number
  /** Mono samples. */
  samples: Float32Array
}
export type ClipLookup = (hash: string) => Promise<Clip | undefined>
export interface MixSamples {
  samples: Float32Array
  sampleRate: number
  missing: string[]
}
export async function renderMixSamples(plan: MixPlan, clips: ClipLookup): Promise<MixSamples> {
  const master = track(plan.duration, plan.sampleRate)
  const missing: string[] = []
  if (plan.music.track !== 'none') {
    const music = track(plan.duration, plan.sampleRate)
    if (plan.music.track === 'custom') {
      const clip = plan.music.custom && (await clips(plan.music.custom.hash))
      if (clip) {
        const clipSeconds = clip.samples.length / clip.sampleRate
        for (let at = 0; at < plan.duration; at += clipSeconds) place(music, clip, at, 1)
      } else missing.push(plan.music.custom ? `music:${plan.music.custom.name}` : 'music:none')
    } else renderMusic(music, plan.music.track, plan.duration)
    add(master, music, duckCurve(plan))
  }
  if (plan.ambience) {
    const amb = track(plan.duration, plan.sampleRate)
    renderAmbience(amb, plan.ambience.set, plan.duration)
    add(master, amb, plan.ambience.volume)
  }
  for (const cue of plan.sfx) renderSfx(master, cue)
  for (const cue of plan.voice) {
    const clip = await clips(cue.hash)
    if (!clip) {
      missing.push(`voice:${cue.lineId}`)
      continue
    }
    place(master, clip, cue.start, cue.gain)
  }
  limit(master, 1.1)
  return { samples: master.data, sampleRate: plan.sampleRate, missing }
}
/** Music gain per sample: the base level, dipped under each voice window with short slopes, faded at the end. */
function duckCurve(plan: MixPlan) {
  const sr = plan.sampleRate
  const n = Math.ceil(plan.duration * sr)
  const base = plan.music.volume
  const curve = new Float32Array(n).fill(base)
  const ducked = base * (1 - plan.ducking)
  const inSlope = Math.round(0.12 * sr),
    outSlope = Math.round(0.45 * sr)
  for (const d of plan.ducks) {
    const start = Math.max(0, Math.round((d.start - 0.12) * sr)),
      end = Math.min(n, Math.round((d.end + 0.2) * sr))
    for (let i = start; i < end; i++) curve[i] = ducked
    for (let i = 0; i < inSlope && start - i - 1 >= 0; i++) curve[start - i - 1] = Math.min(curve[start - i - 1]!, ducked + (base - ducked) * (i / inSlope))
    for (let i = 0; i < outSlope && end + i < n; i++) curve[end + i] = Math.min(curve[end + i]!, ducked + (base - ducked) * (i / outSlope))
  }
  const fade = Math.round(0.6 * sr)
  for (let i = 0; i < fade && n - 1 - i >= 0; i++) curve[n - 1 - i] = curve[n - 1 - i]! * (i / fade)
  return curve
}
export interface MixResult {
  buffer: AudioBuffer
  missing: string[]
}
/** Browser entry: the samples as a stereo AudioBuffer, for the preview player and the exporter. */
export async function renderMix(plan: MixPlan, clips: ClipLookup): Promise<MixResult> {
  const mix = await renderMixSamples(plan, clips)
  const buffer = new AudioBuffer({ numberOfChannels: 2, length: mix.samples.length, sampleRate: mix.sampleRate })
  const channel = new Float32Array(mix.samples)
  buffer.copyToChannel(channel, 0)
  buffer.copyToChannel(channel, 1)
  return { buffer, missing: mix.missing }
}
/** An AudioBuffer (decoded clip or imported file) as the mono clip the mixer reads. */
export function clipOf(buffer: AudioBuffer): Clip {
  const samples = new Float32Array(buffer.length)
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < samples.length; i++) samples[i] = samples[i]! + data[i]! / buffer.numberOfChannels
  }
  return { sampleRate: buffer.sampleRate, samples }
}
