// WordNetwork.tsx - v1.85-A 触类旁通 (Word Network)
// 4 个 tab: 同根 / 同义 / 反义 / 搭配
// 点词跳转 /words/:id, 空态提示 "暂无相关词"
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getRelatedByRoot,
  getRelatedSynonym,
  getRelatedAntonym,
  getRelatedCollocation,
  findWordByName,
  isInWordList,
  type NetworkType,
} from '../lib/wordNetwork'

interface Props {
  /** 当前词 (主词) */
  word: string
}

type TabConfig = {
  key: NetworkType
  label: string
  icon: string
  color: string  // tailwind 主题色
  /** 描述 (用于 tooltip / accessibility) */
  desc: string
}

const TABS: TabConfig[] = [
  { key: 'root', label: '同根', icon: '🌱', color: 'emerald', desc: '同词根/词缀的词' },
  { key: 'synonym', label: '近义', icon: '📚', color: 'amber', desc: '同义词/近义词' },
  { key: 'antonym', label: '反义', icon: '⚖️', color: 'rose', desc: '反义词' },
  { key: 'collocation', label: '搭配', icon: '🔗', color: 'sky', desc: '共享短语的词' },
]

/** 单个 tab 的内容区 */
function WordGrid({
  words,
  color,
  emptyHint,
  onPick,
  inWordList,
}: {
  words: string[]
  color: string
  emptyHint: string
  onPick: (w: string) => void
  inWordList: Set<string>
}) {
  if (words.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-stone-400 dark:text-stone-500">
        {emptyHint}
      </div>
    )
  }
  return (
    <div className="flex flex-wrap gap-2">
      {words.map((w) => {
        // v1.86: 区分可点 (在词库) / 不可点 (仅参考, 灰色 + cursor-not-allowed)
        const known = inWordList.has(w.toLowerCase())
        return (
          <button
            key={w}
            onClick={() => onPick(w)}
            className={`px-3 py-1.5 text-sm rounded-lg font-mono transition-colors ${
              known
                ? `bg-${color}-50 dark:bg-${color}-900/20 text-${color}-700 dark:text-${color}-300 hover:bg-${color}-100 dark:hover:bg-${color}-900/40 border border-${color}-200 dark:border-${color}-800`
                : 'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 border border-stone-200 dark:border-stone-700 cursor-not-allowed line-through'
            }`}
            title={known ? `跳转到 ${w}` : `${w} (未学, 仅参考)`}
            disabled={!known}
          >
            {w}
            {!known && <span className="ml-1 text-[9px]">🆕</span>}
          </button>
        )
      })}
    </div>
  )
}

export function WordNetwork({ word }: Props) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<NetworkType>('root')
  const [data, setData] = useState<Record<NetworkType, string[]>>({
    root: [],
    synonym: [],
    antonym: [],
    collocation: [],
  })
  const [loading, setLoading] = useState(false)
  const [loadedTabs, setLoadedTabs] = useState<Set<NetworkType>>(new Set())
  // v1.86: 词库中有的词集合 (用于 UI 区分可点/不可点)
  const [inWordList, setInWordList] = useState<Set<string>>(new Set())

  // v1.85-A: 加载所有 4 类 (并行, 用 getFullNetwork 简化)
  // 注: 用单个 useEffect 避免 4 个 tab 各自加载的重复
  useEffect(() => {
    if (!word) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      getRelatedByRoot(word),
      getRelatedSynonym(word),
      getRelatedAntonym(word),
      getRelatedCollocation(word),
    ])
      .then(([root, synonym, antonym, collocation]) => {
        if (cancelled) return
        setData({ root, synonym, antonym, collocation })
        setLoadedTabs(new Set<NetworkType>(['root', 'synonym', 'antonym', 'collocation']))
        // v1.86: 一次性计算 inWordList (4 类合并)
        const all = [...root, ...synonym, ...antonym, ...collocation]
        Promise.all(all.map(w => isInWordList(w)))
          .then(results => {
            if (cancelled) return
            const set = new Set<string>()
            all.forEach((w, i) => { if (results[i]) set.add(w.toLowerCase()) })
            setInWordList(set)
          })
          .catch(e => console.error('[WordNetwork] isInWordList failed:', e))
      })
      .catch((e) => {
        if (cancelled) return
        console.error('[WordNetwork] load failed:', e)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [word])

  // 跳词
  const handlePick = useCallback(async (target: string) => {
    const w = await findWordByName(target)
    if (w) {
      navigate(`/words/${w.id}`)
    } else {
      // 词不在 words.json 中 (生词), 仍可跳到列表搜索
      navigate(`/words?q=${encodeURIComponent(target)}`)
    }
  }, [navigate])

  // 颜色映射 (避免 Tailwind purge 误删)
  const colorMap: Record<NetworkType, { bg: string; text: string; border: string; ring: string }> = {
    root:        { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', ring: 'ring-emerald-500' },
    synonym:     { bg: 'bg-amber-50 dark:bg-amber-900/20',     text: 'text-amber-700 dark:text-amber-300',     border: 'border-amber-200 dark:border-amber-800',     ring: 'ring-amber-500' },
    antonym:     { bg: 'bg-rose-50 dark:bg-rose-900/20',       text: 'text-rose-700 dark:text-rose-300',       border: 'border-rose-200 dark:border-rose-800',       ring: 'ring-rose-500' },
    collocation: { bg: 'bg-sky-50 dark:bg-sky-900/20',         text: 'text-sky-700 dark:text-sky-300',         border: 'border-sky-200 dark:border-sky-800',         ring: 'ring-sky-500' },
  }

  return (
    <div>
      {/* 4 个 tab */}
      <div className="flex items-center gap-1 mb-3 border-b border-stone-200 dark:border-stone-700 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key
          const count = data[tab.key].length
          const c = colorMap[tab.key]
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5
                ${isActive
                  ? `${c.text} border-b-2 ${c.border.replace('border-', 'border-b-')} -mb-px`
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                }`}
              title={tab.desc}
              aria-label={tab.desc}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.bg} ${c.text}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
        {loading && (
          <span className="ml-auto text-xs text-stone-400">⏳ 加载中...</span>
        )}
      </div>

      {/* 当前 tab 内容 */}
      {TABS.map((tab) => {
        if (tab.key !== activeTab) return null
        const words = data[tab.key]
        const c = colorMap[tab.key]
        return (
          <div key={tab.key} className="space-y-2">
            <div className="text-xs text-stone-500 dark:text-stone-400">
              {tab.desc}
            </div>
            {loadedTabs.has(tab.key) ? (
              <WordGrid
                words={words}
                color={tab.color}
                emptyHint="暂无相关词"
                onPick={handlePick}
                inWordList={inWordList}
              />
            ) : (
              <div className="text-center py-6 text-sm text-stone-400">加载中...</div>
            )}
            {/* 调试信息 (data 字段) - 仅当有数据时显示 */}
            {words.length > 0 && (
              <div className={`text-[10px] mt-2 ${c.text} opacity-50`}>
                共 {words.length} 个
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
