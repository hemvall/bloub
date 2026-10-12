<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from './Icon.vue'
import type { StudioDocument } from './useStudioDocument'
import { EVENT_TYPES, type EventType, type TimelineEvent } from '@/studio/scene/model'
import { ACTION_DURATION } from '@/studio/animation/actions'
const props = defineProps<{ studio: StudioDocument }>()
const { scene, time, selectedEvent } = props.studio
const LABELS: Record<EventType, string> = { camera: 'Camera', position: 'Position', gaze: 'Gaze', expression: 'Expression', dialogue: 'Dialogue', action: 'Action' }
const ticks = computed(() => {
  const d = scene.value.duration,
    step = d > 40 ? 10 : d > 16 ? 5 : d > 8 ? 2 : 1
  return Array.from({ length: Math.floor(d / step) + 1 }, (_, i) => i * step)
})
const pct = (t: number) => `${(t / scene.value.duration) * 100}%`
const lanes = ref<HTMLElement>()
function timeAt(clientX: number) {
  const el = lanes.value
  if (!el) return 0
  const r = el.getBoundingClientRect()
  return Math.max(0, Math.min(scene.value.duration, ((clientX - r.left) / r.width) * scene.value.duration))
}
function scrub(ev: PointerEvent) {
  ;(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId)
  props.studio.seek(timeAt(ev.clientX))
}
function scrubMove(ev: PointerEvent) {
  if (ev.buttons === 1) props.studio.seek(timeAt(ev.clientX))
}
let drag: { id: string; start: number; origin: number; moved: boolean } | null = null
function grab(ev: PointerEvent, e: TimelineEvent) {
  ev.stopPropagation()
  ;(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId)
  drag = { id: e.id, start: ev.clientX, origin: e.time, moved: false }
  props.studio.selectEvent(e.id)
}
function dragMove(ev: PointerEvent) {
  if (!drag || ev.buttons !== 1) return
  const dt = ((ev.clientX - drag.start) / (lanes.value?.clientWidth ?? 1)) * scene.value.duration
  if (Math.abs(ev.clientX - drag.start) > 3) drag.moved = true
  if (drag.moved) {
    const t = Math.round((drag.origin + dt) * 100) / 100
    props.studio.moveEvent(drag.id, t)
    props.studio.seek(t)
  }
}
function release() {
  drag = null
}
function width(e: TimelineEvent) {
  if (e.type === 'dialogue') return pct(e.duration)
  if (e.type === 'action') return pct(ACTION_DURATION[e.action])
  return undefined
}
function label(e: TimelineEvent) {
  switch (e.type) {
    case 'dialogue':
      return e.text
    case 'action':
      return e.action
    case 'expression':
      return e.expression
    case 'gaze':
      return e.target.kind === 'object' ? e.target.id : e.target.kind
    case 'camera':
      return `${e.cut ? 'cut · ' : ''}${e.label ?? `fov ${e.pose.fov.toFixed(0)}`}`
    case 'position':
      return e.position.map((v) => v.toFixed(1)).join(', ')
  }
}
const characterColor = (e: TimelineEvent) => ('character' in e ? scene.value.characters.find((c) => c.id === e.character)?.color : undefined)
</script>
<template>
  <section class="timeline" aria-label="Timeline">
    <div class="timeline-head">
      <strong>Timeline</strong>
      <span class="dim">{{ scene.timeline.length }} keys</span>
      <div class="spacer" />
      <span class="dim">Add at playhead</span>
      <button class="ghost" @click="studio.cameraKey()"><Icon name="camera" /> Camera</button>
      <button class="ghost" @click="studio.addEventAtPlayhead('position')">Position</button>
      <button class="ghost" @click="studio.addEventAtPlayhead('gaze')">Gaze</button>
      <button class="ghost" @click="studio.addEventAtPlayhead('expression')">Expression</button>
      <button class="ghost" @click="studio.addEventAtPlayhead('dialogue')"><Icon name="chat" /> Line</button>
      <button class="ghost" @click="studio.addEventAtPlayhead('action')">Action</button>
      <span class="divider" />
      <label class="dim">Duration <input class="small" type="number" min="0.5" max="300" step="0.5" :value="scene.duration" @change="studio.setDuration(Number(($event.target as HTMLInputElement).value))" /> s</label>
    </div>
    <div class="timeline-body">
      <div class="track-names">
        <div class="ruler-name" />
        <div v-for="t in EVENT_TYPES" :key="t" class="track-name"><span class="swatch" :class="t" />{{ LABELS[t] }}</div>
      </div>
      <div ref="lanes" class="lanes" @pointerup="release" @pointercancel="release">
        <div class="ruler" @pointerdown="scrub" @pointermove="scrubMove">
          <span v-for="t in ticks" :key="t" :style="{ left: pct(t) }">{{ t }}s</span>
        </div>
        <div v-for="t in EVENT_TYPES" :key="t" class="lane" @pointerdown.self="scrub" @pointermove.self="scrubMove">
          <button
            v-for="e in scene.timeline.filter((e) => e.type === t)"
            :key="e.id"
            class="key"
            :class="[t, { block: !!width(e), selected: selectedEvent === e.id, cut: e.type === 'camera' && e.cut }]"
            :style="{ left: pct(e.time), width: width(e), '--c': characterColor(e) }"
            :title="`${LABELS[t]} · ${e.time.toFixed(2)}s · ${label(e)}`"
            :aria-label="`${LABELS[t]} key at ${e.time.toFixed(2)} seconds`"
            @pointerdown="grab($event, e)"
            @pointermove="dragMove"
            @pointerup="release"
            @contextmenu.prevent="studio.removeEvent(e.id)"
          >
            <span v-if="width(e)">{{ label(e) }}</span>
          </button>
        </div>
        <div class="playhead" :style="{ left: pct(time) }" />
      </div>
    </div>
  </section>
</template>
