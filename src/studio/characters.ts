import type { CharacterDefinition } from './types'

export const CHARACTERS: CharacterDefinition[] = [
  { id: 'kit', name: 'Kit', color: '#d9d9de', accent: '#15151a', silhouette: 'cat' },
  { id: 'orb', name: 'Orb', color: '#f1a85b', accent: '#2a1810', silhouette: 'orb' },
  { id: 'wisp', name: 'Wisp', color: '#a8b8ff', accent: '#171a2c', silhouette: 'wisp' }
]

export const CHARACTER_BY_ID = new Map(CHARACTERS.map((character) => [character.id, character]))
