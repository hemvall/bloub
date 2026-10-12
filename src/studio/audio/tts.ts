import type { CharacterKind } from '../scene/model'
import { envelopeOf, VOICE_TAIL, type ContentLanguage, type LineAudio, type TtsProvider } from './plan'
import { decodeClip, forgetDecoded, hasClip, putClip, sha256 } from './store'
import { clipOf } from './mix'
/**
 * Text to speech through the user's own provider key, from the browser. Two
 * providers are wired: OpenAI (`/v1/audio/speech`, reads delivery instructions)
 * and ElevenLabs (`/v1/text-to-speech`). Nothing is synthesised locally: without
 * a key the lines stay timed by reading speed and the render stays silent.
 */
export interface TtsRequest {
  provider: TtsProvider
  apiKey: string
  model: string
  voice: string
  language: ContentLanguage
  instructions?: string
  text: string
}
export const OPENAI_VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse']
export const DEFAULT_MODELS: Record<TtsProvider, string> = { none: '', openai: 'gpt-4o-mini-tts', elevenlabs: 'eleven_multilingual_v2' }
/** A starting voice and delivery per character kind; the user can override both per role. */
export const VOICE_DEFAULTS: Record<CharacterKind, { openai: string; instructions: Record<ContentLanguage, string> }> = {
  lew: {
    openai: 'ash',
    instructions: {
      fr: 'Voix masculine calme et posée, débit lent, légèrement sarcastique, articulation nette, aucune emphase inutile.',
      en: 'Calm, deadpan male voice, slow delivery, slightly sarcastic, crisp articulation, no hype.'
    }
  },
  ceo: {
    openai: 'echo',
    instructions: {
      fr: 'Voix masculine assurée et énergique, un peu trop sûre d’elle, parfois déroutée.',
      en: 'Confident, energetic male voice, a little too sure of himself, sometimes thrown.'
    }
  },
  dev: {
    openai: 'sage',
    instructions: {
      fr: 'Voix fatiguée, blasée, monotone, un peu nasale, comme après une nuit de debug.',
      en: 'Tired, blunt, monotone voice, like after a night of debugging.'
    }
  },
  kit: { openai: 'onyx', instructions: { fr: 'Voix basse, lasse, ironique.', en: 'Low, weary, ironic voice.' } },
  pip: { openai: 'coral', instructions: { fr: 'Voix aiguë, enjouée, curieuse.', en: 'High, bright, curious voice.' } },
  bo: { openai: 'fable', instructions: { fr: 'Voix grave, lente, rassurante.', en: 'Deep, slow, reassuring voice.' } }
}
export function clipKey(r: TtsRequest) {
  return sha256([r.provider, r.model, r.voice, r.language, r.instructions ?? '', r.text].join(''))
}
async function fetchBytes(r: TtsRequest, signal?: AbortSignal): Promise<ArrayBuffer> {
  let response: Response
  if (r.provider === 'openai') {
    response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      signal,
      headers: { Authorization: `Bearer ${r.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: r.model, voice: r.voice, input: r.text, response_format: 'mp3', ...(r.instructions && { instructions: r.instructions }) })
    })
  } else if (r.provider === 'elevenlabs') {
    response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(r.voice)}?output_format=mp3_44100_128`, {
      method: 'POST',
      signal,
      headers: { 'xi-api-key': r.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: r.text, model_id: r.model, language_code: r.language })
    })
  } else throw new Error('No voice provider selected')
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`${r.provider} ${response.status}: ${detail.slice(0, 200) || response.statusText}`)
  }
  return response.arrayBuffer()
}
/** Synthesises one line unless the same request was already stored; returns what the project keeps. */
export async function synthesizeLine(r: TtsRequest, signal?: AbortSignal): Promise<LineAudio> {
  const hash = await clipKey(r)
  if (!(await hasClip(hash))) {
    const bytes = await fetchBytes(r, signal)
    await putClip(hash, bytes)
    forgetDecoded(hash)
  }
  const buffer = await decodeClip(hash)
  if (!buffer) throw new Error('Clip could not be decoded')
  return { hash, duration: Math.round((buffer.duration + VOICE_TAIL) * 100) / 100, envelope: envelopeOf(clipOf(buffer).samples, buffer.sampleRate) }
}
/** A track fetched from a URL: stored under the URL's hash, decoded once to measure it. */
export async function storeTrack(url: string, bytes: ArrayBuffer, name: string, extra: { credit?: string; license?: string }) {
  const hash = await sha256(`track\u001f${url}`)
  await putClip(hash, bytes)
  forgetDecoded(hash)
  const buffer = await decodeClip(hash)
  if (!buffer) throw new Error('This track could not be decoded as audio')
  return { hash, name, duration: Math.round(buffer.duration * 10) / 10, url, ...extra }
}
/** An imported music file: stored under its content hash, decoded once to measure it. */
export async function importMusic(file: File) {
  const bytes = await file.arrayBuffer()
  const hash = await sha256(`music${file.name}${file.size}${file.lastModified}`)
  await putClip(hash, bytes)
  forgetDecoded(hash)
  const buffer = await decodeClip(hash)
  if (!buffer) throw new Error('This file could not be decoded as audio')
  return { hash, name: file.name, duration: Math.round(buffer.duration * 10) / 10 }
}
