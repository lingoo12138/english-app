import { useEffect, useState } from 'react'
import { getAllFavorites, getDueReviews, removeFavorite } from '../lib/db'
import { getWord } from '../lib/words'
import { Link } from 'react-router-dom'
import type { Word } from '../types'
import TTSButton from '../components/TTSButton'

export default function Notebook() {
  const [words, setWords] = useState<Word[]>([])
  const [dueCount, setDueCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadFavorites = async () => {
    setLoading(true)
    const favs = await getAllFavorites()
    // 解析每个收藏
    const list: Word[] = []
    for (const f of favs) {
      if (f.wordId.startsWith('daily-')) continue  // 跳过每日一句
      const w = await getWord(f.wordId)
      if (w) list.push(w)
    }
    setWords(list)

    const due = await getDueReviews()
    setDueCount(due.length)
    setLoading(false)
  }

  useEffect(() => {
    loadFavorites()
  }, [])

  const handleRemove = async (wordId: string) => {
    await removeFavorite(wordId)
    loadFavorites()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">生词本</h1>
          <p className="text-stone-500 text-sm">共 {words.length} 个词 {dueCount > 0 && `· ${dueCount} 个待复习`}</p>
        </div>
      </div>

      {/* 复习入口 */}
      {dueCount > 0 && (
        <div className="card bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-3">
            <div className="text-3xl">📝</div>
            <div className="flex-1">
              <h3 className="font-semibold">有 {dueCount} 个词该复习了</h3>
              <p className="text-sm text-stone-500">按记忆曲线,科学复习记得更牢</p>
            </div>
            <Link to="/words" className="btn-primary text-sm">
              开始复习
            </Link>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-stone-500">加载中...</div>
      ) : words.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-3">📭</div>
          <p className="text-stone-500">还没有收藏单词</p>
          <Link to="/words" className="text-brand-600 text-sm mt-2 inline-block">
            去浏览词库 →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {words.map(w => (
            <div key={w.id} className="card flex items-center gap-3">
              <Link to={`/words/${w.id}`} className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold">{w.word}</h3>
                <p className="text-sm text-stone-500">{w.phonetic}</p>
                <p className="text-sm text-stone-600 dark:text-stone-400 mt-0.5 truncate">
                  {w.translations.slice(0, 2).join(' · ')}
                </p>
              </Link>
              <TTSButton text={w.word} size="sm" />
              <button
                onClick={() => handleRemove(w.id)}
                className="text-stone-400 hover:text-red-500 w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
