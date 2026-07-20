// 多渠道 TTS
// 浏览器 Web Speech API (免费, 离线) + 云端 HTTP TTS 占位(可扩展)

export type TTSProviderType = 'browser' | 'mock'

export interface TTSProvider {
  id: string
  name: string
  type: TTSProviderType
  builtin?: boolean
  apiKeyRequired: boolean
  description?: string
}

export const BUILTIN_TTS_PROVIDERS: TTSProvider[] = [
  {
    id: 'browser',
    name: '浏览器内置 (Web Speech API)',
    type: 'browser',
    builtin: true,
    apiKeyRequired: false,
    description: '免费, 离线, 但不同浏览器音色不同',
  },
  {
    id: 'mock',
    name: 'Mock (零成本测试)',
    type: 'mock',
    builtin: true,
    apiKeyRequired: false,
    description: '不实际发音, 只显示文字, 用于测试',
  },
]

// === 浏览器原生 ===
import { useStore } from '../store/useStore'

let currentUtter: SpeechSynthesisUtterance | null = null

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

export function getVoices(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) return []
  return window.speechSynthesis.getVoices()
}

export function speak(opts: {
  text: string
  voice?: SpeechSynthesisVoice
  rate?: number
  pitch?: number
}): void {
  const store = useStore.getState()
  const provider = store.ttsProviderId || 'browser'

  if (provider === 'mock') {
    // Mock: 仅控制台打印 + 触发 end 事件
    console.log(`[TTS Mock] ${opts.text}`)
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('tts-end'))
    }, 200)
    return
  }

  // 浏览器原生
  if (!('speechSynthesis' in window)) {
    console.warn('当前浏览器不支持语音朗读')
    return
  }

  if (currentUtter) {
    window.speechSynthesis.cancel()
    currentUtter = null
  }

  const finalRate = opts.rate ?? store.rate
  const utter = new SpeechSynthesisUtterance(opts.text)
  utter.lang = 'en-US'
  utter.rate = finalRate
  utter.pitch = opts.pitch ?? 1

  if (opts.voice) {
    utter.voice = opts.voice
  } else if (store.voiceName) {
    const all = getVoices()
    const v = all.find(v => v.name === store.voiceName)
    if (v) {
      utter.voice = v
    } else {
      console.warn(`TTS: 用户选定的 voice "${store.voiceName}" 不可用, 使用系统默认`)
    }
  }

  currentUtter = utter
  window.speechSynthesis.speak(utter)
}

export function speakSlow(text: string): void {
  speak({ text, rate: 0.5 })
}

export function stopSpeak(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    currentUtter = null
  }
}
