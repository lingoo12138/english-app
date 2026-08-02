// src/pages/ErrorReviewPage.tsx - v1.93 W87-A 错题复习模式 (修 v1: 修 P0/P1 UI)
// 答对移出, 答错留, 偷看计 0, 完成 summary, 4 入口空态
import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllWritingErrors, getAllDictationErrors } from '../lib/db'
import {
  toReviewCards,
  newReviewSession,
  answerInSession,
  sessionProgress,
  type ReviewSession,
  type ReviewCard,
} from '../lib/errorReview'
import { saveSession, loadSession, clearSession } from '../lib/errorReviewSession'
import { toast } from '../components/Toast'

export default function ErrorReviewPage() {
  const [cards, setCards] = useState<ReviewCard[]>([])
  const [session, setSession] = useState<ReviewSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [peeked, setPeeked] = useState(false)
  const [lastResult, setLastResult] = useState<{ score: number; grade: string; card: ReviewCard; userAnswer: string; peeked: boolean; isCorrect: boolean; isLast: boolean } | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [hasSavedSession, setHasSavedSession] = useState<{
    correct: number; wrong: number; remaining: number; total: number; ts: number; matchCount: number
  } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const nextButtonRef = useRef<HTMLButtonElement>(null)
  const navigate = useNavigate()

  // 加载
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    // 检测是否有未完成 session
    const saved = loadSession()
    Promise.all([getAllWritingErrors(), getAllDictationErrors()])
      .then(([w, d]) => {
        if (cancelled) return
        const cs = toReviewCards(w, d)
        setCards(cs)
        // 修 v1: 用 cardIds 逐 ID 校验 (避免粗粒度 cs.length 误判)
        if (saved && saved.session.remaining.length > 0 && saved.cardIds.length > 0) {
          const currentCardIds = new Set(cs.map(c => c.id))
          const matchCount = saved.cardIds.filter(id => currentCardIds.has(id)).length
          const matchRatio = matchCount / saved.cardIds.length
          if (matchRatio >= 0.5) {
            // 至少 50% 卡还在, 继续上次
            setHasSavedSession({
              correct: saved.session.correct,
              wrong: saved.session.wrong,
              remaining: saved.session.remaining.length,
              total: saved.session.total,
              ts: saved.ts,
              matchCount,
            })
            // 暂不创建新 session, 等用户选 继续/重新开始
            return
          } else {
            // 错题被删/减少, 清掉 + 提示
            clearSession()
            toast.warning('上次复习的部分错题已删除, 已重新开始')
          }
        } else if (saved && saved.session.remaining.length > 0) {
          // 旧版 session (无 cardIds), 用粗粒度兜底
          if (cs.length >= saved.session.total) {
            setHasSavedSession({
              correct: saved.session.correct,
              wrong: saved.session.wrong,
              remaining: saved.session.remaining.length,
              total: saved.session.total,
              ts: saved.ts,
              matchCount: 0,
            })
            return
          } else {
            clearSession()
            toast.warning('上次复习的错题已减少, 已重新开始')
          }
        }
        setSession(newReviewSession(cs))
        setLoading(false)
      })
      .catch(e => {
        if (cancelled) return
        console.error('[ErrorReview] load:', e)
        setLoadError('加载错题失败, 请重试')
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // 每次 session 变化自动持久化
  useEffect(() => {
    if (session && session.remaining.length > 0) {
      saveSession(session)
    } else if (session && session.remaining.length === 0) {
      // 完成清掉
      clearSession()
    }
  }, [session])

  // 恢复上次
  const handleResume = useCallback(() => {
    const saved = loadSession()
    if (saved) {
      setSession(saved.session)
      setHasSavedSession(null)
      toast.success(`已恢复: ${saved.session.correct} 对 / ${saved.session.wrong} 错`)
    }
  }, [])

  // 重新开始
  const handleStartFresh = useCallback(() => {
    clearSession()
    setHasSavedSession(null)
    setSession(newReviewSession(cards))
  }, [cards])

  // 当前题 = remaining[0]
  const currentCard = session && session.remaining.length > 0 ? session.remaining[0] : null

  // 答完一题后自动 focus 下一题按钮
  useEffect(() => {
    if (lastResult && nextButtonRef.current) {
      nextButtonRef.current.focus()
    } else if (!lastResult && currentCard && inputRef.current) {
      inputRef.current.focus()
    }
  }, [lastResult, currentCard])

  // 答完最后一题, summary 视图
  useEffect(() => {
    if (session && session.remaining.length === 0 && lastResult && cards.length > 0) {
      toast.success(`复习完成! 对 ${session.correct} 错 ${session.wrong}`)
    }
  }, [session, lastResult, cards.length])

  const handleSubmit = useCallback(() => {
    if (!session || !currentCard || lastResult) return
    const result = answerInSession(session, userAnswer, peeked)
    setSession(result.session)
    setLastResult({
      score: result.score,
      grade: result.grade,
      card: currentCard,
      userAnswer,
      peeked,
      isCorrect: result.grade === 'perfect' || result.grade === 'good',
      isLast: result.isLast,
    })
    setPeeked(false)  // 重置 peek 状态
  }, [session, currentCard, lastResult, userAnswer, peeked])

  const handleNext = useCallback(() => {
    if (!session) return
    setLastResult(null)
    setUserAnswer('')
    setPeeked(false)
  }, [session])

  const handleRestart = useCallback(() => {
    if (!cards.length) return
    setSession(newReviewSession(cards))
    setLastResult(null)
    setUserAnswer('')
    setPeeked(false)
  }, [cards])

  if (loading) {
    return <div className="text-center py-20 text-stone-500">加载错题中...</div>
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">🔁 错题复习</h1>
        <div className="card text-center py-10">
          <div className="text-5xl mb-3">⚠️</div>
          <p className="text-lg mb-1 text-rose-500">{loadError}</p>
          <button onClick={() => window.location.reload()} className="btn-primary mt-4">
            重试
          </button>
        </div>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">🔁 错题复习</h1>
        <div className="card text-center py-10">
          <div className="text-5xl mb-3">🎉</div>
          <p className="text-lg mb-1">暂无错题</p>
          <p className="text-sm text-stone-500 mb-4">先去写作 / 听写 / 拼写 / 跟读 攒点错题再来</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={() => navigate('/write')} className="btn-primary text-sm">✍️ 写作</button>
            <button onClick={() => navigate('/dictation')} className="btn-primary text-sm">🎧 听写</button>
            <button onClick={() => navigate('/spelling')} className="btn-primary text-sm">🔤 拼写</button>
            <button onClick={() => navigate('/listen')} className="btn-primary text-sm">🎤 跟读</button>
          </div>
        </div>
      </div>
    )
  }

  if (!session && hasSavedSession) {
    // 等待用户选 继续/重新开始
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">🔁 错题复习</h1>
        <div className="card text-center py-10">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-lg mb-1">发现上次未完成的复习</p>
          <p className="text-sm text-stone-500 mb-1">
            已答 {hasSavedSession.correct + hasSavedSession.wrong} / {hasSavedSession.total} 题
            (✓ {hasSavedSession.correct} ✗ {hasSavedSession.wrong}, 还剩 {hasSavedSession.remaining} 题)
          </p>
          <p className="text-xs text-stone-400 mb-4">
            上次复习于 {formatTimeAgo(hasSavedSession.ts)}
            {hasSavedSession.matchCount > 0 && ` · ${hasSavedSession.matchCount} 张卡还在`}
          </p>
          <div className="flex flex-col gap-2 max-w-xs mx-auto">
            <button onClick={handleResume} className="btn-primary">
              ▶️ 继续上次
            </button>
            <button onClick={handleStartFresh} className="btn-ghost">
              🔁 重新开始
            </button>
            <button onClick={() => navigate(-1)} className="btn-ghost text-sm">
              ← 返回
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!session) return null

  const isComplete = session.remaining.length === 0 && lastResult !== null
  const progress = sessionProgress(session)

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🔁 错题复习</h1>
        <button onClick={() => navigate('/errors')} className="text-stone-500 hover:text-stone-700">
          ← 改错本
        </button>
      </div>

      {/* 进度 */}
      <div className="card">
        <div className="flex items-center justify-between text-sm mb-2">
          <span>进度 {session.total - session.remaining.length} / {session.total}</span>
          <span className="text-emerald-500">✓ {session.correct}</span>
          <span className="text-rose-500">✗ {session.wrong}</span>
          {session.remaining.length > 0 && session.remaining.length < session.total && (
            <span className="text-amber-500 text-xs">({session.remaining.length} 待重答)</span>
          )}
        </div>
        <div className="h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-brand-500 transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* 完成 summary */}
      {isComplete ? (
        <div className="card text-center py-10">
          <div className="text-5xl mb-3">🎉</div>
          <p className="text-xl font-bold mb-2">复习完成!</p>
          <p className="text-stone-500 mb-1">
            共 {session.total} 题, 答对 {session.correct}, 答错 {session.wrong}
          </p>
          {session.wrong > 0 && (
            <p className="text-amber-500 text-sm mb-4">
              ⚠️ {session.wrong} 题错过, 但已自动重排
            </p>
          )}
          <div className="flex justify-center gap-2 mt-4">
            <button onClick={handleRestart} className="btn-primary">🔁 再来一轮</button>
            <button onClick={() => navigate('/errors')} className="btn-ghost">📋 改错本</button>
          </div>
        </div>
      ) : currentCard ? (
        <div className="card">
          <div className="flex items-center gap-2 mb-3 text-sm flex-wrap">
            <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-700 rounded">{currentCard.source}</span>
            {currentCard.hint && (
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-xs">
                💡 {currentCard.hint}
              </span>
            )}
          </div>

          {/* 题目 */}
          <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-4 mb-4">
            <div className="text-xs text-stone-500 mb-1">你之前答错的是:</div>
            <div className="text-lg font-mono text-rose-700 dark:text-rose-300">
              {currentCard.prompt}
            </div>
          </div>

          {/* 答题区 */}
          {!lastResult ? (
            <div className="space-y-2">
              <label className="text-sm text-stone-500">你的答案</label>
              <input
                ref={inputRef}
                value={userAnswer}
                onChange={e => setUserAnswer(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && userAnswer.trim()) {
                    handleSubmit()
                  }
                }}
                placeholder="输入正确答案..."
                className="w-full px-3 py-2 border-2 border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={!userAnswer.trim()}
                  className="flex-1 px-3 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50"
                >
                  提交
                </button>
                <button
                  onClick={() => setPeeked(p => !p)}
                  className={`px-3 py-2 rounded-lg ${
                    peeked
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {peeked ? '🙈 隐藏' : '👀 偷看'}
                </button>
              </div>
              {peeked && (
                <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-sm border border-amber-300">
                  <div className="text-xs text-amber-600 mb-1">⚠️ 偷看后此题不计分, 但仍需输入答案提交以继续</div>
                  <span className="text-stone-500">答案: </span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-300">{currentCard.answer}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className={`rounded-lg p-3 ${
                lastResult.grade === 'perfect' ? 'bg-emerald-50 dark:bg-emerald-900/20' :
                lastResult.grade === 'good' ? 'bg-blue-50 dark:bg-blue-900/20' :
                lastResult.grade === 'ok' ? 'bg-amber-50 dark:bg-amber-900/20' :
                'bg-rose-50 dark:bg-rose-900/20'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-stone-500">
                    你的答案
                    {lastResult.peeked && <span className="ml-2 text-xs text-rose-500">(偷看 0 分)</span>}
                  </span>
                  <span className={`text-2xl font-bold ${
                    lastResult.grade === 'perfect' ? 'text-emerald-500' :
                    lastResult.grade === 'good' ? 'text-blue-500' :
                    lastResult.grade === 'ok' ? 'text-amber-500' : 'text-rose-500'
                  }`}>
                    {lastResult.score}
                  </span>
                </div>
                <div className="font-mono text-sm">{lastResult.userAnswer}</div>
                <div className="mt-2 pt-2 border-t border-stone-200 dark:border-stone-700 text-sm">
                  <span className="text-stone-500">正确答案: </span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-300">{lastResult.card.answer}</span>
                </div>
                {!lastResult.isCorrect && !lastResult.peeked && (
                  <div className="mt-2 text-xs text-rose-500">🔁 此题将再次出现</div>
                )}
                {lastResult.isCorrect && (
                  <div className="mt-2 text-xs text-emerald-500">✓ 此题已答对, 移出复习池</div>
                )}
              </div>
              <button
                ref={nextButtonRef}
                onClick={handleNext}
                className="w-full px-3 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600"
              >
                {lastResult.isLast ? '完成' : '下一题 →'}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* 答题历史 */}
      {session.history.length > 0 && (
        <details
          className="card text-sm"
          open={showHistory}
          onToggle={(e) => setShowHistory((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer text-stone-500">
            📜 答题历史 ({session.history.length}) {showHistory ? '▼' : '▶'}
          </summary>
          <div className="mt-2 space-y-1">
            {session.history.slice().reverse().map((h, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="font-mono">{h.cardId}</span>
                <span className={
                  h.grade === 'perfect' || h.grade === 'good' ? 'text-emerald-500' : 'text-rose-500'
                }>
                  {h.score} ({h.grade}){h.peeked ? ' 👀' : ''}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

/** 格式化时间为 "x 分钟/小时/天前" */
function formatTimeAgo(ts: number): string {
  const diffMs = Date.now() - ts
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return new Date(ts).toLocaleDateString('zh-CN')
}
