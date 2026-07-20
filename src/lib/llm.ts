// LLM 客户端(OpenRouter 统一接口)
// 支持多种视觉模型(Gemini 2.5 Flash 免费 / GPT-4o / Claude 3.5 Sonnet 等)
// 零成本:默认用 google/gemini-2.5-flash:free(OpenRouter 免费层)
import { useStore } from '../store/useStore'

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

export interface ChatMessageContent {
  type: 'text' | 'image_url'
  text?: string
  image_url?: {
    url: string  // data:image/jpeg;base64,... 或 https://...
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ChatMessageContent[]
}

export interface ChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  jsonMode?: boolean  // 让 LLM 返回 JSON
}

export interface ChatResponse {
  content: string
  model: string
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

/** 从 zustand store 读 API key */
function getApiKey(): string {
  return useStore.getState().llmApiKey || ''
}

/** 从 zustand store 读默认 model */
function getDefaultModel(): string {
  return useStore.getState().llmModel || 'google/gemini-2.5-flash:free'
}

/** OpenAI 兼容的 chat completion */
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<ChatResponse> {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('未配置 LLM API Key,请在 设置 → 图片识别 中填入')
  }

  const model = options.model || getDefaultModel()

  const body: Record<string, unknown> = {
    model,
    messages,
  }
  if (options.temperature !== undefined) body.temperature = options.temperature
  if (options.maxTokens) body.max_tokens = options.maxTokens
  if (options.jsonMode) body.response_format = { type: 'json_object' }

  const res = await fetchWithTimeout(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,  // OpenRouter 统计用
      'X-Title': '句刻 (Speakly)',
    },
    body: JSON.stringify(body),
  }, 30_000)  // 30s timeout(图片识别可能慢)

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    if (res.status === 401) throw new Error('API Key 无效,请检查设置')
    if (res.status === 429) throw new Error('请求过于频繁,请稍后再试')
    if (res.status === 402) throw new Error('API 额度用完')
    throw new Error(`API 调用失败 (${res.status}): ${errText.slice(0, 200)}`)
  }

  const data = await res.json()
  return {
    content: data.choices?.[0]?.message?.content || '',
    model: data.model,
    usage: data.usage,
  }
}

// fetch with timeout
function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  return Promise.race([
    fetch(url, init),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error('请求超时(30s),请检查网络或换模型')), timeoutMs)
    ),
  ])
}

/** 把 File 转为 base64 data URL */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
