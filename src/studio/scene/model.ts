import { CAMERA_PRESETS } from '../camera/presets'
export { CAMERA_PRESETS } from '../camera/presets'
export type Vec3 = [number, number, number]
export type Expression = 'tired' | 'curious' | 'happy'
export type GazeTarget =
  { kind: 'camera' } | { kind: 'object'; id: string } | { kind: 'point'; position: Vec3 }
export interface CameraPose {
  position: Vec3
  target: Vec3
  fov: number
}
export interface CharacterData {
  id: string
  name: string
  position: Vec3
  rotation: Vec3
  scale: number
  color: string
  expression: Expression
  gaze: GazeTarget
}
export interface PropData {
  id: string
  kind: 'glass' | 'bottle'
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
export type TimelineEvent =
  | { type: 'camera'; time: number; pose: CameraPose }
  | { type: 'position'; time: number; character: string; position: Vec3 }
  | { type: 'gaze'; time: number; character: string; target: GazeTarget }
  | { type: 'expression'; time: number; character: string; expression: Expression }
export interface SceneData {
  version: 1
  name: string
  duration: number
  fps: number
  aspect: '16:9' | '9:16' | '1:1'
  environment: { id: 'night-bar'; fog: number; rain: number }
  camera: CameraPose
  characters: CharacterData[]
  props: PropData[]
  lights: LightData[]
  timeline: TimelineEvent[]
}
export function createScene(): SceneData {
  return {
    version: 1,
    name: 'Last light · Night bar',
    duration: 12,
    fps: 60,
    aspect: '16:9',
    environment: { id: 'night-bar', fog: 0.028, rain: 0.7 },
    camera: structuredClone(CAMERA_PRESETS.Medium!),
    characters: [
      {
        id: 'kit',
        name: 'Kit',
        position: [0, 1.05, -1.4],
        rotation: [0, 0, 0],
        scale: 1,
        color: '#ebe8df',
        expression: 'tired',
        gaze: { kind: 'object', id: 'window' }
      }
    ],
    props: [
      {
        id: 'glass',
        kind: 'glass',
        position: [1.15, 1.92, 0],
        rotation: [0, 0, 0],
        scale: 1,
        color: '#eab777'
      }
    ],
    lights: [
      { id: 'warm', position: [-3, 4.1, 1], color: '#ffbc72', intensity: 35 },
      { id: 'moon', position: [3, 3.5, -3], color: '#7aafff', intensity: 28 }
    ],
    timeline: [
      { type: 'camera', time: 0, pose: structuredClone(CAMERA_PRESETS.Medium!) },
      { type: 'camera', time: 7, pose: structuredClone(CAMERA_PRESETS['Close-up']!) },
      { type: 'gaze', time: 0, character: 'kit', target: { kind: 'object', id: 'window' } },
      { type: 'gaze', time: 3.5, character: 'kit', target: { kind: 'camera' } },
      { type: 'expression', time: 4, character: 'kit', expression: 'curious' }
    ]
  }
}
