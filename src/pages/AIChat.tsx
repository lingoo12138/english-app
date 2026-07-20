// AI 对话陪练页 - v0.11
import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { chat as aiChat, type ChatMessage } from '../lib/aiChat'
import TTSButton from '../components/TTSButton'

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

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
        <button onClick={handleReset} className="btn-ghost text-sm">🔄 重置</button>
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
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="输入英文,Enter 发送"
          className="input flex-1"
          disabled={loading}
        />
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
