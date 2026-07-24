// 写作批改 + 中译英 - v1.10.0-A
// v0.23: 英文批改 (用户粘贴英文 → LLM 改错 → 标色 diff → 一键收藏错句)
// v1.10.0-A: 加 "中译英" Tab (中文 → 英文翻译 + 等级 + 备选译法 + 注释)
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { chatCompletion } from '../lib/providers/llm'
import { saveWritingError, getAllWritingErrors, deleteWritingError, type WritingError } from '../lib/db'
import { addFavorite } from '../lib/db'
import { addErrorWordsToFavorites } from '../lib/errorReview'
import { loadWords } from '../lib/words'
import { Modal } from '../components/Modal'
import { ErrorExplainButton } from '../components/ErrorExplainButton'
import { toast } from '../components/Toast'

type WritingErrorType = 'grammar' | 'vocab' | 'spelling' | 'style' | 'tense' | 'preposition' | 'article' | 'other'

interface ReviewError {
  original: string
  suggestion: string
  type: WritingErrorType
  explanation: string
  severity: number
}

interface ReviewResult {
  corrected: string
  errors: ReviewError[]
}

// === v1.10.0-A: 中译英协议 ===
type ChineseLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

interface ChineseAlternative {
  en: string
  why_better: string
}

export interface ChineseResult {
  translation: string
  level: ChineseLevel
  alternatives: ChineseAlternative[]
  notes: string
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

export const CHINESE_SYSTEM_PROMPT = `You are an English translator for Chinese learners.
Translate the user's Chinese text into natural English, and return strict JSON:
{
  "translation": "<the most natural English translation>",
  "level": "A1|A2|B1|B2|C1|C2",
  "alternatives": [
    { "en": "<alternative English>", "why_better": "<when to use this variant, in Chinese, 1 short sentence>" }
  ],
  "notes": "<concise grammar/vocab notes in Chinese, 1-2 sentences explaining key choices>"
}
Level guide:
- A1: 基础 (基本句式, 高频词)
- A2: 初级 (日常表达, 简单从句)
- B1: 中级 (工作/学习常用)
- B2: 中高级 (较复杂表达)
- C1: 高级 (地道表达)
- C2: 精通 (母语级)
Only return valid JSON. Do NOT add explanations outside JSON.`

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

