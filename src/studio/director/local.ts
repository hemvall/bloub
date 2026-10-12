import type { ActionId, Expression, SceneData } from '../scene/model'
import { CHARACTERS, CHARACTER_KINDS } from '../characters/catalog'
import { ENVIRONMENTS } from '../environments/catalog'
import { readingTime } from '../timeline/evaluate'
import { PRESET_NAMES, type PresetName } from '../camera/presets'
import type { DirectorOp, DirectorScript } from './script'
/**
 * Offline director: a small rule-based reading of English stage directions.
 * It covers the common shapes ("Kit looks at the window", "after two seconds
 * he sighs", "close-up at 3s", "Pip says 'hi'") so the chat works without an
 * API key, and it is deterministic, so it is tested. Claude handles the rest.
 */
const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, half: 0.5, a: 1, an: 1
}
const EXPRESSION_WORDS: [RegExp, Expression][] = [
  [/\b(tired|exhausted|sleepy|bored|unimpressed|weary)\b/, 'tired'],
  [/\b(curious|interested|intrigued|wonder)/, 'curious'],
  [/\b(happy|smiles?|smiling|glad|cheerful|delighted|pleased|grins?)\b/, 'happy'],
  [/\b(sad|upset|gloomy|down|cries|crying|tearful)\b/, 'sad'],
  [/\b(surprised|shocked|amazed|startled|gasps?)\b/, 'surprised'],
  [/\b(annoyed|angry|irritated|grumpy|frowns?|scowls?|mad)\b/, 'annoyed'],
  [/\b(neutral|calm|relaxes?|blank)\b/, 'neutral']
]
const ACTION_WORDS: [RegExp, ActionId][] = [
  [/\b(sighs?|exhales?)\b/, 'sigh'],
  [/\bnods?\b/, 'nod'],
  [/\bshakes? (his |her |its |their )?head\b/, 'shake'],
  [/\b(bounces?|jumps?|hops?)\b/, 'bounce'],
  [/\bwaves?\b/, 'wave'],
  [/\b(thinks?|ponders?|wonders?|hesitates?)\b/, 'think'],
  [/\b(laughs?|giggles?|chuckles?)\b/, 'laugh']
]
const PRESET_WORDS: [RegExp, PresetName][] = [
  [/\b(close[- ]?up|zoom(s)? in|pushes? (in|toward)|closer)\b/, 'Close-up'],
  [/\bover[- ]the[- ]shoulder\b/, 'Over-the-shoulder'],
  [/\bprofile\b/, 'Profile'],
  [/\b(wide|establishing|pulls? (out|back)|far)\b/, 'Wide'],
  [/\bmedium\b/, 'Medium']
]
function seconds(text: string): number | undefined {
  const m = text.match(/\b(?:at|after|around|@)\s+(\d+(?:[.,]\d+)?|[a-z]+)(?:\s*(?:s|sec|seconds?))?\b/)
  if (!m) return undefined
  const raw = m[1]!
  const n = /^\d/.test(raw) ? Number(raw.replace(',', '.')) : NUMBER_WORDS[raw]
  if (n === undefined) return undefined
  return n
}
function splitSentences(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?]["”']?)\s+|\s*;\s*|\s+then\s+|\n+/i)
    .map((s) => s.trim())
    .filter(Boolean)
}
interface Ctx {
  scene: SceneData
  cursor: number
  last?: string
  ops: DirectorOp[]
  notes: string[]
}
function findCharacter(ctx: Ctx, sentence: string): string | undefined {
  const lower = sentence.toLowerCase()
  for (const c of ctx.scene.characters)
    if (new RegExp(`\\b${c.name.toLowerCase()}\\b`).test(lower) || new RegExp(`\\b${c.id.toLowerCase()}\\b`).test(lower))
      return c.id
  for (const op of ctx.ops) if (op.op === 'addCharacter' && new RegExp(`\\b${(op.name ?? CHARACTERS[op.kind].name).toLowerCase()}\\b`).test(lower)) return op.id ?? op.kind
  if (/\b(he|she|it|they|him|her)\b/.test(lower) && ctx.last) return ctx.last
  return ctx.last ?? ctx.scene.characters[0]?.id
}
function gazeTarget(ctx: Ctx, sentence: string): string | undefined {
  const lower = sentence.toLowerCase()
  if (/\b(camera|viewer|us|audience|lens)\b/.test(lower)) return 'camera'
  const anchors = Object.keys(ENVIRONMENTS[ctx.scene.environment.id].anchors)
  for (const a of anchors) if (lower.includes(a.replace('-', ' ')) || lower.includes(a)) return a
  for (const c of ctx.scene.characters) if (lower.includes(c.name.toLowerCase())) return c.id
  for (const p of ctx.scene.props) if (lower.includes(p.id) || lower.includes(p.kind)) return p.id
  return undefined
}
export function localDirector(text: string, scene: SceneData): DirectorScript {
  const ctx: Ctx = { scene, cursor: 0, ops: [], notes: [] }
  for (const sentence of splitSentences(text)) {
    const lower = sentence.toLowerCase()
    const explicit = seconds(lower)
    let time = explicit ?? ctx.cursor
    if (explicit !== undefined && /\bafter\b/.test(lower)) time = ctx.cursor + explicit
    let handled = false
    // Scene-level directions.
    for (const id of Object.keys(ENVIRONMENTS) as (keyof typeof ENVIRONMENTS)[]) {
      const words = ENVIRONMENTS[id].name.toLowerCase().split(/\s+/)
      if (lower.includes(id) || words.some((w) => w.length > 3 && lower.includes(w)) || (id === 'night-bar' && /\bbar\b/.test(lower))) {
        if (/\b(in|at|inside|on|to|set|switch|use|scene|environment)\b/.test(lower) && ctx.scene.environment.id !== id) {
          ctx.ops.push({ op: 'environment', id })
          handled = true
        }
      }
    }
    const dur = lower.match(/\b(\d+(?:\.\d+)?|[a-z]+)[- ]?(?:second|sec|s)\b[^.]*\b(long|duration|total)\b|\bduration (?:of |to |is )?(\d+(?:\.\d+)?)/)
    if (dur) {
      const n = Number(dur[3] ?? (/^\d/.test(dur[1]!) ? dur[1] : NUMBER_WORDS[dur[1]!]))
      if (n) ctx.ops.push({ op: 'duration', seconds: n })
      handled = true
    }
    if (/\b(vertical|portrait|9:16|reel|tiktok|short)\b/.test(lower)) ctx.ops.push({ op: 'aspect', aspect: '9:16' }), (handled = true)
    else if (/\b(landscape|16:9|widescreen|youtube)\b/.test(lower)) ctx.ops.push({ op: 'aspect', aspect: '16:9' }), (handled = true)
    else if (/\b(square|1:1)\b/.test(lower)) ctx.ops.push({ op: 'aspect', aspect: '1:1' }), (handled = true)
    const rain = lower.match(/\b(no|stop|less|more|heavy|light|start)\b[^.]*\brain|\brain\b[^.]*\b(off|on|stops?|harder)\b/)
    if (rain) {
      const off = /\b(no|stop|off|stops)\b/.test(lower)
      ctx.ops.push({ op: 'atmosphere', rain: off ? 0 : /\b(less|light)\b/.test(lower) ? 0.3 : 1 })
      handled = true
    }
    // Casting.
    for (const kind of CHARACTER_KINDS) {
      const name = CHARACTERS[kind].name.toLowerCase()
      const present = ctx.scene.characters.some((c) => c.kind === kind) || ctx.ops.some((o) => o.op === 'addCharacter' && o.kind === kind)
      if (new RegExp(`\\b(add|bring|put|with|and|cast|enter|introduce)\\b[^.]*\\b${name}\\b`).test(lower) && !present) {
        ctx.ops.push({ op: 'addCharacter', kind })
        ctx.last = kind
        handled = true
      } else if (!present && new RegExp(`^${name}\\b`).test(lower) && ctx.scene.characters.length === 0) {
        ctx.ops.push({ op: 'addCharacter', kind })
        ctx.last = kind
      }
    }
    const removal = lower.match(/\b(remove|delete|drop|kill)\b\s+(\w+)/)
    if (removal) {
      const id = findCharacter(ctx, removal[2]!)
      if (id && ctx.scene.characters.some((c) => c.id === id)) ctx.ops.push({ op: 'removeCharacter', character: id }), (handled = true)
    }
    // Camera.
    if (/\b(camera|shot|close[- ]?up|wide|zoom|push|pull|profile|over[- ]the[- ]shoulder)\b/.test(lower)) {
      const preset = PRESET_WORDS.find(([re]) => re.test(lower))?.[1]
      if (preset) {
        const subject = findCharacter(ctx, sentence.replace(/\bcamera\b/i, ''))
        ctx.ops.push({ op: 'camera', time, preset, ...(subject && { subject }) })
        handled = true
      }
    }
    const who = findCharacter(ctx, sentence)
    // Dialogue, in quotes or after "says".
    const quote = sentence.match(/["“”']([^"“”']{2,})["“”']/) ?? sentence.match(/\b(?:says?|asks?|replies|whispers?|shouts?|mutters?|answers?)[,:]?\s+(.+)$/i)
    if (quote && who) {
      const line = quote[1]!.trim().replace(/[.]$/, '')
      ctx.ops.push({ op: 'say', character: who, text: line, time })
      ctx.cursor = time + readingTime(line) + 0.3
      ctx.last = who
      handled = true
    }
    // Gaze.
    if (who && /\b(looks?|glances?|stares?|turns? to|faces?|watch(es)?|eyes)\b/.test(lower) && !/\bcamera (push|pull|move)/.test(lower)) {
      const target = gazeTarget(ctx, sentence)
      if (target) {
        ctx.ops.push({ op: 'gaze', character: who, target, time })
        ctx.last = who
        handled = true
      }
    }
    // Expression and actions.
    if (who) {
      const expression = EXPRESSION_WORDS.find(([re]) => re.test(lower))?.[1]
      if (expression && !quote) {
        ctx.ops.push({ op: 'expression', character: who, expression, time })
        ctx.last = who
        handled = true
      }
      const action = ACTION_WORDS.find(([re]) => re.test(lower))?.[1]
      if (action && !quote) {
        ctx.ops.push({ op: 'action', character: who, action, time })
        ctx.cursor = Math.max(ctx.cursor, time + 1.2)
        ctx.last = who
        handled = true
      }
    }
    if (!handled) ctx.notes.push(sentence)
    else if (explicit !== undefined) ctx.cursor = Math.max(ctx.cursor, time + 0.8)
  }
  const needed = Math.max(0, ...ctx.ops.map((o) => ('time' in o && o.time ? o.time : 0)))
  if (needed + 1.5 > scene.duration && !ctx.ops.some((o) => o.op === 'duration'))
    ctx.ops.push({ op: 'duration', seconds: Math.ceil(needed + 2) })
  const reply = ctx.ops.length
    ? `Applied ${ctx.ops.length} direction${ctx.ops.length > 1 ? 's' : ''}.${ctx.notes.length ? ` I could not read: “${ctx.notes.join('”, “')}”.` : ''}`
    : `I could not turn that into directions. Try sentences like “Kit looks at the window”, “after two seconds he sighs”, “close-up at 3s”, “Pip says 'hello'”. Presets: ${PRESET_NAMES.join(', ')}.`
  return { reply, ops: ctx.ops }
}
