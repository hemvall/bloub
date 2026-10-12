import type { SceneData } from '../scene/model'
type RecordData = Record<string, unknown>
function record(value: unknown): RecordData {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected an object')
  return value as RecordData
}
function number(value: unknown, min = -1000, max = 1000) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    throw new Error(`Number must be between ${min} and ${max}`)
}
function vec(value: unknown) {
  if (!Array.isArray(value) || value.length !== 3) throw new Error('Expected XYZ vector')
  value.forEach((v) => number(v))
}
function text(value: unknown) {
  if (typeof value !== 'string' || !value.length || value.length > 200)
    throw new Error('Invalid text')
}
function color(value: unknown) {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value))
    throw new Error('Expected hex color')
}
function one(value: unknown, choices: unknown[]) {
  if (!choices.includes(value)) throw new Error(`Expected ${choices.join(', ')}`)
}
function list(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error('Invalid or oversized list')
  return value
}
function camera(value: unknown) {
  const c = record(value)
  vec(c.position)
  vec(c.target)
  number(c.fov, 15, 100)
}
function expression(value: unknown) {
  one(value, ['tired', 'curious', 'happy'])
}
function gaze(value: unknown, objects: Set<string>) {
  const g = record(value)
  one(g.kind, ['camera', 'point', 'object'])
  if (g.kind === 'point') vec(g.position)
  if (g.kind === 'object' && !objects.has(String(g.id))) throw new Error('Unknown gaze object')
}
export function parseScene(json: string): SceneData {
  if (json.length > 1_000_000) throw new Error('Scene file exceeds 1 MB')
  const s = record(JSON.parse(json))
  one(s.version, [1])
  text(s.name)
  number(s.duration, 0.1, 300)
  number(s.fps, 1, 120)
  one(s.aspect, ['16:9', '9:16', '1:1'])
  camera(s.camera)
  const env = record(s.environment)
  one(env.id, ['night-bar'])
  number(env.fog, 0, 0.15)
  number(env.rain, 0, 1)
  const characters = list(s.characters, 12).map(record),
    props = list(s.props, 100).map(record),
    lights = list(s.lights, 12).map(record)
  const ids = new Set<string>(['camera', 'environment', 'window', 'counter'])
  for (const object of [...characters, ...props, ...lights]) {
    text(object.id)
    if (ids.has(String(object.id))) throw new Error('Duplicate/reserved object ID')
    ids.add(String(object.id))
    vec(object.position)
    color(object.color)
  }
  for (const c of characters) {
    text(c.name)
    vec(c.rotation)
    number(c.scale, 0.1, 5)
    expression(c.expression)
    gaze(c.gaze, ids)
  }
  for (const p of props) {
    one(p.kind, ['glass', 'bottle'])
    vec(p.rotation)
    number(p.scale, 0.1, 5)
  }
  lights.forEach((l) => number(l.intensity, 0, 100))
  for (const item of list(s.timeline, 2000)) {
    const e = record(item)
    number(e.time, 0, s.duration as number)
    one(e.type, ['camera', 'position', 'gaze', 'expression'])
    if (e.type === 'camera') camera(e.pose)
    else {
      if (!characters.some((c) => c.id === e.character))
        throw new Error('Unknown timeline character')
      if (e.type === 'position') vec(e.position)
      if (e.type === 'gaze') gaze(e.target, ids)
      if (e.type === 'expression') expression(e.expression)
    }
  }
  return structuredClone(s) as unknown as SceneData
}
export function serializeScene(scene: SceneData) {
  return JSON.stringify(scene, null, 2)
}
