import { OUTPUT_SIZE, type SceneData } from '../scene/model'
import type { SceneEngine } from '../engine/SceneEngine'
export class ExportCancelled extends Error {
  constructor() {
    super('Export cancelled')
  }
}
export interface ExportProgress {
  done: number
  total: number
}
/**
 * Walks the timeline frame by frame through `engine.capture()` and streams each
 * frame into an MP4 (H.264, plus an AAC track when a mix is given). mediabunny is loaded on demand: it only costs
 * bytes the day someone exports. Awaiting every `add` is what bounds memory.
 */
export async function renderVideo(
  engine: SceneEngine,
  scene: SceneData,
  onProgress?: (p: ExportProgress) => void,
  signal?: AbortSignal,
  audio?: AudioBuffer
): Promise<Blob> {
  const { AudioBufferSource, BufferTarget, CanvasSource, Mp4OutputFormat, Output, Quality } = await import('mediabunny')
  const [width, height] = OUTPUT_SIZE[scene.aspect]
  const fps = Math.min(60, Math.max(1, Math.round(scene.fps)))
  const total = Math.max(1, Math.round(scene.duration * fps))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() })
  const source = new CanvasSource(canvas, {
    codec: 'avc',
    quality: new Quality({ quantizer: 20, bitrate: 14_000_000 })
  })
  output.addVideoTrack(source, { frameRate: fps })
  // The mix is rendered offline beforehand; it is the same buffer the preview plays.
  const audioSource = audio ? new AudioBufferSource({ codec: 'aac', bitrate: 160_000 }) : undefined
  if (audioSource) output.addAudioTrack(audioSource)
  await output.start()
  if (audioSource && audio) await audioSource.add(audio)
  const capture = engine.capture(width, height)
  try {
    for (let i = 0; i < total; i++) {
      if (signal?.aborted) throw new ExportCancelled()
      capture.frame(i / fps, ctx)
      await source.add(i / fps, 1 / fps)
      onProgress?.({ done: i + 1, total })
    }
    await output.finalize()
    const buffer = output.target.buffer
    if (!buffer) throw new Error('Empty MP4 output')
    return new Blob([buffer], { type: 'video/mp4' })
  } catch (e) {
    await output.cancel()
    throw e
  } finally {
    capture.end()
  }
}
/** One frame as a PNG, at the scene's output size. */
export function renderStill(engine: SceneEngine, scene: SceneData, time: number): Promise<Blob> {
  const [width, height] = OUTPUT_SIZE[scene.aspect]
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const capture = engine.capture(width, height)
  try {
    capture.frame(time, canvas.getContext('2d')!)
  } finally {
    capture.end()
  }
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed'))), 'image/png')
  )
}
export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
export function slug(name: string) {
  return name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'scene'
}
