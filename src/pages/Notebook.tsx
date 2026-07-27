import { useEffect, useState } from 'react'
import { getAllFavorites, getDueReviews, removeFavorite } from '../lib/db'
import { getWord, loadWords } from '../lib/words'
import { Link } from 'react-router-dom'
import type { Word } from '../types'
import TTSButton from '../components/TTSButton'
import { exportToCSV, exportToJSON, exportFullBackup, downloadFile } from '../lib/export'
import { formatDate } from '../lib/utils'
import { Modal } from '../components/Modal'
import { addFavoritesToReview, downloadFavoritesCSV, selectAll as selectAllIds, invertSelection } from '../lib/notebookBulk'
import { addTagsToWord, getAllTagsWithCount, buildWordTagMap, getTagColor, getWordIdsByTag, removeTagFromWord, renameTag, mergeTags } from '../lib/wordTags'
import { toast } from '../components/Toast'
import { useTranslate } from '../lib/useTranslate'

export default function Notebook() {
  // v1.49.0 W46: i18n
  const { t } = useTranslate()
  const [words, setWords] = useState<Word[]>([])
  const [dueCount, setDueCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)  // 防止重复点击导出
  const [groupBy, setGroupBy] = useState<'none' | 'letter'>('none')  // v0.14
  const [batchMode, setBatchMode] = useState(false)  // v0.14: 批量模式
  const [selected, setSelected] = useState<Set<string>>(new Set())  // 选中的 wordId
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)
  const [showBatchConfirm, setShowBatchConfirm] = useState(false)
  // v1.21.0: tag 状态
  const [allTags, setAllTags] = useState<Array<{ tag: string; count: number }>>([])
  const [wordTagMap, setWordTagMap] = useState<Map<string, Set<string>>>(new Map())
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState<Record<string, string>>({})  // wordId -> input
  // v1.25.0: tag 合并/重命名 modal
  const [showTagManager, setShowTagManager] = useState(false)
  const [tagAction, setTagAction] = useState<{ type: 'rename' | 'merge'; tag: string } | null>(null)
  const [tagActionValue, setTagActionValue] = useState('')

  const loadFavorites = async () => {
    setLoading(true)
    const favs = await getAllFavorites()
    // 过滤掉非单词 ID
    const wordIds = favs
      .filter(f => !f.wordId.startsWith('daily-') && !f.wordId.startsWith('scene:'))
      .map(f => f.wordId)
    // 一次拉取全词库,内存中过滤(修复 O(N*M) 慢加载)
    // v1.52.0 W47: 静态 import (verifier4 P1-B 防回归)
    const allWords = await loadWords()
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
    // v1.21.0: 加载 tag 数据
    const [tags, wtagMap] = await Promise.all([
      getAllTagsWithCount(),
      buildWordTagMap(),
    ])
    setAllTags(tags)
    setWordTagMap(wtagMap)
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

  // v1.20.0: 批量入复习
  const handleBatchAddToReview = async () => {
    if (selected.size === 0) return
    const selectedFavs = words
      .filter(w => selected.has(w.id))
      .map(w => ({ wordId: w.id, addedAt: 0 }))
    const result = await addFavoritesToReview(selectedFavs)
    if (result.added > 0) {
      toast.success(`✓ ${result.added} 词已加入复习${result.skipped > 0 ? ` (跳过 ${result.skipped} 已存)` : ''}`)
    } else if (result.skipped > 0) {
      toast.success(`已在复习中 (${result.skipped} 词)`)
    }
    setSelected(new Set())
    setBatchMode(false)
    loadFavorites()
  }

  // v1.20.0: 批量导出 CSV
  const handleBatchExport = () => {
    if (selected.size === 0) {
      toast.error('请先选择要导出的词')
      return
    }
    const selectedFavs = words
      .filter(w => selected.has(w.id))
      .map(w => ({ wordId: w.id, addedAt: 0 }))
    const lookup = (id: string) => {
      const w = words.find(ww => ww.id === id)
      return w ? { translation: w.translations?.[0] || '', difficulty: w.level || '' } : undefined
    }
    downloadFavoritesCSV(selectedFavs, lookup)
    toast.success(`✓ 已导出 ${selected.size} 词到 CSV`)
  }

  // v1.20.0: 全选
  const handleSelectAll = () => {
    setSelected(selectAllIds(words.map(w => ({ wordId: w.id, addedAt: 0 }))))
  }

  // v1.20.0: 反选
  const handleInvert = () => {
    setSelected(invertSelection(selected, words.map(w => ({ wordId: w.id, addedAt: 0 }))))
  }

  // v1.21.0: 加 tag
  const handleAddTag = async (wordId: string) => {
    const input = tagInput[wordId]?.trim()
    if (!input) return
    const { addTagsToWord: addFn } = await import('../lib/wordTags')
    const result = await addFn(wordId, [input.toLowerCase()])
    if (result.added > 0) {
      toast.success(`✓ 已加 tag: ${input.toLowerCase()}`)
    } else if (result.skipped > 0) {
      toast.success('已存在')
    }
    setTagInput(prev => ({ ...prev, [wordId]: '' }))
    loadFavorites()
  }

  // v1.37.0 W35-5: AI 推荐 tag (本地启发式, 不需 LLM)
  const handleAISuggest = async (wordId: string) => {
    const word = words.find(w => w.id === wordId)
    if (!word) return
    try {
      const { suggestTagsFromWord, addTagsToWord } = await import('../lib/wordTags')
      const suggested = suggestTagsFromWord(word.word, word.translations[0])
      if (suggested.length === 0) {
        toast.info('未找到启发式 tag, 请手动输入')
        return
      }
      const result = await addTagsToWord(wordId, suggested)
      if (result.added > 0) {
        toast.success(`✓ 推荐 ${result.added} 个 tag: ${suggested.join(', ')}`)
      } else {
        toast.info('这些 tag 已存在')
      }
      loadFavorites()
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e))
      toast.error(err.message)
    }
  }

  // v1.21.0: 去 tag
  const handleRemoveTag = async (wordId: string, tag: string) => {
    await removeTagFromWord(wordId, tag)
    loadFavorites()
  }

  // v1.25.0: 重命名/合并 tag
  const handleTagAction = async () => {
    if (!tagAction || !tagActionValue.trim()) return
    try {
      if (tagAction.type === 'rename') {
        const n = await renameTag(tagAction.tag, tagActionValue.toLowerCase().trim())
        toast.success(`✓ 已重命名 ${n} 个 word 的 tag`)
      } else {
        const r = await mergeTags(tagAction.tag, tagActionValue.toLowerCase().trim())
        toast.success(`✓ 合并: ${r.merged} 改名 + ${r.removed} 删重复`)
      }
      setShowTagManager(false)
      setTagAction(null)
      setTagActionValue('')
      loadFavorites()
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e))
      toast.error(err.message || '操作失败')
    }
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
        title={t('notebook.remove_title')}
        message="从生词本移除这个词?"
        variant="danger"
        confirmText="移除"
        onConfirm={doRemove}
        onCancel={() => setPendingRemoveId(null)}
      />
      <Modal
        open={showBatchConfirm}
        title={t('notebook.batch_remove_title')}
        message={`确定从生词本移除 ${selected.size} 个词?`}
        variant="danger"
        confirmText="全部移除"
        onConfirm={doBatchDelete}
        onCancel={() => setShowBatchConfirm(false)}
      />

      {/* v1.25.0: tag 合并/重命名 modal */}
      <Modal
        open={showTagManager}
        title={tagAction?.type === 'rename' ? `重命名 "${tagAction?.tag}"` : `合并 "${tagAction?.tag}" 到...`}
        onCancel={() => { setShowTagManager(false); setTagAction(null); setTagActionValue('') }}
        onConfirm={() => {}}
      >
        <div className="space-y-3">
          <p className="text-sm text-stone-500">
            {tagAction?.type === 'rename'
              ? '输入新 tag 名 (旧 tag 会被替换):'
              : '输入目标 tag (重复 word 会去重):'}
          </p>
          <input
            type="text"
            value={tagActionValue}
            onChange={(e) => setTagActionValue(e.target.value)}
            placeholder={tagAction?.type === 'rename' ? '新 tag' : '目标 tag'}
            className="input"
            maxLength={20}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowTagManager(false); setTagAction(null); setTagActionValue('') }}
              className="btn-ghost text-sm"
            >取消</button>
            <button
              onClick={handleTagAction}
              disabled={!tagActionValue.trim()}
              className="btn-primary text-sm disabled:opacity-50"
            >确认</button>
          </div>
        </div>
      </Modal>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">{t('notebook.title')}</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm">{t('notebook.count_summary').replace('N', String(words.length)).replace('M', String(dueCount))}</p>
          {/* v1.21.0: tag 过滤 */}
          {allTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1 items-center">
              <span className="text-xs text-stone-500">按 tag 过滤:</span>
              <button
                onClick={() => setShowTagManager(true)}
                className="text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200"
                title="管理 tag"
              >🏷️ 管理</button>
              <button
                onClick={() => setFilterTag(null)}
                className={`text-xs px-2 py-0.5 rounded ${filterTag === null ? 'bg-brand-500 text-white' : 'bg-stone-100 dark:bg-stone-700'}`}
              >
                全部 ({words.length})
              </button>
              {allTags.map(({ tag, count }) => (
                <div key={tag} className="inline-flex items-center">
                  <button
                    onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                    className={`text-xs px-2 py-0.5 rounded-l ${filterTag === tag ? 'bg-brand-500 text-white' : getTagColor(tag)}`}
                  >
                    {tag} ({count})
                  </button>
                  <button
                    onClick={() => { setTagAction({ type: 'rename', tag }); setTagActionValue(''); setShowTagManager(true) }}
                    className="text-xs px-1.5 py-0.5 rounded-r bg-stone-100 dark:bg-stone-700 hover:bg-stone-200"
                    title="重命名"
                  >✏️</button>
                  <button
                    onClick={() => { setTagAction({ type: 'merge', tag }); setTagActionValue(''); setShowTagManager(true) }}
                    className="text-xs px-1.5 py-0.5 ml-0.5 rounded bg-stone-100 dark:bg-stone-700 hover:bg-stone-200"
                    title="合并到其他 tag"
                  >🔗</button>
                </div>
              ))}
            </div>
          )}
        </div>
        {words.length > 0 && (
          <>
          <Link to="/cards" className="btn-primary text-sm">
            {t('notebook.card_review')}
          </Link>
          <button
            onClick={() => setGroupBy(groupBy === 'none' ? 'letter' : 'none')}
            className="btn-ghost text-sm"
          >
            {groupBy === 'none' ? '📋 列表' : '🔤 按字母分组'}
          </button>
          {/* v0.22.9: Anki 风格卡片复习入口 */}
          <Link to="/cards" className="btn-primary text-sm">
            {t('notebook.card_review')}
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
            {batchMode ? t('notebook.batch_exit').replace('N', String(selected.size)) : t('notebook.batch_mode')}
          </button>
          {batchMode && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleSelectAll}
                className="btn-ghost text-xs"
                aria-label="全选"
              >
                ☑ 全选
              </button>
              <button
                onClick={handleInvert}
                className="btn-ghost text-xs"
                aria-label="反选"
              >
                ⇄ 反选
              </button>
            </div>
          )}
          {batchMode && selected.size > 0 && (
            <>
              <button
                onClick={handleBatchAddToReview}
                className="btn text-sm text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
              >
                📚 入复习 ({selected.size})
              </button>
              <button
                onClick={handleBatchExport}
                className="btn text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
              >
                📤 导出 ({selected.size})
              </button>
              <button
                onClick={handleBatchDelete}
                className="btn text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800"
              >
                🗑 删除 ({selected.size})
              </button>
            </>
          )}
          <details className="relative">
            <summary className="btn-ghost text-sm cursor-pointer list-none">
              {t('notebook.export_menu')}
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
              <h3 className="font-semibold">{t('notebook.review_prompt').replace('N', String(dueCount))}</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400">按记忆曲线,科学复习记得更牢</p>
            </div>
            <Link to="/words" className="btn-primary text-sm">
              {t('notebook.review_cta')}
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
          {/* v1.21.0: 按 tag 过滤 */}
          {(() => {
            const filteredWords = filterTag
              ? words.filter(w => wordTagMap.get(w.id)?.has(filterTag))
              : words
            return groupBy === 'letter'
              ? (() => {
                  const grouped: Record<string, Word[]> = {}
                  filteredWords.forEach(w => {
                    const l = w.word[0]?.toUpperCase() || '#'
                    if (!grouped[l]) grouped[l] = []
                    grouped[l].push(w)
                  })
                  return Object.keys(grouped).sort().flatMap(letter => [
                    <div key={'g-' + letter} className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider pt-2 sticky top-14 md:top-0 bg-stone-50/95 dark:bg-stone-900/95 z-10 px-1">{letter}</div>,
                    ...grouped[letter].map(w => (
                      <NotebookWord key={w.id} w={w} onRemove={handleRemove} batchMode={batchMode} selected={selected.has(w.id)} onToggleSelect={toggleSelect} wordTags={wordTagMap.get(w.id)} onAddTag={handleAddTag} onRemoveTag={handleRemoveTag} tagInput={tagInput[w.id] || ''} onTagInputChange={(v) => setTagInput(prev => ({ ...prev, [w.id]: v }))} />
                    ))
                  ])
                })()
              : filteredWords.map(w => (
                  <NotebookWord key={w.id} w={w} onRemove={handleRemove} batchMode={batchMode} selected={selected.has(w.id)} onToggleSelect={toggleSelect} wordTags={wordTagMap.get(w.id)} onAddTag={handleAddTag} onRemoveTag={handleRemoveTag} tagInput={tagInput[w.id] || ''} onTagInputChange={(v) => setTagInput(prev => ({ ...prev, [w.id]: v }))} onAISuggest={handleAISuggest} />
                ))
          })()}
        </div>
      )}
    </div>
  )
}


