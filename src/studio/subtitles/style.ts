import type { SubtitleStyle } from '../scene/model'
/** The Lew look: big bold words, the spoken one in amber, a navy stroke so it reads on any shot. */
export const LEW_SUBTITLES: SubtitleStyle = {
  enabled: true,
  mode: 'words',
  font: 'Inter, "Segoe UI", system-ui, sans-serif',
  weight: 800,
  size: 0.062,
  color: '#ffffff',
  highlight: '#f6b042',
  stroke: '#0b1220',
  positionPortrait: 0.7,
  positionLandscape: 0.86,
  wordsPerLine: 3,
  maxWidth: 0.86,
  uppercase: true,
  entrance: 'pop',
  speakerLabel: false
}
/** The original caption box with the speaker's name: calmer, for landscape or dialogue-heavy clips. */
export const CAPTION_SUBTITLES: SubtitleStyle = {
  ...LEW_SUBTITLES,
  mode: 'caption',
  weight: 700,
  size: 0.046,
  uppercase: false,
  positionPortrait: 0.78,
  positionLandscape: 0.88,
  speakerLabel: true
}
export const SUBTITLE_PRESETS: { id: string; name: string; style: SubtitleStyle }[] = [
  { id: 'lew', name: 'Lew · word highlight', style: LEW_SUBTITLES },
  { id: 'caption', name: 'Caption box', style: CAPTION_SUBTITLES }
]
/** Vertical keep-out bands of the usual short-form player UI, as fractions of the frame height. */
export const SAFE_TOP = 0.1,
  SAFE_BOTTOM = 0.82
