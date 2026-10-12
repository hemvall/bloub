import {
  uid,
  type ActionId,
  type Aspect,
  type CameraPose,
  type CharacterData,
  type CharacterKind,
  type EnvironmentSettings,
  type EventType,
  type Expression,
  type GazeTarget,
  type LightData,
  type PropData,
  type PropKind,
  type SceneData,
  type SubtitleStyle,
  type TimelineEvent,
  type Vec3
} from './model'
import { CHARACTERS } from '../characters/catalog'
import { ENVIRONMENTS } from '../environments/catalog'
import { ACTION_DURATION } from '../animation/actions'
import { readingTime } from '../timeline/evaluate'
import { presetPose, type PresetName } from '../camera/presets'
import { subjectOf } from '../timeline/evaluate'
/**
 * The only way to change a document. UI, chat director, the content compiler
 * and agents call the same methods. Commands mutate the document they are
 * given; callers work on a copy and validate before adopting it.
 */
export class SceneCommands {
  constructor(public scene: SceneData) {}
  private character(id: string) {
    const c = this.scene.characters.find((c) => c.id === id)
    if (!c) throw new Error(`Unknown character: ${id}`)
    return c
  }
  private freeId(base: string) {
    const taken = new Set([
      ...this.scene.characters.map((c) => c.id),
      ...this.scene.props.map((p) => p.id),
      ...this.scene.lights.map((l) => l.id),
      ...Object.keys(ENVIRONMENTS[this.scene.environment.id].anchors),
      'camera',
      'environment'
    ])
    let id = base,
      n = 2
    while (taken.has(id)) id = `${base}-${n++}`
    return id
  }
  // --- Scene -----------------------------------------------------------------
  setName(name: string) {
    this.scene.name = name
  }
  setDuration(seconds: number) {
    this.scene.duration = seconds
    this.scene.timeline = this.scene.timeline.filter((e) => e.time <= seconds)
  }
  setAspect(aspect: Aspect) {
    this.scene.aspect = aspect
  }
  setFps(fps: number) {
    this.scene.fps = fps
  }
  setSubtitles(patch: Partial<SubtitleStyle>) {
    Object.assign(this.scene.subtitles, structuredClone(patch))
  }
  /** Switching environment resets atmosphere, base camera, seats, and gazes at the old anchors. */
  setEnvironment(patch: Partial<EnvironmentSettings>) {
    if (patch.id && patch.id !== this.scene.environment.id) {
      const def = ENVIRONMENTS[patch.id]
      this.scene.environment = { id: def.id, fog: def.fog, rain: def.rain, bloom: def.bloom }
      this.scene.camera = structuredClone(def.camera)
      for (const c of this.scene.characters)
        if (c.gaze.kind === 'object' && !this.resolvable(c.gaze.id)) c.gaze = { kind: 'camera' }
      this.scene.timeline = this.scene.timeline.filter(
        (e) => !(e.type === 'gaze' && e.target.kind === 'object' && !this.resolvable(e.target.id))
      )
      this.scene.characters.forEach((c, i) => {
        const seat = def.seats[i % def.seats.length]!
        c.position = [...seat.position]
        c.rotation = [0, seat.yaw, 0]
      })
    }
    const { id: _ignored, ...rest } = patch
    Object.assign(this.scene.environment, rest)
  }
  private resolvable(id: string) {
    return (
      id in ENVIRONMENTS[this.scene.environment.id].anchors ||
      this.scene.characters.some((c) => c.id === id) ||
      this.scene.props.some((p) => p.id === id) ||
      this.scene.lights.some((l) => l.id === id)
    )
  }
  setCamera(pose: CameraPose) {
    this.scene.camera = structuredClone(pose)
  }
  // --- Characters ------------------------------------------------------------
  /** Without a position, the character takes the named mark, or the next seat of the environment. */
  addCharacter(kind: CharacterKind, overrides: Partial<Omit<CharacterData, 'kind'>> & { mark?: string } = {}) {
    const def = CHARACTERS[kind]
    const env = ENVIRONMENTS[this.scene.environment.id]
    const seat = (overrides.mark && env.marks[overrides.mark]) || env.seats[this.scene.characters.length % env.seats.length]!
    const character: CharacterData = {
      id: this.freeId(overrides.id ?? kind),
      name: overrides.name ?? def.name,
      kind,
      position: overrides.position ? [...overrides.position] : [...seat.position],
      rotation: overrides.rotation ? [...overrides.rotation] : [0, seat.yaw, 0],
      scale: overrides.scale ?? 1,
      color: overrides.color ?? def.color,
      expression: overrides.expression ?? def.expression,
      gaze: overrides.gaze ? structuredClone(overrides.gaze) : { kind: 'camera' }
    }
    this.scene.characters.push(character)
    return character
  }
  removeCharacter(id: string) {
    this.character(id)
    this.scene.characters = this.scene.characters.filter((c) => c.id !== id)
    this.scene.timeline = this.scene.timeline.filter(
      (e) => !('character' in e && e.character === id)
    )
    for (const c of this.scene.characters)
      if (c.gaze.kind === 'object' && c.gaze.id === id) c.gaze = { kind: 'camera' }
    this.scene.timeline = this.scene.timeline.filter(
      (e) => !(e.type === 'gaze' && e.target.kind === 'object' && e.target.id === id)
    )
  }
  setCharacter(
    id: string,
    patch: Partial<Pick<CharacterData, 'name' | 'color' | 'rotation' | 'scale'>>
  ) {
    Object.assign(this.character(id), structuredClone(patch))
  }
  /** Without `time` this moves the base position; with it, it records a key. */
  setCharacterPosition(id: string, position: Vec3, time?: number) {
    if (time === undefined) this.character(id).position = [...position]
    else {
      this.character(id)
      this.key({ id: uid('k'), type: 'position', time, character: id, position: [...position] })
    }
  }
  setGazeTarget(id: string, target: GazeTarget, time?: number) {
    if (target.kind === 'object' && !this.resolvable(target.id))
      throw new Error(`Unknown gaze target: ${target.id}`)
    if (time === undefined) this.character(id).gaze = structuredClone(target)
    else {
      this.character(id)
      this.key({ id: uid('k'), type: 'gaze', character: id, target: structuredClone(target), time })
    }
  }
  setExpression(id: string, expression: Expression, time?: number) {
    if (time === undefined) this.character(id).expression = expression
    else {
      this.character(id)
      this.key({ id: uid('k'), type: 'expression', character: id, expression, time })
    }
  }
  say(id: string, text: string, time: number, duration = readingTime(text), envelope?: number[]) {
    this.character(id)
    const event: TimelineEvent = {
      id: uid('k'),
      type: 'dialogue',
      character: id,
      text: text.trim(),
      time,
      duration,
      ...(envelope?.length && { envelope: [...envelope] })
    }
    this.key(event)
    return event
  }
  act(id: string, action: ActionId, time: number) {
    this.character(id)
    const event: TimelineEvent = { id: uid('k'), type: 'action', character: id, action, time }
    this.key(event)
    return event
  }
  // --- Camera ----------------------------------------------------------------
  addCameraKeyframe(time: number, pose: CameraPose, options: { cut?: boolean; label?: string } = {}) {
    this.key({
      id: uid('k'),
      type: 'camera',
      time,
      pose: structuredClone(pose),
      ...(options.cut && { cut: true }),
      ...(options.label && { label: options.label })
    })
  }
  /** Frames a preset on a character (the first one by default) and records it at `time`. */
  cameraPreset(name: PresetName, time: number, subject?: string) {
    const character = subject ? this.character(subject) : this.scene.characters[0]
    if (!character) throw new Error('No character to frame')
    const pose = presetPose(name, subjectOf(this.scene, character, time))
    if (time <= 0 && !this.scene.timeline.some((e) => e.type === 'camera')) this.setCamera(pose)
    this.addCameraKeyframe(time, pose)
    return pose
  }
  // --- Props and lights --------------------------------------------------------
  addProp(kind: PropKind, overrides: Partial<Omit<PropData, 'kind'>> = {}) {
    const prop: PropData = {
      id: this.freeId(overrides.id ?? kind),
      kind,
      position: overrides.position ? [...overrides.position] : [0, 0, 0],
      rotation: overrides.rotation ? [...overrides.rotation] : [0, 0, 0],
      scale: overrides.scale ?? 1,
      color: overrides.color ?? PROP_COLORS[kind],
      ...(overrides.screen && { screen: overrides.screen })
    }
    this.scene.props.push(prop)
    return prop
  }
  setProp(id: string, patch: Partial<Omit<PropData, 'id' | 'kind'>>) {
    const p = this.scene.props.find((p) => p.id === id)
    if (!p) throw new Error(`Unknown prop: ${id}`)
    Object.assign(p, structuredClone(patch))
    if (p.screen === undefined) delete p.screen
  }
  removeProp(id: string) {
    this.scene.props = this.scene.props.filter((p) => p.id !== id)
    for (const c of this.scene.characters)
      if (c.gaze.kind === 'object' && c.gaze.id === id) c.gaze = { kind: 'camera' }
    this.scene.timeline = this.scene.timeline.filter(
      (e) => !(e.type === 'gaze' && e.target.kind === 'object' && e.target.id === id)
    )
  }
  addLight(overrides: Partial<LightData> = {}) {
    const light: LightData = {
      id: this.freeId(overrides.id ?? 'light'),
      position: overrides.position ? [...overrides.position] : [0, 3, 2],
      color: overrides.color ?? '#ffd9a8',
      intensity: overrides.intensity ?? 10
    }
    this.scene.lights.push(light)
    return light
  }
  setLight(id: string, patch: Partial<Omit<LightData, 'id'>>) {
    const l = this.scene.lights.find((l) => l.id === id)
    if (!l) throw new Error(`Unknown light: ${id}`)
    Object.assign(l, structuredClone(patch))
  }
  removeLight(id: string) {
    this.scene.lights = this.scene.lights.filter((l) => l.id !== id)
  }
  // --- Timeline --------------------------------------------------------------
  moveEvent(id: string, time: number) {
    const e = this.event(id)
    this.checkTime(time)
    e.time = time
    this.scene.timeline.sort((a, b) => a.time - b.time)
  }
  updateEvent(id: string, patch: Partial<TimelineEvent>) {
    const e = this.event(id)
    const { id: _id, type: _type, ...rest } = patch
    Object.assign(e, structuredClone(rest))
    if ('time' in rest) this.moveEvent(id, e.time)
  }
  removeEvent(id: string) {
    this.event(id)
    this.scene.timeline = this.scene.timeline.filter((e) => e.id !== id)
  }
  clearTimeline(types?: EventType[], character?: string) {
    this.scene.timeline = this.scene.timeline.filter(
      (e) =>
        !(
          (!types || types.includes(e.type)) &&
          (!character || ('character' in e && e.character === character))
        )
    )
  }
  private event(id: string) {
    const e = this.scene.timeline.find((e) => e.id === id)
    if (!e) throw new Error(`Unknown timeline event: ${id}`)
    return e
  }
  private checkTime(time: number) {
    if (!Number.isFinite(time) || time < 0 || time > this.scene.duration)
      throw new Error(`Keyframe at ${time}s is outside the scene (0 to ${this.scene.duration}s)`)
  }
  /** A key replaces the one with the same type, time and character. */
  private key(event: TimelineEvent) {
    this.checkTime(event.time)
    this.scene.timeline = this.scene.timeline.filter(
      (e) =>
        !(
          e.type === event.type &&
          Math.abs(e.time - event.time) < 1e-6 &&
          ('character' in e ? 'character' in event && e.character === event.character : true)
        )
    )
    this.scene.timeline.push(structuredClone(event))
    this.scene.timeline.sort((a, b) => a.time - b.time)
  }
}
export const PROP_COLORS: Record<PropKind, string> = {
  glass: '#eab777',
  bottle: '#659c88',
  cup: '#e9e2d6',
  plant: '#5e9a62',
  book: '#b35a4c',
  lamp: '#f0d7a8',
  laptop: '#2c2f36',
  phone: '#1f2229',
  monitor: '#23262e',
  coffee: '#3b6e8f',
  whiteboard: '#f6f5f0',
  documents: '#f3efe6',
  server: '#1b2230'
}
export function activeAction(scene: SceneData, character: string, time: number) {
  return scene.timeline.find(
    (e) =>
      e.type === 'action' &&
      e.character === character &&
      time >= e.time &&
      time < e.time + ACTION_DURATION[e.action]
  )
}
/** Rewrites event ids in timeline order so two compilations of the same project are byte-identical. */
export function renumberEvents(scene: SceneData) {
  scene.timeline.sort((a, b) => a.time - b.time || a.type.localeCompare(b.type))
  scene.timeline.forEach((e, i) => {
    e.id = `k-${i + 1}`
  })
  return scene
}
