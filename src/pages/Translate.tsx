// src/pages/Translate.tsx - W133 UI 改版稿 (0 emoji + W123d 顶 部 + W113 v2 card)
// 翻 译 页: 多 渠 道 翻 译 选 择 + 原文输入 + 翻 译 结 果
// 风 格 跟 W126 一 致: W123d 3 圆 顶 部 + card card-interactive + 状态色 + motion token + 暗 色
// W121 风 格: openGroups 折 叠 + localStorage 持 久 化
// W123a 移 动 端: sticky bottom + safe-area-inset-bottom
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslate } from '../lib/useTranslate'
import { useStore } from '../store/useStore'
import { translate as doTranslate } from '../lib/translate'
import {
  IconArrow,
  IconSparkles,
  IconSettings,
  IconRefresh,
  IconShare,
  IconClose,
  IconEdit,
  IconStar,
} from '../components/Icon'
import { SkeletonPage } from '../components/Skeleton'

type Direction = 'auto' | 'en2zh' | 'zh2en'

const STORAGE_KEY = 'translate-open-groups-v1'

// W133: 翻 译 状 态 3 色 (W113 规 范)
const STATE_SUCCESS = 'var(--state-success)'
const STATE_WARNING = 'var(--state-warning)'
const STATE_ERROR = 'var(--state-error)'

