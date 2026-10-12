import type { CharacterKind, EnvironmentId } from '../scene/model'
import type { OutputFormat } from '../render/presets'
import type { CastMember } from './project'
import { castMember } from './project'
/**
 * Content templates: a proven shape (scene, cast, shot structure, pacing) with
 * a sample script to replace. Instantiating one is `createProject` + `setScript`.
 * Scripts are in French, the content's main language.
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
    name: 'Idée reçue sur l’IA',
    premise: 'Le CEO croit X → Lew explique pourquoi c’est faux → chute.',
    structure: ['Plan à deux : la croyance, affirmée avec aplomb', 'Plan moyen sur Lew : une question qui révèle le trou', 'Gros plans : l’aveu', 'Zoom lent sur Lew : la chute'],
    environment: 'office-night',
    format: 'reel',
    cast: [lew('desk'), ceo('guest')],
    duration: 20,
    tags: ['explainer', 'agents'],
    script: `CAMERA: two-shot Lew CEO
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
  },
  {
    id: 'agent-demo',
    name: 'Démo d’agent',
    premise: 'Quelqu’un demande quelque chose → l’agent exécute le workflow → résultat.',
    structure: ['Plan moyen sur le client : la demande', 'Gros plan sur l’écran : l’agent au travail', 'Plan à deux : le résultat, et ce qu’il veut dire'],
    environment: 'office-night',
    format: 'reel',
    cast: [lew('desk'), extra('ceo', 'client', 'Client', 'guest')],
    duration: 22,
    tags: ['demo', 'product'],
    script: `CAMERA: two-shot Lew Client
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
  },
  {
    id: 'before-after',
    name: 'Avant / après',
    premise: 'Le workflow manuel, puis le workflow Lew.',
    structure: ['Plan moyen sur l’employé : la corvée manuelle', 'Cut sur Lew : la même tâche, automatisée', 'Gros plan : la différence en une phrase'],
    environment: 'meeting-room',
    format: 'reel',
    cast: [extra('dev', 'ops', 'Ops', 'left'), lew('head')],
    duration: 20,
    tags: ['automation', 'workflow'],
    script: `CAMERA: medium Ops
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
  },
  {
    id: 'dev-joke',
    name: 'Blague de dev',
    premise: 'Un développeur demande un truc simple à l’IA → chaos.',
    structure: ['Plan moyen sur le dev : la demande simple', 'Gros plan sur l’écran : l’escalade', 'Plan à deux avec Lew : la conclusion sèche'],
    environment: 'ai-lab',
    format: 'reel',
    cast: [dev('left'), lew('right')],
    duration: 18,
    tags: ['humour', 'developers'],
    script: `CAMERA: medium Dev
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
  },
  {
    id: 'business-pain',
    name: 'Douleur métier',
    premise: 'Un employé fait une tâche répétitive → Lew l’automatise.',
    structure: ['Plan moyen sur l’employé : la tâche, en chiffres', 'Plan moyen sur Lew : ce que fait l’agent à la place', 'Gros plan : le gain'],
    environment: 'meeting-room',
    format: 'reel',
    cast: [extra('ceo', 'sales', 'Sales', 'right'), lew('head')],
    duration: 20,
    tags: ['sales', 'automation'],
    script: `CAMERA: medium Sales
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
  },
  {
    id: 'explainer',
    name: 'Explication technique',
    premise: 'Un concept, un contraste, une phrase à retenir.',
    structure: ['Plan moyen sur Lew : le mot que tout le monde emploie', 'Plan à deux : la question qui sépare les deux', 'Gros plan zoom lent : la définition en une phrase'],
    environment: 'ai-lab',
    format: 'reel',
    cast: [lew('center'), ceo('right')],
    duration: 22,
    tags: ['explainer', 'concepts'],
    script: `CAMERA: medium Lew
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
]
export function findTemplate(id: string) {
  return TEMPLATES.find((t) => t.id === id)
}
