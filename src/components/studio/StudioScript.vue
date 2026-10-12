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
import { MUSIC_LABELS, MUSIC_TRACKS, TTS_PROVIDERS, type ContentLanguage, type MusicTrack, type TtsProvider } from '@/studio/audio/plan'
import { DEFAULT_MODELS, OPENAI_VOICES, VOICE_DEFAULTS } from '@/studio/audio/tts'
import { licenseLabel, MUSIC_LIBRARY } from '@/studio/audio/library'
const props = defineProps<{ studio: StudioDocument }>()
const { project, scene, scriptWarnings, plan, audio } = props.studio
const { keys, voiceProgress, voicedLines, mixing, missing, downloading, archiveItems, archiveFilesOf, searching } = audio
const musicFile = ref<HTMLInputElement>()
const shelf = ref('')
const query = ref('')
async function copyCredit() {
  const credit = project.value.audio.music.custom?.credit
  if (!credit) return
  try {
    await navigator.clipboard.writeText(credit)
    props.studio.message.value = 'Credit copied'
  } catch {
    props.studio.message.value = credit
  }
}
function num(ev: Event) {
  return Number((ev.target as HTMLInputElement).value)
}
function voiceOf(role: string, kind: CharacterKind) {
  return project.value.voice.voices[role] || (project.value.voice.provider === 'openai' ? VOICE_DEFAULTS[kind].openai : '')
}
function instructionsOf(role: string, kind: CharacterKind) {
  return project.value.voice.instructions[role] ?? VOICE_DEFAULTS[kind].instructions[project.value.voice.language]
}
const printed = computed(() => printScript(project.value, project.value.voice.language))
const draft = ref(printed.value)
const dirty = computed(() => draft.value.trim() !== printed.value.trim())
const help = ref(false)
const addOpen = ref(false)
watch(printed, (text) => {
  if (!dirty.value || !draft.value.trim()) draft.value = text
})
watch(() => project.value.id, () => {
  draft.value = printed.value
})
const marks = computed(() => Object.keys(ENVIRONMENTS[project.value.environment].marks))
const words = computed(() => project.value.dialogue.reduce((n, d) => n + d.text.split(/\s+/).length, 0))
function apply() {
  props.studio.applyScriptText(draft.value)
}
function reset() {
  draft.value = printed.value
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
      Script <small>{{ project.voice.language === 'fr' ? 'français' : 'English' }}</small>
      <span>
        <button class="ghost" :title="project.voice.language === 'en' ? 'Create the French version of this reel' : 'Create the English version of this reel'" :disabled="studio.generating.value" @click="studio.createVariant(project.voice.language === 'en' ? 'fr' : 'en')">
          <Icon name="dup" /> {{ project.voice.language === 'en' ? 'FR version' : 'EN version' }}
        </button>
        <button class="ghost icon-only" title="Format help" :aria-expanded="help" @click="help = !help">?</button>
      </span>
    </h4>
    <p v-if="project.metadata.variantOf" class="note">Language version of another reel; voices are regenerated per language.</p>
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
    <h4>Voice <small>{{ voicedLines }}/{{ project.dialogue.length }} lines voiced</small></h4>
    <div class="two">
      <label class="field-col">
        Provider
        <select :value="project.voice.provider" @change="studio.editProject((s) => s.setVoice({ provider: ($event.target as HTMLSelectElement).value as TtsProvider, model: DEFAULT_MODELS[($event.target as HTMLSelectElement).value as TtsProvider] }))">
          <option v-for="p in TTS_PROVIDERS" :key="p" :value="p">{{ p === 'none' ? 'None (silent)' : p === 'openai' ? 'OpenAI TTS' : 'ElevenLabs' }}</option>
        </select>
      </label>
      <label class="field-col">
        Language
        <select :value="project.voice.language" @change="studio.editProject((s) => s.setVoice({ language: ($event.target as HTMLSelectElement).value as ContentLanguage }))">
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </label>
    </div>
    <template v-if="project.voice.provider !== 'none'">
      <label class="field-col">
        {{ project.voice.provider === 'openai' ? 'OpenAI' : 'ElevenLabs' }} API key
        <input v-if="project.voice.provider === 'openai'" v-model="keys.openai" type="password" placeholder="sk-…" autocomplete="off" spellcheck="false" />
        <input v-else v-model="keys.elevenlabs" type="password" placeholder="xi-…" autocomplete="off" spellcheck="false" />
      </label>
      <label class="field-col">
        Model
        <input :value="project.voice.model || DEFAULT_MODELS[project.voice.provider]" spellcheck="false" @change="studio.editProject((s) => s.setVoice({ model: ($event.target as HTMLInputElement).value.trim() }))" />
      </label>
      <div v-for="m in project.cast" :key="m.role" class="voice-row">
        <span class="dot" :style="{ background: CHARACTERS[m.kind].color }" />
        <span class="voice-name">{{ m.name }}</span>
        <input
          :value="voiceOf(m.role, m.kind)"
          :list="project.voice.provider === 'openai' ? 'openai-voices' : undefined"
          :placeholder="project.voice.provider === 'openai' ? 'voice' : 'voice id'"
          spellcheck="false"
          :aria-label="`Voice of ${m.name}`"
          @change="studio.editProject((s) => s.setVoice({ voices: { [m.role]: ($event.target as HTMLInputElement).value.trim() } }))"
        />
        <input
          v-if="project.voice.provider === 'openai'"
          class="voice-notes"
          :value="instructionsOf(m.role, m.kind)"
          :aria-label="`Delivery of ${m.name}`"
          placeholder="delivery notes"
          @change="studio.editProject((s) => s.setVoice({ instructions: { [m.role]: ($event.target as HTMLInputElement).value } }))"
        />
      </div>
      <datalist id="openai-voices"><option v-for="v in OPENAI_VOICES" :key="v" :value="v" /></datalist>
      <div class="script-actions">
        <button v-if="voiceProgress.running" class="ghost" @click="audio.cancelVoices()"><Icon name="stop" /> Cancel</button>
        <button v-else class="primary" :disabled="!audio.providerKey.value || !project.dialogue.length" @click="audio.generateVoices()"><Icon name="mic" /> Generate voices</button>
        <button class="ghost" :disabled="voiceProgress.running || !voicedLines" title="Synthesise every line again" @click="audio.generateVoices(true)">Redo all</button>
        <button class="ghost" :disabled="voiceProgress.running || !voicedLines" @click="audio.clearVoices()">Remove</button>
      </div>
      <p v-if="voiceProgress.running" class="note">{{ voiceProgress.done }}/{{ voiceProgress.total }} · {{ voiceProgress.current }}</p>
      <p class="note">The key stays in this browser and goes only to the provider. Clips are stored locally under a content hash; a line is synthesised once per text and voice. Each clip sets its line's length and slides the beats after it.</p>
    </template>
    <p v-else class="note">Without a provider the lines are timed by reading speed and the mouth is animated by a rhythm, not by a voice.</p>
    <h4>Sound <small v-if="mixing">mixing…</small></h4>
    <label class="field-col">
      Music
      <select :value="project.audio.music.track" @change="studio.editProject((s) => s.setAudio({ music: { track: ($event.target as HTMLSelectElement).value as MusicTrack, volume: s.project.audio.music.volume } }))">
        <option v-for="t in MUSIC_TRACKS" :key="t" :value="t" :disabled="t === 'custom' && !project.audio.music.custom">{{ MUSIC_LABELS[t] }}{{ t === 'custom' && project.audio.music.custom ? ` · ${project.audio.music.custom.name}` : '' }}</option>
      </select>
    </label>
    <p v-if="project.audio.music.track === 'custom' && project.audio.music.custom" class="credit">
      <b>{{ project.audio.music.custom.name }}</b> · {{ project.audio.music.custom.duration.toFixed(0) }}s<span v-if="project.audio.music.custom.license"> · {{ licenseLabel(project.audio.music.custom.license) }}</span>
      <button v-if="project.audio.music.custom.credit" class="ghost" title="Copy the attribution for the caption" @click="copyCredit"><Icon name="copy" /> Copy credit</button>
    </p>
    <label class="field-col">
      Library <small class="dim">Kevin MacLeod · CC BY 4.0 · fetched from archive.org, no key</small>
      <select v-model="shelf" :disabled="downloading.running" @change="shelf && audio.useLibraryTrack(shelf); shelf = ''">
        <option value="">Pick a real track…</option>
        <option v-for="t in MUSIC_LIBRARY" :key="t.id" :value="t.id">{{ t.title }} · {{ t.mood }} · {{ Math.round(t.seconds / 60) }} min</option>
      </select>
    </label>
    <form class="script-actions" @submit.prevent="audio.search(query)">
      <input v-model="query" class="grow" placeholder="Search the Internet Archive (CC0 / CC BY only)…" aria-label="Music search" :disabled="searching" />
      <button type="submit" class="ghost" :disabled="!query.trim() || searching"><Icon name="sparkle" /> {{ searching ? 'Searching…' : 'Search' }}</button>
    </form>
    <ul v-if="archiveItems.length && !archiveFilesOf" class="results">
      <li v-for="item in archiveItems" :key="item.identifier">
        <button class="ghost wide" @click="audio.openItem(item)">{{ item.title }} <small>{{ item.creator || '—' }} · {{ licenseLabel(item.license) }}</small></button>
      </li>
    </ul>
    <div v-if="archiveFilesOf" class="results">
      <button class="ghost" @click="audio.archiveFilesOf.value = null"><Icon name="back" /> {{ archiveFilesOf.item.title }}</button>
      <ul>
        <li v-for="f in archiveFilesOf.files" :key="f.name">
          <button class="ghost wide" :disabled="downloading.running" @click="audio.useArchiveFile(archiveFilesOf!.item, f)">{{ f.title }} <small>{{ Math.round(f.seconds / 60) }} min · {{ (f.bytes / 1e6).toFixed(1) }} MB</small></button>
        </li>
      </ul>
    </div>
    <p v-if="downloading.running" class="note">Downloading {{ downloading.label }} · {{ Math.round(downloading.fraction * 100) }}% <button class="ghost" @click="audio.cancelDownload()">Cancel</button></p>
    <div class="script-actions">
      <button class="ghost" @click="musicFile?.click()"><Icon name="music" /> Import a file</button>
      <input ref="musicFile" type="file" accept="audio/*" hidden @change="($event.target as HTMLInputElement).files?.[0] && audio.importMusicFile(($event.target as HTMLInputElement).files![0]!)" />
      <span class="dim">MP3, WAV, OGG · stored locally</span>
    </div>
    <label class="field-row">Music level <input type="range" min="0" max="1" step="0.05" :value="project.audio.music.volume" @change="studio.editProject((s) => s.setAudio({ music: { track: s.project.audio.music.track, volume: num($event) } }))" /><span class="unit">{{ project.audio.music.volume.toFixed(2) }}</span></label>
    <label class="field-row">Ducking under voice <input type="range" min="0" max="1" step="0.05" :value="project.audio.ducking" @change="studio.editProject((s) => s.setAudio({ ducking: num($event) }))" /><span class="unit">{{ project.audio.ducking.toFixed(2) }}</span></label>
    <label class="field-row check">Room tone of the set <input type="checkbox" :checked="project.audio.ambience.enabled" @change="studio.editProject((s) => s.setAudio({ ambience: { enabled: ($event.target as HTMLInputElement).checked, volume: s.project.audio.ambience.volume } }))" /></label>
    <label class="field-row">Ambience level <input type="range" min="0" max="1" step="0.05" :value="project.audio.ambience.volume" @change="studio.editProject((s) => s.setAudio({ ambience: { enabled: s.project.audio.ambience.enabled, volume: num($event) } }))" /><span class="unit">{{ project.audio.ambience.volume.toFixed(2) }}</span></label>
    <div class="chips">
      <button class="chip" :class="{ active: project.audio.sfx.cuts }" @click="studio.editProject((s) => s.setAudio({ sfx: { ...s.project.audio.sfx, cuts: !s.project.audio.sfx.cuts } }))">Whoosh on cuts</button>
      <button class="chip" :class="{ active: project.audio.sfx.punchline }" @click="studio.editProject((s) => s.setAudio({ sfx: { ...s.project.audio.sfx, punchline: !s.project.audio.sfx.punchline } }))">Riser + hit on the punchline</button>
      <button class="chip" :class="{ active: project.audio.sfx.captions }" @click="studio.editProject((s) => s.setAudio({ sfx: { ...s.project.audio.sfx, captions: !s.project.audio.sfx.captions } }))">Tick per caption</button>
    </div>
    <label class="field-row">SFX level <input type="range" min="0" max="1" step="0.05" :value="project.audio.sfx.volume" @change="studio.editProject((s) => s.setAudio({ sfx: { ...s.project.audio.sfx, volume: num($event) } }))" /><span class="unit">{{ project.audio.sfx.volume.toFixed(2) }}</span></label>
    <ul v-if="missing.length" class="warnings">
      <li v-for="m in missing" :key="m">Missing locally: {{ m }} (regenerate or re-import)</li>
    </ul>
    <h4>Render</h4>
    <p class="note">
      {{ plan.preset.name }} · {{ plan.preset.width }}×{{ plan.preset.height }} · {{ plan.preset.fps }} fps · {{ plan.frames }} frames<br />
      Video <b class="ok">ready</b> · subtitles <b class="ok">burned in</b> · audio <b :class="plan.audio.ready ? 'ok' : 'warn'">{{ plan.audio.ready ? 'ready' : 'silent' }}</b>: {{ plan.audio.note }}
    </p>
  </div>
</template>
