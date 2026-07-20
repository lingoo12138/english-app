// 多渠道 TTS
// v0.12: 统一抽象, 支持自定义 HTTP 端点
// - browser: 浏览器内置 Web Speech API
// - mock: 零成本测试
// - http: 用户自定义 HTTP 端点(Edge TTS / Azure / 有道 / ElevenLabs 等)
//   - 期望协议: POST {endpoint}, body { text, voice?, rate?, format? }, 返回 audio/mpeg 或 JSON { audio: 'data:...' }

export type TTSProviderType = 'browser' | 'mock' | 'http'

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
  {
    id: 'edge-free',
    name: 'Edge TTS (免费, 浏览器直连)',
    type: 'http',
    builtin: true,
    apiKeyRequired: false,
    description: '通过 edge-tts 免费 API, 需配合 CORS 代理',
    endpoint: 'https://edge-tts-proxy.example.com/synthesize',
    bodyTemplate: JSON.stringify({
      text: '{{text}}',
      voice: 'en-US-AriaNeural',
      rate: '+0%',
    }),
    audioFormat: 'audio/mpeg',
  },
]

// === 浏览器原生 ===
import { useStore } from '../store/useStore'

let currentUtter: SpeechSynthesisUtterance | null = null
let currentAudio: HTMLAudioElement | null = null

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
    currentAudio.pause()
    currentAudio = null
  }
  currentUtter = null
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
  return {
    id: `tts-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
