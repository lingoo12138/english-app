// 多 LLM 渠道统一管理
// 支持: OpenAI 兼容协议(OpenRouter / OpenAI / 自定义) + Anthropic
// 用法: import { chatCompletion, chatCompletionVision } from './lib/providers/llm'

export type LLMProviderType = 'openai' | 'anthropic'

export interface LLMProvider {
  id: string                          // 'openrouter' / 'openai' / 'anthropic' / 自定义 UUID
  name: string                        // 显示名
  type: LLMProviderType               // API 协议
  baseUrl: string                     // 入口
  defaultModel: string                // 默认模型
  models: string[]                    // 推荐模型
  supportsVision: boolean             // 是否支持图像输入
  free?: boolean                      // 是否免费
  apiKeyRequired: boolean             // 是否需要 API key
  builtin?: boolean                   // 是否内置(不能删除)
}

export interface LLMChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | LLMVisionContent[]
}

export interface LLMVisionContent {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }  // data:URL 或 https URL
}

export interface LLMRequestOptions {
  provider: LLMProvider
  apiKey: string
  model?: string           // 不传用 defaultModel
  messages: LLMChatMessage[]
  temperature?: number
  maxTokens?: number
  jsonMode?: boolean       // 强制 JSON 输出(支持时)
}

export interface LLMResponse {
  content: string
  model: string
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

// === 内置预置渠道 ===
export const BUILTIN_LLM_PROVIDERS: LLMProvider[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    type: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemini-2.5-flash:free',
    models: [
      'google/gemini-2.5-flash:free',
      'google/gemini-2.5-flash',
      'openai/gpt-4o-mini',
      'anthropic/claude-3.5-haiku',
      'meta-llama/llama-3.1-8b-instruct:free',
    ],
    supportsVision: true,
    free: true,
    apiKeyRequired: true,
    builtin: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    supportsVision: true,
    apiKeyRequired: true,
    builtin: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    type: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-haiku-20241022',
    models: ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
    supportsVision: true,
    apiKeyRequired: true,
    builtin: true,
  },
  {
    id: 'siliconflow',
    name: '硅基流动',
    type: 'openai',
    baseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'Qwen/Qwen2-VL-72B-Instruct',
    models: [
      'Qwen/Qwen2-VL-72B-Instruct',
      'THUDM/glm-4v-9b',
      'Qwen/Qwen2.5-7B-Instruct',
    ],
    supportsVision: true,
    free: true,
    apiKeyRequired: true,
    builtin: true,
  },
  {
    id: 'mock',
    name: 'Mock 模拟(零成本测试)',
    type: 'openai',
    baseUrl: 'mock://local',
    defaultModel: 'mock-model',
    models: ['mock-model'],
    supportsVision: false,
    free: true,
    apiKeyRequired: false,
    builtin: true,
  },
]

// === 核心: chatCompletion ===
export async function chatCompletion(opts: LLMRequestOptions): Promise<LLMResponse> {
  const { provider, apiKey, model, messages, temperature = 0.7, maxTokens = 1024, jsonMode = false } = opts

  if (provider.id === 'mock') {
    return mockLLMResponse(opts)
  }

  if (!apiKey && provider.apiKeyRequired) {
    throw new Error(`${provider.name} 需要 API key, 请在设置中配置`)
  }

  if (provider.type === 'openai') {
    return openAIChat(provider, apiKey, model || provider.defaultModel, messages, temperature, maxTokens, jsonMode)
  } else if (provider.type === 'anthropic') {
    return anthropicChat(provider, apiKey, model || provider.defaultModel, messages, temperature, maxTokens)
  }
  throw new Error(`未知的 provider 类型: ${provider.type}`)
}

async function openAIChat(
  provider: LLMProvider,
  apiKey: string,
  model: string,
  messages: LLMChatMessage[],
  temperature: number,
  maxTokens: number,
  jsonMode: boolean,
): Promise<LLMResponse> {
  const body: any = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  }
  if (jsonMode) body.response_format = { type: 'json_object' }

  const resp = await fetchWithTimeout(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  }, 30_000)

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`${provider.name} ${resp.status}: ${err.slice(0, 200)}`)
  }
  const data = await resp.json()
  return {
    content: data.choices?.[0]?.message?.content ?? '',
    model: data.model ?? model,
    usage: data.usage,
  }
}

async function anthropicChat(
  provider: LLMProvider,
  apiKey: string,
  model: string,
  messages: LLMChatMessage[],
  temperature: number,
  maxTokens: number,
): Promise<LLMResponse> {
  // 拆分 system / user+assistant
  const system = messages.find(m => m.role === 'system')?.content as string || ''
  const conversation = messages.filter(m => m.role !== 'system')

  const resp = await fetchWithTimeout(`${provider.baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      system,
      messages: conversation.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : m.content,
      })),
      temperature,
      max_tokens: maxTokens,
    }),
  }, 30_000)

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`${provider.name} ${resp.status}: ${err.slice(0, 200)}`)
  }
  const data = await resp.json()
  return {
    content: data.content?.[0]?.text ?? '',
    model: data.model ?? model,
    usage: data.usage ? {
      prompt_tokens: data.usage.input_tokens,
      completion_tokens: data.usage.output_tokens,
      total_tokens: data.usage.input_tokens + data.usage.output_tokens,
    } : undefined,
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(t)
  }
}

// === Mock 实现(零成本测试) ===
async function mockLLMResponse(opts: LLMRequestOptions): Promise<LLMResponse> {
  // 模拟网络延迟
  await new Promise(r => setTimeout(r, 800 + Math.random() * 600))

  const lastMsg = opts.messages[opts.messages.length - 1]
  const userText = typeof lastMsg.content === 'string' ? lastMsg.content : ''

  // JSON 模式: 给结构化响应
  if (opts.jsonMode) {
    // 模拟图像识别: 返回 1-2 个英文词
    const words = ['apple', 'book', 'phone', 'cat', 'tree', 'cup', 'computer', 'lamp', 'chair', 'pen']
    const picked: string[] = []
    for (let i = 0; i < 2; i++) {
      picked.push(words[Math.floor(Math.random() * words.length)])
    }
    return {
      content: JSON.stringify({
        objects: picked.map(w => ({ word: w, confidence: 0.7 + Math.random() * 0.3 })),
      }),
      model: 'mock',
    }
  }

  // 普通对话模式
  const responses = [
    `That's interesting! You said: "${userText.slice(0, 80)}". Can you tell me more?`,
    `I see. In my experience, "${userText.slice(0, 40)}" is a common situation. What do you think?`,
    `Great point! Let me think about "${userText.slice(0, 40)}" for a moment.`,
    `Mock response: I understand you mentioned "${userText.slice(0, 40)}". How does that make you feel?`,
    `Got it! "${userText.slice(0, 60)}" - that's worth exploring further.`,
  ]
  return {
    content: responses[Math.floor(Math.random() * responses.length)],
    model: 'mock',
  }
}

// === 便捷: 视觉对话 ===
export async function chatCompletionVision(
  opts: Omit<LLMRequestOptions, 'messages'> & { prompt: string; imageDataUrl: string }
): Promise<LLMResponse> {
  if (!opts.provider.supportsVision && opts.provider.id !== 'mock') {
    throw new Error(`${opts.provider.name} 不支持图像输入,请选其他渠道(OpenRouter / OpenAI / Anthropic / 硅基流动)`)
  }
  return chatCompletion({
    ...opts,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: opts.prompt },
          { type: 'image_url', image_url: { url: opts.imageDataUrl } },
        ],
      },
    ],
  })
}
