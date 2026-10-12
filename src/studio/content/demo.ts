import { ContentStudio } from './api'
import type { ContentProject } from './project'
/** The benchmark project: every architectural decision is checked against this reel. */
export const CHATBOT_VS_AGENT_SCRIPT = `CAMERA: two-shot Lew CEO
CEO (confused): "We already have ChatGPT."

Lew looks at CEO.
CAMERA: medium Lew
LEW (deadpan): "Does it know what's happening in your CRM?"

CAMERA: close-up CEO
CEO: "No."

CAMERA: medium Lew
LEW: "Can it update it?"

CAMERA: close-up CEO
CEO looks away.
CEO: "No."

CAMERA: close-up Lew slow-push
LEW (smug): "Then you have a chatbot."

PAUSE 0.5

LEW: "Not an employee."
`
export function chatbotVsAgent(id = 'demo-chatbot-vs-agent', now = '2026-10-12T00:00:00.000Z'): ContentProject {
  const studio = ContentStudio.create({
    id,
    now,
    title: 'Chatbot vs Agent',
    topic: 'Why a chatbot is not an agent',
    hook: 'CEO: We already have ChatGPT.',
    cta: 'Build agents that actually work.',
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
