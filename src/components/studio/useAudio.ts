import { computed, onBeforeUnmount, ref, shallowRef, watch, type Ref } from 'vue'
import type { ContentProject } from '@/studio/content/project'
import { mixPlan } from '@/studio/audio/plan'
import { clipOf, renderMix } from '@/studio/audio/mix'
import { decodeClip } from '@/studio/audio/store'
import { AudioPreview } from '@/studio/audio/player'
import { DEFAULT_MODELS, importMusic, storeTrack, synthesizeLine, VOICE_DEFAULTS } from '@/studio/audio/tts'
import { archiveCredit, archiveFiles, fetchTrack, libraryTrack, searchArchive, type ArchiveFile, type ArchiveItem } from '@/studio/audio/library'
import { ContentStudio } from '@/studio/content/api'
/** Provider keys live in the browser, next to the Anthropic key. */
const KEYS = 'bloub-studio-audio-keys'
export interface AudioKeys {
  openai: string
  elevenlabs: string
}
function loadKeys(): AudioKeys {
  try {
    const raw = localStorage.getItem(KEYS)
    if (raw) {
      const k = JSON.parse(raw) as Partial<AudioKeys>
      return { openai: typeof k.openai === 'string' ? k.openai : '', elevenlabs: typeof k.elevenlabs === 'string' ? k.elevenlabs : '' }
    }
  } catch {
    /* optional */
  }
  return { openai: '', elevenlabs: '' }
}
export interface VoiceProgress {
  running: boolean
  done: number
  total: number
  current: string
}
/**
 * The audio side of the store: keeps the mix of the active project rendered
 * (debounced, offline), plays it under the viewport, generates voices and
 * imports music. Project edits go through the `editProject` the store hands in.
 */
