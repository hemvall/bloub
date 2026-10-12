import { describe, expect, it } from 'vitest'
import { createScene, CAMERA_PRESETS } from './model'
import { SceneCommands } from './commands'
import { cameraAt, characterAt } from '../timeline/evaluate'
import { parseScene, serializeScene } from '../serialization/scene'
import { idleAt } from '../animation/idle'
import { gazeAt } from '../animation/gaze'
describe('Scene document and deterministic timeline', () => {
  it('round trips the entire document with no lost animation or atmosphere', () => {
    const scene = createScene(),
      commands = new SceneCommands(scene)
    commands.addPositionKeyframe(5, 'kit', [2, 1, -1])
    commands.setGazeTarget('kit', { kind: 'point', position: [4, 3, 0] }, 6)
    commands.setExpression('kit', 'happy', 8)
    commands.setLight('warm', { intensity: 10 })
    commands.setEnvironment({ rain: 0.2 })
    expect(parseScene(serializeScene(scene))).toEqual(scene)
  })
  it('samples camera interpolation endpoints, midpoint and held last key', () => {
    const scene = createScene()
    expect(cameraAt(scene, 0)).toEqual(CAMERA_PRESETS.Medium)
    expect(cameraAt(scene, 7)).toEqual(CAMERA_PRESETS['Close-up'])
    expect(cameraAt(scene, 12)).toEqual(cameraAt(scene, 7))
    expect(cameraAt(scene, 3.5).position[0]).toBeCloseTo((3.7 + 1.4) / 2)
  })
  it('returns the same pose, idle and gaze after a backward seek', () => {
    const scene = createScene(),
      c = scene.characters[0]!,
      commands = new SceneCommands(scene)
    commands.addPositionKeyframe(0, c.id, [0, 1, 0])
    commands.addPositionKeyframe(6, c.id, [4, 1, 0])
    const resolve = () => [3, 3, -5] as [number, number, number]
    const before = {
      pose: characterAt(scene, c, 3),
      gaze: gazeAt(scene, c, 3, resolve),
      idle: idleAt(3)
    }
    characterAt(scene, c, 11)
    gazeAt(scene, c, 11, resolve)
    idleAt(11)
    expect({
      pose: characterAt(scene, c, 3),
      gaze: gazeAt(scene, c, 3, resolve),
      idle: idleAt(3)
    }).toEqual(before)
    expect(before.pose.position[0]).toBeCloseTo(2)
    expect(characterAt(scene, c, 2).expression).toBe('tired')
    expect(characterAt(scene, c, 8).expression).toBe('curious')
  })
  it('makes eyes lead the head and clamps extreme target angles', () => {
    const scene = createScene()
    scene.characters[0]!.gaze = { kind: 'point', position: [100, 2.5, 2] }
    scene.timeline = [
      {
        type: 'gaze',
        time: 2,
        character: 'kit',
        target: { kind: 'point', position: [-100, 2.5, 2] }
      }
    ]
    const gaze = gazeAt(scene, scene.characters[0]!, 2.2, () => undefined)
    expect(gaze.eyeYaw).toBeCloseTo(-0.75)
    expect(gaze.headYaw).toBeGreaterThan(gaze.eyeYaw)
    expect(Math.abs(gaze.headYaw)).toBeLessThanOrEqual(0.75 * 0.65)
  })
  it('replaces keys at the same timestamp but keeps other tracks', () => {
    const scene = createScene(),
      commands = new SceneCommands(scene)
    commands.addCameraKeyframe(0, CAMERA_PRESETS.Wide!)
    expect(scene.timeline.filter((e) => e.type === 'camera' && e.time === 0)).toHaveLength(1)
    expect(scene.timeline.some((e) => e.type === 'gaze' && e.time === 0)).toBe(true)
    expect(() => commands.addCameraKeyframe(-1, CAMERA_PRESETS.Wide!)).toThrow()
  })
  it('records a later position without rewriting the base or earlier poses', () => {
    const scene = createScene(),
      original = structuredClone(scene.characters[0]!),
      commands = new SceneCommands(scene)
    commands.addPositionKeyframe(6, original.id, [4, 1.05, -1.4])
    expect(scene.characters[0]).toEqual(original)
    expect(characterAt(scene, original, 0).position).toEqual(original.position)
    expect(characterAt(scene, original, 3).position[0]).toBeCloseTo(2)
    expect(characterAt(scene, original, 6).position[0]).toBe(4)
  })
  it.each([
    (s: ReturnType<typeof createScene>) => {
      s.version = 2 as 1
    },
    (s: ReturnType<typeof createScene>) => {
      s.characters[0]!.position = [0, 0] as never
    },
    (s: ReturnType<typeof createScene>) => {
      s.camera.fov = 0
    },
    (s: ReturnType<typeof createScene>) => {
      s.characters[0]!.id = 'window'
    },
    (s: ReturnType<typeof createScene>) => {
      s.characters[0]!.gaze = { kind: 'object', id: 'missing' }
    },
    (s: ReturnType<typeof createScene>) => {
      s.timeline.push({ type: 'expression', character: 'ghost', time: 1, expression: 'happy' })
    },
    (s: ReturnType<typeof createScene>) => {
      s.timeline[0]!.time = 100
    },
    (s: ReturnType<typeof createScene>) => {
      s.environment.rain = 2
    }
  ])('rejects malformed scene data atomically', (mutate) => {
    const s = createScene()
    mutate(s)
    expect(() => parseScene(serializeScene(s))).toThrow()
  })
})
