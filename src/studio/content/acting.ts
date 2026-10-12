import type { ActionId, Expression } from '../scene/model'
/**
 * High-level acting commands: what a script (or an agent) asks of a character.
 * The compiler turns each into the engine's primitives: an expression key, an
 * action window, a gaze key, or a mix. New commands are added here, nowhere else.
 */
export type ActingCommand =
  | 'lookAt'
  | 'lookAway'
  | 'blink'
  | 'doubleBlink'
  | 'nod'
  | 'shakeHead'
  | 'sigh'
  | 'laugh'
  | 'wave'
  | 'thinking'
  | 'confused'
  | 'annoyed'
  | 'happy'
  | 'surprised'
  | 'deadpan'
  | 'smug'
  | 'tired'
  | 'sad'
  | 'curious'
  | 'neutral'
  | 'leanForward'
  | 'leanBack'
  | 'emphasis'
  | 'idle'
export interface ActingEffect {
  expression?: Expression
  action?: ActionId
  /** 'target' needs a target (camera, a role, an object); 'away' aims off to the side. */
  gaze?: 'target' | 'away'
  /** Back to the character's default expression. */
  reset?: boolean
  /** Canonical stage direction, printed by the script printer; `%t` is the target. */
  prose: string
}
export const ACTING: Record<ActingCommand, ActingEffect> = {
  lookAt: { gaze: 'target', prose: 'looks at %t.' },
  lookAway: { gaze: 'away', prose: 'looks away.' },
  blink: { action: 'blink', prose: 'blinks.' },
  doubleBlink: { action: 'doubleBlink', prose: 'blinks twice.' },
  nod: { action: 'nod', prose: 'nods.' },
  shakeHead: { action: 'shake', prose: 'shakes head.' },
  sigh: { action: 'sigh', prose: 'sighs.' },
  laugh: { action: 'laugh', expression: 'happy', prose: 'laughs.' },
  wave: { action: 'wave', prose: 'waves.' },
  thinking: { action: 'think', expression: 'curious', prose: 'thinks.' },
  confused: { expression: 'confused', action: 'tilt', prose: 'looks confused.' },
  annoyed: { expression: 'annoyed', prose: 'looks annoyed.' },
  happy: { expression: 'happy', prose: 'smiles.' },
  surprised: { expression: 'surprised', prose: 'looks surprised.' },
  deadpan: { expression: 'deadpan', prose: 'goes deadpan.' },
  smug: { expression: 'smug', prose: 'smirks.' },
  tired: { expression: 'tired', prose: 'looks tired.' },
  sad: { expression: 'sad', prose: 'looks sad.' },
  curious: { expression: 'curious', prose: 'looks curious.' },
  neutral: { expression: 'neutral', prose: 'relaxes.' },
  leanForward: { action: 'leanIn', prose: 'leans forward.' },
  leanBack: { action: 'leanBack', prose: 'leans back.' },
  emphasis: { action: 'emphasis', prose: 'stresses the point.' },
  idle: { reset: true, prose: 'goes idle.' }
}
export const ACTING_COMMANDS = Object.keys(ACTING) as ActingCommand[]
export function isActingCommand(value: string): value is ActingCommand {
  return value in ACTING
}
/** Prose verbs, most specific first: "looks confused" must win over "looks at". */
export const ACTING_WORDS: [RegExp, ActingCommand][] = [
  [/\blooks? away\b|\bglances? away\b|\bavoids?\b/, 'lookAway'],
  [/\b(looks?|glances?|stares?|turns?) (at|to|toward|towards)\b|\beyes\b.*\bon\b/, 'lookAt'],
  [/\bblinks? twice\b|\bdouble[- ]blinks?\b/, 'doubleBlink'],
  [/\bblinks?\b/, 'blink'],
  [/\bnods? slightly\b|\bstress(es)? the point\b|\bemphasi[sz]es?\b/, 'emphasis'],
  [/\bnods?\b/, 'nod'],
  [/\bshakes? (his |her |its |their )?head\b/, 'shakeHead'],
  [/\bsighs?\b|\bexhales?\b/, 'sigh'],
  [/\blaughs?\b|\bchuckles?\b|\bgiggles?\b/, 'laugh'],
  [/\bwaves?\b/, 'wave'],
  [/\bthinks?\b|\bponders?\b|\bhesitates?\b|\bconsiders?\b/, 'thinking'],
  [/\bconfused\b|\bpuzzled\b|\bbaffled\b|\blost\b/, 'confused'],
  [/\bannoyed\b|\birritated\b|\bfrowns?\b|\bgrumpy\b|\bangry\b/, 'annoyed'],
  [/\bsmiles?\b|\bhappy\b|\bgrins?\b|\bpleased\b|\bdelighted\b/, 'happy'],
  [/\bsurprised\b|\bshocked\b|\bgasps?\b|\bamazed\b/, 'surprised'],
  [/\bdeadpan\b|\bflat(ly)?\b|\bstone[- ]faced\b/, 'deadpan'],
  [/\bsmirks?\b|\bsmug\b/, 'smug'],
  [/\btired\b|\bexhausted\b|\bsleepy\b|\byawns?\b/, 'tired'],
  [/\bsad\b|\bupset\b|\bgloomy\b/, 'sad'],
  [/\bcurious\b|\bintrigued\b|\binterested\b/, 'curious'],
  [/\brelaxes\b|\bneutral\b|\bcalms? down\b/, 'neutral'],
  [/\bleans? (forward|in|closer)\b/, 'leanForward'],
  [/\bleans? back\b|\bsits? back\b/, 'leanBack'],
  [/\bgoes idle\b|\bidles?\b/, 'idle']
]
