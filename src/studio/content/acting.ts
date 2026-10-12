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
  /** Canonical stage direction per language, printed by the script printer; `%t` is the target. */
  prose: { en: string; fr: string }
}
export const ACTING: Record<ActingCommand, ActingEffect> = {
  lookAt: { gaze: 'target', prose: { en: 'looks at %t.', fr: 'regarde %t.' } },
  lookAway: { gaze: 'away', prose: { en: 'looks away.', fr: 'détourne le regard.' } },
  blink: { action: 'blink', prose: { en: 'blinks.', fr: 'cligne des yeux.' } },
  doubleBlink: { action: 'doubleBlink', prose: { en: 'blinks twice.', fr: 'cligne deux fois.' } },
  nod: { action: 'nod', prose: { en: 'nods.', fr: 'hoche la tête.' } },
  shakeHead: { action: 'shake', prose: { en: 'shakes head.', fr: 'secoue la tête.' } },
  sigh: { action: 'sigh', prose: { en: 'sighs.', fr: 'soupire.' } },
  laugh: { action: 'laugh', expression: 'happy', prose: { en: 'laughs.', fr: 'rit.' } },
  wave: { action: 'wave', prose: { en: 'waves.', fr: 'fait un signe de la main.' } },
  thinking: { action: 'think', expression: 'curious', prose: { en: 'thinks.', fr: 'réfléchit.' } },
  confused: { expression: 'confused', action: 'tilt', prose: { en: 'looks confused.', fr: "a l'air perdu." } },
  annoyed: { expression: 'annoyed', prose: { en: 'looks annoyed.', fr: "a l'air agacé." } },
  happy: { expression: 'happy', prose: { en: 'smiles.', fr: 'sourit.' } },
  surprised: { expression: 'surprised', prose: { en: 'looks surprised.', fr: "a l'air surpris." } },
  deadpan: { expression: 'deadpan', prose: { en: 'goes deadpan.', fr: 'reste impassible.' } },
  smug: { expression: 'smug', prose: { en: 'smirks.', fr: 'a un sourire en coin.' } },
  tired: { expression: 'tired', prose: { en: 'looks tired.', fr: "a l'air fatigué." } },
  sad: { expression: 'sad', prose: { en: 'looks sad.', fr: "a l'air triste." } },
  curious: { expression: 'curious', prose: { en: 'looks curious.', fr: "a l'air curieux." } },
  neutral: { expression: 'neutral', prose: { en: 'relaxes.', fr: 'se détend.' } },
  leanForward: { action: 'leanIn', prose: { en: 'leans forward.', fr: 'se penche en avant.' } },
  leanBack: { action: 'leanBack', prose: { en: 'leans back.', fr: 'se cale en arrière.' } },
  emphasis: { action: 'emphasis', prose: { en: 'stresses the point.', fr: 'insiste.' } },
  idle: { reset: true, prose: { en: 'goes idle.', fr: 'reste tranquille.' } }
}
export const ACTING_COMMANDS = Object.keys(ACTING) as ActingCommand[]
export function isActingCommand(value: string): value is ActingCommand {
  return value in ACTING
}
/**
 * Prose verbs in both languages, most specific first: "looks confused" must win over
 * "looks at". Matched against `normalize(sentence)`, so the French forms carry no accents.
 */
