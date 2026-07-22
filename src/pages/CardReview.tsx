// 卡片复习 - Anki 风格翻卡 + SM-2 4 档评级
// 跟 ReviewCenter 互补:ReviewCenter 是批量认识/不认识(快速模式),
// CardReview 是单卡翻面 + 4 档精细评级(SM-2 标准算法)
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDueReviews, getAllReviews, getAllFavorites, reviewWord, logAction } from '../lib/db'
import { loadWords } from '../lib/words'
import type { Word, ReviewItem } from '../types'
import TTSButton from '../components/TTSButton'

// SM-2 质量分(评级 -> quality)
const QUALITY_MAP = {
  again: 1,  // 完全不会:1 分钟后再次出现
  hard: 3,   // 困难:SM-2 标准,正确但吃力
  good: 4,   // 正常
  easy: 5,   // 完美:间隔拉长
} as const

type Rating = keyof typeof QUALITY_MAP

interface ReviewWord {
  word: Word
  // 是否到期(影响排序优先级,不强制 queue 顺序)
  isDue: boolean
}

export default function CardReview() {
  const navigate = useNavigate()
  const [queue, setQueue] = useState<ReviewWord[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [sessionDone, setSessionDone] = useState(false)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pendingDueCount, setPendingDueCount] = useState(0)  // 本次到期的总数
  const [ratings, setRatings] = useState<Record<Rating, number>>({
    again: 0, hard: 0, good: 0, easy: 0,
  })

  // 初始化:从生词本 + 复习计划拼装本次复习队列
  useEffect(() => {
    loadQueue()
  }, [])

  async function loadQueue() {
    setLoading(true)
    const [favs, due, allReviews] = await Promise.all([
      getAllFavorites(),
      getDueReviews(),
      getAllReviews(),
    ])

    // 过滤掉非单词 ID
    const favIds = favs
      .filter(f => !f.wordId.startsWith('daily-') && !f.wordId.startsWith('scene:'))
      .map(f => f.wordId)

    // 已加入 SM-2 复习计划的 wordId 集合(便于区分 due / 未复习)
    const dueSet = new Set(due.map((r: ReviewItem) => r.wordId))

    // 一次加载词库,内存中过滤
    const allWords = await loadWords()
    const wordMap = new Map<string, Word>()
    for (const w of allWords) wordMap.set(w.id, w)

    // 拼装队列:due 优先,再按收藏时间倒序(新加的生词在前)
    const list: ReviewWord[] = []
    const seen = new Set<string>()

    // 1) 到期词(优先级最高)
    for (const r of due) {
      const w = wordMap.get(r.wordId)
      if (w && favIds.includes(r.wordId)) {
        list.push({ word: w, isDue: true })
        seen.add(r.wordId)
      }
    }
    // 2) 收藏但未加入 SM-2 复习计划的词
    for (const id of favIds) {
      if (seen.has(id)) continue
      const w = wordMap.get(id)
      if (w) {
        // 注意:已加入复习但未到期(allReviews 里有但 dueSet 没有)也排到队尾
        const isInPlan = allReviews.some((r: ReviewItem) => r.wordId === id)
        list.push({ word: w, isDue: false })
        // 标记:未到期词放到队尾
        if (isInPlan) {
          list[list.length - 1].isDue = false
        }
        seen.add(id)
      }
    }

    // 排序:due 优先,然后是未进入复习计划的(让用户优先建立首次复习记录)
    list.sort((a, b) => {
      if (a.isDue && !b.isDue) return -1
      if (!a.isDue && b.isDue) return 1
      return 0
    })

    setQueue(list)
    setPendingDueCount(list.filter(x => x.isDue).length)
    setLoading(false)
  }

  // 翻下一张
  const advance = useCallback(() => {
    setFlipped(false)
    if (currentIndex + 1 >= queue.length) {
      setSessionDone(true)
    } else {
      setCurrentIndex(i => i + 1)
    }
  }, [currentIndex, queue.length])

  // 评级
  const rate = useCallback(async (r: Rating) => {
    const item = queue[currentIndex]
    if (!item) return
    const quality = QUALITY_MAP[r]
    await reviewWord(item.word.id, quality)
    await logAction(item.word.id, quality >= 3 ? 'known' : 'unknown')
    setRatings(prev => ({ ...prev, [r]: prev[r] + 1 }))
    setReviewedCount(c => c + 1)
    advance()
  }, [queue, currentIndex, advance])

  // 键盘支持:空格/Enter 翻卡,1-4 评级,Esc 退出
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 输入框里不抢键
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'Escape') {
        navigate(-1)
        return
      }
      if (sessionDone) return

      if (!flipped && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        setFlipped(true)
        return
      }
      if (flipped) {
        if (e.key === '1') { e.preventDefault(); rate('again') }
        else if (e.key === '2') { e.preventDefault(); rate('hard') }
        else if (e.key === '3') { e.preventDefault(); rate('good') }
        else if (e.key === '4') { e.preventDefault(); rate('easy') }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flipped, sessionDone, rate, navigate])

  // 加载中
  if (loading) {
    return (
      <div className="text-center py-20 text-stone-500 dark:text-stone-400">
        <div className="text-4xl mb-3">⏳</div>
        正在准备卡片...
      </div>
    )
  }

  // 空状态:没收藏任何词
  if (queue.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🎴</div>
        <h2 className="text-xl font-bold mb-2">还没有可复习的卡片</h2>
        <p className="text-stone-500 dark:text-stone-400 text-sm mb-6">
          先去收藏一些单词,然后回来翻卡复习
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

  // 完成页
  if (sessionDone) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2">复习完成!</h2>
        <p className="text-stone-500 dark:text-stone-400 mb-6">
          今日 {reviewedCount} 个 · 累计卡片 {queue.length} 个
        </p>

        {/* 评级分布 */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <RatingStat label="Again" value={ratings.again} color="text-red-600" bg="bg-red-50 dark:bg-red-900/20" />
          <RatingStat label="Hard" value={ratings.hard} color="text-orange-600" bg="bg-orange-50 dark:bg-orange-900/20" />
          <RatingStat label="Good" value={ratings.good} color="text-green-600" bg="bg-green-50 dark:bg-green-900/20" />
          <RatingStat label="Easy" value={ratings.easy} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" />
        </div>

        <div className="space-y-2">
          <button onClick={() => navigate('/notebook')} className="btn-primary w-full">
            返回生词本
          </button>
          <button onClick={() => navigate('/')} className="btn-ghost w-full">
            回到首页
          </button>
        </div>
      </div>
    )
  }

  const current = queue[currentIndex]
  const word = current.word
  // 进度按 currentIndex+1(答完一题就跳到下一个位置)
  const progress = ((currentIndex + 1) / queue.length) * 100

  return (
    <div className="space-y-4">
      {/* 顶部:进度 + 退出 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate(-1)} className="btn-ghost text-sm" aria-label="退出复习">
            ← 退出
          </button>
          <span className="text-sm text-stone-500 dark:text-stone-400">
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

      {/* 卡片区(3D 翻转动效) */}
      <div
        className="card-container relative w-full"
        style={{ minHeight: '320px' }}
        onClick={() => setFlipped(f => !f)}
        role="button"
        tabIndex={0}
        aria-label={flipped ? '点击翻回正面' : '点击翻到背面'}
      >
        <div className={`card-inner ${flipped ? 'flipped' : ''}`}>
          {/* 正面:单词 + 音标 + TTS */}
          <div className="card-face card-front">
            <div className="flex items-center gap-2 justify-center mb-3 min-h-[28px]">
              {word.pos.slice(0, 2).map(p => (
                <span key={p} className="text-xs px-2 py-0.5 bg-stone-100 dark:bg-stone-700 rounded">
                  {p}
                </span>
              ))}
            </div>
            <h1 className="text-5xl font-bold mb-3 tracking-wide text-center break-words">
              {word.word}
            </h1>
            <p className="text-stone-500 dark:text-stone-400 text-center mb-6">
              {word.phonetic || (word.phonetic_us ?? '')}
            </p>
            <div className="flex justify-center mb-6">
              <TTSButton text={word.word} size="lg" />
            </div>
            <p className="text-stone-400 dark:text-stone-300 text-sm text-center">
              {flipped ? '显示答案中...' : '点击卡片或按空格查看释义'}
            </p>
          </div>

          {/* 反面:释义 + 例句 + TTS */}
          <div className="card-face card-back">
            <h2 className="text-3xl font-bold mb-2 text-center">{word.word}</h2>
            <p className="text-stone-500 dark:text-stone-400 text-center mb-4 text-sm">
              {word.phonetic || (word.phonetic_us ?? '')}
            </p>

            <div className="text-xl text-stone-800 dark:text-stone-200 mb-4 text-center">
              {word.translations[0]}
              {word.translations.length > 1 && (
                <span className="text-stone-500 dark:text-stone-400 text-sm block mt-1">
                  {word.translations.slice(1).join(' · ')}
                </span>
              )}
            </div>

            {word.examples[0] && (
              <div className="border-l-2 border-brand-300 dark:border-brand-700 pl-3 mb-4 text-left">
                <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                  {word.examples[0].en}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  {word.examples[0].zh}
                </p>
              </div>
            )}

            <div className="flex justify-center mt-4">
              <TTSButton text={word.examples[0]?.en || word.word} size="md" />
            </div>
          </div>
        </div>
      </div>

      {/* 底部:4 档评级按钮(仅 flipped 显示)或 翻卡提示 */}
      {flipped ? (
        <div className="grid grid-cols-4 gap-2">
          <RatingButton
            rating="again" label="Again" hint="1 分钟后"
            color="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
            onClick={() => rate('again')}
            kbd="1"
          />
          <RatingButton
            rating="hard" label="Hard" hint="困难"
            color="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50"
            onClick={() => rate('hard')}
            kbd="2"
          />
          <RatingButton
            rating="good" label="Good" hint="记得"
            color="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
            onClick={() => rate('good')}
            kbd="3"
          />
          <RatingButton
            rating="easy" label="Easy" hint="轻松"
            color="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50"
            onClick={() => rate('easy')}
            kbd="4"
          />
        </div>
      ) : (
        <button
          onClick={() => setFlipped(true)}
          className="btn-primary w-full py-4"
        >
          翻卡 · 空格
        </button>
      )}

      {/* 统计:本次复习 / 待复习 */}
      <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 px-1 pt-1">
        <span>本次复习 {reviewedCount} 个</span>
        <span>待复习 {pendingDueCount} 个</span>
      </div>
    </div>
  )
}

// 评级按钮(显示 label + 键盘提示 + hint)
function RatingButton({
  label, hint, color, onClick, kbd,
}: {
  rating: Rating
  label: string
  hint: string
  color: string
  onClick: () => void
  kbd: string
}) {
  return (
    <button
      onClick={onClick}
      className={`${color} rounded-xl py-3 px-2 transition-all active:scale-95 flex flex-col items-center justify-center`}
    >
      <div className="text-sm font-semibold">{label}</div>
      <div className="text-[10px] opacity-70 mt-0.5">{hint}</div>
      <kbd className="text-[10px] mt-1 px-1.5 py-0.5 rounded bg-white/50 dark:bg-black/20 font-mono">{kbd}</kbd>
    </button>
  )
}

// 完成页评级统计
function RatingStat({
  label, value, color, bg,
}: {
  label: string
  value: number
  color: string
  bg: string
}) {
  return (
    <div className={`${bg} rounded-xl p-3 text-center`}>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">{label}</div>
    </div>
  )
}
