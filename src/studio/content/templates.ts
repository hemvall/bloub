import type { CharacterKind, EnvironmentId } from '../scene/model'
import type { OutputFormat } from '../render/presets'
import type { ContentLanguage } from '../audio/plan'
import type { CastMember } from './project'
import { castMember } from './project'
/**
 * Content templates: a proven shape (scene, cast, shot structure, pacing) with
 * a sample script to replace, in English with a French version behind it.
 * Instantiating one is `createProject` + `setScript`.
 */
export interface ContentTemplate {
  id: string
  name: string
  premise: string
  structure: string[]
  environment: EnvironmentId
  format: OutputFormat
  cast: CastMember[]
  /** Target length in seconds; the scripts below land near it. */
  duration: number
  script: Record<ContentLanguage, string>
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
    premise: 'The CEO believes X, Lew explains why it is wrong, punchline.',
    structure: ['Two-shot: the belief, stated with confidence', 'Medium on Lew: one question that exposes the gap', 'Close-ups: the admission', 'Slow push on Lew: the punchline'],
    environment: 'office-night',
    format: 'reel',
    cast: [lew('desk'), ceo('guest')],
    duration: 20,
    tags: ['explainer', 'agents'],
    script: {
      en: `CAMERA: two-shot Lew CEO
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
`,
      fr: `CAMERA: two-shot Lew CEO
CEO (content): "On a mis tous nos documents dans une base vectorielle. On a du RAG maintenant."

Lew regarde le CEO.
CAMERA: medium Lew
LEW (impassible): "Demandez-lui quel contrat expire le mois prochain."

CAMERA: close-up CEO
Le CEO a l'air perdu.
CEO: "Il… m'a donné trois réponses différentes."

CAMERA: close-up Lew slow-push
LEW (narquois): "Alors vous avez un moteur de recherche."

PAUSE 0.4

LEW: "Pas une base de connaissances."
`
    }
  },
  {
    id: 'agent-demo',
    name: 'Agent demo',
    premise: 'Someone asks for something, the agent runs the workflow, result.',
    structure: ['Medium on the client: the request', 'Close-up on the screen: the agent at work', 'Two-shot: the result, and what it means'],
    environment: 'office-night',
    format: 'reel',
    cast: [lew('desk'), extra('ceo', 'client', 'Client', 'guest')],
    duration: 22,
    tags: ['demo', 'product'],
    script: {
      en: `CAMERA: two-shot Lew Client
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
`,
      fr: `CAMERA: two-shot Lew Client
CLIENT: "Votre agent peut relancer les prospects qu'on n'a pas touchés depuis deux semaines ?"

CAMERA: medium Lew
Lew regarde le laptop.
LEW: "Il est en train de lire le CRM."

PAUSE 0.6

LEW: "Quatorze prospects. Neuf brouillons. Trois rendez-vous proposés."

CAMERA: close-up Client
CLIENT (surpris): "Ça a pris onze secondes."

CAMERA: medium Lew slow-push
Lew regarde la caméra.
LEW (narquois): "Et il a tout journalisé. Demandez ça à votre dernier stagiaire."
`
    }
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
    script: {
      en: `CAMERA: medium Ops
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
`,
      fr: `CAMERA: medium Ops
OPS (fatigué): "Chaque lundi je copie les tickets support dans un tableur, je les tague, et j'envoie le résumé par mail."

Ops soupire.
OPS: "Ça me prend toute la matinée."

CAMERA: medium Lew
LEW: "L'agent lit les tickets, les tague, écrit le résumé et le poste sur Slack."

PAUSE 0.3

CAMERA: close-up Lew
LEW (impassible): "Le lundi matin est à vous."

CAMERA: close-up Ops
Ops a l'air surpris.
OPS: "Et j'en fais quoi ?"

CAMERA: two-shot Lew Ops
LEW (narquois): "Pas ça."
`
    }
  },
  {
    id: 'dev-joke',
    name: 'Developer joke',
    premise: 'A developer asks the AI for something simple, chaos.',
    structure: ['Medium on the dev: the simple ask', 'Close-up on the screen: the escalation', 'Two-shot with Lew: the dry conclusion'],
    environment: 'ai-lab',
    format: 'reel',
    cast: [dev('left'), lew('right')],
    duration: 18,
    tags: ['humour', 'developers'],
    script: {
      en: `CAMERA: medium Dev
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
`,
      fr: `CAMERA: medium Dev
DEV (fatigué): "Je lui ai demandé de renommer une variable."

PAUSE 0.3

DEV: "Il a refactoré tout le module, ajouté des tests, et ouvert une pull request intitulée « Modernisation »."

CAMERA: close-up Lew
Lew regarde Dev.
LEW (impassible): "Les tests passent ?"

CAMERA: close-up Dev
Dev détourne le regard.
DEV: "…ils passent maintenant."

CAMERA: two-shot Lew Dev slow-push
LEW (narquois): "C'est pas un agent. C'est un stagiaire avec les droits admin."
`
    }
  },
  {
    id: 'business-pain',
    name: 'Business pain',
    premise: 'An employee does a repetitive task, Lew automates it.',
    structure: ['Medium on the employee: the task, in numbers', 'Medium on Lew: what the agent does instead', 'Close-up: the payoff'],
    environment: 'meeting-room',
    format: 'reel',
    cast: [extra('ceo', 'sales', 'Sales', 'right'), lew('head')],
    duration: 20,
    tags: ['sales', 'automation'],
    script: {
      en: `CAMERA: medium Sales
SALES: "After every call I update the CRM, write the follow-up and book the next step."

Sales sighs.
SALES: "Forty calls a week."

CAMERA: medium Lew
LEW: "The agent listens to the call, updates the CRM and drafts the follow-up before you hang up."

CAMERA: close-up Sales
SALES (surprised): "Before I hang up?"

CAMERA: close-up Lew slow-push
LEW (deadpan): "It types faster than you talk."
`,
      fr: `CAMERA: medium Sales
SALES: "Après chaque appel je mets à jour le CRM, j'écris la relance et je cale la prochaine étape."

Sales soupire.
SALES: "Quarante appels par semaine."

CAMERA: medium Lew
LEW: "L'agent écoute l'appel, met à jour le CRM et rédige la relance avant que vous ayez raccroché."

CAMERA: close-up Sales
SALES (surpris): "Avant que j'aie raccroché ?"

CAMERA: close-up Lew slow-push
LEW (impassible): "Il tape plus vite que vous parlez."
`
    }
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
    script: {
      en: `CAMERA: medium Lew
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
`,
      fr: `CAMERA: medium Lew
Lew regarde la caméra.
LEW: "Tout le monde dit « agent ». Presque personne ne parle de la même chose."

CAMERA: two-shot Lew CEO
CEO: "C'est quoi, alors ?"

CAMERA: medium Lew
LEW: "Un chatbot répond. Un agent décide de la suite, utilise des outils, et vérifie son propre travail."

CAMERA: close-up CEO
Le CEO a l'air perdu.
CEO: "Il vérifie son propre travail ?"

CAMERA: close-up Lew slow-push
LEW (impassible): "Oui. C'est la partie que personne ne montre en démo."
`
    }
  }
]
export function findTemplate(id: string) {
  return TEMPLATES.find((t) => t.id === id)
}
