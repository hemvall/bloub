import { describe, expect, it } from 'vitest'
import { SceneCommands } from './commands'
import { emptyScene, EXAMPLES, lateNightBar, rooftopTalk } from './examples'
import { cameraAt, characterAt, dialogueAt, faceAt, readingTime, speakingAt } from '../timeline/evaluate'
import { parseScene, serializeScene, validateScene } from '../serialization/scene'
import { idleAt } from '../animation/idle'
import { gazeAt } from '../animation/gaze'
import { actionsAt } from '../animation/actions'
import { FACES } from '../animation/expressions'
import { presetPose } from '../camera/presets'
import { ENVIRONMENTS } from '../environments/catalog'
import { localDirector } from '../director/local'
import { applyScript } from '../director/script'
import { DIRECTOR_SCHEMA } from '../director/prompt'
describe('scene document', () => {
  it('round trips every example without loss', () => {
    for (const x of EXAMPLES) {
      const scene = x.build()
      expect(parseScene(serializeScene(scene))).toEqual(scene)
    }
  })
  it('migrates a version 1 document', () => {
    const v1 = {
      version: 1,
      name: 'Old',
      duration: 5,
      fps: 60,
      aspect: '16:9',
      environment: { id: 'night-bar', fog: 0.02, rain: 0.5 },
      camera: { position: [0, 2, 5], target: [0, 1, 0], fov: 40 },
      characters: [
        { id: 'kit', name: 'Kit', position: [0, 1, 0], rotation: [0, 0, 0], scale: 1, color: '#ebe8df', expression: 'tired', gaze: { kind: 'object', id: 'window' } }
      ],
      props: [],
      lights: [],
      timeline: [{ type: 'gaze', time: 1, character: 'kit', target: { kind: 'camera' } }]
    }
    const scene = parseScene(JSON.stringify(v1))
    expect(scene.version).toBe(3)
    expect(scene.subtitles.mode).toBe('words')
    expect(scene.characters[0]!.kind).toBe('kit')
    expect(scene.environment.bloom).toBeGreaterThan(0)
    expect(scene.timeline[0]!.id).toBeTruthy()
  })
  it.each([
    (s: ReturnType<typeof lateNightBar>) => {
      s.version = 4 as 3
    },
    (s: ReturnType<typeof lateNightBar>) => {
      s.characters[0]!.position = [0, 0] as never
    },
    (s: ReturnType<typeof lateNightBar>) => {
      s.camera.fov = 0
    },
    (s: ReturnType<typeof lateNightBar>) => {
      s.characters[0]!.id = 'window'
    },
    (s: ReturnType<typeof lateNightBar>) => {
      s.characters[0]!.gaze = { kind: 'object', id: 'missing' }
    },
    (s: ReturnType<typeof lateNightBar>) => {
      s.timeline.push({ id: 'x', type: 'expression', character: 'ghost', time: 1, expression: 'happy' })
    },
    (s: ReturnType<typeof lateNightBar>) => {
      s.timeline[0]!.time = 100
    },
    (s: ReturnType<typeof lateNightBar>) => {
      s.timeline[1]!.id = s.timeline[0]!.id
    },
    (s: ReturnType<typeof lateNightBar>) => {
      s.environment.rain = 2
    },
    (s: ReturnType<typeof lateNightBar>) => {
      s.characters[0]!.kind = 'dragon' as never
    }
  ])('rejects malformed documents atomically', (mutate) => {
    const s = lateNightBar()
    mutate(s)
    expect(() => parseScene(serializeScene(s))).toThrow()
  })
})
describe('commands', () => {
  it('seats new characters on the environment spots and keeps ids unique', () => {
    const scene = emptyScene('t', 'rooftop'),
      c = new SceneCommands(scene)
    const a = c.addCharacter('kit'),
      b = c.addCharacter('kit')
    expect(a.id).toBe('kit')
    expect(b.id).toBe('kit-2')
    expect(a.position).toEqual(ENVIRONMENTS.rooftop.seats[0]!.position)
    expect(b.position).toEqual(ENVIRONMENTS.rooftop.seats[1]!.position)
    expect(() => c.addCharacter('kit', { id: 'skyline' })).not.toThrow()
    expect(scene.characters[2]!.id).not.toBe('skyline')
  })
  it('switching environment reseats characters and drops gazes at the old anchors', () => {
    const scene = lateNightBar(),
      c = new SceneCommands(scene)
    expect(scene.characters[0]!.gaze).toEqual({ kind: 'object', id: 'window' })
    c.setEnvironment({ id: 'stage' })
    expect(scene.environment.id).toBe('stage')
    expect(scene.characters[0]!.gaze).toEqual({ kind: 'camera' })
    expect(scene.timeline.some((e) => e.type === 'gaze' && e.target.kind === 'object' && e.target.id === 'window')).toBe(false)
    expect(scene.characters[0]!.position).toEqual(ENVIRONMENTS.stage.seats[0]!.position)
    expect(() => validateScene(scene)).not.toThrow()
  })
  it('a key replaces the key of the same type, time and character', () => {
    const scene = lateNightBar(),
      c = new SceneCommands(scene),
      before = scene.timeline.length
    c.setExpression('kit', 'sad', 4.4)
    expect(scene.timeline.length).toBe(before)
    expect(scene.timeline.find((e) => e.type === 'expression' && e.time === 4.4)).toMatchObject({ expression: 'sad' })
    expect(() => c.addCameraKeyframe(-1, scene.camera)).toThrow()
    expect(() => c.addCameraKeyframe(99, scene.camera)).toThrow()
  })
  it('edits events by id and keeps the timeline sorted', () => {
    const scene = lateNightBar(),
      c = new SceneCommands(scene)
    const line = c.say('kit', 'Hello there', 2)
    expect(line.duration).toBe(readingTime('Hello there'))
    c.moveEvent(line.id, 11)
    expect(scene.timeline.at(-1)!.id).toBe(line.id)
    c.updateEvent(line.id, { text: 'Bye', duration: 1 })
    expect(scene.timeline.find((e) => e.id === line.id)).toMatchObject({ text: 'Bye', duration: 1, time: 11 })
    c.removeEvent(line.id)
    expect(scene.timeline.some((e) => e.id === line.id)).toBe(false)
    expect(() => c.removeEvent(line.id)).toThrow()
  })
  it('removing a character takes its events and the gazes toward it', () => {
    const scene = rooftopTalk(),
      c = new SceneCommands(scene)
    c.removeCharacter('pip')
    expect(scene.characters.map((x) => x.id)).toEqual(['bo'])
    expect(scene.timeline.every((e) => !('character' in e) || e.character === 'bo')).toBe(true)
    expect(scene.characters[0]!.gaze).not.toEqual({ kind: 'object', id: 'pip' })
    expect(() => validateScene(scene)).not.toThrow()
  })
})
describe('deterministic evaluation', () => {
  it('samples camera keys with hold after the last one', () => {
    const scene = lateNightBar()
    const first = scene.timeline.find((e) => e.type === 'camera')!,
      last = [...scene.timeline].reverse().find((e) => e.type === 'camera')!
    expect(cameraAt(scene, 0)).toEqual(first.type === 'camera' && first.pose)
    expect(cameraAt(scene, 12)).toEqual(last.type === 'camera' && last.pose)
    const mid = cameraAt(scene, (first.time + last.time) / 2)
    expect(mid.position[0]).toBeCloseTo(((first as { pose: { position: number[] } }).pose.position[0]! + (last as { pose: { position: number[] } }).pose.position[0]!) / 2)
  })
  it('gives the same pose, face, gaze, idle and action after a backward seek', () => {
    const scene = lateNightBar(),
      c = scene.characters[0]!
    new SceneCommands(scene).setCharacterPosition(c.id, [4, 1.05, -1.4], 6)
    const resolve = () => [3, 3, -5] as [number, number, number]
    const snapshot = (t: number) => ({
      pose: characterAt(scene, c, t),
      face: faceAt(scene, c, t),
      gaze: gazeAt(scene, c, t, resolve),
      idle: idleAt(t, 0),
      action: actionsAt(scene.timeline, c.id, t)
    })
    const before = snapshot(3)
    snapshot(11)
    snapshot(1.3)
    expect(snapshot(3)).toEqual(before)
    expect(before.pose.position[0]).toBeCloseTo(2)
  })
  it('blends faces instead of jumping', () => {
    const scene = lateNightBar()
    const change = scene.timeline.find((e) => e.type === 'expression')!
    expect(faceAt(scene, scene.characters[0]!, change.time - 0.01)).toEqual(FACES.tired)
    const mid = faceAt(scene, scene.characters[0]!, change.time + 0.1)
    expect(mid.lid).toBeLessThan(FACES.tired.lid)
    expect(mid.lid).toBeGreaterThan(FACES.annoyed.lid)
    expect(faceAt(scene, scene.characters[0]!, change.time + 1)).toEqual(FACES.annoyed)
  })
  it('eyes lead the head and both are clamped', () => {
    const scene = emptyScene('t', 'stage')
    const c = new SceneCommands(scene).addCharacter('kit', { gaze: { kind: 'point', position: [100, 2.5, 2] } })
    new SceneCommands(scene).setGazeTarget(c.id, { kind: 'point', position: [-100, 2.5, 2] }, 2)
    const gaze = gazeAt(scene, scene.characters[0]!, 2.2, () => undefined)
    expect(gaze.eyeYaw).toBeCloseTo(-0.75)
    expect(gaze.headYaw).toBeGreaterThan(gaze.eyeYaw)
    expect(Math.abs(gaze.headYaw)).toBeLessThanOrEqual(0.75 * 0.65)
  })
  it('blinks deterministically and never inverts the eye', () => {
    let min = 1
    for (let t = 0; t < 30; t += 0.01) min = Math.min(min, idleAt(t, 1).blink)
    expect(min).toBeLessThan(0.1)
    expect(min).toBeGreaterThanOrEqual(0)
    expect(idleAt(7.31, 2)).toEqual(idleAt(7.31, 2))
  })
  it('actions weigh zero outside their window', () => {
    const scene = lateNightBar()
    const sigh = scene.timeline.find((e) => e.type === 'action')!
    expect(actionsAt(scene.timeline, 'kit', sigh.time - 0.01).headPitch).toBe(0)
    expect(actionsAt(scene.timeline, 'kit', sigh.time + 1.5).headPitch).toBeGreaterThan(0)
    expect(actionsAt(scene.timeline, 'kit', sigh.time + 5).headPitch).toBe(0)
  })
  it('shows a line only during its window, with the character speaking', () => {
    const scene = lateNightBar()
    const line = scene.timeline.find((e) => e.type === 'dialogue')!
    expect(dialogueAt(scene, line.time - 0.01)).toHaveLength(0)
    expect(dialogueAt(scene, line.time + 0.5)[0]!.text).toBe(line.type === 'dialogue' && line.text)
    expect(speakingAt(scene, 'kit', line.time + 0.5)).toBe(true)
    expect(speakingAt(scene, 'kit', line.time + (line.type === 'dialogue' ? line.duration : 0) + 0.01)).toBe(false)
    expect(readingTime('one two three four five six seven eight nine ten eleven twelve thirteen')).toBeGreaterThan(4)
  })
  it('frames presets relative to the subject and its facing', () => {
    const front = presetPose('Close-up', { position: [0, 0, 0], yaw: 0, eyeHeight: 1.5 })
    expect(front.position[2]).toBeGreaterThan(0)
    const turned = presetPose('Close-up', { position: [0, 0, 0], yaw: Math.PI, eyeHeight: 1.5 })
    expect(turned.position[2]).toBeLessThan(0)
    expect(turned.target[1]).toBeCloseTo(front.target[1])
  })
})
describe('director', () => {
  it('reads a multi-sentence direction into a valid scene', () => {
    const scene = emptyScene('t', 'night-bar')
    const script = localDirector(
      'Kit sits at the bar. He looks at the window. He sighs. After two seconds he looks at the camera and says "Rain again." Close-up at 4s.',
      scene
    )
    const ops = script.ops.map((o) => o.op)
    expect(ops).toContain('addCharacter')
    expect(ops).toContain('gaze')
    expect(ops).toContain('action')
    expect(ops).toContain('say')
    expect(ops).toContain('camera')
    const result = applyScript(scene, script, () => emptyScene())
    expect(result.warnings).toEqual([])
    expect(result.scene.characters[0]!.kind).toBe('kit')
    expect(result.scene.timeline.some((e) => e.type === 'dialogue' && e.text === 'Rain again')).toBe(true)
    expect(result.scene.timeline.some((e) => e.type === 'gaze' && e.target.kind === 'camera')).toBe(true)
    expect(result.scene.timeline.some((e) => e.type === 'camera' && e.time === 4)).toBe(true)
    expect(() => validateScene(result.scene)).not.toThrow()
  })
  it('edits an existing scene without rebuilding it', () => {
    const scene = rooftopTalk()
    const before = scene.timeline.length
    const result = applyScript(scene, localDirector('Pip looks at the moon at 3s. No rain. Make it vertical.', scene), () => emptyScene())
    expect(result.scene.timeline.length).toBe(before + 1)
    expect(result.scene.aspect).toBe('9:16')
    expect(result.scene.characters.map((c) => c.id)).toEqual(scene.characters.map((c) => c.id))
  })
  it('skips a bad op with a warning and keeps the rest', () => {
    const scene = lateNightBar()
    const result = applyScript(scene, { reply: '', ops: [{ op: 'gaze', character: 'nobody', target: 'camera' }, { op: 'duration', seconds: 20 }] }, () => emptyScene())
    expect(result.applied).toBe(1)
    expect(result.warnings).toHaveLength(1)
    expect(result.scene.duration).toBe(20)
  })
  it('exposes every operation to the model', () => {
    const names = DIRECTOR_SCHEMA.properties.ops.items.anyOf.map((o) => o.properties.op.enum[0])
    expect(names).toEqual(expect.arrayContaining(['addCharacter', 'say', 'gaze', 'camera', 'action', 'expression', 'environment', 'reset']))
  })
})
