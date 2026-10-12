import type { CharacterKind, Expression } from '../scene/model'
import type { IdleProfile } from '../animation/idle'
/** Default behaviour of a character: what keeps generated scenes consistent without per-scene tuning. */
export interface Personality {
  summary: string
  idle: 'relaxed' | 'alert' | 'slouched' | 'restless'
  reactionIntensity: 'subtle' | 'medium' | 'strong'
  blinkFrequency: 'low' | 'normal' | 'high'
  headMovement: 'restrained' | 'normal' | 'lively'
}
/** What the document, the director and the UI need to know about a character without loading Three.js. */
export interface CharacterDef {
  kind: CharacterKind
  name: string
  color: string
  expression: Expression
  /** Eye height above the ground at scale 1: what gazes and framings aim at. */
  eyeHeight: number
  description: string
  /** Brand characters are the recurring cast; the others are the original demo trio. */
  tier: 'brand' | 'archetype' | 'demo'
  personality: Personality
}
export const CHARACTERS: Record<CharacterKind, CharacterDef> = {
  lew: {
    kind: 'lew',
    name: 'Lew',
    color: '#6b6f7b',
    expression: 'deadpan',
    eyeHeight: 1.5,
    tier: 'brand',
    description:
      'The main character. A low-poly grey raccoon: black eye mask with half-lidded eyes, tiny pale muzzle, pointed ears, striped tail, elongated body. Calm, clever, slightly sarcastic; explains AI with as few words as possible.',
    personality: {
      summary: 'calm, clever, slightly sarcastic',
      idle: 'relaxed',
      reactionIntensity: 'subtle',
      blinkFrequency: 'normal',
      headMovement: 'restrained'
    }
  },
  ceo: {
    kind: 'ceo',
    name: 'CEO',
    color: '#3a3f5c',
    expression: 'neutral',
    eyeHeight: 1.66,
    tier: 'archetype',
    description:
      'A round, confident executive: bald head, round glasses, navy suit and a bright red tie. Confident but confused; asks the questions the audience would.',
    personality: {
      summary: 'confident but confused',
      idle: 'alert',
      reactionIntensity: 'medium',
      blinkFrequency: 'normal',
      headMovement: 'normal'
    }
  },
  dev: {
    kind: 'dev',
    name: 'Dev',
    color: '#4f5e52',
    expression: 'tired',
    eyeHeight: 1.5,
    tier: 'archetype',
    description:
      'A developer in a hoodie with headphones around the neck, messy hair and heavy eyelids. Tired, blunt, has seen it all.',
    personality: {
      summary: 'tired',
      idle: 'slouched',
      reactionIntensity: 'subtle',
      blinkFrequency: 'low',
      headMovement: 'restrained'
    }
  },
  kit: {
    kind: 'kit',
    name: 'Kit',
    color: '#d8d4ca',
    expression: 'tired',
    eyeHeight: 1.58,
    tier: 'demo',
    description:
      'A small off-white cat with a big head, one bent ear and heavy eyelids. Cynical, tired, dry humour.',
    personality: {
      summary: 'cynical, dry',
      idle: 'relaxed',
      reactionIntensity: 'subtle',
      blinkFrequency: 'low',
      headMovement: 'restrained'
    }
  },
  pip: {
    kind: 'pip',
    name: 'Pip',
    color: '#f4c84a',
    expression: 'curious',
    eyeHeight: 1.08,
    tier: 'demo',
    description:
      'A tiny round yellow bird with huge eyes, a stubby beak and a three-feather tuft. Curious, naive, excitable.',
    personality: {
      summary: 'curious, excitable',
      idle: 'restless',
      reactionIntensity: 'strong',
      blinkFrequency: 'high',
      headMovement: 'lively'
    }
  },
  bo: {
    kind: 'bo',
    name: 'Bo',
    color: '#8c6a4f',
    expression: 'neutral',
    eyeHeight: 1.86,
    tier: 'demo',
    description:
      'A big soft brown bear with small round ears, a pale muzzle and calm small eyes. Slow, warm, reassuring.',
    personality: {
      summary: 'slow, warm',
      idle: 'relaxed',
      reactionIntensity: 'medium',
      blinkFrequency: 'low',
      headMovement: 'restrained'
    }
  }
}
export const CHARACTER_KINDS: CharacterKind[] = ['lew', 'ceo', 'dev', 'kit', 'pip', 'bo']
export function isCharacterKind(value: string): value is CharacterKind {
  return (CHARACTER_KINDS as string[]).includes(value)
}
/** Personality words into idle numbers; the rig reads this, the compiler reads `reactionIntensity`. */
export function idleProfile(p: Personality): IdleProfile {
  const head = { restrained: 0.6, normal: 1, lively: 1.5 }[p.headMovement]
  const blink = { low: 1.35, normal: 1, high: 0.7 }[p.blinkFrequency]
  switch (p.idle) {
    case 'relaxed':
      return { head, sway: 0.9, breath: 1, blink, posture: 0, headDrop: 0 }
    case 'alert':
      return { head: head * 1.1, sway: 0.7, breath: 1.1, blink, posture: -0.03, headDrop: -0.02 }
    case 'slouched':
      return { head: head * 0.8, sway: 0.6, breath: 1.2, blink, posture: 0.12, headDrop: 0.08 }
    case 'restless':
      return { head: head * 1.3, sway: 1.5, breath: 1.3, blink, posture: 0, headDrop: 0 }
  }
}
