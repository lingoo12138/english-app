import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import TTSButton from '../components/TTSButton'
import { getTodaySentence } from '../lib/daily'
import { loadWords, LEVELS } from '../lib/words'
import type { Word, DailySentence } from '../types'
import { useStats, useStore } from '../store/useStore'
import { isFavorite, addFavorite, removeFavorite } from '../lib/db'

export default function Home() {
  const [sentence, setSentence] = useState<DailySentence | null>(null)
  const [wordOfDay, setWordOfDay] = useState<Word | null>(null)
  const [fav, setFav] = useState(false)
  const stats = useStats()
  const targetLevel = useStore(s => s.targetLevel)

  useEffect(() => {
    setSentence(getTodaySentence())
    loadWords().then((words) => {
      // 每日一词: 选 target level 的第一个高频词
      const filtered = targetLevel === 'all' ? words : words.filter(w => w.level === targetLevel)
      const candidates = filtered.length > 0 ? filtered : words
      const idx = Math.floor(Math.random() * candidates.length)
      setWordOfDay(candidates[idx])
    })
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

      {/* 快捷入口 */}
      <div>
        <h3 className="text-sm font-semibold text-stone-500 mb-3">快捷入口</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/words" className="card hover:shadow-md active:scale-[0.98] transition-all text-center py-6">
            <div className="text-3xl mb-2">📚</div>
            <div className="font-medium">浏览词库</div>
            <div className="text-xs text-stone-500 mt-1">200+ 高频词</div>
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
          <Link to="/daily" className="card hover:shadow-md active:scale-[0.98] transition-all text-center py-6">
            <div className="text-3xl mb-2">✨</div>
            <div className="font-medium">每日一句</div>
            <div className="text-xs text-stone-500 mt-1">场景化表达</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
