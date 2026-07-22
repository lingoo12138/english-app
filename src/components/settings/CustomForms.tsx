// Settings 3 个 AddCustomForm - v0.22.2
// LLM / 翻译 / TTS 自定义端点表单
import { useState } from 'react'
import { createCustomLLMProvider } from '../../lib/providers/llm'
import { createCustomTranslateProvider } from '../../lib/translate'
import { createCustomTTSProvider } from '../../lib/tts'

export function AddCustomLlmForm({ onAdd }: { onAdd: (p: any) => void }) {
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [defaultModel, setDefaultModel] = useState('')
  const [vision, setVision] = useState(false)
  const [needKey, setNeedKey] = useState(true)
  return (
    <div className="border border-dashed border-stone-300 dark:border-stone-600 rounded-lg p-3 space-y-2 bg-stone-50 dark:bg-stone-800/30">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="显示名 (例如 我的 vLLM)" className="input text-sm" />
      <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="baseUrl (https://api.example.com/v1)" className="input text-sm" />
      <input value={defaultModel} onChange={e => setDefaultModel(e.target.value)} placeholder="默认模型名" className="input text-sm" />
      <div className="flex gap-3 text-sm">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={vision} onChange={e => setVision(e.target.checked)} />
          支持图像
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={needKey} onChange={e => setNeedKey(e.target.checked)} />
          需 API Key
        </label>
      </div>
      <button
        disabled={!name || !baseUrl || !defaultModel}
        onClick={() => {
          try {
            const p = createCustomLLMProvider({ name, baseUrl, defaultModel, supportsVision: vision, apiKeyRequired: needKey })
            onAdd(p)
            setName(''); setBaseUrl(''); setDefaultModel('')
          } catch (e: any) {
            alert(e?.message || '配置错误')
          }
        }}
        className="btn-primary text-sm w-full disabled:opacity-50"
      >
        ➕ 添加
      </button>
    </div>
  )
}

export function AddCustomTranslateForm({ onAdd }: { onAdd: (p: any) => void }) {
  const [name, setName] = useState('')
  const [endpoint, setEndpoint] = useState('')
  const [needKey, setNeedKey] = useState(true)
  return (
    <div className="border border-dashed border-stone-300 dark:border-stone-600 rounded-lg p-3 space-y-2 bg-stone-50 dark:bg-stone-800/30">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="显示名 (例如 我的翻译代理)" className="input text-sm" />
      <input value={endpoint} onChange={e => setEndpoint(e.target.value)} placeholder="endpoint URL" className="input text-sm" />
      <label className="flex items-center gap-1.5 text-sm">
        <input type="checkbox" checked={needKey} onChange={e => setNeedKey(e.target.checked)} />
        需 API Key
      </label>
      <p className="text-xs text-stone-500 dark:text-stone-400">
        协议: POST {`{endpoint}`}, body 含 text/from/to, 返回 {`{text}`} 或 {`{translation[0]}`}
      </p>
      <button
        disabled={!name || !endpoint}
        onClick={() => {
          try {
            const p = createCustomTranslateProvider({ name, endpoint, apiKeyRequired: needKey })
            onAdd(p)
            setName(''); setEndpoint('')
          } catch (e: any) {
            alert(e?.message || '配置错误')
          }
        }}
        className="btn-primary text-sm w-full disabled:opacity-50"
      >
        ➕ 添加
      </button>
    </div>
  )
}

export function AddCustomTtsForm({ onAdd }: { onAdd: (p: any) => void }) {
  const [name, setName] = useState('')
  const [endpoint, setEndpoint] = useState('')
  const [voice, setVoice] = useState('')
  const [needKey, setNeedKey] = useState(false)
  return (
    <div className="border border-dashed border-stone-300 dark:border-stone-600 rounded-lg p-3 space-y-2 bg-stone-50 dark:bg-stone-800/30">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="显示名 (例如 我的 Edge TTS 代理)" className="input text-sm" />
      <input value={endpoint} onChange={e => setEndpoint(e.target.value)} placeholder="endpoint URL" className="input text-sm" />
      <input value={voice} onChange={e => setVoice(e.target.value)} placeholder="默认 voice (可选)" className="input text-sm" />
      <label className="flex items-center gap-1.5 text-sm">
        <input type="checkbox" checked={needKey} onChange={e => setNeedKey(e.target.checked)} />
        需 API Key
      </label>
      <p className="text-xs text-stone-500 dark:text-stone-400">协议: POST {endpoint}, body 为 text/voice/rate JSON, 返回 audio/mpeg 或 JSON.audio</p>
      <button
        disabled={!name || !endpoint}
        onClick={() => {
          try {
            const p = createCustomTTSProvider({
              name, endpoint, defaultVoice: voice, apiKeyRequired: needKey,
              bodyTemplate: JSON.stringify({ text: '{{text}}', voice: voice || '', rate: '+0%' }),
            })
            onAdd(p)
            setName(''); setEndpoint(''); setVoice('')
          } catch (e: any) {
            alert(e?.message || '配置错误')
          }
        }}
        className="btn-primary text-sm w-full disabled:opacity-50"
      >
        ➕ 添加
      </button>
    </div>
  )
}
