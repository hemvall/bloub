import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type StudioViewport from './StudioViewport.vue'
import {
  OUTPUT_SIZE,
  type Aspect,
  type CameraPose,
  type CharacterKind,
  type EnvironmentId,
  type EventType,
  type PropKind,
  type SceneData,
  type TimelineEvent,
  type Vec3
} from '@/studio/scene/model'
import { SceneCommands } from '@/studio/scene/commands'
import { cameraAt, characterAt, readingTime } from '@/studio/timeline/evaluate'
import { parseScene, serializeScene, validateScene } from '@/studio/serialization/scene'
import { presetPose, type PresetName } from '@/studio/camera/presets'
import { subjectOf } from '@/studio/timeline/evaluate'
import { download, ExportCancelled, renderStill, renderVideo, slug } from '@/studio/export/video'
import { ContentStudio } from '@/studio/content/api'
import { newProjectId, parseProject, projectFromScene, serializeProject, validateProject, type ContentProject, type ProjectStatus } from '@/studio/content/project'
import { generateProject, translateScript } from '@/studio/content/generate'
import type { ContentLanguage } from '@/studio/audio/plan'
import { buildExample, EXAMPLE_REELS } from '@/studio/content/examples'
import { OUTPUT_PRESETS, renderPlan, type OutputFormat } from '@/studio/render/presets'
import { loadLibrary, saveLibrary } from './useProject'
import { useClaudeSettings } from './useDirector'
import { useAudio } from './useAudio'
export type TransformMode = 'translate' | 'rotate' | 'scale'
export type Panel = 'director' | 'inspector'
export type LeftPanel = 'script' | 'scene'
export type View = 'library' | 'studio'
export interface ExportState {
  running: boolean
  done: number
  total: number
  label: string
}
/**
 * All studio state lives here; components are views on it and the engine is
 * its renderer. Project-level edits go through `ContentStudio`, scene-level
 * edits through `SceneCommands`; both land in the active project.
 */
