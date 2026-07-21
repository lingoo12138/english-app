// 多渠道 TTS
// v0.12: 统一抽象, 支持自定义 HTTP 端点
// - browser: 浏览器内置 Web Speech API
// - mock: 零成本测试
// - http: 用户自定义 HTTP 端点(Edge TTS / Azure / 有道 / ElevenLabs 等)
//   - 期望协议: POST {endpoint}, body { text, voice?, rate?, format? }, 返回 audio/mpeg 或 JSON { audio: 'data:...' }
// v0.13: 内置 3 个新渠道
// - edge: 浏览器直连 Microsoft Edge TTS (WebSocket + SSML, 免费, 需 CORS 允许)
// - azure: Microsoft Azure Speech (REST, 需 API Key + Region)
// - elevenlabs: ElevenLabs (HTTP POST, 需 API Key)

export type TTSProviderType = 'browser' | 'mock' | 'http' | 'edge' | 'azure' | 'elevenlabs' | 'baidu' | 'google' | 'iflytek'

export interface TTSProvider {
  id: string
  name: string
  type: TTSProviderType
  builtin?: boolean
  apiKeyRequired: boolean
  description?: string
  /** HTTP 端点(type=http 时必填) */
  endpoint?: string
  /** HTTP 请求头(鉴权等) */
  headers?: Record<string, string>
  /** HTTP 请求体模板(支持 {{text}} {{voice}} {{rate}} 占位) */
  bodyTemplate?: string
  /** 音频格式(用于 audio 元素) */
  audioFormat?: string
  /** 默认 voice */
  defaultVoice?: string
}

export const BUILTIN_TTS_PROVIDERS: TTSProvider[] = [
  {
    id: 'browser',
    name: '浏览器内置 (Web Speech API)',
    type: 'browser',
    builtin: true,
    apiKeyRequired: false,
    description: '免费, 离线, 不同浏览器音色不同',
  },
  {
    id: 'mock',
    name: 'Mock (零成本测试)',
    type: 'mock',
    builtin: true,
    apiKeyRequired: false,
    description: '不实际发音, 只显示文字',
  },
  // 注: edge-free HTTP 占位(指向 example.com)已删除, 用户用下面浏览器直连模式或自建代理
  {
    id: 'baidu-tts',
    name: '百度智能云 TTS',
    type: 'baidu',
    builtin: true,
    apiKeyRequired: true,
    description: '百度短文本在线合成, 需 API Key + Secret Key (格式: APIKey|SecretKey), 免费 100万字符/月',
    defaultVoice: 'zh_female_shuangkuai',
  },
  {
    id: 'google-tts',
    name: 'Google Cloud TTS',
    type: 'google',
    builtin: true,
    apiKeyRequired: true,
    description: 'Google Cloud Text-to-Speech, 需 API Key, 每月 1M 字符免费 (WaveNet/Neural2 神经语音)',
    defaultVoice: 'en-US-Neural2-A',
  },
  {
    id: 'iflytek-tts',
    name: '讯飞 TTS (WebSocket)',
    type: 'iflytek',
    builtin: true,
    apiKeyRequired: true,
    description: '科大讯飞在线语音合成, 需 APPID|APIKey|APISecret, 免费 30万字符/2年',
    defaultVoice: 'xiaoyan',
  },
  {
    id: 'edge-tts',
    name: 'Edge TTS (浏览器直连, 免费)',
    type: 'edge',
    builtin: true,
    apiKeyRequired: false,
    description: '浏览器直连 Microsoft Edge 语音服务, WebSocket + SSML。无需 key, 但部分浏览器/网络可能受 CORS 限制。',
    defaultVoice: 'en-US-AriaNeural',
  },
  {
    id: 'azure-speech',
    name: 'Microsoft Azure Speech',
    type: 'azure',
    builtin: true,
    apiKeyRequired: true,
    description: 'Azure Cognitive Services 语音合成。需 API Key + Region (设置格式: key|region, 如 abc123|eastus, region 留空默认 eastus)。',
    defaultVoice: 'en-US-JennyNeural',
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    type: 'elevenlabs',
    builtin: true,
    apiKeyRequired: true,
    description: 'ElevenLabs 高品质 AI 语音。需 API Key, 默认 voice = Bella (EXAVITQu4vr4xnSDxMaL)。',
    defaultVoice: 'EXAVITQu4vr4xnSDxMaL',
  },
]

