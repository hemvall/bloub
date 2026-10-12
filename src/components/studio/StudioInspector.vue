<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import type { StudioDocument } from './useStudioDocument'
import { ACTIONS, EXPRESSIONS, type GazeTarget, type Vec3 } from '@/studio/scene/model'
import { ENVIRONMENTS } from '@/studio/environments/catalog'
import { ACTION_DURATION, ACTION_LABELS } from '@/studio/animation/actions'
import { activeAction } from '@/studio/scene/commands'
import { SCREEN_PROPS } from '@/studio/props/createProp'
import { SCREEN_IDS, SCREEN_LABELS } from '@/studio/props/screens'
import { CHARACTERS } from '@/studio/characters/catalog'
const props = defineProps<{ studio: StudioDocument }>()
const { scene, liveScene, selected, event, camera, time, message } = props.studio
const character = computed(() => liveScene.value.characters.find((c) => c.id === selected.value))
const prop = computed(() => scene.value.props.find((p) => p.id === selected.value))
const light = computed(() => scene.value.lights.find((l) => l.id === selected.value))
const env = computed(() => ENVIRONMENTS[scene.value.environment.id])
const gazeOptions = computed(() => [
  { value: 'camera', label: 'Camera' },
  ...Object.keys(env.value.anchors).map((a) => ({ value: a, label: `${a} · ${env.value.name}` })),
  ...scene.value.characters.filter((c) => c.id !== selected.value).map((c) => ({ value: c.id, label: c.name })),
  ...scene.value.props.map((p) => ({ value: p.id, label: `${p.id} · prop` })),
  { value: 'point', label: 'XYZ point' }
])
const gazeValue = computed(() => (character.value?.gaze.kind === 'object' ? character.value.gaze.id : character.value?.gaze.kind))
const action = computed(() => (character.value ? activeAction(scene.value, character.value.id, time.value) : undefined))
const focal = computed(() => (18 / Math.tan((camera.value.fov * Math.PI) / 360)).toFixed(0))
const eventCharacter = computed(() => {
  const e = event.value
  return e && 'character' in e ? scene.value.characters.find((c) => c.id === e.character) : undefined
})
const screenValue = computed(() => (prop.value?.screen?.startsWith('data:') ? 'image' : (prop.value?.screen ?? 'blank')))
function num(ev: Event, fallback = 0) {
  const n = Number((ev.target as HTMLInputElement).value)
  return Number.isFinite(n) ? n : fallback
}
function axis(value: Vec3, i: number, ev: Event): Vec3 {
  const next = [...value] as Vec3
  next[i] = Math.max(-200, Math.min(200, num(ev)))
  return next
}
function gaze(ev: Event) {
  const v = (ev.target as HTMLSelectElement).value
  const target: GazeTarget = v === 'camera' ? { kind: 'camera' } : v === 'point' ? { kind: 'point', position: [0, 2, 4] } : { kind: 'object', id: v }
  props.studio.patch({ gaze: target })
}
function screen(ev: Event) {
  const v = (ev.target as HTMLSelectElement).value
  if (v !== 'image') props.studio.patch({ screen: v })
}
async function screenFile(ev: Event) {
  const input = ev.target as HTMLInputElement,
    file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > 400_000) {
    message.value = 'Screen image must stay under 400 kB (it is stored in the project)'
    return
  }
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
  props.studio.patch({ screen: url })
}
function deg(r: number) {
  return Math.round((r * 180) / Math.PI)
}
function rad(d: number) {
  return (d * Math.PI) / 180
}
</script>
<template>
  <div class="inspector">
    <template v-if="event">
      <div class="object-head">
        <Icon name="key" :size="18" />
        <div>
          <strong>{{ event.type }} key</strong>
          <small>{{ eventCharacter?.name ?? 'Camera' }} · {{ event.time.toFixed(2) }}s</small>
        </div>
        <button class="ghost icon-only" title="Delete key (Del)" @click="studio.removeEvent(event.id)"><Icon name="trash" /></button>
      </div>
      <label class="field-row">Time <input type="number" step="0.05" min="0" :max="scene.duration" :value="event.time" @change="studio.moveEvent(event.id, num($event))" /></label>
      <template v-if="event.type === 'dialogue'">
        <label class="field-col">
          Line
          <textarea rows="3" :value="event.text" @change="studio.updateEvent(event.id, { text: ($event.target as HTMLTextAreaElement).value })" />
        </label>
        <label class="field-row">Duration <input type="number" step="0.1" min="0.2" :value="event.duration" @change="studio.updateEvent(event.id, { duration: Math.max(0.2, num($event, 1)) })" /></label>
      </template>
      <label v-else-if="event.type === 'action'" class="field-col">
        Action
        <select :value="event.action" @change="studio.updateEvent(event.id, { action: ($event.target as HTMLSelectElement).value as never })">
          <option v-for="a in ACTIONS" :key="a" :value="a">{{ ACTION_LABELS[a] }} · {{ ACTION_DURATION[a] }}s</option>
        </select>
      </label>
      <label v-else-if="event.type === 'expression'" class="field-col">
        Expression
        <select :value="event.expression" @change="studio.updateEvent(event.id, { expression: ($event.target as HTMLSelectElement).value as never })">
          <option v-for="e in EXPRESSIONS" :key="e" :value="e">{{ e }}</option>
        </select>
      </label>
      <div v-else-if="event.type === 'position'" class="field-col">
        Position
        <div class="vec">
          <label v-for="(a, i) in ['X', 'Y', 'Z']" :key="a">{{ a }}<input type="number" step="0.05" :value="event.position[i]" @change="studio.updateEvent(event.id, { position: axis(event.position, i, $event) })" /></label>
        </div>
      </div>
      <template v-else-if="event.type === 'camera'">
        <label class="field-col">
          Shot label
          <input :value="event.label ?? ''" placeholder="Close-up · Lew" @change="studio.updateEvent(event.id, { label: ($event.target as HTMLInputElement).value || undefined })" />
        </label>
        <label class="field-row check">Cut (no easing into this key) <input type="checkbox" :checked="!!event.cut" @change="studio.updateEvent(event.id, { cut: ($event.target as HTMLInputElement).checked || undefined })" /></label>
        <p class="note">fov {{ event.pose.fov }}. Select Camera, move the view, then re-record a key at this time to replace it.</p>
      </template>
      <p v-else class="note">Gaze → {{ event.target.kind === 'object' ? event.target.id : event.target.kind }}</p>
    </template>
    <template v-else-if="character">
      <div class="object-head">
        <span class="dot big" :style="{ background: character.color }" />
        <div>
          <input class="inline-name" :value="character.name" aria-label="Character name" @change="studio.patch({ name: ($event.target as HTMLInputElement).value })" />
          <small>{{ CHARACTERS[character.kind].personality.summary }} · {{ action ? ACTION_LABELS[action.type === 'action' ? action.action : 'nod'] : 'idle' }}</small>
        </div>
        <button class="ghost icon-only" title="Remove character" @click="studio.removeSelected()"><Icon name="trash" /></button>
      </div>
      <h4>Transform <small>position keys at playhead</small></h4>
      <div class="vec">
        <label v-for="(a, i) in ['X', 'Y', 'Z']" :key="a">{{ a }}<input type="number" step="0.05" :value="character.position[i]!.toFixed(2)" @change="studio.patch({ position: axis(character.position, i, $event) })" /></label>
      </div>
      <label class="field-row">Facing <input type="number" step="5" :value="deg(character.rotation[1])" @change="studio.patch({ rotation: [0, rad(num($event)), 0] })" /><span class="unit">°</span></label>
      <label class="field-row">Scale <input type="number" step="0.05" min="0.2" max="4" :value="character.scale" @change="studio.patch({ scale: Math.max(0.2, Math.min(4, num($event, 1))) })" /></label>
      <label class="field-row">Coat <input type="color" :value="character.color" @input="studio.patch({ color: ($event.target as HTMLInputElement).value })" /></label>
      <h4>Face <small>keyed at playhead</small></h4>
      <label class="field-col">
        Expression
        <select :value="character.expression" @change="studio.patch({ expression: ($event.target as HTMLSelectElement).value })">
          <option v-for="e in EXPRESSIONS" :key="e" :value="e">{{ e }}</option>
        </select>
      </label>
      <label class="field-col">
        Looking at
        <select :value="gazeValue" @change="gaze">
          <option v-for="o in gazeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </label>
      <div v-if="character.gaze.kind === 'point'" class="vec">
        <label v-for="(a, i) in ['X', 'Y', 'Z']" :key="a">{{ a }}<input type="number" step="0.1" :value="character.gaze.position[i]" @change="studio.patch({ gaze: { kind: 'point', position: axis((character.gaze as { position: Vec3 }).position, i, $event) } })" /></label>
      </div>
      <h4>Beats</h4>
      <div class="chips">
        <button v-for="a in ACTIONS" :key="a" class="chip" :title="`${ACTION_LABELS[a]} at ${time.toFixed(2)}s`" @click="studio.edit((c) => c.act(character!.id, a, time))">{{ ACTION_LABELS[a] }}</button>
      </div>
      <button class="ghost wide" @click="studio.addEventAtPlayhead('dialogue')"><Icon name="chat" /> Add a line at {{ time.toFixed(2) }}s</button>
    </template>
    <template v-else-if="prop">
      <div class="object-head">
        <Icon name="cube" :size="18" />
        <div><strong>{{ prop.id }}</strong><small>{{ prop.kind }}</small></div>
        <button class="ghost icon-only" title="Remove prop" @click="studio.removeSelected()"><Icon name="trash" /></button>
      </div>
      <template v-if="SCREEN_PROPS.includes(prop.kind)">
        <label class="field-col">
          Screen
          <select :value="screenValue" @change="screen">
            <option v-for="s in SCREEN_IDS" :key="s" :value="s">{{ SCREEN_LABELS[s] }}</option>
            <option value="image">Custom image…</option>
          </select>
        </label>
        <label class="field-col">
          Screenshot (PNG/JPEG, under 400 kB)
          <input type="file" accept="image/png,image/jpeg,image/webp" @change="screenFile" />
        </label>
      </template>
      <h4>Transform</h4>
      <div class="vec">
        <label v-for="(a, i) in ['X', 'Y', 'Z']" :key="a">{{ a }}<input type="number" step="0.05" :value="prop.position[i]" @change="studio.patch({ position: axis(prop.position, i, $event) })" /></label>
      </div>
      <label class="field-row">Rotation Y <input type="number" step="5" :value="deg(prop.rotation[1])" @change="studio.patch({ rotation: [prop.rotation[0], rad(num($event)), prop.rotation[2]] })" /><span class="unit">°</span></label>
      <label class="field-row">Scale <input type="number" step="0.05" min="0.1" max="6" :value="prop.scale" @change="studio.patch({ scale: Math.max(0.1, Math.min(6, num($event, 1))) })" /></label>
      <label class="field-row">Colour <input type="color" :value="prop.color" @input="studio.patch({ color: ($event.target as HTMLInputElement).value })" /></label>
    </template>
    <template v-else-if="light">
      <div class="object-head">
        <Icon name="light" :size="18" :style="{ color: light.color }" />
        <div><strong>{{ light.id }}</strong><small>point light</small></div>
        <button class="ghost icon-only" title="Remove light" @click="studio.removeSelected()"><Icon name="trash" /></button>
      </div>
      <div class="vec">
        <label v-for="(a, i) in ['X', 'Y', 'Z']" :key="a">{{ a }}<input type="number" step="0.1" :value="light.position[i]" @change="studio.patch({ position: axis(light.position, i, $event) })" /></label>
      </div>
      <label class="field-row">Colour <input type="color" :value="light.color" @input="studio.patch({ color: ($event.target as HTMLInputElement).value })" /></label>
      <label class="field-row">Intensity <input type="range" min="0" max="120" step="1" :value="light.intensity" @input="studio.patch({ intensity: num($event) })" /><span class="unit">{{ light.intensity }}</span></label>
    </template>
    <template v-else-if="selected === 'camera'">
      <div class="object-head">
        <Icon name="camera" :size="18" />
        <div><strong>Camera</strong><small>{{ focal }} mm equivalent</small></div>
      </div>
      <h4>Position</h4>
      <div class="vec">
        <label v-for="(a, i) in ['X', 'Y', 'Z']" :key="a">{{ a }}<input type="number" step="0.1" :value="camera.position[i]!.toFixed(2)" @change="studio.setCamera({ ...camera, position: axis(camera.position, i, $event) })" /></label>
      </div>
      <h4>Target</h4>
      <div class="vec">
        <label v-for="(a, i) in ['X', 'Y', 'Z']" :key="a">{{ a }}<input type="number" step="0.1" :value="camera.target[i]!.toFixed(2)" @change="studio.setCamera({ ...camera, target: axis(camera.target, i, $event) })" /></label>
      </div>
      <label class="field-row">Field of view <input type="range" min="12" max="100" step="1" :value="camera.fov" @input="studio.setCamera({ ...camera, fov: num($event, 40) })" /><span class="unit">{{ camera.fov.toFixed(0) }}°</span></label>
      <button class="ghost wide accent" @click="studio.cameraKey()"><Icon name="key" /> Record camera key at {{ time.toFixed(2) }}s</button>
      <p class="note">Shots in the script are the normal way to move the camera. Orbit, frame a preset and record a key only to fix one moment.</p>
    </template>
    <template v-else-if="selected === 'environment'">
      <div class="object-head">
        <Icon name="scene" :size="18" />
        <div><strong>{{ env.name }}</strong><small>{{ env.description }}</small></div>
      </div>
      <h4>Atmosphere</h4>
      <label class="field-row">Fog <input type="range" min="0" max="0.12" step="0.002" :value="scene.environment.fog" @input="studio.patch({ fog: num($event) })" /><span class="unit">{{ scene.environment.fog.toFixed(3) }}</span></label>
      <label v-if="env.weather" class="field-row">Rain <input type="range" min="0" max="1" step="0.05" :value="scene.environment.rain" @input="studio.patch({ rain: num($event) })" /><span class="unit">{{ scene.environment.rain.toFixed(2) }}</span></label>
      <label class="field-row">Glow <input type="range" min="0" max="1.5" step="0.05" :value="scene.environment.bloom" @input="studio.patch({ bloom: num($event) })" /><span class="unit">{{ scene.environment.bloom.toFixed(2) }}</span></label>
      <h4>Scene</h4>
      <label class="field-row">Duration <input type="number" min="0.5" max="300" step="0.5" :value="scene.duration" @change="studio.setDuration(num($event, 10))" /><span class="unit">s</span></label>
      <label class="field-row">Frame rate <input type="number" min="12" max="60" step="1" :value="scene.fps" @change="studio.edit((c) => c.setFps(Math.max(12, Math.min(60, num($event, 60)))))" /><span class="unit">fps</span></label>
      <p class="note">Marks: {{ Object.keys(env.marks).join(', ') }}. Gaze anchors: {{ Object.keys(env.anchors).join(', ') }}.</p>
    </template>
    <p v-else class="empty">Select something in the viewport or the scene tree.</p>
  </div>
</template>
