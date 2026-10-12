import { ContentStudio } from './api'
import { chatbotVsAgent } from './demo'
import type { CastMember, ContentProject } from './project'
/**
 * Ready-made reels for Lew's channel: one idea each, French, 15 to 30 seconds.
 * They seed the library and sit behind "New reel → Examples". Each is built
 * through the same API as a generated project, so they double as fixtures.
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
  script: string
}
const lew = (mark: string): CastMember => ({ role: 'lew', kind: 'lew', name: 'Lew', mark })
const ceo = (mark: string, name = 'CEO', role = 'ceo'): CastMember => ({ role, kind: 'ceo', name, mark })
const dev = (mark: string, name = 'Dev', role = 'dev'): CastMember => ({ role, kind: 'dev', name, mark })
export const EXAMPLE_REELS: ExampleReel[] = [
  {
    id: 'rag-vector-db',
    title: "RAG, c'est pas une base vectorielle",
    topic: 'Le RAG est un système de retrieval, pas un stockage',
    hook: 'CEO : On a mis tous nos docs dans Pinecone.',
    cta: 'On construit des bases de connaissances qui répondent juste.',
    template: 'misconception',
    environment: 'office-night',
    cast: [lew('desk'), ceo('guest')],
    tags: ['rag', 'knowledge', 'explainer'],
    script: `CAMERA: two-shot Lew CEO
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
  },
  {
    id: 'ops-monday',
    title: "Le lundi matin d'Ops",
    topic: 'Automatiser un rapport hebdomadaire avec un agent',
    hook: 'Chaque lundi, Ops copie 200 tickets dans un tableur.',
    cta: 'Les tâches du lundi, on les donne à un agent.',
    template: 'before-after',
    environment: 'meeting-room',
    cast: [dev('left', 'Ops', 'ops'), lew('head')],
    tags: ['automation', 'ops', 'workflow'],
    script: `CAMERA: medium Ops
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
  },
  {
    id: 'rename-variable',
    title: 'Renommer une variable',
    topic: "Un agent sans garde-fous fait plus que ce qu'on demande",
    hook: "Dev : Je lui ai demandé de renommer une variable.",
    cta: 'Des agents qui font ce qu’on leur demande. Pas plus.',
    template: 'dev-joke',
    environment: 'ai-lab',
    cast: [dev('left'), lew('right')],
    tags: ['humour', 'developers', 'agents'],
    script: `CAMERA: medium Dev
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
  },
  {
    id: 'mcp-explained',
    title: "MCP, c'est quoi ?",
    topic: 'Le Model Context Protocol expliqué en une prise USB',
    hook: 'Dev : Encore un protocole.',
    cta: 'On branche vos outils à vos agents proprement.',
    template: 'explainer',
    environment: 'ai-lab',
    cast: [lew('center'), dev('right')],
    tags: ['mcp', 'integrations', 'explainer'],
    script: `CAMERA: two-shot Lew Dev
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
  },
  {
    id: 'evals-demo',
    title: 'La démo qui marche une fois',
    topic: 'Sans evals, un agent marche en démo et nulle part ailleurs',
    hook: 'CEO : La démo était parfaite.',
    cta: 'On mesure vos agents avant de les mettre en prod.',
    template: 'business-pain',
    environment: 'meeting-room',
    cast: [ceo('right'), lew('head')],
    tags: ['evals', 'production', 'explainer'],
    script: `CAMERA: medium CEO
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
  },
  {
    id: 'context-engineering',
    title: 'Context engineering',
    topic: "Un agent est aussi bon que ce qu'on lui met sous les yeux",
    hook: "Dev : Le modèle est nul.",
    cta: "Le bon contexte, au bon moment. C'est notre métier.",
    template: 'explainer',
    environment: 'office-night',
    cast: [dev('guest'), lew('desk')],
    tags: ['context', 'prompting', 'explainer'],
    script: `CAMERA: two-shot Lew Dev
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
  },
  {
    id: 'sales-agent-11s',
    title: "L'agent commercial en onze secondes",
    topic: 'Un agent qui relance les prospects dormants depuis le CRM',
    hook: 'Client : Vous pouvez relancer nos prospects dormants ?',
    cta: 'Un agent commercial branché sur votre CRM, en une semaine.',
    template: 'agent-demo',
    environment: 'office-night',
    cast: [lew('desk'), ceo('guest', 'Client', 'client')],
    tags: ['sales', 'demo', 'product'],
    script: `CAMERA: two-shot Lew Client
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
  },
  {
    id: 'poc-to-prod',
    title: 'Pourquoi ton POC ne passe jamais en prod',
    topic: 'Industrialiser un agent : monitoring, coûts, fallback',
    hook: 'CEO : Le POC marche. On déploie lundi.',
    cta: 'On met vos agents en production, pas en démo.',
    template: 'misconception',
    environment: 'meeting-room',
    cast: [ceo('right'), lew('head')],
    tags: ['production', 'orchestration', 'business'],
    script: `CAMERA: medium CEO
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
]
export function buildExample(reel: ExampleReel, now = '2026-10-12T00:00:00.000Z'): ContentProject {
  const studio = ContentStudio.create({
    id: `example-${reel.id}`,
    now,
    title: reel.title,
    topic: reel.topic,
    hook: reel.hook,
    cta: reel.cta,
    language: 'fr',
    format: 'reel',
    environment: reel.environment,
    template: reel.template,
    cast: reel.cast
  })
  studio.setScript(reel.script)
  studio.project.metadata.tags = [...reel.tags, 'example']
  studio.compileTimeline()
  return studio.project
}
/** The library's seed: the benchmark first, then the examples. */
export function exampleProjects(now?: string): ContentProject[] {
  return [chatbotVsAgent(undefined, now), ...EXAMPLE_REELS.map((r) => buildExample(r, now))]
}