// === 浏览器原生 ===
import { useStore } from '../store/useStore'

let currentUtter: SpeechSynthesisUtterance | null = null
let currentAudio: HTMLAudioElement | null = null
let currentWS: WebSocket | null = null  // 修复 P0-3: 跟踪活跃 WebSocket

export function getVoices(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) return []
  return window.speechSynthesis.getVoices()
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve([])
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) return resolve(voices)
    const handler = () => {
      window.speechSynthesis.onvoiceschanged = null
      resolve(window.speechSynthesis.getVoices())
    }
    window.speechSynthesis.onvoiceschanged = handler
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 2000)
  })
}

export interface SpeakOptions {
  text: string
  voice?: SpeechSynthesisVoice | string
  rate?: number
  pitch?: number
}

export function speak(opts: SpeakOptions): void {
  const store = useStore.getState()
  const providerId = store.ttsProviderId || 'browser'
  const allTts = [...store.ttsProviders, ...store.customTtsProviders]
  const provider = allTts.find(p => p.id === providerId) || { id: 'browser', name: 'Browser', type: 'browser' as const, apiKeyRequired: false }

  // 停止前一个
  stopSpeak()

  if (provider.type === 'mock') {
    console.log(`[TTS Mock] ${opts.text}`)
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('tts-end'))
    }, 200)
    return
  }

  if (provider.type === 'http') {
    speakHTTP(opts, provider)
    return
  }

  if (provider.type === 'edge') {
    // 修复: 错误传 UI,不是 console
    speakEdge(opts, provider).catch((e) => {
      console.error('TTS Edge error', e)
      window.dispatchEvent(new CustomEvent('tts-error', { detail: e?.message || String(e) }))
    })
    return
  }

  if (provider.type === 'azure') {
    speakAzure(opts, provider, store).catch((e) => {
      console.error('TTS Azure error', e)
      window.dispatchEvent(new CustomEvent('tts-error', { detail: e?.message || String(e) }))
    })
    return
  }

  if (provider.type === 'elevenlabs') {
    speakElevenLabs(opts, provider, store).catch((e) => {
      console.error('TTS ElevenLabs error', e)
      window.dispatchEvent(new CustomEvent('tts-error', { detail: e?.message || String(e) }))
    })
    return
  }

  if (provider.type === 'baidu') {
    speakBaidu(opts, provider, store).catch((e) => {
      console.error('TTS Baidu error', e)
      window.dispatchEvent(new CustomEvent('tts-error', { detail: e?.message || String(e) }))
    })
    return
  }

  if (provider.type === 'google') {
    speakGoogle(opts, provider, store).catch((e) => {
      console.error('TTS Google error', e)
      window.dispatchEvent(new CustomEvent('tts-error', { detail: e?.message || String(e) }))
    })
    return
  }

  if (provider.type === 'iflytek') {
    speakIflytek(opts, provider, store).catch((e) => {
      console.error('TTS Iflytek error', e)
      window.dispatchEvent(new CustomEvent('tts-error', { detail: e?.message || String(e) }))
    })
    return
  }

  // 浏览器原生
  if (!('speechSynthesis' in window)) {
    console.warn('当前浏览器不支持语音朗读')
    return
  }

  const finalRate = opts.rate ?? store.rate
  const utter = new SpeechSynthesisUtterance(opts.text)
  utter.lang = 'en-US'
  utter.rate = finalRate
  utter.pitch = opts.pitch ?? 1

  if (opts.voice && typeof opts.voice !== 'string') {
    utter.voice = opts.voice
  } else if (typeof opts.voice === 'string') {
    utter.voice = getVoices().find(v => v.name === opts.voice) || null
  } else if (store.voiceName) {
    const v = getVoices().find(v => v.name === store.voiceName)
    if (v) utter.voice = v
    else console.warn(`TTS: 用户选定的 voice "${store.voiceName}" 不可用`)
  }

  currentUtter = utter
  window.speechSynthesis.speak(utter)
}

