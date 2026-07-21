// 录音 + 详细评分
// 修复(code review 反馈):
// - AudioContext 必须 resume() 才能处理数据
// - 重复 start() 时清理旧资源
// - 评分算法更严格,诚实标注局限性
//
// 评分维度 (v0.14 优化):
// - 音量得分: RMS 评估
// - 时长得分: 实际 / 目标 时长匹配
// - 稳定性得分: 波形数据的标准差(越小越稳)
// - 加权总分 + 改进提示
// 重要: 评分不判断发音准确性,仅评估能量/节奏/稳定性

export interface RecordingResult {
  audioBlob: Blob
  duration: number                   // 秒
  volume: number                     // 平均音量 0-1
  peakVolume: number                 // 峰值音量 0-1
  waveformData: number[]             // 波形数据 (200 个点)
}

export interface PronunciationScore {
  total: number                      // 总分 0-100 (加权)
  volume: number                     // 音量分 0-100
  duration: number                   // 时长匹配分 0-100
  consistency: number                // 音量稳定性分 0-100 (0=忽大忽小, 100=很稳)
  durationActual: number             // 实际时长
  durationExpected: number           // 目标时长
  tips: string[]                     // 改进建议
  level: 'excellent' | 'good' | 'fair' | 'poor'
  feedback: string                   // 文字反馈 (兼容旧字段)
}

// 检查浏览器支持
export function isRecordingSupported(): boolean {
  try {
    if (!navigator.mediaDevices?.getUserMedia) return false
    const Ctor = (window as any).MediaRecorder
    if (typeof Ctor !== 'function') return false
    // iOS Safari < 16.4 不支持 MediaRecorder
    // 检查是否有可用的 MIME type(否则即使支持也录不了)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    if (isIOS) {
      // iOS Safari 需要 audio/mp4
      const hasMp4 = MediaRecorder.isTypeSupported('audio/mp4') ||
                      MediaRecorder.isTypeSupported('audio/mp4;codecs=mp4a.40.2')
      const hasWebm = MediaRecorder.isTypeSupported('audio/webm')
      if (!hasMp4 && !hasWebm) return false
    }
    return true
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
      // 修复: 返回错误信息让 UI 能提示
      throw new Error('录音分析失败:可能是不支持的音频格式。请换 Chrome/Edge 试试。')
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

// 跟读评分:音量 + 时长匹配 + 音量稳定性 三维度
// 重要: 这只是粗略指标,无法判断发音准确性
// 反馈中要诚实告知用户
export function scorePronunciation(
  result: RecordingResult,
  targetWord: string
): PronunciationScore {
  // ----- 1. 音量分 (0-100) -----
  // RMS 原始 0-1,analyzeRecording 已 * 4 归一化
  // 阈值分段: 0-0.01 静默, 0.01-0.05 偏轻, 0.05-0.4 适中, 0.4-0.7 偏响, >0.7 爆音
  let volumeScore = 0
  if (result.duration < 0.2) {
    volumeScore = 0  // 录音太短,无意义
  } else if (result.volume < 0.01) {
    volumeScore = 0
  } else if (result.volume < 0.05) {
    // 偏轻: 0-50
    volumeScore = Math.round((result.volume / 0.05) * 50)
  } else if (result.volume <= 0.4) {
    // 适中: 100(中间最佳)
    volumeScore = 100
  } else if (result.volume <= 0.7) {
    // 偏响: 80
    volumeScore = 80
  } else {
    // 爆音: 30
    volumeScore = 30
  }

  // ----- 2. 时长分 (0-100) -----
  // 目标时长 = 单词字符数 * 0.15s
  const targetDuration = Math.max(0.3, targetWord.length * 0.15)
  const ratio = result.duration / targetDuration
  let durationScore: number
  if (result.duration < 0.2) {
    durationScore = 0
  } else if (ratio < 0.5) {
    // 太短: 按比例给分
    durationScore = Math.round(ratio * 100)
  } else if (ratio > 1.5) {
    // 太长: 超长则衰减 (ratio=2.0 → 0)
    durationScore = Math.max(0, Math.round((2 - ratio) * 100))
  } else {
    // 接近目标: 100 - 偏差*50
    durationScore = Math.max(0, 100 - Math.round(Math.abs(ratio - 1) * 50))
  }

  // ----- 3. 稳定性分 (0-100) -----
  // 从 waveformData(200 个点)的标准差评估
  // std 越小 → 音量越稳定 → 分越高
  let consistency = 0
  if (result.waveformData.length > 1) {
    const mean =
      result.waveformData.reduce((a, b) => a + b, 0) / result.waveformData.length
    const variance =
      result.waveformData.reduce((sum, v) => sum + (v - mean) ** 2, 0) /
      result.waveformData.length
    const std = Math.sqrt(variance)
    // std=0 → 100, std=0.2 → 0; 系数 500
    consistency = Math.max(0, Math.min(100, Math.round(100 - std * 500)))
  }

  // ----- 4. 总分加权 (音量 0.4 + 时长 0.4 + 稳定性 0.2) -----
  const total = Math.round(
    volumeScore * 0.4 +
    durationScore * 0.4 +
    consistency * 0.2
  )

  // ----- 5. 改进提示 -----
  const tips: string[] = []
  if (result.duration < 0.2) {
    tips.push('⏱ 录音太短,读一个完整的词')
  } else {
    if (volumeScore < 60) {
      if (result.volume < 0.05) tips.push('🔇 声音太小, 试着靠近麦克风')
      else tips.push('🔊 声音偏响, 保持适中音量')
    }
    if (durationScore < 60) {
      tips.push('⏱ 时长不太对, 跟着原音频节奏读')
    }
    if (consistency < 60) {
      tips.push('📈 声音忽大忽小, 保持稳定音量')
    }
  }
  if (total >= 80) tips.push('🎉 发音很棒!')

  // ----- 6. 等级 + 文字反馈 (兼容旧字段) -----
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
    consistency,
    durationActual: result.duration,
    durationExpected: targetDuration,
    tips,
    level,
    feedback,
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