export default function Translate() {
  const { t } = useTranslate()
  const navigate = useNavigate()
  const translateProviders = useStore(s => s.translateProviders)
  const customTranslateProviders = useStore(s => s.customTranslateProviders)
  const allTranslateProviders = [...translateProviders, ...customTranslateProviders]
  const translateProviderId = useStore(s => s.translateProviderId)
  const setTranslateProviderId = useStore(s => s.setTranslateProviderId)
  const llmProviders = useStore(s => s.llmProviders)
  const llmApiKeys = useStore(s => s.llmApiKeys)
  const translateApiKeys = useStore(s => s.translateApiKeys)

  const [text, setText] = useState('')
  const [result, setResult] = useState('')
  const [source, setSource] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [direction, setDirection] = useState<Direction>('auto')
  const [copied, setCopied] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  // W121: openGroups 折 叠 + localStorage 持 久 化
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw)
    } catch { /* ignore */ }
    return { provider: true, direction: true }
  })
  const toggleGroup = (key: string) => setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }))

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups)) } catch { /* ignore */ }
  }, [openGroups])

  // 初始 加载 完 成 (非 真 正 异 步 — 渠 道 列 表 来 自 store, 但 仍 走 Skeleton 缓 冲 一 帧)
  useEffect(() => {
    const id = setTimeout(() => setInitialLoading(false), 100)
    return () => clearTimeout(id)
  }, [])

  const provider = allTranslateProviders.find(p => p.id === translateProviderId)

  const handleTranslate = async () => {
    if (loading) return  // 修复 P1-1: 防 race
    if (!text.trim() || !provider) return
    setLoading(true)
    setError('')
    setResult('')
    setCopied(false)
    try {
      let from: 'auto' | 'en' | 'zh' = 'auto'
      let to: 'en' | 'zh' = 'zh'
      if (direction === 'en2zh') { from = 'en'; to = 'zh' }
      else if (direction === 'zh2en') { from = 'zh'; to = 'en' }
      else {
        const hasChinese = /[\u4e00-\u9fa5]/.test(text)
        from = hasChinese ? 'zh' : 'en'
        to = hasChinese ? 'en' : 'zh'
      }
      const res = await doTranslate({
        provider,
        text,
        from,
        to,
        apiKeys: { ...llmApiKeys, ...translateApiKeys },
        llmProviders,
      })
      setResult(res.text)
      setSource(res.source)
    } catch (e: unknown) { const err = e instanceof Error ? e : new Error(String(e))
      setError(err.message || '翻译失败,请检查网络或 API 配置')
    } finally {
      setLoading(false)
    }
  }

  const swap = useCallback(() => {
    if (direction === 'en2zh') setDirection('zh2en')
    else if (direction === 'zh2en') setDirection('en2zh')
  }, [direction])

  const handleCopy = useCallback(async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (e: unknown) {
      console.error('[Translate] copy failed:', e)
    }
  }, [result])

  const handleClear = useCallback(() => {
    setText('')
    setResult('')
    setError('')
    setSource('')
    setCopied(false)
  }, [])

  if (initialLoading) {
    return <SkeletonPage />
  }

  // W113 翻 译 状 态 色: 成 功 / 警 告 / 错 误 (3 状 态 色)
  const charCount = text.length
  const showWarning = charCount > 500
  const showError = charCount > 2000

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* W123d 顶 部: 标 题 居 中 + 3 圆 形 Icon 按 钮 (返 回 / 占 位 / 清 除) */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition-colors duration-[var(--t-fast)]"
          aria-label="返回上一页"
        >
          <span className="inline-block rotate-180"><IconArrow size={16} /></span>
        </button>
        <h1 className="text-lg font-bold flex items-center gap-2">
          <IconSparkles size={20} className="text-brand-500" />
          {t('translate.title')}
        </h1>
        <button
          onClick={handleClear}
          className="w-9 h-9 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition-colors duration-[var(--t-fast)]"
          aria-label="清空输入和结果"
          title="清空"
        >
          <IconClose size={16} />
        </button>
      </div>

      {/* 渠 道 选 择 - W121 折 叠 + W113 v2 card */}
      <div className="border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleGroup('provider')}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors duration-[var(--t-fast)]"
          aria-expanded={openGroups.provider}
          aria-label="翻译渠道配置"
        >
          <span className="flex items-center gap-1.5">
            <IconSettings size={12} strokeWidth={2.5} />
            翻译渠道
            {provider && (
              <span className="ml-1 text-[10px] normal-case font-normal text-stone-500">
                · {provider.name}
              </span>
            )}
          </span>
          <span
            className="inline-block transition-transform duration-[var(--t-base)] ease-[var(--ease-spring)]"
            style={{ transform: openGroups.provider ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          >
            <IconArrow size={12} strokeWidth={2.5} />
          </span>
        </button>
        {openGroups.provider && (
          <div className="p-3 border-t border-stone-200 dark:border-stone-700 space-y-2">
            <select
              value={translateProviderId}
              onChange={(e) => setTranslateProviderId(e.target.value)}
              className="input"
              aria-label="选择翻译渠道"
            >
              {allTranslateProviders.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {provider?.description && (
              <p className="text-xs text-stone-500 dark:text-stone-400">{provider.description}</p>
            )}
            {provider?.apiKeyRequired && !translateApiKeys[provider.id] && provider.id !== 'llm' && (
              <p
                className="text-xs px-2 py-1.5 rounded-lg border"
                style={{
                  color: 'rgb(217, 119, 6)',
                  backgroundColor: 'rgb(254, 243, 199 / 0.3)',
                  borderColor: STATE_WARNING,
                }}
              >
                需要在 <a href="/settings" className="underline">设置 → 翻译渠道</a> 配置 Key
              </p>
            )}
            {provider?.id === 'llm' && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                走 LLM 翻译,需要 LLM 渠道配置
              </p>
            )}
          </div>
        )}
      </div>

      {/* 方向 切 换 - W121 折 叠 + 3 圆 按 钮 (Auto/En→Zh/Zh→En) */}
      <div className="border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleGroup('direction')}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors duration-[var(--t-fast)]"
          aria-expanded={openGroups.direction}
          aria-label="翻译方向配置"
        >
          <span className="flex items-center gap-1.5">
            <IconRefresh size={12} strokeWidth={2.5} />
            翻译方向
            <span className="ml-1 text-[10px] normal-case font-normal text-stone-500">
              · {direction === 'auto' ? '自动' : direction === 'en2zh' ? '英 → 中' : '中 → 英'}
            </span>
          </span>
          <span
            className="inline-block transition-transform duration-[var(--t-base)] ease-[var(--ease-spring)]"
            style={{ transform: openGroups.direction ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          >
            <IconArrow size={12} strokeWidth={2.5} />
          </span>
        </button>
        {openGroups.direction && (
          <div className="p-3 border-t border-stone-200 dark:border-stone-700">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex gap-1.5">
                <button
                  onClick={() => setDirection('auto')}
                  className={`flex-1 px-2 py-1.5 rounded-full text-sm font-medium transition-all duration-[var(--t-fast)] ease-[var(--ease)] ${
                    direction === 'auto'
                      ? 'bg-brand-500 text-white shadow-[0_2px_6px_rgba(34,197,94,0.3)]'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                  aria-label="自动检测方向"
                >
                  自动
                </button>
                <button
                  onClick={() => setDirection('en2zh')}
                  className={`flex-1 px-2 py-1.5 rounded-full text-sm font-medium transition-all duration-[var(--t-fast)] ease-[var(--ease)] ${
                    direction === 'en2zh'
                      ? 'bg-brand-500 text-white shadow-[0_2px_6px_rgba(34,197,94,0.3)]'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                  aria-label="英语翻译为中文"
                >
                  英 → 中
                </button>
                <button
                  onClick={() => setDirection('zh2en')}
                  className={`flex-1 px-2 py-1.5 rounded-full text-sm font-medium transition-all duration-[var(--t-fast)] ease-[var(--ease)] ${
                    direction === 'zh2en'
                      ? 'bg-brand-500 text-white shadow-[0_2px_6px_rgba(34,197,94,0.3)]'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                  aria-label="中文翻译为英语"
                >
                  中 → 英
                </button>
              </div>
              <button
                onClick={swap}
                disabled={direction === 'auto'}
                className="w-9 h-9 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition-colors duration-[var(--t-fast)] disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="交换源语言和目标语言"
                title="交换语言"
              >
                <IconRefresh size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 原 文 输 入 - W113 v2 card-interactive + 状态色 + sticky bottom */}
      <div className="card card-interactive space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
            <IconEdit size={12} />
            原文
          </span>
          <span
            className="text-xs font-mono tabular-nums"
            style={{
              color: showError
                ? 'rgb(220, 38, 38)'
                : showWarning
                ? 'rgb(217, 119, 6)'
                : 'rgb(120, 113, 108)',
            }}
          >
            {charCount} / 2000
          </span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="输入要翻译的内容..."
          className="input min-h-[120px] resize-y font-mono tabular-nums"
          aria-label="原文输入"
          maxLength={2500}
        />
      </div>

      {/* 提 交 按 钮 + 移 动 端 sticky bottom + safe-area-inset-bottom */}
      <div
        className="sticky bottom-0 bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm -mx-4 px-4 pt-2 border-t border-stone-100 dark:border-stone-800 z-10"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <button
          onClick={handleTranslate}
          disabled={loading || !text.trim() || !provider}
          className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-brand-500 text-white rounded-full text-sm font-medium hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-[var(--t-fast)] active:scale-95 shadow-[0_2px_6px_rgba(34,197,94,0.3)]"
          aria-label={loading ? '正在翻译' : '开始翻译'}
        >
          {loading ? (
            <>
              <IconRefresh size={14} className="animate-spin" />
              翻译中...
            </>
          ) : (
            <>
              <IconSparkles size={14} />
              翻译
            </>
          )}
        </button>
      </div>

      {/* 错 误 - W113 状态色 (--state-error) */}
      {error && (
        <div
          className="card border text-sm flex items-start gap-2"
          style={{
            borderColor: STATE_ERROR,
            backgroundColor: 'rgb(254, 226, 226 / 0.3)',
          }}
        >
          <IconClose size={14} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <span className="text-red-700 dark:text-red-300">{error}</span>
        </div>
      )}

      {/* 译 文 - W113 v2 card-interactive + 大圆环状态指示 */}
      {result && (
        <div className="card card-interactive space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
              <IconSparkles size={12} className="text-brand-500" />
              译文
            </span>
            {source && (
              <span className="text-[10px] text-stone-400 dark:text-stone-500 font-mono tabular-nums">
                via {source}
              </span>
            )}
          </div>

          {/* 大 圆 环 状 态 指 示 (W124 Bento) */}
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center border-2 flex-shrink-0"
              style={{ borderColor: STATE_SUCCESS, backgroundColor: 'rgb(220, 252, 231 / 0.3)' }}
              aria-label="翻译成功"
            >
              <IconSparkles size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-base leading-relaxed flex-1 font-mono">{result}</p>
          </div>

          {/* 操 作 按钮 行 */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCopy}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-[var(--t-fast)] active:scale-95"
              style={{
                backgroundColor: copied
                  ? 'rgb(220, 252, 231)'
                  : 'rgb(245, 245, 244)',
                color: copied
                  ? 'rgb(22, 101, 52)'
                  : 'rgb(82, 82, 82)',
              }}
              aria-label={copied ? '已复制' : '复制译文'}
            >
              <IconShare size={14} />
              {copied ? '已复制' : '复制'}
            </button>
            <button
              onClick={() => navigate('/translation-favs')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors duration-[var(--t-fast)] active:scale-95"
              aria-label="查看翻译收藏"
            >
              <IconStar size={14} />
              收藏
            </button>
          </div>
        </div>
      )}

      {/* 空 态 - 0 emoji, Icon 提示 */}
      {!result && !error && !loading && (
        <div className="card text-center py-8 space-y-2">
          <div
            className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-stone-100 dark:bg-stone-800"
            aria-hidden="true"
          >
            <IconSparkles size={24} className="text-stone-400" />
          </div>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            输入原文,选择渠道,点击翻译
          </p>
        </div>
      )}
    </div>
  )
}
