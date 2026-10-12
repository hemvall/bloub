<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Icon from './Icon.vue'
import { SceneEngine } from '@/studio/engine/SceneEngine'
import { aspectRatio, type CameraPose, type SceneData, type Vec3 } from '@/studio/scene/model'
import { PRESET_NAMES } from '@/studio/camera/presets'
import type { StudioDocument, TransformMode } from './useStudioDocument'
const props = defineProps<{ scene: SceneData; selected: string; mode: TransformMode; studio: StudioDocument }>()
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
const ratio = computed(() => aspectRatio(props.scene.aspect))
function resize() {
  if (!surface.value) return
  const w = Math.max(1, surface.value.clientWidth - 32),
    h = Math.max(1, surface.value.clientHeight - 32)
  fit.value = w / h > ratio.value ? { width: `${Math.floor(h * ratio.value)}px`, height: `${h}px` } : { width: `${w}px`, height: `${Math.floor(w / ratio.value)}px` }
}
onMounted(() => {
  try {
    engine = new SceneEngine(host.value!, props.scene, {
      frame: (t, fps, ms) => emit('frame', t, fps, ms, engine?.playing ?? false),
      select: (id) => emit('select', id),
      camera: (pose) => emit('camera', pose),
      transform: (id, p, r, s) => emit('transform', id, p, r, s),
      error: (m) => {
        error.value = m
        emit('error', m)
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
watch(() => props.scene, (s) => engine?.setScene(s))
watch(() => props.selected, (id) => engine?.select(id))
watch(() => props.mode, (m) => engine?.setTransformMode(m))
watch(ratio, resize)
onBeforeUnmount(() => {
  observer?.disconnect()
  engine?.dispose()
})
defineExpose({
  seek: (t: number) => engine?.seek(t),
  play: () => engine?.play(),
  pause: () => engine?.pause(),
  setCamera: (pose: CameraPose) => engine?.setCameraPose(pose),
  engine: () => engine
})
const MODES: { id: TransformMode; icon: string; label: string; key: string }[] = [
  { id: 'translate', icon: 'move', label: 'Move', key: 'G' },
  { id: 'rotate', icon: 'rotate', label: 'Rotate', key: 'R' },
  { id: 'scale', icon: 'scale', label: 'Scale', key: 'S' }
]
</script>
<template>
  <div class="viewport">
    <div class="viewport-toolbar">
      <div class="segmented" role="radiogroup" aria-label="Gizmo">
        <button
          v-for="m in MODES"
          :key="m.id"
          role="radio"
          :aria-checked="mode === m.id"
          :class="{ active: mode === m.id }"
          :title="`${m.label} (${m.key})`"
          @click="studio.mode.value = m.id"
        >
          <Icon :name="m.icon" /> {{ m.label }}
        </button>
      </div>
      <span class="divider" />
      <span class="dim">Frame</span>
      <button v-for="p in PRESET_NAMES" :key="p" class="ghost" :title="`${p} on the selected character`" @click="studio.applyPreset(p)">{{ p }}</button>
      <div class="spacer" />
      <button class="ghost accent" title="Record the current view as a camera key (K)" @click="studio.cameraKey()"><Icon name="key" /> Camera key</button>
    </div>
    <div ref="surface" class="surface">
      <div ref="host" class="canvas-host" :style="fit">
        <div v-if="error" class="viewport-error">{{ error }}</div>
      </div>
    </div>
  </div>
</template>
