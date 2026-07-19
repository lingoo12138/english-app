// 录音 + 简单评分
// 修复(code review 反馈):
// - AudioContext 必须 resume() 才能处理数据
// - 重复 start() 时清理旧资源
// - 评分算法更严格,诚实标注局限性

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
    if (!navigator.mediaDevices?.getUserMedia) return false
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
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private startTime = 0
  private animationId: number | null = null
  private isMonitoring = false

  async start(): Promise<void> {
    if (!isRecordingSupported()) {
      throw new Error('当前浏览器不支持录音')
    }
    // 防御: 重复 start() 时清理旧的
    this.cleanup()

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
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      // 关键: 必须在 user gesture 内或调用 resume() 才能处理
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }
      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream)
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 2048
      this.sourceNode.connect(this.analyser)
    } catch (e) {
      console.warn('Web Audio API 初始化失败,仅采集音频', e)
      // 录音仍能进行,只是没有实时音量
    }
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

  // 持续监测音量(会自动清理旧的)
  startVolumeMonitoring(callback: (vol: number) => void) {
    this.stopVolumeMonitoring()
    this.isMonitoring = true
    const tick = () => {
      if (!this.isMonitoring || !this.analyser) return
      const vol = this.getCurrentVolume()
      callback(vol)
      this.animationId = requestAnimationFrame(tick)
    }
    this.animationId = requestAnimationFrame(tick)
  }

  stopVolumeMonitoring() {
    this.isMonitoring = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  async stop(): Promise<RecordingResult> {
    if (!this.recorder) {
      throw new Error('录音器未启动')
    }
    const duration = (Date.now() - this.startTime) / 1000
    this.stopVolumeMonitoring()

    return new Promise((resolve, reject) => {
      // 防御: 如果已经 inactive(被 stop 过),直接 reject
      if (this.recorder!.state === 'inactive') {
        this.cleanup()
        reject(new Error('录音器已停止'))
        return
      }
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
      try {
        this.recorder!.stop()
      } catch (e) {
        this.cleanup()
        reject(e)
      }
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
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume()
      }
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
      const blockSize = Math.max(1, Math.floor(channelData.length / samples))
      for (let i = 0; i < samples; i++) {
        let max = 0
        for (let j = 0; j < blockSize; j++) {
          const v = Math.abs(channelData[i * blockSize + j] || 0)
          if (v > max) max = v
        }
        waveform.push(max)
      }

      return {
        volume: Math.min(1, rms * 4),
        peakVolume: Math.min(1, peak),
        waveformData: waveform,
      }
    } catch (e) {
      console.warn('录音分析失败', e)
      return { volume: 0, peakVolume: 0, waveformData: [] }
    }
  }

  cancel() {
    this.stopVolumeMonitoring()
    if (this.recorder && this.recorder.state !== 'inactive') {
      try { this.recorder.stop() } catch (e) { /* ignore */ }
    }
    this.cleanup()
  }

  private cleanup() {
    this.stopVolumeMonitoring()
    if (this.sourceNode) {
      try { this.sourceNode.disconnect() } catch (e) { /* ignore */ }
      this.sourceNode = null
    }
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

// 跟读评分:基于音量和时长,粗略的反馈
// 重要: 这只是粗略指标,无法判断发音准确性
// 反馈中要诚实告知用户
export function scorePronunciation(
  result: RecordingResult,
  targetWord: string
): PronunciationScore {
  // 时长分: 目标时长 = 单词字符数 * 0.15s,允许偏差 30% 内
  const targetDuration = targetWord.length * 0.15
  const durationRatio = result.duration / targetDuration
  let durationScore = 0
  if (durationRatio >= 0.7 && durationRatio <= 1.3) {
    // 30% 容差
    const diff = Math.abs(durationRatio - 1)
    durationScore = Math.max(0, 100 - diff * 150)
  } else if (durationRatio >= 0.4 && durationRatio <= 2.0) {
    // 宽松范围
    const diff = Math.abs(durationRatio - 1)
    durationScore = Math.max(0, 60 - diff * 30)
  }
  // 录音太短(< 0.2s)直接 0
  if (result.duration < 0.2) durationScore = 0

  // 音量分: RMS 评估(原始 0-1, 放大 4 倍)
  // 阈值: rms < 0.05 视为太轻, 0.05-0.2 适中, > 0.2 偏响
  let volumeScore = 0
  if (result.volume >= 0.05 && result.volume <= 0.4) {
    volumeScore = 100
  } else if (result.volume > 0.4 && result.volume <= 0.7) {
    volumeScore = 80  // 偏响
  } else if (result.volume < 0.05 && result.volume >= 0.01) {
    volumeScore = 50  // 偏轻
  } else if (result.volume < 0.01) {
    volumeScore = 0  // 几乎无声
  } else {
    volumeScore = 30  // 太响(可能爆音)
  }

  // 能量分: 峰值在 0.1-0.8 最佳
  let energyScore = 0
  if (result.peakVolume >= 0.1 && result.peakVolume <= 0.8) {
    energyScore = 80 + (1 - Math.abs(result.peakVolume - 0.45) / 0.35) * 20
  } else if (result.peakVolume > 0.8) {
    energyScore = 30  // 爆音
  } else {
    energyScore = 20  // 太弱
  }

  const total = Math.round(
    durationScore * 0.4 +
    volumeScore * 0.4 +
    energyScore * 0.2
  )

  let level: PronunciationScore['level']
  let feedback: string
  if (total >= 80) {
    level = 'excellent'
    feedback = '录音质量很好!音量/时长都达标'
  } else if (total >= 60) {
    level = 'good'
    feedback = '可以更稳定些,试试再录一次'
  } else if (total >= 40) {
    level = 'fair'
    feedback = '建议:再大声一点,语速适中'
  } else {
    level = 'poor'
    if (result.duration < 0.2) {
      feedback = '录音太短,试一次完整的'
    } else if (result.volume < 0.01) {
      feedback = '没听清声音,检查麦克风'
    } else {
      feedback = '再试一次,保持稳定音量'
    }
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
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('录音播放失败'))
    }
    audio.play().catch((e) => {
      URL.revokeObjectURL(url)
      reject(e)
    })
  })
}
