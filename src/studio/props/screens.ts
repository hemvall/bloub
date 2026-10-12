/**
 * Screen contents painted once into a canvas: the Lew product inside the story.
 * Each painter draws for any canvas size; ids are what the document stores.
 */
export type ScreenId = 'blank' | 'lew-dashboard' | 'agent-workflow' | 'crm' | 'chat' | 'terminal' | 'notification'
export const SCREEN_IDS: ScreenId[] = ['blank', 'lew-dashboard', 'agent-workflow', 'crm', 'chat', 'terminal', 'notification']
export const SCREEN_LABELS: Record<ScreenId, string> = {
  blank: 'Blank',
  'lew-dashboard': 'Lew workspace',
  'agent-workflow': 'Agent workflow',
  crm: 'CRM table',
  chat: 'Chat',
  terminal: 'Terminal',
  notification: 'Lew notification'
}
export function isScreenId(value: string): value is ScreenId {
  return (SCREEN_IDS as string[]).includes(value)
}
export function isScreenImage(value: string) {
  return /^data:image\/(png|jpeg|webp);base64,/.test(value)
}
const BG = '#0f1218',
  PANEL = '#171c25',
  LINE = '#2a3140',
  TEXT = '#dfe4ec',
  MUTED = '#7d8696',
  ACCENT = '#f6b042',
  BLUE = '#5fb0e6',
  GREEN = '#7fc98c'