export function useStudioDocument() {
  const library = loadLibrary()
  const projects = shallowRef<ContentProject[]>(library.projects)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  // Deep links: #project=<id>, #template=<id> (a fresh project), and t=<seconds> to open at that moment.
  const templateLink = hash.get('template')
  if (templateLink) {
    try {
      projects.value = [ContentStudio.fromTemplate(templateLink).project, ...projects.value]
    } catch {
      /* unknown template: the library opens instead */
    }
  }
  const linked = templateLink && projects.value[0] ? projects.value[0].id : (hash.get('project') ?? hash.get('scene'))
  const initialTime = Math.max(0, Number(hash.get('t')) || 0)
  const activeId = ref(projects.value.some((p) => p.id === linked) ? linked! : library.active)
  const view = ref<View>(linked && projects.value.some((p) => p.id === linked) ? 'studio' : 'library')
  const project = shallowRef<ContentProject>(projects.value.find((p) => p.id === activeId.value)!)
  const scene = shallowRef<SceneData>(project.value.scene)
  const viewport = ref<InstanceType<typeof StudioViewport>>()
  const selected = ref<string>(scene.value.characters[0]?.id ?? 'camera')
  const selectedEvent = ref<string | null>(null)
  const panel = ref<Panel>('inspector')
  const leftPanel = ref<LeftPanel>('script')
  const time = ref(0),
    playing = ref(false),
    fps = ref(0),
    ms = ref(0)
  const mode = ref<TransformMode>('translate')
  const camera = shallowRef<CameraPose>(cameraAt(scene.value, 0))
  const message = ref('')
  const jsonOpen = ref(false),
    json = ref('')
  const fileInput = ref<HTMLInputElement>()
  const exporting = ref<ExportState>({ running: false, done: 0, total: 0, label: '' })
  const generating = ref(false)
  const scriptWarnings = ref<string[]>([])
  const claude = useClaudeSettings()
  let exportAbort: AbortController | undefined,
    generateAbort: AbortController | undefined
  const liveScene = computed(() => ({
    ...scene.value,
    characters: scene.value.characters.map((c) => characterAt(scene.value, c, time.value))
  }))
  const selectedCharacter = computed(() => scene.value.characters.find((c) => c.id === selected.value))
  const event = computed(() => scene.value.timeline.find((e) => e.id === selectedEvent.value))
  const plan = computed(() => renderPlan(project.value.format, scene.value.duration, project.value))
  const canGenerate = computed(() => !!claude.value.apiKey)
  function bindViewport(instance: unknown) {
    viewport.value = instance as InstanceType<typeof StudioViewport> | undefined
  }
  /** Stores a new version of the active project and keeps the selection coherent with it. */
  function adoptProject(next: ContentProject, note = '') {
    next.metadata.updatedAt = new Date().toISOString()
    project.value = next
    scene.value = next.scene
    projects.value = projects.value.map((p) => (p.id === next.id ? next : p))
    const s = next.scene
    if (!s.characters.some((c) => c.id === selected.value) && !s.props.some((p) => p.id === selected.value) && !s.lights.some((l) => l.id === selected.value) && !['camera', 'environment'].includes(selected.value))
      selected.value = s.characters[0]?.id ?? 'camera'
    if (selectedEvent.value && !s.timeline.some((e) => e.id === selectedEvent.value)) selectedEvent.value = null
    if (time.value > s.duration) seek(s.duration)
    message.value = note
  }
  function adopt(next: SceneData, note = '') {
    adoptProject({ ...project.value, scene: next }, note)
  }
  /** Scene-level edit through the commands, on a copy, validated before it lands. */
  function edit(fn: (commands: SceneCommands, document: SceneData) => void, note = '') {
    try {
      const copy = structuredClone(scene.value)
      fn(new SceneCommands(copy), copy)
      adopt(validateScene(copy), note)
      return true
    } catch (e) {
      message.value = e instanceof Error ? e.message : String(e)
      return false
    }
  }
  /** Project-level edit through the content API, same discipline. */
  function editProject(fn: (studio: ContentStudio) => void, note = '') {
    try {
      const studio = new ContentStudio(structuredClone(project.value))
      fn(studio)
      adoptProject(validateProject(studio.project), note)
      return true
    } catch (e) {
      message.value = e instanceof Error ? e.message : String(e)
      return false
    }
  }
  const audio = useAudio(project, editProject, message)
  // --- Content ------------------------------------------------------------------
  function compile() {
    let warnings: string[] = []
    const ok = editProject((s) => {
      warnings = s.compileTimeline().warnings
    }, 'Timeline compiled from the script')
    scriptWarnings.value = warnings
    if (ok) {
      selected.value = scene.value.characters[0]?.id ?? 'camera'
      requestAnimationFrame(() => seek(0))
    }
    return ok
  }
  function applyScriptText(text: string) {
    let warnings: string[] = []
    editProject((s) => {
      warnings = s.setScript(text)
    })
    scriptWarnings.value = warnings
    compile()
  }
  function setFormat(format: OutputFormat) {
    editProject((s) => s.setFormat(format), `${OUTPUT_PRESETS[format].name}`)
  }
  function setStatus(status: ProjectStatus) {
    editProject((s) => s.setStatus(status))
  }
  async function generate(prompt: string) {
    if (!prompt.trim() || generating.value) return
    if (!claude.value.apiKey) {
      message.value = 'Add your Anthropic API key (director settings) to generate from a brief; templates work without one.'
      return
    }
    generating.value = true
    generateAbort = new AbortController()
    try {
      const result = await generateProject(prompt, { apiKey: claude.value.apiKey, model: claude.value.model }, generateAbort.signal)
      result.project.metadata.notes = prompt
      projects.value = [result.project, ...projects.value]
      openProject(result.project.id)
      scriptWarnings.value = result.warnings
      message.value = result.reply || 'Project generated'
    } catch (e) {
      message.value = e instanceof Error ? e.message : String(e)
    } finally {
      generating.value = false
    }
  }
  function cancelGenerate() {
    generateAbort?.abort()
  }
  /**
   * The same reel in the other language: from the stored script when the project
   * carries one, else translated by Claude with the user's key, else a copy to
   * translate by hand. Voices are dropped: they would be in the wrong language.
   */
  async function createVariant(language: ContentLanguage) {
    const source = project.value
    if (source.voice.language === language) return
    const existing = projects.value.find((p) => p.metadata.variantOf === source.id && p.voice.language === language)
    if (existing) {
      openProject(existing.id)
      return
    }
    const studio = new ContentStudio(structuredClone(source))
    const stored = source.scripts?.[language]
    let note = stored ? `${language === 'fr' ? 'French' : 'English'} version from the stored script` : 'Copied: translate the script by hand'
    if (!stored && claude.value.apiKey) {
      generating.value = true
      generateAbort = new AbortController()
      try {
        const translated = await translateScript(studio.script(), source.voice.language, language, { apiKey: claude.value.apiKey, model: claude.value.model }, generateAbort.signal)
        studio.setAltScript(language, translated)
        note = `${language === 'fr' ? 'French' : 'English'} version translated by Claude; read it before you render`
      } catch (e) {
        note = `Translation failed (${e instanceof Error ? e.message : String(e)}); copied instead`
      } finally {
        generating.value = false
      }
    }
    const variant = studio.variant(language)
    variant.title = `${source.title} (${language.toUpperCase()})`
    variant.scene.name = variant.title
    projects.value = [variant, ...projects.value]
    openProject(variant.id)
    message.value = note
  }
  // --- Transport --------------------------------------------------------------
  function seek(value: number) {
    viewport.value?.pause()
    audio.stop()
    playing.value = false
    time.value = Math.max(0, Math.min(scene.value.duration, value))
    viewport.value?.seek(time.value)
    camera.value = cameraAt(scene.value, time.value)
  }
  function togglePlay() {
    if (playing.value) {
      viewport.value?.pause()
      audio.stop()
    } else {
      const from = time.value >= scene.value.duration - 1e-3 ? 0 : time.value
      viewport.value?.play()
      audio.play(from)
    }
    playing.value = !playing.value
  }
  function step(frames: number) {
    seek(time.value + frames / scene.value.fps)
  }
  // --- Camera -----------------------------------------------------------------
  function setCamera(pose: CameraPose) {
    viewport.value?.pause()
    playing.value = false
    camera.value = structuredClone(pose)
    viewport.value?.setCamera(pose)
  }
  function cameraKey() {
    edit((c) => c.addCameraKeyframe(time.value, camera.value), `Camera key at ${time.value.toFixed(2)}s`)
  }
  function applyPreset(name: PresetName) {
    const subject = selectedCharacter.value ?? scene.value.characters[0]
    if (!subject) {
      message.value = 'Add a character to frame first'
      return
    }
    setCamera(presetPose(name, subjectOf(scene.value, subject, time.value)))
    message.value = `${name} on ${subject.name}. Press K to record it as a camera key.`
  }
  // --- Selection and inspector ------------------------------------------------------
  function select(id: string) {
    selected.value = id
    selectedEvent.value = null
    panel.value = 'inspector'
  }
  function selectEvent(id: string | null) {
    selectedEvent.value = id
    if (id) {
      panel.value = 'inspector'
      const e = scene.value.timeline.find((e) => e.id === id)
      if (e) seek(e.time)
    }
  }
  /** Patches the selected object. Position, gaze and expression of a character become keys at the playhead. */
  function patch(values: Record<string, unknown>) {
    const id = selected.value
    edit((c, d) => {
      if (id === 'environment') c.setEnvironment(values)
      else if (d.characters.some((x) => x.id === id)) {
        const { position, gaze, expression, ...rest } = values as Partial<SceneData['characters'][number]>
        if (position) c.setCharacterPosition(id, position, time.value)
        if (gaze) c.setGazeTarget(id, gaze, time.value)
        if (expression) c.setExpression(id, expression, time.value)
        if (Object.keys(rest).length) c.setCharacter(id, rest)
      } else if (d.props.some((x) => x.id === id)) c.setProp(id, values)
      else if (d.lights.some((x) => x.id === id)) c.setLight(id, values)
    })
  }
  function transform(id: string, position: Vec3, rotation: Vec3, scale: number) {
    edit((c, d) => {
      if (d.characters.some((x) => x.id === id)) {
        c.setCharacter(id, { rotation, scale })
        c.setCharacterPosition(id, position, time.value)
      } else if (d.props.some((x) => x.id === id)) c.setProp(id, { position, rotation, scale })
    })
  }
  function removeSelected() {
    const id = selected.value
    if (selectedEvent.value) return removeEvent(selectedEvent.value)
    edit((c, d) => {
      if (d.characters.some((x) => x.id === id)) c.removeCharacter(id)
      else if (d.props.some((x) => x.id === id)) c.removeProp(id)
      else if (d.lights.some((x) => x.id === id)) c.removeLight(id)
    })
  }
  // --- Adding things ------------------------------------------------------------
  function addCharacter(kind: CharacterKind) {
    let id = ''
    edit((c) => {
      id = c.addCharacter(kind).id
    })
    if (id) select(id)
  }
  function addProp(kind: PropKind) {
    let id = ''
    const anchor = selectedCharacter.value?.position ?? [0, 0, 0]
    edit((c) => {
      id = c.addProp(kind, { position: [anchor[0] + 0.8, anchor[1], anchor[2] + 0.4] }).id
    })
    if (id) select(id)
  }
  function addLight() {
    let id = ''
    edit((c) => {
      id = c.addLight({ position: [camera.value.position[0] * 0.5, 3.5, camera.value.position[2] * 0.5] }).id
    })
    if (id) select(id)
  }
  // --- Timeline -----------------------------------------------------------------
  function addEventAtPlayhead(type: Exclude<EventType, 'camera'>) {
    const character = selectedCharacter.value ?? scene.value.characters[0]
    if (!character) {
      message.value = 'Add a character first'
      return
    }
    const live = liveScene.value.characters.find((c) => c.id === character.id)!
    let id: string | undefined
    edit((c) => {
      const t = time.value
      switch (type) {
        case 'position':
          c.setCharacterPosition(character.id, live.position, t)
          break
        case 'gaze':
          c.setGazeTarget(character.id, live.gaze, t)
          break
        case 'expression':
          c.setExpression(character.id, live.expression, t)
          break
        case 'dialogue':
          id = c.say(character.id, 'New line', t, readingTime('New line')).id
          break
        case 'action':
          id = c.act(character.id, 'nod', t).id
          break
      }
    })
    if (id) selectEvent(id)
  }
  function updateEvent(id: string, values: Partial<TimelineEvent>) {
    edit((c) => c.updateEvent(id, values))
  }
  function moveEvent(id: string, t: number) {
    edit((c) => c.moveEvent(id, Math.max(0, Math.min(scene.value.duration, t))))
  }
  function removeEvent(id: string) {
    edit((c) => c.removeEvent(id))
    if (selectedEvent.value === id) selectedEvent.value = null
  }
  function setDuration(value: number) {
    edit((c) => c.setDuration(Math.max(0.5, Math.min(300, value))))
  }
  function setAspect(aspect: Aspect) {
    edit((c) => c.setAspect(aspect))
  }
  function setEnvironment(id: EnvironmentId) {
    edit((c) => c.setEnvironment({ id }))
    requestAnimationFrame(() => seek(time.value))
  }
  function rename(name: string) {
    if (!name.trim()) return
    editProject((s) => {
      s.setTitle(name)
      s.project.scene.name = name.trim()
    })
  }
  // --- Library ------------------------------------------------------------------
  function openProject(id: string) {
    const next = projects.value.find((p) => p.id === id)
    if (!next) return
    viewport.value?.pause()
    audio.stop()
    playing.value = false
    activeId.value = id
    project.value = next
    scene.value = next.scene
    selected.value = next.scene.characters[0]?.id ?? 'camera'
    selectedEvent.value = null
    scriptWarnings.value = []
    view.value = 'studio'
    requestAnimationFrame(() => seek(0))
  }
  if (view.value === 'studio') requestAnimationFrame(() => requestAnimationFrame(() => seek(initialTime)))
  function captureThumbnail() {
    const engine = viewport.value?.engine()
    if (!engine || exporting.value.running) return
    try {
      const canvas = document.createElement('canvas')
      const portrait = scene.value.aspect === '9:16'
      canvas.width = portrait ? 180 : 320
      canvas.height = portrait ? 320 : 180
      const capture = engine.capture(canvas.width, canvas.height)
      try {
        capture.frame(Math.min(scene.value.duration, scene.value.duration * 0.35), canvas.getContext('2d')!)
      } finally {
        capture.end()
      }
      const thumbnail = canvas.toDataURL('image/jpeg', 0.7)
      const next = { ...project.value, metadata: { ...project.value.metadata, thumbnail } }
      project.value = next
      projects.value = projects.value.map((p) => (p.id === next.id ? next : p))
    } catch {
      /* a thumbnail is a nicety */
    }
  }
  function toLibrary() {
    viewport.value?.pause()
    audio.stop()
    playing.value = false
    captureThumbnail()
    view.value = 'library'
  }
  function addProject(next: ContentProject) {
    projects.value = [next, ...projects.value]
    openProject(next.id)
    leftPanel.value = 'script'
  }
  function newProject(templateId?: string) {
    try {
      const studio = templateId ? ContentStudio.fromTemplate(templateId) : ContentStudio.create({ cast: ['lew'] })
      addProject(studio.project)
    } catch (e) {
      message.value = e instanceof Error ? e.message : String(e)
    }
  }
  /** A fresh copy of one of the ready-made reels, with its own id. */
  function newFromExample(id: string) {
    const reel = EXAMPLE_REELS.find((r) => r.id === id)
    if (!reel) return
    const project = buildExample(reel, new Date().toISOString())
    project.id = newProjectId()
    addProject(project)
  }
  function duplicateProject(id = activeId.value) {
    const source = projects.value.find((p) => p.id === id)
    if (!source) return
    const copy = structuredClone(source)
    copy.id = newProjectId()
    copy.title = `${source.title} copy`
    copy.scene.name = copy.title
    copy.status = 'draft'
    copy.metadata = { ...copy.metadata, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), renderedAt: undefined }
    addProject(copy)
  }
  function deleteProject(id: string) {
    if (projects.value.length <= 1) {
      message.value = 'The library keeps at least one project'
      return
    }
    projects.value = projects.value.filter((p) => p.id !== id)
    if (activeId.value === id) {
      const next = projects.value[0]!
      activeId.value = next.id
      project.value = next
      scene.value = next.scene
    }
  }
  // --- Files --------------------------------------------------------------------
  /** Imports a project, or a bare scene wrapped as a script-less project. */
  function load(text: string) {
    try {
      const parsed = JSON.parse(text) as { version?: unknown }
      const next = parsed.version === 1 ? parseProject(text) : projectFromScene(parseScene(text))
      next.id = newProjectId()
      viewport.value?.pause()
      addProject(next)
      jsonOpen.value = false
      message.value = 'Project imported'
    } catch (e) {
      message.value = `Import failed: ${e instanceof Error ? e.message : String(e)}`
    }
  }
  async function importFile(ev: Event) {
    const input = ev.target as HTMLInputElement,
      file = input.files?.[0]
    if (file) {
      if (file.size > 3_000_000) message.value = 'File exceeds 3 MB'
      else load(await file.text())
    }
    input.value = ''
  }
  function exportJSON() {
    download(new Blob([serializeProject(project.value)], { type: 'application/json' }), `${slug(project.value.title)}.lew.json`)
  }
  function exportSceneJSON() {
    download(new Blob([serializeScene(scene.value)], { type: 'application/json' }), `${slug(scene.value.name)}.scene.json`)
  }
  function showJSON() {
    json.value = serializeProject(project.value)
    jsonOpen.value = true
  }
  async function exportPNG() {
    const engine = viewport.value?.engine()
    if (!engine) return
    viewport.value?.pause()
    playing.value = false
    try {
      download(await renderStill(engine, scene.value, time.value), `${slug(scene.value.name)}-${time.value.toFixed(2)}s.png`)
      message.value = 'PNG saved'
    } catch (e) {
      message.value = `PNG export failed: ${e instanceof Error ? e.message : String(e)}`
    }
  }
  /** Final render: deterministic frames at the format's preset, burned-in subtitles, no audio track yet. */
  async function renderReel(format: OutputFormat = project.value.format) {
    const engine = viewport.value?.engine()
    if (!engine || exporting.value.running) return
    if (format !== project.value.format) setFormat(format)
    viewport.value?.pause()
    audio.stop()
    playing.value = false
    exportAbort = new AbortController()
    const preset = OUTPUT_PRESETS[format]
    exporting.value = { running: true, done: 0, total: Math.round(scene.value.duration * scene.value.fps), label: `${preset.name} · ${preset.width}×${preset.height} · ${scene.value.fps} fps · mixing audio` }
    try {
      const mix = audio.hasSound.value ? await audio.currentMix() : undefined
      if (audio.missing.value.length) message.value = `Missing clips left out of the mix: ${audio.missing.value.join(', ')}`
      exporting.value = { ...exporting.value, label: `${preset.name} · ${preset.width}×${preset.height} · ${scene.value.fps} fps · ${mix ? 'AAC audio' : 'silent'}` }
      const blob = await renderVideo(engine, scene.value, (p) => (exporting.value = { ...exporting.value, ...p }), exportAbort.signal, mix)
      download(blob, `${slug(project.value.title)}-${format}.mp4`)
      editProject((s) => s.setStatus('rendered'), `MP4 saved · ${(blob.size / 1e6).toFixed(1)} MB`)
    } catch (e) {
      message.value = e instanceof ExportCancelled ? 'Render cancelled' : `Render failed: ${e instanceof Error ? e.message : String(e)}`
    } finally {
      exporting.value = { ...exporting.value, running: false }
      requestAnimationFrame(() => seek(time.value))
    }
  }
  function cancelExport() {
    exportAbort?.abort()
  }
  // --- Keyboard -----------------------------------------------------------------
  function keyboard(ev: KeyboardEvent) {
    const target = ev.target as HTMLElement
    if (view.value !== 'studio' || target.matches('input, textarea, select, [contenteditable]') || jsonOpen.value || exporting.value.running) return
    if (ev.code === 'Space') {
      ev.preventDefault()
      togglePlay()
    } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
      ev.preventDefault()
      step((ev.key === 'ArrowLeft' ? -1 : 1) * (ev.shiftKey ? 10 : 1))
    } else if (ev.key === 'Home') seek(0)
    else if (ev.key === 'End') seek(scene.value.duration)
    else if (ev.key.toLowerCase() === 'k' && !ev.metaKey && !ev.ctrlKey) cameraKey()
    else if ((ev.key === 'Delete' || ev.key === 'Backspace') && selectedEvent.value) removeEvent(selectedEvent.value)
    else if (ev.key === 'Escape') selectedEvent.value = null
    else if (['g', 'r', 's'].includes(ev.key) && !ev.metaKey && !ev.ctrlKey)
      mode.value = ({ g: 'translate', r: 'rotate', s: 'scale' } as const)[ev.key as 'g' | 'r' | 's']
  }
  let saveTimer: ReturnType<typeof setTimeout>
  function save() {
    clearTimeout(saveTimer)
    if (!saveLibrary(projects.value, activeId.value)) message.value = 'Local autosave unavailable; export the project JSON to keep your work'
  }
  watch([projects, activeId], () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(save, 300)
  })
  onMounted(() => {
    window.addEventListener('keydown', keyboard)
    window.addEventListener('pagehide', save)
  })
  onBeforeUnmount(() => {
    save()
    window.removeEventListener('keydown', keyboard)
    window.removeEventListener('pagehide', save)
  })
  return {
    projects,
    activeId,
    project,
    view,
    scene,
    liveScene,
    bindViewport,
    selected,
    selectedEvent,
    selectedCharacter,
    event,
    panel,
    leftPanel,
    time,
    playing,
    fps,
    ms,
    mode,
    camera,
    message,
    jsonOpen,
    json,
    fileInput,
    exporting,
    generating,
    scriptWarnings,
    plan,
    canGenerate,
    claude,
    audio,
    adopt,
    adoptProject,
    edit,
    editProject,
    compile,
    applyScriptText,
    setFormat,
    setStatus,
    generate,
    cancelGenerate,
    createVariant,
    seek,
    togglePlay,
    step,
    setCamera,
    cameraKey,
    applyPreset,
    select,
    selectEvent,
    patch,
    transform,
    removeSelected,
    addCharacter,
    addProp,
    addLight,
    addEventAtPlayhead,
    updateEvent,
    moveEvent,
    removeEvent,
    setDuration,
    setAspect,
    setEnvironment,
    rename,
    openProject,
    toLibrary,
    captureThumbnail,
    newProject,
    newFromExample,
    duplicateProject,
    deleteProject,
    load,
    importFile,
    exportJSON,
    exportSceneJSON,
    showJSON,
    exportPNG,
    renderReel,
    cancelExport,
    OUTPUT_SIZE
  }
}
export type StudioDocument = ReturnType<typeof useStudioDocument>
