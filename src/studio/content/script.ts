import { EXPRESSIONS, type Expression } from '../scene/model'
import { isShotMovement, isShotType, SHOT_TYPES, type ShotMovement, type ShotType } from '../camera/shots'
import { readingTime } from '../timeline/evaluate'
import { ACTING, ACTING_WORDS, type ActingCommand } from './acting'
import type { ActingCue, CastMember, DialogueLine, Shot } from './project'
/**
 * The script format: what a person writes and what a model generates.
 *
 *   [00:03.2]                 cursor time (optional: lines flow one after the other)
 *   CAMERA: close-up Lew slow-push
 *   Lew looks at CEO.         stage directions in plain sentences
 *   LEW (deadpan): "Then you have a chatbot."
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
const TIME = /^\[\s*(?:(\d+):)?(\d+(?:\.\d+)?)\s*s?\s*\]$/
const CAMERA = /^camera\s*:\s*(.+)$/i
const PAUSE = /^pause(?:\s+(\d+(?:\.\d+)?)\s*s?)?\.?$/i
const HEAD = /^([A-Za-z][\w .'-]{0,39}?)\s*(?:\(([^)]*)\))?\s*:\s*(.*)$/
/** Spoken forms into canonical tokens; each rule is idempotent on its own output. */
const SYNONYMS: [RegExp, string][] = [
  [/\bclose[- ]?up\b|\bcu\b/g, 'close-up'],
  [/\bover[- ]the[- ]shoulder\b|\bots\b/g, 'over-shoulder'],
  [/\btwo[- ]shot\b/g, 'two-shot'],
  [/\bpush(?:es)?[- ]in\b|\bzooms? in\b/g, 'push-in'],
  [/\bpulls?[- ](?:out|back)\b|\bzooms? out\b/g, 'pull-out'],
  [/\bslow(?:ly)?[- ]push(?:es)?\b|(?<![\w-])push(?:es)?\b(?![- ]in)/g, 'slow-push'],
  [/\bslow(?:ly)?[- ]pans?\b|(?<![\w-])pans?\b/g, 'slow-pan'],
  [/\bstatic\b|\bstill\b|\bhold\b/g, 'static']
]
function strip(text: string) {
  return text.trim().replace(/^["“”']+/, '').replace(/["“”']+$/, '').trim()
}
function findRole(cast: CastMember[], word: string) {
  const w = word.trim().toLowerCase()
  return cast.find((c) => c.role.toLowerCase() === w || c.name.toLowerCase() === w)?.role
}
function rolesIn(cast: CastMember[], sentence: string): string[] {
  const lower = sentence.toLowerCase()
  const found: { role: string; index: number }[] = []
  for (const c of cast)
    for (const key of [c.role, c.name]) {
      const m = new RegExp(`\\b${key.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).exec(lower)
      if (m && !found.some((f) => f.role === c.role)) found.push({ role: c.role, index: m.index })
    }
  return found.sort((a, b) => a.index - b.index).map((f) => f.role)
}
export function parseScript(text: string, cast: CastMember[]): ParsedScript {
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
    if (/^end\b/i.test(line)) {
      flush()
      break
    }
    const time = TIME.exec(line)
    if (time) {
      flush()
      cursor = round(Number(time[1] ?? 0) * 60 + Number(time[2]))
      continue
    }
    const pause = PAUSE.exec(line)
    if (pause) {
      flush()
      cursor = round(cursor + Number(pause[1] ?? 0.4))
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
        const seconds = /^(\d+(?:\.\d+)?)\s*s$/.exec(token)
        if (seconds) pending.duration = Number(seconds[1])
        else if ((EXPRESSIONS as string[]).includes(token)) pending.emotion = token as Expression
        else if (token in ACTING && ACTING[token as ActingCommand].expression) pending.emotion = ACTING[token as ActingCommand].expression
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
function parseShot(spec: string, cast: CastMember[], last?: string): Omit<Shot, 'id' | 'start'> | null {
  let s = spec.toLowerCase().replace(/[.,]/g, ' ')
  for (const [re, canonical] of SYNONYMS) s = s.replace(re, canonical)
  const tokens = s.split(/\s+/).filter((t) => t && !['on', 'of', 'the', 'and', 'to', 'camera', 'with'].includes(t))
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
function parseDirection(sentence: string, cast: CastMember[], last?: string): Direction {
  const lower = sentence.toLowerCase()
  const roles = rolesIn(cast, sentence)
  const result: Direction = { cues: [] }
  // "Camera slowly pushes toward Lew." keeps the current framing and adds a movement.
  if (/\bcamera\b/.test(lower) && !/\b(looks?|glances?|stares?) (at|to|toward)\b/.test(lower)) {
    let s = lower
    for (const [re, canonical] of SYNONYMS) s = s.replace(re, canonical)
    const movement = s.split(/\s+/).find(isShotMovement)
    const type = (s.split(/\s+/).find(isShotType) ?? 'medium') as ShotType
    const target = roles[0] ?? last ?? cast[0]?.role
    if (movement && target) result.shot = { type, target, movement }
    return result
  }
  const actor = roles[0] ?? (/\b(he|she|it|they|him|her)\b/.test(lower) ? last : undefined) ?? last ?? cast[0]?.role
  if (!actor) return result
  for (const [re, command] of ACTING_WORDS) {
    if (!re.test(lower)) continue
    if (command === 'lookAt') {
      const m = /\b(?:at|to|toward|towards)\s+(?:the\s+)?([a-z][\w-]*)/.exec(lower)
      const word = m?.[1] ?? ''
      const target = ['camera', 'viewer', 'audience', 'us', 'lens'].includes(word) ? 'camera' : (findRole(cast, word) ?? word)
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
export function printScript(project: { cast: CastMember[]; dialogue: DialogueLine[]; shots: Shot[]; cues: ActingCue[] }): string {
  type Item = { time: number; order: number; text: string }
  const items: Item[] = []
  for (const s of project.shots)
    items.push({
      time: s.start,
      order: 0,
      text: `CAMERA: ${s.type} ${label(project.cast, s.target)}${s.other ? ` ${label(project.cast, s.other)}` : ''}${s.movement !== 'static' ? ` ${s.movement}` : ''}`
    })
  for (const c of project.cues) {
    const prose = ACTING[c.command].prose.replace('%t', c.target === 'camera' ? 'the camera' : c.target ? label(project.cast, c.target) : 'the camera')
    items.push({ time: c.time, order: 1, text: `${label(project.cast, c.actor)} ${prose}` })
  }
  for (const d of project.dialogue) {
    const notes = [d.emotion, d.duration !== readingTime(d.text) ? `${d.duration}s` : undefined].filter(Boolean).join(', ')
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
LEW (deadpan): "A line."   emotion and/or a duration like (2.4s) in parentheses
Lew looks at CEO.    stage directions as plain sentences: nods, sighs, looks away, looks confused…
PAUSE 0.4`
