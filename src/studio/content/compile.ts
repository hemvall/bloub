import type { GazeTarget, SceneData, Vec3 } from '../scene/model'
import { renumberEvents, SceneCommands } from '../scene/commands'
import { emptyScene } from '../scene/examples'
import { validateScene } from '../serialization/scene'
import { ENVIRONMENTS } from '../environments/catalog'
import { CHARACTERS } from '../characters/catalog'
import { OUTPUT_PRESETS } from '../render/presets'
import { shotPoses, SHOT_LABELS } from '../camera/shots'
import { subjectOf, eyeHeight } from '../timeline/evaluate'
import { ACTING } from './acting'
import { conversationBeats } from './conversation'
import type { ContentProject, Shot } from './project'
export interface CompileResult {
  scene: SceneData
  warnings: string[]
}
export const TAIL = 0.9,
  MIN_DURATION = 2,
  EMOTION_LEAD = 0.12
const round = (t: number) => Math.round(t * 100) / 100
/** The length a project needs: the last beat plus a tail, unless the project fixes it. */
export function projectDuration(project: Pick<ContentProject, 'dialogue' | 'shots' | 'cues' | 'duration'>) {
  if (project.duration) return project.duration
  const ends = [
    ...project.dialogue.map((d) => d.start + d.duration),
    ...project.shots.map((s) => s.start + (s.duration ?? 0)),
    ...project.cues.map((c) => c.time + 1)
  ]
  return Math.max(MIN_DURATION, round(Math.max(0, ...ends) + TAIL))
}
/**
 * Project → scene document. Deterministic: the same project always compiles
 * to the same bytes. Replaces the whole timeline; hand adjustments made on the
 * previous scene are not carried over, the subtitle style is.
 */
