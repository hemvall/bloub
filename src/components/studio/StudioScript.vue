<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Icon from './Icon.vue'
import type { StudioDocument } from './useStudioDocument'
import { printScript, SCRIPT_HELP } from '@/studio/content/script'
import { CHARACTERS, CHARACTER_KINDS } from '@/studio/characters/catalog'
import { ENVIRONMENTS, ENVIRONMENT_IDS } from '@/studio/environments/catalog'
import { OUTPUT_FORMATS, OUTPUT_PRESETS, type OutputFormat } from '@/studio/render/presets'
import { PROJECT_STATUSES, type ProjectStatus } from '@/studio/content/project'
import { SUBTITLE_PRESETS } from '@/studio/subtitles/style'
import type { CharacterKind, EnvironmentId } from '@/studio/scene/model'
const props = defineProps<{ studio: StudioDocument }>()
const { project, scene, scriptWarnings, plan } = props.studio
const draft = ref(printScript(project.value))
const dirty = computed(() => draft.value.trim() !== printScript(project.value).trim())
const help = ref(false)
const addOpen = ref(false)
const printed = computed(() => printScript(project.value))
watch(printed, (text) => {
  if (!dirty.value || !draft.value.trim()) draft.value = text
})
watch(() => project.value.id, () => {
  draft.value = printScript(project.value)
})
const marks = computed(() => Object.keys(ENVIRONMENTS[project.value.environment].marks))
const words = computed(() => project.value.dialogue.reduce((n, d) => n + d.text.split(/\s+/).length, 0))
function apply() {
  props.studio.applyScriptText(draft.value)
}
function reset() {
  draft.value = printScript(project.value)
}
function subtitlePreset(ev: Event) {
  const id = (ev.target as HTMLSelectElement).value
  const preset = SUBTITLE_PRESETS.find((p) => p.id === id)
  if (preset) props.studio.edit((c) => c.setSubtitles(preset.style))
}
const subtitleId = computed(() => (scene.value.subtitles.mode === 'caption' ? 'caption' : 'lew'))
function kindLabel(kind: CharacterKind) {
  return `${CHARACTERS[kind].name} · ${CHARACTERS[kind].tier}`
}
</script>
<template>
  <div class="script-panel">
    <label class="field-col">
      Hook
      <input :value="project.hook" placeholder="The first thing they hear" @change="studio.editProject((s) => s.setHook(($event.target as HTMLInputElement).value))" />
    </label>
    <label class="field-col">
      Call to action
      <input :value="project.cta" placeholder="For the caption, not the video" @change="studio.editProject((s) => s.setCta(($event.target as HTMLInputElement).value))" />
    </label>
    <div class="two">
      <label class="field-col">
        Format
        <select :value="project.format" @change="studio.setFormat(($event.target as HTMLSelectElement).value as OutputFormat)">
          <option v-for="f in OUTPUT_FORMATS" :key="f" :value="f">{{ OUTPUT_PRESETS[f].name }}</option>
        </select>
      </label>
      <label class="field-col">
        Status
        <select :value="project.status" @change="studio.setStatus(($event.target as HTMLSelectElement).value as ProjectStatus)">
          <option v-for="s in PROJECT_STATUSES" :key="s" :value="s">{{ s }}</option>
        </select>
      </label>
    </div>
    <label class="field-col">
      Set
      <select :value="project.environment" @change="studio.editProject((s) => s.setEnvironment(($event.target as HTMLSelectElement).value as EnvironmentId)); studio.compile()">
        <option v-for="id in ENVIRONMENT_IDS" :key="id" :value="id">{{ ENVIRONMENTS[id].name }}{{ ENVIRONMENTS[id].tier === 'demo' ? ' · demo' : '' }}</option>
      </select>
    </label>
    <h4>
      Cast
      <span class="menu">
        <button class="ghost icon-only" title="Add a character" :aria-expanded="addOpen" @click="addOpen = !addOpen"><Icon name="plus" /></button>
        <div v-if="addOpen" class="menu-list">
          <button v-for="k in CHARACTER_KINDS" :key="k" @click="addOpen = false; studio.editProject((s) => s.addCharacter(k)); studio.compile()">
            <span class="dot" :style="{ background: CHARACTERS[k].color }" /> {{ kindLabel(k) }}
          </button>
        </div>
      </span>
    </h4>
    <div v-for="m in project.cast" :key="m.role" class="cast-row">
      <span class="dot" :style="{ background: CHARACTERS[m.kind].color }" />
      <input class="cast-name" :value="m.name" :aria-label="`Name of ${m.role}`" @change="studio.editProject((s) => s.setCharacter(m.role, { name: ($event.target as HTMLInputElement).value })); studio.compile()" />
      <small>{{ m.role }}</small>
      <select :value="m.mark ?? ''" :aria-label="`Mark of ${m.role}`" @change="studio.editProject((s) => s.setCharacter(m.role, { mark: ($event.target as HTMLSelectElement).value || undefined })); studio.compile()">
        <option value="">auto</option>
        <option v-for="k in marks" :key="k" :value="k">{{ k }}</option>
      </select>
      <button class="ghost icon-only" title="Remove from the cast" @click="studio.editProject((s) => s.removeCharacter(m.role)); studio.compile()"><Icon name="x" :size="12" /></button>
    </div>
    <p v-if="!project.cast.length" class="empty">No cast. Add Lew first.</p>
    <h4>
      Script
      <span>
        <button class="ghost icon-only" title="Format help" :aria-expanded="help" @click="help = !help">?</button>
      </span>
    </h4>
    <pre v-if="help" class="script-help">{{ SCRIPT_HELP }}</pre>
    <textarea v-model="draft" class="script-text" rows="18" spellcheck="false" aria-label="Script" placeholder="CAMERA: two-shot Lew CEO&#10;CEO (confused): &quot;We already have ChatGPT.&quot;" />
    <div class="script-actions">
      <button class="primary" :disabled="!draft.trim()" @click="apply"><Icon name="refresh" /> {{ dirty ? 'Apply & compile' : 'Recompile' }}</button>
      <button v-if="dirty" class="ghost" @click="reset">Revert</button>
      <span class="dim">{{ project.dialogue.length }} lines · {{ project.shots.length }} shots · {{ words }} words</span>
    </div>
    <ul v-if="scriptWarnings.length" class="warnings">
      <li v-for="w in scriptWarnings" :key="w">{{ w }}</li>
    </ul>
    <p class="note">Compiling rebuilds the whole timeline from the script: cuts, gaze, listening, emotions. Hand edits in the timeline survive until the next compile.</p>
    <h4>Subtitles</h4>
    <div class="two">
      <label class="field-col">
        Style
        <select :value="subtitleId" @change="subtitlePreset">
          <option v-for="p in SUBTITLE_PRESETS" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </label>
      <label class="field-col check">
        Shown
        <input type="checkbox" :checked="scene.subtitles.enabled" @change="studio.edit((c) => c.setSubtitles({ enabled: ($event.target as HTMLInputElement).checked }))" />
      </label>
    </div>
    <h4>Render</h4>
    <p class="note">
      {{ plan.preset.name }} · {{ plan.preset.width }}×{{ plan.preset.height }} · {{ plan.preset.fps }} fps · {{ plan.frames }} frames<br />
      Video <b class="ok">ready</b> · subtitles <b class="ok">burned in</b> · audio <b class="warn">none</b>: {{ plan.audio.note }}
    </p>
  </div>
</template>
