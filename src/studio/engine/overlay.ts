import type { SceneData } from '../scene/model'
import { dialogueAt } from '../timeline/evaluate'
/**
 * 2D layer composited over the 3D frame: captions, and editor guides.
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
  const portrait = height > width
  const unit = Math.min(width, height)
  if (editor && portrait) {
    // Keep-out bands of the typical vertical-video UI.
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fillRect(0, 0, width, height * 0.1)
    ctx.fillRect(0, height * 0.82, width, height * 0.18)
  }
  const dialogues = dialogueAt(scene, time)
  let bottom = portrait ? height * 0.78 : height * 0.88
  for (const d of dialogues.reverse()) {
    const fontSize = Math.round(unit * (portrait ? 0.05 : 0.046))
    const fade = Math.min(1, d.since / 0.16, d.remaining / 0.16)
    const pop = 0.97 + 0.03 * Math.min(1, d.since / 0.22)
    ctx.save()
    ctx.globalAlpha = fade
    ctx.font = `700 ${fontSize}px Inter, "Segoe UI", system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    const lines = wrap(ctx, d.text, width * 0.8)
    const lineHeight = fontSize * 1.18
    const padX = fontSize * 0.7,
      padY = fontSize * 0.5
    const nameSize = Math.round(fontSize * 0.5)
    const boxW = Math.max(...lines.map((l) => ctx.measureText(l).width)) + padX * 2
    const boxH = lines.length * lineHeight + padY * 2 + nameSize * 1.4
    const cx = width / 2,
      y0 = bottom - boxH
    ctx.translate(cx, bottom)
    ctx.scale(pop, pop)
    ctx.translate(-cx, -bottom)
    ctx.fillStyle = 'rgba(12,12,18,0.66)'
    roundRect(ctx, cx - boxW / 2, y0, boxW, boxH, fontSize * 0.45)
    ctx.fill()
    ctx.fillStyle = d.character.color
    ctx.font = `800 ${nameSize}px Inter, "Segoe UI", system-ui, sans-serif`
    ctx.letterSpacing = `${nameSize * 0.12}px`
    ctx.fillText(d.character.name.toUpperCase(), cx, y0 + padY + nameSize * 0.9)
    ctx.letterSpacing = '0px'
    ctx.fillStyle = '#fbf8f2'
    ctx.font = `700 ${fontSize}px Inter, "Segoe UI", system-ui, sans-serif`
    lines.forEach((line, i) =>
      ctx.fillText(line, cx, y0 + padY + nameSize * 1.4 + (i + 1) * lineHeight - fontSize * 0.25)
    )
    ctx.restore()
    bottom = y0 - fontSize * 0.4
  }
}
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(/\s+/),
    lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > max && line) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
