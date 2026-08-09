// src/pages/SpellingPage.tsx - W126 改版稿 UI
// v1.90 W84 单词卡 (Spelling Card) UI
// v1.91 W85: 错题入统一表 (source='spelling')
// W126: 0 emoji 操 作 + Icon SVG + W123d 3 圆 顶 部 + W113 v2 card + Skeleton + W123a sticky bottom
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { speak } from '../lib/tts'
import { saveDictationError } from '../lib/db'
import {
  pickSpellingWord,
  spellingDiff,
  scoreSpelling,
  renderSpellingHint,
  type Difficulty,
} from '../lib/spelling'
import { loadWords } from '../lib/words'
import type { Word } from '../types'
import {
  IconArrow, IconEdit, IconHeadphones, IconTrophy, IconRefresh, IconSparkles,
} from '../components/Icon'
import { SkeletonPage } from '../components/Skeleton'

const DIFF_LABELS: Record<Difficulty, string> = {
  easy: '简单 (1-4 字符)',
  medium: '中等 (5-6 字符)',
  hard: '困难 (7-12 字符)',
}

// W126: 难度 3 色 (W113 状态色 3 色)
const DIFF_STYLE: Record<Difficulty, { bg: string; ring: string; label: string }> = {
  easy: { bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800', ring: 'border-emerald-500', label: '简单' },
  medium: { bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', ring: 'border-amber-500', label: '中等' },
  hard: { bg: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800', ring: 'border-rose-500', label: '困难' },
}

export function SpellingPage() {
  const navigate = useNavigate()
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [used, setUsed] = useState<Set<string>>(new Set())
  const [target, setTarget] = useState<Word | null>(null)
  const [user, setUser] = useState('')
  const [feedback, setFeedback] = useState<{
    score: number
    diff: ReturnType<typeof spellingDiff>
  } | null>(null)
  const [round, setRound] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState('')
  const TARGET_ROUNDS = 10

  useEffect(() => {
    loadWords()
      .then(w => { setWords(w); setLoading(false) })
      .catch(e => { console.error('[Spelling] loadWords:', e); setLoading(false) })
  }, [])

  // 加载后生成第一题
  useEffect(() => {
    if (words.length === 0) return
    if (target) return
    const fresh = new Set<string>()
    const w = pickSpellingWord(words, fresh, difficulty)
    if (w) {
      setTarget(w)
      fresh.add(w.id)
      setUsed(fresh)
      setTimeout(() => playTarget(w.word), 300)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words.length, target, difficulty])

  const playTarget = useCallback((text: string) => {
    setStatus('正在播放...')
    speak({ text, rate: 0.8 })
    setTimeout(() => setStatus('请输入单词拼写 / 按 Enter 提交'), 2000)
  }, [])

  const handleSubmit = useCallback(() => {
    if (!target || !user.trim()) return
    const score = scoreSpelling(target.word, user)
    const diff = spellingDiff(target.word, user)
    setFeedback({ score, diff })
    setTotalScore(s => s + score)
    setRound(r => r + 1)
    if (score === 100) setCorrectCount(c => c + 1)
    // v1.91 W85: 错题入统一表 (source='spelling')
    if (score < 100 && target) {
      saveDictationError({
        wordId: target.id,
        difficulty,
        source: 'spelling',
        transcript: user,
        target: target.word,
        score,
      }).catch(e => console.error('[Spelling] saveDictationError:', e))
    }
  }, [target, user, difficulty])

  const handleNext = useCallback(() => {
    setUser('')
    setFeedback(null)
    setStatus('')
    const fresh = new Set<string>(used)
    const w = pickSpellingWord(words, fresh, difficulty)
    if (w) {
      setTarget(w)
      fresh.add(w.id)
      setUsed(fresh)
      setTimeout(() => playTarget(w.word), 200)
    } else {
      // 用完一轮, 重置
      const fresh2 = new Set<string>()
      const w2 = pickSpellingWord(words, fresh2, difficulty)
      if (w2) {
        setTarget(w2)
        fresh2.add(w2.id)
        setUsed(fresh2)
        setTimeout(() => playTarget(w2.word), 200)
      }
    }
  }, [words, difficulty, used, playTarget])

  // 键盘 Enter 提交
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (feedback) {
        handleNext()
      } else {
        handleSubmit()
      }
    }
  }, [feedback, handleNext, handleSubmit])

  // 渲染字符级 hint
  const hint = target && feedback ? renderSpellingHint(target.word, user) : null

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
          <IconEdit size={20} className="text-brand-500" />
          单词卡
        </h1>
        <button
          onClick={() => { setTarget(null); setFeedback(null); setUser(''); setUsed(new Set()) }}
          className="w-9 h-9 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition-colors duration-[var(--t-fast)]"
          aria-label="重新抽词"
          title="重新抽词"
        >
          <IconRefresh size={16} />
        </button>
      </div>

      {/* 难度选择 - W113 v2 card + 3 状态色 */}
      <div className="card card-interactive">
        <div className="flex items-center gap-2 mb-2">
          <IconEdit size={14} className="text-stone-500" />
          <span className="text-xs text-stone-500 dark:text-stone-400">难度</span>
        </div>
        <div className="flex gap-2">
          {(Object.keys(DIFF_LABELS) as Difficulty[]).map(d => (
            <button
              key={d}
              onClick={() => {
                setDifficulty(d)
                setTarget(null)
                setFeedback(null)
                setUser('')
                setUsed(new Set())
              }}
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

      {/* 状态 - 状态色 (W113) */}
      <div className="text-center text-sm text-stone-600 dark:text-stone-400 min-h-[1.5em] flex items-center justify-center gap-1">
        {status && <IconSparkles size={14} className="text-brand-500" />}
        <span>{status || '点击「播放」听单词'}</span>
      </div>

      {/* 当前题 - W113 v2 card-interactive */}
      {target && (
        <div className="card card-interactive space-y-4">
          <div className="text-center">
            <div className="text-xs text-stone-500 dark:text-stone-400 mb-2 flex items-center justify-center gap-1">
              <IconHeadphones size={12} />
              听单词并拼写
            </div>
            <div className="text-2xl font-mono tabular-nums text-stone-400 dark:text-stone-600 select-none mb-3">
              {target.word.length} 字符
            </div>
            <button
              onClick={() => playTarget(target.word)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-500 text-white rounded-full text-sm font-medium hover:bg-brand-600 transition-colors duration-[var(--t-fast)] active:scale-95 shadow-[0_2px_6px_rgba(34,197,94,0.3)]"
            >
              <IconHeadphones size={14} />
              再听一次
            </button>
          </div>

          {/* 输入 + sticky bottom (W123a) */}
          <div className="border-t border-stone-200 dark:border-stone-700 pt-4 space-y-2">
            <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1">
              <IconEdit size={12} />
              拼写
            </div>
            <input
              ref={inputRef}
              type="text"
              value={user}
              onChange={e => setUser(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入单词..."
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={!!feedback}
              className="w-full px-4 py-3 border-2 border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 text-lg font-mono tabular-nums focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 transition-all duration-[var(--t-fast)]"
            />
            {!feedback && (
              /* W123a: 移动端 sticky bottom + safe-area-inset-bottom */
              <div
                className="sticky bottom-0 bg-white dark:bg-stone-800 pt-2 -mx-4 px-4 border-t border-stone-100 dark:border-stone-700"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
              >
                <button
                  onClick={handleSubmit}
                  disabled={!user.trim()}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-full text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors duration-[var(--t-fast)] active:scale-95"
                >
                  提交 (Enter)
                </button>
              </div>
            )}
          </div>

          {/* 反馈 - W113 状态色 + 大圆环 (W124 Bento 风格) */}
          {feedback && hint && (
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

              {/* 字符级 diff - 状态色 (W113) */}
              <div className="bg-stone-50 dark:bg-stone-900 rounded-lg p-3 space-y-2 font-mono tabular-nums text-lg">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-stone-500 w-12">目标:</span>
                  {hint.parts.map((p, i) => (
                    <span
                      key={i}
                      className={
                        p.status === 'ok' ? 'text-emerald-600'
                        : p.status === 'wrong' ? 'text-rose-600 underline'
                        : 'text-rose-500 underline decoration-double'
                      }
                    >
                      {p.char}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-stone-500 w-12">你的:</span>
                  {hint.userParts.map((p, i) => (
                    <span
                      key={i}
                      className={
                        p.status === 'ok' ? 'text-emerald-600'
                        : p.status === 'wrong' ? 'text-rose-600'
                        : 'text-amber-600'
                      }
                    >
                      {p.char}
                    </span>
                  ))}
                </div>
              </div>

              {/* 释义 */}
              <div className="text-sm text-stone-500">
                释义: <span className="text-stone-800 dark:text-stone-200">
                  {target.translations?.[0] || '-'}
                </span>
              </div>

              <button
                onClick={handleNext}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-500 text-white rounded-full text-sm font-medium hover:bg-brand-600 transition-colors duration-[var(--t-fast)] active:scale-95 shadow-[0_2px_6px_rgba(34,197,94,0.3)]"
              >
                下一题 (Enter)
                <IconArrow size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 进度条 - W124 Bento 风格 */}
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
            完成! 正确 {correctCount}/{round} ({Math.round(correctCount / round * 100)}%)
          </div>
        )}
      </div>

      {/* 统计 - W113 3 列 Bento grid */}
      <div className="grid grid-cols-3 gap-2">
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
      </div>
    </div>
  )
}

export default SpellingPage
