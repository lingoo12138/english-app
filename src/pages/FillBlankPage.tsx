// FillBlankPage.tsx - v1.85.0 C 填空练习
// 短句 4 选 1, 长句输入; 完成后显示分数 + 错题解析
import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { loadWords } from '../lib/words'
import { generateQuestions, checkAnswer, tokenize, type Question } from '../lib/fillblank'
import { addFavorite } from '../lib/db'
import { toast } from '../components/Toast'
import type { Word } from '../types'

type Phase = 'idle' | 'running' | 'finished'

interface AnswerRecord {
  questionId: string
  wordId: string
  word: string
  blankIndex: number
  userAnswer: string
  correctAnswer: string
  hint: string
  isCorrect: boolean
}

export default function FillBlankPage() {
  const [words, setWords] = useState<Word[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [phase, setPhase] = useState<Phase>('idle')
  const [loading, setLoading] = useState(true)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Map<string, string[]>>(new Map())  // qid -> [user answers per blank]
  const [showHint, setShowHint] = useState<Set<string>>(new Set())  // qid-blankIdx
  const [submitted, setSubmitted] = useState<Set<string>>(new Set())  // qid 已提交
  const [finalRecords, setFinalRecords] = useState<AnswerRecord[]>([])
  const [level, setLevel] = useState<'all' | Word['level']>('all')
  const [count, setCount] = useState(20)
  const [addedFavorites, setAddedFavorites] = useState<Set<string>>(new Set())

  // 初始加载词库
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadWords()
      .then(w => { if (!cancelled) setWords(w) })
      .catch((e: unknown) => {
        const err = e instanceof Error ? e : new Error(String(e))
        console.error('[FillBlankPage] loadWords failed:', err)
        toast.error(`词库加载失败: ${err.message || '未知错误'}`)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // 开始练习
  const handleStart = useCallback(() => {
    if (words.length === 0) {
      toast.error('词库为空, 无法生成题目')
      return
    }
    // 用固定 seed 避免每次重洗, 便于复现
    let seed = Date.now()
    const rng = () => {
      const x = Math.sin(seed++) * 10000
      return x - Math.floor(x)
    }
    const qs = generateQuestions(words, count, { level, shortRatio: 0.5 }, rng)
    if (qs.length === 0) {
      toast.error('无可用题目, 请调整难度或减少题数')
      return
    }
    setQuestions(qs)
    setAnswers(new Map())
    setShowHint(new Set())
    setSubmitted(new Set())
    setFinalRecords([])
    setCurrentIdx(0)
    setPhase('running')
  }, [words, count, level])

  const currentQ = questions[currentIdx]

  /** 提交当前题 */
  const handleSubmit = useCallback(() => {
    if (!currentQ) return
    const userAns = answers.get(currentQ.id) || []
    const records: AnswerRecord[] = []
    for (let i = 0; i < currentQ.blanks.length; i++) {
      const b = currentQ.blanks[i]
      const userA = userAns[i] || ''
      records.push({
        questionId: currentQ.id,
        wordId: currentQ.wordId,
        word: currentQ.word,
        blankIndex: i,
        userAnswer: userA,
        correctAnswer: b.answer,
        hint: b.hint,
        isCorrect: checkAnswer(b, userA),
      })
    }
    setFinalRecords(prev => [...prev, ...records])
    setSubmitted(prev => new Set(prev).add(currentQ.id))
  }, [currentQ, answers])

  /** 进入下一题 */
  const handleNext = useCallback(() => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(i => i + 1)
    } else {
      // 完成
      setPhase('finished')
    }
  }, [currentIdx, questions.length])

  /** 更新单空答案 */
  const updateAnswer = (qid: string, blankIdx: number, value: string) => {
    setAnswers(prev => {
      const next = new Map(prev)
      const arr = [...(next.get(qid) || [])]
      arr[blankIdx] = value
      next.set(qid, arr)
      return next
    })
  }

  /** 选 option (4 选 1) */
  const chooseOption = (qid: string, blankIdx: number, option: string) => {
    updateAnswer(qid, blankIdx, option)
    // 选错立刻显示 hint
    const q = questions.find(x => x.id === qid)
    if (!q) return
    const blank = q.blanks[blankIdx]
    if (!checkAnswer(blank, option)) {
      setShowHint(prev => new Set(prev).add(`${qid}-${blankIdx}`))
    }
  }

  /** 错题加入 favorites */
  const handleAddFav = async (wordId: string) => {
    if (addedFavorites.has(wordId)) return
    try {
      await addFavorite(wordId)
      setAddedFavorites(prev => new Set(prev).add(wordId))
      toast.success('已加入生词本')
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e))
      toast.error(`加入失败: ${err.message || '未知错误'}`)
    }
  }

  /** 错题批量加 */
  const handleAddAllWrong = async () => {
    const wrongIds = new Set<string>()
    for (const r of finalRecords) {
      if (!r.isCorrect) wrongIds.add(r.wordId)
    }
    let added = 0
    for (const id of wrongIds) {
      if (!addedFavorites.has(id)) {
        await addFavorite(id)
        setAddedFavorites(prev => new Set(prev).add(id))
        added++
      }
    }
    if (added > 0) {
      toast.success(`已加入 ${added} 个错词到生词本`)
    } else {
      toast.info('所有错词已加入生词本')
    }
  }

  const stats = useMemo(() => {
    const total = finalRecords.length
    const correct = finalRecords.filter(r => r.isCorrect).length
    const wrong = total - correct
    return { total, correct, wrong, accuracy: total > 0 ? Math.round((correct / total) * 100) : 0 }
  }, [finalRecords])

  // ===== 渲染 =====
  if (loading) {
    return <div className="text-center text-stone-500 py-10">加载中...</div>
  }

  // 1. 起始页
  if (phase === 'idle') {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">📝 填空练习</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm">
            从词库例句挖空, 短句 4 选 1, 长句输入/拖拽
          </p>
        </div>
        <div className="card space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">难度</label>
            <select
              value={level}
              onChange={e => setLevel(e.target.value as 'all' | Word['level'])}
              className="input"
            >
              <option value="all">全部</option>
              <option value="primary">小学</option>
              <option value="junior">初中</option>
              <option value="senior">高中</option>
              <option value="gaozhong">高考</option>
              <option value="cet4">CET-4</option>
              <option value="cet6">CET-6</option>
              <option value="kaoyan">考研</option>
              <option value="daily">日常</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">题数 (5-30)</label>
            <input
              type="number"
              min={5}
              max={30}
              value={count}
              onChange={e => setCount(Math.max(5, Math.min(30, Number(e.target.value) || 20)))}
              className="input"
            />
          </div>
          <button onClick={handleStart} className="btn-primary w-full">
            🚀 开始练习
          </button>
        </div>
        <div className="card text-xs text-stone-500 dark:text-stone-400 space-y-1">
          <p>💡 提示: 短句 (10-15 词) 4 选 1; 长句 (15-25 词) 输入/拖拽填空</p>
          <p>💡 挖词优先级: 高频词 &gt; 短语动词 &gt; 介词搭配</p>
        </div>
      </div>
    )
  }

  // 2. 答题中
  if (phase === 'running' && currentQ) {
    const userAns = answers.get(currentQ.id) || []
    const isSubmitted = submitted.has(currentQ.id)
    const allFilled = currentQ.blanks.every((_, i) => (userAns[i] || '').trim().length > 0)
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-stone-500 dark:text-stone-400">
            第 {currentIdx + 1} / {questions.length} 题
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800">
            {currentQ.type === 'short' ? '短句 4 选 1' : '长句 2-3 词'}
          </span>
        </div>

        <div className="card space-y-3">
          <div className="text-xs text-stone-500 dark:text-stone-400">
            来自: <span className="font-mono text-brand-600 dark:text-brand-400">{currentQ.word}</span>
            {currentQ.translation && (
              <span className="ml-2">({currentQ.translation})</span>
            )}
          </div>
          <div className="text-lg leading-relaxed text-stone-800 dark:text-stone-100">
            {renderSentenceWithBlanks(currentQ, userAns, isSubmitted, (blankIdx, value) => updateAnswer(currentQ.id, blankIdx, value))}
          </div>
          {/* 4 选 1 (仅短句) */}
          {currentQ.type === 'short' && (
            <div className="grid grid-cols-2 gap-2">
              {currentQ.blanks[0]?.options.map(opt => {
                const isPicked = userAns[0] === opt
                const isCorrect = opt === currentQ.blanks[0].answer
                const showResult = isSubmitted
                const cls = showResult
                  ? (isCorrect ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-500' : (isPicked ? 'bg-red-100 dark:bg-red-900/30 border-red-500' : 'bg-stone-50 dark:bg-stone-800 border-stone-200'))
                  : (isPicked ? 'bg-brand-100 dark:bg-brand-900/30 border-brand-500' : 'bg-white dark:bg-stone-800 border-stone-200 hover:border-brand-300')
                return (
                  <button
                    key={opt}
                    onClick={() => !isSubmitted && chooseOption(currentQ.id, 0, opt)}
                    disabled={isSubmitted}
                    className={`px-3 py-2 rounded-lg border-2 text-sm transition-colors ${cls} ${isSubmitted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          )}
          {/* 错题 hint */}
          {isSubmitted && currentQ.blanks.map((b, i) => {
            const hintKey = `${currentQ.id}-${i}`
            const isWrong = !checkAnswer(b, userAns[i] || '')
            if (!isWrong && !showHint.has(hintKey)) return null
            return (
              <div key={i} className="text-xs px-2 py-1.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200">
                💡 {i === 0 ? '提示' : `第 ${i + 1} 空`}: {b.hint} | 正确答案: <span className="font-mono font-bold">{b.answer}</span>
              </div>
            )
          })}
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          {!isSubmitted ? (
            <button
              onClick={handleSubmit}
              disabled={!allFilled}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              提交答案
            </button>
          ) : (
            <button onClick={handleNext} className="btn-primary flex-1">
              {currentIdx + 1 < questions.length ? '下一题 →' : '查看成绩 🎉'}
            </button>
          )}
        </div>
      </div>
    )
  }

  // 3. 完成页
  if (phase === 'finished') {
    const wrongByWord = new Map<string, AnswerRecord[]>()
    for (const r of finalRecords) {
      if (!r.isCorrect) {
        if (!wrongByWord.has(r.wordId)) wrongByWord.set(r.wordId, [])
        wrongByWord.get(r.wordId)!.push(r)
      }
    }
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">🎉 练习完成</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm">
            填空练习报告
          </p>
        </div>

        {/* 分数卡 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card text-center">
            <div className="text-3xl font-bold text-brand-600 dark:text-brand-400">
              {stats.accuracy}%
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">正确率</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.correct}
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">答对</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {stats.wrong}
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">答错</div>
          </div>
        </div>

        {/* 错题 */}
        {wrongByWord.size > 0 && (
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">❌ 错题解析 ({wrongByWord.size} 词)</h2>
              <button onClick={handleAddAllWrong} className="btn-primary text-xs px-3 py-1">
                ⭐ 全部加入生词本
              </button>
            </div>
            <div className="space-y-2">
              {[...wrongByWord.entries()].map(([wordId, records]) => {
                const first = records[0]
                return (
                  <div key={wordId} className="border-l-4 border-red-400 pl-3 py-2 bg-red-50 dark:bg-red-900/10 rounded">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-sm">{first.word}</span>
                      <button
                        onClick={() => handleAddFav(wordId)}
                        disabled={addedFavorites.has(wordId)}
                        className="text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 disabled:opacity-50"
                      >
                        {addedFavorites.has(wordId) ? '已加' : '⭐ 加生词'}
                      </button>
                    </div>
                    {records.map((r, i) => (
                      <div key={i} className="text-xs text-stone-600 dark:text-stone-400 space-y-0.5">
                        <div>你的答案: <span className="font-mono text-red-600">{r.userAnswer || '(空)'}</span> | 正确: <span className="font-mono text-emerald-600">{r.correctAnswer}</span></div>
                        {r.hint && <div>💡 提示: {r.hint}</div>}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setPhase('idle')}
            className="btn-ghost flex-1"
          >
            ← 返回设置
          </button>
          <Link to="/notebook" className="btn-ghost flex-1 text-center">
            查看生词本
          </Link>
        </div>
      </div>
    )
  }

  return null
}

/** 渲染含空白的句子: 把 ___ 替换为 input 或填空显示 */
function renderSentenceWithBlanks(
  q: Question,
  userAns: string[],
  isSubmitted: boolean,
  onChange: (idx: number, v: string) => void,
): ReactNode {
  const tokens = tokenize(q.fullSentence)
  return tokens.map((tok, i) => {
    const matchedBlank = q.blanks.find(b => b.position === i)
    if (matchedBlank) {
      const bi = q.blanks.indexOf(matchedBlank)
      const value = userAns[bi] || ''
      const isCorrect = isSubmitted && checkAnswer(matchedBlank, value)
      const isWrongSubmitted = isSubmitted && !checkAnswer(matchedBlank, value)
      if (q.type === 'long') {
        return (
          <input
            key={`b-${i}`}
            type="text"
            value={value}
            onChange={e => onChange(bi, e.target.value)}
            disabled={isSubmitted}
            className={`inline-block mx-1 px-2 py-0.5 w-24 border-b-2 text-center font-mono bg-transparent ${
              isCorrect
                ? 'border-emerald-500 text-emerald-700 dark:text-emerald-300'
                : isWrongSubmitted
                  ? 'border-red-500 text-red-700 dark:text-red-300'
                  : 'border-stone-300 dark:border-stone-600 focus:border-brand-500'
            }`}
            placeholder="___"
          />
        )
      }
      // 短句: 用 ___ 或答案展示
      return (
        <span
          key={`b-${i}`}
          className={`mx-0.5 px-2 py-0.5 rounded font-mono ${
            isCorrect
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700'
              : isWrongSubmitted
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700'
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700'
          }`}
        >
          {isSubmitted ? matchedBlank.answer : '___'}
        </span>
      )
    }
    return <span key={`t-${i}`}>{tok + ' '}</span>
  })
}
