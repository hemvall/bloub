<script setup lang="ts">
import StudioViewport from './StudioViewport.vue'
import StudioTimeline from './StudioTimeline.vue'
import StudioInspector from './StudioInspector.vue'
import StudioOutliner from './StudioOutliner.vue'
import { useStudioDocument } from './useStudioDocument'
import { CAMERA_PRESETS, type SceneData } from '@/studio/scene/model'
import { cameraAt } from '@/studio/timeline/evaluate'
const {
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
} = useStudioDocument()
</script>
<template>
  <section class="scene-studio-shell" :class="{ 'inspector-open': inspectorOpen }">
    <header class="studio-topbar">
      <a
        href="/#"
        class="studio-brand"
        title="Open original Bloub animation editor"
        @click.prevent="legacy"
      >
        b
        <span>l</span>
        oub
        <small>SCENE STUDIO</small>
      </a>
      <span class="top-divider" />
      <input
        class="scene-name"
        aria-label="Scene name"
        :value="scene.name"
        @change="
          edit((_, d) => {
            d.name = ($event.target as HTMLInputElement).value
          })
        "
      />
      <span class="document-version">v1</span>
      <div class="toolbar-spacer" />
      <button @click="reset">Reset scene</button>
      <button @click="fileInput?.click()">Import</button>
      <button @click="showJSON">Scene JSON</button>
      <button class="accent-button" @click="download">↓ Export JSON</button>
      <input
        ref="fileInput"
        type="file"
        accept=".json,application/json"
        hidden
        @change="importFile"
      />
    </header>
    <div class="studio-workspace">
      <StudioOutliner
        :scene="scene"
        :selected="selected"
        @select="selected = $event"
        @add-character="addCharacter"
        @add-prop="addProp"
      />
      <main class="studio-center">
        <button
          class="inspector-toggle"
          :aria-expanded="inspectorOpen"
          @click="inspectorOpen = !inspectorOpen"
        >
          {{ inspectorOpen ? 'Close inspector' : 'Inspector' }}
        </button>
        <div class="viewport-toolbar">
          <span>Perspective</span>
          <span class="top-divider" />
          <button
            v-for="m in ['translate', 'rotate', 'scale'] as const"
            :key="m"
            :class="{ active: mode === m }"
            @click="mode = m"
          >
            {{ { translate: 'Move', rotate: 'Rotate', scale: 'Scale' }[m] }}
          </button>
          <div class="toolbar-spacer" />
          <select aria-label="Camera preset" value="" @change="choosePreset">
            <option value="" disabled>Camera presets</option>
            <option v-for="(_, preset) in CAMERA_PRESETS" :key="preset">
              {{ preset }}
            </option>
          </select>
          <select
            aria-label="Output aspect ratio"
            :value="scene.aspect"
            @change="
              edit((_, d) => {
                d.aspect = ($event.target as HTMLSelectElement).value as SceneData['aspect']
              })
            "
          >
            <option>16:9</option>
            <option>9:16</option>
            <option>1:1</option>
          </select>
        </div>
        <StudioViewport
          :ref="bindViewport"
          :scene="scene"
          :selected="selected"
          :mode="mode"
          @select="selected = $event"
          @camera="camera = $event"
          @transform="transform"
          @error="message = $event"
          @frame="
            (t, f, m, p) => {
              time = t
              fps = f
              ms = m
              playing = p
              if (p) camera = cameraAt(scene, t)
            }
          "
        />
        <div class="viewport-status">
          <span>{{ message || 'Scene ready · Space to play · Arrow keys to step one frame' }}</span>
          <span class="performance-hud">
            {{ fps ? `${fps.toFixed(0)} FPS` : 'Measuring…' }}
            <small>{{ ms.toFixed(1) }} ms/frame</small>
          </span>
        </div>
      </main>
      <StudioInspector
        :scene="inspectorScene"
        :selected="selected"
        :camera="camera"
        @patch="patch"
        @camera="setCamera"
        @expression-key="expressionKey"
        @gaze-key="gazeKey"
      />
    </div>
    <StudioTimeline
      :scene="scene"
      :time="time"
      :playing="playing"
      @seek="seek"
      @play="togglePlay"
      @duration="duration"
      @camera-key="cameraKey"
      @position-key="positionKey"
      @gaze-key="gazeKey"
      @remove="remove"
    />
    <div v-if="jsonOpen" class="json-backdrop" @click.self="jsonOpen = false">
      <section class="json-dialog" role="dialog" aria-modal="true" aria-labelledby="json-title">
        <header>
          <h2 id="json-title">Scene document</h2>
          <button @click="jsonOpen = false" aria-label="Close scene JSON">×</button>
        </header>
        <p>Versioned scene data. Edit and import to recreate a scene.</p>
        <textarea v-model="json" aria-label="Scene JSON" spellcheck="false" />
        <p role="status">{{ message }}</p>
        <footer>
          <button @click="download">Download current scene</button>
          <button class="accent-button" @click="load(json)">Import this JSON</button>
        </footer>
      </section>
    </div>
  </section>
</template>
