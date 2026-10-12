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
import { emptyScene, EXAMPLES } from '@/studio/scene/examples'
import { presetPose, type PresetName } from '@/studio/camera/presets'
import { subjectOf } from '@/studio/timeline/evaluate'
import { download, ExportCancelled, renderStill, renderVideo, slug } from '@/studio/export/video'
import { loadProject, newEntryId, saveProject, type ProjectEntry } from './useProject'
export type TransformMode = 'translate' | 'rotate' | 'scale'
export type Panel = 'director' | 'inspector'
export interface ExportState {
  running: boolean
  done: number
  total: number
  label: string
}
/** All studio state lives here; components are views on it and the engine is its renderer. */
export function useStudioDocument() {
  const project = loadProject()
  const entries = shallowRef<ProjectEntry[]>(project.entries)
  const linked = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('scene')
  const activeId = ref(entries.value.some((e) => e.id === linked) ? linked! : project.active)
  const scene = shallowRef<SceneData>(entries.value.find((e) => e.id === activeId.value)!.scene)
  const viewport = ref<InstanceType<typeof StudioViewport>>()
  const selected = ref<string>(scene.value.characters[0]?.id ?? 'camera')
  const selectedEvent = ref<string | null>(null)
  const panel = ref<Panel>('director')
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
  let exportAbort: AbortController | undefined
  const liveScene = computed(() => ({
    ...scene.value,
    characters: scene.value.characters.map((c) => characterAt(scene.value, c, time.value))
  }))
  const selectedCharacter = computed(() => scene.value.characters.find((c) => c.id === selected.value))
  const event = computed(() => scene.value.timeline.find((e) => e.id === selectedEvent.value))
  function bindViewport(instance: unknown) {
    viewport.value = instance as InstanceType<typeof StudioViewport> | undefined
  }
  function adopt(next: SceneData, note = '') {
    scene.value = next
    entries.value = entries.value.map((e) => (e.id === activeId.value ? { ...e, scene: next } : e))
    if (!next.characters.some((c) => c.id === selected.value) && !next.props.some((p) => p.id === selected.value) && !next.lights.some((l) => l.id === selected.value) && !['camera', 'environment'].includes(selected.value))
      selected.value = next.characters[0]?.id ?? 'camera'
    if (selectedEvent.value && !next.timeline.some((e) => e.id === selectedEvent.value)) selectedEvent.value = null
    if (time.value > next.duration) seek(next.duration)
    message.value = note
  }
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
  // --- Transport --------------------------------------------------------------
  function seek(value: number) {
    viewport.value?.pause()
    playing.value = false
    time.value = Math.max(0, Math.min(scene.value.duration, value))
    viewport.value?.seek(time.value)
    camera.value = cameraAt(scene.value, time.value)
  }
  function togglePlay() {
    if (playing.value) viewport.value?.pause()
    else viewport.value?.play()
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
    if (name.trim()) edit((c) => c.setName(name.trim()))
  }
  // --- Project ------------------------------------------------------------------
  function openScene(id: string) {
    const entry = entries.value.find((e) => e.id === id)
    if (!entry || id === activeId.value) return
    viewport.value?.pause()
    playing.value = false
    activeId.value = id
    scene.value = entry.scene
    selected.value = entry.scene.characters[0]?.id ?? 'camera'
    selectedEvent.value = null
    requestAnimationFrame(() => seek(0))
  }
  function newScene(template?: string) {
    const example = EXAMPLES.find((x) => x.id === template)
    const entry = { id: newEntryId(), scene: example ? example.build() : emptyScene() }
    entries.value = [...entries.value, entry]
    openScene(entry.id)
    panel.value = 'director'
  }
  function duplicateScene() {
    const entry = { id: newEntryId(), scene: structuredClone({ ...scene.value, name: `${scene.value.name} copy` }) }
    entries.value = [...entries.value, entry]
    openScene(entry.id)
  }
  function deleteScene(id: string) {
    if (entries.value.length <= 1) {
      message.value = 'A project keeps at least one scene'
      return
    }
    const remaining = entries.value.filter((e) => e.id !== id)
    entries.value = remaining
    if (activeId.value === id) openScene(remaining[0]!.id)
  }
  // --- Files --------------------------------------------------------------------
  function load(text: string) {
    try {
      const parsed = parseScene(text)
      viewport.value?.pause()
      adopt(parsed, 'Scene imported')
      selected.value = parsed.characters[0]?.id ?? 'camera'
      jsonOpen.value = false
      requestAnimationFrame(() => seek(0))
    } catch (e) {
      message.value = `Import failed: ${e instanceof Error ? e.message : String(e)}`
    }
  }
  async function importFile(ev: Event) {
    const input = ev.target as HTMLInputElement,
      file = input.files?.[0]
    if (file) {
      if (file.size > 2_000_000) message.value = 'Scene file exceeds 2 MB'
      else load(await file.text())
    }
    input.value = ''
  }
  function exportJSON() {
    download(new Blob([serializeScene(scene.value)], { type: 'application/json' }), `${slug(scene.value.name)}.json`)
  }
  function showJSON() {
    json.value = serializeScene(scene.value)
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
  async function exportMP4() {
    const engine = viewport.value?.engine()
    if (!engine || exporting.value.running) return
    viewport.value?.pause()
    playing.value = false
    exportAbort = new AbortController()
    const [w, h] = OUTPUT_SIZE[scene.value.aspect]
    exporting.value = { running: true, done: 0, total: Math.round(scene.value.duration * scene.value.fps), label: `${w}×${h} · ${scene.value.fps} fps` }
    try {
      const blob = await renderVideo(engine, scene.value, (p) => (exporting.value = { ...exporting.value, ...p }), exportAbort.signal)
      download(blob, `${slug(scene.value.name)}.mp4`)
      message.value = `MP4 saved · ${(blob.size / 1e6).toFixed(1)} MB`
    } catch (e) {
      message.value = e instanceof ExportCancelled ? 'Export cancelled' : `Video export failed: ${e instanceof Error ? e.message : String(e)}`
    } finally {
      exporting.value = { ...exporting.value, running: false }
      requestAnimationFrame(() => seek(time.value))
    }
  }
  function cancelExport() {
    exportAbort?.abort()
  }
  function reset() {
    const example = EXAMPLES.find((x) => `example-${x.id}` === activeId.value)
    adopt(example ? example.build() : emptyScene(scene.value.name, scene.value.environment.id), 'Scene reset')
    requestAnimationFrame(() => seek(0))
  }
  // --- Keyboard -----------------------------------------------------------------
  function keyboard(ev: KeyboardEvent) {
    const target = ev.target as HTMLElement
    if (target.matches('input, textarea, select, [contenteditable]') || jsonOpen.value || exporting.value.running) return
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
    if (!saveProject(entries.value, activeId.value)) message.value = 'Local autosave unavailable; export JSON to keep your work'
  }
  watch([entries, activeId], () => {
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
    entries,
    activeId,
    scene,
    liveScene,
    bindViewport,
    selected,
    selectedEvent,
    selectedCharacter,
    event,
    panel,
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
    adopt,
    edit,
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
    openScene,
    newScene,
    duplicateScene,
    deleteScene,
    load,
    importFile,
    exportJSON,
    showJSON,
    exportPNG,
    exportMP4,
    cancelExport,
    reset
  }
}
export type StudioDocument = ReturnType<typeof useStudioDocument>