async function speakHTTP(opts: SpeakOptions, provider: TTSProvider): Promise<void> {
  if (!provider.endpoint) {
    console.warn(`TTS ${provider.name} 未配置 endpoint`)
    return
  }
  const store = useStore.getState()
  const apiKey = store.ttsApiKeys[provider.id] || ''

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(provider.headers || {}),
  }
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  // 解析 body 模板
  let body: any
  if (provider.bodyTemplate) {
    const text = provider.bodyTemplate
      .replace(/\{\{text\}\}/g, JSON.stringify(opts.text))
      .replace(/\{\{voice\}\}/g, JSON.stringify(opts.voice || provider.defaultVoice || ''))
      .replace(/\{\{rate\}\}/g, JSON.stringify(String(opts.rate || 1)))
    try {
      body = JSON.parse(text)
    } catch (e) {
      body = { text: opts.text }
    }
  } else {
    body = { text: opts.text, voice: opts.voice, rate: opts.rate }
  }

  try {
    const resp = await fetch(provider.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    if (!resp.ok) {
      const err = await resp.text()
      throw new Error(`HTTP ${resp.status}: ${err.slice(0, 200)}`)
    }

    const contentType = resp.headers.get('content-type') || ''
    let audioUrl: string

    if (contentType.startsWith('audio/')) {
      const blob = await resp.blob()
      audioUrl = URL.createObjectURL(blob)
    } else {
      // JSON: { audio: 'data:audio/mpeg;base64,...' } 或 { url: 'https://...' }
      const data = await resp.json()
      if (data.audio) audioUrl = data.audio
      else if (data.url) audioUrl = data.url
      else throw new Error('HTTP 响应未含 audio/url 字段')
    }

    const audio = new Audio(audioUrl)
    currentAudio = audio
    audio.play().catch(e => console.warn('TTS play error', e))
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl)
      window.dispatchEvent(new CustomEvent('tts-end'))
    }
  } catch (e: any) {
    console.error('TTS HTTP error', e)
    window.dispatchEvent(new CustomEvent('tts-error', { detail: e?.message || String(e) }))
    throw e
  }
}

export function speakSlow(text: string): void {
  speak({ text, rate: 0.5 })
}

export function stopSpeak(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
  if (currentAudio) {
    try { currentAudio.pause() } catch {}
    currentAudio = null
  }
  // 修复 P0-3: 关闭活跃 WebSocket(Edge TTS)
  if (currentWS) {
    try { currentWS.close() } catch {}
    currentWS = null
  }
  currentUtter = null
}

// === Edge TTS (浏览器直连 Microsoft Edge, WebSocket + SSML) ===
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(t)
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildSSML(text: string, voice: string, rate: number): string {
  // rate: 0.5 - 2.0 映射到 -50% ~ +100%
  const pct = Math.round((rate - 1) * 100)
  const rateStr = (pct >= 0 ? '+' : '') + pct + '%'
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">` +
    `<voice name="${voice}">` +
    `<prosody rate="${rateStr}">${escapeXml(text)}</prosody>` +
    `</voice>` +
    `</speak>`
  )
}

