<script setup lang="ts">
import { computed } from 'vue'
import { TresCanvas } from '@tresjs/core'
import * as THREE from 'three'
import SceneCharacter from './SceneCharacter.vue'
import type { StudioScene } from '@/studio/types'

const props = defineProps<{ scene: StudioScene }>()
const cameraPosition = computed(() => [props.scene.camera.x, props.scene.camera.y, props.scene.camera.z] as [number,number,number])
const characterPosition = computed(() => [props.scene.characterPosition.x, props.scene.characterPosition.y, props.scene.characterPosition.z] as [number,number,number])
</script>

<template>
  <div class="studio-viewport">
    <TresCanvas clear-color="#120f18" shadows window-size>
      <TresPerspectiveCamera :position="cameraPosition" :fov="42" />
      <TresAmbientLight :intensity="1.15" />
      <TresDirectionalLight :position="[-3,5,4]" :intensity="2.4" cast-shadow />
      <TresPointLight :position="[-3.5,2.8,1]" :intensity="18" color="#ffc777" :distance="8" />
      <TresPointLight :position="[3.5,2.8,1]" :intensity="18" color="#ffd398" :distance="8" />

      <TresMesh :position="[0, 0, -2.35]">
        <TresPlaneGeometry :args="[11,7]" />
        <TresMeshStandardMaterial color="#211725" roughness="1" />
      </TresMesh>
      <TresMesh :position="[0,-1.65,0]" receive-shadow>
        <TresBoxGeometry :args="[9,0.35,3.2]" />
        <TresMeshStandardMaterial color="#2a151a" roughness="0.72" />
      </TresMesh>

      <TresGroup :position="[0,0,-2.0]">
        <TresMesh :position="[0,1.7,0.03]">
          <TresCircleGeometry :args="[1.25, 48]" />
          <TresMeshStandardMaterial color="#141725" roughness="0.45" />
        </TresMesh>
        <TresMesh :position="[0,1.7,0.06]">
          <TresRingGeometry :args="[1.18,1.24,48]" />
          <TresMeshBasicMaterial color="#3c2b43" />
        </TresMesh>
      </TresGroup>

      <SceneCharacter :character="scene.character" :position="characterPosition" :look-at-camera="scene.lookAtCamera" />

      <TresFog color="#120f18" :near="6" :far="12" />
    </TresCanvas>
    <div class="viewport-hud">
      <span>LIVE</span>
      <strong>60 FPS target</strong>
      <small>Three.js · browser render</small>
    </div>
  </div>
</template>
