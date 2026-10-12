import type { CharacterKind, EnvironmentId } from '../scene/model'
import type { OutputFormat } from '../render/presets'
import type { CastMember } from './project'
import { castMember } from './project'
/**
 * Content templates: a proven shape (scene, cast, shot structure, pacing) with
 * a sample script to replace. Instantiating one is `createProject` + `setScript`.
 */
export interface ContentTemplate {
  id: string
  name: string
  premise: string
  structure: string[]
  environment: EnvironmentId
  format: OutputFormat
  cast: CastMember[]
  /** Target length in seconds; the script below lands near it. */
  duration: number
  script: string
  tags: string[]
}
const lew = (mark?: string) => castMember('lew', { mark })
const ceo = (mark?: string) => castMember('ceo', { mark })
const dev = (mark?: string) => castMember('dev', { mark })
const extra = (kind: CharacterKind, role: string, name: string, mark?: string) => castMember(kind, { role, name, mark })
export const TEMPLATES: ContentTemplate[] = [
  {
    id: 'misconception',
    name: 'AI misconception',
    premise: 'CEO believes X → Lew explains why it is wrong → punchline.',
    structure: ['Two-shot: the belief, stated with confidence', 'Medium on Lew: one question that exposes the gap', 'Close-ups: the admission', 'Slow push on Lew: the punchline'],
    environment: 'office-night',
    format: 'reel',
    cast: [lew('desk'), ceo('guest')],
    duration: 20,
    tags: ['explainer', 'agents'],
    script: `CAMERA: two-shot Lew CEO
CEO (happy): "We put all our documents in a vector database. We have RAG now."

Lew looks at CEO.
CAMERA: medium Lew
LEW (deadpan): "Ask it which contract expires next month."

CAMERA: close-up CEO
CEO looks confused.
CEO: "It... gave me three different answers."

CAMERA: close-up Lew slow-push
LEW (smug): "Then you have a search box."

PAUSE 0.4

LEW: "Not a knowledge base."
`
  },
  {
    id: 'agent-demo',
    name: 'Agent demo',
    premise: 'Someone asks for something → the agent executes a workflow → result.',
    structure: ['Medium on the user: the request', 'Close-up on the screen: the agent working', 'Two-shot: the result, and what it means'],
    environment: 'office-night',
    format: 'reel',
    cast: [lew('desk'), extra('ceo', 'client', 'Client', 'guest')],
    duration: 22,
    tags: ['demo', 'product'],
    script: `CAMERA: two-shot Lew Client
CLIENT: "Can your agent follow up with the leads we haven't touched in two weeks?"

CAMERA: medium Lew
Lew looks at laptop.
LEW: "It's reading the CRM now."

PAUSE 0.6

LEW: "Fourteen leads. Nine drafts. Three meetings proposed."

CAMERA: close-up Client
CLIENT (surprised): "That took eleven seconds."

CAMERA: medium Lew slow-push
Lew looks at the camera.
LEW (smug): "It also logged everything. Ask your last intern to do that."
`
  },
  {
    id: 'before-after',
    name: 'Before / after',
    premise: 'The manual workflow, then the Lew workflow.',
    structure: ['Medium on the employee: the manual grind', 'Cut to Lew: the same task, automated', 'Close-up: the difference in one line'],
    environment: 'meeting-room',
    format: 'reel',
    cast: [extra('dev', 'ops', 'Ops', 'left'), lew('head')],
    duration: 20,
    tags: ['automation', 'workflow'],
    script: `CAMERA: medium Ops
OPS (tired): "Every Monday I copy the support tickets into a sheet, tag them, and email the summary."

Ops sighs.
OPS: "Takes me the whole morning."

CAMERA: medium Lew
LEW: "The agent reads the tickets, tags them, writes the summary and posts it in Slack."

PAUSE 0.3

CAMERA: close-up Lew
LEW (deadpan): "Monday morning is yours again."

CAMERA: close-up Ops
Ops looks surprised.
OPS: "What do I do with it?"

CAMERA: two-shot Lew Ops
LEW (smug): "Not that."
`
  },
  {
    id: 'dev-joke',
    name: 'Developer joke',
    premise: 'A developer asks the AI for something simple → chaos.',
    structure: ['Medium on the dev: the simple ask', 'Close-up on the screen: the escalation', 'Two-shot with Lew: the dry conclusion'],
    environment: 'ai-lab',
    format: 'reel',
    cast: [dev('left'), lew('right')],
    duration: 18,
    tags: ['humour', 'developers'],
    script: `CAMERA: medium Dev
DEV (tired): "I asked it to rename one variable."

PAUSE 0.3

DEV: "It refactored the whole module, added tests, and opened a pull request titled 'Modernize'."

CAMERA: close-up Lew
Lew looks at Dev.
LEW (deadpan): "Did the tests pass?"

CAMERA: close-up Dev
Dev looks away.
DEV: "...they pass now."

CAMERA: two-shot Lew Dev slow-push
LEW (smug): "That's not an agent. That's an intern with admin rights."
`
  },
  {
    id: 'business-pain',
    name: 'Business pain',
    premise: 'An employee doing a repetitive task → Lew automates it.',
    structure: ['Medium on the employee: the task, in numbers', 'Medium on Lew: what the agent does instead', 'Close-up: the payoff'],
    environment: 'meeting-room',
    format: 'reel',
    cast: [extra('ceo', 'sales', 'Sales', 'right'), lew('head')],
    duration: 20,
    tags: ['sales', 'automation'],
    script: `CAMERA: medium Sales
SALES: "After every call I update the CRM, write the follow-up and book the next step."

Sales sighs.
SALES: "Forty calls a week."

CAMERA: medium Lew
LEW: "The agent listens to the call, updates the CRM and drafts the follow-up before you hang up."

CAMERA: close-up Sales
SALES (surprised): "Before I hang up?"

CAMERA: close-up Lew slow-push
LEW (deadpan): "It types faster than you talk."
`
  },
  {
    id: 'explainer',
    name: 'Technical explanation',
    premise: 'One concept, one contrast, one line to remember.',
    structure: ['Medium on Lew: the term everyone uses', 'Two-shot: the question that separates the two', 'Close-up slow push: the definition in one sentence'],
    environment: 'ai-lab',
    format: 'reel',
    cast: [lew('center'), ceo('right')],
    duration: 22,
    tags: ['explainer', 'concepts'],
    script: `CAMERA: medium Lew
Lew looks at the camera.
LEW: "Everyone says 'agent'. Almost nobody means the same thing."

CAMERA: two-shot Lew CEO
CEO: "So what is one?"

CAMERA: medium Lew
LEW: "A chatbot answers. An agent decides what to do next, uses tools, and checks its own work."

CAMERA: close-up CEO
CEO looks confused.
CEO: "Checks its own work?"

CAMERA: close-up Lew slow-push
LEW (deadpan): "Yes. That's the part nobody demos."
`
  }
]
export function findTemplate(id: string) {
  return TEMPLATES.find((t) => t.id === id)
}
