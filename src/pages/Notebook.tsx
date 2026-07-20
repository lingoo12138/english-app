import { useEffect, useState } from 'react'
import { getAllFavorites, getDueReviews, removeFavorite } from '../lib/db'
import { getWord } from '../lib/words'
import { Link } from 'react-router-dom'
import type { Word } from '../types'
import TTSButton from '../components/TTSButton'
import { exportToCSV, exportToJSON, exportFullBackup, downloadFile } from '../lib/export'
import { formatDate } from '../lib/utils'

export default function Notebook() {
  const [words, setWords] = useState<Word[]>([])
  const [dueCount, setDueCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)  // 防止重复点击导出

  const loadFavorites = async () => {
    setLoading(true)
    const favs = await getAllFavorites()
    // 过滤掉非单词 ID
    const wordIds = favs
      .filter(f => !f.wordId.startsWith('daily-') && !f.wordId.startsWith('scene:'))
      .map(f => f.wordId)
    // 一次拉取全词库,内存中过滤(修复 O(N*M) 慢加载)
    const allWords = await import('../lib/words').then(m => m.loadWords())
    const wordMap = new Map<string, Word>()
    for (const w of allWords) wordMap.set(w.id, w)
    const list: Word[] = []
    for (const id of wordIds) {
      const w = wordMap.get(id)
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
          <p className="text-stone-500 dark:text-stone-400 text-sm">共 {words.length} 个词 {dueCount > 0 && `· ${dueCount} 个待复习`}</p>
        </div>
        {words.length > 0 && (
          <details className="relative">
            <summary className="btn-ghost text-sm cursor-pointer list-none">
              导出 ▾
            </summary>
            <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-stone-800 rounded-lg shadow-lg border border-stone-200 dark:border-stone-700 z-10 overflow-hidden">
              <button
                onClick={async () => {
                  if (exporting) return
                  setExporting(true)
                  try {
                    const csv = await exportToCSV()
                    downloadFile(csv, `生词本-${formatDate()}.csv`, 'text/csv')
                  } finally {
                    setTimeout(() => setExporting(false), 1000)
                  }
                }}
                disabled={exporting}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-50"
              >
                📊 导出 CSV
              </button>
              <button
                onClick={async () => {
                  if (exporting) return
                  setExporting(true)
                  try {
                    const json = await exportToJSON()
                    downloadFile(json, `生词本-${formatDate()}.json`, 'application/json')
                  } finally {
                    setTimeout(() => setExporting(false), 1000)
                  }
                }}
                disabled={exporting}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-50"
              >
                📋 导出 JSON
              </button>
              <button
                onClick={async () => {
                  if (exporting) return
                  setExporting(true)
                  try {
                    const backup = await exportFullBackup()
                    downloadFile(backup, `完整备份-${formatDate()}.json`, 'application/json')
                  } finally {
                    setTimeout(() => setExporting(false), 1000)
                  }
                }}
                disabled={exporting}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-50 border-t border-stone-200 dark:border-stone-700"
              >
                💾 完整备份
              </button>
            </div>
          </details>
        )}
      </div>

      {/* 错题本入口 */}
      <Link to="/weak" className="card flex items-center gap-3 hover:shadow-md active:scale-[0.98] transition-all">
        <div className="text-2xl">📕</div>
        <div className="flex-1">
          <h3 className="font-medium">错题本</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400">查看反复记不住的词</p>
        </div>
        <div className="text-stone-400 dark:text-stone-300">→</div>
      </Link>

      {/* 复习入口 */}
      {dueCount > 0 && (
        <div className="card bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-3">
            <div className="text-3xl">📝</div>
            <div className="flex-1">
              <h3 className="font-semibold">有 {dueCount} 个词该复习了</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400">按记忆曲线,科学复习记得更牢</p>
            </div>
            <Link to="/words" className="btn-primary text-sm">
              开始复习
            </Link>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-stone-500 dark:text-stone-400">加载中...</div>
      ) : words.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-3">📭</div>
          <p className="text-stone-500 dark:text-stone-400">还没有收藏单词</p>
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
                <p className="text-sm text-stone-500 dark:text-stone-400">{w.phonetic}</p>
                <p className="text-sm text-stone-600 dark:text-stone-400 mt-0.5 truncate">
                  {w.translations.slice(0, 2).join(' · ')}
                </p>
              </Link>
              <TTSButton text={w.word} size="sm" />
              <button
                onClick={() => handleRemove(w.id)}
                className="text-stone-400 dark:text-stone-300 hover:text-red-500 w-8 h-8 flex items-center justify-center"
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