export function useAudio(project: Ref<ContentProject>, editProject: (fn: (studio: ContentStudio) => void, note?: string) => boolean, message: Ref<string>) {
  const keys = ref<AudioKeys>(loadKeys())
  watch(
    keys,
    (k) => {
      try {
        localStorage.setItem(KEYS, JSON.stringify(k))
      } catch {
        /* optional */
      }
    },
    { deep: true }
  )
  const player = new AudioPreview()
  const muted = ref(false)
  const mixing = ref(false)
  const missing = ref<string[]>([])
  const mix = shallowRef<AudioBuffer>()
  const voiceProgress = ref<VoiceProgress>({ running: false, done: 0, total: 0, current: '' })
  let voiceAbort: AbortController | undefined
  let mixTimer: ReturnType<typeof setTimeout>
  let mixVersion = 0
  const plan = computed(() => mixPlan({ scene: project.value.scene, audio: project.value.audio, voice: project.value.voice, dialogue: project.value.dialogue }))
  const planKey = computed(() => JSON.stringify(plan.value))
  const hasSound = computed(() => plan.value.music.track !== 'none' || !!plan.value.ambience || plan.value.sfx.length > 0 || plan.value.voice.length > 0)
  async function rebuild() {
    const version = ++mixVersion
    mixing.value = true
    try {
      const result = await renderMix(plan.value, async (hash) => {
        const buffer = await decodeClip(hash)
        return buffer && clipOf(buffer)
      })
      if (version !== mixVersion) return
      mix.value = result.buffer
      missing.value = result.missing
      player.setBuffer(result.buffer)
    } catch (e) {
      if (version === mixVersion) message.value = `Mix failed: ${e instanceof Error ? e.message : String(e)}`
    } finally {
      if (version === mixVersion) mixing.value = false
    }
  }
  watch(
    planKey,
    () => {
      clearTimeout(mixTimer)
      mixTimer = setTimeout(rebuild, 250)
    },
    { immediate: true }
  )
  function play(at: number) {
    player.play(at)
  }
  function stop() {
    player.stop()
  }
  function toggleMute() {
    muted.value = !muted.value
    player.muted = muted.value
    if (muted.value) player.stop()
  }
  /** The mix as it stands, rendered now if a rebuild is pending; what the exporter embeds. */
  async function currentMix() {
    clearTimeout(mixTimer)
    await rebuild()
    return mix.value
  }
  const providerKey = computed(() => {
    const p = project.value.voice.provider
    return p === 'openai' ? keys.value.openai : p === 'elevenlabs' ? keys.value.elevenlabs : ''
  })
  const voicedLines = computed(() => project.value.dialogue.filter((d) => d.audio).length)
  /** Synthesises every line that has no clip for its current text and voice; re-times the beats as clips land. */
  async function generateVoices(force = false) {
    const p = project.value
    if (p.voice.provider === 'none') {
      message.value = 'Choose a voice provider first.'
      return
    }
    if (!providerKey.value) {
      message.value = `Add your ${p.voice.provider === 'openai' ? 'OpenAI' : 'ElevenLabs'} API key.`
      return
    }
    if (voiceProgress.value.running) return
    const lines = [...p.dialogue].sort((a, b) => a.start - b.start).filter((d) => force || !d.audio)
    if (!lines.length) {
      message.value = 'Every line already has a voice.'
      return
    }
    voiceAbort = new AbortController()
    voiceProgress.value = { running: true, done: 0, total: lines.length, current: '' }
    const model = p.voice.model || DEFAULT_MODELS[p.voice.provider]
    try {
      for (const line of lines) {
        const member = p.cast.find((c) => c.role === line.speaker)
        if (!member) continue
        const defaults = VOICE_DEFAULTS[member.kind]
        const voice = p.voice.voices[member.role] || (p.voice.provider === 'openai' ? defaults.openai : '')
        if (!voice) throw new Error(`No voice id for ${member.name} (ElevenLabs needs one per role).`)
        voiceProgress.value = { ...voiceProgress.value, current: `${member.name}: ${line.text.slice(0, 40)}` }
        const audio = await synthesizeLine(
          {
            provider: p.voice.provider,
            apiKey: providerKey.value,
            model,
            voice,
            language: p.voice.language,
            instructions: p.voice.instructions[member.role] ?? defaults.instructions[p.voice.language],
            text: line.text
          },
          voiceAbort.signal
        )
        editProject((s) => {
          s.attachVoice(line.id, audio)
          s.compileTimeline()
        })
        voiceProgress.value = { ...voiceProgress.value, done: voiceProgress.value.done + 1 }
      }
      message.value = `${lines.length} voice${lines.length > 1 ? 's' : ''} generated; the beats were re-timed to the clips.`
    } catch (e) {
      message.value = voiceAbort.signal.aborted ? 'Voice generation cancelled' : `Voice failed: ${e instanceof Error ? e.message : String(e)}`
    } finally {
      voiceProgress.value = { ...voiceProgress.value, running: false }
    }
  }
  function cancelVoices() {
    voiceAbort?.abort()
  }
  function clearVoices() {
    editProject((s) => {
      s.clearVoice()
      s.compileTimeline()
    }, 'Voices removed; lines timed by reading speed again')
  }
  async function importMusicFile(file: File) {
    try {
      const custom = await importMusic(file)
      editProject((s) => s.setAudio({ music: { track: 'custom', volume: s.project.audio.music.volume, custom } }), `Music: ${custom.name}`)
    } catch (e) {
      message.value = e instanceof Error ? e.message : String(e)
    }
  }
  // --- Real music: the curated shelf and the Internet Archive search, both fetched by the browser.
  const downloading = ref<{ running: boolean; fraction: number; label: string }>({ running: false, fraction: 0, label: '' })
  const archiveItems = ref<ArchiveItem[]>([])
  const archiveFilesOf = ref<{ item: ArchiveItem; files: ArchiveFile[] } | null>(null)
  const searching = ref(false)
  let downloadAbort: AbortController | undefined
  async function adoptTrack(url: string, name: string, extra: { credit?: string; license?: string }) {
    if (downloading.value.running) return
    downloadAbort = new AbortController()
    downloading.value = { running: true, fraction: 0, label: name }
    try {
      const bytes = await fetchTrack(url, (f) => (downloading.value = { ...downloading.value, fraction: f }), fetch, downloadAbort.signal)
      const custom = await storeTrack(url, bytes, name, extra)
      editProject((s) => s.setAudio({ music: { track: 'custom', volume: s.project.audio.music.volume, custom } }), `Music: ${name}`)
    } catch (e) {
      message.value = downloadAbort.signal.aborted ? 'Download cancelled' : `Music failed: ${e instanceof Error ? e.message : String(e)}`
    } finally {
      downloading.value = { ...downloading.value, running: false }
    }
  }
  function useLibraryTrack(id: string) {
    const t = libraryTrack(id)
    if (t) void adoptTrack(t.url, `${t.title} · ${t.artist}`, { credit: t.credit, license: t.license })
  }
  function cancelDownload() {
    downloadAbort?.abort()
  }
  async function search(query: string) {
    if (!query.trim() || searching.value) return
    searching.value = true
    archiveFilesOf.value = null
    try {
      archiveItems.value = await searchArchive(query)
      if (!archiveItems.value.length) message.value = 'No commercially usable match on the Internet Archive.'
    } catch (e) {
      message.value = e instanceof Error ? e.message : String(e)
    } finally {
      searching.value = false
    }
  }
  async function openItem(item: ArchiveItem) {
    try {
      archiveFilesOf.value = { item, files: await archiveFiles(item.identifier) }
      if (!archiveFilesOf.value.files.length) message.value = 'No usable mp3 in this item.'
    } catch (e) {
      message.value = e instanceof Error ? e.message : String(e)
    }
  }
  function useArchiveFile(item: ArchiveItem, file: ArchiveFile) {
    void adoptTrack(file.url, `${file.title}${item.creator ? ` · ${item.creator}` : ''}`, { credit: archiveCredit(item, file), license: item.license })
  }
  onBeforeUnmount(() => player.dispose())
  return { keys, muted, mixing, missing, mix, plan, hasSound, voiceProgress, providerKey, voicedLines, play, stop, toggleMute, currentMix, generateVoices, cancelVoices, clearVoices, importMusicFile, downloading, archiveItems, archiveFilesOf, searching, useLibraryTrack, cancelDownload, search, openItem, useArchiveFile }
}
export type StudioAudio = ReturnType<typeof useAudio>
