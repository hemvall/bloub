import type { CameraPose, EnvironmentId, PropData, Vec3 } from '../scene/model'
export interface Mark {
  position: Vec3
  /** Rotation Y in radians; 0 faces +z, toward the default camera. */
  yaw: number
}
/** Environment facts usable without Three.js: gaze anchors, spots to stand, default camera, atmosphere, dressing. */
export interface EnvironmentDef {
  id: EnvironmentId
  name: string
  description: string
  anchors: Record<string, Vec3>
  /** Where characters stand by default, in arrival order. */
  seats: Mark[]
  /** Named spots a cast member can ask for; the first ones mirror `seats`. */
  marks: Record<string, Mark>
  /** Props the compiler places when a project uses this environment. Ids must be unique here. */
  dressing: PropData[]
  camera: CameraPose
  fog: number
  rain: number
  bloom: number
  weather: boolean
  background: string
  fogColor: string
  /** Where it fits in the content library; brand sets are the ones built for Lew's videos. */
  tier: 'brand' | 'demo'
}
export const ENVIRONMENTS: Record<EnvironmentId, EnvironmentDef> = {
  'office-night': {
    id: 'office-night',
    name: 'Lew office, night',
    tier: 'brand',
    description:
      "Lew's studio office at night: a desk with a monitor and a laptop, a wide window over a lit city, a warm desk lamp, shelves, a whiteboard on the right wall.",
    anchors: {
      window: [0, 2.4, -4],
      city: [0, 3, -30],
      shelves: [-4.6, 2, -1.5],
      door: [-4.6, 1.6, 2.2],
      ceiling: [0, 3.4, -1]
    },
    seats: [
      { position: [-0.6, 0, -2.0], yaw: 0.45 },
      { position: [1.6, 0, -1.5], yaw: -0.95 },
      { position: [2.6, 0, -3.0], yaw: 0.2 },
      { position: [-3.4, 0, 1.0], yaw: 0.6 }
    ],
    marks: {
      desk: { position: [-0.6, 0, -2.0], yaw: 0.45 },
      guest: { position: [1.6, 0, -1.5], yaw: -0.95 },
      window: { position: [2.6, 0, -3.0], yaw: 0.2 },
      door: { position: [-3.4, 0, 1.0], yaw: 0.6 }
    },
    dressing: [
      { id: 'monitor', kind: 'monitor', position: [-1.55, 0.79, -1.5], rotation: [0, 0.55, 0], scale: 1, color: '#23262e', screen: 'lew-dashboard' },
      { id: 'laptop', kind: 'laptop', position: [-0.35, 0.79, -1.3], rotation: [0, Math.PI - 0.2, 0], scale: 1, color: '#2c2f36', screen: 'agent-workflow' },
      { id: 'coffee', kind: 'coffee', position: [0.45, 0.79, -1.15], rotation: [0, 0, 0], scale: 1, color: '#3b6e8f' },
      { id: 'documents', kind: 'documents', position: [0.35, 0.79, -1.55], rotation: [0, -0.3, 0], scale: 1, color: '#f3efe6' },
      { id: 'whiteboard', kind: 'whiteboard', position: [4.88, 1.75, -1.4], rotation: [0, -Math.PI / 2, 0], scale: 1, color: '#f6f5f0' },
      { id: 'plant', kind: 'plant', position: [-4.1, 0, -3.2], rotation: [0, 0, 0], scale: 1.8, color: '#5e9a62' }
    ],
    camera: { position: [2.4, 2.1, 4.6], target: [0, 1.5, -1.4], fov: 40 },
    fog: 0.02,
    rain: 0,
    bloom: 0.3,
    weather: false,
    background: '#0f1420',
    fogColor: '#131a28'
  },
  'meeting-room': {
    id: 'meeting-room',
    name: 'Meeting room',
    tier: 'brand',
    description:
      'A corporate meeting room: long table, chairs, a glass wall with blinds, a wall screen showing a workflow, a whiteboard, flat ceiling panels. Daylight, slightly cold.',
    anchors: {
      screen: [0, 2.1, -4.4],
      glass: [4.9, 1.8, -1],
      table: [0, 0.8, -0.6],
      ceiling: [0, 3.2, -0.6]
    },
    seats: [
      { position: [0, 0, -2.1], yaw: 0 },
      { position: [-1.7, 0, -0.9], yaw: 0.7 },
      { position: [1.7, 0, -0.9], yaw: -0.7 },
      { position: [-3.3, 0, -1.6], yaw: 1.2 }
    ],
    marks: {
      head: { position: [0, 0, -2.1], yaw: 0 },
      left: { position: [-1.7, 0, -0.9], yaw: 0.7 },
      right: { position: [1.7, 0, -0.9], yaw: -0.7 },
      board: { position: [-3.3, 0, -1.6], yaw: 1.2 }
    },
    dressing: [
      { id: 'tv', kind: 'monitor', position: [0, 1.55, -4.4], rotation: [0, 0, 0], scale: 2.6, color: '#1c1e24', screen: 'agent-workflow' },
      { id: 'whiteboard', kind: 'whiteboard', position: [-4.88, 1.75, -1.6], rotation: [0, Math.PI / 2, 0], scale: 1, color: '#f6f5f0' },
      { id: 'documents', kind: 'documents', position: [-0.9, 0.79, -0.7], rotation: [0, 0.4, 0], scale: 1, color: '#f3efe6' },
      { id: 'coffee', kind: 'coffee', position: [0.9, 0.79, -0.5], rotation: [0, 0, 0], scale: 1, color: '#d9d4c8' },
      { id: 'laptop', kind: 'laptop', position: [0.1, 0.79, -1.5], rotation: [0, Math.PI, 0], scale: 1, color: '#2c2f36', screen: 'lew-dashboard' }
    ],
    camera: { position: [2.8, 2.0, 4.8], target: [0, 1.4, -1.2], fov: 40 },
    fog: 0.01,
    rain: 0,
    bloom: 0.15,
    weather: false,
    background: '#c9d2dc',
    fogColor: '#c9d2dc'
  },
  'ai-lab': {
    id: 'ai-lab',
    name: 'Abstract AI lab',
    tier: 'brand',
    description:
      'An abstract dark space: a glowing grid floor, a slowly turning constellation of agent nodes linked by light, cyan and amber rim light. For explanations without a real place.',
    anchors: {
      graph: [0, 3.2, -4],
      node: [2.5, 2.4, -3],
      horizon: [0, 1, -40],
      floor: [1.5, 0, 1]
    },
    seats: [
      { position: [0, 0, 0], yaw: 0 },
      { position: [-1.7, 0, 0.3], yaw: 0.4 },
      { position: [1.7, 0, 0.3], yaw: -0.4 },
      { position: [0, 0, -2.2], yaw: 0 }
    ],
    marks: {
      center: { position: [0, 0, 0], yaw: 0 },
      left: { position: [-1.7, 0, 0.3], yaw: 0.4 },
      right: { position: [1.7, 0, 0.3], yaw: -0.4 },
      back: { position: [0, 0, -2.2], yaw: 0 }
    },
    dressing: [{ id: 'server', kind: 'server', position: [3.4, 0, -3.4], rotation: [0, -0.5, 0], scale: 1, color: '#1b2230' }],
    camera: { position: [2.2, 2.2, 5.6], target: [0, 1.4, -0.4], fov: 40 },
    fog: 0.03,
    rain: 0,
    bloom: 0.6,
    weather: false,
    background: '#070a12',
    fogColor: '#070a12'
  },
  'night-bar': {
    id: 'night-bar',
    name: 'Night bar',
    tier: 'demo',
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
    marks: {
      center: { position: [0, 1.05, -1.4], yaw: 0 },
      left: { position: [-2.4, 1.05, -1.4], yaw: 0.25 },
      right: { position: [2.4, 1.05, -1.4], yaw: -0.25 },
      floor: { position: [-1.8, 0, 2.6], yaw: Math.PI }
    },
    dressing: [],
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
    tier: 'demo',
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
    marks: {
      center: { position: [0, 0, -1], yaw: 0 },
      left: { position: [-2.2, 0, -0.6], yaw: 0.35 },
      right: { position: [2.2, 0, -0.6], yaw: -0.35 },
      front: { position: [0, 0, 2.5], yaw: Math.PI }
    },
    dressing: [],
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
    tier: 'demo',
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
    marks: {
      center: { position: [0, 0, 0], yaw: 0 },
      left: { position: [-1.9, 0, 0.3], yaw: 0.3 },
      right: { position: [1.9, 0, 0.3], yaw: -0.3 },
      back: { position: [0, 0, -2], yaw: 0 }
    },
    dressing: [],
    camera: { position: [2.4, 2.2, 6], target: [0, 1.4, 0], fov: 38 },
    fog: 0.035,
    rain: 0,
    bloom: 0.25,
    weather: false,
    background: '#1a1b22',
    fogColor: '#1a1b22'
  }
}
export const ENVIRONMENT_IDS: EnvironmentId[] = ['office-night', 'meeting-room', 'ai-lab', 'night-bar', 'rooftop', 'stage']
export function isEnvironmentId(value: string): value is EnvironmentId {
  return (ENVIRONMENT_IDS as string[]).includes(value)
}
