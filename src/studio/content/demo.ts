import { ContentStudio } from './api'
import type { ContentProject } from './project'
/** The benchmark project: every architectural decision is checked against this reel. */
export const CHATBOT_VS_AGENT_SCRIPT = `CAMERA: two-shot Lew CEO
CEO (perdu): "On a déjà ChatGPT."

Lew regarde le CEO.
CAMERA: medium Lew
LEW (impassible): "Il sait ce qui se passe dans votre CRM ?"

CAMERA: close-up CEO
CEO: "Non."

CAMERA: medium Lew
LEW: "Il peut le mettre à jour ?"

CAMERA: close-up CEO
Le CEO détourne le regard.
CEO: "Non."

CAMERA: close-up Lew slow-push
LEW (narquois): "Alors vous avez un chatbot."

PAUSE 0.5

LEW: "Pas un employé."
`
export function chatbotVsAgent(id = 'demo-chatbot-vs-agent', now = '2026-10-12T00:00:00.000Z'): ContentProject {
  const studio = ContentStudio.create({
    id,
    now,
    title: 'Chatbot vs Agent',
    topic: "Pourquoi un chatbot n'est pas un agent",
    hook: 'CEO : On a déjà ChatGPT.',
    cta: 'Des agents qui travaillent vraiment.',
    language: 'fr',
    format: 'reel',
    environment: 'office-night',
    template: 'misconception',
    cast: [
      { role: 'lew', kind: 'lew', name: 'Lew', mark: 'desk' },
      { role: 'ceo', kind: 'ceo', name: 'CEO', mark: 'guest' }
    ]
  })
  studio.setScript(CHATBOT_VS_AGENT_SCRIPT)
  studio.project.metadata.tags = ['agents', 'explainer', 'demo']
  studio.compileTimeline()
  return studio.project
}
