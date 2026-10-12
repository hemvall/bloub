import type { Aspect } from '../scene/model'
/** Where a video is going decides its size and frame rate; the project stores the format, the scene the aspect. */
export type OutputFormat = 'reel' | 'tiktok' | 'short' | 'landscape'
export interface OutputPreset {
  id: OutputFormat
  name: string
  aspect: Aspect
  width: number
  height: number
  fps: number
  /** Suggested length window in seconds for the platform. */
  idealDuration: [number, number]
}
export const OUTPUT_PRESETS: Record<OutputFormat, OutputPreset> = {
  reel: { id: 'reel', name: 'Instagram Reel', aspect: '9:16', width: 1080, height: 1920, fps: 60, idealDuration: [15, 30] },
  tiktok: { id: 'tiktok', name: 'TikTok', aspect: '9:16', width: 1080, height: 1920, fps: 60, idealDuration: [15, 45] },
  short: { id: 'short', name: 'YouTube Short', aspect: '9:16', width: 1080, height: 1920, fps: 60, idealDuration: [15, 60] },
  landscape: { id: 'landscape', name: 'Landscape', aspect: '16:9', width: 1920, height: 1080, fps: 60, idealDuration: [20, 90] }
}
export const OUTPUT_FORMATS: OutputFormat[] = ['reel', 'tiktok', 'short', 'landscape']
export function isOutputFormat(value: string): value is OutputFormat {
  return (OUTPUT_FORMATS as string[]).includes(value)
}
/**
 * What a final render would consist of. Only the parts marked `ready` exist in
 * the pipeline today; the rest is declared so the UI can say so instead of faking it.
 */
export interface RenderPlan {
  preset: OutputPreset
  frames: number
  seconds: number
  video: { ready: true; codec: 'avc'; note: string }
  subtitles: { ready: true; mode: 'burned-in'; note: string }
  audio: { ready: boolean; voice: 'none' | 'partial' | 'full'; note: string }
}
interface AudioFacts {
  voice: { provider: string }
  dialogue: { audio?: unknown }[]
  audio: { music: { track: string }; ambience: { enabled: boolean }; sfx: { cuts: boolean; punchline: boolean; captions: boolean } }
}
export function renderPlan(format: OutputFormat, duration: number, project?: AudioFacts): RenderPlan {
  const preset = OUTPUT_PRESETS[format]
  const voiced = project ? project.dialogue.filter((d) => d.audio).length : 0
  const voice: RenderPlan['audio']['voice'] = !project || project.voice.provider === 'none' || !voiced ? 'none' : voiced < project.dialogue.length ? 'partial' : 'full'
  const beds = project ? [project.audio.music.track !== 'none' && 'music', project.audio.ambience.enabled && 'ambience', (project.audio.sfx.cuts || project.audio.sfx.punchline || project.audio.sfx.captions) && 'sfx'].filter(Boolean) : []
  const ready = voice !== 'none' || beds.length > 0
  return {
    preset,
    frames: Math.round(duration * preset.fps),
    seconds: duration,
    video: { ready: true, codec: 'avc', note: `Deterministic frames from engine.capture at ${preset.width}×${preset.height}, ${preset.fps} fps, encoded to H.264 MP4 in the browser.` },
    subtitles: { ready: true, mode: 'burned-in', note: 'Drawn by the same overlay as the preview; no separate caption file yet.' },
    audio: {
      ready,
      voice,
      note: !ready
        ? 'Silent: no voice provider, no music, no ambience.'
        : `AAC track mixed offline: ${[voice === 'full' ? 'voice on every line' : voice === 'partial' ? `voice on ${voiced}/${project!.dialogue.length} lines` : 'no voice', ...beds].join(', ')}.`
    }
  }
}
