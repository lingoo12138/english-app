// Speech-to-Text (语音转文字)
// 浏览器原生 Web Speech API (SpeechRecognition / webkitSpeechRecognition)
// 兼容性:
// - Chrome ✅
// - Edge ✅
// - Safari ✅
// - Firefox ❌ (没实现, 会 fallback 到 "请用键盘输入")

export interface STTOptions {
  lang?: string  // 'en-US' / 'zh-CN' / 'ja-JP' 等
  interimResults?: boolean  // 是否返回中间结果
  maxAlternatives?: number  // 候选数
}

export interface STTResult {
  text: string
  confidence: number
  isFinal: boolean
}

// 检查浏览器支持
export function isSTTSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
}

// 创建一个 SpeechRecognition 实例
function createRecognition(lang: string, interimResults: boolean, maxAlternatives: number): any {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) return null
  const r = new SR()
  r.lang = lang
  r.interimResults = interimResults
  r.maxAlternatives = maxAlternatives
  r.continuous = false  // 单次识别
  r.interimResults = true
  return r
}

export class STTController {
  private recognition: any = null
  private onResult: (text: string, isFinal: boolean) => void
  private onError: (err: string) => void
  private onEnd: () => void
  private startedAt = 0

  constructor(opts: {
    onResult: (text: string, isFinal: boolean) => void
    onError: (err: string) => void
    onEnd: () => void
  }) {
    this.onResult = opts.onResult
    this.onError = opts.onError
    this.onEnd = opts.onEnd
  }

  start(options: STTOptions = {}): boolean {
    if (!isSTTSupported()) {
      this.onError('当前浏览器不支持语音识别,请用 Chrome/Edge/Safari,或用键盘输入')
      this.onEnd()
      return false
    }
    // 停旧的
    this.stop()

    const lang = options.lang || 'en-US'
    this.recognition = createRecognition(lang, options.interimResults ?? true, options.maxAlternatives ?? 1)
    if (!this.recognition) {
      this.onError('无法创建 SpeechRecognition 实例')
      this.onEnd()
      return false
    }

    this.startedAt = Date.now()

    this.recognition.onresult = (event: any) => {
      let finalText = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript
        if (result.isFinal) {
          finalText += transcript
        } else {
          interimText += transcript
        }
      }
      if (finalText) {
        this.onResult(finalText.trim(), true)
      } else if (interimText) {
        this.onResult(interimText.trim(), false)
      }
    }

    this.recognition.onerror = (event: any) => {
      const errMap: Record<string, string> = {
        'no-speech': '未检测到语音',
        'audio-capture': '无法访问麦克风',
        'not-allowed': '麦克风权限被拒绝',
        'network': '网络错误',
        'aborted': '已取消',
      }
      const msg = errMap[event.error] || `语音识别错误: ${event.error}`
      this.onError(msg)
      this.onEnd()
    }

    this.recognition.onend = () => {
      this.onEnd()
    }

    try {
      this.recognition.start()
      return true
    } catch (e: any) {
      this.onError(`启动语音识别失败: ${e?.message || e}`)
      this.onEnd()
      return false
    }
  }

  stop() {
    if (this.recognition) {
      try { this.recognition.stop() } catch {}
      this.recognition = null
    }
  }

  getDuration(): number {
    return this.startedAt > 0 ? (Date.now() - this.startedAt) / 1000 : 0
  }
}
