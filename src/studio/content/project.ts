import { EXPRESSIONS, PROP_KINDS, type CharacterKind, type EnvironmentId, type Expression, type PropData, type SceneData } from '../scene/model'
import { isShotMovement, isShotType, type ShotMovement, type ShotType } from '../camera/shots'
import { isOutputFormat, OUTPUT_PRESETS, type OutputFormat } from '../render/presets'
import { CHARACTER_KINDS, CHARACTERS } from '../characters/catalog'
import { ENVIRONMENTS, isEnvironmentId } from '../environments/catalog'
import { emptyScene } from '../scene/examples'
import { validateScene, record, text, number, one, list, vec, color } from '../serialization/scene'
import { isScreenId, isScreenImage } from '../props/screens'
import { isActingCommand, type ActingCommand } from './acting'
import { DEFAULT_AUDIO, DEFAULT_VOICE, MUSIC_TRACKS, TTS_PROVIDERS, type AudioConfig, type LineAudio, type VoiceConfig } from '../audio/plan'
export type { AudioConfig, LineAudio, VoiceConfig } from '../audio/plan'
/**
 * A content project: everything a reel is made of, above the scene document.
 * Dialogue, shots and cues are the source; `scene` is what the compiler made
 * of them, plus whatever was adjusted by hand afterwards. All of it serialises.
 */
