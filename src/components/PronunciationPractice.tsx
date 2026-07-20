// 单词跟读组件
// 重构要点(根据独立 code review 反馈):
// 1. 倒计时 bug: n <= 0 时必须 setCountdown(0)
// 2. 状态闭包: 用 ref 跟踪当前 state
// 3. 所有 setTimeout/setInterval 必须可取消
// 4. 5s timer 触发时要验证 recorderRef.current 是否还是同一个
// 5. word 变化时重置所有 state(避免显示上一次结果)
// 6. audioContext.resume() 在 user gesture 内调用
// 7. startVolumeMonitoring 每次启动要停旧的
// 8. 评分算法要更严格,UI 文案要诚实
import { useState, useRef, useEffect, useCallback } from 'react'
import { AudioRecorder, scorePronunciation, playRecording, isRecordingSupported, type RecordingResult, type PronunciationScore } from '../lib/recorder'
import { speak, stopSpeak } from '../lib/tts'

interface Props {
  word: string
  onComplete?: (score: PronunciationScore) => void
}

type State = 'idle' | 'listening' | 'countdown' | 'recording' | 'analyzing' | 'result' | 'error'

export default function PronunciationPractice({ word, onComplete }: Props) {
  const [state, setState] = useState<State>('idle')
  const [volume, setVolume] = useState(0)
  const [result, setResult] = useState<RecordingResult | null>(null)
  const [score, setScore] = useState<PronunciationScore | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [supported] = useState(isRecordingSupported())

  // Refs(不参与渲染,但可跨生命周期)
  const recorderRef = useRef<AudioRecorder | null>(null)
  const countdownTimerRef = useRef<number | null>(null)
  const listenTimerRef = useRef<number | null>(null)
  const stopTimerRef = useRef<number | null>(null)
  // 记录停止原因(自动超时/用户手动/错误),UI 可以区分提示
  const stopReasonRef = useRef<'auto' | 'manual' | 'error' | null>(null)
  // 防止已卸载的回调更新 state
  const mountedRef = useRef(true)
  // 当前 state 的 ref 副本(避免闭包陷阱)
  const stateRef = useRef<State>('idle')
  useEffect(() => { stateRef.current = state }, [state])

  // 重置所有
  const reset = useCallback(() => {
    // 清理所有 timer
    if (listenTimerRef.current) { clearTimeout(listenTimerRef.current); listenTimerRef.current = null }
    if (countdownTimerRef.current) { clearTimeout(countdownTimerRef.current); countdownTimerRef.current = null }
    if (stopTimerRef.current) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null }
    // 清理录音
    if (recorderRef.current) {
      recorderRef.current.cancel()
      recorderRef.current = null
    }
    stopSpeak()
    if (mountedRef.current) {
      setResult(null)
      setScore(null)
      setErrorMsg('')
      setVolume(0)
      setCountdown(0)
      setState('idle')
    }
  }, [])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      mountedRef.current = false
      // 清理所有 timer
      if (listenTimerRef.current) clearTimeout(listenTimerRef.current)
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current)
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
      // 清理录音
      if (recorderRef.current) {
        recorderRef.current.cancel()
        recorderRef.current = null
      }
      stopSpeak()
    }
  }, [])

  // word 变化时重置整个状态
  useEffect(() => {
    reset()
  }, [word, reset])

  async function startPractice() {
    if (!supported) {
      setErrorMsg('当前浏览器不支持录音,请用 Chrome/Edge/Safari')
      setState('error')
      return
    }
    // 防御:已经在跑就不开始
    if (stateRef.current !== 'idle' && stateRef.current !== 'result' && stateRef.current !== 'error') {
      return
    }

    setErrorMsg('')
    setResult(null)
    setScore(null)
    setVolume(0)
    setCountdown(0)

    // 步骤 1: 听原声
    setState('listening')
    speak({ text: word, rate: 0.8 })

    // 等 2 秒,开始倒计时
    listenTimerRef.current = window.setTimeout(() => {
      listenTimerRef.current = null
      // 检查组件是否还在
      if (!mountedRef.current) return
      // 检查是否被中断(用户在 listening 阶段可能按了别的)
      if (stateRef.current !== 'listening') return
      startCountdown()
    }, 2000)
  }

  function startCountdown() {
    setState('countdown')
    setCountdown(3)

    let n = 3
    const tick = () => {
      n -= 1
      if (n <= 0) {
        // 清空 countdown 后启动录音
        setCountdown(0)
        if (countdownTimerRef.current) {
          clearTimeout(countdownTimerRef.current)
          countdownTimerRef.current = null
        }
        // 启动录音
        startRecording()
      } else {
        setCountdown(n)
        countdownTimerRef.current = window.setTimeout(tick, 1000)
      }
    }
    countdownTimerRef.current = window.setTimeout(tick, 1000)
  }

  async function startRecording() {
    if (!mountedRef.current) return
    setState('recording')
    setVolume(0)

    const recorder = new AudioRecorder()
    recorderRef.current = recorder

    try {
      await recorder.start()
      // 启动音量监测(内部会停旧的)
      recorder.startVolumeMonitoring((vol) => {
        if (mountedRef.current) setVolume(vol)
      })

      // 5 秒自动停
      stopTimerRef.current = window.setTimeout(() => {
        stopTimerRef.current = null
        // 关键: 只在还是当前 recorder 时才停
        if (recorderRef.current === recorder) {
          stopRecording()
        }
      }, 5000)
    } catch (e: any) {
      recorderRef.current = null
      if (mountedRef.current) {
        setErrorMsg(e?.message || '录音启动失败,请允许麦克风权限')
        setState('error')
      }
    }
  }

  async function stopRecording() {
    const recorder = recorderRef.current
    if (!recorder) return

    // 取消自动停止 timer
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current)
      stopTimerRef.current = null
    }

    if (mountedRef.current) setState('analyzing')

    try {
      const r = await recorder.stop()
      recorderRef.current = null
      if (!mountedRef.current) return
      setResult(r)
      const s = scorePronunciation(r, word)
      setScore(s)
      setState('result')
    } catch (e: any) {
      recorderRef.current = null
      if (mountedRef.current) {
        setErrorMsg(e?.message || '录音失败')
        setState('error')
      }
    }
  }

  function playMyRecording() {
    if (result) {
      playRecording(result.audioBlob).catch(console.error)
    }
  }

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
            <button onClick={reset} className="btn-ghost w-full mt-3 text-xs">
              取消
            </button>
          </>
        )}

        {state === 'countdown' && (
          <>
            <div className="text-7xl font-bold text-brand-600 mb-2">{countdown}</div>
            <p className="text-sm text-stone-500">准备...</p>
          </>
        )}

        {state === 'recording' && (
          <>
            <div className="text-5xl mb-3">🎙️</div>
            <p className="text-sm font-medium mb-2">正在录音...大声读出来</p>
            {/* 音量条 */}
            <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-red-500 transition-all duration-75"
                style={{ width: `${Math.min(100, volume * 250)}%` }}
              />
            </div>
            <button onClick={stopRecording} className="btn-ghost w-full">
              ⏹ 停止
            </button>
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
      <div className="text-sm text-stone-600 dark:text-stone-400 mb-3">
        {score.feedback}
      </div>
      <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded p-2 mb-4">
        ⚠️ 本评测仅基于音量/时长,无法判断发音准确性,请结合真人老师或专业 App
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
