import { describe, expect, it } from 'vitest'
import { ContentStudio } from './api'
import { chatbotVsAgent, CHATBOT_VS_AGENT_SCRIPT } from './demo'
import { compileProject, projectDuration } from './compile'
import { parseScript, printScript } from './script'
import { parseProject, serializeProject, validateProject, createProject, castMember } from './project'
import { TEMPLATES } from './templates'
import { conversationBeats } from './conversation'
import { projectFromGeneration, PROJECT_SCHEMA } from './generate'
import { ACTING, ACTING_COMMANDS } from './acting'
import { cameraAt, dialogueAt, characterAt } from '../timeline/evaluate'
import { validateScene } from '../serialization/scene'
import { wordTimings } from '../subtitles/timing'
import { shotPoses } from '../camera/shots'
import { OUTPUT_PRESETS } from '../render/presets'
import { ENVIRONMENTS, ENVIRONMENT_IDS } from '../environments/catalog'
import { CHARACTERS, CHARACTER_KINDS, idleProfile } from '../characters/catalog'
const cast = [castMember('lew', { mark: 'desk' }), castMember('ceo', { mark: 'guest' })]
describe('script format', () => {
  it('reads the benchmark script into lines, shots and cues', () => {
    const s = parseScript(CHATBOT_VS_AGENT_SCRIPT, cast)
    expect(s.warnings).toEqual([])
    expect(s.dialogue.map((d) => d.speaker)).toEqual(['ceo', 'lew', 'ceo', 'lew', 'ceo', 'lew', 'lew'])
    expect(s.dialogue[0]).toMatchObject({ text: 'We already have ChatGPT.', start: 0, emotion: 'confused' })
    expect(s.shots.map((x) => `${x.type}:${x.target}:${x.movement}`)).toEqual([
      'two-shot:lew:static',
      'medium:lew:static',
      'close-up:ceo:static',
      'medium:lew:static',
      'close-up:ceo:static',
      'close-up:lew:slow-push'
    ])
    expect(s.shots[0]!.other).toBe('ceo')
    expect(s.cues).toEqual([
      expect.objectContaining({ actor: 'lew', command: 'lookAt', target: 'ceo' }),
      expect.objectContaining({ actor: 'ceo', command: 'lookAway' })
    ])
    // Lines flow: each starts after the previous one plus the gap; the pause adds 0.5 s.
    const [a, b] = s.dialogue
    expect(b!.start).toBeCloseTo(a!.start + a!.duration + 0.3, 5)
    const last = s.dialogue.at(-1)!,
      before = s.dialogue.at(-2)!
    expect(last.start).toBeCloseTo(before.start + before.duration + 0.3 + 0.5, 5)
  })
  it('understands timestamps, multi-line lines, durations and prose camera moves', () => {
    const s = parseScript(
      `[00:03]\nCAMERA: medium Lew\nLEW (2.4s):\n"Cool. Does ChatGPT know\nwhat's happening in your CRM?"\n\n[12.5s]\nCamera slowly pushes toward Lew.\nHe nods and looks at the camera.\nUNKNOWN: "who?"\nPAUSE 1\nCEO: "...no."`,
      cast
    )
    expect(s.dialogue[0]).toMatchObject({ speaker: 'lew', start: 3, duration: 2.4, text: "Cool. Does ChatGPT know what's happening in your CRM?" })
    expect(s.shots[1]).toMatchObject({ type: 'medium', target: 'lew', movement: 'slow-push', start: 12.5 })
    expect(s.cues.map((c) => c.command)).toEqual(['lookAt', 'nod'])
    expect(s.cues[0]).toMatchObject({ actor: 'lew', target: 'camera', time: 12.5 })
    expect(s.dialogue[1]).toMatchObject({ speaker: 'ceo', start: 13.5 })
    expect(s.warnings.some((w) => w.includes('UNKNOWN'))).toBe(true)
  })
  it('prints what it parsed and parses what it printed', () => {
    const first = parseScript(CHATBOT_VS_AGENT_SCRIPT, cast)
    const text = printScript({ cast, ...first })
    const second = parseScript(text, cast)
    expect(second.warnings).toEqual([])
    expect(second.dialogue).toEqual(first.dialogue)
    expect(second.shots).toEqual(first.shots)
    expect(second.cues).toEqual(first.cues)
    expect(text).toContain('LEW (deadpan): "Does it know')
    expect(text).toContain('CAMERA: close-up Lew slow-push')
  })
  it('round trips every acting command through prose', () => {
    for (const command of ACTING_COMMANDS) {
      const cue = { id: 'c-1', time: 0, actor: 'lew', command, ...(ACTING[command].gaze === 'target' && { target: 'ceo' }) }
      const text = printScript({ cast, dialogue: [], shots: [], cues: [cue] })
      const back = parseScript(text, cast)
      expect(back.cues[0], text).toMatchObject({ command, actor: 'lew', ...(cue.target && { target: cue.target }) })
    }
  })
})
describe('compiler', () => {
  const project = chatbotVsAgent()
  const scene = project.scene
  it('produces a valid vertical 60 fps scene with the cast on their marks', () => {
    expect(() => validateScene(scene)).not.toThrow()
    expect(scene.aspect).toBe('9:16')
    expect(scene.fps).toBe(60)
    expect(scene.characters.map((c) => c.id)).toEqual(['lew', 'ceo'])
    expect(scene.characters[0]!.position).toEqual(ENVIRONMENTS['office-night'].marks.desk!.position)
    expect(scene.props.some((p) => p.id === 'monitor' && p.screen === 'lew-dashboard')).toBe(true)
    expect(scene.duration).toBe(projectDuration(project))
    expect(scene.duration).toBeGreaterThan(15)
    expect(scene.duration).toBeLessThan(30)
  })
  it('is deterministic: the same project compiles to the same bytes', () => {
    const a = compileProject(project),
      b = compileProject(project)
    expect(JSON.stringify(a.scene)).toBe(JSON.stringify(b.scene))
    expect(a.warnings).toEqual([])
  })
  it('turns shots into cuts and a push into an eased move', () => {
    const cameras = scene.timeline.filter((e) => e.type === 'camera')
    expect(cameras.length).toBe(7)
    expect(cameras.filter((e) => e.cut).length).toBe(5)
    const push = project.shots.at(-1)!
    const start = cameraAt(scene, push.start),
      later = cameraAt(scene, push.start + 1.5)
    const d = (p: typeof start) => Math.hypot(p.position[0] - p.target[0], p.position[1] - p.target[1], p.position[2] - p.target[2])
    expect(d(later)).toBeLessThan(d(start))
    // A cut holds the previous framing right up to the cut.
    const second = project.shots[1]!
    expect(cameraAt(scene, second.start - 0.01)).toEqual(cameraAt(scene, 0.1))
    expect(cameraAt(scene, second.start)).not.toEqual(cameraAt(scene, 0.1))
  })
  it('keeps the listener alive and makes speakers face each other', () => {
    const [ceoLine, lewLine] = project.dialogue
    const lewAtCeoLine = characterAt(scene, scene.characters[0]!, ceoLine!.start + 0.5)
    expect(lewAtCeoLine.gaze).toEqual({ kind: 'object', id: 'ceo' })
    const ceoAtLewLine = characterAt(scene, scene.characters[1]!, lewLine!.start + 0.5)
    expect(ceoAtLewLine.gaze).toEqual({ kind: 'object', id: 'lew' })
    expect(scene.timeline.some((e) => e.type === 'action' && e.character === 'ceo' && e.action === 'listen')).toBe(true)
    expect(scene.timeline.some((e) => e.type === 'action' && e.character === 'lew' && e.action === 'blink')).toBe(true)
    expect(dialogueAt(scene, lewLine!.start + 0.2)[0]!.text).toBe(lewLine!.text)
    expect(characterAt(scene, scene.characters[1]!, ceoLine!.start + 0.1).expression).toBe('confused')
    const away = project.cues.find((c) => c.command === 'lookAway')!
    expect(characterAt(scene, scene.characters[1]!, away.time + 0.05).gaze.kind).toBe('point')
  })
  it('warns instead of failing on unknown speakers and targets', () => {
    const studio = new ContentStudio(structuredClone(project))
    studio.project.dialogue.push({ id: 'd-x', speaker: 'ghost', text: 'Boo', start: 1, duration: 1 })
    studio.project.cues.push({ id: 'c-x', time: 1, actor: 'lew', command: 'lookAt', target: 'moon' })
    const result = studio.compileTimeline()
    expect(result.warnings.length).toBe(2)
    expect(() => validateScene(result.scene)).not.toThrow()
  })
  it('serialises the whole project without loss', () => {
    expect(parseProject(serializeProject(project))).toEqual(project)
    const broken = structuredClone(project) as { shots: { type: string }[] }
    broken.shots[0]!.type = 'drone'
    expect(() => validateProject(broken)).toThrow()
  })
})
describe('studio api', () => {
  it('builds a project the way an agent would', () => {
    const studio = ContentStudio.create({ title: 'API', environment: 'ai-lab', cast: ['lew'], now: '2026-01-01T00:00:00.000Z' })
    const dev = studio.addCharacter('dev', { role: 'dev', mark: 'right' })
    expect(dev.role).toBe('dev')
    studio.addShot({ type: 'two-shot', target: 'lew' })
    studio.addDialogue({ speaker: 'dev', text: 'It renamed one variable.', emotion: 'tired' })
    const line = studio.addDialogue({ speaker: 'lew', text: 'Did the tests pass?' })
    expect(line.start).toBeCloseTo(studio.project.dialogue[0]!.duration + 0.3, 5)
    studio.addAction({ actor: 'dev', command: 'lookAway', time: line.start })
    studio.setExpression('lew', 'smug', line.start)
    studio.addShot({ type: 'close-up', target: 'lew', start: line.start, movement: 'slow-push' })
    studio.addProp('phone', { position: [0.5, 0, 0.4], screen: 'notification' })
    const result = studio.compileTimeline()
    expect(result.warnings).toEqual([])
    expect(studio.project.scene.props.some((p) => p.kind === 'phone' && p.screen === 'notification')).toBe(true)
    expect(studio.script()).toContain('DEV (tired): "It renamed one variable."')
    expect(studio.script()).toContain('Lew smirks.')
    const again = ContentStudio.fromJSON(studio.toJSON())
    expect(again.project).toEqual(studio.project)
  })
  it('removing a character takes its beats along', () => {
    const studio = new ContentStudio(chatbotVsAgent())
    studio.removeCharacter('ceo')
    expect(studio.project.dialogue.every((d) => d.speaker === 'lew')).toBe(true)
    expect(studio.project.shots.every((s) => s.target === 'lew' && s.other !== 'ceo')).toBe(true)
    expect(studio.compileTimeline().warnings).toEqual([])
  })
  it('instantiates every template into a valid, deterministic reel', () => {
    for (const t of TEMPLATES) {
      const studio = ContentStudio.fromTemplate(t.id, { now: '2026-01-01T00:00:00.000Z' })
      const warnings = studio.setScript(t.script)
      expect(warnings, t.id).toEqual([])
      const result = studio.compileTimeline()
      expect(result.warnings, t.id).toEqual([])
      expect(() => validateScene(result.scene), t.id).not.toThrow()
      expect(result.scene.duration, t.id).toBeGreaterThan(10)
      expect(result.scene.duration, t.id).toBeLessThan(40)
      expect(result.scene.timeline.filter((e) => e.type === 'camera' && e.cut).length, t.id).toBeGreaterThan(1)
    }
  })
  it('turns a model answer into a compiled project and tolerates bad values', () => {
    const generated = projectFromGeneration({
      title: 'RAG is not a vector database',
      topic: 'RAG',
      hook: 'We have RAG now.',
      cta: '',
      format: 'reel',
      environment: 'moon-base',
      template: 'misconception',
      cast: [
        { role: 'lew', kind: 'lew', name: 'Lew', mark: 'desk' },
        { role: 'cto', kind: 'dragon', name: 'CTO' },
        { role: 'ceo', kind: 'ceo', name: 'CEO', mark: 'guest' }
      ],
      script: 'CAMERA: two-shot Lew CEO\nCEO: "We have RAG now."\nLEW (deadpan): "Ask it which contract expires next month."\nCTO: "hi"'
    })
    expect(generated.project.environment).toBe('office-night')
    expect(generated.project.cast.map((c) => c.role)).toEqual(['lew', 'ceo'])
    expect(generated.project.dialogue.length).toBe(2)
    expect(generated.warnings.length).toBeGreaterThanOrEqual(2)
    expect(() => validateProject(generated.project)).not.toThrow()
    expect(PROJECT_SCHEMA.required).toContain('script')
  })
})
describe('shots, subtitles, personalities', () => {
  it('steps the camera back in portrait and moves it closer on a push', () => {
    const subjects = { target: { position: [0, 0, 0] as [number, number, number], yaw: 0, eyeHeight: 1.6 }, front: [0, 2, 5] as [number, number, number] }
    const wide = shotPoses('medium', 'static', subjects, '16:9').start
    const tall = shotPoses('medium', 'static', subjects, '9:16').start
    expect(tall.position[2]).toBeGreaterThan(wide.position[2])
    expect(tall.target[1]).toBeLessThan(wide.target[1])
    const push = shotPoses('close-up', 'push-in', subjects, '9:16')
    expect(push.end!.position[2]).toBeLessThan(push.start.position[2])
    const two = shotPoses('two-shot', 'static', { ...subjects, other: { position: [2, 0, 0], yaw: 0, eyeHeight: 1.6 } }, '9:16').start
    expect(two.target[0]).toBeCloseTo(1)
    expect(two.position[2]).toBeGreaterThan(3)
  })
  it('times words by length and closes chunks on sentence ends', () => {
    const words = wordTimings('Then you have a chatbot. Not an employee.', 10, 4, 3)
    expect(words.length).toBe(8)
    expect(words[0]!.start).toBe(10)
    expect(words.at(-1)!.end).toBeCloseTo(14, 5)
    expect(words.map((w) => w.chunk)).toEqual([0, 0, 0, 1, 1, 2, 2, 2])
    expect(words[4]!.end - words[4]!.start).toBeGreaterThan(words[3]!.end - words[3]!.start)
  })
  it('gives every character a personality and every set marks that match its seats', () => {
    for (const kind of CHARACTER_KINDS) {
      const profile = idleProfile(CHARACTERS[kind].personality)
      expect(profile.head).toBeGreaterThan(0)
      expect(profile.blink).toBeGreaterThan(0)
    }
    expect(idleProfile(CHARACTERS.lew.personality).head).toBeLessThan(idleProfile(CHARACTERS.pip.personality).head)
    for (const id of ENVIRONMENT_IDS) {
      const env = ENVIRONMENTS[id]
      expect(Object.keys(env.marks).length).toBeGreaterThanOrEqual(3)
      expect(Object.values(env.marks)[0]).toEqual(env.seats[0])
      const ids = env.dressing.map((p) => p.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const p of env.dressing) expect(p.id in env.anchors, `${id}/${p.id}`).toBe(false)
    }
    expect(OUTPUT_PRESETS.reel).toMatchObject({ width: 1080, height: 1920, fps: 60 })
  })
  it('derives conversation beats that an explicit gaze cue overrides', () => {
    const lines = [
      { id: 'd-1', speaker: 'ceo', text: 'We already have ChatGPT.', start: 0, duration: 2.1 },
      { id: 'd-2', speaker: 'lew', text: 'Does it know what is happening in your CRM?', start: 2.4, duration: 3.7 }
    ]
    const beats = conversationBeats(lines, cast, [])
    expect(beats).toContainEqual({ time: 0, actor: 'ceo', gaze: 'lew' })
    expect(beats).toContainEqual({ time: 2.3, actor: 'ceo', gaze: 'lew' })
    expect(beats.some((b) => b.actor === 'lew' && b.action === 'emphasis')).toBe(true)
    const overridden = conversationBeats(lines, cast, [{ id: 'c-1', time: 2.3, actor: 'ceo', command: 'lookAway' }])
    expect(overridden.some((b) => b.actor === 'ceo' && b.gaze && Math.abs(b.time - 2.3) < 0.6)).toBe(false)
  })
  it('creates blank projects at the preset size', () => {
    const p = createProject({ format: 'landscape', now: 'x' })
    expect(p.scene.aspect).toBe('16:9')
    expect(p.status).toBe('draft')
  })
})
