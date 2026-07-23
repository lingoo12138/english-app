// 改错本 - v0.25
// 聚合 W1-A 写作批改 + W2-A 实时纠错的错误
import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getAllWritingErrors, deleteWritingError, type WritingError } from '../lib/db'
import { addFavorite } from '../lib/db'
import { loadWords } from '../lib/words'

type Tab = 'overview' | 'types' | 'top' | 'timeline'

export default function ErrorsPage() {
  const [errors, setErrors] = useState<WritingError[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')
  const [addedWords, setAddedWords] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'write' | 'chat'>('all')

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    const list = await getAllWritingErrors()
    setErrors(list.reverse())  // 最新在前
    setLoading(false)
  }

  // 统计
  const stats = useMemo(() => {
    const filtered = filter === 'all' ? errors : errors.filter(e => e.source === filter)
    const typeCount: Record<string, number> = {}
    const wordCount: Record<string, { original: string; suggestion: string; count: number; type: string; explanation: string }> = {}
    let totalErrs = 0
    for (const e of filtered) {
      for (const err of e.errors) {
        totalErrs++
        typeCount[err.type] = (typeCount[err.type] || 0) + 1
        const key = err.original.toLowerCase() + '|' + err.suggestion.toLowerCase()
        if (!wordCount[key]) {
          wordCount[key] = { original: err.original, suggestion: err.suggestion, count: 0, type: err.type, explanation: err.explanation }
        }
        wordCount[key].count++
      }
    }
    return { filtered, totalErrs, typeCount, wordCount }
  }, [errors, filter])

  const topWords = useMemo(() => {
    return Object.values(stats.wordCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
  }, [stats.wordCount])

  const handleAddWord = async (word: string) => {
    if (addedWords.has(word.toLowerCase())) return
    const allWords = await loadWords()
    const found = allWords.find(w => w.word.toLowerCase() === word.toLowerCase())
    if (found) {
      await addFavorite(found.id)
      setAddedWords(prev => new Set(prev).add(word.toLowerCase()))
    }
  }

  const handleAddAllTop = async () => {
    const allWords = await loadWords()
    const wordMap = new Map(allWords.map(w => [w.word.toLowerCase(), w.id]))
    let added = 0
    for (const tw of topWords) {
      const word = tw.suggestion.toLowerCase().split(/\s+/)[0]
      if (wordMap.has(word) && !addedWords.has(word)) {
        await addFavorite(wordMap.get(word)!)
        setAddedWords(prev => new Set(prev).add(word))
        added++
      }
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除这条记录?')) return
    await deleteWritingError(id)
    await loadAll()
  }

  if (loading) {
    return <div className="text-center text-stone-500 py-10">加载中...</div>
  }

  if (errors.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">📕 改错本</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm">
            聚合写作批改和 AI 对话实时纠错中遇到的错误
          </p>
        </div>
        <div className="card text-center py-10">
          <div className="text-5xl mb-3">📝</div>
          <p className="text-lg mb-1">还没有错误记录</p>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
            去写一段英文,或在 AI 对话中让 AI 帮你纠错
          </p>
          <div className="flex justify-center gap-2">
            <Link to="/write" className="btn-primary">✍️ 去写作批改</Link>
            <Link to="/chat" className="btn-ghost">💬 去 AI 对话</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold mb-1">📕 改错本</h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm">
          累计 {errors.length} 条记录,共 {stats.totalErrs} 个错误
        </p>
      </div>

      {/* 过滤器 */}
      <div className="flex gap-2 text-sm">
        <button
          onClick={() => setFilter('all')}
          className={`px-2 py-0.5 rounded ${filter === 'all' ? 'bg-brand-500 text-white' : 'bg-stone-100 dark:bg-stone-800'}`}
        >
          全部 ({errors.length})
        </button>
        <button
          onClick={() => setFilter('write')}
          className={`px-2 py-0.5 rounded ${filter === 'write' ? 'bg-brand-500 text-white' : 'bg-stone-100 dark:bg-stone-800'}`}
        >
          ✍️ 写作 ({errors.filter(e => e.source === 'write').length})
        </button>
        <button
          onClick={() => setFilter('chat')}
          className={`px-2 py-0.5 rounded ${filter === 'chat' ? 'bg-brand-500 text-white' : 'bg-stone-100 dark:bg-stone-800'}`}
        >
          💬 对话 ({errors.filter(e => e.source === 'chat').length})
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-stone-200 dark:border-stone-700">
        {[
          ['overview', '📈 总览'],
          ['types', '🏷 类型'],
          ['top', '🔥 高频错词'],
          ['timeline', '🕐 时间'],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k as Tab)}
            className={`px-3 py-1.5 text-sm -mb-px border-b-2 ${
              tab === k
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-stone-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 总览 */}
      {tab === 'overview' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card text-center">
            <div className="text-3xl font-bold text-brand-600 dark:text-brand-400">
              {stats.filtered.length}
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">记录数</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {stats.totalErrs}
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">错误总数</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {topWords.length}
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">不同错词</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {Object.keys(stats.typeCount).length}
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">错误类型</div>
          </div>
        </div>
      )}

      {/* 类型分布 */}
      {tab === 'types' && (
        <div className="card space-y-2">
          <h3 className="text-sm font-semibold">🏷 按类型分组</h3>
          {Object.entries(stats.typeCount)
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => {
              const pct = (count / stats.totalErrs * 100).toFixed(0)
              return (
                <div key={type} className="text-sm">
                  <div className="flex justify-between mb-0.5">
                    <span>{type}</span>
                    <span className="text-stone-500">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-stone-200 dark:bg-stone-700 rounded overflow-hidden">
                    <div
                      className="h-full bg-amber-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {/* 高频错词 */}
      {tab === 'top' && (
        <div className="card space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">🔥 Top 20 高频错词</h3>
            <button onClick={handleAddAllTop} className="btn-ghost text-xs">
              ⭐ 一键加入生词本
            </button>
          </div>
          {topWords.length === 0 ? (
            <p className="text-sm text-stone-500 text-center py-4">没有错词</p>
          ) : (
            topWords.map((tw, i) => (
              <div
                key={tw.original + tw.suggestion}
                className="text-sm p-2 bg-stone-50 dark:bg-stone-800/50 rounded flex items-center gap-2"
              >
                <span className="text-stone-500 font-mono w-6">{i + 1}.</span>
                <span className="line-through text-red-600 dark:text-red-400 font-mono text-xs">
                  {tw.original}
                </span>
                <span>→</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-xs flex-1">
                  {tw.suggestion || '(无改正)'}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 rounded">
                  {tw.type}
                </span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 w-8 text-right">
                  ×{tw.count}
                </span>
                <button
                  onClick={() => handleAddWord(tw.suggestion)}
                  disabled={addedWords.has(tw.suggestion.toLowerCase())}
                  className="text-xs text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50"
                >
                  {addedWords.has(tw.suggestion.toLowerCase()) ? '✓' : '⭐'}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* 时间线 */}
      {tab === 'timeline' && (
        <div className="space-y-2">
          {stats.filtered.length === 0 ? (
            <p className="text-sm text-stone-500 text-center py-4">没有记录</p>
          ) : (
            stats.filtered.map(item => (
              <div key={item.id} className="card">
                <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mb-2">
                  <span>
                    {new Date(item.ts).toLocaleString()}{' '}
                    {item.source === 'write' ? '✍️ 写作' : '💬 对话'}
                  </span>
                  {item.id && (
                    <button
                      onClick={() => handleDelete(item.id!)}
                      className="text-red-500 hover:underline"
                    >
                      删除
                    </button>
                  )}
                </div>
                <p className="text-sm text-stone-700 dark:text-stone-300 mb-2 line-clamp-2">
                  {item.original}
                </p>
                {item.errors.length > 0 && (
                  <div className="space-y-1">
                    {item.errors.map((err, i) => (
                      <div key={i} className="text-xs flex items-center gap-1">
                        <span className="line-through text-red-500 font-mono">
                          {err.original}
                        </span>
                        <span>→</span>
                        <span className="text-emerald-600 font-mono">
                          {err.suggestion}
                        </span>
                        <span className="text-[10px] px-1 bg-stone-200 dark:bg-stone-700 rounded">
                          {err.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
