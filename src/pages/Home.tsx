import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import TTSButton from '../components/TTSButton'
import StudyCalendar from '../components/StudyCalendar'
import { getTodaySentence } from '../lib/daily'
import { loadWords, LEVELS } from '../lib/words'
import type { Word, DailySentence } from '../types'
import { useStats, useStore } from '../store/useStore'
import { isFavorite, addFavorite, removeFavorite } from '../lib/db'
import { getDueReviews } from '../lib/db'

export default function Home() {
  const [sentence, setSentence] = useState<DailySentence | null>(null)
  const [wordOfDay, setWordOfDay] = useState<Word | null>(null)
  const [fav, setFav] = useState(false)
  const [dueReviewCount, setDueReviewCount] = useState(0)
  const stats = useStats()
  const targetLevel = useStore(s => s.targetLevel)

  useEffect(() => {
    setSentence(getTodaySentence())
    loadWords().then((words) => {
      // 修复: 每日一词用日期 + targetLevel 确定性选择(同一天同一个词)
      const filtered = targetLevel === 'all' ? words : words.filter(w => w.level === targetLevel)
      const candidates = filtered.length > 0 ? filtered : words
      const today = new Date().toISOString().slice(0, 10)  // 'YYYY-MM-DD'
      const seed = today.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
      const idx = seed % candidates.length
      setWordOfDay(candidates[idx])
    })
    // 获取待复习数量
    getDueReviews().then(reviews => setDueReviewCount(reviews.length))
  }, [targetLevel])

  useEffect(() => {
    if (wordOfDay) {
      isFavorite(wordOfDay.id).then(setFav)
    }
  }, [wordOfDay])

  const toggleFav = async () => {
    if (!wordOfDay) return
    if (fav) {
      await removeFavorite(wordOfDay.id)
      setFav(false)
    } else {
      await addFavorite(wordOfDay.id)
      setFav(true)
    }
  }

  return (
    <div className="space-y-6">
      {/* 顶部欢迎 */}
      <div>
        <h1 className="text-2xl font-bold mb-1">你好 👋</h1>
        <p className="text-stone-500 text-sm">今天来学点新东西吧</p>
      </div>

      {/* 学习数据卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <div className="text-2xl font-bold text-brand-600">{stats.todayCount}</div>
          <div className="text-xs text-stone-500 mt-1">今日学词</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-brand-600">{stats.totalLearned}</div>
          <div className="text-xs text-stone-500 mt-1">累计学词</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-brand-600">{stats.favoriteCount}</div>
          <div className="text-xs text-stone-500 mt-1">生词</div>
        </div>
      </div>

      {/* 每日一句 */}
      {sentence && (
        <Link to="/daily" className="block card bg-gradient-to-br from-brand-500 to-brand-600 text-white no-select">
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full">每日一句</span>
            <span className="text-xs opacity-80">{sentence.scene}</span>
          </div>
          <p className="text-xl font-medium mb-2 leading-relaxed">{sentence.en}</p>
          <p className="text-sm opacity-90">{sentence.zh}</p>
          <div className="mt-3 flex items-center gap-2">
            <TTSButton text={sentence.en} variant="text" />
            <span className="text-xs opacity-70">点击查看全部 →</span>
          </div>
        </Link>
      )}

      {/* 每日一词 */}
      {wordOfDay && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs px-2 py-0.5 bg-stone-100 dark:bg-stone-700 rounded-full">每日一词</span>
            <button
              onClick={toggleFav}
              className="text-xl"
            >
              {fav ? '⭐' : '☆'}
            </button>
          </div>
          <Link to={`/words/${wordOfDay.id}`} className="block">
            <div className="flex items-baseline gap-2 mb-2">
              <h2 className="text-3xl font-bold">{wordOfDay.word}</h2>
              <span className="text-sm text-stone-400">{wordOfDay.phonetic}</span>
            </div>
            <p className="text-base text-stone-700 dark:text-stone-300 mb-3">
              {wordOfDay.translations.join(' · ')}
            </p>
            <p className="text-sm text-stone-500 line-clamp-2">
              {wordOfDay.examples[0]?.en}
            </p>
          </Link>
          <div className="mt-3 flex items-center gap-2">
            <TTSButton text={wordOfDay.word} />
            <TTSButton text={wordOfDay.examples[0]?.en || ''} variant="text" />
          </div>
        </div>
      )}

      {/* 复习提醒 */}
      {dueReviewCount > 0 && (
        <Link
          to="/review"
          className="card flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 hover:shadow-md active:scale-[0.98] transition-all no-select"
        >
          <div className="text-3xl">📝</div>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900 dark:text-amber-200">
              有 {dueReviewCount} 个词该复习了
            </h3>
            <p className="text-xs text-amber-700 dark:text-amber-300">按记忆曲线,趁热打铁</p>
          </div>
          <div className="text-amber-600 dark:text-amber-400">→</div>
        </Link>
      )}

      {/* 学习日历 */}
      <div className="card">
        <StudyCalendar days={84} compact />
      </div>

      {/* 快捷入口 - 修复: 4 个一组,场景课作为独立大卡 (避免 col-span-2 破坏网格) */}
      <div>
        <h3 className="text-sm font-semibold text-stone-500 mb-3">快捷入口</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/words" className="card hover:shadow-md active:scale-[0.98] transition-all text-center py-6">
            <div className="text-3xl mb-2">📚</div>
            <div className="font-medium">浏览词库</div>
            <div className="text-xs text-stone-500 mt-1">5000+ 高频词</div>
          </Link>
          <Link to="/review" className="card hover:shadow-md active:scale-[0.98] transition-all text-center py-6">
            <div className="text-3xl mb-2">📝</div>
            <div className="font-medium">复习中心</div>
            <div className="text-xs text-stone-500 mt-1">智能间隔重复</div>
          </Link>
          <Link to="/translate" className="card hover:shadow-md active:scale-[0.98] transition-all text-center py-6">
            <div className="text-3xl mb-2">🔤</div>
            <div className="font-medium">中英翻译</div>
            <div className="text-xs text-stone-500 mt-1">即时查询</div>
          </Link>
          <Link to="/notebook" className="card hover:shadow-md active:scale-[0.98] transition-all text-center py-6">
            <div className="text-3xl mb-2">⭐</div>
            <div className="font-medium">我的生词</div>
            <div className="text-xs text-stone-500 mt-1">{stats.favoriteCount} 个</div>
          </Link>
        </div>
        {/* 场景专题课 / 拍照识物 / 每日一句作为独立推荐区 */}
        <div className="mt-3 grid grid-cols-1 gap-3">
          <Link to="/scenes" className="card hover:shadow-md active:scale-[0.98] transition-all flex items-center gap-4 bg-gradient-to-r from-brand-50 to-emerald-50 dark:from-brand-900/20 dark:to-emerald-900/20 no-select">
            <div className="text-3xl">🎬</div>
            <div className="flex-1">
              <div className="font-medium">场景专题课</div>
              <div className="text-xs text-stone-500 mt-0.5">5 个真实场景 · 真实能用</div>
            </div>
            <div className="text-stone-400">→</div>
          </Link>
          <Link to="/camera" className="card hover:shadow-md active:scale-[0.98] transition-all flex items-center gap-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 no-select">
            <div className="text-3xl">📷</div>
            <div className="flex-1">
              <div className="font-medium">拍照识物</div>
              <div className="text-xs text-stone-500 mt-0.5">AI 识别图片,返回英文 + 例句</div>
            </div>
            <div className="text-stone-400">→</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
