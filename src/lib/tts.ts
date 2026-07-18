// TTS: 浏览器内置 Web Speech API
// 完全免费,无需联网,但首次使用需联网加载 voice

let cachedVoices: SpeechSynthesisVoice[] = []

// 加载可用的 voice
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      cachedVoices = voices
      resolve(voices)
      return
    }
    // 某些浏览器 voice 是异步加载
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices()
      resolve(cachedVoices)
    }
    // 兜底: 1秒后超时
    setTimeout(() => {
      cachedVoices = window.speechSynthesis.getVoices()
      resolve(cachedVoices)
    }, 1000)
  })
}

export function getVoices(): SpeechSynthesisVoice[] {
  if (cachedVoices.length === 0) {
    cachedVoices = window.speechSynthesis.getVoices()
  }
  return cachedVoices
}

// 选择英文女声(优先选质量好的)
export function pickEnglishVoice(prefer: 'us' | 'uk' = 'us'): SpeechSynthesisVoice | null {
  const voices = getVoices()
  const en = voices.filter(v => v.lang.startsWith('en'))

  // 优先级匹配
  const preferences = prefer === 'us'
    ? ['en-US', 'en-GB']
    : ['en-GB', 'en-US']

  for (const lang of preferences) {
    const match = en.find(v => v.lang === lang && /female|woman|samantha|victoria|aria|jenny/i.test(v.name))
    if (match) return match
  }
  for (const lang of preferences) {
    const match = en.find(v => v.lang === lang)
    if (match) return match
  }
  return en[0] || null
}

// 朗读
export interface SpeakOptions {
  text: string
  rate?: number                     // 0.1 - 10
  pitch?: number                    // 0 - 2
  voice?: SpeechSynthesisVoice
}

export function speak({ text, rate = 1, pitch = 1, voice }: SpeakOptions) {
  if (!('speechSynthesis' in window)) {
    console.warn('浏览器不支持 TTS')
    return
  }
  // 取消正在播放的
  window.speechSynthesis.cancel()

  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'en-US'
  utter.rate = rate
  utter.pitch = pitch
  if (voice) utter.voice = voice
  else {
    const v = pickEnglishVoice()
    if (v) utter.voice = v
  }
  window.speechSynthesis.speak(utter)
}

// 慢速
export function speakSlow(text: string) {
  speak({ text, rate: 0.7 })
}

// 常速
export function speakNormal(text: string) {
  speak({ text, rate: 1 })
}

// 停止
export function stopSpeak() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}
