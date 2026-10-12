<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import Icon from './Icon.vue'
import type { StudioDocument } from './useStudioDocument'
import { CHARACTERS, CHARACTER_KINDS } from '@/studio/characters/catalog'
import { ENVIRONMENTS, ENVIRONMENT_IDS } from '@/studio/environments/catalog'
import { PROP_KINDS, type EnvironmentId } from '@/studio/scene/model'
const props = defineProps<{ studio: StudioDocument }>()
const { scene, selected } = props.studio
const menu = ref<'' | 'character' | 'prop'>('')
function toggle(name: typeof menu.value) {
  menu.value = menu.value === name ? '' : name
}
function outside(ev: PointerEvent) {
  if (!(ev.target as HTMLElement).closest('.menu')) menu.value = ''
}
onMounted(() => window.addEventListener('pointerdown', outside))
onBeforeUnmount(() => window.removeEventListener('pointerdown', outside))
</script>
<template>
  <div class="scene-tree">
    <p class="note">The scene is what the script compiled to. Adjust it here; a compile rebuilds it.</p>
    <h3>Environment</h3>
    <select class="field" aria-label="Environment" :value="scene.environment.id" @change="studio.setEnvironment(($event.target as HTMLSelectElement).value as EnvironmentId)">
      <option v-for="id in ENVIRONMENT_IDS" :key="id" :value="id">{{ ENVIRONMENTS[id].name }}</option>
    </select>
    <button class="row" :class="{ active: selected === 'environment' }" @click="studio.select('environment')">
      <Icon name="scene" /> <span class="label">Atmosphere</span>
    </button>
    <button class="row" :class="{ active: selected === 'camera' }" @click="studio.select('camera')">
      <Icon name="camera" /> <span class="label">Camera</span>
    </button>
    <h3>
      Characters
      <span class="menu">
        <button class="ghost icon-only" title="Add a character to the scene only" :aria-expanded="menu === 'character'" @click="toggle('character')"><Icon name="plus" /></button>
        <div v-if="menu === 'character'" class="menu-list">
          <button v-for="k in CHARACTER_KINDS" :key="k" @click="menu = ''; studio.addCharacter(k)">
            <span class="dot" :style="{ background: CHARACTERS[k].color }" /> {{ CHARACTERS[k].name }} <small>{{ k }}</small>
          </button>
        </div>
      </span>
    </h3>
    <button v-for="c in scene.characters" :key="c.id" class="row" :class="{ active: selected === c.id }" @click="studio.select(c.id)">
      <span class="dot" :style="{ background: c.color }" /> <span class="label">{{ c.name }}</span> <small>{{ c.kind }}</small>
    </button>
    <p v-if="!scene.characters.length" class="empty">No one on set. Add a cast member in the script panel.</p>
    <h3>
      Props
      <span class="menu">
        <button class="ghost icon-only" title="Add a prop" :aria-expanded="menu === 'prop'" @click="toggle('prop')"><Icon name="plus" /></button>
        <div v-if="menu === 'prop'" class="menu-list">
          <button v-for="k in PROP_KINDS" :key="k" @click="menu = ''; studio.addProp(k)"><Icon name="cube" /> {{ k }}</button>
        </div>
      </span>
    </h3>
    <button v-for="p in scene.props" :key="p.id" class="row" :class="{ active: selected === p.id }" @click="studio.select(p.id)">
      <span class="dot" :style="{ background: p.color }" /> <span class="label">{{ p.id }}</span> <small>{{ p.screen ? `${p.kind} · ${p.screen.startsWith('data:') ? 'image' : p.screen}` : p.kind }}</small>
    </button>
    <h3>
      Lights
      <button class="ghost icon-only" title="Add a point light" @click="studio.addLight()"><Icon name="plus" /></button>
    </h3>
    <button v-for="l in scene.lights" :key="l.id" class="row" :class="{ active: selected === l.id }" @click="studio.select(l.id)">
      <Icon name="light" :style="{ color: l.color }" /> <span class="label">{{ l.id }}</span> <small>{{ l.intensity }}</small>
    </button>
  </div>
</template>
