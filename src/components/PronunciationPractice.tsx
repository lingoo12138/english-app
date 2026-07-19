// 单词跟读组件
import { useState, useRef, useEffect } from 'react'
import { AudioRecorder, scorePronunciation, playRecording, isRecordingSupported, type RecordingResult, type PronunciationScore } from '../lib/recorder'
import { speak, stopSpeak } from '../lib/tts'

interface Props {
  word: string
  onComplete?: (score: PronunciationScore) => void
}

type State = 'idle' | 'listening' | 'recording' | 'analyzing' | 'result' | 'error'

export default function PronunciationPractice({ word, onComplete }: Props) {
  const [state, setState] = useState<State>('idle')
  const [volume, setVolume] = useState(0)
  const [result, setResult] = useState<RecordingResult | null>(null)
  const [score, setScore] = useState<PronunciationScore | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [supported] = useState(isRecordingSupported())
  const recorderRef = useRef<AudioRecorder | null>(null)
  const countdownRef = useRef<number | null>(null)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    return () => {
      // 清理
      if (recorderRef.current) {
        recorderRef.current.cancel()
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
      stopSpeak()
    }
  }, [word])

  async function startPractice() {
    if (!supported) {
      setErrorMsg('当前浏览器不支持录音,请用 Chrome/Edge/Safari')
      setState('error')
      return
    }
    setErrorMsg('')
    setResult(null)
    setScore(null)

    // 步骤 1: 听原声
    setState('listening')
    speak({ text: word, rate: 0.8 })

    // 等用户听完(2 秒),开始倒计时
    setTimeout(() => {
      if (state === 'error') return
      startCountdown()
    }, 2000)
  }

  function startCountdown() {
    setCountdown(3)
    let n = 3
    countdownRef.current = window.setInterval(() => {
      n -= 1
      if (n <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current)
        startRecording()
      } else {
        setCountdown(n)
      }
    }, 1000)
  }

  async function startRecording() {
    setState('recording')
    setVolume(0)
    const recorder = new AudioRecorder()
    recorderRef.current = recorder
    try {
      await recorder.start()
      recorder.startVolumeMonitoring((vol) => {
        setVolume(vol)
      })

      // 最长录 5 秒,自动停
      setTimeout(() => {
        if (recorderRef.current === recorder) {
          stopRecording()
        }
      }, 5000)
    } catch (e: any) {
      setErrorMsg(e?.message || '录音启动失败,请允许麦克风权限')
      setState('error')
    }
  }

  async function stopRecording() {
    const recorder = recorderRef.current
    if (!recorder) return
    setState('analyzing')
    try {
      const r = await recorder.stop()
      setResult(r)
      const s = scorePronunciation(r, word)
      setScore(s)
      setState('result')
      onComplete?.(s)
    } catch (e: any) {
      setErrorMsg(e?.message || '录音失败')
      setState('error')
    }
  }

  function playMyRecording() {
    if (result) {
      playRecording(result.audioBlob).catch(console.error)
    }
  }

  function reset() {
    setResult(null)
    setScore(null)
    setErrorMsg('')
    setState('idle')
  }

  // ============ UI 渲染 ============

  if (!supported) {
    return (
      <div className="card bg-stone-50 dark:bg-stone-800/50">
        <div className="text-center py-4 text-sm text-stone-500">
          你的浏览器不支持跟读评测
          <br />
          请用 Chrome / Edge / Safari 最新版
        </div>
      </div>
    )
  }

  return (
    <div className="card bg-gradient-to-br from-brand-50 to-emerald-50 dark:from-brand-900/20 dark:to-emerald-900/20 border border-brand-200 dark:border-brand-800">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎤</span>
        <h3 className="font-semibold">跟读练习</h3>
        <span className="text-xs text-stone-500 ml-auto">本地识别,数据不上传</span>
      </div>

      {/* 状态显示 */}
      <div className="text-center py-4">
        {state === 'idle' && (
          <>
            <div className="text-5xl mb-3">🎯</div>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
              点击开始,先听原音,再跟读
            </p>
            <button onClick={startPractice} className="btn-primary w-full">
              开始跟读
            </button>
          </>
        )}

        {state === 'listening' && (
          <>
            <div className="text-5xl mb-3 animate-pulse">🔊</div>
            <p className="text-sm font-medium mb-1">请仔细听原声</p>
            <p className="text-xs text-stone-500">听完会自动开始倒计时...</p>
          </>
        )}

        {state === 'recording' && countdown === 0 && (
          <>
            <div className="text-5xl mb-3">🎙️</div>
            <p className="text-sm font-medium mb-2">正在录音...大声读出来</p>
            {/* 音量条 */}
            <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-red-500 transition-all duration-75"
                style={{ width: `${Math.min(100, volume * 200)}%` }}
              />
            </div>
            <button onClick={stopRecording} className="btn-ghost w-full">
              ⏹ 停止
            </button>
          </>
        )}

        {state === 'recording' && countdown > 0 && (
          <>
            <div className="text-7xl font-bold text-brand-600 mb-2">{countdown}</div>
            <p className="text-sm text-stone-500">准备...</p>
          </>
        )}

        {state === 'analyzing' && (
          <>
            <div className="text-5xl mb-3 animate-spin">⚙️</div>
            <p className="text-sm">正在分析你的发音...</p>
          </>
        )}

        {state === 'result' && score && result && (
          <PronunciationResult
            score={score}
            result={result}
            onPlayMy={playMyRecording}
            onRetry={reset}
            onPlayOriginal={() => speak({ text: word, rate: 0.8 })}
          />
        )}

        {state === 'error' && (
          <>
            <div className="text-5xl mb-3">😢</div>
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">{errorMsg}</p>
            <button onClick={reset} className="btn-ghost w-full">
              重试
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function PronunciationResult({
  score,
  result,
  onPlayMy,
  onRetry,
  onPlayOriginal,
}: {
  score: PronunciationScore
  result: RecordingResult
  onPlayMy: () => void
  onRetry: () => void
  onPlayOriginal: () => void
}) {
  const colorByLevel: Record<PronunciationScore['level'], string> = {
    excellent: 'text-green-600 dark:text-green-400',
    good: 'text-brand-600',
    fair: 'text-amber-600',
    poor: 'text-red-600',
  }

  const emoji: Record<PronunciationScore['level'], string> = {
    excellent: '🏆',
    good: '👍',
    fair: '💪',
    poor: '🎯',
  }

  return (
    <div>
      <div className="text-6xl mb-2">{emoji[score.level]}</div>
      <div className={`text-5xl font-bold mb-2 ${colorByLevel[score.level]}`}>
        {score.total}
      </div>
      <div className="text-sm text-stone-600 dark:text-stone-400 mb-4">
        {score.feedback}
      </div>

      {/* 波形对比 */}
      {result.waveformData.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-stone-500 mb-1">你的录音波形</div>
          <div className="flex items-end gap-px h-12 bg-stone-100 dark:bg-stone-800 rounded p-1">
            {result.waveformData.map((v, i) => (
              <div
                key={i}
                className="flex-1 bg-brand-500 rounded-sm min-w-px"
                style={{ height: `${Math.max(2, v * 100)}%` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 分项分数 */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <ScoreItem label="音量" value={score.volume} />
        <ScoreItem label="时长" value={score.duration} />
        <ScoreItem label="能量" value={score.energy} />
      </div>

      <div className="text-xs text-stone-500 mb-3">
        录音时长: {result.duration.toFixed(1)} 秒 · 音量: {(result.volume * 100).toFixed(0)}%
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button onClick={onPlayOriginal} className="btn-ghost text-sm">
          🔊 原音
        </button>
        <button onClick={onPlayMy} className="btn-ghost text-sm">
          ▶ 我的
        </button>
        <button onClick={onRetry} className="btn-primary text-sm">
          🔄 再来
        </button>
      </div>
    </div>
  )
}

function ScoreItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-stone-800 rounded-lg p-2 text-center">
      <div className="text-xs text-stone-500 mb-0.5">{label}</div>
      <div className="text-lg font-bold text-brand-600">{value}</div>
    </div>
  )
}