async function speakEdge(opts: SpeakOptions, provider: TTSProvider): Promise<void> {
  const voice = (typeof opts.voice === 'string' ? opts.voice : provider.defaultVoice) || 'en-US-AriaNeural'
  const rate = opts.rate ?? useStore.getState().rate
  const ssml = buildSSML(opts.text, voice, rate)

  // 1. 拿 TrustedClientToken
  let token: string
  try {
    const tokenResp = await fetch('https://edge.microsoft.com/Token/IssueToken', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + btoa('edge.microsoft.com') },
    })
    if (!tokenResp.ok) throw new Error(`HTTP ${tokenResp.status}`)
    token = (await tokenResp.text()).trim()
    if (!token) throw new Error('空 token')
  } catch (e: any) {
    throw new Error(`Edge TTS 拿 token 失败 (可能 CORS / 网络问题): ${e?.message || e}`)
  }

  // 2. WebSocket 合成
  return new Promise<void>((resolve, reject) => {
    const connId = Math.random().toString(36).slice(2, 12)
    const wsUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${encodeURIComponent(token)}&ConnectionId=${connId}`

    let ws: WebSocket
    try {
      ws = new WebSocket(wsUrl)
    } catch (e: any) {
      reject(new Error('Edge WebSocket 创建失败: ' + (e?.message || e)))
      return
    }

    const chunks: ArrayBuffer[] = []
    const TIMEOUT_MS = 15000
    const timer = setTimeout(() => {
      try { ws.close() } catch {}
      reject(new Error(`Edge TTS 超时 (${TIMEOUT_MS / 1000}s)`))
    }, TIMEOUT_MS)

    let settled = false
    const settle = (fn: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try { ws.close() } catch {}
      fn()
    }

    ws.onopen = () => {
      try {
        ws.send(
          'Content-Type:application/json; charset=utf-8\r\n' +
          'Path:speech.config\r\n' +
          '\r\n' +
          JSON.stringify({
            context: {
              synthesis: {
                audio: {
                  metadataoptions: { sentenceBoundaryEnabled: 'false', wordBoundaryEnabled: 'false' },
                  outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
                },
              },
            },
          })
        )
        setTimeout(() => {
          try {
            ws.send(
              `X-RequestId:${connId}\r\n` +
              `Content-Type:application/ssml+xml\r\n` +
              `Path:ssml\r\n` +
              `\r\n${ssml}`
            )
          } catch (e: any) {
            settle(() => reject(new Error('Edge 发送 SSML 失败: ' + (e?.message || e))))
          }
        }, 100)
      } catch (e: any) {
        settle(() => reject(new Error('Edge WebSocket 发送失败: ' + (e?.message || e))))
      }
    }

    ws.onmessage = (e) => {
      if (e.data instanceof ArrayBuffer) {
        chunks.push(e.data)
        return
      }
      const text = e.data as string
      if (text && text.includes('Path:turn.end')) {
        if (chunks.length === 0) {
          settle(() => reject(new Error('Edge TTS 未返回音频数据')))
          return
        }
        const blob = new Blob(chunks, { type: 'audio/mpeg' })
        const audioUrl = URL.createObjectURL(blob)
        const audio = new Audio(audioUrl)
        currentAudio = audio
        const cleanup = () => {
          URL.revokeObjectURL(audioUrl)
          if (currentAudio === audio) currentAudio = null
          window.dispatchEvent(new CustomEvent('tts-end'))
        }
        audio.onended = () => settle(() => { cleanup(); resolve() })
        audio.onerror = () => settle(() => { cleanup(); reject(new Error('Edge 音频播放失败')) })
        audio.play().catch(err => settle(() => { cleanup(); reject(new Error('Edge 播放失败: ' + (err?.message || err))) }))
      }
    }

    ws.onerror = () => settle(() => reject(new Error('Edge WebSocket 错误 (可能被 CORS / 网络 / 浏览器策略拦截)')))
    ws.onclose = (e) => {
      if (e.code !== 1000) {
        settle(() => reject(new Error(`Edge WebSocket 关闭 (code=${e.code})`)))
      }
    }
  })
}

// === Azure Speech (HTTP REST) ===
async function speakAzure(opts: SpeakOptions, provider: TTSProvider, store: any): Promise<void> {
  const combined = (store.ttsApiKeys[provider.id] || '').trim()
  if (!combined) {
    throw new Error('Azure Speech 需要 API Key (格式: key|region, 如 abc123|eastus, region 留空默认 eastus)')
  }
  const pipeIdx = combined.indexOf('|')
  const apiKey = pipeIdx >= 0 ? combined.slice(0, pipeIdx).trim() : combined
  const region = pipeIdx >= 0 ? combined.slice(pipeIdx + 1).trim() : ''
  if (!apiKey) throw new Error('Azure Speech: 缺少 API Key')

  const finalRegion = region || 'eastus'
  const voice = (typeof opts.voice === 'string' ? opts.voice : provider.defaultVoice) || 'en-US-JennyNeural'
  const rate = opts.rate ?? store.rate
  const ssml = buildSSML(opts.text, voice, rate)

  const resp = await fetch(
    `https://${finalRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      },
      body: ssml,
    }
  )
  if (!resp.ok) {
    const err = await resp.text().catch(() => '')
    throw new Error(`Azure Speech ${resp.status}: ${err.slice(0, 200)}`)
  }
  const blob = await resp.blob()
  const audioUrl = URL.createObjectURL(blob)
  const audio = new Audio(audioUrl)
  currentAudio = audio
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      URL.revokeObjectURL(audioUrl)
      if (currentAudio === audio) currentAudio = null
      window.dispatchEvent(new CustomEvent('tts-end'))
    }
    audio.onended = () => { cleanup(); resolve() }
    audio.onerror = () => { cleanup(); reject(new Error('Azure 音频播放失败')) }
    audio.play().catch(err => { cleanup(); reject(new Error('Azure 播放失败: ' + (err?.message || err))) })
  })
}

