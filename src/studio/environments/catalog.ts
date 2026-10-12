import type { CameraPose, EnvironmentId, Vec3 } from '../scene/model'
/** Environment facts usable without Three.js: gaze anchors, spots to stand, default camera, atmosphere. */
export interface EnvironmentDef {
  id: EnvironmentId
  name: string
  description: string
  anchors: Record<string, Vec3>
  /** Where characters stand by default, in arrival order. */
  seats: { position: Vec3; yaw: number }[]
  camera: CameraPose
  fog: number
  rain: number
  bloom: number
  weather: boolean
  background: string
  fogColor: string
}
export const ENVIRONMENTS: Record<EnvironmentId, EnvironmentDef> = {
  'night-bar': {
    id: 'night-bar',
    name: 'Night bar',
    description:
      'A dark cozy bar late at night: long wooden counter, stools, bottles on lit shelves, a tall arched window with rain and city lights, a pink neon sign.',
    anchors: {
      window: [3.3, 3.4, -5],
      counter: [0, 1.9, 0.4],
      shelves: [-3.5, 3, -4.2],
      neon: [-3.4, 5.1, -4.3],
      door: [-6.5, 2, 2]
    },
    seats: [
      { position: [0, 1.05, -1.4], yaw: 0 },
      { position: [-2.4, 1.05, -1.4], yaw: 0.25 },
      { position: [2.4, 1.05, -1.4], yaw: -0.25 },
      { position: [-1.8, 0, 2.6], yaw: Math.PI }
    ],
    camera: { position: [3.7, 3.1, 7.8], target: [0, 2.5, -1.4], fov: 40 },
    fog: 0.028,
    rain: 0.7,
    bloom: 0.45,
    weather: true,
    background: '#121623',
    fogColor: '#1b1c28'
  },
  rooftop: {
    id: 'rooftop',
    name: 'Rooftop at dusk',
    description:
      'A city rooftop at dusk: a parapet overlooking a skyline of lit towers, a water tower, string lights, a violet-orange sky with the first stars.',
    anchors: {
      skyline: [0, 4, -40],
      moon: [-14, 18, -45],
      'water-tower': [6.5, 5, -5.5],
      lights: [0, 3.2, -1],
      edge: [0, 1.2, -10]
    },
    seats: [
      { position: [0, 0, -1], yaw: 0 },
      { position: [-2.2, 0, -0.6], yaw: 0.35 },
      { position: [2.2, 0, -0.6], yaw: -0.35 },
      { position: [0, 0, 2.5], yaw: Math.PI }
    ],
    camera: { position: [4.5, 2.6, 7], target: [0, 1.5, -1], fov: 40 },
    fog: 0.012,
    rain: 0,
    bloom: 0.35,
    weather: false,
    background: '#2a1d3f',
    fogColor: '#3a2a52'
  },
  stage: {
    id: 'stage',
    name: 'Studio stage',
    description:
      'A clean studio cyclorama: a seamless backdrop, a warm key spot and a cool rim light, a soft pool of light on the floor. Nothing competes with the character.',
    anchors: {
      spot: [0, 5, 2],
      backdrop: [0, 2, -6],
      wings: [-6, 1.5, 0]
    },
    seats: [
      { position: [0, 0, 0], yaw: 0 },
      { position: [-1.9, 0, 0.3], yaw: 0.3 },
      { position: [1.9, 0, 0.3], yaw: -0.3 },
      { position: [0, 0, -2], yaw: 0 }
    ],
    camera: { position: [2.4, 2.2, 6], target: [0, 1.4, 0], fov: 38 },
    fog: 0.035,
    rain: 0,
    bloom: 0.25,
    weather: false,
    background: '#1a1b22',
    fogColor: '#1a1b22'
  }
}
export const ENVIRONMENT_IDS: EnvironmentId[] = ['night-bar', 'rooftop', 'stage']
export function isEnvironmentId(value: string): value is EnvironmentId {
  return (ENVIRONMENT_IDS as string[]).includes(value)
}
