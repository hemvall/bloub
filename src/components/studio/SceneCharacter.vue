<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { CHARACTER_BY_ID } from '@/studio/characters'
import type { CharacterId } from '@/studio/types'

const props = defineProps<{
  character: CharacterId
  position: [number, number, number]
  lookAtCamera?: boolean
}>()

const root = ref<THREE.Group | null>(null)
const head = ref<THREE.Group | null>(null)
const leftEye = ref<THREE.Mesh | null>(null)
const rightEye = ref<THREE.Mesh | null>(null)
const character = computed(() => CHARACTER_BY_ID.get(props.character)!)

let raf = 0
let startedAt = 0

function animate(now: number) {
  if (!startedAt) startedAt = now
  const elapsed = (now - startedAt) / 1000

  if (root.value && head.value) {
    root.value.position.y = props.position[1] + Math.sin(elapsed * 1.4) * 0.025
    head.value.rotation.z = Math.sin(elapsed * 0.7) * 0.018
    const blink = Math.sin(elapsed * 0.92 + 1.9) > 0.985 ? 0.12 : 1
    if (leftEye.value) leftEye.value.scale.y = blink
    if (rightEye.value) rightEye.value.scale.y = blink
  }

  raf = requestAnimationFrame(animate)
}

onMounted(() => { raf = requestAnimationFrame(animate) })
onBeforeUnmount(() => { cancelAnimationFrame(raf) })
</script>

<template>
  <TresGroup ref="root" :position="position">
    <TresGroup ref="head">
      <template v-if="character.silhouette === 'cat'">
        <TresMesh :position="[-0.46, 0.58, 0]" :rotation="[0,0,0.2]">
          <TresConeGeometry :args="[0.34, 0.72, 3]" />
          <TresMeshStandardMaterial :color="character.color" roughness="0.92" />
        </TresMesh>
        <TresMesh :position="[0.46, 0.58, 0]" :rotation="[0,0,-0.2]">
          <TresConeGeometry :args="[0.34, 0.72, 3]" />
          <TresMeshStandardMaterial :color="character.color" roughness="0.92" />
        </TresMesh>
        <TresMesh>
          <TresSphereGeometry :args="[0.82, 32, 24]" />
          <TresMeshStandardMaterial :color="character.color" roughness="0.95" />
        </TresMesh>
      </template>
      <template v-else-if="character.silhouette === 'orb'">
        <TresMesh>
          <TresSphereGeometry :args="[0.78, 32, 24]" />
          <TresMeshStandardMaterial :color="character.color" roughness="0.68" metalness="0.04" />
        </TresMesh>
      </template>
      <template v-else>
        <TresMesh>
          <TresDodecahedronGeometry :args="[0.82, 1]" />
          <TresMeshStandardMaterial :color="character.color" roughness="0.82" />
        </TresMesh>
      </template>

      <TresMesh ref="leftEye" :position="[-0.27, 0.08, 0.72]" :rotation="[0,0,0.08]">
        <TresSphereGeometry :args="[0.12, 16, 12]" />
        <TresMeshBasicMaterial :color="character.accent" />
      </TresMesh>
      <TresMesh ref="rightEye" :position="[0.27, 0.08, 0.72]" :rotation="[0,0,-0.08]">
        <TresSphereGeometry :args="[0.12, 16, 12]" />
        <TresMeshBasicMaterial :color="character.accent" />
      </TresMesh>
      <TresMesh :position="[0, -0.20, 0.77]" :rotation="[Math.PI / 2, 0, 0]">
        <TresTorusGeometry :args="[0.12, 0.018, 8, 20, Math.PI]" />
        <TresMeshBasicMaterial :color="character.accent" />
      </TresMesh>
    </TresGroup>

    <TresMesh :position="[0,-1.0,0]">
      <TresCapsuleGeometry :args="[0.62, 0.78, 8, 20]" />
      <TresMeshStandardMaterial :color="character.color" roughness="1" />
    </TresMesh>
  </TresGroup>
</template>
