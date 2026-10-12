import type { CharacterKind, EnvironmentId, Expression, PropData, PropKind } from '../scene/model'
import { OUTPUT_PRESETS, type OutputFormat } from '../render/presets'
import type { ShotMovement, ShotType } from '../camera/shots'
import { PROP_COLORS } from '../scene/commands'
import { readingTime } from '../timeline/evaluate'
import { CHARACTERS } from '../characters/catalog'
import type { ActingCommand } from './acting'
import { compileProject, type CompileResult } from './compile'
import { LINE_GAP, parseScript, printScript } from './script'
import { castMember, createProject, newProjectId, parseProject, serializeProject, type ActingCue, type AudioConfig, type CastMember, type ContentProject, type CreateOptions, type DialogueLine, type LineAudio, type ProjectStatus, type Shot, type VoiceConfig } from './project'
import type { ContentLanguage } from '../audio/plan'
import { findTemplate } from './templates'
/**
 * The programmatic surface of the studio. The Vue store calls this; an agent
 * (or Lew itself) calls exactly the same methods. Nothing here touches the DOM
 * or the renderer: rendering is `engine.capture`, fed with `project.scene`.
 */
export class ContentStudio {
  constructor(public project: ContentProject) {}
  static create(options: CreateOptions = {}) {
    const studio = new ContentStudio(createProject(options))
    studio.compileTimeline()
    return studio
  }
  static fromTemplate(id: string, options: CreateOptions = {}) {
    const template = findTemplate(id)
    if (!template) throw new Error(`Unknown template: ${id}`)
    const studio = new ContentStudio(
      createProject({
        title: template.name,
        topic: template.premise,
        format: template.format,
        environment: template.environment,
        template: template.id,
        cast: template.cast,
        ...options
      })
    )
    studio.project.metadata.tags = [...template.tags]
    const language = studio.project.voice.language
    studio.setScript(template.script[language])
    studio.setAltScript(language === 'en' ? 'fr' : 'en', template.script[language === 'en' ? 'fr' : 'en'])
    studio.compileTimeline()
    return studio
  }
  static fromJSON(json: string) {
    return new ContentStudio(parseProject(json))
  }
  toJSON() {
    return serializeProject(this.project)
  }
  private touch() {
    this.project.metadata.updatedAt = new Date().toISOString()
  }
  private member(role: string) {
    const m = this.project.cast.find((c) => c.role === role || c.role.toLowerCase() === role.toLowerCase())
    if (!m) throw new Error(`Unknown role: ${role}`)
    return m
  }
  private nextId(prefix: 'd' | 's' | 'c', items: { id: string }[]) {
    let n = items.length + 1
    while (items.some((i) => i.id === `${prefix}-${n}`)) n++
    return `${prefix}-${n}`
  }
  // --- Project ------------------------------------------------------------------
  setTitle(title: string) {
    this.project.title = title.trim() || this.project.title
    this.touch()
  }
  setTopic(topic: string) {
    this.project.topic = topic
    this.touch()
  }
  setHook(hook: string) {
    this.project.hook = hook
    this.touch()
  }
  setCta(cta: string) {
    this.project.cta = cta
    this.touch()
  }
  setStatus(status: ProjectStatus) {
    this.project.status = status
    if (status === 'rendered') this.project.metadata.renderedAt = new Date().toISOString()
    this.touch()
  }
  setFormat(format: OutputFormat) {
    this.project.format = format
    this.project.scene.aspect = OUTPUT_PRESETS[format].aspect
    this.project.scene.fps = OUTPUT_PRESETS[format].fps
    this.touch()
  }
  setDuration(seconds?: number) {
    if (seconds === undefined) delete this.project.duration
    else this.project.duration = Math.max(1, Math.min(600, seconds))
    this.touch()
  }
  /** Marks are set-specific, so they are dropped with the set. */
  setEnvironment(id: EnvironmentId) {
    if (id === this.project.environment) return
    this.project.environment = id
    for (const c of this.project.cast) delete c.mark
    this.project.props = []
    this.touch()
  }
  // --- Cast -----------------------------------------------------------------------
  addCharacter(kind: CharacterKind, overrides: Partial<CastMember> = {}): CastMember {
    const base = overrides.role ?? kind
    let role = base,
      n = 2
    while (this.project.cast.some((c) => c.role.toLowerCase() === role.toLowerCase())) role = `${base}-${n++}`
    const member = castMember(kind, { ...overrides, role, name: overrides.name ?? (role === kind ? CHARACTERS[kind].name : role) })
    this.project.cast.push(member)
    this.touch()
    return member
  }
  removeCharacter(role: string) {
    const m = this.member(role)
    this.project.cast = this.project.cast.filter((c) => c !== m)
    this.project.dialogue = this.project.dialogue.filter((d) => d.speaker !== m.role)
    this.project.shots = this.project.shots.filter((s) => s.target !== m.role).map((s) => (s.other === m.role ? { ...s, other: undefined } : s))
    this.project.cues = this.project.cues.filter((c) => c.actor !== m.role).map((c) => (c.target === m.role ? { ...c, target: 'camera' } : c))
    this.touch()
  }
  setCharacter(role: string, patch: Partial<Pick<CastMember, 'name' | 'mark'>>) {
    const m = this.member(role)
    if (patch.name !== undefined) m.name = patch.name.trim() || m.name
    if ('mark' in patch) {
      if (patch.mark) m.mark = patch.mark
      else delete m.mark
    }
    this.touch()
  }
  // --- Beats ------------------------------------------------------------------------
  /** The end of the last line plus the usual gap: where the next beat lands when no time is given. */
  cursor() {
    const ends = this.project.dialogue.map((d) => d.start + d.duration + LINE_GAP)
    return Math.round(Math.max(0, ...ends) * 100) / 100
  }
  addDialogue(line: { speaker: string; text: string; start?: number; duration?: number; emotion?: Expression }): DialogueLine {
    const speaker = this.member(line.speaker).role
    const text = line.text.trim()
    if (!text) throw new Error('A line needs text')
    const entry: DialogueLine = {
      id: this.nextId('d', this.project.dialogue),
      speaker,
      text,
      start: line.start ?? this.cursor(),
      duration: line.duration ?? readingTime(text),
      ...(line.emotion && { emotion: line.emotion })
    }
    this.project.dialogue.push(entry)
    this.touch()
    return entry
  }
  addShot(shot: { type: ShotType; target?: string; other?: string; start?: number; duration?: number; movement?: ShotMovement }): Shot {
    const target = shot.target ? this.member(shot.target).role : this.project.cast[0]?.role
    if (!target) throw new Error('A shot needs a character to frame')
    const entry: Shot = {
      id: this.nextId('s', this.project.shots),
      type: shot.type,
      target,
      ...(shot.other && { other: this.member(shot.other).role }),
      start: shot.start ?? this.cursor(),
      ...(shot.duration !== undefined && { duration: shot.duration }),
      movement: shot.movement ?? 'static'
    }
    this.project.shots.push(entry)
    this.touch()
    return entry
  }
  addAction(cue: { actor: string; command: ActingCommand; target?: string; time?: number }): ActingCue {
    const entry: ActingCue = {
      id: this.nextId('c', this.project.cues),
      time: cue.time ?? this.cursor(),
      actor: this.member(cue.actor).role,
      command: cue.command,
      ...(cue.target && { target: cue.target })
    }
    this.project.cues.push(entry)
    this.touch()
    return entry
  }
  setExpression(actor: string, expression: Expression, time?: number) {
    const command = (Object.entries(EXPRESSION_COMMANDS).find(([, e]) => e === expression)?.[0] ?? 'neutral') as ActingCommand
    return this.addAction({ actor, command, time })
  }
  updateDialogue(id: string, patch: Partial<Omit<DialogueLine, 'id'>>) {
    const d = this.project.dialogue.find((d) => d.id === id)
    if (!d) throw new Error(`Unknown line: ${id}`)
    if (patch.speaker) patch.speaker = this.member(patch.speaker).role
    Object.assign(d, patch)
    if (patch.emotion === undefined && 'emotion' in patch) delete d.emotion
    this.touch()
  }
  removeBeat(id: string) {
    this.project.dialogue = this.project.dialogue.filter((d) => d.id !== id)
    this.project.shots = this.project.shots.filter((s) => s.id !== id)
    this.project.cues = this.project.cues.filter((c) => c.id !== id)
    this.touch()
  }
  clearBeats() {
    this.project.dialogue = []
    this.project.shots = []
    this.project.cues = []
    this.touch()
  }
  // --- Props -------------------------------------------------------------------------
  addProp(kind: PropKind, overrides: Partial<Omit<PropData, 'kind'>> = {}): PropData {
    const base = overrides.id ?? kind
    let id = base,
      n = 2
    while (this.project.props.some((p) => p.id === id)) id = `${base}-${n++}`
    const prop: PropData = {
      id,
      kind,
      position: overrides.position ? [...overrides.position] : [0, 0, 0],
      rotation: overrides.rotation ? [...overrides.rotation] : [0, 0, 0],
      scale: overrides.scale ?? 1,
      color: overrides.color ?? PROP_COLORS[kind],
      ...(overrides.screen && { screen: overrides.screen })
    }
    this.project.props.push(prop)
    this.touch()
    return prop
  }
  removeProp(id: string) {
    this.project.props = this.project.props.filter((p) => p.id !== id)
    this.touch()
  }
  // --- Audio ---------------------------------------------------------------------------
  setAudio(patch: Partial<AudioConfig>) {
    const a = this.project.audio
    if (patch.music) a.music = { ...a.music, ...patch.music }
    if (patch.ambience) a.ambience = { ...a.ambience, ...patch.ambience }
    if (patch.sfx) a.sfx = { ...a.sfx, ...patch.sfx }
    if (patch.ducking !== undefined) a.ducking = patch.ducking
    if (patch.voiceVolume !== undefined) a.voiceVolume = patch.voiceVolume
    this.touch()
  }
  setVoice(patch: Partial<VoiceConfig>) {
    const v = this.project.voice
    if (patch.provider !== undefined) v.provider = patch.provider
    if (patch.language !== undefined) v.language = patch.language
    if (patch.model !== undefined) v.model = patch.model
    if (patch.voices) v.voices = { ...v.voices, ...patch.voices }
    if (patch.instructions) v.instructions = { ...v.instructions, ...patch.instructions }
    this.touch()
  }
  /**
   * Attaches a generated clip to a line. The line takes the clip's length and
   * every later beat slides by the difference, so the conversation keeps its gaps.
   */
  attachVoice(lineId: string, audio: LineAudio) {
    const line = this.project.dialogue.find((d) => d.id === lineId)
    if (!line) throw new Error(`Unknown line: ${lineId}`)
    const delta = Math.round((audio.duration - line.duration) * 100) / 100
    line.audio = { hash: audio.hash, duration: audio.duration, envelope: [...audio.envelope] }
    line.duration = audio.duration
    if (delta) this.shiftAfter(line.start, delta, line.id)
    this.touch()
  }
  /** Drops the clips (the text changed, or the voice did); durations go back to reading speed. */
  clearVoice(lineIds?: string[]) {
    for (const line of this.project.dialogue) {
      if (lineIds && !lineIds.includes(line.id)) continue
      if (!line.audio) continue
      const delta = Math.round((readingTime(line.text) - line.duration) * 100) / 100
      delete line.audio
      line.duration = readingTime(line.text)
      if (delta) this.shiftAfter(line.start, delta, line.id)
    }
    this.touch()
  }
  private shiftAfter(time: number, delta: number, except: string) {
    const move = (t: number) => Math.max(0, Math.round((t + delta) * 100) / 100)
    for (const d of this.project.dialogue) if (d.id !== except && d.start > time + 1e-6) d.start = move(d.start)
    for (const s of this.project.shots) if (s.start > time + 1e-6) s.start = move(s.start)
    for (const c of this.project.cues) if (c.time > time + 1e-6) c.time = move(c.time)
    if (this.project.duration) this.project.duration = Math.max(1, Math.round((this.project.duration + delta) * 10) / 10)
  }
  // --- Script -----------------------------------------------------------------------
  /** Replaces every beat with what the text says. Returns the parser's warnings. */
  setScript(text: string): string[] {
    const parsed = parseScript(text, this.project.cast, this.project.voice.language)
    // A clip survives a rewrite as long as its line kept the same speaker and text.
    const previous = this.project.dialogue.filter((d) => d.audio)
    for (const line of parsed.dialogue) {
      const match = previous.find((d) => d.speaker === line.speaker && d.text === line.text)
      if (match?.audio) line.audio = { ...match.audio, envelope: [...match.audio.envelope] }
    }
    this.project.dialogue = parsed.dialogue
    this.project.shots = parsed.shots
    this.project.cues = parsed.cues
    this.touch()
    return parsed.warnings
  }
  script() {
    return printScript(this.project, this.project.voice.language)
  }
  /** Keeps a version of the script in another language, as text, next to the project. */
  setAltScript(language: ContentLanguage, text: string) {
    if (language === this.project.voice.language) return
    this.project.scripts = { ...this.project.scripts, [language]: text }
    this.touch()
  }
  /**
   * A new project in another language: same cast, set, shots and sound, the
   * script taken from the stored version when there is one, else the current
   * text to translate. Voice clips are not carried over: they are in the wrong language.
   */
  variant(language: ContentLanguage, now = new Date().toISOString()): ContentProject {
    const source = this.project
    const copy = structuredClone(source)
    copy.id = newProjectId()
    copy.status = 'draft'
    copy.voice = { ...copy.voice, language }
    copy.scripts = { ...copy.scripts, [source.voice.language]: this.script() }
    delete copy.scripts[language]
    copy.metadata = { ...copy.metadata, createdAt: now, updatedAt: now, renderedAt: undefined, thumbnail: undefined, variantOf: source.id }
    const studio = new ContentStudio(copy)
    studio.clearVoice()
    const stored = source.scripts?.[language]
    if (stored) studio.setScript(stored)
    studio.compileTimeline()
    return studio.project
  }
  /** Re-applies clip lengths to the lines that carry one (after a script edit that kept them). */
  retime() {
    for (const line of [...this.project.dialogue].sort((a, b) => a.start - b.start)) if (line.audio) this.attachVoice(line.id, line.audio)
  }
  // --- Output --------------------------------------------------------------------------
  compileTimeline(): CompileResult {
    const result = compileProject(this.project)
    this.project.scene = result.scene
    this.touch()
    return result
  }
  /** Draws one frame of the compiled scene; `engine` is anything with the engine's capture contract. */
  renderFrame(engine: { capture: (w: number, h: number) => { frame: (t: number, ctx: CanvasRenderingContext2D) => void; end: () => void } }, time: number, ctx: CanvasRenderingContext2D, width?: number, height?: number) {
    const preset = OUTPUT_PRESETS[this.project.format]
    const capture = engine.capture(width ?? preset.width, height ?? preset.height)
    try {
      capture.frame(time, ctx)
    } finally {
      capture.end()
    }
  }
}
/** Acting commands that are pure expressions, for `setExpression`. */
const EXPRESSION_COMMANDS: Partial<Record<ActingCommand, Expression>> = {
  neutral: 'neutral',
  tired: 'tired',
  curious: 'curious',
  happy: 'happy',
  sad: 'sad',
  surprised: 'surprised',
  annoyed: 'annoyed',
  confused: 'confused',
  deadpan: 'deadpan',
  smug: 'smug'
}