  // 英文批改 state
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ReviewResult | null>(null)
  const [error, setError] = useState('')
  // v1.10.0-A: 加 'chinese' Tab
  const [activeTab, setActiveTab] = useState<'write' | 'chinese' | 'history'>('write')
  const [history, setHistory] = useState<WritingError[]>([])
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [addedWords, setAddedWords] = useState<Set<string>>(new Set())
  const [todayCount, setTodayCount] = useState(0)
  // 中译英 state
  const [chineseInput, setChineseInput] = useState('')
  const [chineseResult, setChineseResult] = useState<ChineseResult | null>(null)
  const [chineseError, setChineseError] = useState('')
  const [chineseLoading, setChineseLoading] = useState(false)
  const DAILY_LIMIT = 20

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    const raw = localStorage.getItem('write-count-' + today)
    setTodayCount(Number(raw) || 0)
  }, [])

  // v1.6 bugfix: 切回 write/chinese tab 不重置 input/result/addedWords,避免用户输入丢失
  // (历史 Tab 加载历史时, 只有 loadHistory 需要; write/chinese tab state 由用户操作控制)
  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory()
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

    // v1.6 bugfix: 用截断后的 text 变量, 避免 LLM 收到超长 input
    const text = input.length > MAX_LEN ? input.slice(0, MAX_LEN) : input
    if (input.length > MAX_LEN) {
      setError(`文本超过 ${MAX_LEN} 字符(当前 ${input.length}),已截断`)
      setInput(text)
    }

    setLoading(true)
    setError('')
    setResult(null)
    setAddedWords(new Set())

    try {
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

      // v1.1-D1: 错词自动入复习
      if (parsed.errors.length > 0) {
        const added = await addErrorWordsToFavorites({
          source: 'write',
          original: text,
          corrected: parsed.corrected,
          errors: parsed.errors.map(e => ({ ...e, type: e.type as any })),
          ts: Date.now(),
        } as any)
        if (added.length > 0) {
          toast.success(`已加入 ${added.length} 个错词到复习队列`)
        }
      }

      // 累加今日次数
      const newCount = todayCount + 1
      setTodayCount(newCount)
      const today = new Date().toISOString().slice(0, 10)
      localStorage.setItem('write-count-' + today, String(newCount))
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e))
      console.error(e)
      setError(err.message || '批改失败,请重试')
    } finally {
      setLoading(false)
    }
  }

  // === v1.10.0-A: 中译英 handle ===
  const handleTranslate = async () => {
    if (!chineseInput.trim()) {
      setChineseError('请输入要翻译的中文')
      return
    }
    if (!provider) {
      setChineseError('未选择 LLM 渠道,请先在设置中选择')
      return
    }
    if (provider.apiKeyRequired && !apiKey) {
      setChineseError(`请先在设置中为 ${provider.name} 配置 API Key,或选 Mock 渠道`)
      return
    }
    if (todayCount >= DAILY_LIMIT) {
      setChineseError(`今日批改已达上限 ${DAILY_LIMIT} 次,明天再来`)
      return
    }

    // v1.6 bugfix: 用截断后的 text 变量, 避免 LLM 收到超长 input
    const text = chineseInput.length > MAX_LEN ? chineseInput.slice(0, MAX_LEN) : chineseInput
    if (chineseInput.length > MAX_LEN) {
      setChineseError(`文本超过 ${MAX_LEN} 字符(当前 ${chineseInput.length}),已截断`)
      setChineseInput(text)
    }

    setChineseLoading(true)
    setChineseError('')
    setChineseResult(null)

    try {
      // mock 渠道 或无 apiKey 时走 mock fallback
      const useMock = provider.id === 'mock' || (provider.apiKeyRequired && !apiKey)
      let parsed: ChineseResult
      if (useMock) {
        parsed = mockChineseTranslation(text)
      } else {
        const llmResp = await chatCompletion({
          provider,
          apiKey,
          model,
          messages: [
            { role: 'system', content: CHINESE_SYSTEM_PROMPT },
            { role: 'user', content: text },
          ],
          temperature: 0.4,
          maxTokens: 800,
        })
        parsed = parseChineseResult(llmResp.content, text)
      }
      setChineseResult(parsed)

      // 保存到历史 (source: 'chinese', errors: [])
      await saveWritingError({
        source: 'chinese',
        original: text,
        corrected: parsed.translation,
        errors: [],
        ts: Date.now(),
      })

      // 累加今日次数
      const newCount = todayCount + 1
      setTodayCount(newCount)
      const today = new Date().toISOString().slice(0, 10)
      localStorage.setItem('write-count-' + today, String(newCount))
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e))
      console.error(e)
      setChineseError(err.message || '翻译失败,请重试')
    } finally {
      setChineseLoading(false)
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
    // v1.10.0-A: 中译英历史 → 切 chinese tab, 显示简版结果
    if (item.source === 'chinese') {
      setActiveTab('chinese')
      setChineseInput(item.original)
      setChineseResult({
        translation: item.corrected,
        level: 'A1',
        alternatives: [],
        notes: '来自历史记录',
      })
      return
    }
    setActiveTab('write')
    setInput(item.original)
    setResult({
      corrected: item.corrected,
      errors: item.errors,
    })
  }

  const handleDeleteHistory = async (id: number) => {
    setPendingDeleteId(id)
  }
  const doDeleteHistory = async () => {
    if (pendingDeleteId == null) return
    const id = pendingDeleteId
    setPendingDeleteId(null)
    await deleteWritingError(id)
    await loadHistory()
  }

  return (
    <div className="space-y-4">
      <Modal
        open={pendingDeleteId != null}
        title="删除作文记录"
        message="确定删除这条记录?"
        variant="danger"
        confirmText="删除"
        onConfirm={doDeleteHistory}
        onCancel={() => setPendingDeleteId(null)}
      />
      <div>
        <h1 className="text-2xl font-bold mb-1">✍️ 写作批改</h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm">
          粘贴或输入一段英文(≤{MAX_LEN} 字符),AI 帮你找出错误并改正 · 或中文翻译成英文
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          今日已用 {todayCount}/{DAILY_LIMIT} 次 · 渠道: {provider?.name || '未选择'}
        </p>
      </div>

      {/* Tab */}
      <div className="flex gap-2 flex-wrap">
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
          onClick={() => setActiveTab('chinese')}
          className={`px-3 py-1.5 rounded text-sm ${
            activeTab === 'chinese'
              ? 'bg-brand-500 text-white'
              : 'bg-stone-100 dark:bg-stone-800'
          }`}
        >
          🌐 中译英
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
              onKeyDown={(e) => {
                // P2 优化: Ctrl+Enter / Cmd+Enter 触发批改
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault()
                  if (!loading && input.trim() && provider) {
                    handleReview()
                  }
                }
              }}
              placeholder="例如: I go to school yesterday and play with my friend. (Ctrl+Enter 批改)"
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
                        <ErrorExplainButton
                          type={err.type}
                          original={err.original}
                          suggestion={err.suggestion}
                        />
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

      {activeTab === 'chinese' && (
        <>
          <div className="card space-y-3">
            <label className="text-sm font-medium">中文</label>
            <textarea
              value={chineseInput}
              onChange={(e) => setChineseInput(e.target.value)}
              onKeyDown={(e) => {
                // Ctrl+Enter / Cmd+Enter 触发翻译
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault()
                  if (!chineseLoading && chineseInput.trim() && provider) {
                    handleTranslate()
                  }
                }
              }}
              placeholder="例: 我昨天去了学校 (Ctrl+Enter 翻译)"
              className="input min-h-24 resize-y"
              maxLength={MAX_LEN}
            />
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>{chineseInput.length}/{MAX_LEN} 字符</span>
              <button
                onClick={handleTranslate}
                disabled={chineseLoading || !chineseInput.trim() || !provider}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {chineseLoading ? '⏳ 翻译中...' : '🌐 翻译'}
              </button>
            </div>
            {chineseError && (
              <p className="text-xs text-red-600 dark:text-red-400">⚠️ {chineseError}</p>
            )}
          </div>

          {chineseResult && (
            <>
              {/* 译文 + 等级 */}
              <div className="card">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">🌐 译文</h3>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                    chineseResult.level === 'A1' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                    chineseResult.level === 'A2' ? 'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300' :
                    chineseResult.level === 'B1' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' :
                    chineseResult.level === 'B2' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' :
                    chineseResult.level === 'C1' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                    'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                  }`}>
                    {chineseResult.level}
                  </span>
                </div>
                <p className="text-sm bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded leading-relaxed">
                  {chineseResult.translation}
                </p>
              </div>

              {/* 备选译法 */}
              {chineseResult.alternatives.length > 0 && (
                <div className="card">
                  <h3 className="text-sm font-semibold mb-2">🔀 备选译法 ({chineseResult.alternatives.length})</h3>
                  <div className="space-y-2">
                    {chineseResult.alternatives.map((alt, i) => (
                      <div
                        key={i}
                        className="text-sm p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800"
                      >
                        <p className="font-mono text-xs text-blue-700 dark:text-blue-300 mb-1">
                          {alt.en}
                        </p>
                        <p className="text-xs text-stone-600 dark:text-stone-400">
                          💡 {alt.why_better}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 注释 */}
              {chineseResult.notes && (
                <div className="card">
                  <h3 className="text-sm font-semibold mb-2">📝 注释</h3>
                  <p className="text-sm text-stone-700 dark:text-stone-300 bg-stone-50 dark:bg-stone-800/50 p-3 rounded leading-relaxed">
                    {chineseResult.notes}
                  </p>
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
                    <span className="flex items-center gap-2">
                      {new Date(item.ts).toLocaleString()}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        item.source === 'chinese'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          : item.source === 'write'
                          ? 'bg-stone-100 text-stone-700 dark:bg-stone-700 dark:text-stone-200'
                          : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                      }`}>
                        {item.source === 'chinese' ? '中译英' : item.source === 'write' ? '批改' : item.source}
                      </span>
                    </span>
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
                    {item.source === 'chinese'
                      ? `中文: ${item.original} → ${item.corrected}`
                      : item.original}
                  </p>
                  {item.source === 'write' && item.errors.length > 0 && (
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
      errors: Array.isArray(obj.errors) ? obj.errors.map((e: unknown) => {
        const err = e as Record<string, unknown>
        const validTypes = ['grammar', 'vocab', 'spelling', 'style', 'tense', 'preposition', 'article', 'other'] as const
        const t = String(err.type || 'other')
        return {
          original: String(err.original || ''),
          suggestion: String(err.suggestion || ''),
          type: (validTypes as readonly string[]).includes(t) ? t as WritingErrorType : 'other',
          explanation: String(err.explanation || ''),
          severity: typeof err.severity === 'number' ? err.severity : 0.5,
        }
      }) : [],
    }
  } catch (e) {
    console.error('parseResult 失败:', e, jsonStr)
    return { corrected: content, errors: [] }
  }
}

// === v1.10.0-A: 中译英 parse + mock ===

/** 解析 LLM 中译英 JSON 响应(容错 markdown fence),失败时 fallback 显示原文 */
export function parseChineseResult(content: string, originalChinese: string): ChineseResult {
  const trimmed = content.trim()
  let jsonStr = trimmed
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]+?)\s*```/)
  if (fenceMatch) jsonStr = fenceMatch[1].trim()
  const first = jsonStr.indexOf('{')
  const last = jsonStr.lastIndexOf('}')
  if (first >= 0 && last > first) {
    jsonStr = jsonStr.slice(first, last + 1)
  }
  try {
    const obj = JSON.parse(jsonStr)
    const validLevels: ChineseLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
    const level = String(obj.level || 'A1') as ChineseLevel
    return {
      translation: String(obj.translation || originalChinese),
      level: (validLevels as readonly string[]).includes(level) ? level : 'A1',
      alternatives: Array.isArray(obj.alternatives) ? obj.alternatives.map((a: unknown) => {
        const alt = a as Record<string, unknown>
        return {
          en: String(alt.en || ''),
          why_better: String(alt.why_better || ''),
        }
      }) : [],
      notes: String(obj.notes || ''),
    }
  } catch (e) {
    console.error('parseChineseResult 失败:', e, jsonStr)
    return {
      translation: originalChinese,
      level: 'A1',
      alternatives: [],
      notes: '解析失败,显示原文',
    }
  }
}

/** 中译英 mock 翻译 (5 个常用句 fallback) */
export function mockChineseTranslation(input: string): ChineseResult {
  const trimmed = input.trim()
  // 精确匹配 5 句
  const mockMap: Record<string, ChineseResult> = {
    '我昨天去了学校': {
      translation: 'I went to school yesterday.',
      level: 'A1',
      alternatives: [
        { en: 'I went to school yesterday.', why_better: '最自然,时间状语在句末' },
        { en: 'Yesterday I went to school.', why_better: '强调时间,适合回答"你什么时候去的"' },
      ],
      notes: 'yesterday 用过去式 went,时间状语在英语中可前可后',
    },
    '我今天很开心': {
      translation: "I'm happy today.",
      level: 'A1',
      alternatives: [
        { en: "I'm happy today.", why_better: '最常用,直接表达心情' },
        { en: "I'm in a good mood today.", why_better: '更地道,"心情好"的常用说法' },
      ],
      notes: 'happy 形容词表示"开心的",与 I 连用加 be 动词',
    },
    '你能帮我吗?': {
      translation: 'Could you help me?',
      level: 'A2',
      alternatives: [
        { en: 'Could you help me?', why_better: '礼貌请求,用 could 比 can 更委婉' },
        { en: 'Can you help me?', why_better: '日常对话中更直接,口语常用' },
        { en: 'Would you mind helping me?', why_better: '非常礼貌,正式场合使用' },
      ],
      notes: 'help sb. with sth. / help sb. do sth.,注意 help 后的介词搭配',
    },
    '我正在找工作': {
      translation: "I'm looking for a job.",
      level: 'B1',
      alternatives: [
        { en: "I'm looking for a job.", why_better: '强调"正在找"的过程,最常用' },
        { en: "I'm hunting for a job.", why_better: '更口语化,美式英语常用' },
        { en: "I'm seeking employment.", why_better: '正式/简历中常用,employment 更书面' },
      ],
      notes: 'look for = 寻找(过程),find = 找到(结果);job = 工作(口语),employment = 就业(正式)',
    },
    '我期待你的回复': {
      translation: "I'm looking forward to hearing from you.",
      level: 'B1',
      alternatives: [
        { en: "I'm looking forward to hearing from you.", why_better: '最常用,邮件/正式场合适用' },
        { en: 'I look forward to your reply.', why_better: '更正式的邮件结尾,省略主语' },
        { en: "Hope to hear from you soon.", why_better: '更口语化,朋友之间也可用' },
      ],
      notes: 'look forward to + 动名词(to 是介词不是不定式);hear from sb. = 收到某人的来信/消息',
    },
  }

  if (mockMap[trimmed]) {
    return mockMap[trimmed]
  }
  // 模糊匹配 (去除标点和空格)
  const normalized = trimmed.replace(/[，。？！、,.?!;:：;]/g, '')
  for (const key of Object.keys(mockMap)) {
    if (key.replace(/[，。？！、,.?!;:：;]/g, '') === normalized) {
      return mockMap[key]
    }
  }
  // 无匹配 → fallback 简单翻译
  return {
    translation: `[Mock] ${trimmed}`,
    level: 'A1',
    alternatives: [],
    notes: 'Mock 渠道不支持此句,显示原文;请选真实 LLM 渠道获得翻译',
  }
}
