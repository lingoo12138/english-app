// 课文详情页 (LessonDetailPage) - v1.85.0
// 渲染单篇课文 + 词汇高亮 + 释义 tooltip + 进度条 + 完读状态
// v1.89 W83-C: 加 跟读模式 (逐句朗读)
// v1.92 W86-A: 加 跟读评分 (STT 录音 + 评分)
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
import { speak } from '../lib/tts'
import { isSTTSupported, STTController } from '../lib/stt'
import { saveDictationError } from '../lib/db'
import { evaluateFollowRead, splitSentences } from '../lib/followRead'
import { saveFollowReadScore } from '../lib/followReadScore'
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
  // v1.89 W83-C: 跟读模式
  const [followMode, setFollowMode] = useState(false)
  const [currentSentence, setCurrentSentence] = useState(0)
  // v1.92 W86-A: 跟读评分 (STT 录音 + 评分)
  const [followTranscript, setFollowTranscript] = useState('')
  const [followScore, setFollowScore] = useState<{ score: number; missing: string[]; extra: string[]; wrong: { target: string; got: string }[] } | null>(null)
  const sttRef = useRef<STTController | null>(null)
  const [listening, setListening] = useState(false)
  const [sttSupported, setSttSupported] = useState(false)
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

  // v1.92 W86-A: 组件卸载时停录音 + 检 STT 支持
  useEffect(() => {
    setSttSupported(isSTTSupported())
    return () => {
      sttRef.current?.stop()
    }
  }, [])

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
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <TTSButton text={lesson.body} />
          <span className="text-xs opacity-80">点击朗读全文</span>
          {/* v1.89 W83-C: 跟读模式 toggle */}
          <button
            onClick={() => {
              const newMode = !followMode
              setFollowMode(newMode)
              setCurrentSentence(0)
              if (newMode) {
                // 立即播放第一句
                const sentences = lesson.body.split(/[.!?]+\s+/).filter(Boolean)
                if (sentences[0]) speak({ text: sentences[0], rate: 0.8 })
              }
            }}
            className={`px-2 py-1 rounded text-xs font-medium ${
              followMode
                ? 'bg-amber-400 text-stone-900'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            {followMode ? '🎤 跟读中' : '🎤 跟读模式'}
          </button>
          <Link
            to="/follow-read/progress"
            className="px-2 py-1 rounded text-xs font-medium bg-white/20 text-white hover:bg-white/30"
            title="查看跟读趋势"
          >
            📊 趋势
          </Link>
        </div>
      </div>

      {/* 正文 (含高亮词汇) */}
      <div className="card">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <span>📄</span>
          <span>正文</span>
          {followMode && (() => {
            const sentences = splitSentences(lesson.body)
            const currentText = sentences[currentSentence] || ''
            return (
              <span className="ml-auto flex items-center gap-1 text-xs flex-wrap">
                <button
                  onClick={() => {
                    const next = Math.max(0, currentSentence - 1)
                    setCurrentSentence(next)
                    setFollowTranscript('')
                    setFollowScore(null)
                    if (sentences[next]) speak({ text: sentences[next], rate: 0.8 })
                  }}
                  className="px-2 py-1 bg-stone-100 dark:bg-stone-700 rounded text-xs"
                >← 上句</button>
                <span className="text-stone-500">{currentSentence + 1} / {sentences.length}</span>
                <button
                  onClick={() => {
                    const next = Math.min(sentences.length - 1, currentSentence + 1)
                    setCurrentSentence(next)
                    setFollowTranscript('')
                    setFollowScore(null)
                    if (sentences[next]) speak({ text: sentences[next], rate: 0.8 })
                  }}
                  className="px-2 py-1 bg-stone-100 dark:bg-stone-700 rounded text-xs"
                >下句 →</button>
              </span>
            )
          })()}
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

      {/* v1.92 W86-A: 跟读评分区 */}
      {followMode && (() => {
        const sentences = splitSentences(lesson.body)
        const currentText = sentences[currentSentence] || ''
        return (
          <div className="card bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span>🎤</span>
              <span>跟读当前句 ({currentSentence + 1}/{sentences.length})</span>
            </h3>
            <div className="bg-white dark:bg-stone-800 rounded-lg p-3 mb-3 text-base font-mono leading-relaxed">
              {currentText}
            </div>
            {/* 录音 + 评分 */}
            <div className="space-y-2">
              {!followScore && (
                <>
                  <div className="flex items-center gap-2">
                    {!listening ? (
                      <button
                        onClick={() => {
                          if (!sttSupported) {
                            toast.warning('浏览器不支持语音识别, 请在下方输入')
                            return
                          }
                          setListening(true)
                          sttRef.current = new STTController({
                            onResult: (text, isFinal) => {
                              setFollowTranscript(text)
                              if (isFinal) {
                                setListening(false)
                              }
                            },
                            onError: (err) => {
                              setListening(false)
                              toast.error(`录音错误: ${err}`)
                            },
                            onEnd: () => setListening(false),
                          })
                          sttRef.current.start({ lang: 'en-US' })
                        }}
                        className="px-3 py-1.5 bg-rose-500 text-white rounded text-sm font-medium hover:bg-rose-600"
                      >
                        🎤 开始录音
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          sttRef.current?.stop()
                          setListening(false)
                        }}
                        className="px-3 py-1.5 bg-stone-500 text-white rounded text-sm font-medium"
                      >
                        ⏹ 停止
                      </button>
                    )}
                  </div>
                  <textarea
                    value={followTranscript}
                    onChange={e => setFollowTranscript(e.target.value)}
                    placeholder="或在此输入跟读内容..."
                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded bg-white dark:bg-stone-900 text-sm"
                    rows={2}
                  />
                  <button
                    onClick={() => {
                      if (!followTranscript.trim()) return
                      const result = evaluateFollowRead(currentText, followTranscript)
                      setFollowScore({
                        score: result.score,
                        missing: result.missing,
                        extra: result.extra,
                        wrong: result.wrong,
                      })
                      // v1.94 W88-A: 保存跟读分数到趋势
                      saveFollowReadScore({
                        lessonId: lesson.id,
                        sentenceIndex: currentSentence,
                        score: result.score,
                        ts: Date.now(),
                      })
                      if (result.score < 100) {
                        saveDictationError({
                          wordId: lesson.id,
                          difficulty: 'medium',
                          source: 'follow-read',
                          transcript: followTranscript,
                          target: currentText,
                          score: result.score,
                        }).catch(e => console.error('[FollowRead] save:', e))
                      }
                    }}
                    disabled={!followTranscript.trim()}
                    className="w-full px-3 py-2 bg-emerald-500 text-white rounded text-sm font-medium hover:bg-emerald-600 disabled:opacity-50"
                  >
                    评分
                  </button>
                </>
              )}
              {followScore && (
                <div className="bg-white dark:bg-stone-800 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-stone-500">得分</span>
                    <span className={`text-2xl font-bold ${
                      followScore.score === 100 ? 'text-emerald-500' :
                      followScore.score >= 50 ? 'text-amber-500' : 'text-rose-500'
                    }`}>
                      {followScore.score}
                    </span>
                  </div>
                  {followScore.missing.length > 0 && (
                    <div className="text-xs text-rose-500">漏: {followScore.missing.join(', ')}</div>
                  )}
                  {followScore.extra.length > 0 && (
                    <div className="text-xs text-amber-500">多: {followScore.extra.join(', ')}</div>
                  )}
                  <button
                    onClick={() => {
                      setFollowScore(null)
                      setFollowTranscript('')
                    }}
                    className="w-full px-3 py-1.5 bg-brand-500 text-white rounded text-sm"
                  >
                    再读一次
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })()}

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
