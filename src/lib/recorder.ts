// 录音 + 简单评分
// 基于 MediaRecorder + Web Audio API
// 评分维度:音量/时长匹配/能量分布
// 注意:浏览器内置跟读评测需要 LLM,这里做轻量版

export interface RecordingResult {
  audioBlob: Blob
  duration: number                   // 秒
  volume: number                     // 平均音量 0-1
  peakVolume: number                 // 峰值音量 0-1
  waveformData: number[]             // 波形数据 (200 个点)
}

export interface PronunciationScore {
  total: number                      // 总分 0-100
  volume: number                     // 音量分 0-100
  duration: number                   // 时长匹配分 0-100
  energy: number                     // 能量分布分 0-100
  feedback: string                   // 文字反馈
  level: 'excellent' | 'good' | 'fair' | 'poor'
}

// 检查浏览器支持
export function isRecordingSupported(): boolean {
  try {
    // 运行时检查: 尝试创建 MediaRecorder 实例
    if (!navigator.mediaDevices?.getUserMedia) return false
    // 避免在 SSR 或不支持的环境中出问题
    const Ctor = (window as any).MediaRecorder
    return typeof Ctor === 'function'
  } catch {
    return false
  }
}

// 录音控制
export class AudioRecorder {
  private stream: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private startTime = 0
  private animationId: number | null = null
  private volumeCallback: ((vol: number) => void) | null = null

  async start(): Promise<void> {
    if (!isRecordingSupported()) {
      throw new Error('当前浏览器不支持录音')
    }
    this.chunks = []
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })

    // MediaRecorder
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : ''
    this.recorder = mimeType
      ? new MediaRecorder(this.stream, { mimeType })
      : new MediaRecorder(this.stream)
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }
    this.recorder.start()
    this.startTime = Date.now()

    // Web Audio API 分析
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const source = this.audioContext.createMediaStreamSource(this.stream)
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 2048
    source.connect(this.analyser)
  }

  // 获取实时音量(0-1)
  getCurrentVolume(): number {
    if (!this.analyser) return 0
    const data = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteTimeDomainData(data)
    let sum = 0
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128
      sum += v * v
    }
    return Math.sqrt(sum / data.length)
  }

  // 持续监测音量
  startVolumeMonitoring(callback: (vol: number) => void) {
    this.volumeCallback = callback
    const tick = () => {
      if (!this.analyser) return
      const vol = this.getCurrentVolume()
      callback(vol)
      this.animationId = requestAnimationFrame(tick)
    }
    tick()
  }

  stopVolumeMonitoring() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    this.volumeCallback = null
  }

  async stop(): Promise<RecordingResult> {
    if (!this.recorder) {
      throw new Error('录音器未启动')
    }
    const duration = (Date.now() - this.startTime) / 1000

    return new Promise((resolve, reject) => {
      this.recorder!.onstop = async () => {
        try {
          const mimeType = this.recorder!.mimeType || 'audio/webm'
          const audioBlob = new Blob(this.chunks, { type: mimeType })
          const { volume, peakVolume, waveformData } = await this.analyzeRecording(audioBlob)
          this.cleanup()
          resolve({ audioBlob, duration, volume, peakVolume, waveformData })
        } catch (e) {
          this.cleanup()
          reject(e)
        }
      }
      this.recorder!.stop()
    })
  }

  private async analyzeRecording(blob: Blob): Promise<{
    volume: number
    peakVolume: number
    waveformData: number[]
  }> {
    try {
      const arrayBuffer = await blob.arrayBuffer()
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
      const channelData = audioBuffer.getChannelData(0)

      let sumSq = 0
      let peak = 0
      for (let i = 0; i < channelData.length; i++) {
        const v = Math.abs(channelData[i])
        sumSq += v * v
        if (v > peak) peak = v
      }
      const rms = Math.sqrt(sumSq / channelData.length)
      audioCtx.close()

      // 采样 200 个点作为波形
      const waveform: number[] = []
      const samples = 200
      const blockSize = Math.floor(channelData.length / samples)
      for (let i = 0; i < samples; i++) {
        let max = 0
        for (let j = 0; j < blockSize; j++) {
          const v = Math.abs(channelData[i * blockSize + j] || 0)
          if (v > max) max = v
        }
        waveform.push(max)
      }

      return {
        volume: Math.min(1, rms * 4),     // 放大便于显示
        peakVolume: Math.min(1, peak),
        waveformData: waveform,
      }
    } catch (e) {
      console.warn('录音分析失败', e)
      return { volume: 0, peakVolume: 0, waveformData: [] }
    }
  }

  cancel() {
    if (this.recorder && this.recorder.state !== 'inactive') {
      try { this.recorder.stop() } catch (e) {}
    }
    this.cleanup()
  }

  private cleanup() {
    this.stopVolumeMonitoring()
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop())
      this.stream = null
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {})
      this.audioContext = null
    }
    this.analyser = null
    this.recorder = null
  }
}

// 跟读评分:基于音量和时长,给个粗略的反馈
// 注意:不调用任何 LLM,纯前端算法,精度有限
export function scorePronunciation(
  result: RecordingResult,
  targetWord: string
): PronunciationScore {
  // 时长分:目标时长 = 单词字符数 * 0.15s,允许偏差 50%
  const targetDuration = targetWord.length * 0.15
  const durationRatio = result.duration / targetDuration
  let durationScore = 0
  if (durationRatio >= 0.5 && durationRatio <= 2.0) {
    // 偏差越大分数越低
    const diff = Math.abs(durationRatio - 1)
    durationScore = Math.max(0, 100 - diff * 50)
  }

  // 音量分:有声音就给高分
  const volumeScore = Math.min(100, result.volume * 200)

  // 能量分:峰值不能太低也不能太爆
  const energyScore = result.peakVolume > 0.05 && result.peakVolume < 0.95
    ? 80 + (1 - Math.abs(result.peakVolume - 0.5) * 2) * 20
    : 30

  const total = Math.round(
    durationScore * 0.3 +
    volumeScore * 0.4 +
    energyScore * 0.3
  )

  let level: PronunciationScore['level']
  let feedback: string
  if (total >= 85) {
    level = 'excellent'
    feedback = '发音清晰!继续保持 👍'
  } else if (total >= 65) {
    level = 'good'
    feedback = '还不错,可以更清晰一些'
  } else if (total >= 40) {
    level = 'fair'
    feedback = '建议:再大声一点,放慢语速'
  } else {
    level = 'poor'
    feedback = '没听清楚,再试一次?'
  }

  return {
    total,
    volume: Math.round(volumeScore),
    duration: Math.round(durationScore),
    energy: Math.round(energyScore),
    feedback,
    level,
  }
}

// 播放录音
export function playRecording(blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.onended = () => {
      URL.revokeObjectURL(url)
      resolve()
    }
    audio.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    audio.play().catch(reject)
  })
}
