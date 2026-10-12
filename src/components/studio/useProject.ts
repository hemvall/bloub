import { validateScene } from '@/studio/serialization/scene'
import { projectFromScene, serializeProject, validateProject, type ContentProject } from '@/studio/content/project'
import { exampleProjects } from '@/studio/content/examples'
/** Browser storage of the content library: a list of projects, validated on the way in. */
const KEY = 'bloub-studio-library-v1'
const LEGACY_KEYS = ['bloub-studio-project-v2', 'bloub-scene-v1']
export function loadLibrary(): { projects: ContentProject[]; active: string } {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { projects?: unknown; active?: unknown }
      const projects = (Array.isArray(parsed.projects) ? parsed.projects : [])
        .map((p) => {
          try {
            return validateProject(p)
          } catch {
            return null
          }
        })
        .filter((p): p is ContentProject => !!p)
      if (projects.length) {
        const active = projects.some((p) => p.id === parsed.active) ? String(parsed.active) : projects[0]!.id
        return { projects, active }
      }
    }
  } catch {
    /* storage is optional */
  }
  const projects: ContentProject[] = exampleProjects()
  // Scenes saved by the previous studio become script-less projects.
  for (const key of LEGACY_KEYS)
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw) as { entries?: { id?: unknown; scene?: unknown }[] }
      const scenes = Array.isArray(parsed.entries) ? parsed.entries.map((e) => e.scene) : [parsed]
      for (const s of scenes)
        try {
          projects.push(projectFromScene(validateScene(s)))
        } catch {
          /* skip a broken scene */
        }
    } catch {
      /* ignore */
    }
  return { projects, active: projects[0]!.id }
}
export function saveLibrary(projects: ContentProject[], active: string): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify({ projects: projects.map((p) => JSON.parse(serializeProject(p))), active }))
    return true
  } catch {
    return false
  }
}
