// src/pages/SpellingPage.tsx - v1.90 W84 单词卡 (Spelling Card) UI
// v1.91 W85: 错题入统一表 (source='spelling')
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

const DIFF_LABELS: Record<Difficulty, string> = {
  easy: '简单 (1-4 字符)',
  medium: '中等 (5-6 字符)',
  hard: '困难 (7-12 字符)',
}

const DIFF_EMOJI: Record<Difficulty, string> = {
  easy: '🌱',
  medium: '🌿',
  hard: '🌳',
}

export function SpellingPage() {
  const navigate = useNavigate()
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [words, setWords] = useState<Word[]>([])
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
      .then(setWords)
      .catch(e => console.error('[Spelling] loadWords:', e))
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
    setStatus('🔊 正在播放...')
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

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-600">✏️ 单词卡</h1>
        <button onClick={() => navigate('/')} className="text-sm text-stone-500 hover:text-stone-700">
          ← 返回
        </button>
      </div>

      {/* 难度选择 */}
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
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${
              difficulty === d
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700'
            }`}
          >
            {DIFF_EMOJI[d]} {DIFF_LABELS[d]}
          </button>
        ))}
      </div>

      <div className="text-center text-sm text-stone-600 dark:text-stone-400 min-h-[1.5em]">
        {status || '点击"播放"听单词'}
      </div>

      {/* 当前题 */}
      {target && (
        <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 shadow-sm border border-stone-200 dark:border-stone-700 space-y-4">
          <div className="text-center">
            <div className="text-sm text-stone-500 mb-2">听单词并拼写</div>
            <div className="text-2xl font-mono text-stone-400 dark:text-stone-600 select-none mb-3">
              {target.word.length} 字符
            </div>
            <button
              onClick={() => playTarget(target.word)}
              className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600"
            >
              🔊 再听一次
            </button>
          </div>

          {/* 输入 */}
          <div className="border-t border-stone-200 dark:border-stone-700 pt-4">
            <div className="text-sm text-stone-500 mb-2">拼写</div>
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
              className="w-full px-4 py-3 border-2 border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 text-lg font-mono focus:border-brand-500 focus:outline-none disabled:opacity-50"
            />
            {!feedback && (
              <button
                onClick={handleSubmit}
                disabled={!user.trim()}
                className="mt-3 w-full px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50"
              >
                提交 (Enter)
              </button>
            )}
          </div>

          {/* 反馈 */}
          {feedback && hint && (
            <div className="border-t border-stone-200 dark:border-stone-700 pt-4 space-y-3">
              <div className="text-center">
                <div className="text-sm text-stone-500">得分</div>
                <div className={`text-4xl font-bold ${
                  feedback.score === 100 ? 'text-emerald-500' :
                  feedback.score >= 50 ? 'text-amber-500' : 'text-rose-500'
                }`}>
                  {feedback.score}
                </div>
              </div>

              {/* 字符级 diff */}
              <div className="bg-stone-50 dark:bg-stone-900 rounded-lg p-3 space-y-2 font-mono text-lg">
                <div className="flex items-center gap-2">
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
                <div className="flex items-center gap-2">
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
                className="w-full px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600"
              >
                下一题 (Enter) →
              </button>
            </div>
          )}
        </div>
      )}

      {/* 进度条 */}
      <div className="bg-white dark:bg-stone-800 rounded-xl p-3 border border-stone-200 dark:border-stone-700">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-stone-600 dark:text-stone-300">进度</span>
          <span className="text-stone-500">{round} / {TARGET_ROUNDS}</span>
        </div>
        <div className="h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 transition-all"
            style={{ width: `${Math.min(100, (round / TARGET_ROUNDS) * 100)}%` }}
          />
        </div>
        {round >= TARGET_ROUNDS && (
          <div className="mt-2 text-center text-sm text-emerald-600 font-medium">
            🎉 完成! 正确 {correctCount}/{round} ({Math.round(correctCount / round * 100)}%)
          </div>
        )}
      </div>

      {/* 统计 */}
      <div className="flex justify-around bg-white dark:bg-stone-800 rounded-xl p-3 border border-stone-200 dark:border-stone-700 text-sm">
        <div>
          <div className="text-stone-500">题数</div>
          <div className="text-2xl font-bold text-brand-600">{round}</div>
        </div>
        <div>
          <div className="text-stone-500">正确</div>
          <div className="text-2xl font-bold text-emerald-600">{correctCount}</div>
        </div>
        <div>
          <div className="text-stone-500">总分</div>
          <div className="text-2xl font-bold text-amber-600">{totalScore}</div>
        </div>
      </div>
    </div>
  )
}

export default SpellingPage
