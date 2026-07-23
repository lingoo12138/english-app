// UsageButton.tsx - v1.5-D3 单词短语用法
import { useState } from 'react'
import { explainUsage, type UsageExplanation } from '../lib/llmTutor'
import { getOrCreateExplanation } from '../lib/db'
import { useStore } from '../store/useStore'
import { BUILTIN_LLM_PROVIDERS } from '../lib/providers/llm'
import { toast } from './Toast'

interface Props {
  word: string
  translation: string
}

export function UsageButton({ word, translation }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [usage, setUsage] = useState<UsageExplanation | null>(null)

  const handleClick = async () => {
    if (open && usage) {
      setOpen(false)
      return
    }
    setOpen(true)
    const key = `usage::${word.trim().toLowerCase()}`.slice(0, 200)
    try {
      const llmProviderId = useStore.getState().llmProviderId
      const llmApiKeys = useStore.getState().llmApiKeys
      const llmModels = useStore.getState().llmModels
      const customLlmProviders = useStore.getState().customLlmProviders
      const allProviders = [...BUILTIN_LLM_PROVIDERS, ...customLlmProviders]
      const provider = allProviders.find(p => p.id === llmProviderId)
      if (!provider) {
        toast.error('未选择 LLM 渠道')
        return
      }
      const cached = await getOrCreateExplanation(key, async () => {
        const result = await explainUsage(
          provider,
          llmApiKeys[llmProviderId],
          llmModels[llmProviderId],
          word,
          translation,
        )
        return { rule: JSON.stringify({ phrases: result.phrases, tip: result.tip }), examples: '', mnemonic: '' }
      })
      // rule 字段实际是 JSON 字符串 (复用 errorExplanations 表)
      try {
        const parsed = JSON.parse(cached.rule)
        setUsage({
          phrases: parsed.phrases || [],
          tip: parsed.tip || '',
          cached: cached.cached,
        })
      } catch {
        setUsage({ phrases: [], tip: cached.rule, cached: cached.cached })
      }
    } catch (e: unknown) { const err = e instanceof Error ? e : new Error(String(e))
      console.error(e)
      toast.error(`加载失败: ${err.message || '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
      >
        {loading ? '⏳ 加载中...' : open ? '✕ 收起' : '💡 短语用法'}
      </button>
      {open && usage && (
        <div className="mt-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-sm space-y-2 border border-indigo-200 dark:border-indigo-800">
          {usage.cached && (
            <div className="text-[10px] text-indigo-500 dark:text-indigo-400">📦 来自缓存</div>
          )}
          {usage.phrases.length > 0 && (
            <div className="space-y-2">
              {usage.phrases.map((p, i) => (
                <div key={i} className="border-l-2 border-indigo-400 pl-2">
                  <div className="font-semibold text-indigo-700 dark:text-indigo-300 font-mono">
                    {p.phrase}
                  </div>
                  <div className="text-xs text-stone-600 dark:text-stone-400 mb-0.5">
                    {p.meaning}
                  </div>
                  {p.example && (
                    <div className="text-xs text-stone-700 dark:text-stone-300 italic">
                      💬 {p.example}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {usage.tip && (
            <div className="text-xs text-stone-600 dark:text-stone-400 pt-2 border-t border-indigo-200 dark:border-indigo-800">
              <span className="font-medium text-indigo-700 dark:text-indigo-300">🧠 小贴士: </span>
              {usage.tip}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