export const ACTING_WORDS: [RegExp, ActingCommand][] = [
  [/\blooks? away\b|\bglances? away\b|\bavoids?\b|\bdetourne(nt)? (le|les) (regard|yeux)\b|\bregarde(nt)? ailleurs\b|\bbaisse(nt)? les yeux\b/, 'lookAway'],
  [/\b(looks?|glances?|stares?|turns?) (at|to|toward|towards)\b|\beyes\b.*\bon\b|\bregarde(nt)?\b|\bfixe(nt)?\b|\bse tourne(nt)? vers\b|\bobserve(nt)?\b/, 'lookAt'],
  [/\bblinks? twice\b|\bdouble[- ]blinks?\b|\bcligne(nt)? deux fois\b/, 'doubleBlink'],
  [/\bblinks?\b|\bcligne(nt)?\b/, 'blink'],
  [/\bnods? slightly\b|\bstress(es)? the point\b|\bemphasi[sz]es?\b|\binsiste(nt)?\b|\bappuie(nt)?\b/, 'emphasis'],
  [/\bnods?\b|\bhoche(nt)? la tete\b|\bacquiesce(nt)?\b/, 'nod'],
  [/\bshakes? (his |her |its |their )?head\b|\bsecoue(nt)? la tete\b|\bfait non\b/, 'shakeHead'],
  [/\bsighs?\b|\bexhales?\b|\bsoupire(nt)?\b/, 'sigh'],
  [/\blaughs?\b|\bchuckles?\b|\bgiggles?\b|\brit\b|\brient\b|\bricane(nt)?\b|\beclate(nt)? de rire\b/, 'laugh'],
  [/\bwaves?\b|\bsalue(nt)?\b|\bfait un signe\b/, 'wave'],
  [/\bthinks?\b|\bponders?\b|\bhesitates?\b|\bconsiders?\b|\breflechi(t|ssent)\b|\bhesite(nt)?\b/, 'thinking'],
  [/\bconfused\b|\bpuzzled\b|\bbaffled\b|\blost\b|\bperdu(e|s)?\b|\bconfus(e|es)?\b|\bperplexe(s)?\b|\bne comprend(s)? pas\b/, 'confused'],
  [/\bannoyed\b|\birritated\b|\bfrowns?\b|\bgrumpy\b|\bangry\b|\bagace(e|s)?\b|\benerve(e|s)?\b|\bfronce(nt)? les sourcils\b/, 'annoyed'],
  [/\bsmiles?\b|\bhappy\b|\bgrins?\b|\bpleased\b|\bdelighted\b|\bsourit\b|\bsourient\b|\bcontent(e|s)?\b|\bravi(e|s)?\b/, 'happy'],
  [/\bsurprised\b|\bshocked\b|\bgasps?\b|\bamazed\b|\bsurpris(e|es)?\b|\bchoque(e|s)?\b|\betonne(e|s)?\b/, 'surprised'],
  [/\bdeadpan\b|\bflat(ly)?\b|\bstone[- ]faced\b|\bimpassible(s)?\b|\bpince[- ]sans[- ]rire\b/, 'deadpan'],
  [/\bsmirks?\b|\bsmug\b|\bsourire en coin\b|\bnarquois(e)?\b/, 'smug'],
  [/\btired\b|\bexhausted\b|\bsleepy\b|\byawns?\b|\bfatigue(e|s)?\b|\bepuise(e|s)?\b|\bbaille(nt)?\b/, 'tired'],
  [/\bsad\b|\bupset\b|\bgloomy\b|\btriste(s)?\b|\babattu(e|s)?\b/, 'sad'],
  [/\bcurious\b|\bintrigued\b|\binterested\b|\bcurieux\b|\bcurieuse(s)?\b|\bintrigue(e|s)?\b/, 'curious'],
  [/\brelaxes\b|\bneutral\b|\bcalms? down\b|\bse detend(ent)?\b|\bse calme(nt)?\b/, 'neutral'],
  [/\bleans? (forward|in|closer)\b|\bse penche(nt)? (en avant|vers)\b|\bs'avance\b/, 'leanForward'],
  [/\bleans? back\b|\bsits? back\b|\bse cale(nt)? en arriere\b|\bse recule(nt)?\b|\bse renverse(nt)?\b/, 'leanBack'],
  [/\bgoes idle\b|\bidles?\b|\breste(nt)? tranquille(s)?\b/, 'idle']
]
/** Lower case, no diacritics, straight apostrophes: what the parsers compare against. */
export function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘]/g, "'")
}
/** Emotion words accepted in parentheses after a speaker label (normalized), mapped to an expression. */
export const EMOTION_WORDS: Record<string, Expression> = {
  neutral: 'neutral',
  neutre: 'neutral',
  tired: 'tired',
  fatigue: 'tired',
  curious: 'curious',
  curieux: 'curious',
  happy: 'happy',
  content: 'happy',
  joyeux: 'happy',
  sad: 'sad',
  triste: 'sad',
  surprised: 'surprised',
  surpris: 'surprised',
  annoyed: 'annoyed',
  agace: 'annoyed',
  enerve: 'annoyed',
  confused: 'confused',
  confus: 'confused',
  perdu: 'confused',
  perplexe: 'confused',
  deadpan: 'deadpan',
  impassible: 'deadpan',
  smug: 'smug',
  narquois: 'smug',
  'sourire en coin': 'smug'
}
/** The word the printer uses for an expression in each language. */
export const EMOTION_LABELS: Record<Expression, { en: string; fr: string }> = {
  neutral: { en: 'neutral', fr: 'neutre' },
  tired: { en: 'tired', fr: 'fatigué' },
  curious: { en: 'curious', fr: 'curieux' },
  happy: { en: 'happy', fr: 'content' },
  sad: { en: 'sad', fr: 'triste' },
  surprised: { en: 'surprised', fr: 'surpris' },
  annoyed: { en: 'annoyed', fr: 'agacé' },
  confused: { en: 'confused', fr: 'perdu' },
  deadpan: { en: 'deadpan', fr: 'impassible' },
  smug: { en: 'smug', fr: 'narquois' }
}