// === ElevenLabs (HTTP POST) ===
async function speakElevenLabs(opts: SpeakOptions, provider: TTSProvider, store: any): Promise<void> {
  const apiKey = store.ttsApiKeys[provider.id]
  if (!apiKey) throw new Error('ElevenLabs 需要 API Key')

  const voiceId = (typeof opts.voice === 'string' ? opts.voice : provider.defaultVoice) || 'EXAVITQu4vr4xnSDxMaL'
  const modelId = 'eleven_monolingual_v1'

  const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text: opts.text,
      model_id: modelId,
      voice_settings: { stability: 0.5, similarity_boost: 0.5 },
    }),
  })
  if (!resp.ok) {
    const err = await resp.text().catch(() => '')
    throw new Error(`ElevenLabs ${resp.status}: ${err.slice(0, 200)}`)
  }
  const blob = await resp.blob()
  const audioUrl = URL.createObjectURL(blob)
  const audio = new Audio(audioUrl)
  currentAudio = audio
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      URL.revokeObjectURL(audioUrl)
      if (currentAudio === audio) currentAudio = null
      window.dispatchEvent(new CustomEvent('tts-end'))
    }
    audio.onended = () => { cleanup(); resolve() }
    audio.onerror = () => { cleanup(); reject(new Error('ElevenLabs 音频播放失败')) }
    audio.play().catch(err => { cleanup(); reject(new Error('ElevenLabs 播放失败: ' + (err?.message || err))) })
  })
}

// === 百度智能云 TTS ===
// API 文档: https://cloud.baidu.com/doc/SPEECH/s/Vk38lxily
// 鉴权: API Key + Secret Key 换 access_token (30 天有效, 这里加 1h 缓存避免每次重新换)
let baiduTokenCache: { token: string; expiresAt: number } | null = null

async function getBaiduAccessToken(apiKey: string, secretKey: string): Promise<string> {
  if (baiduTokenCache && baiduTokenCache.expiresAt > Date.now()) {
    return baiduTokenCache.token
  }
  const resp = await fetchWithTimeout(
    `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${encodeURIComponent(apiKey)}&client_secret=${encodeURIComponent(secretKey)}`,
    { method: 'POST' },
    10000,
  )
  if (!resp.ok) throw new Error(`百度 TTS token 失败 ${resp.status}`)
  const data = await resp.json()
  if (!data.access_token) throw new Error(`百度 TTS 拿不到 access_token: ${data.error_description || JSON.stringify(data)}`)
  // 缓存 1h(实际 30 天, 但保守 1h 防止 token 失效未刷新)
  baiduTokenCache = { token: data.access_token, expiresAt: Date.now() + 60 * 60 * 1000 }
  return data.access_token
}

