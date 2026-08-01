// src/pages/DictationPage.tsx - v1.87 W81-D 听写 UI
// v1.88 W82-C: 加复习模式 toggle
// v1.89 W83-B: 加进度条 + 错词收藏
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { speak } from '../lib/tts'
import { isSTTSupported, STTController } from '../lib/stt'
import { saveDictationError, getDictationErrorWordIds } from '../lib/db'
import { addFavorite, removeFavorite, isFavorite } from '../lib/db'
import {
  buildItem,
  scoreAnswer,
  diffWords,
  normalize,
  getReviewWords,
  type Difficulty,
  type DictationItem,
} from '../lib/dictation'
import { loadWords } from '../lib/words'
import type { Word } from '../types'

const DIFF_LABELS: Record<Difficulty, string> = {
  easy: '简单 (1 词)',
  medium: '中等 (短句)',
  hard: '困难 (长句)',
}

const DIFF_EMOJI: Record<Difficulty, string> = {
  easy: '🌱',
  medium: '🌿',
  hard: '🌳',
}

export function DictationPage() {
  const navigate = useNavigate()
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [words, setWords] = useState<Word[]>([])
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
    loadWords().then(setWords).catch(e => console.error('[Dictation] loadWords:', e))
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
          setStatus('📚 暂无错词, 自动关闭复习模式')
          setReviewMode(false)
        } else {
          setStatus(`📚 复习模式: 还有 ${pool.length} 词要复习`)
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
    setStatus('🔊 正在播放...')
    speak({ text })
    setTimeout(() => setStatus('请录音 / 或在下方输入'), 3000)
  }, [])

  const startListening = useCallback(() => {
    if (!sttSupported) {
      setStatus('⚠ 浏览器不支持语音识别, 请在下方输入')
      return
    }
    setListening(true)
    setStatus('🎤 录音中...')
    sttRef.current = new STTController({
      onResult: (text, isFinal) => {
        setTranscript(text)
        if (isFinal) {
          setListening(false)
          setStatus('✓ 识别完成')
        }
      },
      onError: (err) => {
        setListening(false)
        setStatus(`⚠ 错误: ${err}, 请重试或输入`)
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

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-600">🎧 听写</h1>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-stone-500 hover:text-stone-700"
        >
          ← 返回
        </button>
      </div>

      {/* 难度选择 */}
      <div className="flex gap-2">
        {(Object.keys(DIFF_LABELS) as Difficulty[]).map(d => (
          <button
            key={d}
            onClick={() => { setDifficulty(d); setItem(null); setFeedback(null); setUsed(new Set()) }}
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

      {/* v1.88 W82-C: 复习模式 toggle */}
      <div className="flex items-center justify-between bg-white dark:bg-stone-800 rounded-lg p-2 border border-stone-200 dark:border-stone-700">
        <span className="text-sm text-stone-600 dark:text-stone-300">📚 复习模式</span>
        <button
          onClick={() => {
            setReviewMode(!reviewMode)
            setItem(null)
            setFeedback(null)
            setUsed(new Set())
          }}
          className={`px-3 py-1 rounded-md text-xs font-medium ${
            reviewMode
              ? 'bg-amber-500 text-white'
              : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
          }`}
        >
          {reviewMode ? '✓ 开启' : '关闭'}
        </button>
      </div>

      {/* 状态 */}
      <div className="text-center text-sm text-stone-600 dark:text-stone-400 min-h-[1.5em]">
        {status || '点击下方"播放"开始'}
      </div>

      {/* 当前题 */}
      {item && (
        <div className="bg-white dark:bg-stone-800 rounded-2xl p-6 shadow-sm border border-stone-200 dark:border-stone-700 space-y-4">
          <div className="text-center">
            <div className="text-sm text-stone-500 mb-2">目标</div>
            <div className="text-3xl font-mono text-stone-700 dark:text-stone-200 select-none">
              {'•'.repeat(item.target.length)}
            </div>
            <button
              onClick={() => playTarget(item.target)}
              className="mt-3 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600"
            >
              🔊 播放
            </button>
          </div>

          {/* 录音 */}
          <div className="border-t border-stone-200 dark:border-stone-700 pt-4">
            <div className="text-sm text-stone-500 mb-2">你的回答</div>
            <div className="flex gap-2">
              {!listening ? (
                <button
                  onClick={startListening}
                  disabled={!sttSupported}
                  className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 disabled:opacity-50"
                >
                  🎤 开始录音
                </button>
              ) : (
                <button
                  onClick={stopListening}
                  className="px-4 py-2 bg-stone-500 text-white rounded-lg text-sm font-medium hover:bg-stone-600"
                >
                  ⏹ 停止
                </button>
              )}
            </div>
            <textarea
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              placeholder="或在此输入..."
              className="mt-3 w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 text-sm"
              rows={2}
            />
            <button
              onClick={handleSubmit}
              disabled={!transcript.trim()}
              className="mt-3 w-full px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50"
            >
              提交答案
            </button>
          </div>

          {/* 反馈 */}
          {feedback && (
            <div className="border-t border-stone-200 dark:border-stone-700 pt-4 space-y-2">
              <div className="text-center">
                <div className="text-sm text-stone-500">得分</div>
                <div className={`text-4xl font-bold ${
                  feedback.score === 100 ? 'text-emerald-500' :
                  feedback.score >= 50 ? 'text-amber-500' : 'text-rose-500'
                }`}>
                  {feedback.score}
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
              {/* v1.89 W83-B: 错词收藏按钮 */}
              {item.sourceWord && feedback.score < 100 && (
                <button
                  onClick={() => handleToggleFav(item.sourceWord!.id)}
                  className={`w-full px-4 py-2 rounded-lg text-sm font-medium ${
                    favSet.has(item.sourceWord.id)
                      ? 'bg-rose-500 text-white'
                      : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                  }`}
                >
                  {favSet.has(item.sourceWord.id) ? '⭐ 已收藏 (生词本)' : '☆ 收藏到生词本'}
                </button>
              )}
              <button
                onClick={handleNext}
                className="w-full px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600"
              >
                下一题 →
              </button>
            </div>
          )}
        </div>
      )}

      {/* v1.89 W83-B: 进度条 */}
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
            🎉 一轮完成! 正确 {correctCount}/{round} ({Math.round(correctCount / round * 100)}%)
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
        <div>
          <div className="text-stone-500">平均</div>
          <div className="text-2xl font-bold text-purple-600">
            {round > 0 ? Math.round(totalScore / round) : 0}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DictationPage