function NotebookWord({ w, onRemove, batchMode, selected, onToggleSelect, wordTags, onAddTag, onRemoveTag, tagInput, onTagInputChange, onAISuggest }: {
  w: Word
  onRemove: (id: string) => void
  batchMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
  wordTags?: Set<string>
  onAddTag?: (id: string) => void
  onRemoveTag?: (id: string, tag: string) => void
  tagInput?: string
  onTagInputChange?: (v: string) => void
  onAISuggest?: (id: string) => void
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
        {/* v1.21.0: tag 徽章 + 输入 */}
        {!batchMode && (
          <div className="mt-1 flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {wordTags && Array.from(wordTags).map(tag => (
              <span
                key={tag}
                className={`text-xs px-1.5 py-0.5 rounded ${getTagColor(tag)} flex items-center gap-1`}
              >
                {tag}
                {onRemoveTag && (
                  <button
                    onClick={() => onRemoveTag(w.id, tag)}
                    className="hover:text-red-500"
                    aria-label={`移除 tag ${tag}`}
                  >×</button>
                )}
              </span>
            ))}
            {onAddTag && onTagInputChange && (
              <input
                type="text"
                value={tagInput || ''}
                onChange={e => onTagInputChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') onAddTag(w.id) }}
                placeholder="+tag"
                className="text-xs px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 w-16"
                aria-label={`为 ${w.word} 加 tag`}
              />
            )}
            {onAISuggest && (
              <button
                onClick={() => onAISuggest(w.id)}
                className="text-xs px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-200"
                title="AI 推荐 tag"
              >🤖</button>
            )}
          </div>
        )}
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
