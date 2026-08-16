// W149 反馈 31: 答对/答错 短促音效 (Web Audio API 振荡器)
// 0 资源, 0 第三方库, 0 网络请求 — 全本地生成
// 答对: C5 (523Hz) 200ms 短促上行滑音
// 答错: A3 (220Hz) 250ms 短促下行滑音
// 答完 100% confetti: C5 → E5 → G5 (C 大调和弦) 800ms

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext)
      if (Ctx) audioCtx = new Ctx()
    } catch {
      return null
    }
  }
  // 一些浏览器 AudioContext 初始为 suspended (Chrome autoplay policy)
  if (audioCtx && audioCtx.state === 'suspended') {
    void audioCtx.resume()
  }
  return audioCtx
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.08) {
  const ctx = getCtx()
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01)  // attack 10ms
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)    // release
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + duration)
}

function playSlide(fromFreq: number, toFreq: number, duration: number, type: OscillatorType = 'sine', volume = 0.08) {
  const ctx = getCtx()
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(fromFreq, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(toFreq, ctx.currentTime + duration)
  gain.gain.setValueAtTime(0, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01)
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + duration)
}

// 业务: 答对 (上行滑音 C5 → E5, 200ms, triangle wave)
export function playCorrectSound() {
  playSlide(523, 659, 0.2, 'triangle')
}

// 业务: 答错 (下行滑音 A4 → F4, 250ms, square wave 更刺耳)
export function playWrongSound() {
  playSlide(440, 349, 0.25, 'square', 0.06)
}

// 业务: 答完 100% confetti (C 大三和弦, 800ms 依次播放)
export function playCompleteSound() {
  playTone(523, 0.2, 'triangle', 0.08)        // C5
  setTimeout(() => playTone(659, 0.2, 'triangle', 0.08), 100)  // E5
  setTimeout(() => playTone(784, 0.4, 'triangle', 0.08), 200)  // G5
}

// 业务: 答完 summary 通用 (不区分对错)
export function playTapSound() {
  playTone(440, 0.05, 'sine', 0.04)
}
