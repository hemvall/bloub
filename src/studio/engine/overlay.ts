import type { SceneData } from '../scene/model'
import { drawSubtitles } from '../subtitles/draw'
import { SAFE_BOTTOM, SAFE_TOP } from '../subtitles/style'
/**
 * 2D layer composited over the 3D frame: subtitles, and editor guides.
 * Pure function of (scene, time, size), so the viewport and the video
 * exporter draw exactly the same thing.
 */
export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  scene: SceneData,
  time: number,
  width: number,
  height: number,
  editor = false
) {
  ctx.clearRect(0, 0, width, height)
  if (editor && height > width) {
    // Keep-out bands of the typical vertical-video UI.
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fillRect(0, 0, width, height * SAFE_TOP)
    ctx.fillRect(0, height * SAFE_BOTTOM, width, height * (1 - SAFE_BOTTOM))
  }
  drawSubtitles(ctx, scene, time, width, height)
}
