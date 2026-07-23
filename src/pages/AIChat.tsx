// AI 对话陪练页 - v0.11 → v1.1-W1: confirm → Modal
import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { chat as aiChat, reviewMessage, type ChatMessage, type ReviewResult } from '../lib/aiChat'
import { saveChat, getAllChats, deleteChat, addFavorite, isFavorite, saveWritingError, getAllWritingErrors, type ChatRecord } from '../lib/db'
import { exportAllChats, downloadChatJson, exportChat } from '../lib/exportChat'
import TTSButton from '../components/TTSButton'
import { STTController, isSTTSupported } from '../lib/stt'
import { Modal } from '../components/Modal'
import { loadWords } from '../lib/words'
import { translate as translateText, BUILTIN_TRANSLATE_PROVIDERS } from '../lib/translate'

const SCENARIOS = [
  { id: 'cafe', name: '☕ 咖啡店', desc: '点单 / 咨询 / 结账' },
  { id: 'airport', name: '✈️ 机场', desc: '登机 / 安检 / 找登机口' },
  { id: 'shopping', name: '🛍️ 购物', desc: '看价 / 试穿 / 砍价' },
  { id: 'hotel', name: '🏨 酒店', desc: '入住 / 设施 / 退房' },
  { id: 'meeting', name: '💼 会议', desc: '介绍 / 汇报 / 讨论' },
]

const LEVELS: { id: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'; name: string }[] = [
  { id: 'A1', name: '入门' },
  { id: 'A2', name: '基础' },
  { id: 'B1', name: '中级' },
  { id: 'B2', name: '中高级' },
  { id: 'C1', name: '高级' },
  { id: 'C2', name: '母语级' },
]