export type ProjectStatus = 'draft' | 'ready' | 'rendered'
export const PROJECT_STATUSES: ProjectStatus[] = ['draft', 'ready', 'rendered']
export interface CastMember {
  /** The id used in scripts and in the scene: `lew`, `ceo`... */
  role: string
  kind: CharacterKind
  name: string
  /** A named spot of the environment; otherwise the next free seat. */
  mark?: string
}
export interface DialogueLine {
  id: string
  speaker: string
  text: string
  start: number
  duration: number
  emotion?: Expression
  /** Set once a voice clip exists for this text and voice; the duration then follows the clip. */
  audio?: LineAudio
}
export interface Shot {
  id: string
  type: ShotType
  target: string
  /** Second subject of a two-shot or the shoulder of an over-shoulder; picked automatically when absent. */
  other?: string
  start: number
  /** How long a movement takes; a static shot simply holds until the next cut. */
  duration?: number
  movement: ShotMovement
}
export interface ActingCue {
  id: string
  time: number
  actor: string
  command: ActingCommand
  target?: string
}
export interface ProjectMeta {
  createdAt: string
  updatedAt: string
  renderedAt?: string
  tags: string[]
  notes: string
  /** Small JPEG data URL captured from the engine for the library. */
  thumbnail?: string
  /** The project this one is a language version of. */
  variantOf?: string
}
export interface ContentProject {
  version: 1
  id: string
  title: string
  topic: string
  hook: string
  cta: string
  format: OutputFormat
  status: ProjectStatus
  template?: string
  environment: EnvironmentId
  cast: CastMember[]
  /** Props on top of the environment's dressing. */
  props: PropData[]
  dialogue: DialogueLine[]
  shots: Shot[]
  cues: ActingCue[]
  /** Explicit length in seconds; otherwise the last beat plus a short tail. */
  duration?: number
  /** The script in other languages, kept as text: what a language version starts from. */
  scripts?: Partial<Record<VoiceConfig['language'], string>>
  voice: VoiceConfig
  audio: AudioConfig
  scene: SceneData
  metadata: ProjectMeta
}
export interface CreateOptions {
  id?: string
  title?: string
  topic?: string
  hook?: string
  cta?: string
  language?: VoiceConfig['language']
  format?: OutputFormat
  environment?: EnvironmentId
  template?: string
  cast?: (CastMember | CharacterKind)[]
  now?: string
}
export function newProjectId() {
  return `p-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`
}
export function castMember(kind: CharacterKind, overrides: Partial<CastMember> = {}): CastMember {
  return { role: overrides.role ?? kind, kind, name: overrides.name ?? CHARACTERS[kind].name, ...(overrides.mark && { mark: overrides.mark }) }
}
/** A blank project: nothing in the timeline until `compileProject` runs. */
export function createProject(options: CreateOptions = {}): ContentProject {
  const environment = options.environment ?? 'office-night'
  const format = options.format ?? 'reel'
  const now = options.now ?? new Date().toISOString()
  const scene = emptyScene(options.title ?? 'Untitled reel', environment)
  scene.aspect = OUTPUT_PRESETS[format].aspect
  scene.fps = OUTPUT_PRESETS[format].fps
  return {
    version: 1,
    id: options.id ?? newProjectId(),
    title: options.title ?? 'Untitled reel',
    topic: options.topic ?? '',
    hook: options.hook ?? '',
    cta: options.cta ?? '',
    format,
    status: 'draft',
    ...(options.template && { template: options.template }),
    environment,
    cast: (options.cast ?? []).map((c) => (typeof c === 'string' ? castMember(c) : { ...c })),
    props: [],
    dialogue: [],
    shots: [],
    cues: [],
    voice: { ...structuredClone(DEFAULT_VOICE), language: options.language ?? 'en' },
    audio: structuredClone(DEFAULT_AUDIO),
    scene,
    metadata: { createdAt: now, updatedAt: now, tags: [], notes: '' }
  }
}
/** Wraps a bare scene (older saves, imported JSON) as a project with no script. */
export function projectFromScene(scene: SceneData, id = newProjectId(), now = new Date().toISOString()): ContentProject {
  const format: OutputFormat = scene.aspect === '16:9' ? 'landscape' : 'reel'
  return {
    ...createProject({ id, title: scene.name, format, environment: scene.environment.id, now }),
    cast: scene.characters.map((c) => ({ role: c.id, kind: c.kind, name: c.name })),
    scene: structuredClone(scene)
  }
}
const ROLE = /^[a-z][a-z0-9_-]{0,39}$/i
export function validateProject(input: unknown): ContentProject {
  const p = record(input, 'project')
  one(p.version, [1] as const, 'project version')
  text(p.id, 'project id', 60)
  text(p.title, 'title', 140)
  text(p.topic, 'topic', 300, true)
  text(p.hook, 'hook', 300, true)
  text(p.cta, 'cta', 300, true)
  if (!isOutputFormat(String(p.format))) throw new Error('Unknown output format')
  one(p.status, PROJECT_STATUSES, 'status')
  if (p.template !== undefined) text(p.template, 'template', 60)
  if (!isEnvironmentId(String(p.environment))) throw new Error('Unknown environment')
  if (p.duration !== undefined) number(p.duration, 1, 600, 'duration')
  const cast = list(p.cast, 8, 'cast').map((c) => record(c, 'cast member'))
  const roles = new Set<string>()
  for (const c of cast) {
    const role = text(c.role, 'role', 40)
    if (!ROLE.test(role)) throw new Error(`Invalid role: ${role}`)
    if (roles.has(role.toLowerCase())) throw new Error(`Duplicate role: ${role}`)
    roles.add(role.toLowerCase())
    one(c.kind, CHARACTER_KINDS, 'character kind')
    text(c.name, 'character name', 40)
    if (c.mark !== undefined) text(c.mark, 'mark', 40)
  }
  const known = (role: unknown) => roles.has(String(role).toLowerCase())
  for (const item of list(p.props, 60, 'props')) {
    const prop = record(item, 'prop')
    text(prop.id, 'prop id', 60)
    one(prop.kind, PROP_KINDS, 'prop kind')
    vec(prop.position, 'prop position')
    vec(prop.rotation, 'prop rotation')
    number(prop.scale, 0.1, 6, 'prop scale')
    color(prop.color)
    if (prop.screen !== undefined) {
      const screen = text(prop.screen, 'screen', 600_000)
      if (!isScreenId(screen) && !isScreenImage(screen)) throw new Error('Unknown screen content')
    }
  }
  const ids = new Set<string>()
  const id = (value: unknown, what: string) => {
    const v = text(value, what, 40)
    if (ids.has(v)) throw new Error(`Duplicate ${what}: ${v}`)
    ids.add(v)
  }
  for (const item of list(p.dialogue, 200, 'dialogue')) {
    const d = record(item, 'dialogue line')
    id(d.id, 'line id')
    if (!known(d.speaker)) throw new Error(`Line for unknown speaker: ${String(d.speaker)}`)
    text(d.text, 'line text', 280)
    number(d.start, 0, 600, 'line start')
    number(d.duration, 0.2, 60, 'line duration')
    if (d.emotion !== undefined) one(d.emotion, EXPRESSIONS, 'emotion')
    if (d.audio !== undefined) {
      const a = record(d.audio, 'line audio')
      text(a.hash, 'clip hash', 80)
      number(a.duration, 0.1, 60, 'clip duration')
      list(a.envelope, 3000, 'envelope').forEach((v) => number(v, 0, 1, 'envelope sample'))
    }
  }
  for (const item of list(p.shots, 100, 'shots')) {
    const s = record(item, 'shot')
    id(s.id, 'shot id')
    if (!isShotType(String(s.type))) throw new Error(`Unknown shot type: ${String(s.type)}`)
    if (!isShotMovement(String(s.movement))) throw new Error(`Unknown shot movement: ${String(s.movement)}`)
    if (!known(s.target)) throw new Error(`Shot on unknown target: ${String(s.target)}`)
    if (s.other !== undefined && !known(s.other)) throw new Error(`Shot with unknown partner: ${String(s.other)}`)
    number(s.start, 0, 600, 'shot start')
    if (s.duration !== undefined) number(s.duration, 0.1, 600, 'shot duration')
  }
  for (const item of list(p.cues, 400, 'cues')) {
    const c = record(item, 'acting cue')
    id(c.id, 'cue id')
    number(c.time, 0, 600, 'cue time')
    if (!known(c.actor)) throw new Error(`Cue for unknown actor: ${String(c.actor)}`)
    if (!isActingCommand(String(c.command))) throw new Error(`Unknown acting command: ${String(c.command)}`)
    if (c.target !== undefined) text(c.target, 'cue target', 60)
  }
  // Older projects carry no audio block: they get the defaults rather than a refusal.
  if (p.voice === undefined) p.voice = structuredClone(DEFAULT_VOICE)
  if (p.audio === undefined) p.audio = structuredClone(DEFAULT_AUDIO)
  if (p.scripts !== undefined) {
    const scripts = record(p.scripts, 'scripts')
    for (const [lang, value] of Object.entries(scripts)) {
      one(lang, ['fr', 'en'] as const, 'script language')
      text(value, 'alternate script', 20_000, true)
    }
  }
  const voice = record(p.voice, 'voice config')
  one(voice.provider, TTS_PROVIDERS, 'voice provider')
  one(voice.language, ['fr', 'en'] as const, 'language')
  if (voice.model === undefined) voice.model = ''
  if (voice.instructions === undefined) voice.instructions = {}
  text(voice.model, 'voice model', 80, true)
  for (const v of Object.values(record(voice.voices, 'voices'))) text(v, 'voice id', 80, true)
  for (const v of Object.values(record(voice.instructions, 'voice instructions'))) text(v, 'voice instructions', 400, true)
  const audio = record(p.audio, 'audio config')
  const music = record(audio.music, 'music')
  one(music.track, MUSIC_TRACKS, 'music track')
  number(music.volume, 0, 1, 'music volume')
  if (music.custom !== undefined) {
    const c = record(music.custom, 'custom music')
    text(c.hash, 'music hash', 80)
    text(c.name, 'music name', 120)
    number(c.duration, 0.1, 3600, 'music duration')
    if (c.credit !== undefined) text(c.credit, 'music credit', 400)
    if (c.url !== undefined) text(c.url, 'music url', 600)
    if (c.license !== undefined) text(c.license, 'music license', 200)
  }
  const ambience = record(audio.ambience, 'ambience')
  if (typeof ambience.enabled !== 'boolean') throw new Error('ambience.enabled must be a boolean')
  number(ambience.volume, 0, 1, 'ambience volume')
  const sfx = record(audio.sfx, 'sfx')
  for (const k of ['cuts', 'punchline', 'captions'] as const) if (typeof sfx[k] !== 'boolean') throw new Error(`sfx.${k} must be a boolean`)
  number(sfx.volume, 0, 1, 'sfx volume')
  number(audio.ducking, 0, 1, 'ducking')
  number(audio.voiceVolume, 0, 2, 'voice volume')
  const meta = record(p.metadata, 'metadata')
  text(meta.createdAt, 'createdAt', 40)
  text(meta.updatedAt, 'updatedAt', 40)
  if (meta.renderedAt !== undefined) text(meta.renderedAt, 'renderedAt', 40)
  list(meta.tags, 20, 'tags').forEach((t) => text(t, 'tag', 40))
  text(meta.notes, 'notes', 2000, true)
  if (meta.thumbnail !== undefined) text(meta.thumbnail, 'thumbnail', 200_000)
  if (meta.variantOf !== undefined) text(meta.variantOf, 'variantOf', 60)
  const scene = validateScene(p.scene)
  const project = structuredClone(p) as unknown as ContentProject
  project.scene = scene
  project.environment = ENVIRONMENTS[project.environment].id
  return project
}
export function serializeProject(project: ContentProject) {
  return JSON.stringify(project, null, 2)
}
export function parseProject(json: string): ContentProject {
  if (json.length > 3_000_000) throw new Error('Project file exceeds 3 MB')
  return validateProject(JSON.parse(json))
}
