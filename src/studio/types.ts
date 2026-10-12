export type CharacterId = 'kit' | 'orb' | 'wisp'

export interface CharacterDefinition {
  id: CharacterId
  name: string
  color: string
  accent: string
  silhouette: 'cat' | 'orb' | 'wisp'
}

export interface StudioScene {
  name: string
  character: CharacterId
  camera: { x: number; y: number; z: number; targetY: number }
  characterPosition: { x: number; y: number; z: number }
  lookAtCamera: boolean
}
