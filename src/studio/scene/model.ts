/** The scene document: the single source of truth. Everything on screen is a function of it and a time `t`. */
export type Vec3 = [number, number, number]
export type Aspect = '16:9' | '9:16' | '1:1'
export type EnvironmentId = 'night-bar' | 'rooftop' | 'stage' | 'office-night' | 'meeting-room' | 'ai-lab'
export type CharacterKind = 'kit' | 'pip' | 'bo' | 'lew' | 'ceo' | 'dev'
export type Expression =
  | 'neutral'
  | 'tired'
  | 'curious'
  | 'happy'
  | 'sad'
  | 'surprised'
  | 'annoyed'
  | 'confused'
  | 'deadpan'
  | 'smug'
export type ActionId =
  | 'sigh'
  | 'nod'
  | 'shake'
  | 'bounce'
  | 'wave'
  | 'think'
  | 'laugh'
  | 'listen'
  | 'blink'
  | 'doubleBlink'
  | 'emphasis'
  | 'leanIn'
  | 'leanBack'
  | 'tilt'
export type PropKind =
  | 'glass'
  | 'bottle'
  | 'cup'
  | 'plant'
  | 'book'
  | 'lamp'
  | 'laptop'
  | 'phone'
  | 'monitor'
  | 'coffee'
  | 'whiteboard'
  | 'documents'
  | 'server'
export type GazeTarget =
  | { kind: 'camera' }
  | { kind: 'object'; id: string }
  | { kind: 'point'; position: Vec3 }
export interface CameraPose {
  position: Vec3
  target: Vec3
  fov: number
}
export interface CharacterData {
  id: string
  name: string
  kind: CharacterKind
  position: Vec3
  rotation: Vec3
  scale: number
  color: string
  expression: Expression
  gaze: GazeTarget
}
export interface PropData {
  id: string
  kind: PropKind
  position: Vec3
  rotation: Vec3
  scale: number
  color: string
  /** Screen content for props with a display: a painter id (`SCREEN_IDS`) or a `data:image/...` URL. */
  screen?: string
}
export interface LightData {
  id: string
  position: Vec3
  color: string
  intensity: number
}
export interface EnvironmentSettings {
  id: EnvironmentId
  fog: number
  /** 0 to 1; ignored by environments without weather. */
  rain: number
  /** Bloom strength; 0 skips the post-processing pass entirely. */
  bloom: number
}
/** Short-form subtitle style. Sizes are fractions of the frame's short side; positions fractions of its height. */
export interface SubtitleStyle {
  enabled: boolean
  /** 'words' highlights the spoken word in chunks; 'caption' is a classic box with the speaker's name. */
  mode: 'words' | 'caption'
  font: string
  weight: number
  size: number
  color: string
  highlight: string
  stroke: string
  /** Baseline of the subtitle block in portrait and landscape frames. */
  positionPortrait: number
  positionLandscape: number
  wordsPerLine: number
  maxWidth: number
  uppercase: boolean
  entrance: 'pop' | 'fade' | 'none'
  speakerLabel: boolean
}
interface EventBase {
  /** Stable id: the timeline is edited by id, never by index. */
  id: string
  time: number
}
export type TimelineEvent =
  | (EventBase & { type: 'camera'; pose: CameraPose; cut?: boolean; label?: string })
  | (EventBase & { type: 'position'; character: string; position: Vec3 })
  | (EventBase & { type: 'gaze'; character: string; target: GazeTarget })
  | (EventBase & { type: 'expression'; character: string; expression: Expression })
  | (EventBase & {
      type: 'dialogue'
      character: string
      text: string
      duration: number
      /** Loudness of the voice clip at `ENVELOPE_RATE` samples per second, 0..1; drives the mouth when present. */
      envelope?: number[]
    })
  | (EventBase & { type: 'action'; character: string; action: ActionId })
export type EventType = TimelineEvent['type']
export interface SceneData {
  version: 3
  name: string
  duration: number
  fps: number
  aspect: Aspect
  environment: EnvironmentSettings
  camera: CameraPose
  characters: CharacterData[]
  props: PropData[]
  lights: LightData[]
  timeline: TimelineEvent[]
  subtitles: SubtitleStyle
}
export const ASPECTS: Aspect[] = ['16:9', '9:16', '1:1']
export const EXPRESSIONS: Expression[] = [
  'neutral',
  'tired',
  'curious',
  'happy',
  'sad',
  'surprised',
  'annoyed',
  'confused',
  'deadpan',
  'smug'
]
export const ACTIONS: ActionId[] = [
  'sigh',
  'nod',
  'shake',
  'bounce',
  'wave',
  'think',
  'laugh',
  'listen',
  'blink',
  'doubleBlink',
  'emphasis',
  'leanIn',
  'leanBack',
  'tilt'
]
export const PROP_KINDS: PropKind[] = [
  'glass',
  'bottle',
  'cup',
  'plant',
  'book',
  'lamp',
  'laptop',
  'phone',
  'monitor',
  'coffee',
  'whiteboard',
  'documents',
  'server'
]
/** Samples per second of a dialogue envelope. */
export const ENVELOPE_RATE = 25
export const EVENT_TYPES: EventType[] = ['camera', 'position', 'gaze', 'expression', 'dialogue', 'action']
/** Export sizes per format; 1080 on the short side is the short-form standard. */
export const OUTPUT_SIZE: Record<Aspect, [number, number]> = {
  '16:9': [1920, 1080],
  '9:16': [1080, 1920],
  '1:1': [1080, 1080]
}
export function aspectRatio(aspect: Aspect) {
  const [w, h] = OUTPUT_SIZE[aspect]
  return w / h
}
let counter = 0
export function uid(prefix: string) {
  counter += 1
  return `${prefix}-${counter.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`
}
