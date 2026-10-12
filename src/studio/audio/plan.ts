import { ENVELOPE_RATE, type EnvironmentId, type SceneData } from '../scene/model'
import { wordTimings } from '../subtitles/timing'
/**
 * The audio side of a project, as data. `mixPlan` turns a compiled project into
 * the list of things that must sound and when; it is pure, so it is testable
 * and the preview and the export cannot disagree. Rendering lives in `mix.ts`.
 */
export type MusicTrack = 'none' | 'lofi' | 'pulse' | 'ambient' | 'custom'
export const MUSIC_TRACKS: MusicTrack[] = ['none', 'lofi', 'pulse', 'ambient', 'custom']
export const MUSIC_LABELS: Record<MusicTrack, string> = {
  none: 'No music',
  lofi: 'Lo-fi beat (procedural)',
  pulse: 'Synth pulse (procedural)',
  ambient: 'Ambient pad (procedural)',
  custom: 'Track (library, search or file)'
}
export interface CustomMusic {
  /** Key of the decoded file in the local clip store. */
  hash: string
  name: string
  duration: number
  /** Attribution to paste in the caption, for tracks that require it. */
  credit?: string
  /** Where the bytes came from, so a project opened elsewhere can fetch them again. */
  url?: string
  license?: string
}
export interface AudioConfig {
  music: { track: MusicTrack; volume: number; custom?: CustomMusic }
  ambience: { enabled: boolean; volume: number }
  sfx: { cuts: boolean; punchline: boolean; captions: boolean; volume: number }
  /** How much the music drops under a voice, 0 none to 1 silent. */
  ducking: number
  voiceVolume: number
}
export const DEFAULT_AUDIO: AudioConfig = {
  music: { track: 'lofi', volume: 0.35 },
  ambience: { enabled: true, volume: 0.5 },
  sfx: { cuts: true, punchline: true, captions: false, volume: 0.6 },
  ducking: 0.55,
  voiceVolume: 1
}
export type TtsProvider = 'none' | 'openai' | 'elevenlabs'
export const TTS_PROVIDERS: TtsProvider[] = ['none', 'openai', 'elevenlabs']
export type ContentLanguage = 'fr' | 'en'
export interface VoiceConfig {
  provider: TtsProvider
  language: ContentLanguage
  /** Provider voice id per role. */
  voices: Record<string, string>
  model: string
  /** Delivery notes per role (OpenAI reads them; ElevenLabs ignores them). */
  instructions: Record<string, string>
}
export const DEFAULT_VOICE: VoiceConfig = { provider: 'none', language: 'en', voices: {}, model: '', instructions: {} }
/** What a generated clip leaves in the project: enough to time and animate without the bytes. */
export interface LineAudio {
  hash: string
  duration: number
  envelope: number[]
}
export type SfxKind = 'whoosh' | 'riser' | 'hit' | 'tick'
export interface SfxCue {
  kind: SfxKind
  time: number
  gain: number
}
export interface VoiceCue {
  lineId: string
  hash: string
  start: number
  gain: number
}
export interface MixPlan {
  duration: number
  sampleRate: number
  voice: VoiceCue[]
  /** Windows during which the music ducks. */
  ducks: { start: number; end: number }[]
  ducking: number
  music: AudioConfig['music']
  ambience: { set: EnvironmentId; volume: number } | null
  sfx: SfxCue[]
}
export const MIX_SAMPLE_RATE = 48000
export const RISER_LENGTH = 1.4
interface PlanInput {
  scene: SceneData
  audio: AudioConfig
  voice: VoiceConfig
  dialogue: { id: string; start: number; audio?: LineAudio }[]
}
export function mixPlan({ scene, audio, voice, dialogue }: PlanInput): MixPlan {
  const voiceCues: VoiceCue[] = []
  const ducks: { start: number; end: number }[] = []
  if (voice.provider !== 'none')
    for (const line of [...dialogue].sort((a, b) => a.start - b.start)) {
      if (!line.audio) continue
      voiceCues.push({ lineId: line.id, hash: line.audio.hash, start: line.start, gain: audio.voiceVolume })
      ducks.push({ start: line.start, end: line.start + line.audio.duration })
    }
  const sfx: SfxCue[] = []
  const cuts = scene.timeline.filter((e) => e.type === 'camera' && e.cut)
  if (audio.sfx.cuts) for (const c of cuts) sfx.push({ kind: 'whoosh', time: c.time, gain: audio.sfx.volume * 0.5 })
  const lines = scene.timeline.filter((e) => e.type === 'dialogue')
  const last = lines[lines.length - 1]
  if (audio.sfx.punchline && last && lines.length > 1) {
    sfx.push({ kind: 'riser', time: Math.max(0, last.time - RISER_LENGTH), gain: audio.sfx.volume * 0.45 })
    sfx.push({ kind: 'hit', time: last.time, gain: audio.sfx.volume * 0.7 })
  }
  if (audio.sfx.captions)
    for (const line of lines) {
      let chunk = -1
      for (const w of wordTimings(line.text, line.time, line.duration, scene.subtitles.wordsPerLine))
        if (w.chunk !== chunk) {
          chunk = w.chunk
          sfx.push({ kind: 'tick', time: w.start, gain: audio.sfx.volume * 0.25 })
        }
    }
  sfx.sort((a, b) => a.time - b.time)
  return {
    duration: scene.duration,
    sampleRate: MIX_SAMPLE_RATE,
    voice: voiceCues,
    ducks: mergeWindows(ducks),
    ducking: audio.ducking,
    music: audio.music,
    ambience: audio.ambience.enabled ? { set: scene.environment.id, volume: audio.ambience.volume } : null,
    sfx
  }
}
function mergeWindows(windows: { start: number; end: number }[]) {
  const sorted = [...windows].sort((a, b) => a.start - b.start)
  const out: { start: number; end: number }[] = []
  for (const w of sorted) {
    const prev = out[out.length - 1]
    if (prev && w.start <= prev.end + 0.45) prev.end = Math.max(prev.end, w.end)
    else out.push({ ...w })
  }
  return out
}
/** RMS loudness of a mono signal at `ENVELOPE_RATE` samples per second, peak-normalised, two decimals. */
export function envelopeOf(samples: Float32Array, sampleRate: number): number[] {
  const window = Math.max(1, Math.round(sampleRate / ENVELOPE_RATE))
  const out: number[] = []
  for (let i = 0; i < samples.length; i += window) {
    let sum = 0
    const end = Math.min(samples.length, i + window)
    for (let j = i; j < end; j++) sum += samples[j]! * samples[j]!
    out.push(Math.sqrt(sum / (end - i)))
  }
  const peak = Math.max(1e-6, ...out)
  // A touch of smoothing so the mouth follows syllables, not every consonant.
  return out.map((v, i) => Math.round((Math.max(v, (out[i - 1] ?? 0) * 0.6) / peak) * 100) / 100)
}
/** A clip's duration, with the small breath the next line waits for. */
export const VOICE_TAIL = 0.15
