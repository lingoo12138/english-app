// 写作批改 - v0.23
// 用户粘贴英文 → LLM 改错 → 标色 diff → 一键收藏错句
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { chatCompletion, LLMProvider } from '../lib/providers/llm'
import { saveWritingError, getAllWritingErrors, deleteWritingError, type WritingError } from '../lib/db'
import { addFavorite } from '../lib/db'
import { loadWords } from '../lib/words'

interface ReviewError {
  original: string
  suggestion: string
  type: string
  explanation: string
  severity: number
}

interface ReviewResult {
  corrected: string
  errors: ReviewError[]
}

const SYSTEM_PROMPT = `You are an English writing tutor for Chinese learners.
Analyze the user's English text and return strict JSON:
{
  "corrected": "<fully corrected English version>",
  "errors": [
    {
      "original": "<the exact wrong phrase from original>",
      "suggestion": "<the correct phrase>",
      "type": "grammar|vocab|spelling|style|tense|preposition|article|other",
      "explanation": "<concise explanation in Chinese, 1-2 sentences>",
      "severity": <0.0-1.0>
    }
  ]
}
Only return valid JSON. If no errors, return {"corrected": "<original>", "errors": []}.
Do NOT add explanations outside JSON.`

const MAX_LEN = 500

export default function WritePage() {
  const llmProviderId = useStore(s => s.llmProviderId)
  const llmProviders = useStore(s => s.llmProviders)
  const customLlmProviders = useStore(s => s.customLlmProviders)
  const llmApiKeys = useStore(s => s.llmApiKeys)
  const llmModels = useStore(s => s.llmModels)

  const allProviders = [...llmProviders, ...customLlmProviders]
  const provider = allProviders.find(p => p.id === llmProviderId)
  const apiKey = provider ? (llmApiKeys[provider.id] || '') : ''
  const model = provider ? (llmModels[provider.id] || provider.defaultModel) : ''

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ReviewResult | null>(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'write' | 'history'>('write')
  const [history, setHistory] = useState<WritingError[]>([])
  const [addedWords, setAddedWords] = useState<Set<string>>(new Set())
  const [todayCount, setTodayCount] = useState(0)
  const DAILY_LIMIT = 20

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    const raw = localStorage.getItem('write-count-' + today)
    setTodayCount(Number(raw) || 0)
  }, [])

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory()
    } else {
      // 切回 write tab: 重置 input/result/addedWords/error,避免跨 tab 状态污染
      setInput('')
      setResult(null)
      setError('')
      setAddedWords(new Set())
    }
  }, [activeTab])

  const loadHistory = async () => {
    const list = await getAllWritingErrors()
    setHistory(list)
  }

  const handleReview = async () => {
    if (!input.trim()) {
      setError('请输入要批改的英文')
      return
    }
    if (input.length > MAX_LEN) {
      setError(`文本超过 ${MAX_LEN} 字符(当前 ${input.length}),已截断`)
      setInput(input.slice(0, MAX_LEN))
    }
    if (!provider) {
      setError('未选择 LLM 渠道,请先在设置中选择')
      return
    }
    if (provider.apiKeyRequired && !apiKey) {
      setError(`请先在设置中为 ${provider.name} 配置 API Key,或选 Mock 渠道`)
      return
    }
    if (todayCount >= DAILY_LIMIT) {
      setError(`今日批改已达上限 ${DAILY_LIMIT} 次,明天再来`)
      return
    }

    setLoading(true)
    setError('')
    setResult(null)
    setAddedWords(new Set())

    try {
      const text = input.slice(0, MAX_LEN)
      const llmResp = await chatCompletion({
        provider,
        apiKey,
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        maxTokens: 1500,
      })

      const parsed = parseResult(llmResp.content)
      setResult(parsed)

      // 保存到历史(转换 type 为字面量类型)
      await saveWritingError({
        source: 'write',
        original: text,
        corrected: parsed.corrected,
        errors: parsed.errors.map(e => ({ ...e, type: e.type as any })),
        ts: Date.now(),
      })

      // 累加今日次数
      const newCount = todayCount + 1
      setTodayCount(newCount)
      const today = new Date().toISOString().slice(0, 10)
      localStorage.setItem('write-count-' + today, String(newCount))
    } catch (e: any) {
      console.error(e)
      setError(e.message || '批改失败,请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleAddWord = async (word: string) => {
    if (addedWords.has(word)) return
    const allWords = await loadWords()
    const found = allWords.find(w => w.word.toLowerCase() === word.toLowerCase())
    if (found) {
      await addFavorite(found.id)
      setAddedWords(prev => new Set(prev).add(word))
    } else {
      setError(`词 "${word}" 不在词库,无法加入生词本`)
    }
  }

  const handleAddAllErrors = async () => {
    if (!result) return
    const allWords = await loadWords()
    const wordMap = new Map(allWords.map(w => [w.word.toLowerCase(), w.id]))
    let added = 0
    for (const err of result.errors) {
      const word = err.suggestion.toLowerCase().split(/\s+/)[0]
      const id = wordMap.get(word)
      if (id && !addedWords.has(word)) {
        await addFavorite(id)
        setAddedWords(prev => new Set(prev).add(word))
        added++
      }
    }
    if (added === 0) {
      setError('错词都不在词库,无法加入')
    }
  }

  const handleHistoryItem = (item: WritingError) => {
    setActiveTab('write')
    setInput(item.original)
    setResult({
      corrected: item.corrected,
      errors: item.errors,
    })
  }

  const handleDeleteHistory = async (id: number) => {
    if (!confirm('确定删除这条记录?')) return
    await deleteWritingError(id)
    await loadHistory()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold mb-1">✍️ 写作批改</h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm">
          粘贴或输入一段英文(≤{MAX_LEN} 字符),AI 帮你找出错误并改正
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          今日已用 {todayCount}/{DAILY_LIMIT} 次 · 渠道: {provider?.name || '未选择'}
        </p>
      </div>

      {/* Tab */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('write')}
          className={`px-3 py-1.5 rounded text-sm ${
            activeTab === 'write'
              ? 'bg-brand-500 text-white'
              : 'bg-stone-100 dark:bg-stone-800'
          }`}
        >
          ✍️ 批改
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-3 py-1.5 rounded text-sm ${
            activeTab === 'history'
              ? 'bg-brand-500 text-white'
              : 'bg-stone-100 dark:bg-stone-800'
          }`}
        >
          📚 我的作文 ({history.length})
        </button>
      </div>

      {activeTab === 'write' && (
        <>
          <div className="card space-y-3">
            <label className="text-sm font-medium">原文</label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例如: I go to school yesterday and play with my friend."
              className="input min-h-32 resize-y"
              maxLength={MAX_LEN}
            />
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>{input.length}/{MAX_LEN} 字符</span>
              <button
                onClick={handleReview}
                disabled={loading || !input.trim() || !provider}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {loading ? '⏳ 批改中...' : '✏️ 开始批改'}
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-600 dark:text-red-400">⚠️ {error}</p>
            )}
          </div>

          {result && (
            <>
              {/* 改后 */}
              <div className="card">
                <h3 className="text-sm font-semibold mb-2">✅ 改正后</h3>
                <p className="text-sm bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded leading-relaxed">
                  {result.corrected}
                </p>
              </div>

              {/* 错误列表 */}
              {result.errors.length > 0 ? (
                <div className="card">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold">📋 错误清单 ({result.errors.length})</h3>
                    <button
                      onClick={handleAddAllErrors}
                      className="btn-ghost text-xs"
                    >
                      ⭐ 一键加入生词本
                    </button>
                  </div>
                  <div className="space-y-2">
                    {result.errors.map((err, i) => (
                      <div
                        key={i}
                        className="text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-red-600 dark:text-red-400 line-through font-mono text-xs">
                            {err.original}
                          </span>
                          <span>→</span>
                          <span className="text-emerald-700 dark:text-emerald-300 font-mono text-xs">
                            {err.suggestion}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded">
                            {err.type}
                          </span>
                          <span className="text-[10px] text-stone-500">
                            严重度 {(err.severity * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 dark:text-stone-400 mb-1">
                          {err.explanation}
                        </p>
                        <button
                          onClick={() => handleAddWord(err.suggestion.split(/\s+/)[0])}
                          disabled={addedWords.has(err.suggestion.split(/\s+/)[0].toLowerCase())}
                          className="text-xs text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50 disabled:no-underline"
                        >
                          {addedWords.has(err.suggestion.split(/\s+/)[0].toLowerCase())
                            ? '✓ 已加入生词本'
                            : '⭐ 加入生词本'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="card text-center text-sm text-stone-500 py-6">
                  🎉 没有发现错误,写得不错!
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <div className="card">
          {history.length === 0 ? (
            <p className="text-sm text-stone-500 dark:text-stone-400 text-center py-6">
              还没有作文记录
            </p>
          ) : (
            <div className="space-y-3">
              {history.map(item => (
                <div
                  key={item.id}
                  className="border border-stone-200 dark:border-stone-700 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2 text-xs text-stone-500">
                    <span>{new Date(item.ts).toLocaleString()}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleHistoryItem(item)}
                        className="text-brand-600 hover:underline"
                      >
                        打开
                      </button>
                      <button
                        onClick={() => item.id && handleDeleteHistory(item.id)}
                        className="text-red-500 hover:underline"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-stone-600 dark:text-stone-400 mb-1 line-clamp-2">
                    {item.original}
                  </p>
                  {item.errors.length > 0 && (
                    <p className="text-xs text-red-600">
                      {item.errors.length} 个错误
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 底部链接 */}
      <div className="text-center text-xs text-stone-500 dark:text-stone-400 py-2">
        💡 改错仅供参考,人工判断最准 ·{' '}
        <Link to="/chat" className="text-brand-600 hover:underline">
          AI 对话陪练
        </Link>
      </div>
    </div>
  )
}

/** 解析 LLM 返回的 JSON(容错 markdown fence) */
function parseResult(content: string): ReviewResult {
  const trimmed = content.trim()
  // 移除 markdown fence
  let jsonStr = trimmed
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]+?)\s*```/)
  if (fenceMatch) jsonStr = fenceMatch[1].trim()
  // 找第一个 { 最后一个 }
  const first = jsonStr.indexOf('{')
  const last = jsonStr.lastIndexOf('}')
  if (first >= 0 && last > first) {
    jsonStr = jsonStr.slice(first, last + 1)
  }
  try {
    const obj = JSON.parse(jsonStr)
    return {
      corrected: String(obj.corrected || ''),
      errors: Array.isArray(obj.errors) ? obj.errors.map((e: any) => {
        const validTypes = ['grammar', 'vocab', 'spelling', 'style', 'tense', 'preposition', 'article', 'other'] as const
        const t = String(e.type || 'other')
        return {
          original: String(e.original || ''),
          suggestion: String(e.suggestion || ''),
          type: (validTypes as readonly string[]).includes(t) ? t as any : 'other',
          explanation: String(e.explanation || ''),
          severity: typeof e.severity === 'number' ? e.severity : 0.5,
        }
      }) : [],
    }
  } catch (e) {
    console.error('parseResult 失败:', e, jsonStr)
    return { corrected: content, errors: [] }
  }
}
