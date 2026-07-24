// GrammarButton.tsx - v1.8-A D3 LLM Tutor 2.0 完整版 (语法讲解按钮)
// 复用 UsageButton 模式 (loading 状态 / setLoading(true) 修复)
import { useState } from 'react'
import { explainGrammar, type GrammarExplanation } from '../lib/llmTutor'
import { useStore } from '../store/useStore'
import { BUILTIN_LLM_PROVIDERS, type LLMProvider } from '../lib/providers/llm'
import { toast } from './Toast'

interface Props {
  word: string
  pos: string
  translation: string
}

export function GrammarButton({ word, pos, translation }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [explanation, setExplanation] = useState<GrammarExplanation | null>(null)

  const handleClick = async () => {
    if (open && explanation) {
      setOpen(false)
      return
    }
    if (loading) return  // 防重复点击
    setOpen(true)
    setLoading(true)  // 显示加载状态
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
      const result = await explainGrammar(
        provider,
        llmApiKeys[llmProviderId],
        llmModels[llmProviderId],
        word,
        pos,
        translation,
      )
      setExplanation(result)
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e))
      console.error(e)
      toast.error(`语法讲解失败: ${err.message || '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50"
      >
        {loading ? '⏳ 加载中...' : open ? '✕ 收起' : '📖 语法讲解'}
      </button>
      {open && explanation && (
        <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-sm space-y-2 border border-emerald-200 dark:border-emerald-800">
          {explanation.cached && (
            <div className="text-[10px] text-emerald-500 dark:text-emerald-400">📦 来自缓存/Mock</div>
          )}
          <div>
            <div className="font-semibold text-emerald-700 dark:text-emerald-300 mb-0.5">📐 定义</div>
            <div className="text-stone-700 dark:text-stone-300">{explanation.definition}</div>
          </div>
          {explanation.usage && (
            <div>
              <div className="font-semibold text-emerald-700 dark:text-emerald-300 mb-0.5">📏 语法</div>
              <div className="text-stone-700 dark:text-stone-300 whitespace-pre-line">{explanation.usage}</div>
            </div>
          )}
          {explanation.examples.length > 0 && (
            <div>
              <div className="font-semibold text-emerald-700 dark:text-emerald-300 mb-0.5">💡 例句</div>
              <div className="space-y-1.5">
                {explanation.examples.map((ex, i) => (
                  <div key={i} className="border-l-2 border-emerald-300 pl-2">
                    <div className="text-stone-800 dark:text-stone-200 font-mono text-xs">{ex.en}</div>
                    <div className="text-stone-500 dark:text-stone-400 text-xs">{ex.zh}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {explanation.commonMistakes.length > 0 && (
            <div>
              <div className="font-semibold text-emerald-700 dark:text-emerald-300 mb-0.5">⚠️ 易错点</div>
              <div className="space-y-1.5">
                {explanation.commonMistakes.map((m, i) => (
                  <div key={i} className="border-l-2 border-red-300 pl-2 text-xs">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="line-through text-stone-500 dark:text-stone-400 font-mono">{m.wrong}</span>
                      <span>→</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">{m.right}</span>
                    </div>
                    <div className="text-stone-500 dark:text-stone-400">{m.why}</div>
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
