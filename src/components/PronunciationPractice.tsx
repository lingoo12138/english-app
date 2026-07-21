// 单词跟读组件 (v0.14 优化)
// 重构要点:
// 1. 倒计时 bug: n <= 0 时必须 setCountdown(0)
// 2. 状态闭包: 用 ref 跟踪当前 state
// 3. 所有 setTimeout/setInterval 必须可取消
// 4. 5s timer 触发时要验证 recorderRef.current 是否还是同一个
// 5. word 变化时重置所有 state(避免显示上一次结果)
// 6. audioContext.resume() 在 user gesture 内调用
// 7. startVolumeMonitoring 每次启动要停旧的
// 8. 评分算法要更严格,UI 文案要诚实
// 9. 3 次尝试取最佳,每次写入 IndexedDB
// 10. 录音时显示实时波形 + 音量条;按钮加 aria-label / aria-pressed
import { useState, useRef, useEffect, useCallback } from 'react'
import { AudioRecorder, scorePronunciation, playRecording, isRecordingSupported, type RecordingResult, type PronunciationScore } from '../lib/recorder'
import { speak, stopSpeak } from '../lib/tts'
import { addPronunciationAttempt } from '../lib/db'

interface Props {
  word: string
  wordId?: string                 // 可选,未传时用 word 文本兜底
  onComplete?: (score: PronunciationScore) => void
}

type State = 'idle' | 'listening' | 'countdown' | 'recording' | 'analyzing' | 'result' | 'error'

interface Attempt {
  result: RecordingResult
  score: PronunciationScore
  attemptNumber: number           // 1, 2, 3
}

const MAX_ATTEMPTS = 3
const VOLUME_HISTORY_MAX = 60     // 实时波形保留的帧数

