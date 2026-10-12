/** The scene document: the single source of truth. Everything on screen is a function of it and a time `t`. */
export type Vec3 = [number, number, number]
export type Aspect = '16:9' | '9:16' | '1:1'
export type EnvironmentId = 'night-bar' | 'rooftop' | 'stage'
export type CharacterKind = 'kit' | 'pip' | 'bo'
export type Expression = 'neutral' | 'tired' | 'curious' | 'happy' | 'sad' | 'surprised' | 'annoyed'
export type ActionId = 'sigh' | 'nod' | 'shake' | 'bounce' | 'wave' | 'think' | 'laugh'
export type PropKind = 'glass' | 'bottle' | 'cup' | 'plant' | 'book' | 'lamp'
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
interface EventBase {
  /** Stable id: the timeline is edited by id, never by index. */
  id: string
  time: number
}
export type TimelineEvent =
  | (EventBase & { type: 'camera'; pose: CameraPose })
  | (EventBase & { type: 'position'; character: string; position: Vec3 })
  | (EventBase & { type: 'gaze'; character: string; target: GazeTarget })
  | (EventBase & { type: 'expression'; character: string; expression: Expression })
  | (EventBase & { type: 'dialogue'; character: string; text: string; duration: number })
  | (EventBase & { type: 'action'; character: string; action: ActionId })
export type EventType = TimelineEvent['type']
export interface SceneData {
  version: 2
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
}
export const ASPECTS: Aspect[] = ['16:9', '9:16', '1:1']
export const EXPRESSIONS: Expression[] = ['neutral', 'tired', 'curious', 'happy', 'sad', 'surprised', 'annoyed']
export const ACTIONS: ActionId[] = ['sigh', 'nod', 'shake', 'bounce', 'wave', 'think', 'laugh']
export const PROP_KINDS: PropKind[] = ['glass', 'bottle', 'cup', 'plant', 'book', 'lamp']
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
