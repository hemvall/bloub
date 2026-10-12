<script setup lang="ts">
import type { SceneData } from '@/studio/scene/model'
defineProps<{ scene: SceneData; selected: string }>()
const emit = defineEmits<{ select: [id: string]; addCharacter: []; addProp: [] }>()
</script>
<template>
  <aside class="studio-outliner">
    <div class="panel-heading">
      PROJECT
      <span>SCENE 01</span>
    </div>
    <h3>Scenes</h3>
    <button class="scene-entry active" @click="emit('select', 'environment')">
      <span>▣</span>
      Last light
      <small>NIGHT BAR</small>
    </button>
    <h3>
      Characters
      <button title="Add another Kit" @click="emit('addCharacter')">+</button>
    </h3>
    <button
      v-for="character in scene.characters"
      :key="character.id"
      class="tree-item"
      :class="{ selected: selected === character.id }"
      @click="emit('select', character.id)"
    >
      <span class="cat-icon">♧</span>
      {{ character.name }}
      <small>MASCOT</small>
    </button>
    <h3>Environment</h3>
    <button
      class="tree-item"
      :class="{ selected: selected === 'environment' }"
      @click="emit('select', 'environment')"
    >
      <span>◇</span>
      Night bar
    </button>
    <button class="tree-item sub-item" @click="emit('select', 'environment')">
      ↳ Arched window / rain
    </button>
    <h3>
      Props
      <button title="Add bottle" @click="emit('addProp')">+</button>
    </h3>
    <button
      class="tree-item"
      :class="{ selected: selected === 'counter' }"
      @click="emit('select', 'counter')"
    >
      <span>▱</span>
      Wooden counter
    </button>
    <button
      v-for="prop in scene.props"
      :key="prop.id"
      class="tree-item"
      :class="{ selected: selected === prop.id }"
      @click="emit('select', prop.id)"
    >
      <span>♙</span>
      {{ prop.id }}
    </button>
    <h3>Lights</h3>
    <button
      v-for="light in scene.lights"
      :key="light.id"
      class="tree-item"
      :class="{ selected: selected === light.id }"
      @click="emit('select', light.id)"
    >
      <span :style="{ color: light.color }">☼</span>
      {{ light.id }}
    </button>
    <h3>Camera</h3>
    <button
      class="tree-item"
      :class="{ selected: selected === 'camera' }"
      @click="emit('select', 'camera')"
    >
      <span>◉</span>
      Scene camera
    </button>
    <div class="outliner-footer">
      <span class="live-dot" />
      LOCAL PROJECT
      <p>Scene data is autosaved in this browser.</p>
    </div>
  </aside>
</template>
