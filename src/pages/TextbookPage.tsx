// 课文列表页 (TextbookPage) - v1.85.0
// 5 篇主题短文列表, 显示 emoji + 标题 + 词汇数 + 等级 + 已学状态
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LESSONS, type Lesson } from '../data/textbook'
import { loadWords } from '../lib/words'
import { getLearnedLessonIds } from '../lib/textbook'
import { LEVELS } from '../lib/words'

export default function TextbookPage() {
  const [learned, setLearned] = useState<Set<string>>(new Set())
  const [vocabCounts, setVocabCounts] = useState<Record<string, number>>({})

  // 加载已学状态
  useEffect(() => {
    let cancelled = false
    getLearnedLessonIds().then(ids => {
      if (!cancelled) setLearned(ids)
    })
    // 监听来自 LessonDetailPage 的更新事件
    const handler = () => {
      getLearnedLessonIds().then(ids => {
        if (!cancelled) setLearned(ids)
      })
    }
    window.addEventListener('textbook:updated', handler)
    return () => {
      cancelled = true
      window.removeEventListener('textbook:updated', handler)
    }
  }, [])

  // 加载每课在 words.json 中实际可命中的词数
  useEffect(() => {
    let cancelled = false
    loadWords().then(words => {
      if (cancelled) return
      const byWord = new Set(words.map(w => w.word.toLowerCase()))
      const counts: Record<string, number> = {}
      for (const lesson of LESSONS) {
        counts[lesson.id] = lesson.vocabulary.filter(v => byWord.has(v.toLowerCase())).length
      }
      setVocabCounts(counts)
    })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">📖 课文</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm">
            5 篇主题短文 · 真实语境学英语
          </p>
        </div>
        <Link
          to="/textbook/score"
          className="text-sm px-3 py-1.5 bg-brand-500 text-white rounded hover:bg-brand-600"
        >
          📊 课文评分
        </Link>
      </div>

      {/* 学习建议 */}
      <div className="card bg-gradient-to-r from-brand-50 to-emerald-50 dark:from-brand-900/20 dark:to-emerald-900/20 border border-brand-200 dark:border-brand-800">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div className="flex-1 text-sm">
            <p className="font-medium text-brand-900 dark:text-brand-200 mb-1">怎么用课文</p>
            <p className="text-brand-700 dark:text-brand-300 text-xs">
              先通读一遍, 再点词汇表里的词看释义, 最后用 TTS 跟读练习
            </p>
          </div>
        </div>
      </div>

      {/* 课文卡片 */}
      <div className="grid grid-cols-1 gap-3">
        {LESSONS.map(lesson => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            vocabCount={vocabCounts[lesson.id] ?? lesson.vocabulary.length}
            isLearned={learned.has(lesson.id)}
          />
        ))}
      </div>
    </div>
  )
}

interface LessonCardProps {
  lesson: Lesson
  vocabCount: number
  isLearned: boolean
}

function LessonCard({ lesson, vocabCount, isLearned }: LessonCardProps) {
  const levelInfo = LEVELS.find(l => l.value === lesson.level)
  return (
    <Link
      to={`/textbook/${lesson.id}`}
      className="card flex items-start gap-4 hover:shadow-md active:scale-[0.98] transition-all no-select"
    >
      <div className="text-4xl flex-shrink-0">{lesson.emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="text-lg font-semibold">{lesson.title}</h3>
          {isLearned && (
            <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
              ✓ 已学
            </span>
          )}
        </div>
        <p className="text-sm text-stone-500 dark:text-stone-400 line-clamp-2 mb-2">
          {lesson.summary}
        </p>
        <div className="flex items-center gap-3 text-xs text-stone-400 dark:text-stone-300 flex-wrap">
          <span className={`px-1.5 py-0.5 rounded text-white ${levelInfo?.color || 'bg-stone-500'}`}>
            {levelInfo?.label || lesson.level}
          </span>
          <span>📚 {vocabCount} 词</span>
          <span>⏱ {lesson.estimatedMinutes} 分钟</span>
        </div>
      </div>
      <div className="text-stone-400 dark:text-stone-300 flex-shrink-0">→</div>
    </Link>
  )
}
