import type {
  ActionId,
  Aspect,
  CameraPose,
  CharacterKind,
  EnvironmentId,
  Expression,
  PropKind,
  SceneData,
  Vec3
} from '../scene/model'
import { SceneCommands } from '../scene/commands'
import { validateScene } from '../serialization/scene'
import { isPresetName, type PresetName } from '../camera/presets'
/**
 * A director script is a flat list of operations on the document. It is what
 * the chat (local rules or Claude) produces, and what `applyScript` replays
 * through `SceneCommands`. Nothing else may touch the scene on the chat's behalf.
 */
export type DirectorOp =
  | { op: 'title'; name: string }
  | { op: 'environment'; id: EnvironmentId }
  | { op: 'duration'; seconds: number }
  | { op: 'aspect'; aspect: Aspect }
  | { op: 'atmosphere'; rain?: number; fog?: number; bloom?: number }
  | {
      op: 'addCharacter'
      kind: CharacterKind
      id?: string
      name?: string
      position?: Vec3
      facing?: number
      expression?: Expression
      color?: string
    }
  | { op: 'removeCharacter'; character: string }
  | { op: 'move'; character: string; position: Vec3; time?: number }
  | { op: 'face'; character: string; facing: number }
  | { op: 'gaze'; character: string; target: string | Vec3; time?: number }
  | { op: 'expression'; character: string; expression: Expression; time?: number }
  | { op: 'say'; character: string; text: string; time: number; duration?: number }
  | { op: 'action'; character: string; action: ActionId; time: number }
  | { op: 'camera'; time: number; preset?: PresetName; subject?: string; pose?: CameraPose }
  | { op: 'addProp'; kind: PropKind; id?: string; position: Vec3; color?: string; scale?: number }
  | { op: 'removeProp'; prop: string }
  | { op: 'light'; id?: string; position?: Vec3; color?: string; intensity?: number }
  | { op: 'clear'; tracks?: ('camera' | 'position' | 'gaze' | 'expression' | 'dialogue' | 'action')[] }
  | { op: 'reset' }
export interface DirectorScript {
  /** One or two sentences for the chat, in the user's language. */
  reply: string
  ops: DirectorOp[]
}
export interface ApplyResult {
  scene: SceneData
  applied: number
  warnings: string[]
}
function target(value: string | Vec3): Parameters<SceneCommands['setGazeTarget']>[1] {
  if (Array.isArray(value)) return { kind: 'point', position: value }
  return value === 'camera' ? { kind: 'camera' } : { kind: 'object', id: value }
}
/** Replays a script on a copy; one bad op is skipped with a warning, the rest still land. */
export function applyScript(scene: SceneData, script: DirectorScript, emptyScene: () => SceneData): ApplyResult {
  let copy = structuredClone(scene)
  const warnings: string[] = []
  let applied = 0
  for (const op of script.ops) {
    const c = new SceneCommands(copy)
    try {
      switch (op.op) {
        case 'title':
          c.setName(op.name)
          break
        case 'environment':
          c.setEnvironment({ id: op.id })
          break
        case 'duration':
          c.setDuration(Math.min(300, Math.max(0.5, op.seconds)))
          break
        case 'aspect':
          c.setAspect(op.aspect)
          break
        case 'atmosphere':
          c.setEnvironment({
            ...(op.rain !== undefined && { rain: op.rain }),
            ...(op.fog !== undefined && { fog: op.fog }),
            ...(op.bloom !== undefined && { bloom: op.bloom })
          })
          break
        case 'addCharacter':
          c.addCharacter(op.kind, {
            ...(op.id && { id: op.id }),
            ...(op.name && { name: op.name }),
            ...(op.position && { position: op.position }),
            ...(op.facing !== undefined && { rotation: [0, op.facing, 0] as Vec3 }),
            ...(op.expression && { expression: op.expression }),
            ...(op.color && { color: op.color })
          })
          break
        case 'removeCharacter':
          c.removeCharacter(op.character)
          break
        case 'move':
          c.setCharacterPosition(op.character, op.position, op.time)
          break
        case 'face':
          c.setCharacter(op.character, { rotation: [0, op.facing, 0] })
          break
        case 'gaze':
          c.setGazeTarget(op.character, target(op.target), op.time)
          break
        case 'expression':
          c.setExpression(op.character, op.expression, op.time)
          break
        case 'say':
          c.say(op.character, op.text, op.time, op.duration)
          break
        case 'action':
          c.act(op.character, op.action, op.time)
          break
        case 'camera':
          if (op.pose) c.addCameraKeyframe(op.time, op.pose)
          else if (op.preset && isPresetName(op.preset)) c.cameraPreset(op.preset, op.time, op.subject)
          else throw new Error('Camera op needs a preset or a pose')
          break
        case 'addProp':
          c.addProp(op.kind, {
            ...(op.id && { id: op.id }),
            position: op.position,
            ...(op.color && { color: op.color }),
            ...(op.scale !== undefined && { scale: op.scale })
          })
          break
        case 'removeProp':
          c.removeProp(op.prop)
          break
        case 'light':
          if (op.id && copy.lights.some((l) => l.id === op.id)) c.setLight(op.id, { ...op, id: undefined } as never)
          else c.addLight(op)
          break
        case 'clear':
          c.clearTimeline(op.tracks)
          break
        case 'reset':
          copy = emptyScene()
          break
      }
      copy = validateScene(copy)
      applied++
    } catch (e) {
      warnings.push(`${op.op}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return { scene: copy, applied, warnings }
}
