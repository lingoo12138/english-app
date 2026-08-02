// 改错本 - v0.25
// 聚合 W1-A 写作批改 + W2-A 实时纠错的错误
// v1.91 W85: 加 听写/拼写 错题 (source='dictation' | 'spelling')
import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getAllWritingErrors, deleteWritingError, getAllDictationErrors, type WritingError, type DictationError } from '../lib/db'

/** v1.91 W85: 统一错题 (写作/对话/听写/拼写) */
type ErrorSource = 'write' | 'chat' | 'chinese' | 'dictation' | 'spelling' | 'follow-read'
type UnifiedError = WritingError & { source: ErrorSource }

// v1.37.0 W35-1: errorStats 集成
import { getErrorSummary, ERROR_TYPE_LABELS, getErrorTypeColor, type ErrorSummary } from '../lib/errorStats'
import { addFavorite } from '../lib/db'
import { loadWords } from '../lib/words'
import { Modal } from '../components/Modal'
import { ErrorExplainButton } from '../components/ErrorExplainButton'
import { addErrorWordsToFavorites } from '../lib/errorReview'
import { toast } from '../components/Toast'
import { useTranslate } from '../lib/useTranslate'

type Tab = 'overview' | 'types' | 'top' | 'timeline'

export default function ErrorsPage() {
  // v1.49.0 W46: i18n
  const { t } = useTranslate()
  const [errors, setErrors] = useState<UnifiedError[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')
  const [addedWords, setAddedWords] = useState<Set<string>>(new Set())
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | ErrorSource>('all')
  // v1.37.0 W35-1: errorStats 集成
  const [errorSummary, setErrorSummary] = useState<ErrorSummary | null>(null)

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    // v1.37.0 W35-1: 加载总体错题统计
    getErrorSummary().then(setErrorSummary).catch(() => setErrorSummary(null))
  }, [errors])

  const loadAll = async () => {
    setLoading(true)
    try {
      // v1.91 W85: 合并听写/拼写/写作 错题
      const [writeList, dictList] = await Promise.all([
        getAllWritingErrors(),
        getAllDictationErrors(),
      ])
      // 听写/拼写 写进 errors (伪 WritingError 形式, source=...)
      const synth = dictList.map(d => ({
        id: -d.id!,  // 负数避免冲突
        source: (d.source || 'dictation') as WritingError['source'],
        original: d.target,
        corrected: d.transcript,
        errors: d.source === 'spelling'
          ? [{ original: d.transcript, suggestion: d.target, type: 'spelling' as const, explanation: `拼写错 (${d.difficulty})`, severity: 1 - d.score / 100 }]
          : [{ original: d.transcript, suggestion: d.target, type: 'vocab' as const, explanation: `听写错 (${d.difficulty})`, severity: 1 - d.score / 100 }],
        ts: d.ts,
      } as UnifiedError))
      const combined: UnifiedError[] = [...writeList, ...synth].sort((a, b) => b.ts - a.ts)
      setErrors(combined)
    } catch (e) {
      console.error('[ErrorsPage] loadAll failed:', e)
    } finally {
      setLoading(false)
    }
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
    setPendingDelete(id)
  }
  const doDelete = async () => {
    if (pendingDelete == null) return
    const id = pendingDelete
    setPendingDelete(null)
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
          <h1 className="text-2xl font-bold mb-1">{t('errors.title')}</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm">
            聚合写作批改和 AI 对话实时纠错中遇到的错误
          </p>
        </div>
        <div className="card text-center py-10">
          <div className="text-5xl mb-3">📝</div>
          <p className="text-lg mb-1">{t('errors.empty_title')}</p>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">
            {t('errors.empty_desc')}
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
      <Modal
        open={pendingDelete != null}
        title="删除错题记录"
        message="确定删除这条记录?"
        variant="danger"
        confirmText="删除"
        onConfirm={doDelete}
        onCancel={() => setPendingDelete(null)}
      />
      <div>
        <h1 className="text-2xl font-bold mb-1">{t('errors.title')}</h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm">
          累计 {errors.length} 条记录,共 {stats.totalErrs} 个错误
        </p>
        {/* v1.92 W86-B: 错题导出 CSV */}
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            to="/errors/review"
            className="px-3 py-1.5 bg-brand-500 text-white rounded text-sm hover:bg-brand-600"
          >
            🔁 复习模式
          </Link>
          <button
            onClick={async () => {
              const { allErrorsToCSV, downloadCSV } = await import('../lib/exportErrors')
              const { getAllWritingErrors, getAllDictationErrors } = await import('../lib/db')
              const [w, d] = await Promise.all([getAllWritingErrors(), getAllDictationErrors()])
              if (w.length === 0 && d.length === 0) {
                toast.warning('暂无错题可导出')
                return
              }
              const csv = allErrorsToCSV(w, d)
              const date = new Date().toISOString().slice(0, 10)
              downloadCSV(`errors-${date}.csv`, csv)
              toast.success(`导出 ${w.length + d.length} 条错题`)
            }}
            className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded text-sm"
          >
            📥 导出 CSV
          </button>
        </div>
      </div>

      {/* v1.1-D1: 全部错词加入复习 */}
      {errors.length > 0 && (
        <button
          onClick={async () => {
            const added = await addErrorWordsToFavorites(errors)
            if (added.length > 0) {
              toast.success(`已加入 ${added.length} 个错词到复习队列`)
            } else {
              toast.info('所有错词已在复习队列中')
            }
          }}
          className="btn-primary w-full text-sm"
        >
          ⭐ 全部错词加入复习队列
        </button>
      )}

      {/* 过滤器 */}
      <div className="flex gap-2 text-sm flex-wrap">
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
        {/* v1.91 W85: 听写 + 拼写 filter */}
        <button
          onClick={() => setFilter('dictation')}
          className={`px-2 py-0.5 rounded ${(filter as string) === 'dictation' ? 'bg-brand-500 text-white' : 'bg-stone-100 dark:bg-stone-800'}`}
        >
          🎧 听写 ({errors.filter(e => e.source === ('dictation' as any)).length})
        </button>
        <button
          onClick={() => setFilter('spelling')}
          className={`px-2 py-0.5 rounded ${(filter as string) === 'spelling' ? 'bg-brand-500 text-white' : 'bg-stone-100 dark:bg-stone-800'}`}
        >
          ✏️ 拼写 ({errors.filter(e => e.source === ('spelling' as any)).length})
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-stone-200 dark:border-stone-700">
        {[
          ['overview', t('errors.tab_overview')],
          ['types', t('errors.tab_types')],
          ['top', t('errors.tab_top')],
          ['timeline', t('errors.tab_timeline')],
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

      {/* v1.37.0 W35-1: errorStats 集成 (3 卡片, 总览) */}
      {errorSummary && errorSummary.total > 0 && tab === 'overview' && (
        <>
          {/* 类型分布 (总, 跨 filter) */}
          {errorSummary.byType.length > 0 && (
            <div className="card space-y-2">
              <h3 className="text-sm font-semibold">🏷 错题类型 (总)</h3>
              {errorSummary.byType.map((t) => (
                <div key={t.type} className="text-sm">
                  <div className="flex justify-between mb-0.5">
                    <span className={getErrorTypeColor(t.type) + ' px-2 py-0.5 rounded'}>
                      {ERROR_TYPE_LABELS[t.type] || t.type}
                    </span>
                    <span className="text-stone-500">{t.count} ({t.pct}%)</span>
                  </div>
                  <div className="h-2 bg-stone-200 dark:bg-stone-700 rounded overflow-hidden">
                    <div
                      className="h-full bg-amber-500"
                      style={{ width: `${t.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 7 天趋势 */}
          {errorSummary.trend7.some(t => t > 0) && (
            <div className="card">
              <h3 className="text-sm font-semibold mb-3">📅 近 7 天错题趋势</h3>
              <div className="flex items-end gap-1 h-16">
                {errorSummary.trend7.map((count, i) => {
                  const max7 = Math.max(1, ...errorSummary.trend7)
                  const ratio = count / max7
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-red-500 rounded-t hover:bg-red-600 transition-colors"
                      style={{ height: `${Math.max(ratio * 100, count > 0 ? 4 : 0)}%`, minHeight: count > 0 ? '2px' : '0' }}
                      title={`${i === 6 ? '今天' : `${6 - i} 天前`}: ${count} 个错题`}
                    />
                  )
                })}
              </div>
              <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                <span>7 天前</span><span>今天</span>
              </div>
            </div>
          )}

          {/* 高频错词 Top 5 */}
          {errorSummary.highFreq.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold mb-3">🔥 高频错词 Top 5</h3>
              <div className="space-y-2">
                {errorSummary.highFreq.map((w, i) => (
                  <div key={w.original} className="flex items-center gap-2 text-sm">
                    <span className="w-5 text-center text-stone-400">{i + 1}</span>
                    <span className="font-semibold flex-1">{w.original}</span>
                    <span className="text-xs text-red-600 dark:text-red-400">{w.count} 错</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
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
            <div className="text-center py-4">
              <p className="text-sm text-stone-500">📭 还没有错词记录</p>
            </div>
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
            <div className="card text-center py-6">
              <div className="text-3xl mb-2" aria-hidden="true">📭</div>
              <p className="text-sm text-stone-500">没有 {filter === 'all' ? '' : (filter === 'write' ? '写作' : filter === 'chat' ? '对话' : filter === 'dictation' ? '听写' : '拼写')} 记录</p>
            </div>
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
                  <div className="space-y-1.5">
                    {item.errors.map((err, i) => (
                      <div key={i} className="space-y-1">
                        <div className="text-xs flex items-center gap-1 flex-wrap">
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
                        {/* v1.2-D2: 解释按钮 */}
                        <ErrorExplainButton
                          type={err.type}
                          original={err.original}
                          suggestion={err.suggestion}
                          variant="inline"
                        />
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