export default function PronunciationPractice({ word, wordId, onComplete }: Props) {
  const [state, setState] = useState<State>('idle')
  const [volume, setVolume] = useState(0)
  const [volumeHistory, setVolumeHistory] = useState<number[]>([])  // 实时波形
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
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
  // attempts ref 副本(回调中读最新值)
  const attemptsRef = useRef<Attempt[]>([])
  useEffect(() => { attemptsRef.current = attempts }, [attempts])

  const effectiveWordId = wordId || word

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
      setAttempts([])
      setSelectedIdx(0)
      setErrorMsg('')
      setVolume(0)
      setVolumeHistory([])
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
    // 已用完 3 次就不能再开始
    if (attemptsRef.current.length >= MAX_ATTEMPTS) {
      return
    }

    setErrorMsg('')
    setVolume(0)
    setVolumeHistory([])
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
    setVolumeHistory([])

    const recorder = new AudioRecorder()
    recorderRef.current = recorder

    try {
      await recorder.start()
      // 启动音量监测(内部会停旧的)
      recorder.startVolumeMonitoring((vol) => {
        if (!mountedRef.current) return
        setVolume(vol)
        // 累积实时波形(滚动 60 帧)
        setVolumeHistory((prev) => {
          const next = prev.length >= VOLUME_HISTORY_MAX
            ? [...prev.slice(1), vol]
            : [...prev, vol]
          return next
        })
      })

      // 5 秒自动停
      stopTimerRef.current = window.setTimeout(() => {
        stopTimerRef.current = null
        // 关键: 只在还是当前 recorder 时才停
        if (recorderRef.current === recorder) {
          stopRecording('auto')
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

  async function stopRecording(reason: 'auto' | 'manual' = 'manual') {
    const recorder = recorderRef.current
    if (!recorder) return

    // 取消自动停止 timer
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current)
      stopTimerRef.current = null
    }

    stopReasonRef.current = reason

    if (mountedRef.current) setState('analyzing')

    try {
      const r = await recorder.stop()
      recorderRef.current = null
      if (!mountedRef.current) return
      const s = scorePronunciation(r, word)

      // 写入 attempt 历史(本地 state + IndexedDB)
      const attemptNumber = attemptsRef.current.length + 1
      const newAttempt: Attempt = { result: r, score: s, attemptNumber }

      setAttempts((prev) => {
        const next = [...prev, newAttempt]
        return next
      })
      // 选中新加入的 attempt
      setSelectedIdx(attemptsRef.current.length)  // 在 setAttempts 之前读 ref 的旧值,新 attempt index = length

      // 异步写入 IndexedDB(失败不影响 UI)
      addPronunciationAttempt({
        wordId: effectiveWordId,
        word,
        ts: Date.now(),
        score: s.total,
        volumeScore: s.volume,
        durationScore: s.duration,
        consistency: s.consistency,
        duration: r.duration,
        volume: r.volume,
        attemptNumber,
      }).catch((e) => {
        console.warn('保存跟读记录失败', e)
      })

      // 回调(用 best)
      if (onComplete) {
        // 计算到目前为止的最佳分
        const all = [...attemptsRef.current, newAttempt]
        const best = all.reduce((b, a) => (a.score.total > b.score.total ? a : b))
        onComplete(best.score)
      }

      if (mountedRef.current) setState('result')
    } catch (e: any) {
      recorderRef.current = null
      if (mountedRef.current) {
        setErrorMsg(e?.message || '录音失败')
        setState('error')
      }
    }
  }

  function playMyRecording() {
    const a = attempts[selectedIdx]
    if (a) {
      playRecording(a.result.audioBlob).catch((e) => {
        console.error('播放失败', e)
      })
    }
  }

  // 选中第 N 个 attempt 查看详情
  function selectAttempt(idx: number) {
    if (idx >= 0 && idx < attempts.length) {
      setSelectedIdx(idx)
    }
  }

  // 计算最佳 attempt index
  const bestIdx = attempts.length > 0
    ? attempts.reduce((bi, a, i) => (a.score.total > attempts[bi].score.total ? i : bi), 0)
    : -1
  const remainingAttempts = MAX_ATTEMPTS - attempts.length

  if (!supported) {
    return (
      <div className="card bg-stone-50 dark:bg-stone-800/50">
        <div className="text-center py-4 text-sm text-stone-500 dark:text-stone-400">
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
        <span className="text-lg" aria-hidden="true">🎤</span>
        <h3 className="font-semibold">跟读练习</h3>
        <span className="text-xs text-stone-500 dark:text-stone-400 ml-auto">本地识别,数据不上传</span>
      </div>

      {/* 诚实标注: 评分局限性 banner */}
      <div
        role="note"
        className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded p-2 mb-3"
      >
        ⚠️ 本评分仅基于音量/时长/稳定性,无法判断发音准确性
      </div>

      {/* 状态显示 */}
      <div className="text-center py-2">
        {state === 'idle' && (
          <>
            <div className="text-5xl mb-3" aria-hidden="true">🎯</div>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
              点击开始,先听原音,再跟读 (最多 {MAX_ATTEMPTS} 次,取最佳)
            </p>
            <button
              onClick={startPractice}
              className="btn-primary w-full"
              aria-label="开始跟读练习"
              aria-pressed="false"
            >
              🎙️ 开始跟读
            </button>
          </>
        )}

        {state === 'listening' && (
          <>
            <div className="text-5xl mb-3 animate-pulse" aria-hidden="true">🔊</div>
            <p className="text-sm font-medium mb-1">请仔细听原声</p>
            <p className="text-xs text-stone-500 dark:text-stone-400">听完会自动开始倒计时...</p>
            <button
              onClick={reset}
              className="btn-ghost w-full mt-3 text-xs"
              aria-label="取消本次练习"
            >
              取消
            </button>
          </>
        )}

        {state === 'countdown' && (
          <>
            <div
              className="text-7xl font-bold text-brand-600 mb-2"
              role="timer"
              aria-live="polite"
              aria-label={`倒计时 ${countdown} 秒`}
            >
              {countdown}
            </div>
            <p className="text-sm text-stone-500 dark:text-stone-400">准备...</p>
          </>
        )}

        {state === 'recording' && (
          <>
            <div className="text-5xl mb-3" aria-hidden="true">🎙️</div>
            <p className="text-sm font-medium mb-2">正在录音...大声读出来</p>
            {/* 实时波形(60 帧滚动) */}
            <div
              className="flex items-center gap-px h-10 bg-stone-100 dark:bg-stone-800 rounded p-1 mb-2"
              role="img"
              aria-label="实时音量波形"
            >
              {volumeHistory.length === 0 ? (
                <div className="flex-1 text-xs text-stone-400 dark:text-stone-500 flex items-center justify-center">
                  等待声音...
                </div>
              ) : (
                volumeHistory.map((v, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-brand-500 rounded-sm min-w-px transition-all duration-75"
                    style={{ height: `${Math.max(4, v * 400)}%` }}
                  />
                ))
              )}
            </div>
            {/* 音量条 */}
            <div
              className="h-3 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden mb-4"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(Math.min(100, volume * 250))}
              aria-label="当前音量"
            >
              <div
                className="h-full bg-gradient-to-r from-green-400 to-red-500 transition-all duration-75"
                style={{ width: `${Math.min(100, volume * 250)}%` }}
              />
            </div>
            <button
              onClick={() => stopRecording('manual')}
              className="btn-ghost w-full"
              aria-label="停止录音"
              aria-pressed="true"
            >
              ⏹ 停止
            </button>
          </>
        )}

        {state === 'analyzing' && (
          <>
            <div className="text-5xl mb-3 animate-spin" aria-hidden="true">⚙️</div>
            <p className="text-sm">正在分析你的发音...</p>
          </>
        )}

        {state === 'result' && attempts.length > 0 && (
          <PronunciationResult
            attempts={attempts}
            selectedIdx={selectedIdx}
            bestIdx={bestIdx}
            remainingAttempts={remainingAttempts}
            maxAttempts={MAX_ATTEMPTS}
            onSelect={selectAttempt}
            onPlayMy={playMyRecording}
            onRetry={startPractice}
            onFinish={reset}
            onPlayOriginal={() => speak({ text: word, rate: 0.8 })}
          />
        )}

        {state === 'error' && (
          <>
            <div className="text-5xl mb-3" aria-hidden="true">😢</div>
            <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">
              {errorMsg}
            </p>
            <button
              onClick={reset}
              className="btn-ghost w-full"
              aria-label="重试"
            >
              重试
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function PronunciationResult({
  attempts,
  selectedIdx,
  bestIdx,
  remainingAttempts,
  maxAttempts,
  onSelect,
  onPlayMy,
  onRetry,
  onFinish,
  onPlayOriginal,
}: {
  attempts: Attempt[]
  selectedIdx: number
  bestIdx: number
  remainingAttempts: number
  maxAttempts: number
  onSelect: (idx: number) => void
  onPlayMy: () => void
  onRetry: () => void
  onFinish: () => void
  onPlayOriginal: () => void
}) {
  const a = attempts[selectedIdx]
  if (!a) return null
  const { score, result, attemptNumber } = a
  const isBest = selectedIdx === bestIdx

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
      <div className="text-6xl mb-2" aria-hidden="true">
        {isBest && attempts.length > 1 ? '🏆' : emoji[score.level]}
      </div>
      <div
        className={`text-5xl font-bold mb-2 ${colorByLevel[score.level]}`}
        aria-label={`总分 ${score.total} 分`}
      >
        {score.total}
      </div>
      <div className="text-sm text-stone-600 dark:text-stone-400 mb-3">
        {score.feedback}
      </div>

      {/* 波形对比 */}
      {result.waveformData.length > 0 && (
        <div className="mb-4" role="img" aria-label="你的录音波形">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-stone-500 dark:text-stone-400">
              你的录音波形
            </div>
            <div className="text-xs text-stone-400 dark:text-stone-500">
              第 {attemptNumber}/{maxAttempts} 次
            </div>
          </div>
          <div className="flex items-end gap-px h-12 bg-stone-100 dark:bg-stone-800 rounded p-1">
            {result.waveformData.map((v, i) => (
              <div
                key={i}
                className={`flex-1 rounded-sm min-w-px ${isBest ? 'bg-green-500' : 'bg-brand-500'}`}
                style={{ height: `${Math.max(2, v * 100)}%` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 分项分数 */}
      <div
        className="grid grid-cols-3 gap-2 mb-4"
        role="group"
        aria-label="分项得分"
      >
        <ScoreItem label="音量" value={score.volume} />
        <ScoreItem label="时长" value={score.duration} />
        <ScoreItem label="稳定" value={score.consistency} />
      </div>

      <div className="text-xs text-stone-500 dark:text-stone-400 mb-3">
        录音时长: {result.duration.toFixed(1)} 秒
        (目标 {score.durationExpected.toFixed(1)}s)
        · 音量: {(result.volume * 100).toFixed(0)}%
      </div>

      {/* 改进建议 */}
      {score.tips.length > 0 && (
        <div
          className="text-left text-xs bg-white/60 dark:bg-stone-800/60 rounded p-2 mb-4"
          role="list"
          aria-label="改进建议"
        >
          <div className="font-medium mb-1 text-stone-700 dark:text-stone-300">💡 改进建议</div>
          {score.tips.map((tip, i) => (
            <div key={i} className="text-stone-600 dark:text-stone-400" role="listitem">
              {tip}
            </div>
          ))}
        </div>
      )}

      {/* 多次尝试列表 */}
      {attempts.length > 1 && (
        <div className="mb-4" role="group" aria-label="历次尝试">
          <div className="text-xs text-stone-500 dark:text-stone-400 mb-1 text-left">
            历次尝试 (点击查看)
          </div>
          <div className="grid grid-cols-3 gap-2">
            {attempts.map((att, i) => {
              const isSel = i === selectedIdx
              const isB = i === bestIdx
              return (
                <button
                  key={i}
                  onClick={() => onSelect(i)}
                  className={`rounded-lg p-2 text-center border-2 transition ${
                    isSel
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                      : 'border-stone-200 dark:border-stone-700 bg-white/60 dark:bg-stone-800/60'
                  }`}
                  aria-label={`第 ${att.attemptNumber} 次尝试,得分 ${att.score.total}`}
                  aria-pressed={isSel ? 'true' : 'false'}
                >
                  <div className="text-xs text-stone-500 dark:text-stone-400">
                    第 {att.attemptNumber} 次 {isB && '🏆'}
                  </div>
                  <div className={`text-lg font-bold ${isB ? 'text-green-600 dark:text-green-400' : 'text-brand-600'}`}>
                    {att.score.total}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <button
          onClick={onPlayOriginal}
          className="btn-ghost text-sm"
          aria-label="播放原音"
        >
          🔊 原音
        </button>
        <button
          onClick={onPlayMy}
          className="btn-ghost text-sm"
          aria-label="播放我的录音"
        >
          ▶ 听我的
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onRetry}
          disabled={remainingAttempts <= 0}
          className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={
            remainingAttempts > 0
              ? `再录一次,还剩 ${remainingAttempts} 次机会`
              : '已达最大尝试次数'
          }
        >
          🔄 再录一次{remainingAttempts > 0 ? ` (剩 ${remainingAttempts})` : ''}
        </button>
        <button
          onClick={onFinish}
          className="btn-ghost text-sm"
          aria-label="完成跟读练习,返回"
        >
          ✅ 完成
        </button>
      </div>
    </div>
  )
}

function ScoreItem({ label, value }: { label: string; value: number }) {
  // 根据分数给颜色: >=80 绿, 60-79 蓝, 40-59 橙, <40 红
  let color = 'text-brand-600'
  if (value >= 80) color = 'text-green-600 dark:text-green-400'
  else if (value >= 60) color = 'text-brand-600'
  else if (value >= 40) color = 'text-amber-600'
  else color = 'text-red-600'
  return (
    <div className="bg-white dark:bg-stone-800 rounded-lg p-2 text-center">
      <div className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  )
}
