import { useState } from 'react'
import { translate } from '../lib/translate'

export default function Translate() {
  const [text, setText] = useState('')
  const [result, setResult] = useState('')
  const [source, setSource] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  type Direction = 'auto' | 'en2zh' | 'zh2en'
  const [direction, setDirection] = useState<Direction>('auto')

  const handleTranslate = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError('')
    setResult('')
    try {
      let from: 'auto' | 'en' | 'zh' = 'auto'
      let to: 'en' | 'zh' = 'zh'
      if (direction === 'en2zh') { from = 'en'; to = 'zh' }
      else if (direction === 'zh2en') { from = 'zh'; to = 'en' }
      else {
        // auto: 简单判断 (中文为主则翻英, 反之翻中)
        const hasChinese = /[\u4e00-\u9fa5]/.test(text)
        from = hasChinese ? 'zh' : 'en'
        to = hasChinese ? 'en' : 'zh'
      }
      const res = await translate(text, from, to)
      setResult(res.translatedText)
      setSource(res.source)
    } catch (e: any) {
      setError(e.message || '翻译失败,请检查网络')
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
        <p className="text-stone-500 text-sm">基于 LibreTranslate · MyMemory 公共 API</p>
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
        <label className="text-sm text-stone-500 mb-1.5 block">原文</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="输入要翻译的内容..."
          className="input min-h-[120px] resize-y"
        />
      </div>

      <button
        onClick={handleTranslate}
        disabled={loading || !text.trim()}
        className="btn-primary w-full disabled:opacity-50"
      >
        {loading ? '翻译中...' : '翻译'}
      </button>

      {error && (
        <div className="card border border-red-200 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-stone-500">译文</span>
            {source && <span className="text-xs text-stone-400">via {source}</span>}
          </div>
          <p className="text-lg leading-relaxed">{result}</p>
          <button
            onClick={() => navigator.clipboard.writeText(result)}
            className="mt-3 text-sm text-brand-600 hover:underline"
          >
            📋 复制结果
          </button>
        </div>
      )}

      <div className="text-xs text-stone-400 text-center py-4">
        翻译 API 由开源社区提供,可能偶尔不稳定
      </div>
    </div>
  )
}
