import type { SceneData } from '../scene/model'
import { dialogueAt, type ActiveDialogue } from '../timeline/evaluate'
import { wordTimings } from './timing'
import { SAFE_BOTTOM, SAFE_TOP } from './style'
/**
 * Draws the subtitles for `time` into a 2D context. Pure function of
 * (scene, time, size): the viewport and the exporter get the same pixels.
 */
export function drawSubtitles(ctx: CanvasRenderingContext2D, scene: SceneData, time: number, width: number, height: number) {
  const style = scene.subtitles
  if (!style.enabled) return
  const dialogues = dialogueAt(scene, time)
  if (!dialogues.length) return
  const portrait = height > width
  const unit = Math.min(width, height)
  const fontSize = Math.round(unit * style.size)
  const baseline = Math.min(height * SAFE_BOTTOM - fontSize * 0.4, height * (portrait ? style.positionPortrait : style.positionLandscape))
  let bottom = Math.max(height * SAFE_TOP + fontSize * 2, baseline)
  for (const d of [...dialogues].reverse()) {
    if (style.mode === 'caption') bottom = caption(ctx, d, style, bottom, width, fontSize) - fontSize * 0.4
    else bottom = words(ctx, d, time, style, bottom, width, fontSize) - fontSize * 0.5
  }
}
type Style = SceneData['subtitles']
function words(ctx: CanvasRenderingContext2D, d: ActiveDialogue, time: number, style: Style, bottom: number, width: number, fontSize: number) {
  const line = d.line
  const timed = wordTimings(line.text, line.time, line.duration, style.wordsPerLine)
  let current = timed[0]
  for (const w of timed) if (time >= w.start) current = w
  if (!current) return bottom
  const chunk = timed.filter((w) => w.chunk === current.chunk)
  const chunkStart = chunk[0]!.start
  const since = time - chunkStart
  const entrance = style.entrance === 'none' ? 1 : Math.min(1, since / 0.14)
  const pop = style.entrance === 'pop' ? 0.92 + 0.08 * (1 - (1 - entrance) * (1 - entrance)) : 1
  ctx.save()
  ctx.globalAlpha = style.entrance === 'fade' ? entrance : 1
  ctx.font = `${style.weight} ${fontSize}px ${style.font}`
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.lineJoin = 'round'
  const texts = chunk.map((w) => (style.uppercase ? w.text.toUpperCase() : w.text))
  const gap = fontSize * 0.32
  const widths = texts.map((t) => ctx.measureText(t).width)
  // Wrap the chunk into rows that fit the safe width; rows stack upward from the baseline.
  const maxWidth = width * style.maxWidth
  const rows: number[][] = [[]]
  let rowWidth = 0
  texts.forEach((_, i) => {
    const w = widths[i]!
    const next = rowWidth ? rowWidth + gap + w : w
    if (next > maxWidth && rows.at(-1)!.length) {
      rows.push([i])
      rowWidth = w
    } else {
      rows.at(-1)!.push(i)
      rowWidth = next
    }
  })
  const lineHeight = fontSize * 1.16
  const top = bottom - rows.length * lineHeight
  const cx = width / 2,
    cy = (top + bottom) / 2
  ctx.translate(cx, cy)
  ctx.scale(pop, pop)
  ctx.translate(-cx, -cy)
  rows.forEach((row, r) => {
    const total = row.reduce((a, i) => a + widths[i]!, 0) + gap * (row.length - 1)
    let x = cx - total / 2
    const y = top + (r + 1) * lineHeight - fontSize * 0.2
    for (const i of row) {
      const active = chunk[i] === current
      ctx.lineWidth = fontSize * 0.16
      ctx.strokeStyle = style.stroke
      ctx.strokeText(texts[i]!, x, y)
      ctx.fillStyle = active ? style.highlight : style.color
      ctx.fillText(texts[i]!, x, y)
      x += widths[i]! + gap
    }
  })
  if (style.speakerLabel) {
    const nameSize = Math.round(fontSize * 0.42)
    ctx.font = `${style.weight} ${nameSize}px ${style.font}`
    ctx.textAlign = 'center'
    ctx.lineWidth = nameSize * 0.2
    ctx.strokeStyle = style.stroke
    ctx.strokeText(d.character.name.toUpperCase(), cx, top - nameSize * 0.5)
    ctx.fillStyle = d.character.color
    ctx.fillText(d.character.name.toUpperCase(), cx, top - nameSize * 0.5)
  }
  ctx.restore()
  return top - (style.speakerLabel ? fontSize * 0.6 : 0)
}
function caption(ctx: CanvasRenderingContext2D, d: ActiveDialogue, style: Style, bottom: number, width: number, fontSize: number) {
  const fade = Math.min(1, d.since / 0.16, d.remaining / 0.16)
  const pop = 0.97 + 0.03 * Math.min(1, d.since / 0.22)
  ctx.save()
  ctx.globalAlpha = fade
  ctx.font = `${style.weight} ${fontSize}px ${style.font}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const lines = wrap(ctx, style.uppercase ? d.text.toUpperCase() : d.text, width * style.maxWidth)
  const lineHeight = fontSize * 1.18
  const padX = fontSize * 0.7,
    padY = fontSize * 0.5
  const nameSize = style.speakerLabel ? Math.round(fontSize * 0.5) : 0
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
  if (style.speakerLabel) {
    ctx.fillStyle = d.character.color
    ctx.font = `800 ${nameSize}px ${style.font}`
    ctx.letterSpacing = `${nameSize * 0.12}px`
    ctx.fillText(d.character.name.toUpperCase(), cx, y0 + padY + nameSize * 0.9)
    ctx.letterSpacing = '0px'
  }
  ctx.fillStyle = style.color
  ctx.font = `${style.weight} ${fontSize}px ${style.font}`
  lines.forEach((line, i) => ctx.fillText(line, cx, y0 + padY + nameSize * 1.4 + (i + 1) * lineHeight - fontSize * 0.25))
  ctx.restore()
  return y0
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
