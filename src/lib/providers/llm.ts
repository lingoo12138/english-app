// 多 LLM 渠道统一管理
// v0.12: 统一所有 LLM 走 OpenAI 数据结构 (chat/completions 风格)
// - messages: { role: 'system'|'user'|'assistant', content: string | content[] }
// - content[] 支持 vision (text + image_url)
// - 不同渠道的私有参数(model、response_format、tools 等)通过 options 透传
// 兼容性问题: 不同 provider 的私有参数(model 名称、max_tokens 命名等)由调用方处理

export type LLMProviderType = 'openai'  // 统一为 OpenAI 协议

export interface LLMProvider {
  id: string                          // 'openrouter' / 'openai' / 'anthropic' / 'custom' UUID
  name: string                        // 显示名
  type: LLMProviderType               // 协议(目前都是 openai 兼容)
  baseUrl: string                     // 入口(如 https://api.openai.com/v1)
  defaultModel: string                // 默认模型
  models: string[]                    // 推荐模型
  supportsVision: boolean             // 是否支持图像输入(content[] 中可含 image_url)
  free?: boolean                      // 是否免费
  apiKeyRequired: boolean             // 是否需要 API key
  builtin?: boolean                   // 是否内置(不能删除)
  /** 私有请求头(某些渠道需要) */
  customHeaders?: Record<string, string>
  /** 是否启用 thinking/reasoning (Claude/Gemini 特有) */
  supportsThinking?: boolean
}

// === 消息数据结构(OpenAI 风格) ===
export type LLMMessageContent =
  | string
  | LLMContentPart[]

export interface LLMContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: LLMMessageContent
}

export interface LLMRequestOptions {
  provider: LLMProvider
  apiKey: string
  model?: string           // 不传用 defaultModel
  messages: LLMMessage[]
  temperature?: number
  maxTokens?: number
  jsonMode?: boolean       // 强制 JSON 输出(支持时)
  /** 透传私有参数(给有特殊字段的渠道用) */
  extra?: Record<string, any>
}

export interface LLMResponse {
  content: string
  model: string
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  raw?: any  // 完整响应, 调试用
}

// === 内置预置渠道(全部走 OpenAI 协议) ===
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
    // 通过 OpenRouter 中转, 数据结构仍是 OpenAI
    id: 'anthropic',
    name: 'Anthropic Claude (via OpenRouter)',
    type: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3.5-haiku',
    models: [
      'anthropic/claude-3.5-haiku',
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3-opus',
    ],
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
    id: 'deepseek',
    name: 'DeepSeek',
    type: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    supportsVision: false,
    apiKeyRequired: true,
    builtin: true,
    supportsThinking: true,  // deepseek-reasoner 支持思考
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    type: 'openai',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-flash',
    models: ['glm-4-flash', 'glm-4', 'glm-4v-plus', 'glm-4-long'],
    supportsVision: true,
    free: true,
    apiKeyRequired: true,
    builtin: true,
  },
  {
    id: 'dashscope',
    name: '阿里云百炼 (DashScope)',
    type: 'openai',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-turbo',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-vl-plus', 'qwen-max'],
    supportsVision: true,
    free: true,
    apiKeyRequired: true,
    builtin: true,
  },
  {
    id: 'mock',
    name: 'Mock 模拟 (零成本测试)',
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

// === 核心: chatCompletion (统一 OpenAI 协议) ===
export async function chatCompletion(opts: LLMRequestOptions): Promise<LLMResponse> {
  const { provider, apiKey, model, messages, temperature = 0.7, maxTokens = 1024, jsonMode = false, extra = {} } = opts

  if (provider.id === 'mock') {
    return mockLLMResponse(opts)
  }

  if (!apiKey && provider.apiKeyRequired) {
    throw new Error(`${provider.name} 需要 API key, 请在设置中配置`)
  }

  // 所有渠道统一发到 {baseUrl}/chat/completions
  const body: any = {
    model: model || provider.defaultModel,
    messages,                  // OpenAI 风格 messages
    temperature,
    max_tokens: maxTokens,
    stream: false,
    ...extra,                  // 私有参数透传
  }
  if (jsonMode) body.response_format = { type: 'json_object' }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    ...(provider.customHeaders || {}),
  }

  const resp = await fetchWithTimeout(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  }, 30_000)

  if (!resp.ok) {
    const errText = await resp.text()
    throw new Error(`${provider.name} ${resp.status}: ${errText.slice(0, 200)}`)
  }
  const data = await resp.json()

  // 统一从 OpenAI 风格响应解析
  return {
    content: data.choices?.[0]?.message?.content ?? '',
    model: data.model ?? (model || provider.defaultModel),
    usage: data.usage,
    raw: data,
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
  await new Promise(r => setTimeout(r, 800 + Math.random() * 600))

  const lastMsg = opts.messages[opts.messages.length - 1]
  const userText = typeof lastMsg?.content === 'string' ? lastMsg.content : ''

  if (opts.jsonMode) {
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
    throw new Error(`${opts.provider.name} 不支持图像输入,请选其他渠道(OpenRouter / OpenAI / 硅基流动 / 智谱)`)
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

// === 自定义 LLM Provider 工具 ===
/** 创建一个用户自定义的 LLM provider(走 OpenAI 协议) */
export function createCustomLLMProvider(opts: {
  name: string
  baseUrl: string
  defaultModel: string
  models?: string[]
  supportsVision?: boolean
  apiKeyRequired?: boolean
  customHeaders?: Record<string, string>
}): LLMProvider {
  // 修复 P1-2: 协议校验
  if (!/^https?:\/\//i.test(opts.baseUrl)) {
    throw new Error('baseUrl 必须以 http:// 或 https:// 开头')
  }
  return {
    id: `custom-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`,
    name: opts.name,
    type: 'openai',
    baseUrl: opts.baseUrl.replace(/\/$/, ''),  // 去尾部斜杠
    defaultModel: opts.defaultModel,
    models: opts.models || [opts.defaultModel],
    supportsVision: opts.supportsVision ?? false,
    apiKeyRequired: opts.apiKeyRequired ?? true,
    builtin: false,
    customHeaders: opts.customHeaders,
  }
}
