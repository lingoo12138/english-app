import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getWord, loadWords } from '../lib/words'
import type { Word } from '../types'
import TTSButton from '../components/TTSButton'
import { UsageButton } from '../components/UsageButton'
import { GrammarButton } from '../components/GrammarButton'
import PronunciationPractice from '../components/PronunciationPractice'
import { addFavorite, removeFavorite, isFavorite, logAction, reviewWord } from '../lib/db'
import { markWordCompleted } from '../lib/plan'
import { useStore } from '../store/useStore'

export default function WordDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [word, setWord] = useState<Word | null | 'loading'>('loading')
  const [fav, setFav] = useState(false)
  // v1.8.0-C8: 跟读弹窗状态
  const [showPronounce, setShowPronounce] = useState(false)
  const [showAllExamples, setShowAllExamples] = useState(false)
  const targetLevel = useStore(s => s.targetLevel)

  // 修复: 切换单词时重置 showAllExamples + cancelled 标志
  useEffect(() => {
    setShowAllExamples(false)
    if (!id) return
    // 修复: 用 ref 跟踪当前 id,避免 stale closure 导致旧词覆盖新词
    let cancelled = false
    getWord(id).then((w) => {
      if (cancelled) return
      setWord(w || null)  // null = 找不到, undefined/Word = 加载中/找到
      if (w) {
        isFavorite(w.id).then(f => {
          if (!cancelled) setFav(f)
        })
        logAction(w.id, 'view')
        // v0.22.5: 访问词详情时自动标记今日计划完成
        // 注: dailyGoal 来自 useStore, store targetLevel 已在依赖
        markWordCompleted(w.id)
      }
    })
    return () => { cancelled = true }
  }, [id])

  // 修复: 跳词时滚到顶部
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  const handleToggleFav = async () => {
    if (!word || word === 'loading') return
    if (fav) {
      await removeFavorite(word.id)
      setFav(false)
      logAction(word.id, 'unfavorite')
    } else {
      await addFavorite(word.id)
      setFav(true)
      logAction(word.id, 'favorite')
    }
  }

  const handleReview = async (know: boolean) => {
    if (!word || word === 'loading') return
    // SM-2: 5=完美, 0=完全不会
    const quality = know ? 5 : 1
    await reviewWord(word.id, quality)
    logAction(word.id, know ? 'known' : 'unknown')
    // P2-2 修: 下一个词 — 字母顺序相邻(稳定可预期),不是随机
    const words = await loadWords()
    const filtered = targetLevel === 'all' ? words : words.filter(w => w.level === targetLevel)
    const idx = filtered.findIndex(w => w.id === word.id)
    if (idx >= 0 && idx + 1 < filtered.length) {
      navigate(`/words/${filtered[idx + 1].id}`)
    } else if (filtered.length > 1) {
      navigate(`/words/${filtered[0].id}`)
    }
  }

  // P2-2 加: 字母顺序邻居(用于 UI 上一个/下一个按钮)
  const [neighbors, setNeighbors] = useState<{ prev: Word | null; next: Word | null }>({ prev: null, next: null })
  useEffect(() => {
    if (!word || word === 'loading') {
      setNeighbors({ prev: null, next: null })
      return
    }
    let cancelled = false
    loadWords().then((words) => {
      if (cancelled) return
      const filtered = targetLevel === 'all' ? words : words.filter(w => w.level === targetLevel)
      const idx = filtered.findIndex(w => w.id === word.id)
      setNeighbors({
        prev: idx > 0 ? filtered[idx - 1] : null,
        next: idx >= 0 && idx + 1 < filtered.length ? filtered[idx + 1] : null,
      })
    })
    return () => { cancelled = true }
  }, [word, targetLevel])

  if (word === 'loading') {
    return <div className="text-center py-12 text-stone-500 dark:text-stone-400">加载中...</div>
  }
  if (word === null) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-3">🔍</div>
        <p className="text-lg mb-1">找不到这个词</p>
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">id: <code className="text-xs">{id}</code></p>
        <button onClick={() => navigate('/words')} className="btn-primary">返回词库</button>
      </div>
    )
  }

  const visibleExamples = showAllExamples ? word.examples : word.examples.slice(0, 1)

  return (
    <div className="space-y-4">
      {/* 顶部导航 — P2-2: 加字母顺序的 上一个/下一个 */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="btn-ghost">
          ← 返回
        </button>
        <div className="flex items-center gap-2">
          {neighbors.prev && (
            <button
              onClick={() => navigate(`/words/${neighbors.prev!.id}`)}
              className="btn-ghost text-sm flex items-center gap-1"
              title={`上一个: ${neighbors.prev.word}`}
            >
              ← {neighbors.prev.word}
            </button>
          )}
          {neighbors.next && (
            <button
              onClick={() => navigate(`/words/${neighbors.next!.id}`)}
              className="btn-ghost text-sm flex items-center gap-1"
              title={`下一个: ${neighbors.next.word}`}
            >
              {neighbors.next.word} →
            </button>
          )}
        </div>
        <button
          onClick={handleToggleFav}
          className="text-2xl"
        >
          {fav ? '⭐' : '☆'}
        </button>
      </div>

      {/* 主词条 */}
      <div className="card">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-4xl font-bold mb-1">{word.word}</h1>
            <p className="text-stone-500 dark:text-stone-400">{word.phonetic}</p>
          </div>
          <div className="flex items-center gap-2">
            <TTSButton text={word.word} size="lg" />
            {/* v1.8.0-C8: 跟读按钮 (复用 PronunciationPractice) */}
            <button
              onClick={() => setShowPronounce(true)}
              className="px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors flex items-center gap-1.5"
              title="点击跟读评测"
            >
              🎤 跟读
            </button>
          </div>
        </div>

        {/* v1.8.0-C8: 跟读模态框 (复用 PronunciationPractice) */}
        {showPronounce && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowPronounce(false)}>
            <div className="bg-white dark:bg-stone-800 rounded-lg p-4 max-w-md w-full" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">🎤 跟读: {word.word}</h3>
                <button onClick={() => setShowPronounce(false)} className="text-stone-400 hover:text-stone-600 text-xl">✕</button>
              </div>
              <PronunciationPractice word={word.word} wordId={word.id} />
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          {word.pos.map(p => (
            <span key={p} className="text-xs px-2 py-0.5 bg-stone-100 dark:bg-stone-700 rounded">
              {p}
            </span>
          ))}
          {word.tags.slice(0, 3).map(t => (
            <span key={t} className="text-xs px-2 py-0.5 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded">
              {t}
            </span>
          ))}
        </div>

        <p className="text-lg text-stone-700 dark:text-stone-300 mb-4">
          {word.translations.slice(0, 3).join(' · ')}
          {word.translations.length > 3 && (
            <span className="text-sm text-stone-400 dark:text-stone-300 ml-1">+{word.translations.length - 3} 个义项</span>
          )}
        </p>
      </div>

      {/* 词根词缀 */}
      {word.roots && word.roots.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <span>🌱</span>
            <span>词根词缀</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {word.roots.map((r, i) => {
              const typeColor = r.type === 'prefix' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                : r.type === 'suffix' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
              const typeLabel = r.type === 'prefix' ? '前缀' : r.type === 'suffix' ? '后缀' : '词根'
              return (
                <div key={i} className="flex items-center gap-1.5">
                  <span className={`text-sm font-mono px-2 py-1 rounded ${typeColor}`}>
                    {r.root}
                  </span>
                  <span className="text-xs text-stone-500 dark:text-stone-400">{typeLabel}</span>
                  <span className="text-sm text-stone-700 dark:text-stone-300">{r.meaning}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 短语 */}
      {word.phrases && word.phrases.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <span>🔗</span>
            <span>常用短语</span>
            <span className="text-xs text-stone-500 dark:text-stone-400 ml-auto">共 {word.phrases.length} 个</span>
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {word.phrases.map((p, i) => (
              <div key={i} className="flex items-start gap-2 py-1.5 border-b border-stone-100 dark:border-stone-700 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{p.phrase}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">{p.translation}</p>
                </div>
                <TTSButton text={p.phrase} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* v1.5-D3: AI 推荐短语用法 */}
      <div className="card">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <span>💡</span>
          <span>AI 短语用法</span>
        </h3>
        <UsageButton
          word={word.word}
          translation={word.translations[0] || ''}
        />
      </div>

      {/* v1.8-A: D3 LLM Tutor 2.0 完整版 (语法讲解) */}
      <div className="card">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <span>📖</span>
          <span>AI 语法讲解</span>
        </h3>
        <GrammarButton
          word={word.word}
          pos={word.pos[0] || 'noun'}
          translation={word.translations[0] || ''}
        />
      </div>

      {/* 例句 */}
      <div className="card">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <span>💬</span>
          <span>场景例句</span>
          {word.examples.length > 1 && (
            <span className="text-xs text-stone-500 dark:text-stone-400 ml-auto">
              {showAllExamples ? '收起' : `展开全部 ${word.examples.length} 句`}
            </span>
          )}
        </h3>
        <div className="space-y-3">
          {visibleExamples.map((ex, i) => (
            <div key={i} className="border-l-2 border-brand-300 dark:border-brand-700 pl-3">
              <div className="flex items-start gap-2">
                <p className="flex-1 text-base">{ex.en}</p>
                <TTSButton text={ex.en} size="sm" />
              </div>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">{ex.zh}</p>
              {ex.scene && (
                <span className="inline-block text-[10px] mt-1 px-1.5 py-0.5 bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400 rounded">
                  {ex.scene}
                </span>
              )}
            </div>
          ))}
        </div>
        {word.examples.length > 1 && (
          <button
            onClick={() => setShowAllExamples(!showAllExamples)}
            className="w-full mt-3 text-sm text-brand-600 hover:underline"
          >
            {showAllExamples ? '收起' : '查看更多例句'}
          </button>
        )}
      </div>

      {/* 跟读练习 */}
      <PronunciationPractice key={word.id} word={word.word} />

      {/* 自评 */}
      <div className="card">
        <h3 className="font-semibold mb-3">认识这个单词吗?</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleReview(true)}
            className="btn bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 hover:bg-brand-200"
          >
            ✓ 认识
          </button>
          <button
            onClick={() => handleReview(false)}
            className="btn bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200"
          >
            ✗ 不认识
          </button>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-3 text-center">
          系统会按记忆曲线安排复习时间
        </p>
      </div>
    </div>
  )
}
