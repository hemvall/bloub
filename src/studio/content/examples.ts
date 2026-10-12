import type { ContentLanguage } from '../audio/plan'
import { ContentStudio } from './api'
import { chatbotVsAgent } from './demo'
import type { CastMember, ContentProject } from './project'
/**
 * Ready-made reels for Lew's channel: one idea each, 15 to 30 seconds, English
 * first with a French version behind. They seed the library and sit behind
 * "New reel → Examples". Each is built through the same API as a generated project.
 */
export interface ExampleReel {
  id: string
  title: string
  topic: string
  hook: string
  cta: string
  template: string
  environment: ContentProject['environment']
  cast: CastMember[]
  tags: string[]
  script: Record<ContentLanguage, string>
}
const lew = (mark: string): CastMember => ({ role: 'lew', kind: 'lew', name: 'Lew', mark })
const ceo = (mark: string, name = 'CEO', role = 'ceo'): CastMember => ({ role, kind: 'ceo', name, mark })
const dev = (mark: string, name = 'Dev', role = 'dev'): CastMember => ({ role, kind: 'dev', name, mark })
export const EXAMPLE_REELS: ExampleReel[] = [
  {
    id: 'rag-vector-db',
    title: 'RAG is not a vector database',
    topic: 'RAG is a retrieval system, not a storage choice',
    hook: 'CEO: We put all our docs in Pinecone.',
    cta: 'We build knowledge bases that answer right.',
    template: 'misconception',
    environment: 'office-night',
    cast: [lew('desk'), ceo('guest')],
    tags: ['rag', 'knowledge', 'explainer'],
    script: {
      en: `CAMERA: two-shot Lew CEO
CEO (happy): "We put all our documents in a vector database. We have RAG."

Lew looks at CEO.
CAMERA: medium Lew
LEW (deadpan): "Ask it which version of the contract is in force."

CAMERA: close-up CEO
CEO looks confused.
CEO: "It gave me a paragraph from 2021."

CAMERA: medium Lew
LEW: "Because it looks for sentences that sound alike. Not for the right answer."

CAMERA: close-up Lew slow-push
LEW (smug): "RAG is the sorting. The database is just the closet."
`,
      fr: `CAMERA: two-shot Lew CEO
CEO (content): "On a mis tous nos documents dans une base vectorielle. On a du RAG."

Lew regarde le CEO.
CAMERA: medium Lew
LEW (impassible): "Demandez-lui quelle version du contrat est en vigueur."

CAMERA: close-up CEO
Le CEO a l'air perdu.
CEO: "Il m'a sorti un paragraphe de 2021."

CAMERA: medium Lew
LEW: "Parce qu'il cherche des phrases qui ressemblent. Pas la bonne réponse."

CAMERA: close-up Lew slow-push
LEW (narquois): "Le RAG, c'est le tri. La base, c'est juste le placard."
`
    }
  },
  {
    id: 'ops-monday',
    title: "Ops' Monday morning",
    topic: 'Automating a weekly report with an agent',
    hook: 'Every Monday, Ops copies 200 tickets into a spreadsheet.',
    cta: 'Monday tasks belong to an agent.',
    template: 'before-after',
    environment: 'meeting-room',
    cast: [dev('left', 'Ops', 'ops'), lew('head')],
    tags: ['automation', 'ops', 'workflow'],
    script: {
      en: `CAMERA: medium Ops
OPS (tired): "Every Monday I copy the tickets into a spreadsheet, tag them, write the summary."

Ops sighs.
OPS: "Three hours. Minimum."

CAMERA: medium Lew
LEW: "The agent reads the tickets, tags them, writes the summary and posts it in Slack at eight."

CAMERA: close-up Ops
Ops looks surprised.
OPS: "And when it gets one wrong?"

CAMERA: close-up Lew slow-push
LEW (deadpan): "It shows you what it tagged. You fix it in two minutes."

PAUSE 0.3

LEW (smug): "Instead of three hours."
`,
      fr: `CAMERA: medium Ops
OPS (fatigué): "Chaque lundi je copie les tickets dans un tableur, je les tague, je fais le résumé."

Ops soupire.
OPS: "Trois heures. Minimum."

CAMERA: medium Lew
LEW: "L'agent lit les tickets, les tague, écrit le résumé et le poste sur Slack à huit heures."

CAMERA: close-up Ops
Ops a l'air surpris.
OPS: "Et s'il se trompe ?"

CAMERA: close-up Lew slow-push
LEW (impassible): "Il te montre ce qu'il a tagué. Tu corriges en deux minutes."

PAUSE 0.3

LEW (narquois): "Au lieu de trois heures."
`
    }
  },
  {
    id: 'rename-variable',
    title: 'Rename one variable',
    topic: 'An agent without guardrails does more than you asked',
    hook: 'Dev: I asked it to rename one variable.',
    cta: 'Agents that do what you asked. Nothing more.',
    template: 'dev-joke',
    environment: 'ai-lab',
    cast: [dev('left'), lew('right')],
    tags: ['humour', 'developers', 'agents'],
    script: {
      en: `CAMERA: medium Dev
DEV (tired): "I asked it to rename one variable."

PAUSE 0.3

DEV: "It refactored the module, added tests, and opened a PR titled 'Modernization'."

CAMERA: close-up Lew
Lew looks at Dev.
LEW (deadpan): "Do the tests pass?"

CAMERA: close-up Dev
Dev looks away.
DEV: "...they pass now."

CAMERA: two-shot Lew Dev slow-push
LEW (smug): "That's not an agent. That's an intern with admin rights."
`,
      fr: `CAMERA: medium Dev
DEV (fatigué): "Je lui ai demandé de renommer une variable."

PAUSE 0.3

DEV: "Il a refactoré le module, ajouté des tests, et ouvert une PR intitulée « Modernisation »."

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
    id: 'mcp-explained',
    title: 'What is MCP?',
    topic: 'The Model Context Protocol explained with a USB plug',
    hook: 'Dev: Another protocol.',
    cta: 'We plug your tools into your agents, cleanly.',
    template: 'explainer',
    environment: 'ai-lab',
    cast: [lew('center'), dev('right')],
    tags: ['mcp', 'integrations', 'explainer'],
    script: {
      en: `CAMERA: two-shot Lew Dev
DEV (annoyed): "MCP. Another protocol."

Lew looks at Dev.
CAMERA: medium Lew
LEW: "Before, every tool had its own cable. One connector for Slack, one for the CRM, one for GitHub."

CAMERA: close-up Lew
LEW (deadpan): "MCP is the USB plug. The tool describes itself, the agent knows what to do with it."

CAMERA: close-up Dev
Dev looks curious.
DEV: "And what do I rewrite?"

CAMERA: close-up Lew slow-push
LEW (smug): "Nothing. That's the point."
`,
      fr: `CAMERA: two-shot Lew Dev
DEV (agacé): "MCP. Encore un protocole."

Lew regarde Dev.
CAMERA: medium Lew
LEW: "Avant, chaque outil avait son câble. Un connecteur pour Slack, un pour le CRM, un pour GitHub."

CAMERA: close-up Lew
LEW (impassible): "MCP, c'est la prise USB. L'outil se décrit, l'agent sait quoi en faire."

CAMERA: close-up Dev
Dev a l'air curieux.
DEV: "Et je réécris quoi ?"

CAMERA: close-up Lew slow-push
LEW (narquois): "Rien. C'est le but."
`
    }
  },
  {
    id: 'evals-demo',
    title: 'The demo that works once',
    topic: 'Without evals, an agent works in the demo and nowhere else',
    hook: 'CEO: The demo was perfect.',
    cta: 'We measure your agents before they ship.',
    template: 'business-pain',
    environment: 'meeting-room',
    cast: [ceo('right'), lew('head')],
    tags: ['evals', 'production', 'explainer'],
    script: {
      en: `CAMERA: medium CEO
CEO (happy): "The demo was perfect. Why does it fail with customers?"

CAMERA: medium Lew
Lew looks at CEO.
LEW (deadpan): "How many times did you test it?"

CAMERA: close-up CEO
CEO looks confused.
CEO: "Once. During the demo."

CAMERA: close-up Lew
LEW: "We run it through two hundred real cases. We count the ones it gets wrong. Then we do it again."

CAMERA: close-up Lew slow-push
LEW (smug): "That's called evals. Not luck."
`,
      fr: `CAMERA: medium CEO
CEO (content): "La démo était parfaite. Pourquoi ça rate chez les clients ?"

CAMERA: medium Lew
Lew regarde le CEO.
LEW (impassible): "Combien de fois vous l'avez testé ?"

CAMERA: close-up CEO
Le CEO a l'air perdu.
CEO: "Une fois. Pendant la démo."

CAMERA: close-up Lew
LEW: "On lui fait passer deux cents cas réels. On compte ceux qu'il rate. Et on recommence."

CAMERA: close-up Lew slow-push
LEW (narquois): "Ça s'appelle des evals. Pas de la chance."
`
    }
  },
  {
    id: 'context-engineering',
    title: 'Context engineering',
    topic: 'An agent is only as good as what you put in front of it',
    hook: 'Dev: The model is useless.',
    cta: 'The right context, at the right time. That is the job.',
    template: 'explainer',
    environment: 'office-night',
    cast: [dev('guest'), lew('desk')],
    tags: ['context', 'prompting', 'explainer'],
    script: {
      en: `CAMERA: two-shot Lew Dev
DEV (annoyed): "The model is useless. It makes up fields that don't exist."

Lew looks at Dev.
CAMERA: medium Lew
LEW (deadpan): "Did you show it the schema?"

CAMERA: close-up Dev
Dev looks away.
DEV: "It's in the docs."

CAMERA: medium Lew
LEW: "It doesn't read your docs. It reads what's in the window. The schema, three examples, the rule."

CAMERA: close-up Lew slow-push
LEW (smug): "The model is very good. The context was empty."
`,
      fr: `CAMERA: two-shot Lew Dev
DEV (agacé): "Le modèle est nul. Il invente des champs qui n'existent pas."

Lew regarde Dev.
CAMERA: medium Lew
LEW (impassible): "Tu lui as montré le schéma ?"

CAMERA: close-up Dev
Dev détourne le regard.
DEV: "Il est dans la doc."

CAMERA: medium Lew
LEW: "Il ne lit pas ta doc. Il lit ce qu'il y a dans la fenêtre. Le schéma, trois exemples, la règle."

CAMERA: close-up Lew slow-push
LEW (narquois): "Le modèle est très bon. Le contexte était vide."
`
    }
  },
  {
    id: 'sales-agent-11s',
    title: 'The sales agent in eleven seconds',
    topic: 'An agent that follows up dormant leads from the CRM',
    hook: 'Client: Can you follow up our dormant leads?',
    cta: 'A sales agent wired to your CRM, in a week.',
    template: 'agent-demo',
    environment: 'office-night',
    cast: [lew('desk'), ceo('guest', 'Client', 'client')],
    tags: ['sales', 'demo', 'product'],
    script: {
      en: `CAMERA: two-shot Lew Client
CLIENT: "Can you follow up the leads we haven't touched in two weeks?"

CAMERA: medium Lew
Lew looks at laptop.
LEW: "It's reading the CRM."

PAUSE 0.6

LEW: "Fourteen leads. Nine drafts. Three meetings proposed."

CAMERA: close-up Client
Client looks surprised.
CLIENT: "That took eleven seconds."

CAMERA: medium Lew slow-push
Lew looks at the camera.
LEW (smug): "And everything is logged. Ask your last intern for that."
`,
      fr: `CAMERA: two-shot Lew Client
CLIENT: "Vous pouvez relancer les prospects qu'on n'a pas touchés depuis deux semaines ?"

CAMERA: medium Lew
Lew regarde le laptop.
LEW: "Il lit le CRM."

PAUSE 0.6

LEW: "Quatorze prospects. Neuf brouillons. Trois rendez-vous proposés."

CAMERA: close-up Client
Le Client a l'air surpris.
CLIENT: "Ça a pris onze secondes."

CAMERA: medium Lew slow-push
Lew regarde la caméra.
LEW (narquois): "Et tout est journalisé. Demandez ça à votre dernier stagiaire."
`
    }
  },
  {
    id: 'poc-to-prod',
    title: 'Why your POC never ships',
    topic: 'Taking an agent to production: monitoring, cost, fallback',
    hook: 'CEO: The POC works. We ship Monday.',
    cta: 'We put your agents in production, not in a demo.',
    template: 'misconception',
    environment: 'meeting-room',
    cast: [ceo('right'), lew('head')],
    tags: ['production', 'orchestration', 'business'],
    script: {
      en: `CAMERA: medium CEO
CEO (happy): "The POC works. We ship Monday."

CAMERA: medium Lew
Lew looks at CEO.
LEW (deadpan): "What does it do when the CRM API goes down?"

CAMERA: close-up CEO
CEO looks confused.
CEO: "It goes down?"

CAMERA: close-up Lew
LEW: "And when the model takes twenty seconds? And when the bill triples?"

CAMERA: close-up CEO
CEO looks away.
CEO: "...we'll see Monday."

CAMERA: close-up Lew slow-push
LEW (smug): "A POC is an agent that never had a bad day."
`,
      fr: `CAMERA: medium CEO
CEO (content): "Le POC marche. On déploie lundi."

CAMERA: medium Lew
Lew regarde le CEO.
LEW (impassible): "Il fait quoi quand l'API du CRM tombe ?"

CAMERA: close-up CEO
Le CEO a l'air perdu.
CEO: "Elle tombe ?"

CAMERA: close-up Lew
LEW: "Et quand le modèle répond en vingt secondes ? Et quand la facture triple ?"

CAMERA: close-up CEO
Le CEO détourne le regard.
CEO: "…on verra lundi."

CAMERA: close-up Lew slow-push
LEW (narquois): "Un POC, c'est un agent qui n'a jamais eu de mauvaise journée."
`
    }
  }
]
export function buildExample(reel: ExampleReel, now = '2026-10-12T00:00:00.000Z', language: ContentLanguage = 'en'): ContentProject {
  const other: ContentLanguage = language === 'en' ? 'fr' : 'en'
  const studio = ContentStudio.create({
    id: `example-${reel.id}`,
    now,
    title: reel.title,
    topic: reel.topic,
    hook: reel.hook,
    cta: reel.cta,
    language,
    format: 'reel',
    environment: reel.environment,
    template: reel.template,
    cast: reel.cast
  })
  studio.setScript(reel.script[language])
  studio.setAltScript(other, reel.script[other])
  studio.project.metadata.tags = [...reel.tags, 'example']
  studio.compileTimeline()
  return studio.project
}
/** The library's seed: the benchmark first, then the examples. */
export function exampleProjects(now?: string): ContentProject[] {
  return [chatbotVsAgent(undefined, now), ...EXAMPLE_REELS.map((r) => buildExample(r, now))]
}