async function speakBaidu(opts: SpeakOptions, provider: TTSProvider, store: any): Promise<void> {
  const apiKeyCombined = store.ttsApiKeys?.[provider.id] || ''
  if (!apiKeyCombined) throw new Error('百度 TTS 需要配置 API Key|Secret Key')
  const [apiKey, secretKey] = apiKeyCombined.split('|')
  if (!apiKey || !secretKey) throw new Error('百度 TTS 配置格式: APIKey|SecretKey (用 | 分隔)')

  // 1. 拿 access_token (缓存 1h)
  const accessToken = await getBaiduAccessToken(apiKey, secretKey)

  // 2. 调 TTS API
  const voice = (typeof opts.voice === 'string' ? opts.voice : provider.defaultVoice) || 'zh_female_shuangkuai'
  // rate 0.5-2.0 映射到百度 speed 0-9: 0.5→0, 1.0→4, 2.0→9
  const speed = Math.max(0, Math.min(9, Math.round((opts.rate ?? 1) * 4)))
  const ttsResp = await fetchWithTimeout(
    `https://tsn.baidu.com/text2audio?tex=${encodeURIComponent(opts.text)}&tok=${accessToken}&cuid=english-app&ctp=1&lan=zh&spd=${speed}&pit=5&vol=5&per=${voice}&aue=mp3`,
    { method: 'GET' },
    15000,
  )
  if (!ttsResp.ok) throw new Error(`百度 TTS 合成失败 ${ttsResp.status}`)
  const blob = await ttsResp.blob()
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  currentAudio = audio
  await new Promise<void>((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(url)
      if (currentAudio === audio) currentAudio = null
      window.dispatchEvent(new CustomEvent('tts-end'))
      resolve()
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      if (currentAudio === audio) currentAudio = null
      reject(new Error('百度 TTS 播放失败'))
    }
    audio.play().catch(err => reject(new Error('百度 TTS 播放失败: ' + (err?.message || err))))
  })
}

// === Google Cloud TTS ===
// API 文档: https://cloud.google.com/text-to-speech/docs/rest
// 鉴权: API Key 作为查询参数 ?key=...
async function speakGoogle(opts: SpeakOptions, provider: TTSProvider, store: any): Promise<void> {
  const apiKey = store.ttsApiKeys?.[provider.id] || ''
  if (!apiKey) throw new Error('Google TTS 需要 API Key')

  const voice = (typeof opts.voice === 'string' ? opts.voice : provider.defaultVoice) || 'en-US-Neural2-A'
  const voiceName = voice
  // 解析 voice name 拿 language code
  const lang = voiceName.startsWith('zh') ? 'cmn-CN' : voiceName.split('-').slice(0, 2).join('-') || 'en-US'
  const rate = Math.max(0.25, Math.min(4, opts.rate || 1))

  const resp = await fetchWithTimeout(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: opts.text },
        voice: {
          languageCode: lang,
          name: voiceName,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: rate,
        },
      }),
    },
    15000,
  )
  if (!resp.ok) {
    const errText = await resp.text()
    throw new Error(`Google TTS ${resp.status}: ${errText.slice(0, 200)}`)
  }
  const data = await resp.json()
  // audioContent 是 base64 编码的 MP3
  const audioContent = data.audioContent
  if (!audioContent) throw new Error('Google TTS 返回空 audioContent')
  // base64 → Uint8Array (用 atob + 循环, 兼容性最广)
  const binary = atob(audioContent)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'audio/mpeg' })
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  currentAudio = audio
  await new Promise<void>((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(url)
      if (currentAudio === audio) currentAudio = null
      window.dispatchEvent(new CustomEvent('tts-end'))
      resolve()
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      if (currentAudio === audio) currentAudio = null
      reject(new Error('Google TTS 播放失败'))
    }
    audio.play().catch(err => reject(new Error('Google TTS 播放失败: ' + (err?.message || err))))
  })
}

