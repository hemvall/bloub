import type { SceneData } from '@/studio/scene/model'
import { parseScene, serializeScene, validateScene } from '@/studio/serialization/scene'
import { EXAMPLES } from '@/studio/scene/examples'
export interface ProjectEntry {
  id: string
  scene: SceneData
}
const KEY = 'bloub-studio-project-v2'
const LEGACY_KEY = 'bloub-scene-v1'
export function newEntryId() {
  return `s-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`
}
/** Loads the saved project, or seeds it with the examples (and a legacy v1 scene if present). */
export function loadProject(): { entries: ProjectEntry[]; active: string } {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { entries?: unknown; active?: unknown }
      const entries = (Array.isArray(parsed.entries) ? parsed.entries : [])
        .map((e) => {
          try {
            const r = e as { id?: unknown; scene?: unknown }
            return { id: String(r.id ?? newEntryId()), scene: validateScene(r.scene) }
          } catch {
            return null
          }
        })
        .filter((e): e is ProjectEntry => !!e)
      if (entries.length) {
        const active = entries.some((e) => e.id === parsed.active) ? String(parsed.active) : entries[0]!.id
        return { entries, active }
      }
    }
  } catch {
    /* storage is optional */
  }
  const entries = EXAMPLES.map((x) => ({ id: `example-${x.id}`, scene: x.build() }))
  try {
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) entries.unshift({ id: newEntryId(), scene: parseScene(legacy) })
  } catch {
    /* ignore a broken legacy document */
  }
  return { entries, active: entries[0]!.id }
}
export function saveProject(entries: ProjectEntry[], active: string): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify({ entries: entries.map((e) => ({ id: e.id, scene: JSON.parse(serializeScene(e.scene)) })), active }))
    return true
  } catch {
    return false
  }
}
