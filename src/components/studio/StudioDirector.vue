<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import Icon from './Icon.vue'
import type { StudioDocument } from './useStudioDocument'
import { useDirector } from './useDirector'
import { DIRECTOR_MODELS } from '@/studio/director/claude'
const props = defineProps<{ studio: StudioDocument }>()
const director = useDirector(
  () => props.studio.scene.value,
  (scene, note) => {
    props.studio.adopt(scene, note)
    requestAnimationFrame(() => props.studio.seek(0))
  }
)
const { turns, busy, settings, settingsOpen } = director
const draft = ref('')
const log = ref<HTMLElement>()
const SUGGESTIONS = [
  'Lew looks at the camera at 2s and says "That is not an agent."',
  'CEO looks confused after 3 seconds, then nods.',
  'Close-up on Lew at 9s. No rain.'
]
async function submit() {
  const text = draft.value
  draft.value = ''
  await director.send(text)
  await nextTick()
  log.value?.scrollTo({ top: log.value.scrollHeight, behavior: 'smooth' })
}
watch(turns, async () => {
  await nextTick()
  log.value?.scrollTo({ top: log.value.scrollHeight })
}, { deep: true })
function key(ev: KeyboardEvent) {
  if (ev.key === 'Enter' && !ev.shiftKey) {
    ev.preventDefault()
    submit()
  }
}
</script>
<template>
  <div class="director">
    <div class="director-head">
      <span class="engine-pill" :class="director.engineFor()">
        <Icon :name="director.engineFor() === 'claude' ? 'sparkle' : 'sliders'" :size="12" />
        {{ director.engineFor() === 'claude' ? settings.model : 'offline rules' }}
      </span>
      <div class="spacer" />
      <button class="ghost icon-only" title="Clear chat" @click="director.clear()"><Icon name="trash" /></button>
      <button class="ghost icon-only" title="Director settings" :aria-expanded="settingsOpen" @click="settingsOpen = !settingsOpen"><Icon name="settings" /></button>
    </div>
    <div v-if="settingsOpen" class="director-settings">
      <label class="field-col">
        Engine
        <select v-model="settings.engine">
          <option value="auto">Auto · Claude when a key is set</option>
          <option value="claude">Claude</option>
          <option value="local">Offline rules</option>
        </select>
      </label>
      <label class="field-col">
        Anthropic API key
        <input v-model="settings.apiKey" type="password" placeholder="sk-ant-…" autocomplete="off" spellcheck="false" />
      </label>
      <label class="field-col">
        Model
        <select v-model="settings.model">
          <option v-for="m in DIRECTOR_MODELS" :key="m" :value="m">{{ m }}</option>
        </select>
      </label>
      <p class="note">The key stays in this browser and is sent only to api.anthropic.com. Without a key, a small offline parser reads simple stage directions.</p>
    </div>
    <div ref="log" class="director-log">
      <div v-if="!turns.length" class="director-intro">
        <p><strong>Adjust the compiled scene in plain words.</strong> Where someone looks, a line, a camera move. The script panel is for rewriting the whole reel; this is for touches.</p>
        <button v-for="s in SUGGESTIONS" :key="s" class="suggestion" @click="draft = s; submit()">{{ s }}</button>
      </div>
      <div v-for="(t, i) in turns" :key="i" class="turn" :class="t.role">
        <p>{{ t.text }}</p>
        <small v-if="t.role === 'assistant' && (t.applied || t.warnings?.length)">
          <span v-if="t.applied"><Icon name="check" :size="11" /> {{ t.applied }} change{{ t.applied > 1 ? 's' : '' }}</span>
          <span v-for="w in t.warnings" :key="w" class="warn">{{ w }}</span>
        </small>
      </div>
      <div v-if="busy" class="turn assistant thinking"><span /><span /><span /></div>
    </div>
    <form class="director-input" @submit.prevent="submit">
      <textarea v-model="draft" rows="2" placeholder="Kit looks at the window, sighs, then says…" aria-label="Direction" :disabled="busy" @keydown="key" />
      <button v-if="busy" type="button" class="ghost icon-only" title="Cancel" @click="director.cancel()"><Icon name="stop" /></button>
      <button v-else type="submit" class="primary icon-only" title="Send (Enter)" :disabled="!draft.trim()"><Icon name="send" /></button>
    </form>
  </div>
</template>
