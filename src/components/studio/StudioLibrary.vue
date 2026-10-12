<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Icon from './Icon.vue'
import type { StudioDocument } from './useStudioDocument'
import { TEMPLATES } from '@/studio/content/templates'
import { OUTPUT_PRESETS } from '@/studio/render/presets'
import { ENVIRONMENTS } from '@/studio/environments/catalog'
import { PROJECT_STATUSES, type ContentProject, type ProjectStatus } from '@/studio/content/project'
import { projectDuration } from '@/studio/content/compile'
const props = defineProps<{ studio: StudioDocument }>()
const { projects, generating, message, canGenerate, claude } = props.studio
const filter = ref<'all' | ProjectStatus>('all')
const brief = ref('')
const menu = ref(false)
const keyOpen = ref(false)
const EXAMPLES = [
  'A 20-second Reel where a CEO asks Lew why they need an agent when they already have ChatGPT. Office at night, two-shot then close-ups, funny but accurate.',
  'Explain why RAG is not just putting documents in a vector database. Lew alone in the AI lab, 25 seconds, one punchline.',
  'A developer asks an AI to rename one variable and it refactors everything. Dev and Lew, 18 seconds.'
]
const visible = computed(() => {
  const list = filter.value === 'all' ? projects.value : projects.value.filter((p) => p.status === filter.value)
  return [...list].sort((a, b) => b.metadata.updatedAt.localeCompare(a.metadata.updatedAt))
})
const counts = computed(() => ({
  all: projects.value.length,
  draft: projects.value.filter((p) => p.status === 'draft').length,
  ready: projects.value.filter((p) => p.status === 'ready').length,
  rendered: projects.value.filter((p) => p.status === 'rendered').length
}))
function when(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const days = (Date.now() - d.getTime()) / 864e5
  if (days < 1) return 'today'
  if (days < 2) return 'yesterday'
  if (days < 7) return `${Math.floor(days)} days ago`
  return d.toLocaleDateString()
}
function seconds(p: ContentProject) {
  return `${(p.dialogue.length ? projectDuration(p) : p.scene.duration).toFixed(0)}s`
}
function submit() {
  const text = brief.value.trim()
  if (!text) return
  props.studio.generate(text)
}
function outside(ev: PointerEvent) {
  if (!(ev.target as HTMLElement).closest('.menu')) menu.value = false
}
onMounted(() => window.addEventListener('pointerdown', outside))
onBeforeUnmount(() => window.removeEventListener('pointerdown', outside))
</script>
<template>
  <section class="library">
    <header class="library-head">
      <a href="/#" class="brand">bl<span>o</span>ub <small>content engine</small></a>
      <div class="spacer" />
      <button class="ghost" title="Import a project or scene JSON" @click="studio.fileInput.value?.click()"><Icon name="import" /> Import</button>
      <span class="menu">
        <button class="primary" :aria-expanded="menu" @click="menu = !menu"><Icon name="plus" /> New reel</button>
        <div v-if="menu" class="menu-list">
          <button @click="menu = false; studio.newProject()"><Icon name="script" /> Blank · Lew alone</button>
          <button v-for="t in TEMPLATES" :key="t.id" @click="menu = false; studio.newProject(t.id)"><Icon name="film" /> {{ t.name }} <small>{{ t.duration }}s</small></button>
        </div>
      </span>
    </header>
    <form class="command-bar" @submit.prevent="submit">
      <Icon name="wand" :size="18" />
      <input v-model="brief" type="text" placeholder="Describe your video… e.g. “25-second Reel: a CEO asks Lew why they need an agent when they already have ChatGPT”" aria-label="Video brief" :disabled="generating" />
      <button v-if="generating" type="button" class="ghost" @click="studio.cancelGenerate()"><Icon name="stop" /> Cancel</button>
      <button v-else type="submit" class="primary" :disabled="!brief.trim() || !canGenerate" :title="canGenerate ? 'Generate a project with Claude' : 'Needs an Anthropic API key'">
        <Icon name="sparkle" /> Generate
      </button>
      <button type="button" class="ghost icon-only" title="API key" :aria-expanded="keyOpen" @click="keyOpen = !keyOpen"><Icon name="settings" /></button>
    </form>
    <div v-if="keyOpen" class="key-panel">
      <label class="field-col">
        Anthropic API key
        <input v-model="claude.apiKey" type="password" placeholder="sk-ant-…" autocomplete="off" spellcheck="false" />
      </label>
      <p class="note">The key stays in this browser and goes only to api.anthropic.com. Generation writes a project in the script format; the compiler builds the timeline from it, exactly as for a hand-written script. Without a key, start from a template.</p>
    </div>
    <p v-else-if="!canGenerate" class="note command-note">No API key: the brief cannot be generated. Templates below work offline; the key goes in the settings icon.</p>
    <div v-if="generating" class="generating"><span /><span /><span /> Writing the project…</div>
    <p v-if="message" class="library-message">{{ message }}</p>
    <div v-if="!projects.length || projects.every((p) => !p.dialogue.length)" class="examples">
      <button v-for="e in EXAMPLES" :key="e" class="suggestion" :disabled="!canGenerate" @click="brief = e; submit()">{{ e }}</button>
    </div>
    <nav class="filters" aria-label="Status filter">
      <button v-for="f in ['all', ...PROJECT_STATUSES] as const" :key="f" class="chip" :class="{ active: filter === f }" @click="filter = f">
        {{ f === 'all' ? 'All' : f === 'draft' ? 'Drafts' : f === 'ready' ? 'Ready' : 'Rendered' }} <small>{{ counts[f] }}</small>
      </button>
    </nav>
    <div class="cards">
      <article v-for="p in visible" :key="p.id" class="card" :class="p.status">
        <button class="thumb" :style="{ background: ENVIRONMENTS[p.environment].background }" :title="`Open ${p.title}`" @click="studio.openProject(p.id)">
          <img v-if="p.metadata.thumbnail" :src="p.metadata.thumbnail" alt="" />
          <span v-else class="thumb-empty"><Icon name="film" :size="22" /></span>
          <span class="thumb-format">{{ OUTPUT_PRESETS[p.format].aspect }}</span>
        </button>
        <div class="card-body">
          <h3>{{ p.title }}</h3>
          <p class="card-hook">{{ p.hook || p.topic || ENVIRONMENTS[p.environment].name }}</p>
          <p class="card-meta">
            <span>{{ seconds(p) }}</span> · <span>{{ OUTPUT_PRESETS[p.format].name }}</span> · <span>{{ p.cast.map((c) => c.name).join(', ') || 'no cast' }}</span>
          </p>
          <div class="card-actions">
            <select class="status" :value="p.status" :aria-label="`Status of ${p.title}`" @change="studio.openProject(p.id); studio.setStatus(($event.target as HTMLSelectElement).value as ProjectStatus); studio.view.value = 'library'">
              <option v-for="s in PROJECT_STATUSES" :key="s" :value="s">{{ s }}</option>
            </select>
            <span class="dim">{{ when(p.metadata.updatedAt) }}</span>
            <div class="spacer" />
            <button class="ghost icon-only" title="Duplicate" @click="studio.duplicateProject(p.id)"><Icon name="dup" /></button>
            <button class="ghost icon-only" title="Delete" @click="studio.deleteProject(p.id)"><Icon name="trash" /></button>
            <button class="primary" @click="studio.openProject(p.id)">Open</button>
          </div>
        </div>
      </article>
    </div>
    <p v-if="!visible.length" class="empty">Nothing here yet.</p>
  </section>
</template>
