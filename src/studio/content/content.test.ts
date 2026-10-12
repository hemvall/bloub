import { describe, expect, it } from 'vitest'
import { ContentStudio } from './api'
import { chatbotVsAgent, CHATBOT_VS_AGENT_SCRIPT, CHATBOT_VS_AGENT_SCRIPT_FR } from './demo'
import { compileProject, projectDuration } from './compile'
import { parseScript, printScript } from './script'
import { parseProject, serializeProject, validateProject, createProject, castMember } from './project'
import { TEMPLATES } from './templates'
import { EXAMPLE_REELS, buildExample, exampleProjects } from './examples'
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
import { envelopeOf, mixPlan, DEFAULT_AUDIO, DEFAULT_VOICE } from '../audio/plan'
import { renderMixSamples } from '../audio/mix'
import { archiveCredit, commercialOk, licenseLabel, MUSIC_LIBRARY, parseFiles, parseSearch } from '../audio/library'
import { renderMusic } from '../audio/music'
import { renderAmbience } from '../audio/ambience'
import { peak, track } from '../audio/dsp'
import { ENVIRONMENT_IDS as SETS } from '../environments/catalog'
import { speechLevelAt } from '../timeline/evaluate'
import { ENVELOPE_RATE } from '../scene/model'
const cast = [castMember('lew', { mark: 'desk' }), castMember('ceo', { mark: 'guest' })]
describe('script format', () => {
  it('reads the benchmark script into lines, shots and cues', () => {
    const s = parseScript(CHATBOT_VS_AGENT_SCRIPT, cast)
    expect(s.warnings).toEqual([])
    expect(s.dialogue.map((d) => d.speaker)).toEqual(['ceo', 'lew', 'ceo', 'lew', 'ceo', 'lew', 'lew'])
    expect(s.dialogue[0]).toMatchObject({ text: 'We already have ChatGPT.', start: 0, emotion: 'confused' })
    const fr = parseScript(CHATBOT_VS_AGENT_SCRIPT_FR, cast)
    expect(fr.warnings).toEqual([])
    expect(fr.dialogue.map((d) => d.speaker)).toEqual(s.dialogue.map((d) => d.speaker))
    expect(fr.shots.map((x) => x.type)).toEqual(s.shots.map((x) => x.type))
    expect(fr.cues.map((c) => c.command)).toEqual(s.cues.map((c) => c.command))
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
    const first = parseScript(CHATBOT_VS_AGENT_SCRIPT_FR, cast)
    const text = printScript({ cast, ...first }, 'fr')
    const second = parseScript(text, cast)
    expect(second.warnings).toEqual([])
    expect(second.dialogue).toEqual(first.dialogue)
    expect(second.shots).toEqual(first.shots)
    expect(second.cues).toEqual(first.cues)
    expect(text).toContain('LEW (impassible): "Il sait')
    expect(text).toContain('CEO détourne le regard.')
    expect(text).toContain('CAMERA: close-up Lew slow-push')
    const english = printScript({ cast, ...first })
    expect(english).toContain('LEW (deadpan): "Il sait')
    expect(english).toContain('CEO looks away.')
    expect(parseScript(english, cast).cues).toEqual(first.cues)
  })
  it('round trips every acting command through prose, in both languages', () => {
    for (const language of ['fr', 'en'] as const)
      for (const command of ACTING_COMMANDS) {
        const cue = { id: 'c-1', time: 0, actor: 'lew', command, ...(ACTING[command].gaze === 'target' && { target: 'ceo' }) }
        const text = printScript({ cast, dialogue: [], shots: [], cues: [cue] }, language)
        const back = parseScript(text, cast)
        expect(back.cues[0], text).toMatchObject({ command, actor: 'lew', ...(cue.target && { target: cue.target }) })
      }
  })
  it('reads French shot names, accents, typographic quotes and camera looks', () => {
    const s = parseScript(
      `CAMÉRA : gros plan sur Lew, zoom lent\nLEW (agacé, 2s) : « C’est pas un agent. »\nLe CEO fronce les sourcils et regarde la caméra.\nCAMERA: plan à deux Lew CEO\nLa caméra se rapproche lentement de Lew.`,
      cast
    )
    expect(s.warnings).toEqual([])
    expect(s.shots[0]).toMatchObject({ type: 'close-up', target: 'lew', movement: 'slow-push' })
    expect(s.dialogue[0]).toMatchObject({ speaker: 'lew', text: 'C’est pas un agent.', emotion: 'annoyed', duration: 2 })
    expect(s.cues.map((c) => c.command)).toEqual(['lookAt', 'annoyed'])
    expect(s.cues[0]).toMatchObject({ actor: 'ceo', target: 'camera' })
    expect(s.shots[1]).toMatchObject({ type: 'two-shot', target: 'lew', other: 'ceo' })
    expect(s.shots[2]).toMatchObject({ type: 'medium', target: 'lew', movement: 'slow-push' })
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
  it('instantiates every template into a valid, deterministic reel, in both languages', () => {
    for (const t of TEMPLATES) {
      const studio = ContentStudio.fromTemplate(t.id, { now: '2026-01-01T00:00:00.000Z' })
      expect(studio.project.voice.language).toBe('en')
      expect(studio.project.scripts?.fr, t.id).toBe(t.script.fr)
      expect(studio.setScript(t.script.en), t.id).toEqual([])
      const french = ContentStudio.fromTemplate(t.id, { now: '2026-01-01T00:00:00.000Z', language: 'fr' })
      expect(french.setScript(t.script.fr), t.id).toEqual([])
      expect(french.compileTimeline().warnings, t.id).toEqual([])
      const warnings = studio.setScript(t.script.en)
      expect(warnings, t.id).toEqual([])
      const result = studio.compileTimeline()
      expect(result.warnings, t.id).toEqual([])
      expect(() => validateScene(result.scene), t.id).not.toThrow()
      expect(result.scene.duration, t.id).toBeGreaterThan(10)
      expect(result.scene.duration, t.id).toBeLessThan(40)
      expect(result.scene.timeline.filter((e) => e.type === 'camera' && e.cut).length, t.id).toBeGreaterThan(1)
    }
  })
  it('ships every example reel parsed clean, compiled clean, 12 to 35 seconds, English with French behind', () => {
    const ids = new Set<string>()
    for (const reel of EXAMPLE_REELS) {
      const studio = new ContentStudio(buildExample(reel))
      expect(ids.has(reel.id), reel.id).toBe(false)
      ids.add(reel.id)
      expect(studio.project.scripts?.fr, reel.id).toBe(reel.script.fr)
      const french = new ContentStudio(buildExample(reel, undefined, 'fr'))
      expect(french.setScript(reel.script.fr), reel.id).toEqual([])
      expect(french.compileTimeline().warnings, reel.id).toEqual([])
      expect(french.project.dialogue.length, reel.id).toBe(studio.project.dialogue.length)
      expect(studio.setScript(reel.script.en), reel.id).toEqual([])
      const result = studio.compileTimeline()
      expect(result.warnings, reel.id).toEqual([])
      expect(result.scene.duration, reel.id).toBeGreaterThan(12)
      expect(result.scene.duration, reel.id).toBeLessThan(35)
      expect(studio.project.dialogue.length, reel.id).toBeGreaterThanOrEqual(5)
      expect(result.scene.timeline.filter((e) => e.type === 'camera' && e.cut).length, reel.id).toBeGreaterThanOrEqual(3)
      expect(studio.project.cast.some((c) => c.kind === 'lew'), reel.id).toBe(true)
      expect(studio.project.voice.language).toBe('en')
      expect(() => validateProject(studio.project), reel.id).not.toThrow()
    }
    expect(exampleProjects('2026-01-01T00:00:00.000Z').map((p) => p.id)).toEqual(['demo-chatbot-vs-agent', ...EXAMPLE_REELS.map((r) => `example-${r.id}`)])
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
  it('creates blank projects at the preset size, in French, with the default sound', () => {
    const p = createProject({ format: 'landscape', now: 'x' })
    expect(p.scene.aspect).toBe('16:9')
    expect(p.status).toBe('draft')
    expect(p.voice.language).toBe('en')
    expect(p.audio.music.track).toBe('lofi')
  })
  it('makes a language version from the stored script, without the voices', () => {
    const studio = new ContentStudio(chatbotVsAgent())
    studio.setVoice({ provider: 'openai' })
    studio.attachVoice(studio.project.dialogue[0]!.id, { hash: 'h', duration: 2, envelope: [1] })
    const fr = studio.variant('fr', '2026-02-02T00:00:00.000Z')
    expect(fr.id).not.toBe(studio.project.id)
    expect(fr.voice.language).toBe('fr')
    expect(fr.metadata.variantOf).toBe(studio.project.id)
    expect(fr.dialogue[0]!.text).toBe('On a déjà ChatGPT.')
    expect(fr.dialogue.every((d) => !d.audio)).toBe(true)
    expect(fr.scripts?.en).toContain('We already have ChatGPT.')
    expect(fr.scripts?.fr).toBeUndefined()
    expect(fr.cast).toEqual(studio.project.cast)
    expect(() => validateProject(fr)).not.toThrow()
    const back = new ContentStudio(fr).variant('en')
    expect(back.dialogue[0]!.text).toBe('We already have ChatGPT.')
    const plain = new ContentStudio(createProject({ cast: ['lew'], now: 'x' }))
    plain.addDialogue({ speaker: 'lew', text: 'Hello.' })
    const copy = plain.variant('fr', 'y')
    expect(copy.dialogue[0]!.text).toBe('Hello.')
  })
})
describe('audio', () => {
  const clip = (duration: number) => ({ hash: `h${duration}`, duration, envelope: [0.2, 0.9, 0.5, 0.1] })
  it('attaching a voice re-times every later beat and clearing it restores reading speed', () => {
    const studio = new ContentStudio(chatbotVsAgent())
    const [first, second] = studio.project.dialogue
    const shotAfter = studio.project.shots.find((s) => s.start > first!.start)!
    const before = { second: second!.start, shot: shotAfter.start, duration: studio.project.scene.duration }
    studio.attachVoice(first!.id, clip(first!.duration + 1.5))
    expect(studio.project.dialogue[0]!.duration).toBeCloseTo(before.second - 0.3 + 1.5, 5)
    expect(studio.project.dialogue[1]!.start).toBeCloseTo(before.second + 1.5, 5)
    expect(studio.project.shots.find((s) => s.id === shotAfter.id)!.start).toBeCloseTo(before.shot + 1.5, 5)
    const compiled = studio.compileTimeline()
    expect(compiled.warnings).toEqual([])
    expect(compiled.scene.duration).toBeCloseTo(before.duration + 1.5, 5)
    const event = compiled.scene.timeline.find((e) => e.type === 'dialogue' && e.text === first!.text)!
    expect(event.type === 'dialogue' && event.envelope).toEqual([0.2, 0.9, 0.5, 0.1])
    expect(speechLevelAt(compiled.scene, 'ceo', event.time + 1 / ENVELOPE_RATE)).toBeCloseTo(0.9, 5)
    expect(speechLevelAt(compiled.scene, 'ceo', event.time + 0.5 / ENVELOPE_RATE)).toBeCloseTo(0.55, 5)
    expect(speechLevelAt(compiled.scene, 'lew', event.time + 0.1)).toBe(0)
    studio.clearVoice()
    expect(studio.project.dialogue[1]!.start).toBeCloseTo(before.second, 5)
    expect(studio.project.dialogue[0]!.audio).toBeUndefined()
  })
  it('keeps a clip across a script edit when the line did not change', () => {
    const studio = new ContentStudio(chatbotVsAgent())
    const line = studio.project.dialogue[2]!
    studio.attachVoice(line.id, clip(2))
    studio.setScript(studio.script().replace('Not an employee.', 'Not a colleague.'))
    expect(studio.project.dialogue.find((d) => d.text === line.text)!.audio?.hash).toBe('h2')
    expect(studio.project.dialogue.find((d) => d.text === 'Not a colleague.')!.audio).toBeUndefined()
    expect(() => validateProject(studio.project)).not.toThrow()
  })
  it('plans the mix from the project: ducks under voices, whooshes on cuts, hits the punchline', () => {
    const project = chatbotVsAgent()
    const silent = mixPlan({ scene: project.scene, audio: project.audio, voice: project.voice, dialogue: project.dialogue })
    expect(silent.voice).toEqual([])
    expect(silent.ducks).toEqual([])
    expect(silent.sfx.filter((s) => s.kind === 'whoosh').length).toBe(5)
    const last = project.dialogue.at(-1)!
    expect(silent.sfx.find((s) => s.kind === 'hit')!.time).toBeCloseTo(last.start, 5)
    expect(silent.sfx.find((s) => s.kind === 'riser')!.time).toBeLessThan(last.start)
    expect(silent.ambience).toEqual({ set: 'office-night', volume: DEFAULT_AUDIO.ambience.volume })
    const studio = new ContentStudio(project)
    studio.setVoice({ provider: 'openai' })
    studio.attachVoice(project.dialogue[0]!.id, clip(2))
    studio.attachVoice(project.dialogue[1]!.id, clip(3))
    const voiced = mixPlan({ scene: studio.project.scene, audio: studio.project.audio, voice: studio.project.voice, dialogue: studio.project.dialogue })
    expect(voiced.voice.map((v) => v.hash)).toEqual(['h2', 'h3'])
    expect(voiced.ducks.length).toBe(1)
    expect(voiced.ducks[0]!.end).toBeCloseTo(studio.project.dialogue[1]!.start + 3, 5)
    const quiet = mixPlan({ scene: project.scene, audio: { ...project.audio, music: { track: 'none', volume: 0 }, ambience: { enabled: false, volume: 0 }, sfx: { ...project.audio.sfx, cuts: false, punchline: false } }, voice: DEFAULT_VOICE, dialogue: project.dialogue })
    expect(quiet.sfx).toEqual([])
    expect(quiet.ambience).toBeNull()
  })
  it('derives a peak-normalised envelope at the envelope rate', () => {
    const rate = 1000
    const samples = new Float32Array(rate)
    for (let i = 0; i < rate; i++) samples[i] = i < 500 ? 0.5 * Math.sin(i) : 0.1 * Math.sin(i)
    const env = envelopeOf(samples, rate)
    expect(env.length).toBe(ENVELOPE_RATE)
    expect(Math.max(...env)).toBe(1)
    expect(env[2]).toBeGreaterThan(env[20]!)
    expect(env.every((v) => v >= 0 && v <= 1)).toBe(true)
  })
  it('renders every music bed and room tone deterministically, in samples, without clipping', () => {
    for (const kind of ['lofi', 'pulse', 'ambient'] as const) {
      const a = track(4, 24000),
        b = track(4, 24000)
      renderMusic(a, kind, 4)
      renderMusic(b, kind, 4)
      expect(a.data, kind).toEqual(b.data)
      expect(peak(a), kind).toBeGreaterThan(0.1)
      expect(peak(a), kind).toBeLessThan(1.5)
    }
    for (const set of SETS) {
      const t = track(3, 24000)
      renderAmbience(t, set, 3)
      expect(peak(t), set).toBeGreaterThan(0.005)
      expect(peak(t), set).toBeLessThan(0.5)
    }
  })
  it('mixes the demo: music under a voice is quieter than music beside it, hits land on the punchline', async () => {
    const project = chatbotVsAgent()
    const studio = new ContentStudio(project)
    studio.setVoice({ provider: 'openai' })
    const first = studio.project.dialogue[0]!
    studio.attachVoice(first.id, { hash: 'tone', duration: 2, envelope: [1] })
    studio.compileTimeline()
    const plan = mixPlan({ scene: studio.project.scene, audio: { ...studio.project.audio, ambience: { enabled: false, volume: 0 }, sfx: { ...studio.project.audio.sfx, cuts: false } }, voice: studio.project.voice, dialogue: studio.project.dialogue })
    expect(plan.sampleRate).toBe(48000)
    const small = { ...plan, sampleRate: 12000 }
    const silentVoice = new Float32Array(12000 * 1.8)
    const mix = await renderMixSamples(small, async (hash) => (hash === 'tone' ? { sampleRate: 12000, samples: silentVoice } : undefined))
    expect(mix.missing).toEqual([])
    const rms = (from: number, to: number) => {
      let sum = 0
      for (let i = Math.round(from * 12000); i < Math.round(to * 12000); i++) sum += mix.samples[i]! ** 2
      return Math.sqrt(sum / Math.round((to - from) * 12000))
    }
    const under = rms(first.start + 0.4, first.start + 1.6)
    const beside = rms(first.start + 3.2, first.start + 4.4)
    expect(under).toBeLessThan(beside * 0.8)
    const last = studio.project.dialogue.at(-1)!
    expect(rms(last.start, last.start + 0.1)).toBeGreaterThan(rms(last.start - 2.2, last.start - 2.1))
    const again = await renderMixSamples(small, async () => ({ sampleRate: 12000, samples: silentVoice }))
    expect(again.samples).toEqual(mix.samples)
    const missing = await renderMixSamples(small, async () => undefined)
    expect(missing.missing).toEqual(['voice:d-1'])
  })
  it('ships a music shelf with unique, attributed, archive-hosted tracks and filters licences', () => {
    const ids = new Set(MUSIC_LIBRARY.map((t) => t.id))
    expect(ids.size).toBe(MUSIC_LIBRARY.length)
    for (const t of MUSIC_LIBRARY) {
      expect(t.url, t.id).toMatch(/^https:\/\/archive\.org\/download\/KevinMacLeod_2019-04_Discography\/Kevin%20MacLeod\/.+\.mp3$/)
      expect(t.url, t.id).not.toContain(' ')
      expect(t.credit, t.id).toContain('Kevin MacLeod (incompetech.com)')
      expect(commercialOk(t.license), t.id).toBe(true)
      expect(t.seconds, t.id).toBeGreaterThan(30)
    }
    expect(commercialOk('http://creativecommons.org/licenses/by-nc-nd/2.5/')).toBe(false)
    expect(commercialOk('http://creativecommons.org/licenses/by-nd/3.0/')).toBe(false)
    expect(commercialOk('https://creativecommons.org/publicdomain/zero/1.0/')).toBe(true)
    expect(commercialOk('http://creativecommons.org/licenses/by-sa/3.0/')).toBe(true)
    expect(commercialOk(undefined)).toBe(false)
    expect(licenseLabel('http://creativecommons.org/licenses/by/4.0/')).toBe('CC BY 4.0')
    expect(licenseLabel('https://creativecommons.org/publicdomain/zero/1.0/')).toBe('CC0')
    const items = parseSearch({ response: { docs: [
      { identifier: 'ok', title: 'Ok', creator: ['A', 'B'], licenseurl: 'http://creativecommons.org/licenses/by/3.0/', downloads: 5 },
      { identifier: 'nc', title: 'No', creator: 'C', licenseurl: 'http://creativecommons.org/licenses/by-nc/3.0/', downloads: 50 }
    ] } })
    expect(items.map((i) => i.identifier)).toEqual(['ok'])
    expect(items[0]!.creator).toBe('A, B')
    const files = parseFiles('it em', { files: [
      { name: 'a/Track One.mp3', length: '120.5', size: '4000000' },
      { name: 'short.mp3', length: '5', size: '100' },
      { name: 'cover.jpg', size: '100' },
      { name: 'huge.mp3', length: '600', size: '90000000' }
    ] })
    expect(files.map((f) => f.title)).toEqual(['Track One'])
    expect(files[0]!.url).toBe('https://archive.org/download/it%20em/a/Track%20One.mp3')
    expect(archiveCredit(items[0]!, files[0]!)).toBe('Track One by A, B (CC BY 3.0) https://archive.org/details/ok')
  })
  it('accepts projects saved before audio existed', () => {
    const old = JSON.parse(serializeProject(chatbotVsAgent())) as Record<string, unknown>
    delete old.audio
    old.voice = { provider: 'none', language: 'fr', voices: {} }
    const project = validateProject(old)
    expect(project.audio).toEqual(DEFAULT_AUDIO)
    expect(project.voice.language).toBe('fr')
  })
})