function font(ctx: CanvasRenderingContext2D, size: number, weight = 500, mono = false) {
  ctx.font = `${weight} ${size}px ${mono ? 'ui-monospace, Menlo, Consolas, monospace' : 'Inter, "Segoe UI", system-ui, sans-serif'}`
}
function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
}
function wordmark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  font(ctx, size, 800)
  ctx.fillStyle = TEXT
  ctx.fillText('Lew', x, y)
  const w = ctx.measureText('Lew').width
  ctx.fillStyle = ACCENT
  ctx.beginPath()
  ctx.arc(x + w + size * 0.3, y - size * 0.3, size * 0.14, 0, Math.PI * 2)
  ctx.fill()
}
export function paintScreen(id: ScreenId, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!
  const W = canvas.width,
    H = canvas.height,
    u = Math.min(W, H) / 320
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, H)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  switch (id) {
    case 'blank': {
      const g = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.7)
      g.addColorStop(0, '#1b2230')
      g.addColorStop(1, BG)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
      break
    }
    case 'lew-dashboard': {
      const side = W * 0.24
      ctx.fillStyle = PANEL
      ctx.fillRect(0, 0, side, H)
      wordmark(ctx, 16 * u, 34 * u, 20 * u)
      font(ctx, 11 * u, 500)
      const items = ['Agents', 'Workflows', 'Knowledge', 'Integrations', 'Evals']
      items.forEach((label, i) => {
        if (i === 0) rounded(ctx, 10 * u, (56 + i * 26) * u, side - 20 * u, 22 * u, 5 * u, '#232a37')
        ctx.fillStyle = i === 0 ? TEXT : MUTED
        ctx.fillText(label, 20 * u, (71 + i * 26) * u)
      })
      font(ctx, 14 * u, 700)
      ctx.fillStyle = TEXT
      ctx.fillText('Agents', side + 18 * u, 32 * u)
      const rows = [
        ['Sales follow-up', 'running', GREEN],
        ['Support triage', 'running', GREEN],
        ['CRM sync', 'idle', MUTED],
        ['Weekly report', 'scheduled', BLUE]
      ] as const
      rows.forEach(([name, status, color], i) => {
        const y = (48 + i * 40) * u
        rounded(ctx, side + 14 * u, y, W - side - 28 * u, 32 * u, 6 * u, PANEL, LINE)
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(side + 30 * u, y + 16 * u, 4 * u, 0, Math.PI * 2)
        ctx.fill()
        font(ctx, 11 * u, 600)
        ctx.fillStyle = TEXT
        ctx.fillText(name, side + 42 * u, y + 20 * u)
        font(ctx, 9 * u, 500)
        ctx.fillStyle = MUTED
        ctx.textAlign = 'right'
        ctx.fillText(status, W - 26 * u, y + 20 * u)
        ctx.textAlign = 'left'
      })
      const base = H - 24 * u
      for (let i = 0; i < 18; i++) {
        const h = (8 + Math.abs(Math.sin(i * 1.7)) * 34) * u
        ctx.fillStyle = i === 14 ? ACCENT : '#2c3647'
        ctx.fillRect(side + 18 * u + i * 13 * u, base - h, 8 * u, h)
      }
      break
    }
    case 'agent-workflow': {
      const nodes: [string, number, number, string][] = [
        ['Trigger', 0.14, 0.5, BLUE],
        ['Agent', 0.4, 0.5, ACCENT],
        ['CRM', 0.68, 0.24, GREEN],
        ['Email', 0.68, 0.5, GREEN],
        ['Slack', 0.68, 0.76, GREEN],
        ['Done', 0.9, 0.5, MUTED]
      ]
      const links: [number, number][] = [
        [0, 1],
        [1, 2],
        [1, 3],
        [1, 4],
        [2, 5],
        [3, 5],
        [4, 5]
      ]
      ctx.strokeStyle = '#3a4a62'
      ctx.lineWidth = 2 * u
      for (const [a, b] of links) {
        const A = nodes[a]!,
          B = nodes[b]!
        ctx.beginPath()
        ctx.moveTo(A[1] * W, A[2] * H)
        ctx.bezierCurveTo((A[1] + 0.12) * W, A[2] * H, (B[1] - 0.12) * W, B[2] * H, B[1] * W, B[2] * H)
        ctx.stroke()
      }
      for (const [label, x, y, color] of nodes) {
        const w = 64 * u,
          h = 28 * u
        rounded(ctx, x * W - w / 2, y * H - h / 2, w, h, 7 * u, PANEL, color)
        font(ctx, 10 * u, 600)
        ctx.fillStyle = TEXT
        ctx.textAlign = 'center'
        ctx.fillText(label, x * W, y * H + 4 * u)
      }
      ctx.textAlign = 'left'
      wordmark(ctx, 14 * u, 26 * u, 14 * u)
      font(ctx, 9 * u, 500)
      ctx.fillStyle = MUTED
      ctx.fillText('workflow · sales-followup · run #482', 14 * u, H - 12 * u)
      break
    }
    case 'crm': {
      font(ctx, 13 * u, 700)
      ctx.fillStyle = TEXT
      ctx.fillText('Deals', 16 * u, 28 * u)
      const cols = ['Company', 'Owner', 'Stage', 'Value']
      const xs = [0.05, 0.4, 0.62, 0.84]
      font(ctx, 9 * u, 600)
      ctx.fillStyle = MUTED
      cols.forEach((c, i) => ctx.fillText(c.toUpperCase(), xs[i]! * W, 50 * u))
      const rows = [
        ['Northwind Logistics', 'Ana', 'Proposal', '48k'],
        ['Blue Harbor Clinics', 'Marc', 'Qualified', '22k'],
        ['Kestrel Robotics', 'Ana', 'Negotiation', '91k'],
        ['Orchard Retail', 'Sam', 'Won', '35k'],
        ['Helix Legal', 'Marc', 'New', '12k'],
        ['Tandem Energy', 'Sam', 'Proposal', '63k']
      ]
      rows.forEach((r, i) => {
        const y = (62 + i * 30) * u
        ctx.fillStyle = i % 2 ? PANEL : BG
        ctx.fillRect(0, y, W, 30 * u)
        font(ctx, 10 * u, 500)
        r.forEach((cell, j) => {
          if (j === 2) {
            const color = cell === 'Won' ? GREEN : cell === 'New' ? MUTED : BLUE
            rounded(ctx, xs[j]! * W - 4 * u, y + 8 * u, 58 * u, 14 * u, 7 * u, '#1f2733')
            ctx.fillStyle = color
          } else ctx.fillStyle = TEXT
          ctx.fillText(cell, xs[j]! * W, y + 19 * u)
        })
      })
      break
    }
    case 'chat': {
      const bubbles: [string, boolean][] = [
        ['Can you summarise our Q3 pipeline?', true],
        ['Sure. 14 open deals, 310k weighted.', false],
        ['Which ones are stuck?', true],
        ['Three have had no activity for 12 days. Want me to draft follow-ups?', false]
      ]
      let y = 24 * u
      font(ctx, 10 * u, 500)
      for (const [text, mine] of bubbles) {
        const w = Math.min(W * 0.72, ctx.measureText(text).width + 24 * u)
        const x = mine ? W - w - 14 * u : 14 * u
        rounded(ctx, x, y, w, 26 * u, 10 * u, mine ? '#2e4a66' : PANEL)
        ctx.fillStyle = TEXT
        ctx.fillText(text, x + 12 * u, y + 17 * u, w - 24 * u)
        y += 36 * u
      }
      rounded(ctx, 14 * u, H - 34 * u, W - 28 * u, 22 * u, 11 * u, PANEL, LINE)
      ctx.fillStyle = MUTED
      ctx.fillText('Message…', 26 * u, H - 19 * u)
      break
    }
    case 'terminal': {
      ctx.fillStyle = '#0a0c10'
      ctx.fillRect(0, 0, W, H)
      font(ctx, 10 * u, 500, true)
      const lines: [string, string][] = [
        ['$ lew run sales-agent --env prod', TEXT],
        ['→ loading tools: crm, email, calendar', MUTED],
        ['→ 14 leads fetched', MUTED],
        ['✓ 9 follow-ups drafted', GREEN],
        ['✓ 3 meetings proposed', GREEN],
        ['! 2 leads need a human', ACCENT],
        ['$ lew eval sales-agent --last', TEXT],
        ['pass 46/48 · p95 latency 3.1s', MUTED],
        ['$ _', TEXT]
      ]
      lines.forEach(([text, color], i) => {
        ctx.fillStyle = color
        ctx.fillText(text, 14 * u, (24 + i * 16) * u)
      })
      break
    }
    case 'notification': {
      const g = ctx.createLinearGradient(0, 0, W, H)
      g.addColorStop(0, '#1a2233')
      g.addColorStop(1, '#0e121a')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
      const w = Math.min(W * 0.62, 230 * u),
        h = 54 * u,
        x = W - w - 16 * u,
        y = 16 * u
      rounded(ctx, x, y, w, h, 10 * u, '#1d2330', LINE)
      ctx.fillStyle = ACCENT
      ctx.beginPath()
      ctx.arc(x + 20 * u, y + 27 * u, 9 * u, 0, Math.PI * 2)
      ctx.fill()
      font(ctx, 10 * u, 700)
      ctx.fillStyle = TEXT
      ctx.fillText('Lew · Sales agent', x + 38 * u, y + 22 * u)
      font(ctx, 9 * u, 500)
      ctx.fillStyle = MUTED
      ctx.fillText('Done: 12 leads updated in the CRM.', x + 38 * u, y + 40 * u, w - 50 * u)
      break
    }
  }
}
/** Whiteboard marker drawing: the "agent in the middle" diagram Lew keeps redrawing. */
export function paintWhiteboard(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!
  const W = canvas.width,
    H = canvas.height,
    u = Math.min(W, H) / 320
  ctx.fillStyle = '#f7f6f1'
  ctx.fillRect(0, 0, W, H)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 3 * u
  const node = (x: number, y: number, label: string, color: string) => {
    ctx.strokeStyle = color
    ctx.beginPath()
    ctx.ellipse(x * W, y * H, 46 * u, 22 * u, 0, 0, Math.PI * 2)
    ctx.stroke()
    font(ctx, 12 * u, 600)
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.fillText(label, x * W, y * H + 4 * u)
  }
  const arrow = (x1: number, y1: number, x2: number, y2: number, color: string) => {
    ctx.strokeStyle = color
    ctx.beginPath()
    ctx.moveTo(x1 * W, y1 * H)
    ctx.lineTo(x2 * W, y2 * H)
    ctx.stroke()
    const a = Math.atan2((y2 - y1) * H, (x2 - x1) * W)
    ctx.beginPath()
    ctx.moveTo(x2 * W, y2 * H)
    ctx.lineTo(x2 * W - Math.cos(a - 0.5) * 10 * u, y2 * H - Math.sin(a - 0.5) * 10 * u)
    ctx.moveTo(x2 * W, y2 * H)
    ctx.lineTo(x2 * W - Math.cos(a + 0.5) * 10 * u, y2 * H - Math.sin(a + 0.5) * 10 * u)
    ctx.stroke()
  }
  const ink = '#24324a',
    red = '#c24b3a',
    green = '#2f7a4e'
  node(0.5, 0.5, 'agent', red)
  node(0.18, 0.28, 'user', ink)
  node(0.82, 0.24, 'CRM', green)
  node(0.84, 0.56, 'email', green)
  node(0.8, 0.84, 'docs', green)
  node(0.2, 0.78, 'memory', ink)
  arrow(0.26, 0.34, 0.41, 0.45, ink)
  arrow(0.58, 0.44, 0.73, 0.29, ink)
  arrow(0.6, 0.52, 0.74, 0.55, ink)
  arrow(0.58, 0.57, 0.71, 0.78, ink)
  arrow(0.42, 0.56, 0.29, 0.72, ink)
  font(ctx, 13 * u, 700)
  ctx.fillStyle = red
  ctx.textAlign = 'left'
  ctx.fillText('chatbot ≠ agent', 14 * u, 30 * u)
  ctx.strokeStyle = red
  ctx.beginPath()
  ctx.moveTo(14 * u, 36 * u)
  ctx.lineTo(118 * u, 38 * u)
  ctx.stroke()
}
