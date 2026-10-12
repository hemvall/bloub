import { ACTIONS, ASPECTS, EXPRESSIONS, PROP_KINDS, type SceneData } from '../scene/model'
import { CHARACTERS, CHARACTER_KINDS } from '../characters/catalog'
import { ENVIRONMENTS, ENVIRONMENT_IDS } from '../environments/catalog'
import { ACTION_DURATION } from '../animation/actions'
import { PRESET_NAMES } from '../camera/presets'
import { serializeScene } from '../serialization/scene'
export const DIRECTOR_TOOL_NAME = 'direct_scene'
const vec3 = { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 }
const num = { type: 'number' }
const str = { type: 'string' }
function op(name: string, props: Record<string, unknown>, required: string[] = []) {
  return {
    type: 'object',
    properties: { op: { type: 'string', enum: [name] }, ...props },
    required: ['op', ...required],
    additionalProperties: false
  }
}
/** JSON schema of `DirectorOp[]`, hand-written so it stays strict-mode friendly. */
export const DIRECTOR_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: 'One or two short sentences to the user, in their language.' },
    ops: {
      type: 'array',
      items: {
        anyOf: [
          op('title', { name: str }, ['name']),
          op('environment', { id: { type: 'string', enum: ENVIRONMENT_IDS } }, ['id']),
          op('duration', { seconds: num }, ['seconds']),
          op('aspect', { aspect: { type: 'string', enum: ASPECTS } }, ['aspect']),
          op('atmosphere', { rain: num, fog: num, bloom: num }),
          op(
            'addCharacter',
            {
              kind: { type: 'string', enum: CHARACTER_KINDS },
              id: str,
              name: str,
              position: vec3,
              facing: num,
              expression: { type: 'string', enum: EXPRESSIONS },
              color: str
            },
            ['kind']
          ),
          op('removeCharacter', { character: str }, ['character']),
          op('move', { character: str, position: vec3, time: num }, ['character', 'position']),
          op('face', { character: str, facing: num }, ['character', 'facing']),
          op('gaze', { character: str, target: { anyOf: [str, vec3] }, time: num }, ['character', 'target']),
          op('expression', { character: str, expression: { type: 'string', enum: EXPRESSIONS }, time: num }, ['character', 'expression']),
          op('say', { character: str, text: str, time: num, duration: num }, ['character', 'text', 'time']),
          op('action', { character: str, action: { type: 'string', enum: ACTIONS }, time: num }, ['character', 'action', 'time']),
          op(
            'camera',
            {
              time: num,
              preset: { type: 'string', enum: PRESET_NAMES },
              subject: str,
              pose: {
                type: 'object',
                properties: { position: vec3, target: vec3, fov: num },
                required: ['position', 'target', 'fov'],
                additionalProperties: false
              }
            },
            ['time']
          ),
          op('addProp', { kind: { type: 'string', enum: PROP_KINDS }, id: str, position: vec3, color: str, scale: num }, ['kind', 'position']),
          op('removeProp', { prop: str }, ['prop']),
          op('light', { id: str, position: vec3, color: str, intensity: num }),
          op('clear', { tracks: { type: 'array', items: { type: 'string', enum: ['camera', 'position', 'gaze', 'expression', 'dialogue', 'action'] } } }),
          op('reset', {})
        ]
      }
    }
  },
  required: ['reply', 'ops'],
  additionalProperties: false
} as const
export function systemPrompt() {
  const chars = CHARACTER_KINDS.map((k) => `- ${k} ("${CHARACTERS[k].name}", eye height ${CHARACTERS[k].eyeHeight}): ${CHARACTERS[k].description}`).join('\n')
  const envs = ENVIRONMENT_IDS.map((id) => {
    const e = ENVIRONMENTS[id]
    const anchors = Object.entries(e.anchors).map(([k, v]) => `${k} [${v.join(', ')}]`).join('; ')
    const seats = e.seats.map((s) => `[${s.position.join(', ')}] facing ${s.yaw.toFixed(2)}`).join('; ')
    return `- ${id} ("${e.name}"): ${e.description}\n  gaze anchors: ${anchors}\n  natural spots for characters: ${seats}`
  }).join('\n')
  const actions = ACTIONS.map((a) => `${a} (${ACTION_DURATION[a]}s)`).join(', ')
  return `You are the director of a small browser animation studio that makes short character-driven clips, often vertical shorts.
You never render anything yourself: you answer by calling the ${DIRECTOR_TOOL_NAME} tool with a list of operations on the scene document, plus a short reply.

The user describes a scene or a change in natural language. Turn it into operations. Keep the scene coherent: cast only characters that exist in the catalog, place them on the environment's natural spots unless told otherwise, give every line of dialogue enough time to be read (about 2.6 words per second, min 1.2 s), and never overlap two lines of the same character. Set the duration so the last beat has ~1.5 s of air. Make the staging alive: alternate gaze between characters, the camera and the environment anchors; add small actions (sigh, nod, think…) between lines; change expressions as the mood moves; move the camera at most every 3–5 seconds with presets (Wide → Medium → Close-up is a classic push).

Coordinates: world units, metres; y is up; characters stand at y given by the environment spots; a character with facing 0 looks toward +z (toward the default camera). The camera 'preset' is framed on 'subject' (a character id).

Catalog of characters (kind → description):
${chars}

Environments:
${envs}

Expressions: ${EXPRESSIONS.join(', ')}. Actions: ${actions}. Camera presets: ${PRESET_NAMES.join(', ')}. Prop kinds: ${PROP_KINDS.join(', ')}. Aspects: ${ASPECTS.join(', ')} (9:16 for reels/shorts).

Rules for edits: when the user asks for a change, send only the operations for that change; do not rebuild the scene. Use 'reset' only when the user asks for a new scene from scratch, and then add the environment first. When the user describes a whole new idea on an empty or unrelated scene, start with reset. Character ids are the ones in the current document; new characters get the id of their kind unless given a name.

Always call the tool exactly once, even to answer a question (then with an empty ops list).`
}
export function sceneContext(scene: SceneData) {
  return `Current scene document (JSON):\n${serializeScene(scene)}`
}
