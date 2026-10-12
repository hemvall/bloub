import type { Expression } from '../scene/model'
import { isShotMovement, isShotType, SHOT_TYPES, type ShotMovement, type ShotType } from '../camera/shots'
import { readingTime } from '../timeline/evaluate'
import { ACTING, ACTING_WORDS, EMOTION_LABELS, EMOTION_WORDS, normalize, type ActingCommand } from './acting'
import type { ActingCue, CastMember, DialogueLine, Shot } from './project'
import type { ContentLanguage } from '../audio/plan'
/**
 * The script format: what a person writes and what a model generates. French
 * and English are read alike; the printer writes stage directions in the
 * project's language and keeps the format's keywords (CAMERA, PAUSE, shot names).
 *
 *   [00:03.2]                 cursor time (optional: lines flow one after the other)
 *   CAMERA: close-up Lew slow-push
 *   Lew regarde le CEO.       stage directions in plain sentences
 *   LEW (impassible): "Alors vous avez un chatbot."
 *   PAUSE 0.4
 *
 * `parseScript` is deterministic and `printScript` writes exactly what parses
 * back to the same beats, so the text is a view of the project, never a second truth.
 */
export interface ParsedScript {
  dialogue: DialogueLine[]
  shots: Shot[]
  cues: ActingCue[]
  warnings: string[]
}
export const LINE_GAP = 0.3
const round = (t: number) => Math.round(t * 100) / 100
const TIME = /^\[\s*(?:(\d+):)?(\d+(?:[.,]\d+)?)\s*s?\s*\]$/
const CAMERA = /^cam[ée]ra\s*:\s*(.+)$/i
const PAUSE = /^pause(?:\s+(\d+(?:[.,]\d+)?)\s*s?)?\.?$/i
const HEAD = /^([\p{L}][\p{L}\d .'-]{0,39}?)\s*(?:\(([^)]*)\))?\s*:\s*(.*)$/u
/** Spoken forms, in both languages, into canonical tokens; each rule is idempotent on its own output. */
const SYNONYMS: [RegExp, string][] = [
  [/\bclose[- ]?up\b|\bcu\b|\bgros plan\b|\btres gros plan\b/g, 'close-up'],
  [/\bover[- ]the[- ]shoulder\b|\bots\b|\bpar[- ]dessus l'epaule\b|\bepaule\b/g, 'over-shoulder'],
  [/\btwo[- ]shot\b|\bplan (a|a) deux\b|\bplan deux\b|\bles deux\b/g, 'two-shot'],
  [/\bplan (moyen|rapproche|americain|taille)\b|\bmoyen\b/g, 'medium'],
  [/\bplan (large|d'ensemble|general)\b|\blarge\b/g, 'wide'],
  [/\b(de )?profil\b/g, 'profile'],
  [/\bpush(?:es)?[- ]in\b|\bzooms? in\b|\bzoom avant\b|\bavance vite\b/g, 'push-in'],
  [/\bpulls?[- ](?:out|back)\b|\bzooms? out\b|\bzoom arriere\b|\brecule\b|\bs'eloigne\b/g, 'pull-out'],
  [/\bslow(?:ly)?[- ]push(?:es)?\b|(?<![\w-])push(?:es)?\b(?![- ]in)|\btravelling avant( lent)?\b|\bavance lentement\b|\bse rapproche( lentement)?\b|\bzoom lent\b/g, 'slow-push'],
  [/\bslow(?:ly)?[- ]pans?\b|(?<![\w-])pans?\b|\bpanoramique( lent)?\b|\bglisse\b/g, 'slow-pan'],
  [/\bstatic\b|\bstill\b|\bhold\b|\bfixe\b/g, 'static']
]
const STOP = new Set(['on', 'of', 'the', 'and', 'to', 'camera', 'with', 'sur', 'de', 'du', 'le', 'la', 'les', 'et', 'un', 'une', 'avec', 'plan', 'en'])
function strip(text: string) {
  return text.trim().replace(/^[«"“”']+\s*/, '').replace(/\s*[»"“”']+$/, '').trim()
}
function findRole(cast: CastMember[], word: string) {
  const w = normalize(word.trim())
  return cast.find((c) => normalize(c.role) === w || normalize(c.name) === w)?.role
}
function escape(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
function rolesIn(cast: CastMember[], sentence: string): string[] {
  const lower = normalize(sentence)
  const found: { role: string; index: number }[] = []
  for (const c of cast)
    for (const key of [c.role, c.name]) {
      const m = new RegExp(`(?<![\\p{L}\\d])${escape(normalize(key))}(?![\\p{L}\\d])`, 'u').exec(lower)
      if (m && !found.some((f) => f.role === c.role)) found.push({ role: c.role, index: m.index })
    }
  return found.sort((a, b) => a.index - b.index).map((f) => f.role)
}
function emotionOf(token: string): Expression | undefined {
  const t = normalize(token)
  if (t in EMOTION_WORDS) return EMOTION_WORDS[t]
  const base = t.replace(/e?s$/, '')
  if (base in EMOTION_WORDS) return EMOTION_WORDS[base]
  if (t in ACTING && ACTING[t as ActingCommand].expression) return ACTING[t as ActingCommand].expression
  return undefined
}
export function parseScript(text: string, cast: CastMember[], _language: ContentLanguage = 'en'): ParsedScript {
  const out: ParsedScript = { dialogue: [], shots: [], cues: [], warnings: [] }
  let cursor = 0,
    last: string | undefined,
    pending: { speaker: string; emotion?: Expression; duration?: number; text: string[] } | null = null,
    n = { d: 0, s: 0, c: 0 }
  const flush = () => {
    if (!pending) return
    const line = pending.text.join(' ').trim()
    if (line) {
      const duration = pending.duration ?? readingTime(line)
      out.dialogue.push({
        id: `d-${++n.d}`,
        speaker: pending.speaker,
        text: line,
        start: round(cursor),
        duration,
        ...(pending.emotion && { emotion: pending.emotion })
      })
      last = pending.speaker
      cursor = round(cursor + duration + LINE_GAP)
    } else out.warnings.push(`${pending.speaker} has an empty line`)
    pending = null
  }
  const lines = text.replace(/\r/g, '').split('\n')
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flush()
      continue
    }
    if (/^(end|fin)\b/i.test(line)) {
      flush()
      break
    }
    const time = TIME.exec(line)
    if (time) {
      flush()
      cursor = round(Number(time[1] ?? 0) * 60 + Number(time[2]!.replace(',', '.')))
      continue
    }
    const pause = PAUSE.exec(line)
    if (pause) {
      flush()
      cursor = round(cursor + Number((pause[1] ?? '0.4').replace(',', '.')))
      continue
    }
    const cam = CAMERA.exec(line)
    if (cam) {
      flush()
      const shot = parseShot(cam[1]!, cast, last)
      if (shot) out.shots.push({ id: `s-${++n.s}`, ...shot, start: round(cursor) })
      else out.warnings.push(`Could not read the shot: "${line}"`)
      continue
    }
    const head = HEAD.exec(line)
    const speaker = head && findRole(cast, head[1]!)
    if (head && speaker) {
      flush()
      pending = { speaker, text: [] }
      for (const token of (head[2] ?? '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)) {
        const seconds = /^(\d+(?:[.,]\d+)?)\s*s$/.exec(token)
        const emotion = emotionOf(token)
        if (seconds) pending.duration = Number(seconds[1]!.replace(',', '.'))
        else if (emotion) pending.emotion = emotion
        else out.warnings.push(`Unknown emotion "${token}" on ${speaker}'s line`)
      }
      if (head[3]) {
        pending.text.push(strip(head[3]))
        flush()
      }
      continue
    }
    if (pending) {
      pending.text.push(strip(line))
      continue
    }
    const before = out.cues.length + out.shots.length
    for (const sentence of line.split(/(?<=[.!?])\s+/)) {
      const read = parseDirection(sentence, cast, last)
      if (read.shot) out.shots.push({ id: `s-${++n.s}`, ...read.shot, start: round(cursor) })
      for (const cue of read.cues) out.cues.push({ id: `c-${++n.c}`, time: round(cursor), ...cue })
      if (read.cues.length) last = read.cues[read.cues.length - 1]!.actor
    }
    if (out.cues.length + out.shots.length === before) out.warnings.push(`Could not read: "${line}"`)
  }
  flush()
  return out
}
function canonical(spec: string) {
  let s = normalize(spec).replace(/[.,]/g, ' ')
  for (const [re, token] of SYNONYMS) s = s.replace(re, token)
  return s
}
function parseShot(spec: string, cast: CastMember[], last?: string): Omit<Shot, 'id' | 'start'> | null {
  const tokens = canonical(spec)
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t))
  const type = tokens.find(isShotType)
  if (!type) return null
  const movement = (tokens.find(isShotMovement) ?? 'static') as ShotMovement
  const roles = tokens.map((t) => findRole(cast, t)).filter((r): r is string => !!r)
  let target = roles[0],
    other = roles[1]
  if (!target) {
    target = type === 'two-shot' ? cast[0]?.role : (last ?? cast[0]?.role)
    if (type === 'two-shot' && !other) other = cast.find((c) => c.role !== target)?.role
  }
  if (!target) return null
  return { type, target, ...(other && { other }), movement }
}
interface Direction {
  shot?: Omit<Shot, 'id' | 'start'>
  cues: Omit<ActingCue, 'id' | 'time'>[]
}
const CAMERA_WORD = /\bcamera\b/
const LOOK_AT = /\b(?:looks?|glances?|stares?|turns?) (?:at|to|toward|towards)\b|\bregarde(?:nt)?\b|\bfixe(?:nt)?\b|\bse tourne(?:nt)? vers\b|\bobserve(?:nt)?\b/
const LOOK_TARGET = /\b(?:at|to|toward|towards|regarde(?:nt)?|fixe(?:nt)?|vers|observe(?:nt)?)\s+(?:the\s+|le\s+|la\s+|les\s+|l'|du\s+|de\s+la\s+|des\s+)?([a-z][a-z\d-]*)/
const CAMERA_WORDS = new Set(['camera', 'viewer', 'audience', 'us', 'lens', 'spectateur', 'public', 'objectif', 'nous'])
function parseDirection(sentence: string, cast: CastMember[], last?: string): Direction {
  const lower = normalize(sentence)
  const roles = rolesIn(cast, sentence)
  const result: Direction = { cues: [] }
  // "Camera slowly pushes toward Lew." / "La caméra se rapproche de Lew." keeps the framing and adds a movement.
  if (CAMERA_WORD.test(lower) && !LOOK_AT.test(lower.replace(CAMERA_WORD, ''))) {
    const tokens = canonical(lower).split(/\s+/)
    const movement = tokens.find(isShotMovement)
    const type = (tokens.find(isShotType) ?? 'medium') as ShotType
    const target = roles[0] ?? last ?? cast[0]?.role
    if (movement && target) result.shot = { type, target, movement }
    return result
  }
  const actor = roles[0] ?? (/\b(he|she|it|they|him|her|il|elle|ils|elles)\b/.test(lower) ? last : undefined) ?? last ?? cast[0]?.role
  if (!actor) return result
  for (const [re, command] of ACTING_WORDS) {
    if (!re.test(lower)) continue
    if (command === 'lookAt') {
      const m = LOOK_TARGET.exec(lower)
      const word = m?.[1] ?? ''
      const target = CAMERA_WORDS.has(word) ? 'camera' : (findRole(cast, word) ?? word)
      if (target) result.cues.push({ actor, command, target })
    } else result.cues.push({ actor, command })
  }
  return result
}
// --- Printing ------------------------------------------------------------------
export function formatTime(t: number) {
  const m = Math.floor(t / 60),
    s = t - m * 60
  return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`
}
function label(cast: CastMember[], role: string) {
  return cast.find((c) => c.role === role)?.name ?? role
}
export function printScript(
  project: { cast: CastMember[]; dialogue: DialogueLine[]; shots: Shot[]; cues: ActingCue[] },
  language: ContentLanguage = 'en'
): string {
  type Item = { time: number; order: number; text: string }
  const items: Item[] = []
  const cameraWord = language === 'fr' ? 'la caméra' : 'the camera'
  for (const s of project.shots)
    items.push({
      time: s.start,
      order: 0,
      text: `CAMERA: ${s.type} ${label(project.cast, s.target)}${s.other ? ` ${label(project.cast, s.other)}` : ''}${s.movement !== 'static' ? ` ${s.movement}` : ''}`
    })
  for (const c of project.cues) {
    const prose = ACTING[c.command].prose[language].replace('%t', c.target === 'camera' || !c.target ? cameraWord : label(project.cast, c.target))
    items.push({ time: c.time, order: 1, text: `${label(project.cast, c.actor)} ${prose}` })
  }
  for (const d of project.dialogue) {
    const notes = [d.emotion && EMOTION_LABELS[d.emotion][language], d.audio || d.duration !== readingTime(d.text) ? `${d.duration}s` : undefined].filter(Boolean).join(', ')
    items.push({ time: d.start, order: 2, text: `${label(project.cast, d.speaker).toUpperCase()}${notes ? ` (${notes})` : ''}: "${d.text}"` })
  }
  items.sort((a, b) => a.time - b.time || a.order - b.order)
  const blocks: string[] = []
  let current = -1
  for (const item of items) {
    if (Math.abs(item.time - current) > 1e-6) {
      current = item.time
      blocks.push(`\n[${formatTime(item.time)}]`)
    }
    blocks.push(item.text)
  }
  return blocks.join('\n').trim() + '\n'
}
export const SCRIPT_HELP = `[00:00.0]            time (mm:ss.s); without it lines follow each other
CAMERA: ${SHOT_TYPES.join(' | ')} <who> [slow-push | push-in | pull-out | slow-pan]
   (French also reads: gros plan, plan moyen, plan large, profil, plan à deux, épaule, zoom lent)
LEW (deadpan): "A line."   emotion and/or a duration like (2.4s) in parentheses
Lew looks at CEO.    stage directions as plain sentences: nods, sighs, looks away, looks confused…
PAUSE 0.4`
