import { useState, useEffect, useMemo } from 'react'
import { loadWords, LEVELS, searchWords } from '../lib/words'
import type { Word } from '../types'
import WordCard from '../components/WordCard'
import { addFavorite, removeFavorite, isFavorite, getAllFavorites } from '../lib/db'
import { useStore } from '../store/useStore'

export default function WordList() {
  const [allWords, setAllWords] = useState<Word[]>([])
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState<string>('all')
  const [favSet, setFavSet] = useState<Set<string>>(new Set())
  const targetLevel = useStore(s => s.targetLevel)
  const setTargetLevel = useStore(s => s.setTargetLevel)

  useEffect(() => {
    loadWords().then(setAllWords)
    // 加载收藏状态
    const loadFavs = async () => {
      const favs = await getAllFavorites()
      setFavSet(new Set(favs.map(f => f.wordId)))
    }
    loadFavs()
  }, [])

  useEffect(() => {
    if (level === 'all' && targetLevel !== 'all') {
      setLevel(targetLevel)
    }
  }, [targetLevel, level])

  const filtered = useMemo(() => {
    let result = allWords
    if (level !== 'all') {
      result = result.filter(w => w.level === level)
    }
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter(w =>
        w.word.toLowerCase().includes(q) ||
        w.translations.some(t => t.toLowerCase().includes(q))
      )
    }
    return result
  }, [allWords, level, query])

  const handleToggleFav = async (word: Word) => {
    if (favSet.has(word.id)) {
      await removeFavorite(word.id)
      setFavSet(prev => {
        const next = new Set(prev)
        next.delete(word.id)
        return next
      })
    } else {
      await addFavorite(word.id)
      setFavSet(prev => new Set(prev).add(word.id))
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold mb-1">词库</h1>
        <p className="text-stone-500 text-sm">共 {allWords.length} 个词</p>
      </div>

      {/* 搜索 */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索单词或中文..."
        className="input"
      />

      {/* 学段筛选 */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {LEVELS.map(l => (
          <button
            key={l.value}
            onClick={() => setLevel(l.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              level === l.value
                ? 'bg-brand-600 text-white'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* 词条列表 */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-stone-500">
          {allWords.length === 0 ? '加载中...' : '没有匹配的词'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(word => (
            <WordCard
              key={word.id}
              word={word}
              isFavorite={favSet.has(word.id)}
              onToggleFavorite={() => handleToggleFav(word)}
            />
          ))}
        </div>
      )}

      <div className="text-center text-xs text-stone-400 py-4">
        显示 {filtered.length} / {allWords.length} 个词
      </div>
    </div>
  )
}
