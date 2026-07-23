import { useEffect, useState } from 'react'
import { getAllFavorites, getDueReviews, removeFavorite } from '../lib/db'
import { getWord } from '../lib/words'
import { Link } from 'react-router-dom'
import type { Word } from '../types'
import TTSButton from '../components/TTSButton'
import { exportToCSV, exportToJSON, exportFullBackup, downloadFile } from '../lib/export'
import { formatDate } from '../lib/utils'
import { Modal } from '../components/Modal'

export default function Notebook() {
  const [words, setWords] = useState<Word[]>([])
  const [dueCount, setDueCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)  // 防止重复点击导出
  const [groupBy, setGroupBy] = useState<'none' | 'letter'>('none')  // v0.14
  const [batchMode, setBatchMode] = useState(false)  // v0.14: 批量模式
  const [selected, setSelected] = useState<Set<string>>(new Set())  // 选中的 wordId
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)
  const [showBatchConfirm, setShowBatchConfirm] = useState(false)

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
    setPendingRemoveId(wordId)
  }
  const doRemove = async () => {
    if (!pendingRemoveId) return
    const id = pendingRemoveId
    setPendingRemoveId(null)
    await removeFavorite(id)
    loadFavorites()
  }

  // 批量删除选中
  const handleBatchDelete = () => {
    if (selected.size === 0) return
    setShowBatchConfirm(true)
  }
  const doBatchDelete = async () => {
    setShowBatchConfirm(false)
    for (const id of Array.from(selected)) {
      await removeFavorite(id)
    }
    setSelected(new Set())
    setBatchMode(false)
    loadFavorites()
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <Modal
        open={pendingRemoveId !== null}
        title="从生词本移除"
        message="从生词本移除这个词?"
        variant="danger"
        confirmText="移除"
        onConfirm={doRemove}
        onCancel={() => setPendingRemoveId(null)}
      />
      <Modal
        open={showBatchConfirm}
        title="批量移除"
        message={`确定从生词本移除 ${selected.size} 个词?`}
        variant="danger"
        confirmText="全部移除"
        onConfirm={doBatchDelete}
        onCancel={() => setShowBatchConfirm(false)}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">生词本</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm">共 {words.length} 个词 {dueCount > 0 && `· ${dueCount} 个待复习`}</p>
        </div>
        {words.length > 0 && (
          <>
          <Link to="/cards" className="btn-primary text-sm">
            🎴 卡片复习
          </Link>
          <button
            onClick={() => setGroupBy(groupBy === 'none' ? 'letter' : 'none')}
            className="btn-ghost text-sm"
          >
            {groupBy === 'none' ? '📋 列表' : '🔤 按字母分组'}
          </button>
          {/* v0.22.9: Anki 风格卡片复习入口 */}
          <Link to="/cards" className="btn-primary text-sm">
            🎴 卡片复习
          </Link>
          <button
            onClick={() => {
              if (batchMode) {
                setBatchMode(false)
                setSelected(new Set())
              } else {
                setBatchMode(true)
              }
            }}
            className={`btn-ghost text-sm ${batchMode ? 'bg-brand-100 dark:bg-brand-900/30' : ''}`}
          >
            {batchMode ? `✓ 批量 (${selected.size})` : '☑ 批量管理'}
          </button>
          {batchMode && selected.size > 0 && (
            <button
              onClick={handleBatchDelete}
              className="btn text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800"
            >
              🗑 删除 {selected.size} 个
            </button>
          )}
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
          </>
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
          {(groupBy === 'letter'
            ? (() => {
                const grouped: Record<string, Word[]> = {}
                words.forEach(w => {
                  const l = w.word[0]?.toUpperCase() || '#'
                  if (!grouped[l]) grouped[l] = []
                  grouped[l].push(w)
                })
                return Object.keys(grouped).sort().flatMap(letter => [
                  <div key={'g-' + letter} className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider pt-2 sticky top-14 md:top-0 bg-stone-50/95 dark:bg-stone-900/95 z-10 px-1">{letter}</div>,
                  ...grouped[letter].map(w => (
                    <NotebookWord key={w.id} w={w} onRemove={handleRemove} batchMode={batchMode} selected={selected.has(w.id)} onToggleSelect={toggleSelect} />
                  ))
                ])
              })()
            : words.map(w => (
                <NotebookWord key={w.id} w={w} onRemove={handleRemove} batchMode={batchMode} selected={selected.has(w.id)} onToggleSelect={toggleSelect} />
              )))}
        </div>
      )}
    </div>
  )
}


function NotebookWord({ w, onRemove, batchMode, selected, onToggleSelect }: {
  w: Word
  onRemove: (id: string) => void
  batchMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}) {
  const isSelected = !!selected
  return (
    <div
      className={`card flex items-center gap-3 cursor-pointer transition-colors ${isSelected ? 'ring-2 ring-brand-500 bg-brand-50 dark:bg-brand-900/20' : ''}`}
      onClick={batchMode ? () => onToggleSelect?.(w.id) : undefined}
    >
      {batchMode && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect?.(w.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-5 h-5"
          aria-label={`选择 ${w.word}`}
        />
      )}
      <Link to={`/words/${w.id}`} className="flex-1 min-w-0" onClick={(e) => batchMode && e.preventDefault()}>
        <h3 className="text-lg font-semibold">{w.word}</h3>
        <p className="text-sm text-stone-500 dark:text-stone-400">{w.phonetic}</p>
        <p className="text-sm text-stone-600 dark:text-stone-400 mt-0.5 truncate">
          {w.translations.slice(0, 2).join(' · ')}
        </p>
      </Link>
      {!batchMode && <TTSButton text={w.word} size="sm" />}
      {!batchMode && (
        <button
          onClick={() => onRemove(w.id)}
          className="text-stone-400 dark:text-stone-300 hover:text-red-500 w-8 h-8 flex items-center justify-center"
          aria-label="从生词本移除"
        >
          ✕
        </button>
      )}
    </div>
  )
}
