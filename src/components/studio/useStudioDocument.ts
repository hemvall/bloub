import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type StudioViewport from './StudioViewport.vue'
import {
  CAMERA_PRESETS,
  createScene,
  type CameraPose,
  type SceneData,
  type TimelineEvent,
  type Vec3
} from '@/studio/scene/model'
import { SceneCommands } from '@/studio/scene/commands'
import { cameraAt, characterAt } from '@/studio/timeline/evaluate'
import { parseScene, serializeScene } from '@/studio/serialization/scene'

/** Vue document client. Realtime evaluation and Three.js resources stay in SceneEngine. */
export function useStudioDocument() {
  const scene = shallowRef<SceneData>(createScene()),
    viewport = ref<InstanceType<typeof StudioViewport>>()
  function bindViewport(instance: unknown) {
    viewport.value = instance as InstanceType<typeof StudioViewport> | undefined
  }
  const selected = ref('kit'),
    time = ref(0),
    playing = ref(false),
    fps = ref(0),
    ms = ref(0),
    inspectorOpen = ref(false)
  const mode = ref<'translate' | 'rotate' | 'scale'>('translate'),
    camera = shallowRef<CameraPose>(structuredClone(scene.value.camera))
  const message = ref(''),
    jsonOpen = ref(false),
    json = ref(''),
    fileInput = ref<HTMLInputElement>()
  const characterId = computed(() =>
    scene.value.characters.some((c) => c.id === selected.value)
      ? selected.value
      : scene.value.characters[0]?.id
  )
  const inspectorScene = computed(() => ({
    ...scene.value,
    characters: scene.value.characters.map((c) => characterAt(scene.value, c, time.value))
  }))
  function edit(fn: (commands: SceneCommands, document: SceneData) => void) {
    try {
      const copy = structuredClone(scene.value)
      fn(new SceneCommands(copy), copy)
      scene.value = parseScene(serializeScene(copy))
      message.value = ''
    } catch (e) {
      message.value = e instanceof Error ? e.message : String(e)
    }
  }
  function seek(value: number) {
    viewport.value?.pause()
    playing.value = false
    viewport.value?.seek(value)
    time.value = value
    camera.value = cameraAt(scene.value, value)
  }
  function togglePlay() {
    if (playing.value) viewport.value?.pause()
    else viewport.value?.play()
    playing.value = !playing.value
  }
  function setCamera(pose: CameraPose) {
    viewport.value?.pause()
    playing.value = false
    camera.value = structuredClone(pose)
    viewport.value?.setCamera(pose)
  }
  function cameraKey() {
    edit((c) => c.addCameraKeyframe(time.value, camera.value))
    message.value = `Camera key recorded at ${time.value.toFixed(2)}s`
  }
  function positionKey() {
    const id = characterId.value
    if (!id) {
      message.value = 'Add a character first'
      return
    }
    const character = inspectorScene.value.characters.find((c) => c.id === id)!
    edit((c) => c.addPositionKeyframe(time.value, id, character.position))
  }
  function gazeKey() {
    const id = characterId.value
    if (!id) return
    const character = inspectorScene.value.characters.find((c) => c.id === id)!
    edit((c) => c.setGazeTarget(id, character.gaze, time.value))
  }
  function expressionKey() {
    const id = characterId.value
    if (!id) return
    const character = inspectorScene.value.characters.find((c) => c.id === id)!
    edit((c) => c.setExpression(id, character.expression, time.value))
  }
  function patch(patch: Record<string, unknown>) {
    edit((commands, document) => {
      if (selected.value === 'environment' || selected.value === 'counter')
        commands.setEnvironment(patch)
      else {
        const object = [...document.characters, ...document.props, ...document.lights].find(
          (o) => o.id === selected.value
        )
        if (document.characters.some((c) => c.id === selected.value)) {
          if (patch.position)
            commands.addPositionKeyframe(time.value, selected.value, patch.position as Vec3)
          if (patch.gaze)
            commands.setGazeTarget(
              selected.value,
              patch.gaze as SceneData['characters'][number]['gaze'],
              time.value
            )
          if (patch.expression)
            commands.setExpression(
              selected.value,
              patch.expression as SceneData['characters'][number]['expression'],
              time.value
            )
          if (object)
            for (const [key, value] of Object.entries(patch))
              if (!['position', 'gaze', 'expression'].includes(key))
                Object.assign(object, { [key]: value })
        } else if (object) Object.assign(object, patch)
      }
    })
  }
  function transform(id: string, position: Vec3, rotation: Vec3, scale: number) {
    edit((commands, document) => {
      const character = document.characters.find((c) => c.id === id)
      if (character) {
        Object.assign(character, { rotation, scale })
        commands.addPositionKeyframe(time.value, id, position)
      }
      const prop = document.props.find((p) => p.id === id)
      if (prop) Object.assign(prop, { position, rotation, scale })
    })
  }
  function remove(event: TimelineEvent) {
    edit((_, document) => {
      document.timeline = document.timeline.filter(
        (e) => JSON.stringify(e) !== JSON.stringify(event)
      )
    })
  }
  function duration(value: number) {
    edit((_, document) => {
      document.duration = value
      document.timeline = document.timeline.filter((e) => e.time <= value)
    })
    seek(Math.min(time.value, scene.value.duration))
  }
  function reset() {
    viewport.value?.pause()
    scene.value = createScene()
    selected.value = 'kit'
    camera.value = structuredClone(scene.value.camera)
    time.value = 0
    playing.value = false
    requestAnimationFrame(() => seek(0))
  }
  function load(text: string) {
    try {
      const parsed = parseScene(text)
      viewport.value?.pause()
      scene.value = parsed
      selected.value = parsed.characters[0]?.id ?? 'camera'
      time.value = 0
      playing.value = false
      jsonOpen.value = false
      camera.value = cameraAt(parsed, 0)
      requestAnimationFrame(() => seek(0))
      message.value = 'Scene imported'
    } catch (e) {
      message.value = `Import failed: ${e instanceof Error ? e.message : String(e)}`
    }
  }
  async function importFile(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0]
    if (file) {
      if (file.size > 1_000_000) message.value = 'Scene file exceeds 1 MB'
      else load(await file.text())
    }
    input.value = ''
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([serializeScene(scene.value)], { type: 'application/json' })
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `${scene.value.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  function addProp() {
    const id = `bottle-${scene.value.props.length + 1}`
    edit((c) =>
      c.addProp({
        id,
        kind: 'bottle',
        position: [-1.2, 1.93, 0],
        rotation: [0, 0, 0],
        scale: 1,
        color: '#659c88'
      })
    )
    selected.value = id
  }
  function addCharacter() {
    const id = `kit-${scene.value.characters.length + 1}`
    edit((c) =>
      c.addCharacter({
        ...structuredClone(createScene().characters[0]!),
        id,
        name: `Kit ${scene.value.characters.length + 1}`,
        position: [-2.3, 1.05, -1.4]
      })
    )
    selected.value = id
  }
  function keyboard(event: KeyboardEvent) {
    if ((event.target as HTMLElement).matches('input, textarea, select') || jsonOpen.value) return
    if (event.code === 'Space') {
      event.preventDefault()
      togglePlay()
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      seek(
        Math.max(
          0,
          Math.min(
            scene.value.duration,
            time.value + (event.key === 'ArrowLeft' ? -1 : 1) / scene.value.fps
          )
        )
      )
    }
  }
  function legacy() {
    window.location.href = '/#'
    window.location.reload()
  }
  function showJSON() {
    json.value = serializeScene(scene.value)
    jsonOpen.value = true
  }
  function choosePreset(event: Event) {
    const select = event.target as HTMLSelectElement
    const pose = CAMERA_PRESETS[select.value]
    if (pose) setCamera(pose)
    select.value = ''
  }
  let saveTimer: ReturnType<typeof setTimeout>
  function save() {
    clearTimeout(saveTimer)
    try {
      localStorage.setItem('bloub-scene-v1', serializeScene(scene.value))
    } catch {
      message.value = 'Local autosave unavailable; export JSON to save your work'
    }
  }
  watch(scene, () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(save, 250)
  })
  onMounted(() => {
    try {
      const saved = localStorage.getItem('bloub-scene-v1')
      if (saved) load(saved)
    } catch {
      /* Storage is optional. */
    }
    window.addEventListener('keydown', keyboard)
    window.addEventListener('pagehide', save)
  })
  onBeforeUnmount(() => {
    save()
    window.removeEventListener('keydown', keyboard)
    window.removeEventListener('pagehide', save)
  })

  return {
    scene,
    bindViewport,
    selected,
    time,
    playing,
    fps,
    ms,
    inspectorOpen,
    mode,
    camera,
    message,
    jsonOpen,
    json,
    fileInput,
    inspectorScene,
    edit,
    seek,
    togglePlay,
    setCamera,
    cameraKey,
    positionKey,
    gazeKey,
    expressionKey,
    patch,
    transform,
    remove,
    duration,
    reset,
    load,
    importFile,
    download,
    addProp,
    addCharacter,
    legacy,
    showJSON,
    choosePreset
  }
}
