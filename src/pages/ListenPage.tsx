// 听力模式 - v0.26
// 5 篇精选短文 + TTS 播放 + 挖空听写 + 错词入生词本
import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { LISTENING_LESSONS, type ListeningLesson } from '../data/listening'
import { speak } from '../lib/tts'
import { addFavorite } from '../lib/db'
import { loadWords } from '../lib/words'

type Mode = 'overview' | 'lesson' | 'dictation' | 'questions' | 'result'

export default function ListenPage() {
  const [mode, setMode] = useState<Mode>('overview')
  const [currentLesson, setCurrentLesson] = useState<ListeningLesson | null>(null)
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set())
  useEffect(() => {
    const completed = JSON.parse(localStorage.getItem('listening-completed') || '[]')
    setCompletedLessons(new Set(completed))
  }, [])

  const startLesson = (lesson: ListeningLesson) => {
    setCurrentLesson(lesson)
    setMode('lesson')
  }

  const handleComplete = (id: string) => {
    const newSet = new Set([...completedLessons, id])
    setCompletedLessons(newSet)
    localStorage.setItem('listening-completed', JSON.stringify([...newSet]))
  }

  const backToOverview = () => {
    setCurrentLesson(null)
    setMode('overview')
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold mb-1">🎧 听力模式</h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm">
          5 篇真实场景短文 · TTS 播放 · 挖空听写 · 错词入生词本
        </p>
      </div>

      {mode === 'overview' && (
        <LessonList
          lessons={LISTENING_LESSONS}
          completed={completedLessons}
          onStart={startLesson}
        />
      )}

      {mode === 'lesson' && currentLesson && (
        <LessonView
          lesson={currentLesson}
          onNext={() => setMode('dictation')}
          onBack={backToOverview}
        />
      )}

      {mode === 'dictation' && currentLesson && (
        <DictationMode
          lesson={currentLesson}
          onComplete={() => {
            handleComplete(currentLesson.id)
            setMode('questions')
          }}
          onBack={() => setMode('lesson')}
        />
      )}

      {mode === 'questions' && currentLesson && (
        <QuestionsMode
          lesson={currentLesson}
          onNext={() => setMode('result')}
          onBack={() => setMode('dictation')}
        />
      )}

      {mode === 'result' && currentLesson && (
        <ResultMode
          lesson={currentLesson}
          onRestart={() => startLesson(currentLesson)}
          onBackToOverview={backToOverview}
        />
      )}
    </div>
  )
}

