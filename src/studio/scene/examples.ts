import type { SceneData } from './model'
import { SceneCommands } from './commands'
import { ENVIRONMENTS } from '../environments/catalog'
import { LEW_SUBTITLES } from '../subtitles/style'
/** Example scenes are built through the commands, exactly as the chat or an agent would. */
export function emptyScene(name = 'Untitled scene', environment: SceneData['environment']['id'] = 'stage'): SceneData {
  const def = ENVIRONMENTS[environment]
  return {
    version: 3,
    name,
    duration: 10,
    fps: 60,
    aspect: '9:16',
    environment: { id: def.id, fog: def.fog, rain: def.rain, bloom: def.bloom },
    camera: structuredClone(def.camera),
    characters: [],
    props: [],
    lights: [],
    timeline: [],
    subtitles: structuredClone(LEW_SUBTITLES)
  }
}
export function lateNightBar(): SceneData {
  const scene = emptyScene('Last light', 'night-bar')
  scene.duration = 12
  scene.aspect = '16:9'
  const c = new SceneCommands(scene)
  const kit = c.addCharacter('kit', { gaze: { kind: 'object', id: 'window' } })
  c.addProp('glass', { position: [1.15, 1.92, 0.1] })
  c.addProp('bottle', { position: [-1.3, 1.92, -0.2], color: '#4b8676' })
  c.addLight({ id: 'warm', position: [-3, 4.1, 1], color: '#ffbc72', intensity: 10 })
  c.addLight({ id: 'moon', position: [3, 3.5, -3], color: '#7aafff', intensity: 9 })
  c.cameraPreset('Medium', 0, kit.id)
  c.cameraPreset('Close-up', 7.5, kit.id)
  c.act(kit.id, 'sigh', 1.2)
  c.say(kit.id, 'Rain again. Of course.', 1.4)
  c.setGazeTarget(kit.id, { kind: 'camera' }, 4.2)
  c.setExpression(kit.id, 'annoyed', 4.4)
  c.say(kit.id, "Don't look at me like that. You'd stay too.", 4.8)
  c.setExpression(kit.id, 'curious', 8.2)
  c.act(kit.id, 'think', 8.4)
  c.say(kit.id, 'One more. Then I go.', 9.6)
  return scene
}
export function rooftopTalk(): SceneData {
  const scene = emptyScene('Rooftop', 'rooftop')
  scene.duration = 14
  const c = new SceneCommands(scene)
  const bo = c.addCharacter('bo', { position: [-1.1, 0, -0.8], rotation: [0, 0.5, 0] })
  const pip = c.addCharacter('pip', { position: [1.0, 0, -0.5], rotation: [0, -0.55, 0] })
  c.setGazeTarget(bo.id, { kind: 'object', id: 'skyline' })
  c.setGazeTarget(pip.id, { kind: 'object', id: bo.id })
  c.cameraPreset('Wide', 0, bo.id)
  c.addCameraKeyframe(5, { position: [2.6, 2.4, 4.6], target: [0, 1.4, -0.6], fov: 38 })
  c.say(pip.id, 'Do you think the city ever sleeps?', 0.8)
  c.setGazeTarget(bo.id, { kind: 'object', id: pip.id }, 2.6)
  c.act(bo.id, 'think', 2.8)
  c.say(bo.id, 'It naps. Between the sirens.', 4.2)
  c.setExpression(pip.id, 'happy', 6.4)
  c.act(pip.id, 'bounce', 6.5)
  c.say(pip.id, 'Then we should sing it a lullaby!', 6.8)
  c.setGazeTarget(pip.id, { kind: 'camera' }, 9.6)
  c.setGazeTarget(bo.id, { kind: 'camera' }, 10.2)
  c.setExpression(bo.id, 'happy', 10.4)
  c.act(bo.id, 'nod', 10.6)
  c.cameraPreset('Close-up', 13.5, pip.id)
  return scene
}
export function stageIntro(): SceneData {
  const scene = emptyScene('Hello, Kit', 'stage')
  scene.duration = 8
  const c = new SceneCommands(scene)
  const kit = c.addCharacter('kit')
  c.cameraPreset('Medium', 0, kit.id)
  c.cameraPreset('Close-up', 6, kit.id)
  c.act(kit.id, 'wave', 0.6)
  c.say(kit.id, 'Hi. I was told this would be quick.', 0.8)
  c.setExpression(kit.id, 'annoyed', 3.6)
  c.act(kit.id, 'shake', 3.8)
  c.say(kit.id, 'It never is.', 4.2)
  c.setExpression(kit.id, 'happy', 6.2)
  c.say(kit.id, 'Follow for more.', 6.4)
  return scene
}
export const EXAMPLES: { id: string; name: string; build: () => SceneData }[] = [
  { id: 'bar', name: 'Last light', build: lateNightBar },
  { id: 'rooftop', name: 'Rooftop', build: rooftopTalk },
  { id: 'stage', name: 'Hello, Kit', build: stageIntro }
]
