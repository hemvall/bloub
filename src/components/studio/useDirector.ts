import { ref, watch, type Ref } from 'vue'
import type { SceneData } from '@/studio/scene/model'
import { applyScript, type DirectorScript } from '@/studio/director/script'
import { localDirector } from '@/studio/director/local'
import { claudeDirector, DIRECTOR_MODELS, type DirectorModel } from '@/studio/director/claude'
import { emptyScene } from '@/studio/scene/examples'
export interface Turn {
  role: 'user' | 'assistant'
  text: string
  applied?: number
  warnings?: string[]
  engine?: 'local' | 'claude'
}
export type DirectorEngine = 'auto' | 'local' | 'claude'
const SETTINGS_KEY = 'bloub-studio-director'
export interface ClaudeUserSettings {
  apiKey: string
  model: DirectorModel
  engine: DirectorEngine
}
function loadSettings(): ClaudeUserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      const s = JSON.parse(raw) as Partial<ClaudeUserSettings>
      return {
        apiKey: typeof s.apiKey === 'string' ? s.apiKey : '',
        model: DIRECTOR_MODELS.includes(s.model as DirectorModel) ? (s.model as DirectorModel) : 'claude-opus-5',
        engine: s.engine === 'local' || s.engine === 'claude' ? s.engine : 'auto'
      }
    }
  } catch {
    /* optional */
  }
  return { apiKey: '', model: 'claude-opus-5', engine: 'auto' }
}
let shared: Ref<ClaudeUserSettings> | undefined
/** One settings object for the chat director and the project generator: the key is entered once. */
export function useClaudeSettings() {
  if (!shared) {
    shared = ref<ClaudeUserSettings>(loadSettings())
    watch(
      shared,
      (s) => {
        try {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
        } catch {
          /* optional */
        }
      },
      { deep: true }
    )
  }
  return shared
}
export function useDirector(getScene: () => SceneData, adopt: (scene: SceneData, note?: string) => void) {
  const turns = ref<Turn[]>([])
  const busy = ref(false)
  const settings = useClaudeSettings()
  const settingsOpen = ref(false)
  let abort: AbortController | undefined
  function engineFor(): 'local' | 'claude' {
    if (settings.value.engine === 'local') return 'local'
    if (settings.value.engine === 'claude') return 'claude'
    return settings.value.apiKey ? 'claude' : 'local'
  }
  async function send(text: string) {
    const input = text.trim()
    if (!input || busy.value) return
    turns.value.push({ role: 'user', text: input })
    busy.value = true
    const engine = engineFor()
    abort = new AbortController()
    try {
      const scene = getScene()
      let script: DirectorScript
      if (engine === 'claude') {
        if (!settings.value.apiKey) throw new Error('Add your Anthropic API key in the director settings, or switch to offline rules.')
        const history = turns.value.slice(0, -1).map((t) => ({ role: t.role, text: t.text }))
        script = await claudeDirector({ apiKey: settings.value.apiKey, model: settings.value.model }, history, input, scene, abort.signal)
      } else script = localDirector(input, scene)
      const result = applyScript(scene, script, () => emptyScene(scene.name, scene.environment.id))
      if (result.applied) adopt(result.scene, `${result.applied} change${result.applied > 1 ? 's' : ''} from the director`)
      turns.value.push({ role: 'assistant', text: script.reply, applied: result.applied, warnings: result.warnings, engine })
    } catch (e) {
      turns.value.push({ role: 'assistant', text: e instanceof Error ? e.message : String(e), engine, applied: 0 })
    } finally {
      busy.value = false
    }
  }
  function cancel() {
    abort?.abort()
  }
  function clear() {
    turns.value = []
  }
  return { turns, busy, settings, settingsOpen, send, cancel, clear, engineFor }
}
