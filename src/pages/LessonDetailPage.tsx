// 课文详情页 (LessonDetailPage) - v1.85.0
// 渲染单篇课文 + 词汇高亮 + 释义 tooltip + 进度条 + 完读状态
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  getLessonById,
  getLessonVocabWords,
  findVocabInBody,
  isLessonLearned,
  markLessonLearned,
  unmarkLessonLearned,
  calcReadingProgress,
} from '../lib/textbook'
import { loadWords } from '../lib/words'
import type { Word } from '../types'
import type { VocabRange } from '../lib/textbook'
import TTSButton from '../components/TTSButton'
import { toast } from '../components/Toast'

export default function LessonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const lesson = useMemo(() => (id ? getLessonById(id) : null), [id])

  // 词汇表 (查 words.json 拿真实词条)
  const [vocabWords, setVocabWords] = useState<Word[]>([])
  // 加载状态
  const [loading, setLoading] = useState(true)
  // 已学状态
  const [learned, setLearned] = useState(false)
  // 阅读进度 (0-1)
  const [progress, setProgress] = useState(0)
  // 高亮 token hover 态
  const [hoveredRange, setHoveredRange] = useState<VocabRange | null>(null)
  // tooltip 显示的 word
  const [tooltipWord, setTooltipWord] = useState<Word | null>(null)
  // 切换"已学"中 (防止双击)
  const [togglingLearned, setTogglingLearned] = useState(false)
  // 离开页面时通知列表页
  useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent('textbook:updated'))
    }
  }, [])

  // 加载词汇 + 已学状态 (cancelled flag 防 race)
  useEffect(() => {
    setLoading(true)
    setVocabWords([])
    setLearned(false)
    setProgress(0)
    if (!lesson) {
      setLoading(false)
      return
    }
    let cancelled = false
    Promise.all([
      loadWords().then(words => getLessonVocabWords(lesson, words)),
      isLessonLearned(lesson.id),
    ]).then(([words, isL]) => {
      if (cancelled) return
      setVocabWords(words)
      setLearned(isL)
      setLoading(false)
    }).catch(e => {
      if (cancelled) return
      console.error('LessonDetailPage 加载失败', e)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [lesson])

  // 滚动监听 - 算阅读进度
  useEffect(() => {
    const onScroll = () => {
      setProgress(calcReadingProgress(
        window.scrollY,
        document.documentElement.scrollHeight,
        window.innerHeight,
      ))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [loading])

  // 找 body 中所有词汇位置
  const ranges = useMemo<VocabRange[]>(() => {
    if (!lesson) return []
    return findVocabInBody(lesson.body, vocabWords)
  }, [lesson, vocabWords])

  // 切"已学"状态
  const toggleLearned = useCallback(async () => {
    if (!lesson || togglingLearned) return
    setTogglingLearned(true)
    try {
      if (learned) {
        await unmarkLessonLearned(lesson.id)
        setLearned(false)
        toast.success('已取消已学标记')
      } else {
        await markLessonLearned(lesson.id)
        setLearned(true)
        toast.success('已标记为已学 ✓')
      }
      // 通知列表页更新
      window.dispatchEvent(new CustomEvent('textbook:updated'))
    } catch (e) {
      console.error('切换已学状态失败', e)
      toast.error('操作失败,请重试')
    } finally {
      setTogglingLearned(false)
    }
  }, [lesson, learned, togglingLearned])

  if (!lesson) {
    return (
      <div className="text-center py-20 text-stone-500 dark:text-stone-400">
        课文不存在
        <div className="mt-4">
          <Link to="/textbook" className="btn-primary">返回课文列表</Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-stone-500 dark:text-stone-400">
        加载中...
      </div>
    )
  }

  // 用 ranges 切分 body 成 token 数组 (text + 可选 vocab)
  const segments = useMemo(() => buildSegments(lesson.body, ranges), [lesson.body, ranges])

  return (
    <div className="space-y-4 pb-24">
      {/* 顶部: 返回 + 已学按钮 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/textbook')}
          className="btn-ghost text-sm hidden md:inline-flex"
        >
          ← 返回课文列表
        </button>
        <div className="md:hidden" />
        <button
          onClick={toggleLearned}
          disabled={togglingLearned}
          className={`text-xs px-3 py-1.5 rounded-full transition ${
            learned
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
          } disabled:opacity-50`}
        >
          {learned ? '✓ 已学' : '○ 标记为已学'}
        </button>
      </div>

      {/* 进度条 (顶部固定) */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-stone-900/80 backdrop-blur -mx-4 px-4 py-2">
        <div className="h-1 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 transition-all duration-150"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <div className="text-[10px] text-stone-400 mt-0.5 text-right">
          阅读进度 {Math.round(progress * 100)}%
        </div>
      </div>

      {/* 标题区 */}
      <div className="card bg-gradient-to-br from-brand-500 to-emerald-600 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="text-4xl">{lesson.emoji}</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">{lesson.title}</h1>
            <p className="text-sm opacity-90 mt-1">{lesson.summary}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <TTSButton text={lesson.body} />
          <span className="text-xs opacity-80">点击朗读全文</span>
        </div>
      </div>

      {/* 正文 (含高亮词汇) */}
      <div className="card">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <span>📄</span>
          <span>正文</span>
        </h3>
        <div className="text-base leading-loose text-stone-800 dark:text-stone-200 whitespace-pre-line">
          {segments.map((seg, i) => {
            if (!seg.range) {
              return <span key={i}>{seg.text}</span>
            }
            return (
              <span
                key={i}
                className="relative inline"
                onMouseEnter={() => setHoveredRange(seg.range!)}
                onMouseLeave={() => setHoveredRange(prev => prev === seg.range ? null : prev)}
                onClick={() => setTooltipWord(prev => prev?.id === seg.range!.word.id ? null : seg.range!.word)}
              >
                <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded px-0.5 cursor-pointer border-b border-amber-300 dark:border-amber-700">
                  {seg.text}
                </span>
                {hoveredRange === seg.range && (
                  <span className="absolute left-0 -top-9 z-20 px-2 py-1 bg-stone-900 text-white text-xs rounded shadow-lg whitespace-nowrap pointer-events-none">
                    {seg.range.word.translations[0] || seg.range.word.word}
                  </span>
                )}
                {tooltipWord?.id === seg.range.word.id && (
                  <span
                    className="fixed inset-x-0 bottom-20 mx-auto z-30 max-w-sm px-4 py-3 bg-white dark:bg-stone-800 rounded-lg shadow-xl border border-stone-200 dark:border-stone-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-bold text-lg">{seg.range.word.word}</span>
                      <span className="text-xs text-stone-400">{seg.range.word.phonetic}</span>
                    </div>
                    <p className="text-sm text-stone-700 dark:text-stone-300 mb-2">
                      {seg.range.word.translations.slice(0, 2).join(' · ')}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <Link
                        to={`/words/${seg.range.word.id}`}
                        className="px-2 py-1 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded"
                        onClick={(e) => e.stopPropagation()}
                      >
                        查看详情 →
                      </Link>
                      <button
                        onClick={(e) => { e.stopPropagation(); setTooltipWord(null) }}
                        className="text-stone-400"
                      >
                        ✕
                      </button>
                    </div>
                  </span>
                )}
              </span>
            )
          })}
        </div>
      </div>

      {/* 词汇表 */}
      <div className="card">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <span>📚</span>
          <span>词汇表 ({vocabWords.length})</span>
        </h3>
        {vocabWords.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">没有匹配的词汇</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {vocabWords.map(w => (
              <Link
                key={w.id}
                to={`/words/${w.id}`}
                className="flex items-center gap-2 px-3 py-2 bg-stone-50 dark:bg-stone-800 rounded hover:bg-stone-100 dark:hover:bg-stone-700 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{w.word}</div>
                  <div className="text-xs text-stone-500 dark:text-stone-400 truncate">
                    {w.translations[0]}
                  </div>
                </div>
                <TTSButton text={w.word} size="sm" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 学习提示 */}
      <div className="card bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <div className="text-xl">💡</div>
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-200 mb-1">阅读小贴士</p>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              鼠标悬停高亮词看中文释义, 点击看更多; 通读完后点击顶部"标记为已学"
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

interface Segment {
  text: string
  range: VocabRange | null
}

/** 把 body 切成 [text, range|null][] - range 非空表示该段是词汇高亮 */
function buildSegments(body: string, ranges: VocabRange[]): Segment[] {
  if (ranges.length === 0) return [{ text: body, range: null }]
  const segs: Segment[] = []
  let cursor = 0
  for (const r of ranges) {
    if (r.start > cursor) {
      segs.push({ text: body.slice(cursor, r.start), range: null })
    }
    segs.push({ text: body.slice(r.start, r.end), range: r })
    cursor = r.end
  }
  if (cursor < body.length) {
    segs.push({ text: body.slice(cursor), range: null })
  }
  return segs
}
