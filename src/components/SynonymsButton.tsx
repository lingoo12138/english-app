// src/components/SynonymsButton.tsx - W133 UI 改版稿 (0 emoji + Icon SVG)
// 同义词辨析按钮 — 0 emoji (W118 Icon 化) + 状态色 (W113) + W123d 风格
// 复用 UsageButton 模式 (loading 状态 + setLoading(true) 修复)
import { useState } from 'react'
import { getSynonyms, type SynonymExplanation } from '../lib/synonyms'
import { useStore } from '../store/useStore'
import { BUILTIN_LLM_PROVIDERS, type LLMProvider } from '../lib/providers/llm'
import { toast } from './Toast'
import {
  IconSparkles,
  IconClose,
  IconRefresh,
  IconBookOpen,
  IconStar,
  IconArrow,
} from './Icon'

interface Props {
  word: string
  pos: string
  translation: string
}

// W133: 同 义 词 状 态 色 (W113 规 范, 跟 同 义 词 主 题 amber/红 错 警 双 色)
const STATE_SUCCESS = 'var(--state-success)'
const STATE_WARNING = 'var(--state-warning)'
const STATE_ERROR = 'var(--state-error)'

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
        setLoading(false)
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

  // W113 同 义 词 3 状 态: 成 功 (有 同 义 词) / 警 告 (0 同 义 词 但 有 混 淆 词) / 错 误 (空 结 果)
  const isSuccess = !!explanation && explanation.synonyms.length > 0
  const isWarning = !!explanation && explanation.synonyms.length === 0 && explanation.confused.length > 0
  const isError = !!explanation && explanation.synonyms.length === 0 && explanation.confused.length === 0

  return (
    <div>
      {/* W133 触 发 按 钮: 圆 形 Icon + 文 字 (0 emoji) */}
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 disabled:opacity-50 transition-colors duration-[var(--t-fast)] active:scale-95"
        aria-label={loading ? '正在加载同义词' : open ? '收起同义词' : '查看同义词辨析'}
      >
        {loading ? (
          <>
            <IconRefresh size={14} className="animate-spin" />
            加载中...
          </>
        ) : open ? (
          <>
            <IconClose size={14} />
            收起
          </>
        ) : (
          <>
            <IconSparkles size={14} />
            同义词
          </>
        )}
      </button>
      {open && explanation && (
        <div
          className="mt-3 p-3 rounded-lg text-sm space-y-3 border card card-interactive"
          style={{
            backgroundColor: 'rgb(254, 243, 199 / 0.2)',
            borderColor: isError ? STATE_ERROR : isWarning ? STATE_WARNING : STATE_SUCCESS,
          }}
        >
          {/* 状 态 头 - 大 圆 环 + 词 源 + 缓 存 提 示 (W124 Bento 风格) */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center border-2 flex-shrink-0"
              style={{
                borderColor: isError ? STATE_ERROR : isWarning ? STATE_WARNING : STATE_SUCCESS,
                backgroundColor: 'rgb(254, 243, 199 / 0.5)',
              }}
              aria-hidden="true"
            >
              <IconSparkles size={16} className="text-amber-700 dark:text-amber-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium text-amber-800 dark:text-amber-300 text-base">
                  {word}
                </span>
                <span className="text-xs text-stone-500">·</span>
                <span className="text-xs text-stone-600 dark:text-stone-400 truncate">
                  {translation}
                </span>
              </div>
              {explanation.cached && (
                <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                  <IconBookOpen size={10} />
                  来自缓存 / Mock
                </div>
              )}
            </div>
          </div>

          {/* 同 义 词 列 表 */}
          {explanation.synonyms.length > 0 && (
            <div>
              <div className="font-semibold text-amber-700 dark:text-amber-300 mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <IconBookOpen size={12} />
                同义词 ({explanation.synonyms.length})
              </div>
              <div className="space-y-1.5">
                {explanation.synonyms.map((s, i) => (
                  <div
                    key={i}
                    className="border-l-2 pl-2"
                    style={{ borderColor: STATE_SUCCESS }}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-medium text-amber-800 dark:text-amber-300 text-sm">
                        {s.word}
                      </span>
                      <span className="text-xs text-stone-500">·</span>
                      <span className="text-xs text-stone-600 dark:text-stone-400">{s.nuance}</span>
                    </div>
                    {s.example && (
                      <div className="text-xs text-stone-700 dark:text-stone-300 italic flex items-start gap-1 mt-0.5">
                        <IconArrow size={10} className="mt-0.5 flex-shrink-0 text-stone-400" />
                        <span>{s.example}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 容 易 混 淆 */}
          {explanation.confused.length > 0 && (
            <div>
              <div
                className="font-semibold mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-wider"
                style={{ color: 'rgb(185, 28, 28)' }}
              >
                <IconStar size={12} />
                容易混淆 ({explanation.confused.length})
              </div>
              <div className="space-y-1.5">
                {explanation.confused.map((c, i) => (
                  <div
                    key={i}
                    className="border-l-2 pl-2 text-xs"
                    style={{ borderColor: STATE_ERROR }}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-medium text-stone-800 dark:text-stone-200">
                        {c.word}
                      </span>
                    </div>
                    <div className="text-stone-600 dark:text-stone-400">{c.diff}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 空 态 提 示 (W113 错 误 状 态 色) */}
          {isError && (
            <div
              className="text-xs text-stone-500 dark:text-stone-400 px-2 py-1.5 rounded"
              style={{
                backgroundColor: 'rgb(254, 226, 226 / 0.3)',
                borderLeft: `3px solid ${STATE_ERROR}`,
              }}
            >
              暂无同义词 / 混淆词数据
            </div>
          )}
        </div>
      )}
    </div>
  )
}
