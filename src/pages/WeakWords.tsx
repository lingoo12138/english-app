// 错题本/薄弱词 - 标记"不认识"次数最多的词
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getWeakWords } from '../lib/streak'
import { getWord, loadWords } from '../lib/words'
import type { Word } from '../types'
import TTSButton from '../components/TTSButton'
import { removeFavorite, reviewWord, logAction, db } from '../lib/db'

interface WeakWordItem {
  word: Word
  wrongCount: number
  lastWrong: number
}

export default function WeakWords() {
  const navigate = useNavigate()
  const [items, setItems] = useState<WeakWordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'recite'>('all')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const weak = await getWeakWords(100)
    const list: WeakWordItem[] = []
    for (const w of weak) {
      // 跳过 daily- 开头的
      if (w.wordId.startsWith('daily-')) continue
      const word = await getWord(w.wordId)
      if (word) {
        // 获取最近一次 unknown 时间
        const lastUnknown = await db.records
          .where('wordId').equals(w.wordId)
          .and(r => r.action === 'unknown')
          .reverse()
          .sortBy('timestamp')
        const lastTime = lastUnknown[0]?.timestamp || 0
        list.push({ word, wrongCount: w.count, lastWrong: lastTime })
      }
    }
    setItems(list)
    setLoading(false)
  }

  // 标记掌握:把 quality=5 喂给 SM-2(让复习时间拉长),并清掉 unknown 记录
  async function markMastered(wordId: string) {
    await reviewWord(wordId, 5)
    await logAction(wordId, 'known')
    // 清除 unknown 记录
    await db.records
      .where('wordId').equals(wordId)
      .and(r => r.action === 'unknown')
      .delete()
    // 刷新
    loadData()
  }

  async function markRemove(wordId: string) {
    if (!confirm('从生词本移除?')) return
    await removeFavorite(wordId)
    loadData()
  }

  // 错题率(显示在顶部)
  const stats = {
    total: items.length,
    totalWrong: items.reduce((sum, i) => sum + i.wrongCount, 0),
    biggestOffender: items[0],
  }

  if (loading) {
    return (
      <div className="text-center py-20 text-stone-500">
        <div className="text-4xl mb-3">⏳</div>
        加载错题...
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-bold mb-2">没有错题</h2>
        <p className="text-stone-500 text-sm mb-6">
          你的所有词都掌握得很好<br />
          继续保持!
        </p>
        <button onClick={() => navigate('/words')} className="btn-primary">
          去学习新词
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold mb-1">错题本</h1>
        <p className="text-stone-500 text-sm">
          反复标记"不认识"的词,需要重点攻克
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.total}</div>
          <div className="text-xs text-stone-500 mt-1">薄弱词</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.totalWrong}</div>
          <div className="text-xs text-stone-500 mt-1">错题次数</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-orange-600">
            {stats.biggestOffender?.wrongCount || 0}
          </div>
          <div className="text-xs text-stone-500 mt-1">最高错次</div>
        </div>
      </div>

      {/* 提示 */}
      <div className="card bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div className="flex-1 text-sm">
            <p className="font-medium text-orange-900 dark:text-orange-200 mb-1">攻克建议</p>
            <p className="text-orange-700 dark:text-orange-300 text-xs">
              进入单词详情页,多看几遍例句和词根,加深印象
            </p>
          </div>
        </div>
      </div>

      {/* 错题列表 */}
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div
            key={item.word.id}
            className="card flex items-start gap-3"
          >
            {/* 排名 */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              idx === 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              : idx < 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
              : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
            }`}>
              {idx + 1}
            </div>

            <Link to={`/words/${item.word.id}`} className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-lg font-semibold">{item.word.word}</h3>
                <span className="text-xs text-stone-400">{item.word.phonetic}</span>
              </div>
              <p className="text-sm text-stone-600 dark:text-stone-400 truncate">
                {item.word.translations[0]}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded">
                  错了 {item.wrongCount} 次
                </span>
                {item.lastWrong > 0 && (
                  <span className="text-xs text-stone-400">
                    最近: {formatRelativeTime(item.lastWrong)}
                  </span>
                )}
              </div>
            </Link>

            <div className="flex flex-col items-center gap-1">
              <TTSButton text={item.word.word} size="sm" />
              <button
                onClick={() => markMastered(item.word.id)}
                className="text-xs text-green-600 hover:underline whitespace-nowrap"
                title="标记为已掌握"
              >
                ✓ 掌握
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`
  return `${Math.floor(days / 30)}个月前`
}
