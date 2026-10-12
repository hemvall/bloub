import type AnthropicTypes from '@anthropic-ai/sdk'
import type { SceneData } from '../scene/model'
import type { DirectorScript } from './script'
import { DIRECTOR_SCHEMA, DIRECTOR_TOOL_NAME, sceneContext, systemPrompt } from './prompt'
export const DIRECTOR_MODELS = ['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5'] as const
export type DirectorModel = (typeof DIRECTOR_MODELS)[number]
export interface ClaudeSettings {
  apiKey: string
  model: DirectorModel
}
export interface ChatTurn {
  role: 'user' | 'assistant'
  text: string
}
/**
 * Browser-side call to the Messages API. The key is the user's own, stored in
 * their browser; the SDK is loaded on demand so it never weighs on the studio
 * until the first message. The scene is sent fresh on every turn so the model
 * always edits what is actually on screen.
 */
export async function claudeDirector(
  settings: ClaudeSettings,
  history: ChatTurn[],
  message: string,
  scene: SceneData,
  signal?: AbortSignal
): Promise<DirectorScript> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 })
  const messages: AnthropicTypes.MessageParam[] = [
    ...history.slice(-12).map((t) => ({ role: t.role, content: t.text })),
    { role: 'user' as const, content: `${sceneContext(scene)}\n\nDirection: ${message}` }
  ]
  try {
    const response = await client.messages.create(
      {
        model: settings.model,
        max_tokens: 8000,
        system: [{ type: 'text', text: systemPrompt(), cache_control: { type: 'ephemeral' } }],
        tools: [
          {
            name: DIRECTOR_TOOL_NAME,
            description: 'Apply a list of operations to the scene document and reply to the user.',
            strict: true,
            input_schema: DIRECTOR_SCHEMA as unknown as { type: 'object'; [k: string]: unknown }
          }
        ],
        messages
      },
      { signal }
    )
    if (response.stop_reason === 'refusal') throw new Error('The model declined this request.')
    const call = response.content.find((b) => b.type === 'tool_use')
    if (!call || call.type !== 'tool_use') {
      const text = response.content.find((b) => b.type === 'text')
      return { reply: text && text.type === 'text' ? text.text : 'No directions returned.', ops: [] }
    }
    const input = call.input as DirectorScript
    return { reply: input.reply ?? '', ops: Array.isArray(input.ops) ? input.ops : [] }
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error('Invalid API key.')
    if (e instanceof Anthropic.RateLimitError) throw new Error('Rate limited, try again in a moment.')
    if (e instanceof Anthropic.APIError) throw new Error(`Claude API error ${e.status}: ${e.message}`)
    throw e
  }
}
