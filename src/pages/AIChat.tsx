// AI 对话陪练页 - v0.11
import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { chat as aiChat, type ChatMessage } from '../lib/aiChat'
import { saveChat, getAllChats, deleteChat, type ChatRecord } from '../lib/db'
import TTSButton from '../components/TTSButton'
import { STTController, isSTTSupported } from '../lib/stt'

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

  // 加载历史对话列表
  useEffect(() => {
    refreshChats()
  }, [])

  const refreshChats = async () => {
    const list = await getAllChats()
    setChats(list)
  }

  // 加载历史对话
  const loadChat = (chat: ChatRecord) => {
    setCurrentChatId(chat.id ?? null)
    setMessages(chat.messages.map(m => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content, ts: m.ts })))
    setScenario(chat.scenario)
    setLevel(chat.level as any)
    setShowHistory(false)
  }

  // 删除历史对话
  const handleDeleteChat = async (id: number) => {
    if (!confirm('确定删除这条对话?')) return
    await deleteChat(id)
    if (id === currentChatId) {
      // 当前对话被删,清空
      setCurrentChatId(null)
      setMessages([])
    }
    refreshChats()
  }

  // 新对话
  const handleNewChat = () => {
    setCurrentChatId(null)
    setMessages([])
    setInput('')
    setSttInterim('')
  }

  const [currentChatId, setCurrentChatId] = useState<number | null>(null)
  const [chats, setChats] = useState<ChatRecord[]>([])
  
  // 自动保存需要在 useState 之前声明依赖(loading 等)
  // 实际: 把 loading 声明提前到这里
  const [loadingEarly, setLoadingEarly] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  // 加载中 ref(避开 useEffect 依赖)
  const loadingRef = useRef(false)
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

    try {
      const reply = await aiChat(newMessages, { scenario, level }, provider, apiKey, model)
      setMessages([...newMessages, reply])
    } catch (e: any) {
      console.error(e)
      setError(e.message || 'AI 响应失败')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    if (messages.length > 0 && !confirm('清空当前对话?')) return
    setMessages([])
    setError('')
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
          {chats.length === 0 ? (
            <p className="text-sm text-stone-500 dark:text-stone-400 text-center py-4">还没有对话记录</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {chats.map(c => (
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
                    <button
                      onClick={() => c.id && handleDeleteChat(c.id)}
                      className="text-xs text-stone-400 hover:text-red-500 shrink-0"
                      aria-label="删除对话"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
          <MessageBubble key={m.id} message={m} />
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

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'bg-brand-600 text-white'
            : 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        {!isUser && (
          <div className="mt-1.5">
            <TTSButton text={message.content} size="sm" variant="icon" />
          </div>
        )}
      </div>
    </div>
  )
}
