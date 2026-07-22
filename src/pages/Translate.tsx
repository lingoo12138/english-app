// 翻译页 - v0.11 多渠道版本
import { useState } from 'react'
import { useStore } from '../store/useStore'
import { translate as doTranslate } from '../lib/translate'

type Direction = 'auto' | 'en2zh' | 'zh2en'

export default function Translate() {
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

  const provider = allTranslateProviders.find(p => p.id === translateProviderId)

  const handleTranslate = async () => {
    if (loading) return  // 修复 P1-1: 防 race
    if (!text.trim() || !provider) return
    setLoading(true)
    setError('')
    setResult('')
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
    } catch (e: any) {
      setError(e.message || '翻译失败,请检查网络或 API 配置')
    } finally {
      setLoading(false)
    }
  }

  const swap = () => {
    if (direction === 'en2zh') setDirection('zh2en')
    else if (direction === 'zh2en') setDirection('en2zh')
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold mb-1">翻译</h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm">多渠道翻译,选适合自己的</p>
      </div>

      {/* 渠道选择 */}
      <div>
        <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">翻译渠道</label>
        <select
          value={translateProviderId}
          onChange={(e) => setTranslateProviderId(e.target.value)}
          className="input"
        >
          {allTranslateProviders.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}{p.apiKeyRequired ? ' 🔑' : ''}{p.free ? ' ✓' : ''}{!p.builtin ? ' 🛠' : ''}
            </option>
          ))}
        </select>
        {provider?.description && (
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5">{provider.description}</p>
        )}
        {provider?.apiKeyRequired && !translateApiKeys[provider.id] && provider.id !== 'llm' && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
            ⚠️ 需要在 <a href="/settings" className="underline">设置 → 翻译渠道</a> 配置 Key
          </p>
        )}
        {provider?.id === 'llm' && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
            走 LLM 翻译,需要 LLM 渠道配置
          </p>
        )}
      </div>

      {/* 方向切换 */}
      <div className="flex items-center gap-2">
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as Direction)}
          className="input flex-1"
        >
          <option value="auto">自动检测</option>
          <option value="en2zh">英 → 中</option>
          <option value="zh2en">中 → 英</option>
        </select>
        <button onClick={swap} className="btn-ghost">
          ⇄
        </button>
      </div>

      {/* 输入 */}
      <div>
        <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">原文</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="输入要翻译的内容..."
          className="input min-h-[120px] resize-y"
        />
      </div>

      <button
        onClick={handleTranslate}
        disabled={loading || !text.trim() || !provider}
        className="btn-primary w-full disabled:opacity-50"
      >
        {loading ? '翻译中...' : '翻译'}
      </button>

      {error && (
        <div className="card border border-red-200 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
          ⚠️ {error}
        </div>
      )}

      {result && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-stone-500 dark:text-stone-400">译文</span>
            {source && <span className="text-xs text-stone-400 dark:text-stone-300">via {source}</span>}
          </div>
          <p className="text-lg leading-relaxed">{result}</p>
          <button
            onClick={() => navigator.clipboard.writeText(result)}
            className="btn-ghost text-sm mt-3"
          >
            📋 复制
          </button>
        </div>
      )}
    </div>
  )
}
