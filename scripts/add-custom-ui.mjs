// 加自定义 TTS + LLM 渠道 UI 到 Settings.tsx
import { readFileSync, writeFileSync } from 'fs'

const file = 'src/pages/Settings.tsx'
let c = readFileSync(file, 'utf-8')

// 在 TTS section 结束 / 翻译 section 开始前, 插入自定义 TTS 渠道 UI
const ttsCustomUI = `
      {/* 自定义 TTS 渠道 */}
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">🎤 自定义 TTS 端点</h3>
          <button
            onClick={() => setShowAddTts(!showAddTts)}
            className="btn-ghost text-sm"
          >
            {showAddTts ? '取消' : '+ 添加'}
          </button>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          接 Edge TTS / Azure / 有道 / ElevenLabs 等, 走统一 OpenAI 风格 HTTP。
        </p>

        {showAddTts && <AddCustomTtsForm onAdd={(p) => { addCustomTtsProvider(p); setShowAddTts(false) }} />}

        {customTtsProviders.length > 0 && (
          <div className="space-y-2">
            {customTtsProviders.map(p => (
              <div key={p.id} className="card !p-3 bg-stone-50 dark:bg-stone-800/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 text-xs">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-stone-500 dark:text-stone-400 mt-0.5 break-all">endpoint: {p.endpoint}</div>
                    {p.apiKeyRequired && (
                      <input
                        type="password"
                        value={ttsApiKeys[p.id] || ''}
                        onChange={e => setTtsApiKey(p.id, e.target.value)}
                        placeholder="API Key"
                        className="input mt-1.5 text-xs !py-1.5"
                      />
                    )}
                  </div>
                  <button
                    onClick={() => { if (confirm(\`删除自定义 TTS 渠道 "\${p.name}"?\`)) removeCustomTtsProvider(p.id) }}
                    className="text-xs text-red-500 shrink-0"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
`

// 在 AI section 结束 / 主题色 section 开始前, 插入自定义 LLM 渠道 UI
const llmCustomUI = `
      {/* 自定义 LLM 渠道 */}
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">🛠 自定义 LLM 端点 (OpenAI 兼容)</h3>
          <button
            onClick={() => setShowAddLlm(!showAddLlm)}
            className="btn-ghost text-sm"
          >
            {showAddLlm ? '取消' : '+ 添加'}
          </button>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          接任何 OpenAI 兼容端点(自定义部署的 vLLM / ollama / LM Studio / 各类代理),统一用 chat/completions 协议。
        </p>

        {showAddLlm && <AddCustomLlmForm onAdd={(p) => { addCustomLlmProvider(p); setShowAddLlm(false) }} />}

        {customLlmProviders.length > 0 && (
          <div className="space-y-2">
            {customLlmProviders.map(p => (
              <div key={p.id} className="card !p-3 bg-stone-50 dark:bg-stone-800/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 text-xs">
                    <div className="font-medium">{p.name} {p.supportsVision ? '👁' : ''}</div>
                    <div className="text-stone-500 dark:text-stone-400 mt-0.5 break-all">baseUrl: {p.baseUrl}</div>
                    <div className="text-stone-500 dark:text-stone-400 break-all">model: {p.defaultModel}</div>
                    {p.apiKeyRequired && (
                      <input
                        type="password"
                        value={llmApiKeys[p.id] || ''}
                        onChange={e => setLlmApiKey(p.id, e.target.value)}
                        placeholder="API Key"
                        className="input mt-1.5 text-xs !py-1.5"
                      />
                    )}
                  </div>
                  <button
                    onClick={() => { if (confirm(\`删除自定义 LLM 渠道 "\${p.name}"?\`)) removeCustomLlmProvider(p.id) }}
                    className="text-xs text-red-500 shrink-0"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
`

// 插入位置 1: TTS section 结束后
c = c.replace(
  "      {/* 翻译渠道 */}",
  ttsCustomUI + "\n      {/* 翻译渠道 */}"
)

// 插入位置 2: 主题色 section 前
c = c.replace(
  "      {/* 主题色 */}",
  llmCustomUI + "\n      {/* 主题色 */}"
)

// 加 AddCustomLlmForm / AddCustomTtsForm 组件
const forms = `

function AddCustomLlmForm({ onAdd }: { onAdd: (p: any) => void }) {
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
          onAdd(createCustomLLMProvider({ name, baseUrl, defaultModel, supportsVision: vision, apiKeyRequired: needKey }))
          setName(''); setBaseUrl(''); setDefaultModel('')
        }}
        className="btn-primary text-sm w-full disabled:opacity-50"
      >
        ➕ 添加
      </button>
    </div>
  )
}

function AddCustomTtsForm({ onAdd }: { onAdd: (p: any) => void }) {
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
      <p className="text-xs text-stone-500 dark:text-stone-400">
        协议: POST endpoint, body: JSON {"text":"...","voice":"..."}, 返回 audio/* 或 JSON {"audio":"..."}
      </p>
      <button
        disabled={!name || !endpoint}
        onClick={() => {
          onAdd(createCustomTTSProvider({
            name, endpoint, defaultVoice: voice, apiKeyRequired: needKey,
            bodyTemplate: JSON.stringify({ text: '{{text}}', voice: voice || '', rate: '+0%' }),
          }))
          setName(''); setEndpoint(''); setVoice('')
        }}
        className="btn-primary text-sm w-full disabled:opacity-50"
      >
        ➕ 添加
      </button>
    </div>
  )
}
`

c = c + forms

writeFileSync(file, c)
console.log('OK')
