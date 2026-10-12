import type { CharacterKind, Expression } from '../scene/model'
/** What the document, the director and the UI need to know about a character without loading Three.js. */
export interface CharacterDef {
  kind: CharacterKind
  name: string
  color: string
  expression: Expression
  /** Eye height above the ground at scale 1: what gazes and framings aim at. */
  eyeHeight: number
  description: string
}
export const CHARACTERS: Record<CharacterKind, CharacterDef> = {
  kit: {
    kind: 'kit',
    name: 'Kit',
    color: '#d8d4ca',
    expression: 'tired',
    eyeHeight: 1.58,
    description:
      'A small off-white cat with a big head, one bent ear and heavy eyelids. Cynical, tired, dry humour.'
  },
  pip: {
    kind: 'pip',
    name: 'Pip',
    color: '#f4c84a',
    expression: 'curious',
    eyeHeight: 1.08,
    description:
      'A tiny round yellow bird with huge eyes, a stubby beak and a three-feather tuft. Curious, naive, excitable.'
  },
  bo: {
    kind: 'bo',
    name: 'Bo',
    color: '#8c6a4f',
    expression: 'neutral',
    eyeHeight: 1.86,
    description:
      'A big soft brown bear with small round ears, a pale muzzle and calm small eyes. Slow, warm, reassuring.'
  }
}
export const CHARACTER_KINDS: CharacterKind[] = ['kit', 'pip', 'bo']
export function isCharacterKind(value: string): value is CharacterKind {
  return (CHARACTER_KINDS as string[]).includes(value)
}