function LessonList({
  lessons, completed, onStart,
}: {
  lessons: ListeningLesson[]
  completed: Set<string>
  onStart: (l: ListeningLesson) => void
}) {
  return (
    <div className="space-y-2">
      {lessons.map(lesson => {
        const isDone = completed.has(lesson.id)
        return (
          <button
            key={lesson.id}
            onClick={() => onStart(lesson)}
            className="card hover:shadow-md active:scale-[0.98] transition-all w-full text-left"
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl">
                {lesson.scene === 'cafe' && '☕'}
                {lesson.scene === 'airport' && '✈️'}
                {lesson.scene === 'hotel' && '🏨'}
                {lesson.scene === 'shopping' && '🛍️'}
                {lesson.scene === 'work' && '💼'}
              </div>
              <div className="flex-1">
                <div className="font-medium flex items-center gap-2">
                  {lesson.title}
                  {isDone && <span className="text-emerald-500 text-sm">✓ 已完成</span>}
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  {lesson.level} · {lesson.text.split(/\s+/).length} 词 · {lesson.blanks.length} 个空 · {lesson.questions.length} 题
                </div>
              </div>
              <div className="text-stone-400">→</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function LessonView({
  lesson, onNext, onBack,
}: {
  lesson: ListeningLesson
  onNext: () => void
  onBack: () => void
}) {
  const [playing, setPlaying] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showText, setShowText] = useState(false)

  const handlePlay = async () => {
    if (playing) return
    setPlaying(true)
    try {
      await speak({ text: lesson.text, rate: playbackRate })
    } catch (e) {
      console.error('TTS 失败:', e)
    } finally {
      setPlaying(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="btn-ghost">← 返回</button>
        <span className="text-sm text-stone-500">{lesson.level} · {lesson.title}</span>
      </div>

      <div className="card text-center">
        <div className="text-5xl mb-3">🎧</div>
        <h3 className="text-lg font-semibold mb-2">完整听一遍</h3>
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
          听完后进入听写模式,挖空 5-6 个关键词
        </p>

        <div className="flex items-center justify-center gap-2 mb-3">
          <label className="text-sm">语速:</label>
          <select
            value={playbackRate}
            onChange={(e) => setPlaybackRate(Number(e.target.value))}
            className="input text-sm py-1"
          >
            <option value={0.7}>0.7x 慢速</option>
            <option value={0.85}>0.85x 稍慢</option>
            <option value={1}>1x 正常</option>
            <option value={1.2}>1.2x 快速</option>
          </select>
        </div>

        <button
          onClick={handlePlay}
          disabled={playing}
          className="btn-primary text-lg px-6 py-3 disabled:opacity-50"
        >
          {playing ? '🔊 播放中...' : '▶️ 播放整篇'}
        </button>

        <button
          onClick={() => setShowText(!showText)}
          className="block mx-auto mt-3 text-xs text-stone-500 hover:text-brand-600 underline"
        >
          {showText ? '隐藏原文' : '查看原文(剧透)'}
        </button>

        {showText && (
          <div className="mt-4 p-3 bg-stone-50 dark:bg-stone-800/50 rounded text-left text-sm leading-relaxed">
            {lesson.text}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold mb-2">📚 关键词汇</h3>
        <div className="grid grid-cols-2 gap-2">
          {lesson.vocabulary.map(v => (
            <div key={v.word} className="text-sm p-2 bg-stone-50 dark:bg-stone-800/50 rounded">
              <div className="font-mono font-medium">{v.word}</div>
              <div className="text-xs text-stone-500 mt-0.5">{v.meaning}</div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={onNext} className="btn-primary w-full">
        下一关:挖空听写 →
      </button>
    </div>
  )
}

function DictationMode({
  lesson, onComplete, onBack,
}: {
  lesson: ListeningLesson
  onComplete: () => void
  onBack: () => void
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [addedWords, setAddedWords] = useState<Set<string>>(new Set())

  // 把 text 按 blanks 切分
  const [segments, setSegments] = useState<(string | number)[]>([])
  useEffect(() => {
    const segs: (string | number)[] = []
    let remaining = lesson.text
    for (const blank of lesson.blanks) {
      const pos = remaining.toLowerCase().indexOf(blank.answer.toLowerCase())
      if (pos >= 0) {
        segs.push(remaining.slice(0, pos))
        segs.push(blank.index)  // 占位
        remaining = remaining.slice(pos + blank.answer.length)
      } else {
        console.warn('blank answer not found:', blank.answer)
      }
    }
    segs.push(remaining)
    setSegments(segs)
  }, [lesson])

  const handlePlay = async () => {
    setPlaying(true)
    try {
      await speak({ text: lesson.text, rate: 1 })
    } catch (e) {
      console.error(e)
    } finally {
      setPlaying(false)
    }
  }

  const handlePlayBlank = async (blankIndex: number) => {
    const blank = lesson.blanks.find(b => b.index === blankIndex)
    if (!blank) return
    setPlaying(true)
    try {
      await speak({ text: blank.answer, rate: 0.8 })
    } catch (e) {
      console.error(e)
    } finally {
      setPlaying(false)
    }
  }

  const handleSubmit = () => {
    setSubmitted(true)
  }

  const handleAddToFav = async (word: string) => {
    if (addedWords.has(word.toLowerCase())) return
    const allWords = await loadWords()
    const found = allWords.find(w => w.word.toLowerCase() === word.toLowerCase())
    if (found) {
      await addFavorite(found.id)
      setAddedWords(prev => new Set(prev).add(word.toLowerCase()))
    }
  }

  const isCorrect = (blankIndex: number) => {
    const blank = lesson.blanks.find(b => b.index === blankIndex)
    if (!blank) return false
    const userAns = (answers[blankIndex] || '').trim().toLowerCase()
    return userAns === blank.answer.toLowerCase()
  }

  const correctCount = lesson.blanks.filter(b => isCorrect(b.index)).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="btn-ghost">← 返回</button>
        <span className="text-sm text-stone-500">
          {submitted ? `${correctCount}/${lesson.blanks.length} 正确` : `听写中`}
        </span>
      </div>

      <div className="card text-center">
        <button
          onClick={handlePlay}
          disabled={playing}
          className="btn-primary text-lg px-6 py-3 disabled:opacity-50"
        >
          {playing ? '🔊 播放中...' : '▶️ 听全文'}
        </button>
        <p className="text-xs text-stone-500 mt-2">
          可重复听 · 提交前会显示答案
        </p>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold mb-3">✍️ 听写填空</h3>
        <div className="text-sm leading-loose">
          {segments.map((seg, i) => {
            if (typeof seg === 'number') {
              const blank = lesson.blanks.find(b => b.index === seg)!
              const userAns = answers[seg] || ''
              const correct = submitted && isCorrect(seg)
              const wrong = submitted && !isCorrect(seg) && userAns
              return (
                <span key={i} className="inline-block mx-1">
                  <input
                    type="text"
                    value={userAns}
                    onChange={(e) => !submitted && setAnswers(prev => ({ ...prev, [seg]: e.target.value }))}
                    disabled={submitted}
                    placeholder={`空 ${seg}`}
                    className={`w-32 px-2 py-1 rounded border text-sm ${
                      correct
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : wrong
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-stone-300 dark:border-stone-600'
                    }`}
                  />
                  {submitted && !correct && (
                    <span className="ml-1 text-emerald-600 dark:text-emerald-400 text-xs">
                      ({blank.answer})
                    </span>
                  )}
                  {submitted && (
                    <button
                      onClick={() => handleAddToFav(blank.answer)}
                      disabled={addedWords.has(blank.answer.toLowerCase())}
                      className="ml-1 text-xs text-amber-500 hover:underline disabled:opacity-50"
                    >
                      {addedWords.has(blank.answer.toLowerCase()) ? '✓' : '⭐'}
                    </button>
                  )}
                </span>
              )
            }
            return <span key={i}>{seg}</span>
          })}
        </div>
      </div>

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={Object.keys(answers).length === 0}
          className="btn-primary w-full disabled:opacity-50"
        >
          提交答案
        </button>
      ) : (
        <button onClick={onComplete} className="btn-primary w-full">
          下一关:理解题 →
        </button>
      )}
    </div>
  )
}

function QuestionsMode({
  lesson, onNext, onBack,
}: {
  lesson: ListeningLesson
  onNext: () => void
  onBack: () => void
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [playing, setPlaying] = useState(false)

  const handlePlay = async () => {
    setPlaying(true)
    try {
      await speak({ text: lesson.text, rate: 1 })
    } catch (e) {
      console.error(e)
    } finally {
      setPlaying(false)
    }
  }

  const correctCount = lesson.questions.filter(
    (q, i) => answers[i] === q.answer,
  ).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="btn-ghost">← 返回</button>
        <span className="text-sm text-stone-500">
          {submitted ? `${correctCount}/${lesson.questions.length} 正确` : `理解题`}
        </span>
      </div>

      <div className="card text-center">
        <button
          onClick={handlePlay}
          disabled={playing}
          className="btn-primary disabled:opacity-50"
        >
          {playing ? '🔊 播放中...' : '🔊 再听一遍'}
        </button>
      </div>

      <div className="space-y-3">
        {lesson.questions.map((q, i) => (
          <div key={i} className="card">
            <div className="text-sm font-medium mb-2">
              {i + 1}. {q.q}
            </div>
            <div className="space-y-1">
              {q.options.map((opt, oi) => {
                const isSelected = answers[i] === oi
                const isCorrect = submitted && oi === q.answer
                const isWrong = submitted && isSelected && oi !== q.answer
                return (
                  <button
                    key={oi}
                    onClick={() => !submitted && setAnswers(prev => ({ ...prev, [i]: oi }))}
                    disabled={submitted}
                    className={`w-full text-left text-sm p-2 rounded border ${
                      isCorrect
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : isWrong
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : isSelected
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                        : 'border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    {String.fromCharCode(65 + oi)}. {opt}
                  </button>
                )
              })}
            </div>
            {submitted && (
              <div className="text-xs text-stone-500 mt-2">
                正确答案: {String.fromCharCode(65 + q.answer)}
              </div>
            )}
          </div>
        ))}
      </div>

      {!submitted ? (
        <button
          onClick={() => setSubmitted(true)}
          disabled={Object.keys(answers).length === 0}
          className="btn-primary w-full disabled:opacity-50"
        >
          提交答案
        </button>
      ) : (
        <button onClick={onNext} className="btn-primary w-full">
          查看结果 →
        </button>
      )}
    </div>
  )
}

function ResultMode({
  lesson, onRestart, onBackToOverview,
}: {
  lesson: ListeningLesson
  onRestart: () => void
  onBackToOverview: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="card text-center py-8">
        <div className="text-5xl mb-3">🎉</div>
        <h3 className="text-lg font-semibold mb-2">完成!</h3>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {lesson.title} 已加入已完成列表
        </p>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold mb-2">📚 关键短语回顾</h3>
        <div className="grid grid-cols-2 gap-2">
          {lesson.vocabulary.map(v => (
            <div key={v.word} className="text-sm p-2 bg-stone-50 dark:bg-stone-800/50 rounded">
              <div className="font-mono font-medium">{v.word}</div>
              <div className="text-xs text-stone-500 mt-0.5">{v.meaning}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onRestart} className="btn-ghost flex-1">
          🔁 再来一遍
        </button>
        <button onClick={onBackToOverview} className="btn-primary flex-1">
          📋 选其他
        </button>
      </div>
    </div>
  )
}
