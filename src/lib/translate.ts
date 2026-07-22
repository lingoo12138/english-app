// 多渠道翻译
// 内置: 浏览器内置(无 API) / MyMemory(免费) / 百度翻译 / 谷歌翻译(非官方) / Mock
import { BUILTIN_LLM_PROVIDERS, LLMProvider } from './providers/llm'

export type TranslateProviderType = 'mymemory' | 'baidu' | 'google' | 'youdao' | 'deepl' | 'tencent' | 'custom' | 'llm' | 'mock'

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
  /** 自定义端点(type=custom 时使用, 对齐 LLM/TTS 自定义) */
  endpoint?: string
  headers?: Record<string, string>
  bodyTemplate?: string
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
  {
    id: 'google',
    name: 'Google Translate (免费,非官方)',
    type: 'google',
    free: true,
    apiKeyRequired: false,
    builtin: true,
    description: 'Google 翻译非官方端点, 免费无限次, 无需 API key, 偶发限流',
  },
  {
    id: 'youdao',
    name: '有道智云翻译 (需 appKey)',
    type: 'youdao',
    apiKeyRequired: true,
    builtin: true,
    description: '有道智云, 100万字/月免费, 需 appKey+appSecret (格式: appKey|appSecret)',
  },
  {
    id: 'deepl',
    name: 'DeepL 翻译 (需 API key)',
    type: 'deepl',
    apiKeyRequired: true,
    builtin: true,
    description: 'DeepL 翻译, 50万字/月免费, 质量高, 需注册 API key',
  },
  {
    id: 'tencent',
    name: '腾讯云翻译 (需 SecretId|Key)',
    type: 'tencent',
    apiKeyRequired: true,
    builtin: true,
    description: '腾讯云机器翻译, 免费 5万字/月, 需 SecretId|SecretKey (用 | 分隔)',
  },
]

export interface TranslateResult {
  text: string
  source: string  // 'mymemory' / 'baidu' / 'google' / 'youdao' / 'deepl' / 'tencent' / 'custom' / 'llm' / 'mock'
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
    case 'google':
      return translateGoogle(truncated, opts.from || 'auto', opts.to || 'zh')
    case 'youdao':
      return translateYoudao(truncated, opts)
    case 'deepl':
      return translateDeepL(truncated, opts)
    case 'tencent':
      return translateTencent(truncated, opts)
    case 'custom':
      return translateCustom(truncated, opts)
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

// === 腾讯云翻译 (TC3-HMAC-SHA256 签名) ===
// API 文档: https://cloud.tencent.com/document/api/551/15619
// 鉴权: TC3-HMAC-SHA256, 需要 SecretId + SecretKey
async function translateTencent(text: string, opts: TranslateOptions): Promise<TranslateResult> {
  const from = opts.from || 'auto'
  const to = opts.to || 'zh'
  const apiKeyCombined = opts.apiKeys?.['tencent'] || ''
  if (!apiKeyCombined) throw new Error('腾讯翻译需要配置 SecretId|SecretKey, 格式: SecretId|SecretKey')
  const [secretId, secretKey] = apiKeyCombined.split('|')
  if (!secretId || !secretKey) throw new Error('腾讯翻译配置格式错误, 应为: SecretId|SecretKey (用 | 分隔)')

  const host = 'tmt.tencentcloudapi.com'
  const service = 'tmt'
  const region = 'ap-guangzhou'  // 默认广州
  const action = 'TextTranslate'
  const version = '2018-03-21'
  const algorithm = 'TC3-HMAC-SHA256'

  // 腾讯语言代码: zh / en / ja / ko 等
  const tencentFrom = from === 'auto' ? 'auto' : from === 'zh' ? 'zh' : from === 'en' ? 'en' : from
  const tencentTo = to === 'zh' ? 'zh' : to === 'en' ? 'en' : to

  const payload = JSON.stringify({
    SourceText: text,
    Source: tencentFrom,
    Target: tencentTo,
    ProjectId: 0,
  })

  // TC3 签名
  const timestamp = Math.floor(Date.now() / 1000)
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10)  // YYYY-MM-DD

  // 1. 拼接规范请求串
  const httpRequestMethod = 'POST'
  const canonicalUri = '/'
  const canonicalQueryString = ''
  const canonicalHeaders = `content-type:application/json\nhost:${host}\n`
  const signedHeaders = 'content-type;host'
  const hashedRequestPayload = await sha256Hex(payload)
  const canonicalRequest = [
    httpRequestMethod,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedRequestPayload,
  ].join('\n')

