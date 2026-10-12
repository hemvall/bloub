import {
  ACTIONS,
  ASPECTS,
  EXPRESSIONS,
  EVENT_TYPES,
  PROP_KINDS,
  uid,
  type SceneData
} from '../scene/model'
import { CHARACTER_KINDS } from '../characters/catalog'
import { ENVIRONMENTS, ENVIRONMENT_IDS } from '../environments/catalog'
import { LEW_SUBTITLES } from '../subtitles/style'
import { isScreenId, isScreenImage } from '../props/screens'
/** Validation of any document coming from outside (file, chat, agent). Bounded, reference-checked, atomic. */
type RecordData = Record<string, unknown>
export function record(value: unknown, what = 'object'): RecordData {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`Expected an ${what}`)
  return value as RecordData
}
export function number(value: unknown, min = -1000, max = 1000, what = 'number') {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    throw new Error(`${what} must be between ${min} and ${max}`)
  return value
}
export function vec(value: unknown, what = 'vector') {
  if (!Array.isArray(value) || value.length !== 3) throw new Error(`${what} must be [x, y, z]`)
  value.forEach((v) => number(v, -1000, 1000, what))
}
export function text(value: unknown, what = 'text', max = 200, allowEmpty = false) {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim().length) || value.length > max)
    throw new Error(`Invalid ${what}`)
  return value
}
export function color(value: unknown) {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value))
    throw new Error('Expected a #rrggbb colour')
}
export function one<T>(value: unknown, choices: readonly T[], what = 'value'): T {
  if (!choices.includes(value as T)) throw new Error(`${what} must be one of ${choices.join(', ')}`)
  return value as T
}
export function list(value: unknown, max: number, what: string): unknown[] {
  if (!Array.isArray(value) || value.length > max)
    throw new Error(`${what} must be a list of at most ${max}`)
  return value
}
function camera(value: unknown) {
  const c = record(value, 'camera pose')
  vec(c.position, 'camera position')
  vec(c.target, 'camera target')
  number(c.fov, 10, 120, 'fov')
}
function gaze(value: unknown, objects: Set<string>) {
  const g = record(value, 'gaze target')
  one(g.kind, ['camera', 'point', 'object'] as const, 'gaze kind')
  if (g.kind === 'point') vec(g.position, 'gaze point')
  if (g.kind === 'object' && !objects.has(String(g.id)))
    throw new Error(`Unknown gaze target: ${String(g.id)}`)
}
function subtitles(value: unknown) {
  const s = record(value, 'subtitle style')
  if (typeof s.enabled !== 'boolean') throw new Error('subtitles.enabled must be a boolean')
  one(s.mode, ['words', 'caption'] as const, 'subtitle mode')
  text(s.font, 'subtitle font', 120)
  number(s.weight, 100, 900, 'subtitle weight')
  number(s.size, 0.01, 0.2, 'subtitle size')
  color(s.color)
  color(s.highlight)
  color(s.stroke)
  number(s.positionPortrait, 0, 1, 'subtitle position')
  number(s.positionLandscape, 0, 1, 'subtitle position')
  number(s.wordsPerLine, 1, 12, 'words per line')
  number(s.maxWidth, 0.2, 1, 'subtitle width')
  if (typeof s.uppercase !== 'boolean' || typeof s.speakerLabel !== 'boolean') throw new Error('subtitle flags must be booleans')
  one(s.entrance, ['pop', 'fade', 'none'] as const, 'subtitle entrance')
}
/** Older documents still load; missing fields get defaults. */
function migrate(s: RecordData): RecordData {
  let doc = s
  if (doc.version === 1) {
    const env = record(doc.environment)
    const chars = Array.isArray(doc.characters) ? doc.characters : []
    const timeline = Array.isArray(doc.timeline) ? doc.timeline : []
    doc = {
      ...doc,
      version: 2,
      environment: { ...env, bloom: env.bloom ?? 0.45 },
      characters: chars.map((c: unknown) => ({ kind: 'kit', ...record(c) })),
      timeline: timeline.map((e: unknown) => ({ id: uid('k'), ...record(e) }))
    }
  }
  if (doc.version === 2) doc = { ...doc, version: 3, subtitles: structuredClone(LEW_SUBTITLES) }
  return doc
}
export function parseScene(json: string): SceneData {
  if (json.length > 2_000_000) throw new Error('Scene file exceeds 2 MB')
  return validateScene(JSON.parse(json))
}
export function validateScene(input: unknown): SceneData {
  const s = migrate(record(input, 'scene'))
  one(s.version, [3] as const, 'version')
  text(s.name, 'scene name', 120)
  const duration = number(s.duration, 0.5, 300, 'duration')
  number(s.fps, 1, 120, 'fps')
  one(s.aspect, ASPECTS, 'aspect')
  camera(s.camera)
  subtitles(s.subtitles)
  const env = record(s.environment, 'environment')
  const envId = one(env.id, ENVIRONMENT_IDS, 'environment')
  number(env.fog, 0, 0.2, 'fog')
  number(env.rain, 0, 1, 'rain')
  number(env.bloom, 0, 2, 'bloom')
  const characters = list(s.characters, 8, 'characters').map((c) => record(c, 'character')),
    props = list(s.props, 120, 'props').map((p) => record(p, 'prop')),
    lights = list(s.lights, 12, 'lights').map((l) => record(l, 'light'))
  const ids = new Set<string>(['camera', 'environment', ...Object.keys(ENVIRONMENTS[envId].anchors)])
  for (const object of [...characters, ...props, ...lights]) {
    const id = text(object.id, 'object id', 60)
    if (!/^[a-z0-9][a-z0-9_-]*$/i.test(id)) throw new Error(`Invalid object id: ${id}`)
    if (ids.has(id)) throw new Error(`Duplicate or reserved object id: ${id}`)
    ids.add(id)
    vec(object.position, `${id} position`)
    color(object.color)
  }
  for (const c of characters) {
    text(c.name, 'character name', 40)
    one(c.kind, CHARACTER_KINDS, 'character kind')
    vec(c.rotation, 'rotation')
    number(c.scale, 0.2, 4, 'scale')
    one(c.expression, EXPRESSIONS, 'expression')
    gaze(c.gaze, ids)
  }
  for (const p of props) {
    one(p.kind, PROP_KINDS, 'prop kind')
    vec(p.rotation, 'rotation')
    number(p.scale, 0.1, 6, 'scale')
    if (p.screen !== undefined) {
      const screen = text(p.screen, 'screen content', 600_000)
      if (!isScreenId(screen) && !isScreenImage(screen)) throw new Error(`Unknown screen content: ${screen.slice(0, 40)}`)
    }
  }
  lights.forEach((l) => number(l.intensity, 0, 200, 'light intensity'))
  const eventIds = new Set<string>()
  for (const item of list(s.timeline, 2000, 'timeline')) {
    const e = record(item, 'timeline event')
    const id = text(e.id, 'event id', 40)
    if (eventIds.has(id)) throw new Error(`Duplicate event id: ${id}`)
    eventIds.add(id)
    number(e.time, 0, duration, 'event time')
    const type = one(e.type, EVENT_TYPES, 'event type')
    if (type === 'camera') {
      camera(e.pose)
      if (e.cut !== undefined && typeof e.cut !== 'boolean') throw new Error('camera cut must be a boolean')
      if (e.label !== undefined) text(e.label, 'camera label', 60)
    } else {
      if (!characters.some((c) => c.id === e.character))
        throw new Error(`Timeline event for unknown character: ${String(e.character)}`)
      if (type === 'position') vec(e.position, 'key position')
      if (type === 'gaze') gaze(e.target, ids)
      if (type === 'expression') one(e.expression, EXPRESSIONS, 'expression')
      if (type === 'action') one(e.action, ACTIONS, 'action')
      if (type === 'dialogue') {
        text(e.text, 'dialogue text', 280)
        number(e.duration, 0.2, 60, 'dialogue duration')
        if (e.envelope !== undefined) list(e.envelope, 3000, 'envelope').forEach((v) => number(v, 0, 1, 'envelope sample'))
      }
    }
  }
  const scene = structuredClone(s) as unknown as SceneData
  scene.timeline.sort((a, b) => a.time - b.time)
  return scene
}
export function serializeScene(scene: SceneData) {
  return JSON.stringify(scene, null, 2)
}
