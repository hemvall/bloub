import type AnthropicTypes from '@anthropic-ai/sdk'
import { CHARACTERS, CHARACTER_KINDS } from '../characters/catalog'
import { ENVIRONMENTS, ENVIRONMENT_IDS } from '../environments/catalog'
import { SHOT_MOVEMENTS, SHOT_TYPES } from '../camera/shots'
import { OUTPUT_FORMATS } from '../render/presets'
import { EXPRESSIONS } from '../scene/model'
import type { ClaudeSettings } from '../director/claude'
import { ACTING_COMMANDS } from './acting'
import { ContentStudio } from './api'
import { CHATBOT_VS_AGENT_SCRIPT } from './demo'
import type { ContentProject } from './project'
import { TEMPLATES } from './templates'
/**
 * "Describe your video" → a ContentProject. Claude writes the project (cast,
 * set, script in the script format); the parser and the compiler do the rest,
 * exactly as for a hand-written script. There is no offline fallback: without
 * a key the UI offers templates instead of pretending.
 */
export const PROJECT_TOOL_NAME = 'write_project'
const str = { type: 'string' }
export const PROJECT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Short, specific title (max 80 chars).' },
    topic: { type: 'string', description: 'The AI/business idea in one sentence.' },
    hook: { type: 'string', description: 'The first line or beat that stops the scroll.' },
    cta: { type: 'string', description: 'A soft call to action for the caption, or empty.' },
    format: { type: 'string', enum: OUTPUT_FORMATS },
    environment: { type: 'string', enum: ENVIRONMENT_IDS },
    template: { type: 'string', enum: TEMPLATES.map((t) => t.id), description: 'The closest content template.' },
    cast: {
      type: 'array',
      items: {
        type: 'object',
        properties: { role: str, kind: { type: 'string', enum: CHARACTER_KINDS }, name: str, mark: str },
        required: ['role', 'kind', 'name', 'mark'],
        additionalProperties: false
      }
    },
    script: { type: 'string', description: 'The whole script in the script format.' },
    reply: { type: 'string', description: 'One sentence to the user about the choices made.' }
  },
  required: ['title', 'topic', 'hook', 'cta', 'format', 'environment', 'template', 'cast', 'script', 'reply'],
  additionalProperties: false
} as const
export function generationPrompt() {
  const chars = CHARACTER_KINDS.map((k) => `- ${k} ("${CHARACTERS[k].name}", ${CHARACTERS[k].tier}): ${CHARACTERS[k].description} Personality: ${CHARACTERS[k].personality.summary}.`).join('\n')
  const envs = ENVIRONMENT_IDS.map((id) => `- ${id} ("${ENVIRONMENTS[id].name}"): ${ENVIRONMENTS[id].description} Marks: ${Object.keys(ENVIRONMENTS[id].marks).join(', ')}.`).join('\n')
  const templates = TEMPLATES.map((t) => `- ${t.id}: ${t.premise} (${t.structure.join(' → ')})`).join('\n')
  return `You write short vertical videos for Lew, an AI engineering business that sells practical AI systems to companies: agents, internal assistants, workflow automation, RAG and company knowledge, integrations with business tools, orchestration, evaluation and productionisation. Lew is also the name of the recurring main character and of the agent workspace product. The videos grow an audience, explain AI concepts in an entertaining way, show real business use cases and promote Lew indirectly. Funny, but technically accurate; never an explicit ad.

LANGUAGE: write every line of dialogue, the title, hook and CTA in FRENCH (France, tutoiement entre collègues, vouvoiement du client), unless the brief is explicitly written in another language. Short, oral, punchy French: as people speak, not as they write.

You answer by calling ${PROJECT_TOOL_NAME} once with a complete project. Rules:
- 15 to 30 seconds. Reading speed is about 2.6 words per second; a line of 8 words lasts ~3.7 s. Count. A voice will be generated for every line: write what a person can say in one breath.
- One idea per video. Open on the hook within the first 3 seconds. End on the punchline: no outro.
- Lew is the main character, role "lew", at a mark that fits the set (desk, head, center…). Secondary characters are archetypes: ceo (also for a client, sales, a manager: set role and name accordingly, e.g. role "client", name "Client"), dev (developers, ops). Keep names short: they become speaker labels.
- Prefer the office-night set for Lew's office, meeting-room for corporate scenes, ai-lab for pure concept explanations.
- Cut between shots at every change of speaker or beat; do not stay on one framing for more than ~6 seconds. Use a slow-push on the punchline.
- Give listeners something to do with stage directions (looks away, looks confused, nods, sighs, leans back).

Script format (exactly this; blank line between beats; times optional, lines flow one after the other):
[00:00.0]
CAMERA: two-shot Lew CEO
CEO (perdu): "On a déjà ChatGPT."

Lew regarde le CEO.
CAMERA: medium Lew
LEW (impassible): "Il sait ce qui se passe dans votre CRM ?"

CAMERA: close-up Lew slow-push
LEW (narquois): "Alors vous avez un chatbot."

PAUSE 0.5

LEW: "Pas un employé."

Speaker labels are the cast NAMES in capitals. Emotions in parentheses, French words accepted: impassible, narquois, perdu, surpris, agacé, content, fatigué, triste, curieux, neutre (English ids also work: ${EXPRESSIONS.join(', ')}). Keep the CAMERA keywords in English: shot types ${SHOT_TYPES.join(', ')}; movements ${SHOT_MOVEMENTS.join(', ')}. Stage directions are French sentences read by a parser; stick to these forms: "Lew regarde le CEO.", "Le CEO détourne le regard.", "Dev soupire.", "Lew regarde la caméra.", "Le CEO a l'air perdu.", "Ops hoche la tête.", "Lew se cale en arrière.", "Lew a un sourire en coin." (commands: ${ACTING_COMMANDS.join(', ')}).

Reference script, the benchmark for tone:
${CHATBOT_VS_AGENT_SCRIPT}
Characters:
${chars}

Sets:
${envs}

Templates:
${templates}`
}
export interface GeneratedProject {
  project: ContentProject
  reply: string
  warnings: string[]
}
export async function generateProject(prompt: string, settings: ClaudeSettings, signal?: AbortSignal): Promise<GeneratedProject> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 })
  const messages: AnthropicTypes.MessageParam[] = [{ role: 'user', content: `Video brief: ${prompt}` }]
  let response: AnthropicTypes.Message
  try {
    response = await client.messages.create(
      {
        model: settings.model,
        max_tokens: 4000,
        system: [{ type: 'text', text: generationPrompt(), cache_control: { type: 'ephemeral' } }],
        tools: [{ name: PROJECT_TOOL_NAME, description: 'Write a complete content project.', strict: true, input_schema: PROJECT_SCHEMA as unknown as { type: 'object'; [k: string]: unknown } }],
        tool_choice: { type: 'tool', name: PROJECT_TOOL_NAME },
        messages
      },
      { signal }
    )
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error('Invalid API key.')
    if (e instanceof Anthropic.RateLimitError) throw new Error('Rate limited, try again in a moment.')
    if (e instanceof Anthropic.APIError) throw new Error(`Claude API error ${e.status}: ${e.message}`)
    throw e
  }
  if (response.stop_reason === 'refusal') throw new Error('The model declined this brief.')
  const call = response.content.find((b) => b.type === 'tool_use')
  if (!call || call.type !== 'tool_use') throw new Error('No project returned.')
  return projectFromGeneration(call.input as GenerationInput)
}
export interface GenerationInput {
  title: string
  topic: string
  hook: string
  cta: string
  format: string
  environment: string
  template?: string
  cast: { role: string; kind: string; name: string; mark?: string }[]
  script: string
  reply?: string
}
/** Turns the model's answer into a compiled project; bad values fall back with a warning rather than failing. */
export function projectFromGeneration(input: GenerationInput): GeneratedProject {
  const warnings: string[] = []
  const environment = ENVIRONMENT_IDS.find((id) => id === input.environment) ?? 'office-night'
  if (environment !== input.environment) warnings.push(`Unknown set "${input.environment}", using office-night`)
  const format = OUTPUT_FORMATS.find((f) => f === input.format) ?? 'reel'
  const studio = ContentStudio.create({
    title: String(input.title || 'Untitled reel').slice(0, 140),
    topic: String(input.topic ?? '').slice(0, 300),
    hook: String(input.hook ?? '').slice(0, 300),
    cta: String(input.cta ?? '').slice(0, 300),
    format,
    environment,
    ...(input.template && TEMPLATES.some((t) => t.id === input.template) && { template: input.template })
  })
  const marks = ENVIRONMENTS[environment].marks
  for (const c of Array.isArray(input.cast) ? input.cast : []) {
    const kind = CHARACTER_KINDS.find((k) => k === c.kind)
    if (!kind) {
      warnings.push(`Unknown character kind "${c.kind}" skipped`)
      continue
    }
    const role = String(c.role || kind).replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || kind
    studio.addCharacter(kind, { role, name: String(c.name || role).slice(0, 40), ...(c.mark && c.mark in marks && { mark: c.mark }) })
  }
  if (!studio.project.cast.length) {
    warnings.push('No cast returned; adding Lew')
    studio.addCharacter('lew')
  }
  warnings.push(...studio.setScript(String(input.script ?? '')))
  const compiled = studio.compileTimeline()
  warnings.push(...compiled.warnings)
  return { project: studio.project, reply: String(input.reply ?? ''), warnings }
}
