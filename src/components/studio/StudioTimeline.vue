<script setup lang="ts">
import { computed } from 'vue'
import type { SceneData, TimelineEvent } from '@/studio/scene/model'
const props = defineProps<{ scene: SceneData; time: number; playing: boolean }>()
const emit = defineEmits<{
  seek: [time: number]
  play: []
  duration: [value: number]
  remove: [event: TimelineEvent]
  cameraKey: []
  positionKey: []
  gazeKey: []
}>()
const tracks = ['camera', 'position', 'gaze', 'expression'] as const
const ticks = computed(() => Array.from({ length: 7 }, (_, i) => (i * props.scene.duration) / 6))
function seek(event: PointerEvent) {
  const element = event.currentTarget as HTMLElement
  element.setPointerCapture(event.pointerId)
  emit(
    'seek',
    Math.max(
      0,
      Math.min(
        props.scene.duration,
        ((event.clientX - element.getBoundingClientRect().left) / element.clientWidth) *
          props.scene.duration
      )
    )
  )
}
</script>
<template>
  <section class="studio-timeline" aria-label="Scene timeline">
    <div class="timeline-toolbar">
      <strong>Timeline</strong>
      <button @click="emit('seek', 0)" title="Go to start">⏮</button>
      <button @click="emit('play')">{{ playing ? 'Ⅱ Pause' : '▶ Play' }}</button>
      <output>
        {{ time.toFixed(2) }}
        <span>/ {{ scene.duration.toFixed(1) }} s</span>
      </output>
      <div class="toolbar-spacer" />
      <button @click="emit('cameraKey')">+ Camera key</button>
      <button @click="emit('positionKey')">+ Position key</button>
      <button @click="emit('gazeKey')">+ Gaze event</button>
      <label>
        Duration
        <input
          aria-label="Scene duration"
          type="number"
          :value="scene.duration"
          min="0.1"
          max="300"
          step="0.5"
          @change="emit('duration', Number(($event.target as HTMLInputElement).value))"
        />
        s
      </label>
    </div>
    <div class="timeline-grid">
      <div class="track-label ruler-label">SCENE TRACKS</div>
      <div class="ruler" @pointerdown="seek" @pointermove="$event.buttons === 1 && seek($event)">
        <span
          v-for="tick in ticks"
          :key="tick"
          :style="{ left: `${(tick / scene.duration) * 100}%` }"
        >
          {{ tick.toFixed(1) }}s
        </span>
        <div class="playhead" :style="{ left: `${(time / scene.duration) * 100}%` }" />
      </div>
      <template v-for="track in tracks" :key="track">
        <div class="track-label">
          <span :class="`track-dot ${track}`" />
          {{
            {
              camera: 'Camera',
              position: 'Character · position',
              gaze: 'Gaze',
              expression: 'Expression'
            }[track]
          }}
        </div>
        <div
          class="track-lane"
          @pointerdown.self="seek"
          @pointermove="$event.buttons === 1 && seek($event)"
        >
          <div class="lane-line" />
          <div class="lane-playhead" :style="{ left: `${(time / scene.duration) * 100}%` }" />
          <button
            v-for="(event, index) in scene.timeline.filter((e) => e.type === track)"
            :key="index"
            class="keyframe"
            :class="track"
            :style="{ left: `${(event.time / scene.duration) * 100}%` }"
            :title="`${track} at ${event.time.toFixed(2)}s · click to seek, right click to delete`"
            :aria-label="`${track} keyframe at ${event.time}s`"
            @click.stop="emit('seek', event.time)"
            @contextmenu.prevent="emit('remove', event)"
          >
            ◆
          </button>
        </div>
      </template>
    </div>
    <input
      class="timeline-scrubber"
      aria-label="Timeline playhead"
      type="range"
      :value="time"
      min="0"
      :max="scene.duration"
      step="0.01"
      @input="emit('seek', Number(($event.target as HTMLInputElement).value))"
    />
  </section>
</template>