export function compileProject(project: ContentProject): CompileResult {
  const warnings: string[] = []
  const preset = OUTPUT_PRESETS[project.format]
  const env = ENVIRONMENTS[project.environment]
  const scene = emptyScene(project.title, project.environment)
  scene.aspect = preset.aspect
  scene.fps = preset.fps
  scene.duration = projectDuration(project)
  scene.subtitles = structuredClone(project.scene.subtitles)
  const c = new SceneCommands(scene)
  for (const prop of [...env.dressing, ...project.props]) c.addProp(prop.kind, prop)
  // Cast: the role is the scene id, unless it collides with an anchor of the set.
  const ids = new Map<string, string>()
  for (const member of project.cast) {
    const character = c.addCharacter(member.kind, { id: member.role, name: member.name, mark: member.mark })
    if (character.id !== member.role) warnings.push(`Role "${member.role}" is reserved in this set; the character is "${character.id}"`)
    ids.set(member.role, character.id)
  }
  const idOf = (role: string) => ids.get(role) ?? ids.get(role.toLowerCase())
  const within = (t: number) => Math.min(scene.duration, Math.max(0, round(t)))
  // Shots → camera keys: a cut on each shot, a second eased key when the shot moves.
  const shots = [...project.shots].sort((a, b) => a.start - b.start)
  if (!shots.length && project.cast[0]) shots.push({ id: 's-auto', type: project.cast.length > 1 ? 'two-shot' : 'medium', target: project.cast[0].role, start: 0, movement: 'static' })
  if (shots[0] && shots[0].start > 0) shots.unshift({ ...shots[0], id: 's-open', start: 0, movement: 'static', duration: undefined })
  shots.forEach((shot, i) => {
    const targetId = idOf(shot.target)
    const target = targetId && scene.characters.find((x) => x.id === targetId)
    if (!target) {
      warnings.push(`Shot ${shot.id} on unknown target "${shot.target}" skipped`)
      return
    }
    const partnerRole = shot.other ?? partnerFor(shot, project)
    const partnerId = partnerRole && idOf(partnerRole)
    const partner = partnerId ? scene.characters.find((x) => x.id === partnerId) : undefined
    const poses = shotPoses(shot.type, shot.movement, { target: subjectOf(scene, target, shot.start), other: partner && subjectOf(scene, partner, shot.start), front: env.camera.position }, scene.aspect)
    const label = `${SHOT_LABELS[shot.type]} · ${target.name}${shot.movement !== 'static' ? ` · ${shot.movement}` : ''}`
    if (i === 0) c.setCamera(poses.start)
    c.addCameraKeyframe(within(shot.start), poses.start, { cut: i > 0, label })
    if (poses.end) {
      const next = shots[i + 1]
      const end = shot.start + (shot.duration ?? (next ? next.start - shot.start : scene.duration - shot.start))
      if (end > shot.start + 0.05) c.addCameraKeyframe(within(end), poses.end)
    }
  })
  // Dialogue, and the emotion each line carries.
  const lines = [...project.dialogue].sort((a, b) => a.start - b.start)
  const spoken = new Map<string, number>()
  for (const line of lines) {
    const id = idOf(line.speaker)
    if (!id) {
      warnings.push(`Line "${line.text}" for unknown speaker "${line.speaker}" skipped`)
      continue
    }
    const busyUntil = spoken.get(id) ?? -1
    if (line.start < busyUntil - 1e-6) warnings.push(`${line.speaker} overlaps a previous line at ${line.start}s`)
    spoken.set(id, line.start + line.duration)
    c.say(id, line.text, within(line.start), line.duration, line.audio?.envelope)
    if (line.emotion) c.setExpression(id, line.emotion, within(line.start - EMOTION_LEAD))
  }
  // Liveliness first, explicit cues after: a cue at the same time replaces the automatic key.
  for (const beat of conversationBeats(lines, project.cast, project.cues)) {
    const id = idOf(beat.actor)
    if (!id) continue
    if (beat.gaze) c.setGazeTarget(id, gazeTo(scene, beat.gaze, idOf), within(beat.time))
    if (beat.action) c.act(id, beat.action, within(beat.time))
  }
  for (const cue of [...project.cues].sort((a, b) => a.time - b.time)) {
    const id = idOf(cue.actor)
    const actor = id && scene.characters.find((x) => x.id === id)
    if (!actor) {
      warnings.push(`Cue ${cue.command} for unknown actor "${cue.actor}" skipped`)
      continue
    }
    const effect = ACTING[cue.command]
    const t = within(cue.time)
    if (effect.gaze === 'target') {
      const target = gazeTo(scene, cue.target ?? 'camera', idOf)
      if (cue.target && target.kind === 'camera' && cue.target !== 'camera') warnings.push(`${cue.actor} cannot look at "${cue.target}" here; looking at the camera instead`)
      c.setGazeTarget(id, target, t)
    }
    if (effect.gaze === 'away') c.setGazeTarget(id, { kind: 'point', position: aside(actor.position, actor.rotation[1], eyeHeight(actor)) }, t)
    if (effect.action) c.act(id, effect.action, t)
    if (effect.expression) c.setExpression(id, effect.expression, t)
    if (effect.reset) c.setExpression(id, CHARACTERS[actor.kind].expression, t)
  }
  renumberEvents(scene)
  return { scene: validateScene(scene), warnings }
}
/** The other character a two-shot or over-shoulder frames with: whoever speaks around the shot, else the first other. */
function partnerFor(shot: Shot, project: ContentProject) {
  if (shot.type !== 'two-shot' && shot.type !== 'over-shoulder') return undefined
  const others = project.cast.filter((c) => c.role !== shot.target)
  const talking = project.dialogue.find((d) => d.speaker !== shot.target && d.start + d.duration > shot.start && others.some((c) => c.role === d.speaker))
  return talking?.speaker ?? others[0]?.role
}
function gazeTo(scene: SceneData, target: string, idOf: (role: string) => string | undefined): GazeTarget {
  if (target === 'camera') return { kind: 'camera' }
  const id = idOf(target) ?? target
  const known = scene.characters.some((x) => x.id === id) || scene.props.some((p) => p.id === id) || id in ENVIRONMENTS[scene.environment.id].anchors
  return known ? { kind: 'object', id } : { kind: 'camera' }
}
/** A point off to the character's side, slightly ahead: where "looks away" aims. */
function aside(position: Vec3, yaw: number, eyes: number): Vec3 {
  const fx = Math.sin(yaw),
    fz = Math.cos(yaw)
  return [position[0] + fz * 2.2 + fx * 1.2, position[1] + eyes - 0.1, position[2] - fx * 2.2 + fz * 1.2]
}
