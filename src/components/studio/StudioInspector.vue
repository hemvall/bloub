<script setup lang="ts">
import { computed } from 'vue'
import type { CameraPose, SceneData, Vec3 } from '@/studio/scene/model'
const props = defineProps<{ scene: SceneData; selected: string; camera: CameraPose }>()
const emit = defineEmits<{
  patch: [patch: Record<string, unknown>]
  camera: [pose: CameraPose]
  expressionKey: []
  gazeKey: []
}>()
const character = computed(() => props.scene.characters.find((c) => c.id === props.selected))
const prop = computed(() => props.scene.props.find((p) => p.id === props.selected))
const light = computed(() => props.scene.lights.find((l) => l.id === props.selected))
const object = computed(() => character.value ?? prop.value ?? light.value)
const name = computed(
  () =>
    character.value?.name ??
    (props.selected === 'camera'
      ? 'Scene camera'
      : props.selected === 'environment'
        ? 'Night bar'
        : props.selected)
)
function vector(field: string, value: Vec3, axis: number, event: Event) {
  const next = [...value] as Vec3,
    n = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(n)) return
  next[axis] = Math.max(-100, Math.min(100, n))
  if (props.selected === 'camera') emit('camera', { ...props.camera, [field]: next })
  else emit('patch', { [field]: next })
}
function numeric(field: string, event: Event) {
  const n = Number((event.target as HTMLInputElement).value)
  if (Number.isFinite(n)) emit('patch', { [field]: n })
}
</script>
<template>
  <aside class="studio-inspector">
    <div class="panel-heading">
      INSPECTOR
      <span>PROPERTIES</span>
    </div>
    <div class="object-title">
      <span class="object-icon">{{ character ? '♧' : selected === 'camera' ? '◉' : '◇' }}</span>
      <div>
        <strong>{{ name || 'Select an object' }}</strong>
        <small>
          {{
            character
              ? 'Articulated mascot'
              : selected === 'camera'
                ? 'Perspective camera'
                : selected === 'environment'
                  ? 'Procedural environment'
                  : 'Scene object'
          }}
        </small>
      </div>
    </div>
    <template v-if="object || selected === 'camera'">
      <h3>Transform</h3>
      <div class="inspector-field">
        <label>Position</label>
        <div class="vector-input">
          <label v-for="(axis, i) in ['X', 'Y', 'Z']" :key="axis">
            {{ axis }}
            <input
              type="number"
              :aria-label="`${name} position ${axis}`"
              :value="(selected === 'camera' ? camera.position : object!.position)[i]"
              step="0.05"
              @input="
                vector(
                  'position',
                  selected === 'camera' ? camera.position : object!.position,
                  i,
                  $event
                )
              "
            />
          </label>
        </div>
      </div>
      <template v-if="character || prop">
        <div class="inspector-field">
          <label>Rotation · radians</label>
          <div class="vector-input">
            <label v-for="(axis, i) in ['X', 'Y', 'Z']" :key="axis">
              {{ axis }}
              <input
                type="number"
                :aria-label="`${name} rotation ${axis}`"
                :value="(character ?? prop)!.rotation[i]"
                step="0.05"
                @input="vector('rotation', (character ?? prop)!.rotation, i, $event)"
              />
            </label>
          </div>
        </div>
        <label class="property-row">
          Scale
          <input
            type="number"
            :value="(character ?? prop)!.scale"
            min="0.1"
            max="5"
            step="0.1"
            @input="numeric('scale', $event)"
          />
        </label>
      </template>
    </template>
    <template v-if="character || prop">
      <h3>Appearance</h3>
      <label class="property-row">
        {{ character ? 'Coat' : 'Color' }}
        <input
          type="color"
          :value="(character ?? prop)!.color"
          @input="emit('patch', { color: ($event.target as HTMLInputElement).value })"
        />
      </label>
    </template>
    <template v-if="character">
      <h3>Expression</h3>
      <select
        :value="character.expression"
        aria-label="Character expression"
        @input="emit('patch', { expression: ($event.target as HTMLSelectElement).value })"
      >
        <option value="tired">Tired / unimpressed</option>
        <option value="curious">Curious</option>
        <option value="happy">Quietly happy</option>
      </select>
      <button class="full-button" @click="emit('expressionKey')">+ Expression at playhead</button>
      <h3>Gaze behavior</h3>
      <select
        aria-label="Gaze target"
        :value="character.gaze.kind === 'object' ? character.gaze.id : character.gaze.kind"
        @input="
          emit('patch', {
            gaze:
              ($event.target as HTMLSelectElement).value === 'camera'
                ? { kind: 'camera' }
                : ($event.target as HTMLSelectElement).value === 'point'
                  ? { kind: 'point', position: [0, 3, 3] }
                  : { kind: 'object', id: ($event.target as HTMLSelectElement).value }
          })
        "
      >
        <option value="camera">Follow camera</option>
        <option value="window">Window / city</option>
        <option value="counter">Counter</option>
        <option value="point">XYZ point</option>
        <option v-for="p in scene.props" :key="p.id" :value="p.id">{{ p.id }}</option>
      </select>
      <div v-if="character.gaze.kind === 'point'" class="vector-input">
        <label v-for="(axis, i) in ['X', 'Y', 'Z']" :key="axis">
          {{ axis }}
          <input
            type="number"
            :aria-label="`Gaze point ${axis}`"
            :value="character.gaze.position[i]"
            step="0.1"
            @input="
              emit('patch', {
                gaze: {
                  kind: 'point',
                  position: character.gaze.position.map((v, n) =>
                    n === i ? Number(($event.target as HTMLInputElement).value) : v
                  )
                }
              })
            "
          />
        </label>
      </div>
      <button class="full-button" @click="emit('gazeKey')">+ Gaze at playhead</button>
      <p class="inspector-note">
        Eyes lead. Head follows with inertia.
        <br />
        Breathing, blinks and ear motion follow scene time.
      </p>
    </template>
    <template v-if="selected === 'camera'">
      <h3>Lens</h3>
      <label class="property-row">
        Field of view
        <input
          type="number"
          :value="camera.fov"
          min="15"
          max="100"
          @input="
            emit('camera', {
              ...camera,
              fov: Math.max(
                15,
                Math.min(100, Number(($event.target as HTMLInputElement).value) || 40)
              )
            })
          "
        />
      </label>
      <div class="inspector-field">
        <label>Target</label>
        <div class="vector-input">
          <label v-for="(axis, i) in ['X', 'Y', 'Z']" :key="axis">
            {{ axis }}
            <input
              type="number"
              :aria-label="`Camera target ${axis}`"
              :value="camera.target[i]"
              step="0.1"
              @input="vector('target', camera.target, i, $event)"
            />
          </label>
        </div>
      </div>
      <p class="inspector-note">
        {{ (18 / Math.tan((camera.fov * Math.PI) / 360)).toFixed(0) }} mm equivalent focal length.
        <br />
        Add a camera key to record this view.
      </p>
    </template>
    <template v-if="light">
      <h3>Light</h3>
      <label class="property-row">
        Color
        <input
          type="color"
          :value="light.color"
          @input="emit('patch', { color: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="property-row">
        Intensity
        <input
          type="number"
          :value="light.intensity"
          min="0"
          max="100"
          @input="numeric('intensity', $event)"
        />
      </label>
    </template>
    <template v-if="selected === 'environment' || selected === 'counter'">
      <h3>Atmosphere</h3>
      <label class="property-row">
        Fog
        <input
          type="range"
          :value="scene.environment.fog"
          min="0"
          max="0.15"
          step="0.002"
          @input="numeric('fog', $event)"
        />
      </label>
      <label class="property-row">
        Rain
        <input
          type="range"
          :value="scene.environment.rain"
          min="0"
          max="1"
          step="0.05"
          @input="numeric('rain', $event)"
        />
      </label>
      <p class="inspector-note">
        Layered city, rain, dust and practical lights. All motion can be sampled at any timestamp.
      </p>
    </template>
  </aside>
</template>
