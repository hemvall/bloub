<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from './Icon.vue'
import StudioViewport from './StudioViewport.vue'
import StudioTimeline from './StudioTimeline.vue'
import StudioInspector from './StudioInspector.vue'
import StudioOutliner from './StudioOutliner.vue'
import StudioDirector from './StudioDirector.vue'
import { useStudioDocument } from './useStudioDocument'
import { ASPECTS, OUTPUT_SIZE } from '@/studio/scene/model'
import { cameraAt } from '@/studio/timeline/evaluate'
const studio = useStudioDocument()
const { scene, time, playing, fps, ms, message, jsonOpen, json, fileInput, exporting, panel } = studio
const exportOpen = ref(false)
const clock = computed(() => {
  const t = time.value,
    m = Math.floor(t / 60),
    s = t - m * 60
  return `${m}:${s.toFixed(2).padStart(5, '0')}`
})
const exportPercent = computed(() => (exporting.value.total ? Math.round((exporting.value.done / exporting.value.total) * 100) : 0))
function legacy() {
  window.location.href = '/#'
  window.location.reload()
}
</script>
<template>
  <section class="studio" @click="exportOpen = false">
    <header class="topbar">
      <a href="/#" class="brand" title="Open the original Bloub avatar editor" @click.prevent="legacy">
        bl<span>o</span>ub
        <small>studio</small>
      </a>
      <input
        class="scene-name"
        aria-label="Scene name"
        :value="scene.name"
        spellcheck="false"
        @change="studio.rename(($event.target as HTMLInputElement).value)"
      />
      <div class="spacer" />
      <div class="transport">
        <button class="ghost" title="Go to start (Home)" @click="studio.seek(0)"><Icon name="start" /></button>
        <button class="play" :title="playing ? 'Pause (Space)' : 'Play (Space)'" :aria-pressed="playing" @click="studio.togglePlay()">
          <Icon :name="playing ? 'pause' : 'play'" :size="16" />
        </button>
        <button class="ghost" title="Go to end (End)" @click="studio.seek(scene.duration)"><Icon name="end" /></button>
        <output class="clock">{{ clock }}<span> / {{ scene.duration.toFixed(1) }}s</span></output>
      </div>
      <div class="spacer" />
      <div class="segmented" role="radiogroup" aria-label="Output format">
        <button
          v-for="a in ASPECTS"
          :key="a"
          role="radio"
          :aria-checked="scene.aspect === a"
          :class="{ active: scene.aspect === a }"
          :title="`${OUTPUT_SIZE[a][0]}×${OUTPUT_SIZE[a][1]}`"
          @click="studio.setAspect(a)"
        >
          {{ a }}
        </button>
      </div>
      <span class="hud" :title="`${ms.toFixed(2)} ms per frame`">
        <b>{{ fps ? fps.toFixed(0) : '–' }}</b> fps <i>{{ ms.toFixed(1) }} ms</i>
      </span>
      <button class="ghost" title="Import scene JSON" @click="fileInput?.click()"><Icon name="import" /> Import</button>
      <div class="menu" @click.stop>
        <button class="primary" :aria-expanded="exportOpen" @click="exportOpen = !exportOpen"><Icon name="export" /> Export</button>
        <div v-if="exportOpen" class="menu-list" role="menu">
          <button @click="exportOpen = false; studio.exportMP4()"><Icon name="video" /> Video · MP4 <small>{{ OUTPUT_SIZE[scene.aspect].join('×') }}</small></button>
          <button @click="exportOpen = false; studio.exportPNG()"><Icon name="image" /> Frame · PNG <small>at playhead</small></button>
          <button @click="exportOpen = false; studio.exportJSON()"><Icon name="json" /> Scene · JSON</button>
          <button @click="exportOpen = false; studio.showJSON()"><Icon name="copy" /> View scene JSON</button>
        </div>
      </div>
      <input ref="fileInput" type="file" accept=".json,application/json" hidden @change="studio.importFile" />
    </header>
    <div class="workspace">
      <StudioOutliner :studio="studio" />
      <main class="center">
        <StudioViewport
          :ref="studio.bindViewport"
          :scene="scene"
          :selected="studio.selected.value"
          :mode="studio.mode.value"
          :studio="studio"
          @select="studio.select"
          @camera="studio.camera.value = $event"
          @transform="studio.transform"
          @error="message = $event"
          @frame="
            (t, f, m, p) => {
              time = t
              fps = f
              ms = m
              playing = p
              if (p) studio.camera.value = cameraAt(scene, t)
            }
          "
        />
        <div class="status">
          <span>{{ message || 'Space play · ←/→ step · K camera key · G/R/S gizmo · drag keys on the timeline' }}</span>
          <span class="dim">{{ OUTPUT_SIZE[scene.aspect].join('×') }} · {{ scene.fps }} fps · {{ scene.environment.id }}</span>
        </div>
      </main>
      <aside class="side">
        <div class="segmented tabs" role="tablist">
          <button role="tab" :aria-selected="panel === 'director'" :class="{ active: panel === 'director' }" @click="panel = 'director'">
            <Icon name="sparkle" /> Director
          </button>
          <button role="tab" :aria-selected="panel === 'inspector'" :class="{ active: panel === 'inspector' }" @click="panel = 'inspector'">
            <Icon name="sliders" /> Inspector
          </button>
        </div>
        <StudioDirector v-show="panel === 'director'" :studio="studio" />
        <StudioInspector v-show="panel === 'inspector'" :studio="studio" />
      </aside>
    </div>
    <StudioTimeline :studio="studio" />
    <div v-if="jsonOpen" class="backdrop" @click.self="jsonOpen = false">
      <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="json-title">
        <header>
          <h2 id="json-title">Scene JSON</h2>
          <button class="ghost" aria-label="Close" @click="jsonOpen = false"><Icon name="x" /></button>
        </header>
        <textarea v-model="json" aria-label="Scene JSON" spellcheck="false" />
        <footer>
          <span class="dim">{{ message }}</span>
          <button class="ghost" @click="studio.exportJSON()">Download</button>
          <button class="primary" @click="studio.load(json)">Apply</button>
        </footer>
      </section>
    </div>
    <div v-if="exporting.running" class="backdrop">
      <section class="dialog export-dialog" role="dialog" aria-modal="true" aria-live="polite">
        <header><h2>Rendering video</h2></header>
        <p class="dim">{{ exporting.label }} · frame {{ exporting.done }} of {{ exporting.total }}</p>
        <div class="progress"><div :style="{ width: `${exportPercent}%` }" /></div>
        <footer>
          <span class="dim">{{ exportPercent }}%</span>
          <button class="ghost" @click="studio.cancelExport()">Cancel</button>
        </footer>
      </section>
    </div>
  </section>
</template>
