// 多渠道翻译
// 内置: 浏览器内置(无 API) / MyMemory(免费) / 百度翻译 / 谷歌翻译(非官方) / Mock
import { BUILTIN_LLM_PROVIDERS, LLMProvider } from './providers/llm'

export type TranslateProviderType = 'mymemory' | 'baidu' | 'google-free' | 'llm' | 'mock'

export interface TranslateProvider {
  id: string
  name: string
  type: TranslateProviderType
  /** 一些渠道需要 llm provider(如用 LLM 翻译) */
  llmProviderId?: string
  free?: boolean
  apiKeyRequired: boolean
  builtin?: boolean
  description?: string
}

export const BUILTIN_TRANSLATE_PROVIDERS: TranslateProvider[] = [
  {
    id: 'mymemory',
    name: 'MyMemory (免费,推荐)',
    type: 'mymemory',
    free: true,
    apiKeyRequired: false,
    builtin: true,
    description: '公开免费 API, 5000 字/天/IP, 无需注册',
  },
  {
    id: 'baidu',
    name: '百度翻译 (需 APP ID)',
    type: 'baidu',
    apiKeyRequired: true,
    builtin: true,
    description: '官方稳定, 免费 200 万字/月, 需注册 appid + key',
  },
  {
    id: 'llm',
    name: 'LLM 智能翻译 (消耗 LLM)',
    type: 'llm',
    llmProviderId: 'openrouter',
    apiKeyRequired: false,
    builtin: true,
    description: '用 LLM 做翻译, 上下文理解更强, 但慢且消耗 token',
  },
  {
    id: 'mock',
    name: 'Mock 模拟 (零成本测试)',
    type: 'mock',
    free: true,
    apiKeyRequired: false,
    builtin: true,
    description: '返回固定翻译, 用于测试流程',
  },
]

export interface TranslateResult {
  text: string
  source: string  // 'mymemory' / 'baidu' / 'llm' / 'mock'
  detectedFrom?: string
}

export interface TranslateOptions {
  provider: TranslateProvider
  text: string
  from?: string  // 'en' / 'zh' / 'auto'
  to?: string
  apiKeys?: Record<string, string>     // 通用 key 字典
  llmProviders?: LLMProvider[]
}

export async function translate(opts: TranslateOptions): Promise<TranslateResult> {
  const { provider, text } = opts
  if (!text.trim()) throw new Error('翻译内容不能为空')
  const truncated = text.length > 1000 ? text.slice(0, 1000) : text

  switch (provider.type) {
    case 'mymemory':
      return translateMyMemory(truncated, opts.from || 'auto', opts.to || 'zh')
    case 'baidu':
      return translateBaidu(truncated, opts)
    case 'llm':
      return translateLLM(truncated, opts)
    case 'mock':
      return translateMock(truncated)
    default:
      throw new Error(`未知的翻译渠道: ${provider.type}`)
  }
}

async function translateMyMemory(text: string, from: string, to: string): Promise<TranslateResult> {
  const resp = await fetchWithTimeout(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`,
    { method: 'GET' },
    8000,
  )
  if (!resp.ok) throw new Error(`MyMemory ${resp.status}`)
  const data = await resp.json()
  const translated = data.responseData?.translatedText
  if (!translated) throw new Error('MyMemory 返回空')
  return {
    text: translated,
    source: 'mymemory',
    detectedFrom: data.responseData?.match !== 1 ? 'auto' : undefined,
  }
}

async function translateBaidu(text: string, opts: TranslateOptions): Promise<TranslateResult> {
  const apiKey = opts.apiKeys?.['baidu'] || ''
  if (!apiKey) throw new Error('百度翻译需要配置 appid+key, 格式: appid|key')
  const [appid, key] = apiKey.split('|')
  if (!appid || !key) throw new Error('百度翻译配置格式错误, 应为: appid|key')

  const salt = String(Date.now())
  const sign = await md5(appid + text + salt + key)
  const resp = await fetchWithTimeout(
    `https://fanyi-api.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(text)}&from=auto&to=zh&appid=${appid}&salt=${salt}&sign=${sign}`,
    { method: 'GET' },
    8000,
  )
  if (!resp.ok) throw new Error(`Baidu ${resp.status}`)
  const data = await resp.json()
  if (data.error_code) throw new Error(`百度错误 ${data.error_code}: ${data.error_msg}`)
  return {
    text: data.trans_result?.[0]?.dst || '',
    source: 'baidu',
  }
}

async function translateLLM(text: string, opts: TranslateOptions): Promise<TranslateResult> {
  const { chatCompletion } = await import('./providers/llm')
  const llmProvider = opts.llmProviders?.find(p => p.id === opts.provider.llmProviderId)
  if (!llmProvider) throw new Error('LLM 翻译渠道未配置对应的 LLM provider')
  const apiKey = opts.apiKeys?.[llmProvider.id] || ''
  if (llmProvider.apiKeyRequired && !apiKey) {
    throw new Error(`${llmProvider.name} 翻译需要 API key`)
  }
  const resp = await chatCompletion({
    provider: llmProvider,
    apiKey,
    messages: [
      { role: 'system', content: '你是一个专业的中英翻译助手, 只返回翻译结果, 不要加任何解释。' },
      { role: 'user', content: `请将下面的 ${opts.from === 'zh' ? '中文' : '英文'} 翻译成 ${opts.to === 'en' ? '英文' : '中文'}:\n\n${text}` },
    ],
    temperature: 0.3,
    maxTokens: 500,
  })
  return { text: resp.content.trim(), source: `llm:${llmProvider.id}` }
}

async function translateMock(text: string): Promise<TranslateResult> {
  await new Promise(r => setTimeout(r, 400 + Math.random() * 300))
  // 简单 mock: 返回 "[翻译] " 前缀
  return {
    text: `[Mock 翻译] ${text}`,
    source: 'mock',
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

async function md5(str: string): Promise<string> {
  // 用 Web Crypto 不行(只 SHA), 用一个简单的实现
  // 实际上用 spark-md5 库更安全,但我们不引入新依赖
  // 这里用一个简化的实现: 调用后端拿 (但我们没有后端)
  // 退而求其次: 用一个在线 md5 服务(隐私问题) 或 内置
  // 用 SubtleCrypto 不可行(只支持 SHA)
  // 方案: 引入 blueimp-md5 (5KB)
  const { default: md5 } = await import('blueimp-md5')
  return md5(str)
}
