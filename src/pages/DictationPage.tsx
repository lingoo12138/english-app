// src/pages/DictationPage.tsx - W126 改版稿 UI
// v1.87 W81-D 听写 UI
// v1.88 W82-C: 加复习模式 toggle
// v1.89 W83-B: 加进度条 + 错词收藏
// W126: 0 emoji 操 作 + Icon SVG + W123d 3 圆 顶 部 + W113 v2 card + Skeleton
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { speak } from '../lib/tts'
import { isSTTSupported, STTController } from '../lib/stt'
import { saveDictationError, getDictationErrorWordIds } from '../lib/db'
import { addFavorite, removeFavorite } from '../lib/db'
import {
  buildItem,
  scoreAnswer,
  diffWords,
  getReviewWords,
  type Difficulty,
  type DictationItem,
} from '../lib/dictation'
import { loadWords } from '../lib/words'
import type { Word } from '../types'
import {
  IconArrow, IconHeadphones, IconMic, IconMicOff, IconStar,
  IconRefresh, IconBook, IconTrophy, IconSparkles,
} from '../components/Icon'
import { SkeletonPage, Skeleton } from '../components/Skeleton'

const DIFF_LABELS: Record<Difficulty, string> = {
  easy: '简单 (1 词)',
  medium: '中等 (短句)',
  hard: '困难 (长句)',
}