export default function AIChat() {
  const llmProviders = useStore(s => s.llmProviders)
  const llmProviderId = useStore(s => s.llmProviderId)
  const llmApiKeys = useStore(s => s.llmApiKeys)
  const llmModels = useStore(s => s.llmModels)
  const scenario = useStore(s => s.chatScenario)
  const setScenario = useStore(s => s.setChatScenario)
  const level = useStore(s => s.chatLevel)
  const setLevel = useStore(s => s.setChatLevel)

  const [showHistory, setShowHistory] = useState(false)
  // W6 a11y: Esc 关闭历史侧栏
  useEffect(() => {
    if (!showHistory) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowHistory(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [showHistory])
  const [historyQuery, setHistoryQuery] = useState('')  // v0.22.7: 历史搜索
  const [historyFilter, setHistoryFilter] = useState<'all' | string>('all')  // v0.22.7: 按场景过滤

  // 加载历史对话列表
  useEffect(() => {
    refreshChats()
  }, [])

  const refreshChats = async () => {
    const list = await getAllChats()
    setChats(list)
  }

  // 加载历史对话
  const loadChat = async (chat: ChatRecord) => {
    setCurrentChatId(chat.id ?? null)
    setMessages(chat.messages.map(m => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content, ts: m.ts })))
    setScenario(chat.scenario)
    setLevel(chat.level as any)
    setShowHistory(false)
    // P1 修复: 加载历史对话时, 从 writingErrors 表补上 reviews (source: 'chat')
    try {
      const allErrors = await getAllWritingErrors()
      const chatErrors = allErrors.filter(e => e.source === 'chat')
      const userMsgs = chat.messages.filter(m => m.role === 'user')
      const newReviews: Record<string, ReviewResult> = {}
      for (const um of userMsgs) {
        // 匹配: original 内容相等 + ts 接近 (10分钟窗口)
        const match = chatErrors.find(e =>
          e.original === um.content &&
          Math.abs(e.ts - um.ts) < 10 * 60 * 1000,
        )
        if (match) {
          newReviews[um.id] = {
            hasError: true,
            errors: match.errors.map(er => ({
              original: er.original,
              fixed: er.suggestion,
              type: er.type as any,
              why: er.explanation,
              severity: er.severity,
            })),
          }
        }
      }
      setReviews(newReviews)
    } catch (e) {
      console.error('加载历史 reviews 失败', e)
    }
  }

  // 删除历史对话 — handle 函数 (state 声明在 line 128 后)
  // handleDeleteChat / doDeleteChat 会在 state 之后重新定义

  // 新对话
  const handleNewChat = () => {
    setCurrentChatId(null)
    setMessages([])
    setInput('')
    setSttInterim('')
    setReviews({})  // W2-A: 重置纠错状态
  }

  const [currentChatId, setCurrentChatId] = useState<number | null>(null)
  const [chats, setChats] = useState<ChatRecord[]>([])
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // 自动保存需要在 useState 之前声明依赖(loading 等)
  // 实际: 把 loading 声明提前到这里
  const [loadingEarly, setLoadingEarly] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  // W2-A: 实时纠错结果, key=msgId
  const [reviews, setReviews] = useState<Record<string, ReviewResult>>({})
  // 加载中 ref(避开 useEffect 依赖)
  const loadingRef = useRef(false)
  // P1-2 修: 请求 id 跟踪,避免切场景/level 后旧请求覆盖新结果
  const reqIdRef = useRef(0)
  // 加载中 ref 跟随 (避开 useEffect 依赖)

  // 自动保存到 IndexedDB(每条 AI 回复后)
  useEffect(() => {
    if (messages.length === 0) return
    if (loadingRef.current) return  // 避免保存中间态
    const save = async () => {
      // 标题自动生成: 用首条 user 消息前 30 字符
      const firstUser = messages.find(m => m.role === 'user')
      const title = firstUser
        ? firstUser.content.slice(0, 30) + (firstUser.content.length > 30 ? '...' : '')
        : '新对话'
      const record: ChatRecord = {
        id: currentChatId ?? undefined,
        scenario,
        level,
        title,
        messages: messages.map(m => ({ id: m.id, role: m.role as any, content: m.content, ts: m.ts })),
        createdAt: currentChatId ? (chats.find(c => c.id === currentChatId)?.createdAt ?? Date.now()) : Date.now(),
        updatedAt: Date.now(),
      }
      try {
        const newId = await saveChat(record)
        if (!currentChatId) setCurrentChatId(newId)
        refreshChats()
      } catch (e) {
        console.warn('保存对话失败', e)
      }
    }
    // 防抖 500ms
    const t = setTimeout(save, 500)
    return () => clearTimeout(t)
  }, [messages, currentChatId, scenario, level])

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sttActive, setSttActive] = useState(false)
  const [sttInterim, setSttInterim] = useState('')
  const sttControllerRef = useRef<STTController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const provider = llmProviders.find(p => p.id === llmProviderId)
  const apiKey = llmApiKeys[llmProviderId] || ''
  const model = llmModels[llmProviderId] || provider?.defaultModel || ''
  const needKey = provider?.apiKeyRequired && !apiKey

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleStartSTT = () => {
    if (!isSTTSupported()) {
      setError('当前浏览器不支持语音识别, 请用 Chrome/Edge/Safari 或键盘输入')
      return
    }
    if (sttActive) {
      sttControllerRef.current?.stop()
      return
    }
    setError('')
    setSttInterim('')
    const ctl = new STTController({
      onResult: (text, isFinal) => {
        if (isFinal) {
          // 最终结果,追加到 input
          setInput(prev => (prev ? prev + ' ' : '') + text)
          setSttInterim('')
        } else {
          setSttInterim(text)
        }
      },
      onError: (msg) => {
        setError('🎤 ' + msg)
        setSttActive(false)
      },
      onEnd: () => {
        setSttActive(false)
        setSttInterim('')
        sttControllerRef.current = null
      },
    })
    sttControllerRef.current = ctl
    ctl.start({ lang: 'en-US' })
    setSttActive(true)
  }

  useEffect(() => {
    return () => {
      sttControllerRef.current?.stop()
    }
  }, [])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    if (!provider) {
      setError('未选择 LLM 渠道')
      return
    }
    if (needKey) {
      setError(`请先在设置中为 ${provider.name} 配置 API Key,或选 Mock 渠道`)
      return
    }

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      ts: Date.now(),
    }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setError('')
    setLoading(true)
    const myReqId = ++reqIdRef.current  // P1-2 修: 每次发送自增

    // W2-A: 后台并行起纠错 (Mock 跳过)
    if (provider?.id !== 'mock') {
      reviewMessage(userMsg.content, level, provider, apiKey, model)
        .then((review) => {
          if (myReqId !== reqIdRef.current) return
          if (review.hasError) {
            setReviews(prev => ({ ...prev, [userMsg.id]: review }))
            // W2-A.3: 存到 IndexedDB
            saveWritingError({
              source: 'chat',
              original: userMsg.content,
              corrected: '',  // 实时纠错只给错误, 不给完整改正
              errors: review.errors.map(e => ({
                original: e.original,
                suggestion: e.fixed,
                type: e.type,
                explanation: e.why,
                severity: e.severity,
              })),
              ts: Date.now(),
            }).catch(console.error)
          }
        })
        .catch((e) => {
          if (myReqId !== reqIdRef.current) return
          console.error('纠错失败:', e)
        })
    }

    try {
      const reply = await aiChat(newMessages, { scenario, level }, provider, apiKey, model)
      if (myReqId !== reqIdRef.current) {
        // 已有新请求发出,旧请求丢弃
        return
      }
      setMessages([...newMessages, reply])
    } catch (e: any) {
      if (myReqId !== reqIdRef.current) return
      console.error(e)
      setError(e.message || 'AI 响应失败')
    } finally {
      if (myReqId === reqIdRef.current) {
        setLoading(false)
      }
    }
  }

  const handleReset = () => {
    if (messages.length > 0) setShowResetConfirm(true)
    else { setMessages([]); setError('') }
  }

  // 实际定义 handleDeleteChat / doDeleteChat
  const handleDeleteChat = async (id: number) => {
    setPendingDelete(id)
  }
  const doDeleteChat = async () => {
    if (pendingDelete == null) return
    const id = pendingDelete
    setPendingDelete(null)
    await deleteChat(id)
    if (id === currentChatId) {
      setCurrentChatId(null)
      setMessages([])
    }
    refreshChats()
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] md:h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold">💬 AI 对话陪练</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm">
            {provider?.name || '未选择渠道'} · {SCENARIOS.find(s => s.id === scenario)?.name} · {LEVELS.find(l => l.id === level)?.name}
          </p>
        </div>
        <button onClick={handleNewChat} className="btn-ghost text-sm">🆕 新对话</button>
        <button
          onClick={async () => {
            // v0.22.8: 导出全部对话
            const content = await exportAllChats()
            const date = new Date().toISOString().slice(0, 10)
            downloadChatJson(content, `chats-${date}.json`)
          }}
          className="btn-ghost text-sm"
        >
          📤 导出
        </button>
        <button onClick={() => setShowHistory(!showHistory)} className={`btn-ghost text-sm ${showHistory ? 'bg-brand-100 dark:bg-brand-900/30' : ''}`}>
          📚 历史 ({chats.length})
        </button>
      </div>

      {/* 场景 / 难度选择 */}
      <div className="space-y-2 mb-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SCENARIOS.map(s => (
            <button
              key={s.id}
              onClick={() => setScenario(s.id)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                scenario === s.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {LEVELS.map(l => (
            <button
              key={l.id}
              onClick={() => setLevel(l.id)}
              className={`px-3 py-1 rounded text-xs whitespace-nowrap ${
                level === l.id
                  ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 font-medium'
                  : 'text-stone-500 dark:text-stone-400'
              }`}
            >
              {l.name}
            </button>
          ))}
        </div>
      </div>

      {/* 历史侧栏 */}
      {showHistory && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">📚 历史对话 ({chats.length})</h2>
            <button onClick={() => setShowHistory(false)} className="text-xs text-stone-500">关闭</button>
          </div>
          {/* v0.22.7: 搜索 + 场景过滤 */}
          {chats.length > 0 && (
            <div className="space-y-2 mb-2">
              <div className="relative">
                <input
                  type="text"
                  value={historyQuery}
                  onChange={e => setHistoryQuery(e.target.value)}
                  placeholder="🔍 搜索标题/消息内容..."
                  className="input text-sm pr-8"
                />
                {historyQuery && (
                  <button
                    onClick={() => setHistoryQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    aria-label="清除"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1">
                <button
                  onClick={() => setHistoryFilter('all')}
                  className={`text-xs px-2 py-1 rounded shrink-0 ${
                    historyFilter === 'all' ? 'bg-brand-500 text-white' : 'bg-stone-100 dark:bg-stone-800'
                  }`}
                >
                  全部
                </button>
                {SCENARIOS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setHistoryFilter(s.id)}
                    className={`text-xs px-2 py-1 rounded shrink-0 ${
                      historyFilter === s.id ? 'bg-brand-500 text-white' : 'bg-stone-100 dark:bg-stone-800'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {chats.length === 0 ? (
            <p className="text-sm text-stone-500 dark:text-stone-400 text-center py-4">还没有对话记录</p>
          ) : (() => {
            // 过滤逻辑
            const q = historyQuery.trim().toLowerCase()
            const filtered = chats.filter(c => {
              if (historyFilter !== 'all' && c.scenario !== historyFilter) return false
              if (!q) return true
              // 搜标题/消息内容
              if (c.title.toLowerCase().includes(q)) return true
              return c.messages.some(m => m.content.toLowerCase().includes(q))
            })
            if (filtered.length === 0) {
              return (
                <p className="text-sm text-stone-500 dark:text-stone-400 text-center py-4">
                  没找到匹配 "{historyQuery}" 的对话
                </p>
              )
            }
            return (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filtered.map(c => (
                  <div
                    key={c.id}
                    className={`p-2 rounded border ${c.id === currentChatId ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-stone-200 dark:border-stone-700'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => loadChat(c)}>
                        <div className="font-medium text-sm truncate">{c.title}</div>
                        <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                          {c.scenario} · {c.level} · {c.messages.length} 条 · {new Date(c.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => {
                            // v0.22.8: 单条导出
                            const content = exportChat(c)
                            const date = new Date(c.updatedAt).toISOString().slice(0, 10)
                            const safeTitle = c.title.replace(/[^a-z0-9-]/gi, '-').slice(0, 30)
                            downloadChatJson(content, `chat-${safeTitle}-${date}.json`)
                          }}
                          className="text-xs text-stone-400 hover:text-brand-500"
                          aria-label="导出对话"
                        >
                          📤
                        </button>
                        <button
                          onClick={() => c.id && handleDeleteChat(c.id)}
                          className="text-xs text-stone-400 hover:text-red-500"
                          aria-label="删除对话"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="card border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-sm text-red-700 dark:text-red-300 mb-3">
          ⚠️ {error}
        </div>
      )}

      {/* 消息列表 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pb-3">
        {messages.length === 0 && (
          <div className="card text-center text-stone-500 dark:text-stone-400 py-12">
            <div className="text-5xl mb-3">💬</div>
            <p className="font-medium mb-1">开始一段英语对话</p>
            <p className="text-xs">选择场景和难度,然后输入英文(或中文)开始</p>
            {provider?.id === 'mock' && (
              <p className="text-xs mt-2 text-amber-600">🧪 当前是 Mock 渠道,回复是预设脚本</p>
            )}
          </div>
        )}

        {messages.map(m => (
          <MessageBubble key={m.id} message={m} review={reviews[m.id]} />
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-stone-100 dark:bg-stone-800 rounded-2xl px-4 py-2 text-sm">
              <span className="inline-block animate-pulse">● ● ●</span>
            </div>
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div className="flex gap-2 pt-3 border-t border-stone-200 dark:border-stone-700">
        <button
          onClick={handleStartSTT}
          disabled={loading}
          className={`btn ${sttActive ? 'bg-red-500 text-white animate-pulse' : 'btn-ghost'} w-12 h-12 !p-0`}
          title={sttActive ? '点击停止录音' : '点击开始语音输入'}
          aria-label={sttActive ? '停止录音' : '开始语音输入'}
          aria-pressed={sttActive}
        >
          {sttActive ? '⏹' : '🎤'}
        </button>
        <div className="flex-1 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={sttInterim ? sttInterim : '输入英文,Enter 发送'}
            className="input w-full"
            disabled={loading}
          />
          {sttInterim && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 italic">识别中...</span>
          )}
        </div>
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="btn-primary"
        >
          {loading ? '...' : '发送'}
        </button>
        </div>
    </div>
  )
}

function MessageBubble({ message, review }: { message: ChatMessage; review?: ReviewResult }) {
  const isUser = message.role === 'user'
  const [sel, setSel] = useState<{ word: string; x: number; y: number; translation: string; inVocab: boolean; alreadyFav: boolean } | null>(null)
  const selTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const translateProviderId = useStore(s => s.translateProviderId)
  const customTranslateProviders = useStore(s => s.customTranslateProviders)
  const translateApiKeys = useStore(s => s.translateApiKeys)
  const activeTranslateProvider = BUILTIN_TRANSLATE_PROVIDERS.find(p => p.id === translateProviderId)
    || [...BUILTIN_TRANSLATE_PROVIDERS, ...customTranslateProviders].find(p => p.id === translateProviderId)
    || BUILTIN_TRANSLATE_PROVIDERS[0]
  const paragraphRef = useRef<HTMLParagraphElement>(null)
  // 修复 P1-1: 闭包陷阱 - 用 ref 同步 provider,避免 useEffect 依赖空导致老闭包
  const providerRef = useRef(activeTranslateProvider)
  const apiKeysRef = useRef(translateApiKeys)
  providerRef.current = activeTranslateProvider
  apiKeysRef.current = translateApiKeys
  // 修复 P1-2: 组件 unmount 时清理 selTimer,避免 setState 死状态
  const mountedRef = useRef(true)
  useEffect(() => () => { mountedRef.current = false }, [])

  useEffect(() => {
    // 全局 mouseup 监听,避开 React 17+ root delegation 事件不出
    const handler = (e: MouseEvent) => {
      if (!paragraphRef.current || !paragraphRef.current.contains(e.target as Node)) return
      // 通过 ref 读取最新 provider, 避开闭包过期问题
      const provider = providerRef.current
      const apiKeys = apiKeysRef.current
      if (selTimer.current) clearTimeout(selTimer.current)
      selTimer.current = setTimeout(async () => {
        if (!mountedRef.current) return  // P1-2: 组件已 unmount
        const selection = window.getSelection()
        const text = selection?.toString().trim() || ''
        if (!/^[a-zA-Z]{2,}$/.test(text)) {
          setSel(null)
          return
        }
        const lower = text.toLowerCase()
        const allWords = await loadWords()
        const found = allWords.find(w => w.word.toLowerCase() === lower)
        let translation = ''
        if (found) {
          translation = found.translations?.[0] || found.word
        } else {
          try {
            const res = await translateText({ provider, text, from: 'en', to: 'zh', apiKeys })
            translation = res.text || '该词不在词库'
          } catch {
            translation = '该词不在词库'
          }
        }
        if (!mountedRef.current) return  // P1-2: 二次检查
        const fav = found ? await isFavorite(found.id) : false
        if (!mountedRef.current) return
        const rect = (paragraphRef.current as HTMLElement).getBoundingClientRect()
        setSel({
          word: text,
          x: e.clientX,
          y: rect.top - 8,  // P1 修复: fixed 定位不用 + window.scrollY
          translation,
          inVocab: !!found,
          alreadyFav: fav,
        })
      }, 400)
    }
    // P1-5: 跨 message 选词时, click outside paragraph 关闭当前 tooltip
    const clickOutside = (e: MouseEvent) => {
      if (!paragraphRef.current) return
      if (paragraphRef.current.contains(e.target as Node)) return
      // tooltip 本身: 让 tooltip click 不关闭
      const target = e.target as HTMLElement
      if (target.closest('[data-word-tooltip]')) return
      setSel(null)
    }
    document.addEventListener('mouseup', handler)
    document.addEventListener('mousedown', clickOutside)
    return () => {
      document.removeEventListener('mouseup', handler)
      document.removeEventListener('mousedown', clickOutside)
      if (selTimer.current) clearTimeout(selTimer.current)  // P1-2: 清理
    }
  }, [])

  const handleAddFav = async () => {
    if (!sel || !sel.inVocab) return
    const allWords = await loadWords()
    const found = allWords.find(w => w.word.toLowerCase() === sel.word.toLowerCase())
    if (found) {
      await addFavorite(found.id)
      setSel({ ...sel, alreadyFav: true })
    }
  }

  // 2s 自动消失
  useEffect(() => {
    if (!sel) return
    const t = setTimeout(() => setSel(null), 4000)
    return () => clearTimeout(t)
  }, [sel])

  // W2-A: 纠错面板状态
  const [showReview, setShowReview] = useState(false)
  const [reviewAddedWords, setReviewAddedWords] = useState<Set<string>>(new Set())

  const handleAddReviewWord = async (suggestion: string) => {
    if (reviewAddedWords.has(suggestion)) return
    const allWords = await loadWords()
    const found = allWords.find(w => w.word.toLowerCase() === suggestion.toLowerCase())
    if (found) {
      await addFavorite(found.id)
      setReviewAddedWords(prev => new Set(prev).add(suggestion))
    }
  }

  const handleAddAllReviewWords = async () => {
    if (!review) return
    const allWords = await loadWords()
    const wordMap = new Map(allWords.map(w => [w.word.toLowerCase(), w.id]))
    const newSet = new Set(reviewAddedWords)
    for (const err of review.errors) {
      const word = err.fixed.toLowerCase().split(/\s+/)[0]
      if (wordMap.has(word) && !newSet.has(word)) {
        await addFavorite(wordMap.get(word)!)
        newSet.add(word)
      }
    }
    setReviewAddedWords(newSet)
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} relative`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'bg-brand-600 text-white'
            : 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100'
        }`}
      >
        <p ref={paragraphRef} className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        {/* W2-A: 用户消息下纠错按钮 (Mock 渠道不显示) */}
        {isUser && review && review.hasError && (
          <button
            onClick={() => setShowReview(!showReview)}
            className="mt-1.5 text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50"
          >
            ✏️ 纠错 ({review.errors.length})
          </button>
        )}
        {showReview && review && (
          <div className="mt-2 p-2 rounded bg-amber-50 dark:bg-amber-900/20 text-xs space-y-1.5 max-w-full">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-700 dark:text-amber-300">
                📋 {review.errors.length} 个问题
              </span>
              <button
                onClick={handleAddAllReviewWords}
                className="text-amber-700 dark:text-amber-300 hover:underline"
              >
                ⭐ 一键加生词本
              </button>
            </div>
            {review.errors.map((err, i) => (
              <div key={i} className="border-l-2 border-amber-400 pl-2">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="line-through text-stone-500 dark:text-stone-400">{err.original}</span>
                  <span>→</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">{err.fixed}</span>
                  <span className="text-[10px] px-1 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded">
                    {err.type}
                  </span>
                </div>
                <p className="text-stone-600 dark:text-stone-300 text-[11px] mb-0.5">{err.why}</p>
                <button
                  onClick={() => handleAddReviewWord(err.fixed.toLowerCase().split(/\s+/)[0])}
                  disabled={reviewAddedWords.has(err.fixed.toLowerCase().split(/\s+/)[0])}
                  className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {reviewAddedWords.has(err.fixed.toLowerCase().split(/\s+/)[0])
                    ? '✓ 已加入'
                    : '⭐ 加入生词本'}
                </button>
              </div>
            ))}
          </div>
        )}
        {!isUser && (
          <div className="mt-1.5">
            <TTSButton text={message.content} size="sm" variant="icon" />
          </div>
        )}
      </div>
      {sel && (
        <div
          data-word-tooltip
          className="fixed z-50 bg-stone-900 text-white text-xs rounded-lg shadow-lg px-3 py-2 max-w-[280px] -translate-x-1/2 border border-white/20 ring-1 ring-black/30"
          style={{ left: sel.x, top: sel.y - 4 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="font-semibold mb-0.5">📖 {sel.word}</div>
          <div className="text-stone-300 mb-1.5 line-clamp-2">{sel.translation}</div>
          <div className="flex items-center gap-1.5">
            {sel.inVocab ? (
              sel.alreadyFav ? (
                <span className="text-emerald-400">✓ 已在生词本</span>
              ) : (
                <button
                  onClick={handleAddFav}
                  className="text-amber-300 hover:text-amber-200 underline"
                >
                  ⭐ 加入生词本
                </button>
              )
            ) : (
              <span className="text-stone-400">不在词库</span>
            )}
            <button
              onClick={() => setSel(null)}
              className="ml-auto text-stone-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
