// LLM 设置 - v0.22.2
import { Modal } from '../Modal'
import { toast } from '../Toast'
import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { AddCustomLlmForm } from './CustomForms'

export default function LLMSection() {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [pendingName, setPendingName] = useState("")
  const llmProviderId = useStore(s => s.llmProviderId)
  const setLlmProviderId = useStore(s => s.setLlmProviderId)
  const llmProviders = useStore(s => s.llmProviders)
  const llmApiKeys = useStore(s => s.llmApiKeys)
  const setLlmApiKey = useStore(s => s.setLlmApiKey)
  const llmModels = useStore(s => s.llmModels)
  const setLlmModel = useStore(s => s.setLlmModel)
  const customLlmProviders = useStore(s => s.customLlmProviders)
  const addCustomLlmProvider = useStore(s => s.addCustomLlmProvider)
  const removeCustomLlmProvider = useStore(s => s.removeCustomLlmProvider)

  const [showAdd, setShowAdd] = useState(false)

  const allLlmProviders = [...llmProviders, ...customLlmProviders]
  const currentLlm = allLlmProviders.find(p => p.id === llmProviderId)

  return (
    <>
      {/* AI 渠道 */}
      <section className="card space-y-3">
        <h3 className="font-semibold">🤖 AI 渠道(图片识别 + 对话)</h3>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          支持 5 个内置渠道。可加自定义,改 baseUrl 即可。
        </p>
        <div>
          <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">激活渠道</label>
          <select
            value={llmProviderId}
            onChange={(e) => setLlmProviderId(e.target.value)}
            className="input"
          >
            {allLlmProviders.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}{p.supportsVision ? ' 👁' : ''}{p.free ? ' ✓免费' : ''}{!p.builtin ? ' 🛠' : ''}
              </option>
            ))}
          </select>
          {currentLlm && (
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5">
              {currentLlm.type} 协议 · {currentLlm.supportsVision ? '支持图像' : '纯文本'} · base: {currentLlm.baseUrl}
            </p>
          )}
        </div>

        {currentLlm?.apiKeyRequired && (
          <div>
            <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">
              {currentLlm.name} API Key
            </label>
            <input
              type="password"
              value={llmApiKeys[currentLlm.id] || ''}
              onChange={(e) => setLlmApiKey(currentLlm.id, e.target.value)}
              placeholder={
                currentLlm.id === 'openrouter' ? 'sk-or-v1-...'
                : currentLlm.id === 'openai' ? 'sk-...'
                : currentLlm.id === 'anthropic' ? 'sk-ant-...'
                : currentLlm.id === 'siliconflow' ? 'sk-...'
                : 'API Key'
              }
              className="input"
            />
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5">
              {currentLlm.id === 'openrouter' && <>去 <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="underline">openrouter.ai/keys</a> 免费注册</>}
              {currentLlm.id === 'openai' && <>去 <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="underline">platform.openai.com</a></>}
              {currentLlm.id === 'anthropic' && <>去 <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="underline">console.anthropic.com</a></>}
              {currentLlm.id === 'siliconflow' && <>去 <a href="https://cloud.siliconflow.cn/account/ak" target="_blank" rel="noreferrer" className="underline">cloud.siliconflow.cn</a> 免费注册</>}
            </p>
          </div>
        )}

        {currentLlm && currentLlm.models.length > 0 && (
          <div>
            <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">模型</label>
            <select
              value={llmModels[currentLlm.id] || currentLlm.defaultModel}
              onChange={(e) => setLlmModel(currentLlm.id, e.target.value)}
              className="input"
            >
              {currentLlm.models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        {currentLlm?.id === 'mock' && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            🧪 Mock 渠道:零成本,返回预设响应,用于测试流程
          </p>
        )}

        {/* v0.22.7: Mistral 不支持图像警告(防止拍照识物 / 视觉对话时踩坑) */}
        {currentLlm?.id === 'mistral' && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            ⚠️ Mistral 不支持图像输入,仅纯文本. 拍照识物 / 视觉对话请换其他渠道
          </p>
        )}
      </section>

      {/* 自定义 LLM */}
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">🛠 自定义 LLM 端点 (OpenAI 兼容)</h3>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-ghost text-sm">
            {showAdd ? '取消' : '+ 添加'}
          </button>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          接任何 OpenAI 兼容端点(自定义部署的 vLLM / ollama / LM Studio / 各类代理),统一用 chat/completions 协议。
        </p>

        {showAdd && <AddCustomLlmForm onAdd={(p) => { addCustomLlmProvider(p); setShowAdd(false) }} />}

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
                    onClick={() => { setPendingDelete(p.id); setPendingName(p.name) }}
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

      <Modal
        open={!!pendingDelete}
        title="删除自定义 LLM 渠道"
        message={`确定要删除自定义 LLM 渠道 "${pendingName}"?\n\n该渠道的配置和 API Key 将被清除。`}
        variant="danger"
        confirmText="删除"
        onConfirm={() => {
          if (pendingDelete) removeCustomLlmProvider(pendingDelete)
          toast.success(`已删除: ${pendingName}`)
          setPendingDelete(null)
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}