// W126: 难度 3 色 (W113 状态色 3 色)
const DIFF_STYLE: Record<Difficulty, { bg: string; ring: string; label: string }> = {
  easy: { bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800', ring: 'border-emerald-500', label: '简单' },
  medium: { bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', ring: 'border-amber-500', label: '中等' },
  hard: { bg: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800', ring: 'border-rose-500', label: '困难' },
}

export function DictationPage() {
  const navigate = useNavigate()
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [used, setUsed] = useState<Set<string>>(new Set())
  const [item, setItem] = useState<DictationItem | null>(null)
  const [transcript, setTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const [feedback, setFeedback] = useState<{
    score: number
    diff: ReturnType<typeof diffWords>
  } | null>(null)
  const [totalScore, setTotalScore] = useState(0)
  const [round, setRound] = useState(0)
  // v1.89 W83-B: 进度条
  const [correctCount, setCorrectCount] = useState(0)
  // v1.89 W83-B: 错词收藏
  const [favSet, setFavSet] = useState<Set<string>>(new Set())
  const TARGET_ROUNDS = 10  // 一轮 10 题
  const [sttSupported, setSttSupported] = useState(false)
  // v1.88 W82-C: 复习模式
  const [reviewMode, setReviewMode] = useState(false)
  const [reviewPool, setReviewPool] = useState<Word[]>([])
  const sttRef = useRef<STTController | null>(null)
  const [status, setStatus] = useState<string>('')

  useEffect(() => {
    setSttSupported(isSTTSupported())
    loadWords()
      .then(w => { setWords(w); setLoading(false) })
      .catch(e => { console.error('[Dictation] loadWords:', e); setLoading(false) })
  }, [])

  // v1.88 W82-C: 切复习模式时加载 reviewPool
  useEffect(() => {
    if (!reviewMode) {
      setReviewPool([])
      return
    }
    getDictationErrorWordIds()
      .then(ids => {
        const pool = getReviewWords(ids, words)
        setReviewPool(pool)
        if (pool.length === 0) {
          setStatus('复习模式: 暂无错词, 自动关闭')
          setReviewMode(false)
        } else {
          setStatus(`复习模式: 还有 ${pool.length} 词要复习`)
        }
      })
      .catch(e => console.error('[Dictation] getDictationErrorWordIds:', e))
  }, [reviewMode, words])

  // 加载后生成第一题
  useEffect(() => {
    if (words.length === 0) return
    if (item) return
    // 复习模式但 pool 还没加载或为空, 跳过
    if (reviewMode && reviewPool.length === 0) return
    const freshUsed = new Set<string>()
    const it = buildItem(words, difficulty, freshUsed, Date.now(), reviewMode, reviewPool)
    if (it) {
      setItem(it)
      freshUsed.add(it.sourceWord!.id)
      setUsed(freshUsed)
      setTimeout(() => playTarget(it.target), 300)
    }
    // v1.87 W81-D P1 修 + v1.88 加 reviewMode, reviewPool
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words.length, item, difficulty, reviewMode, reviewPool.length])

  const playTarget = useCallback((text: string) => {
    setStatus('正在播放...')
    speak({ text })
    setTimeout(() => setStatus('请录音 / 或在下方输入'), 3000)
  }, [])

  const startListening = useCallback(() => {
    if (!sttSupported) {
      setStatus('浏览器不支持语音识别, 请在下方输入')
      return
    }
    setListening(true)
    setStatus('录音中...')
    sttRef.current = new STTController({
      onResult: (text, isFinal) => {
        setTranscript(text)
        if (isFinal) {
          setListening(false)
          setStatus('识别完成')
        }
      },
      onError: (err) => {
        setListening(false)
        setStatus(`错误: ${err}, 请重试或输入`)
      },
      onEnd: () => {
        setListening(false)
      },
    })
    sttRef.current.start({ lang: 'en-US' })
  }, [sttSupported])

  const stopListening = useCallback(() => {
    sttRef.current?.stop()
    setListening(false)
  }, [])

  const handleSubmit = useCallback(() => {
    if (!item || !transcript.trim()) return
    const score = scoreAnswer(item.target, transcript)
    const diff = diffWords(item.target, transcript)
    setFeedback({ score, diff })
    setTotalScore(s => s + score)
    setRound(r => r + 1)
    if (score === 100) setCorrectCount(c => c + 1)
    // 错题入错题本 (v1.87 W81-D: dictationErrors 表)
    // v1.91 W85: 加 source 字段
    if (score < 100 && item.sourceWord) {
      saveDictationError({
        wordId: item.sourceWord.id,
        difficulty: item.difficulty,
        source: 'dictation',
        transcript,
        target: item.target,
        score,
      }).catch(e => console.error('[Dictation] saveDictationError:', e))
    }
  }, [item, transcript])

  // v1.89 W83-B: 收藏错词
  const handleToggleFav = useCallback(async (wordId: string) => {
    if (favSet.has(wordId)) {
      await removeFavorite(wordId)
      setFavSet(s => { const n = new Set(s); n.delete(wordId); return n })
    } else {
      await addFavorite(wordId)
      setFavSet(s => new Set([...s, wordId]))
    }
  }, [favSet])

  const handleNext = useCallback(() => {
    setTranscript('')
    setFeedback(null)
    setStatus('')
    // v1.87 W81-D P1 修: 用 functional update, 避免直接 mutate state
    let newUsed: Set<string> = new Set(used)
    const it = buildItem(words, difficulty, newUsed, Date.now(), reviewMode, reviewPool)
    if (it) {
      setItem(it)
      newUsed.add(it.sourceWord!.id)
      setUsed(newUsed)
      setTimeout(() => playTarget(it.target), 200)
    } else {
      // 用完一轮, 重置
      const freshUsed = new Set<string>()
      const it2 = buildItem(words, difficulty, freshUsed, Date.now(), reviewMode, reviewPool)
      if (it2) {
        setItem(it2)
        freshUsed.add(it2.sourceWord!.id)
        setUsed(freshUsed)
        setTimeout(() => playTarget(it2.target), 200)
      }
    }
  }, [words, difficulty, used, playTarget, reviewMode, reviewPool])

  if (loading) {
    return <SkeletonPage />
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* W123d 顶 部: 标 题 居 中 + 3 圆 按 钮 (返 回/占位/换 词) */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition-colors duration-[var(--t-fast)]"
          aria-label="返回上一页"
        >
          <span className="inline-block rotate-180"><IconArrow size={16} /></span>
        </button>
        <h1 className="text-lg font-bold flex items-center gap-2">
          <IconHeadphones size={20} className="text-brand-500" />
          听写
        </h1>
        <button
          onClick={() => { setItem(null); setFeedback(null); setUsed(new Set()) }}
          className="w-9 h-9 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition-colors duration-[var(--t-fast)]"
          aria-label="重新抽题"
          title="重新抽题"
        >
          <IconRefresh size={16} />
        </button>
      </div>

      {/* 难度选择 - W113 v2 card + 3 状态色 */}
      <div className="card card-interactive">
        <div className="flex items-center gap-2 mb-2">
          <IconBook size={14} className="text-stone-500" />
          <span className="text-xs text-stone-500 dark:text-stone-400">难度</span>
        </div>
        <div className="flex gap-2">
          {(Object.keys(DIFF_LABELS) as Difficulty[]).map(d => (
            <button
              key={d}
              onClick={() => { setDifficulty(d); setItem(null); setFeedback(null); setUsed(new Set()) }}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-[var(--t-fast)] ease-[var(--ease)] ${
                difficulty === d
                  ? `${DIFF_STYLE[d].ring} border-2 ${DIFF_STYLE[d].bg} text-stone-800 dark:text-stone-100 shadow-[0_2px_6px_rgba(34,197,94,0.3)]`
                  : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700'
              }`}
            >
              {DIFF_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      {/* v1.88 W82-C: 复习模式 toggle - W124 状态徽章风格 */}
      <div className={`flex items-center justify-between rounded-lg p-3 border transition-all duration-[var(--t-fast)] ${
        reviewMode
          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
          : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700'
      }`}>
        <span className="text-sm font-medium text-stone-700 dark:text-stone-200 flex items-center gap-2">
          <IconBook size={14} className={reviewMode ? 'text-amber-600' : 'text-stone-500'} />
          复习模式
          {reviewMode && <span className="text-xs px-2 py-0.5 bg-amber-500 text-white rounded-full">开启</span>}
        </span>
        <button
          onClick={() => {
            setReviewMode(!reviewMode)
            setItem(null)
            setFeedback(null)
            setUsed(new Set())
          }}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors duration-[var(--t-fast)] ${
            reviewMode
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600'
          }`}
          aria-pressed={reviewMode}
        >
          {reviewMode ? '关闭' : '开启'}
        </button>
      </div>

      {/* 状态 - 状态色 (W113) */}
      <div className="text-center text-sm text-stone-600 dark:text-stone-400 min-h-[1.5em] flex items-center justify-center gap-1">
        {status && <IconSparkles size={14} className="text-brand-500" />}
        <span>{status || '点击下方「播放」开始'}</span>
      </div>

      {/* 当前题 - W113 v2 card-interactive + 字符点阵 */}
      {item && (
        <div className="card card-interactive space-y-4">
          <div className="text-center">
            <div className="text-xs text-stone-500 dark:text-stone-400 mb-2 flex items-center justify-center gap-1">
              <IconHeadphones size={12} />
              目标
            </div>
            <div className="text-3xl font-mono tabular-nums text-stone-700 dark:text-stone-200 select-none tracking-widest">
              {'•'.repeat(Math.min(item.target.length, 32))}
            </div>
            <button
              onClick={() => playTarget(item.target)}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-500 text-white rounded-full text-sm font-medium hover:bg-brand-600 transition-colors duration-[var(--t-fast)] shadow-[0_2px_6px_rgba(34,197,94,0.3)] active:scale-95"
            >
              <IconHeadphones size={14} />
              播放
            </button>
          </div>

          {/* 录音 + 输入 */}
          <div className="border-t border-stone-200 dark:border-stone-700 pt-4 space-y-2">
            <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1">
              <IconMic size={12} />
              你的回答
            </div>
            <div className="flex gap-2">
              {!listening ? (
                <button
                  onClick={startListening}
                  disabled={!sttSupported}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-500 text-white rounded-full text-sm font-medium hover:bg-rose-600 disabled:opacity-50 transition-colors duration-[var(--t-fast)] active:scale-95"
                >
                  <IconMic size={14} />
                  {sttSupported ? '开始录音' : '不支持语音'}
                </button>
              ) : (
                <button
                  onClick={stopListening}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-stone-500 text-white rounded-full text-sm font-medium hover:bg-stone-600 transition-colors duration-[var(--t-fast)] active:scale-95"
                >
                  <IconMicOff size={14} />
                  停止
                </button>
              )}
            </div>
            <textarea
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              placeholder="或在此输入..."
              className="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all duration-[var(--t-fast)]"
              rows={2}
            />
            {/* W123a: 移动端 input sticky bottom + safe-area */}
            <div
              className="sticky bottom-0 bg-white dark:bg-stone-800 pt-2 -mx-4 px-4 border-t border-stone-100 dark:border-stone-700"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <button
                onClick={handleSubmit}
                disabled={!transcript.trim()}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-full text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors duration-[var(--t-fast)] active:scale-95"
              >
                提交答案
              </button>
            </div>
          </div>

          {/* 反馈 - W113 状态色 + 大圆环进度 (W124 Bento 风格) */}
          {feedback && (
            <div className="border-t border-stone-200 dark:border-stone-700 pt-4 space-y-3">
              {/* 大圆环 + 分数 */}
              <div className="flex items-center justify-center">
                <div
                  className={`relative w-24 h-24 rounded-full flex items-center justify-center border-4 ${
                    feedback.score === 100
                      ? 'border-[var(--state-success)] bg-emerald-50 dark:bg-emerald-900/20'
                      : feedback.score >= 50
                      ? 'border-[var(--state-warning)] bg-amber-50 dark:bg-amber-900/20'
                      : 'border-[var(--state-error)] bg-rose-50 dark:bg-rose-900/20'
                  }`}
                >
                  <div className="text-center">
                    <div className={`text-3xl font-bold font-mono tabular-nums ${
                      feedback.score === 100 ? 'text-emerald-600' :
                      feedback.score >= 50 ? 'text-amber-600' : 'text-rose-600'
                    }`}>
                      {feedback.score}
                    </div>
                    <div className="text-[10px] text-stone-500">得分</div>
                  </div>
                </div>
              </div>

              <div className="text-sm space-y-1">
                <div className="text-stone-500">目标: <span className="text-stone-800 dark:text-stone-200 font-mono">{item.target}</span></div>
                <div className="text-stone-500">你的: <span className="text-stone-800 dark:text-stone-200 font-mono">{transcript}</span></div>
                {feedback.diff.missing.length > 0 && (
                  <div className="text-rose-500">漏: {feedback.diff.missing.join(', ')}</div>
                )}
                {feedback.diff.extra.length > 0 && (
                  <div className="text-amber-500">多: {feedback.diff.extra.join(', ')}</div>
                )}
                {feedback.score < 100 && (
                  <div className="text-stone-400 text-xs">已加入错题本</div>
                )}
              </div>

              {/* v1.89 W83-B: 错词收藏按钮 - W116 spring + W124 圆角徽章 */}
              {item.sourceWord && feedback.score < 100 && (
                <button
                  onClick={() => handleToggleFav(item.sourceWord!.id)}
                  className={`w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-[var(--t-fast)] active:scale-95 ${
                    favSet.has(item.sourceWord.id)
                      ? 'bg-rose-500 text-white hover:bg-rose-600'
                      : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
                  }`}
                >
                  <IconStar size={14} />
                  {favSet.has(item.sourceWord.id) ? '已收藏 (生词本)' : '收藏到生词本'}
                </button>
              )}
              <button
                onClick={handleNext}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-500 text-white rounded-full text-sm font-medium hover:bg-brand-600 transition-colors duration-[var(--t-fast)] active:scale-95 shadow-[0_2px_6px_rgba(34,197,94,0.3)]"
              >
                下一题
                <IconArrow size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* v1.89 W83-B: 进度条 - W124 Bento 风格 */}
      <div className="card">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-stone-600 dark:text-stone-300 font-medium">进度</span>
          <span className="text-stone-500 font-mono tabular-nums">{round} / {TARGET_ROUNDS}</span>
        </div>
        <div className="h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-brand-500 transition-all duration-[var(--t-slow)] ease-[var(--ease)]"
            style={{ width: `${Math.min(100, (round / TARGET_ROUNDS) * 100)}%` }}
          />
        </div>
        {round >= TARGET_ROUNDS && (
          <div className="mt-3 text-center text-sm text-emerald-600 font-medium flex items-center justify-center gap-1.5">
            <IconTrophy size={14} />
            一轮完成! 正确 {correctCount}/{round} ({Math.round(correctCount / round * 100)}%)
          </div>
        )}
      </div>

      {/* 统计 - W113 4 列 Bento grid */}
      <div className="grid grid-cols-4 gap-2">
        <div className="card card-interactive text-center py-3">
          <div className="text-[10px] text-stone-500 uppercase tracking-wider">题数</div>
          <div className="text-2xl font-bold text-brand-600 font-mono tabular-nums mt-1">{round}</div>
        </div>
        <div className="card card-interactive text-center py-3">
          <div className="text-[10px] text-stone-500 uppercase tracking-wider">正确</div>
          <div className="text-2xl font-bold text-emerald-600 font-mono tabular-nums mt-1">{correctCount}</div>
        </div>
        <div className="card card-interactive text-center py-3">
          <div className="text-[10px] text-stone-500 uppercase tracking-wider">总分</div>
          <div className="text-2xl font-bold text-amber-600 font-mono tabular-nums mt-1">{totalScore}</div>
        </div>
        <div className="card card-interactive text-center py-3">
          <div className="text-[10px] text-stone-500 uppercase tracking-wider">平均</div>
          <div className="text-2xl font-bold text-purple-600 font-mono tabular-nums mt-1">
            {round > 0 ? Math.round(totalScore / round) : 0}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DictationPage
