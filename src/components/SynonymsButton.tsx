// SynonymsButton.tsx - v1.10.0-B 同义词辨析按钮
// 复用 UsageButton 模式 (loading 状态 + setLoading(true) 修复)
import { useState } from 'react'
import { getSynonyms, type SynonymExplanation } from '../lib/synonyms'
import { useStore } from '../store/useStore'
import { BUILTIN_LLM_PROVIDERS, type LLMProvider } from '../lib/providers/llm'
import { toast } from './Toast'

interface Props {
  word: string
  pos: string
  translation: string
}

export function SynonymsButton({ word, pos, translation }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [explanation, setExplanation] = useState<SynonymExplanation | null>(null)

  const handleClick = async () => {
    if (open && explanation) {
      setOpen(false)
      return
    }
    if (loading) return  // 防重复点击
    setOpen(true)
    setLoading(true)  // v1.6 bugfix: 显示加载状态
    try {
      const llmProviderId = useStore.getState().llmProviderId
      const llmApiKeys = useStore.getState().llmApiKeys
      const llmModels = useStore.getState().llmModels
      const customLlmProviders = useStore.getState().customLlmProviders
      const allProviders = [...BUILTIN_LLM_PROVIDERS, ...customLlmProviders]
      const provider: LLMProvider | undefined = allProviders.find(p => p.id === llmProviderId)
      if (!provider) {
        toast.error('未选择 LLM 渠道')
        return
      }
      const result = await getSynonyms(
        provider,
        llmApiKeys[llmProviderId],
        llmModels[llmProviderId],
        word,
        pos,
      )
      setExplanation(result)
    } catch (e: unknown) { const err = e instanceof Error ? e : new Error(String(e))
      console.error(e)
      toast.error(`同义词辨析失败: ${err.message || '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="text-sm text-amber-600 dark:text-amber-400 hover:underline disabled:opacity-50"
      >
        {loading ? '⏳ 加载中...' : open ? '✕ 收起' : '🔀 同义词'}
      </button>
      {open && explanation && (
        <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-sm space-y-2 border border-amber-200 dark:border-amber-800">
          {explanation.cached && (
            <div className="text-[10px] text-amber-500 dark:text-amber-400">📦 来自缓存/Mock</div>
          )}
          {explanation.synonyms.length > 0 && (
            <div>
              <div className="font-semibold text-amber-700 dark:text-amber-300 mb-0.5">📚 同义词 ({explanation.synonyms.length})</div>
              <div className="space-y-1.5">
                {explanation.synonyms.map((s, i) => (
                  <div key={i} className="border-l-2 border-amber-300 pl-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-medium text-amber-800 dark:text-amber-300">{s.word}</span>
                      <span className="text-xs text-stone-500">·</span>
                      <span className="text-xs text-stone-600 dark:text-stone-400">{s.nuance}</span>
                    </div>
                    {s.example && (
                      <div className="text-xs text-stone-700 dark:text-stone-300 italic">💬 {s.example}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {explanation.confused.length > 0 && (
            <div>
              <div className="font-semibold text-amber-700 dark:text-amber-300 mb-0.5">⚠️ 容易混淆</div>
              <div className="space-y-1.5">
                {explanation.confused.map((c, i) => (
                  <div key={i} className="border-l-2 border-red-300 pl-2 text-xs">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-medium text-stone-800 dark:text-stone-200">{c.word}</span>
                    </div>
                    <div className="text-stone-600 dark:text-stone-400">{c.diff}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