// === 讯飞 TTS (WebSocket) ===
// API 文档: https://www.xfyun.cn/doc/asr/voicedictation/API.html
// 鉴权: APPID|APIKey|APISecret (用 | 分隔)
// WebSocket URL 鉴权: 用 HMAC-SHA256 在 URL 加 authorization 参数
async function speakIflytek(opts: SpeakOptions, provider: TTSProvider, store: any): Promise<void> {
  const apiKeyCombined = store.ttsApiKeys?.[provider.id] || ''
  if (!apiKeyCombined) throw new Error('讯飞 TTS 需要配置 APPID|APIKey|APISecret')
  const [appId, apiKey, apiSecret] = apiKeyCombined.split('|')
  if (!appId || !apiKey || !apiSecret) throw new Error('讯飞 TTS 配置格式: APPID|APIKey|APISecret (用 | 分隔)')

  const voice = (typeof opts.voice === 'string' ? opts.voice : provider.defaultVoice) || 'xiaoyan'
  const host = 'cbm01.cn-huabei-1.xf-yun.com'
  const path = '/v1/private/mcd9mcd97t1b'
  const date = new Date().toUTCString()
  const algorithm = 'hmac-sha256'
  const headers = 'host date request-line'
  const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`
  // 简化的 HMAC-SHA256 签名(用 Web Crypto API)
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(signatureOrigin))
  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
  const authorization = `api_key="${apiKey}", algorithm="${algorithm}", headers="${headers}", signature="${sigBase64}"`
  const url = `wss://${host}${path}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${host}`

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    currentWS = ws
    const audioChunks: ArrayBuffer[] = []
    let settled = false

    function settle(fn: () => void) {
      if (settled) return
      settled = true
      try { ws.close() } catch {}
      if (currentWS === ws) currentWS = null
      fn()
    }

    ws.onopen = () => {
      const speed = Math.max(0, Math.min(100, Math.round((opts.rate || 1) * 50)))
      const req = {
        header: { app_id: appId, status: 2 },
        parameter: {
          tts: {
            vcn: voice,
            speed,
            volume: 50,
            pitch: 50,
            audio: { encoding: 'raw', sample_rate: 16000, channels: 1, bit_depth: 16 },
          },
        },
        payload: {
          text: {
            encoding: 'utf8',
            compress: 'raw',
            format: 'plain',
            status: 2,
            text: btoa(String.fromCharCode(...new TextEncoder().encode(opts.text))),
          },
        },
      }
      ws.send(JSON.stringify(req))
    }

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data as string)
        if (data.payload?.audio?.audio) {
          // base64 音频
          const audioBase64 = data.payload.audio.audio
          const binary = atob(audioBase64)
          const bytes = new Uint8Array(binary.length)
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
          audioChunks.push(bytes.buffer)
        }
        if (data.payload?.audio?.status === 2) {
          // 合成完成
          const blob = new Blob(audioChunks, { type: 'audio/wav' })
          const audioUrl = URL.createObjectURL(blob)
          const audio = new Audio(audioUrl)
          currentAudio = audio
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl)
            if (currentAudio === audio) currentAudio = null
            window.dispatchEvent(new CustomEvent('tts-end'))
          }
          audio.play().catch(err => {
            URL.revokeObjectURL(audioUrl)
            reject(new Error('讯飞 TTS 播放失败: ' + (err?.message || err)))
          })
          settle(resolve)
        }
      } catch (err) {
        // 不是 JSON,可能是二进制
        if (e.data instanceof ArrayBuffer) {
          audioChunks.push(e.data)
        }
      }
    }

    ws.onerror = () => settle(() => reject(new Error('讯飞 TTS WebSocket 错误(可能被 CORS / 网络 / 浏览器策略拦截)')))
    ws.onclose = (e) => {
      if (e.code !== 1000 && !settled) {
        reject(new Error(`讯飞 TTS WebSocket 关闭 (code ${e.code})`))
      }
    }
    setTimeout(() => settle(() => reject(new Error('讯飞 TTS 超时'))), 20000)
  })
}

// === 自定义 TTS Provider 工具 ===
export function createCustomTTSProvider(opts: {
  name: string
  endpoint: string
  bodyTemplate?: string
  headers?: Record<string, string>
  audioFormat?: string
  defaultVoice?: string
  apiKeyRequired?: boolean
}): TTSProvider {
  if (!/^https?:\/\//i.test(opts.endpoint)) {
    throw new Error('endpoint 必须以 http:// 或 https:// 开头')
  }
  return {
    id: `tts-custom-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`,
    name: opts.name,
    type: 'http',
    endpoint: opts.endpoint,
    bodyTemplate: opts.bodyTemplate,
    headers: opts.headers,
    audioFormat: opts.audioFormat || 'audio/mpeg',
    defaultVoice: opts.defaultVoice,
    apiKeyRequired: opts.apiKeyRequired ?? true,
    builtin: false,
  }
}
