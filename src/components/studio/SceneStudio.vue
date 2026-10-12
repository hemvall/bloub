<script setup lang="ts">
import { reactive } from 'vue'
import StudioViewport from './StudioViewport.vue'
import { CHARACTERS } from '@/studio/characters'
import { DEFAULT_SCENE, PRESETS } from '@/studio/scenes'
import type { StudioScene } from '@/studio/types'

const scene = reactive<StudioScene>(structuredClone(DEFAULT_SCENE))

function loadPreset(preset: StudioScene) {
  Object.assign(scene, structuredClone(preset))
}

function resetCamera() {
  Object.assign(scene.camera, structuredClone(DEFAULT_SCENE.camera))
}
</script>

<template>
  <section class="scene-studio-shell">
    <header class="studio-topbar">
      <div>
        <p class="eyebrow">BLOUB / SCENE STUDIO</p>
        <h1>Build character scenes directly in the browser</h1>
      </div>
      <div class="studio-actions">
        <button @click="resetCamera">Reset camera</button>
        <button class="primary" @click="navigator.clipboard?.writeText(JSON.stringify(scene, null, 2))">Copy scene JSON</button>
      </div>
    </header>

    <div class="studio-grid">
      <aside class="studio-panel left">
        <h2>Characters</h2>
        <button
          v-for="character in CHARACTERS"
          :key="character.id"
          class="character-card"
          :class="{ active: scene.character === character.id }"
          @click="scene.character = character.id"
        >
          <span class="character-swatch" :style="{ background: character.color }" />
          <span><strong>{{ character.name }}</strong><small>{{ character.silhouette }}</small></span>
        </button>

        <h2>Scenes</h2>
        <button v-for="preset in PRESETS" :key="preset.name" class="preset" @click="loadPreset(preset)">
          {{ preset.name }}
        </button>
      </aside>

      <main>
        <StudioViewport :scene="scene" />
      </main>

      <aside class="studio-panel right">
        <h2>Camera</h2>
        <label>X <input v-model.number="scene.camera.x" type="range" min="-4" max="4" step="0.05"></label>
        <label>Y <input v-model.number="scene.camera.y" type="range" min="0.5" max="5" step="0.05"></label>
        <label>Z <input v-model.number="scene.camera.z" type="range" min="3" max="10" step="0.05"></label>

        <h2>Character position</h2>
        <label>X <input v-model.number="scene.characterPosition.x" type="range" min="-3" max="3" step="0.05"></label>
        <label>Y <input v-model.number="scene.characterPosition.y" type="range" min="0" max="3" step="0.05"></label>
        <label>Z <input v-model.number="scene.characterPosition.z" type="range" min="-2" max="2" step="0.05"></label>

        <label class="toggle"><input v-model="scene.lookAtCamera" type="checkbox"> Look at camera</label>

        <h2>Scene data</h2>
        <pre>{{ JSON.stringify(scene, null, 2) }}</pre>
      </aside>
    </div>
  </section>
</template>
