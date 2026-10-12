<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { SceneEngine } from '@/studio/engine/SceneEngine'
import type { CameraPose, SceneData, Vec3 } from '@/studio/scene/model'
const props = defineProps<{
  scene: SceneData
  selected: string
  mode: 'translate' | 'rotate' | 'scale'
}>()
const emit = defineEmits<{
  frame: [time: number, fps: number, ms: number, playing: boolean]
  select: [id: string]
  camera: [pose: CameraPose]
  transform: [id: string, position: Vec3, rotation: Vec3, scale: number]
  error: [message: string]
}>()
const host = ref<HTMLElement>(),
  surface = ref<HTMLElement>(),
  error = ref('')
let engine: SceneEngine | undefined, observer: ResizeObserver | undefined
const fit = ref({ width: '100%', height: '100%' })
const ratio = computed(() =>
  props.scene.aspect === '16:9' ? 16 / 9 : props.scene.aspect === '9:16' ? 9 / 16 : 1
)
function resize() {
  if (!surface.value) return
  const w = Math.max(1, surface.value.clientWidth - 48),
    h = Math.max(1, surface.value.clientHeight - 72)
  fit.value =
    w / h > ratio.value
      ? { width: `${h * ratio.value}px`, height: `${h}px` }
      : { width: `${w}px`, height: `${w / ratio.value}px` }
}
onMounted(() => {
  try {
    engine = new SceneEngine(host.value!, props.scene, {
      frame: (t, fps, ms) => emit('frame', t, fps, ms, engine?.playing ?? false),
      select: (id) => emit('select', id),
      camera: (pose) => emit('camera', pose),
      transform: (id, p, r, s) => emit('transform', id, p, r, s),
      error: (message) => {
        error.value = message
        emit('error', message)
      }
    })
    engine.select(props.selected)
    observer = new ResizeObserver(resize)
    observer.observe(surface.value!)
    resize()
  } catch (e) {
    error.value = `Viewport unavailable: ${e instanceof Error ? e.message : String(e)}`
    emit('error', error.value)
  }
})
watch(
  () => props.scene,
  (scene) => engine?.setScene(scene)
)
watch(
  () => props.selected,
  (id) => engine?.select(id)
)
watch(
  () => props.mode,
  (mode) => engine?.setTransformMode(mode)
)
watch(ratio, resize)
onBeforeUnmount(() => {
  observer?.disconnect()
  engine?.dispose()
})
defineExpose({
  seek: (time: number) => engine?.seek(time),
  play: () => engine?.play(),
  pause: () => engine?.pause(),
  setCamera: (pose: CameraPose) => engine?.setCameraPose(pose),
  cameraPose: () => engine?.getCameraPose()
})
</script>
<template>
  <div ref="surface" class="studio-surface">
    <div class="surface-label">
      <span class="live-dot" />
      REALTIME VIEWPORT
      <span>{{ scene.aspect }} · {{ scene.fps }} fps output</span>
    </div>
    <div ref="host" class="studio-canvas" :style="fit">
      <div v-if="error" class="viewport-error">{{ error }}</div>
      <span class="frame-corner tl" />
      <span class="frame-corner br" />
    </div>
    <div class="surface-help">
      Drag to orbit
      <span>·</span>
      Right drag to pan
      <span>·</span>
      Scroll to dolly
      <span>·</span>
      Click to select
    </div>
  </div>
</template>
