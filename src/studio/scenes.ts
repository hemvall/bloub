import type { StudioScene } from './types'

export const DEFAULT_SCENE: StudioScene = {
  name: 'Rainy night bar',
  character: 'kit',
  camera: { x: 0, y: 2.15, z: 6.2, targetY: 1.45 },
  characterPosition: { x: 0, y: 0.9, z: 0 },
  lookAtCamera: true
}

export const PRESETS: StudioScene[] = [
  DEFAULT_SCENE,
  {
    name: 'Late night desk',
    character: 'orb',
    camera: { x: 1.1, y: 2.5, z: 6.8, targetY: 1.6 },
    characterPosition: { x: -0.5, y: 1, z: 0 },
    lookAtCamera: true
  },
  {
    name: 'Quiet booth',
    character: 'wisp',
    camera: { x: -1.2, y: 2.2, z: 6.4, targetY: 1.4 },
    characterPosition: { x: 0.55, y: 0.95, z: 0 },
    lookAtCamera: true
  }
]