  // 2. 拼接待签串
  const credentialScope = `${date}/${service}/tc3_request`
  const hashedCanonicalRequest = await sha256Hex(canonicalRequest)
  const stringToSign = [
    algorithm,
    timestamp,
    credentialScope,
    hashedCanonicalRequest,
  ].join('\n')

  // 3. 计算签名
  const enc = new TextEncoder()
  const secretDate = await hmacSha256(`TC3${secretKey}`, date)
  const secretService = await hmacSha256Bytes(secretDate, service)
  const secretSigning = await hmacSha256Bytes(secretService, 'tc3_request')
  const signatureBytes = await hmacSha256Bytes(secretSigning, stringToSign)
  const signature = bytesToHex(signatureBytes)

  // 4. 拼装 Authorization
  const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  // 5. 发请求
  const resp = await fetchWithTimeout(`https://${host}/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Host: host,
      'X-TC-Action': action,
      'X-TC-Version': version,
      'X-TC-Timestamp': String(timestamp),
      'X-TC-Region': region,
      Authorization: authorization,
    },
    body: payload,
  }, 8000)
  if (!resp.ok) throw new Error(`腾讯翻译 ${resp.status}`)
  const data = await resp.json()
  if (data.Response?.Error) {
    throw new Error(`腾讯翻译错误: ${data.Response.Error.Code} - ${data.Response.Error.Message}`)
  }
  const translated = data.Response?.TargetText
  if (!translated) throw new Error('腾讯翻译返回空')
  return { text: translated, source: 'tencent' }
}

// SHA-256 十六进制
async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return bytesToHex(new Uint8Array(buf))
}

// HMAC-SHA256 字符串(返回十六进制)
async function hmacSha256(key: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const keyBuf = enc.encode(key)
  const ab = new ArrayBuffer(keyBuf.byteLength)
  new Uint8Array(ab).set(keyBuf)
  const k = await crypto.subtle.importKey(
    'raw',
    ab,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(message))
  return bytesToHex(new Uint8Array(sig))
}

// HMAC-SHA256 字节数组
async function hmacSha256Bytes(keyBytes: Uint8Array | string, message: string): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const keyData = typeof keyBytes === 'string' ? enc.encode(keyBytes) : keyBytes
  const ab2 = new ArrayBuffer(keyData.byteLength)
  new Uint8Array(ab2).set(keyData)
  const k = await crypto.subtle.importKey(
    'raw',
    ab2,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(message))
  return new Uint8Array(sig)
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// === 自定义翻译端点 (对齐 LLM/TTS) ===
// 统一协议: POST {endpoint}, body JSON, 返回 { text: "..." } 或 { translation: [...] }
async function translateCustom(text: string, opts: TranslateOptions): Promise<TranslateResult> {
  const provider = opts.provider
  const endpoint = provider.endpoint
  if (!endpoint) throw new Error('自定义翻译渠道未配置 endpoint')
  const apiKey = opts.apiKeys?.[provider.id] || ''
  if (provider.apiKeyRequired && !apiKey) {
    throw new Error(`${provider.name} 需要配置 API Key`)
  }

  const from = opts.from || 'auto'
  const to = opts.to || 'zh'
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(provider.headers || {}),
  }
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  // 解析 body 模板(支持 {{text}} {{from}} {{to}} 占位)
  let body: any
  if (provider.bodyTemplate) {
    const tpl = provider.bodyTemplate
      .replace(/\{\{text\}\}/g, JSON.stringify(text))
      .replace(/\{\{from\}\}/g, JSON.stringify(from))
      .replace(/\{\{to\}\}/g, JSON.stringify(to))
    try {
      body = JSON.parse(tpl)
    } catch (e) {
      body = { text, from, to }
    }
  } else {
    body = { text, from, to }
  }

  const resp = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  }, 10000)
  if (!resp.ok) {
    const errText = await resp.text()
    throw new Error(`自定义翻译 ${resp.status}: ${errText.slice(0, 200)}`)
  }
  const data = await resp.json()
  // 兼容多种返回格式
  const translated = data.text || data.translation || (Array.isArray(data) ? data[0] : null)
  if (!translated) throw new Error('自定义翻译返回空(期望 { text } 或 { translation })')
  return { text: typeof translated === 'string' ? translated : JSON.stringify(translated), source: 'custom' }
}

// 自定义翻译 Provider 工具(对齐 createCustomLLMProvider/createCustomTTSProvider)
export function createCustomTranslateProvider(opts: {
  name: string
  endpoint: string
  bodyTemplate?: string
  headers?: Record<string, string>
  apiKeyRequired?: boolean
  description?: string
}): TranslateProvider {
  if (!/^https?:\/\//i.test(opts.endpoint)) {
    throw new Error('endpoint 必须以 http:// 或 https:// 开头')
  }
  return {
    id: `translate-custom-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`,
    name: opts.name,
    type: 'custom',
    endpoint: opts.endpoint,
    bodyTemplate: opts.bodyTemplate,
    headers: opts.headers,
    apiKeyRequired: opts.apiKeyRequired ?? true,
    description: opts.description,
    builtin: false,
  }
}

async function translateMock(text: string): Promise<TranslateResult> {
  await new Promise(r => setTimeout(r, 400 + Math.random() * 300))
  // 简单 mock: 返回 "[翻译] " 前缀
  return {
    text: `[Mock 翻译] ${text}`,
    source: 'mock',
  }
}

async function translateGoogle(text: string, from: string, to: string): Promise<TranslateResult> {
  // Google 非官方端点不支持 sl=auto, 用 hasChinese 检测给个默认源语言
  const detectedFrom = from === 'auto' ? (hasChinese(text) ? 'zh-CN' : 'en') : from
  const resp = await fetchWithTimeout(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${detectedFrom}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`,
    { method: 'GET' },
    8000,
  )
  if (!resp.ok) throw new Error(`Google ${resp.status}`)
  const data = await resp.json()
  // data[0] 是翻译结果数组, 每个元素 [translated, original, ...]
  const translated = (data[0] || []).map((seg: any) => seg[0]).join('')
  if (!translated) throw new Error('Google 返回空')
  return { text: translated, source: 'google' }
}

