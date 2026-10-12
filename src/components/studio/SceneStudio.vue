<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from './Icon.vue'
import StudioViewport from './StudioViewport.vue'
import StudioTimeline from './StudioTimeline.vue'
import StudioInspector from './StudioInspector.vue'
import StudioOutliner from './StudioOutliner.vue'
import StudioDirector from './StudioDirector.vue'
import StudioScript from './StudioScript.vue'
import StudioLibrary from './StudioLibrary.vue'
import { useStudioDocument } from './useStudioDocument'
import { OUTPUT_SIZE } from '@/studio/scene/model'
import { cameraAt } from '@/studio/timeline/evaluate'
import { OUTPUT_FORMATS, OUTPUT_PRESETS } from '@/studio/render/presets'
const studio = useStudioDocument()
const { project, scene, view, time, playing, fps, ms, message, jsonOpen, json, exporting, panel, leftPanel } = studio
const exportOpen = ref(false)
const clock = computed(() => {
  const t = time.value,
    m = Math.floor(t / 60),
    s = t - m * 60
  return `${m}:${s.toFixed(2).padStart(5, '0')}`
})
const exportPercent = computed(() => (exporting.value.total ? Math.round((exporting.value.done / exporting.value.total) * 100) : 0))
</script>
<template>
  <section class="studio" @click="exportOpen = false">
    <StudioLibrary v-if="view === 'library'" :studio="studio" />
    <template v-else>
      <header class="topbar">
        <button class="ghost" title="Back to the library" @click="studio.toLibrary()"><Icon name="back" /> Library</button>
        <input
          class="scene-name"
          aria-label="Project title"
          :value="project.title"
          spellcheck="false"
          @change="studio.rename(($event.target as HTMLInputElement).value)"
        />
        <span class="status-pill" :class="project.status">{{ project.status }}</span>
        <div class="spacer" />
        <div class="transport">
          <button class="ghost" title="Go to start (Home)" @click="studio.seek(0)"><Icon name="start" /></button>
          <button class="play" :title="playing ? 'Pause (Space)' : 'Play (Space)'" :aria-pressed="playing" @click="studio.togglePlay()">
            <Icon :name="playing ? 'pause' : 'play'" :size="18" />
          </button>
          <button class="ghost" title="Go to end (End)" @click="studio.seek(scene.duration)"><Icon name="end" /></button>
          <output class="clock">{{ clock }}<span> / {{ scene.duration.toFixed(1) }}s</span></output>
        </div>
        <div class="spacer" />
        <select class="format" aria-label="Output format" :value="project.format" @change="studio.setFormat(($event.target as HTMLSelectElement).value as never)">
          <option v-for="f in OUTPUT_FORMATS" :key="f" :value="f">{{ OUTPUT_PRESETS[f].name }} · {{ OUTPUT_PRESETS[f].aspect }}</option>
        </select>
        <span class="hud" :title="`${ms.toFixed(2)} ms per frame`">
          <b>{{ fps ? fps.toFixed(0) : '–' }}</b> fps <i>{{ ms.toFixed(1) }} ms</i>
        </span>
        <button class="ghost icon-only" :title="studio.audio.muted.value ? 'Unmute' : 'Mute preview audio'" :aria-pressed="studio.audio.muted.value" @click="studio.audio.toggleMute()">
          <Icon :name="studio.audio.muted.value ? 'mute' : studio.audio.mixing.value ? 'mixing' : 'sound'" />
        </button>
        <button class="ghost" title="Rebuild the timeline from the script" @click="studio.compile()"><Icon name="refresh" /> Compile</button>
        <div class="menu" @click.stop>
          <button class="primary" :aria-expanded="exportOpen" @click="exportOpen = !exportOpen"><Icon name="video" /> Render</button>
          <div v-if="exportOpen" class="menu-list">
            <button v-for="f in OUTPUT_FORMATS" :key="f" @click="exportOpen = false; studio.renderReel(f)">
              <Icon name="reel" /> {{ OUTPUT_PRESETS[f].name }} <small>{{ OUTPUT_PRESETS[f].width }}×{{ OUTPUT_PRESETS[f].height }} · silent MP4</small>
            </button>
            <button @click="exportOpen = false; studio.exportPNG()"><Icon name="image" /> Frame · PNG <small>at playhead</small></button>
            <button @click="exportOpen = false; studio.exportJSON()"><Icon name="json" /> Project · JSON</button>
            <button @click="exportOpen = false; studio.exportSceneJSON()"><Icon name="json" /> Scene · JSON</button>
            <button @click="exportOpen = false; studio.showJSON()"><Icon name="copy" /> View project JSON</button>
          </div>
        </div>
      </header>
      <div class="workspace">
        <aside class="outliner">
          <div class="segmented tabs" role="tablist">
            <button role="tab" :aria-selected="leftPanel === 'script'" :class="{ active: leftPanel === 'script' }" @click="leftPanel = 'script'"><Icon name="script" /> Script</button>
            <button role="tab" :aria-selected="leftPanel === 'scene'" :class="{ active: leftPanel === 'scene' }" @click="leftPanel = 'scene'"><Icon name="scene" /> Scene</button>
          </div>
          <StudioScript v-show="leftPanel === 'script'" :studio="studio" />
          <StudioOutliner v-show="leftPanel === 'scene'" :studio="studio" />
        </aside>
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
                if (playing && !p) studio.audio.stop()
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
            <button role="tab" :aria-selected="panel === 'inspector'" :class="{ active: panel === 'inspector' }" @click="panel = 'inspector'">
              <Icon name="sliders" /> Inspector
            </button>
            <button role="tab" :aria-selected="panel === 'director'" :class="{ active: panel === 'director' }" @click="panel = 'director'">
              <Icon name="sparkle" /> Director
            </button>
          </div>
          <StudioInspector v-show="panel === 'inspector'" :studio="studio" />
          <StudioDirector v-show="panel === 'director'" :studio="studio" />
        </aside>
      </div>
      <StudioTimeline :studio="studio" />
    </template>
    <input :ref="studio.fileInput" type="file" accept=".json,application/json" hidden @change="studio.importFile" />
    <div v-if="jsonOpen" class="backdrop" @click.self="jsonOpen = false">
      <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="json-title">
        <header>
          <h2 id="json-title">Project JSON</h2>
          <button class="ghost" aria-label="Close" @click="jsonOpen = false"><Icon name="x" /></button>
        </header>
        <textarea v-model="json" aria-label="Project JSON" spellcheck="false" />
        <footer>
          <span class="dim">{{ message }}</span>
          <button class="ghost" @click="studio.exportJSON()">Download</button>
          <button class="primary" @click="studio.load(json)">Import as new project</button>
        </footer>
      </section>
    </div>
    <div v-if="exporting.running" class="backdrop">
      <section class="dialog export-dialog" role="dialog" aria-modal="true" aria-live="polite">
        <header><h2>Rendering</h2></header>
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
