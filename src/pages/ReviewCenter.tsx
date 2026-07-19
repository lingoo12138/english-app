// 复习中心 - 批量复习待复习的词
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDueReviews, reviewWord, logAction } from '../lib/db'
import { getWord } from '../lib/words'
import type { Word } from '../types'
import TTSButton from '../components/TTSButton'

export default function ReviewCenter() {
  const navigate = useNavigate()
  const [queue, setQueue] = useState<Word[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [sessionDone, setSessionDone] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    loadQueue()
  }, [])

  async function loadQueue() {
    setLoading(true)
    const due = await getDueReviews()
    const wordList: Word[] = []
    for (const item of due) {
      const w = await getWord(item.wordId)
      if (w) wordList.push(w)
    }
    setQueue(wordList)
    setLoading(false)
  }

  function startWord() {
    startTimeRef.current = Date.now()
    setShowAnswer(false)
  }

  useEffect(() => {
    if (queue.length > 0 && currentIndex < queue.length) {
      startWord()
    }
  }, [currentIndex, queue.length])

  async function handleAnswer(know: boolean) {
    const word = queue[currentIndex]
    if (!word) return

    // SM-2: 5=完美, 1=完全不会
    const quality = know ? 5 : 1
    await reviewWord(word.word, quality)
    await logAction(word.word, know ? 'known' : 'unknown')

    if (know) {
      setCorrectCount(c => c + 1)
    } else {
      setWrongCount(w => w + 1)
    }

    // 下一个
    if (currentIndex + 1 >= queue.length) {
      setSessionDone(true)
    } else {
      setCurrentIndex(i => i + 1)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-20 text-stone-500">
        <div className="text-4xl mb-3">⏳</div>
        正在准备复习内容...
      </div>
    )
  }

  if (queue.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-bold mb-2">没有待复习的词</h2>
        <p className="text-stone-500 text-sm mb-6">
          标记"不认识"的词会在 1 天后再次出现<br />
          系统会按记忆曲线智能安排复习
        </p>
        <div className="space-y-2">
          <button onClick={() => navigate('/words')} className="btn-primary w-full">
            去浏览词库
          </button>
          <button onClick={() => navigate('/notebook')} className="btn-ghost w-full">
            看看生词本
          </button>
        </div>
      </div>
    )
  }

  if (sessionDone) {
    const total = correctCount + wrongCount
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">{accuracy >= 80 ? '🏆' : accuracy >= 60 ? '👍' : '💪'}</div>
        <h2 className="text-2xl font-bold mb-2">复习完成!</h2>
        <p className="text-stone-500 mb-6">
          本次复习 {total} 个词
        </p>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="card text-center">
            <div className="text-2xl font-bold text-brand-600">{total}</div>
            <div className="text-xs text-stone-500 mt-1">总数</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-600">{correctCount}</div>
            <div className="text-xs text-stone-500 mt-1">认识</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-orange-600">{wrongCount}</div>
            <div className="text-xs text-stone-500 mt-1">不认识</div>
          </div>
        </div>

        <div className="card mb-6">
          <div className="text-sm text-stone-500 mb-1">本次正确率</div>
          <div className="text-3xl font-bold text-brand-600">{accuracy}%</div>
          <div className="mt-3 h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-600 transition-all"
              style={{ width: `${accuracy}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <button onClick={() => navigate('/')} className="btn-primary w-full">
            回到首页
          </button>
          <button onClick={() => navigate('/words')} className="btn-ghost w-full">
            继续学习新词
          </button>
        </div>
      </div>
    )
  }

  const word = queue[currentIndex]
  const progress = ((currentIndex) / queue.length) * 100

  return (
    <div className="space-y-6">
      {/* 进度 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate(-1)} className="btn-ghost text-sm">
            ← 退出
          </button>
          <span className="text-sm text-stone-500">
            {currentIndex + 1} / {queue.length}
          </span>
        </div>
        <div className="h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 词卡 */}
      <div className="card min-h-[280px] flex flex-col items-center justify-center text-center py-10">
        <div className="flex items-center gap-2 mb-3">
          {word.pos.slice(0, 2).map(p => (
            <span key={p} className="text-xs px-2 py-0.5 bg-stone-100 dark:bg-stone-700 rounded">
              {p}
            </span>
          ))}
        </div>

        <h1 className="text-5xl font-bold mb-3 tracking-wide">
          {word.word}
        </h1>

        <p className="text-stone-500 mb-6">{word.phonetic}</p>

        <TTSButton text={word.word} size="lg" />

        {showAnswer ? (
          <div className="mt-6 w-full max-w-md">
            <div className="text-xl text-stone-800 dark:text-stone-200 mb-4">
              {word.translations[0]}
            </div>
            {word.examples[0] && (
              <div className="text-left border-l-2 border-brand-300 dark:border-brand-700 pl-3 mt-4">
                <p className="text-sm">{word.examples[0].en}</p>
                <p className="text-xs text-stone-500 mt-1">{word.examples[0].zh}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 text-stone-400 text-sm">
            在脑中回忆它的意思...
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      {showAnswer ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleAnswer(false)}
            className="btn bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50 py-4"
          >
            <div className="text-2xl mb-1">😕</div>
            <div className="text-sm font-medium">不认识</div>
            <div className="text-xs opacity-70 mt-0.5">明天再复习</div>
          </button>
          <button
            onClick={() => handleAnswer(true)}
            className="btn bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 py-4"
          >
            <div className="text-2xl mb-1">😄</div>
            <div className="text-sm font-medium">认识</div>
            <div className="text-xs opacity-70 mt-0.5">下次复习拉长</div>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAnswer(true)}
          className="btn-primary w-full py-4"
        >
          查看答案
        </button>
      )}
    </div>
  )
}