async function translateYoudao(text: string, opts: TranslateOptions): Promise<TranslateResult> {
  const from = opts.from || 'auto'
  const to = opts.to || 'zh'
  const apiKey = opts.apiKeys?.['youdao'] || ''  // 格式: appKey|appSecret
  if (!apiKey) throw new Error('有道翻译需要配置 appKey|appSecret, 格式: appKey|appSecret')
  const [appKey, appSecret] = apiKey.split('|')
  if (!appKey || !appSecret) throw new Error('有道配置格式错误, 应为: appKey|appSecret')

  // 有道 V3 签名算法: input = text.length > 20 ? text[0:10] + len + text[-10:] : text
  const salt = String(Date.now())
  const curtime = String(Math.floor(Date.now() / 1000))
  const input = text.length > 20 ? text.slice(0, 10) + text.length + text.slice(-10) : text
  const signStr = appKey + input + salt + curtime + appSecret
  const sign = await md5(signStr)

  // 有道使用 zh-CHS(简体中文) / en
  const youdaoTo = to === 'zh' ? 'zh-CHS' : to
  const body = new URLSearchParams({
    q: text,
    from,
    to: youdaoTo,
    appKey,
    salt,
    sign,
    signType: 'v3',
    curtime,
  })
  const resp = await fetchWithTimeout('https://openapi.youdao.com/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  }, 8000)
  if (!resp.ok) throw new Error(`Youdao ${resp.status}`)
  const data = await resp.json()
  if (data.errorCode !== '0') throw new Error(`有道错误 ${data.errorCode}`)
  const translated = data.translation?.[0]
  if (!translated) throw new Error('有道返回空')
  return { text: translated, source: 'youdao' }
}

async function translateDeepL(text: string, opts: TranslateOptions): Promise<TranslateResult> {
  const from = opts.from || 'auto'
  const to = opts.to || 'zh'
  const apiKey = opts.apiKeys?.['deepl'] || ''
  if (!apiKey) throw new Error('DeepL 需要 API key')
  // DeepL 使用大写语言代码, source_lang 为空时让 DeepL 自动检测
  const sourceLang = from === 'auto' ? '' : from.toUpperCase()
  const targetLang = to.toUpperCase()
  const resp = await fetchWithTimeout('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      text,
      source_lang: sourceLang,
      target_lang: targetLang,
    }).toString(),
  }, 8000)
  if (!resp.ok) throw new Error(`DeepL ${resp.status}`)
  const data = await resp.json()
  const translated = data.translations?.[0]?.text
  if (!translated) throw new Error('DeepL 返回空')
  return { text: translated, source: 'deepl' }
}

function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text)
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
