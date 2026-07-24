// ErrorExplainButton.tsx - v1.2-D2 错题讲解按钮 (复用组件)
// 3 处复用: WritePage 错题面板 / AIChat 纠错面板 / ErrorsPage 时间 Tab
import { useState } from 'react'
import { explainError, type ErrorExplanation } from '../lib/llmTutor'
import { getOrCreateExplanation } from '../lib/db'
import { useStore } from '../store/useStore'
import { BUILTIN_LLM_PROVIDERS, type LLMProvider } from '../lib/providers/llm'
import { toast } from './Toast'

interface Props {
  type: string
  original: string
  suggestion: string
  /** 自定义样式 (WritePage 错题面板 vs ErrorsPage 等) */
  variant?: 'inline' | 'block'
}

export function ErrorExplainButton({ type, original, suggestion, variant = 'inline' }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [explanation, setExplanation] = useState<ErrorExplanation | null>(null)

  const handleClick = async () => {
    if (open && explanation) {
      setOpen(false)
      return
    }
    if (loading) return  // v1.6 bugfix: 防重复点击
    setOpen(true)
    setLoading(true)  // v1.6 bugfix: 显示加载状态
    // 先查缓存
    const key = `${type}::${original.trim().toLowerCase()}::${suggestion.trim().toLowerCase()}`.slice(0, 200)
    try {
      const cached = await getOrCreateExplanation(key, async () => {
        // 缓存 miss, 调 LLM
        const llmProviderId = useStore.getState().llmProviderId
        const llmApiKeys = useStore.getState().llmApiKeys
        const llmModels = useStore.getState().llmModels
        const customLlmProviders = useStore.getState().customLlmProviders
        const allProviders = [...BUILTIN_LLM_PROVIDERS, ...customLlmProviders]
        const provider = allProviders.find(p => p.id === llmProviderId)
        if (!provider) {
          throw new Error('未选择 LLM 渠道')
        }
        const result = await explainError(
          provider,
          llmApiKeys[llmProviderId],
          llmModels[llmProviderId],
          type,
          original,
          suggestion,
        )
        return { rule: result.rule, examples: result.examples, mnemonic: result.mnemonic }
      })
      setExplanation({ ...cached, cached: cached.cached })
    } catch (e: unknown) { const err = e instanceof Error ? e : new Error(String(e))
      console.error(e)
      toast.error(`讲解失败: ${err.message || '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={variant === 'block' ? 'w-full' : 'inline'}>
      <button
        onClick={handleClick}
        disabled={loading}
        className="text-xs text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50"
      >
        {loading ? '⏳ 加载中...' : open ? '✕ 收起' : '📚 解释'}
      </button>
      {open && explanation && (
        <div className="mt-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-xs space-y-2 border border-purple-200 dark:border-purple-800">
          {explanation.cached && (
            <div className="text-[10px] text-purple-500 dark:text-purple-400">📦 来自缓存</div>
          )}
          <div>
            <div className="font-semibold text-purple-700 dark:text-purple-300 mb-0.5">📐 规则</div>
            <div className="text-stone-700 dark:text-stone-300 whitespace-pre-line">{explanation.rule}</div>
          </div>
          {explanation.examples && (
            <div>
              <div className="font-semibold text-purple-700 dark:text-purple-300 mb-0.5">💡 例句</div>
              <div className="text-stone-700 dark:text-stone-300 whitespace-pre-line">{explanation.examples}</div>
            </div>
          )}
          {explanation.mnemonic && (
            <div>
              <div className="font-semibold text-purple-700 dark:text-purple-300 mb-0.5">🧠 口诀</div>
              <div className="text-stone-700 dark:text-stone-300">{explanation.mnemonic}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
