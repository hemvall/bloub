import type {
  CameraPose,
  CharacterData,
  Expression,
  GazeTarget,
  LightData,
  PropData,
  SceneData,
  TimelineEvent,
  Vec3
} from './model'
/** Commands mutate document data only. UI and future agents use this same API. */
export class SceneCommands {
  constructor(public scene: SceneData) {}
  private character(id: string) {
    const c = this.scene.characters.find((c) => c.id === id)
    if (!c) throw new Error(`Unknown character: ${id}`)
    return c
  }
  addCharacter(character: CharacterData) {
    if (this.scene.characters.some((c) => c.id === character.id))
      throw new Error('Duplicate character ID')
    this.scene.characters.push(structuredClone(character))
  }
  setCharacterPosition(id: string, position: Vec3) {
    this.character(id).position = [...position]
  }
  setGazeTarget(id: string, target: GazeTarget, time?: number) {
    if (time === undefined) this.character(id).gaze = structuredClone(target)
    else this.key({ type: 'gaze', character: id, target, time })
  }
  setExpression(id: string, expression: Expression, time?: number) {
    if (time === undefined) this.character(id).expression = expression
    else this.key({ type: 'expression', character: id, expression, time })
  }
  addCameraKeyframe(time: number, pose: CameraPose) {
    this.key({ type: 'camera', time, pose })
  }
  addPositionKeyframe(time: number, character: string, position: Vec3) {
    this.character(character)
    this.key({ type: 'position', time, character, position })
  }
  addProp(prop: PropData) {
    if (this.scene.props.some((p) => p.id === prop.id)) throw new Error('Duplicate prop ID')
    this.scene.props.push(structuredClone(prop))
  }
  setLight(id: string, patch: Partial<LightData>) {
    const l = this.scene.lights.find((l) => l.id === id)
    if (!l) throw new Error('Unknown light')
    Object.assign(l, patch)
  }
  setEnvironment(patch: Partial<SceneData['environment']>) {
    Object.assign(this.scene.environment, patch)
  }
  private key(event: TimelineEvent) {
    if (!Number.isFinite(event.time) || event.time < 0 || event.time > this.scene.duration)
      throw new Error('Keyframe outside scene duration')
    const index = this.scene.timeline.findIndex(
      (e) =>
        e.type === event.type &&
        e.time === event.time &&
        (!('character' in e) || ('character' in event && e.character === event.character))
    )
    if (index >= 0) this.scene.timeline.splice(index, 1)
    this.scene.timeline.push(structuredClone(event))
    this.scene.timeline.sort((a, b) => a.time - b.time)
  }
}
