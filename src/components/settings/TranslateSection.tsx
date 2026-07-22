// 翻译设置 - v0.22.2
import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { AddCustomTranslateForm } from './CustomForms'

export default function TranslateSection() {
  const translateProviderId = useStore(s => s.translateProviderId)
  const setTranslateProviderId = useStore(s => s.setTranslateProviderId)
  const translateProviders = useStore(s => s.translateProviders)
  const customTranslateProviders = useStore(s => s.customTranslateProviders)
  const addCustomTranslateProvider = useStore(s => s.addCustomTranslateProvider)
  const removeCustomTranslateProvider = useStore(s => s.removeCustomTranslateProvider)
  const translateApiKeys = useStore(s => s.translateApiKeys)
  const setTranslateApiKey = useStore(s => s.setTranslateApiKey)

  const [showAdd, setShowAdd] = useState(false)

  const allTranslateProviders = [...translateProviders, ...customTranslateProviders]
  const currentTranslate = allTranslateProviders.find(p => p.id === translateProviderId)

  return (
    <>
      {/* 翻译渠道 */}
      <section className="card space-y-3">
        <h3 className="font-semibold">🌐 翻译渠道</h3>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          默认 MyMemory 免费。如需更高质量,选 LLM 翻译或百度翻译。
        </p>
        <div>
          <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">渠道</label>
          <select
            value={translateProviderId}
            onChange={(e) => setTranslateProviderId(e.target.value)}
            className="input"
          >
            {allTranslateProviders.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}{p.apiKeyRequired ? ' 🔑' : ''}{!p.builtin ? ' 🛠' : ''}
              </option>
            ))}
          </select>
          {currentTranslate?.description && (
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5">{currentTranslate.description}</p>
          )}
        </div>
        {currentTranslate?.apiKeyRequired && currentTranslate.id !== 'llm' && (
          <div>
            <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">
              {currentTranslate.id === 'baidu' || currentTranslate.id === 'youdao' || currentTranslate.id === 'tencent'
                ? 'App ID|Key (用 | 分隔)'
                : 'API Key'}
            </label>
            <input
              type="password"
              value={translateApiKeys[currentTranslate.id] || ''}
              onChange={(e) => setTranslateApiKey(currentTranslate.id, e.target.value)}
              placeholder={
                currentTranslate.id === 'baidu' ? 'appid|key'
                : currentTranslate.id === 'youdao' ? 'appKey|appSecret'
                : currentTranslate.id === 'tencent' ? 'SecretId|SecretKey'
                : '填入后自动保存'
              }
              className="input"
            />
          </div>
        )}
        {currentTranslate?.id === 'llm' && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            LLM 翻译需要先在上面"AI 渠道"配置 LLM provider
          </p>
        )}
      </section>

      {/* 自定义翻译端点 */}
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">🔌 自定义翻译端点</h3>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-ghost text-sm">
            {showAdd ? '取消' : '+ 添加'}
          </button>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          接任意 OpenAI 风格 / 自定义 HTTP 翻译 API (需 POST {`{endpoint}`}, 返回 {`{text}`} 或 {`{translation}`})
        </p>

        {showAdd && <AddCustomTranslateForm onAdd={(p) => { addCustomTranslateProvider(p); setShowAdd(false) }} />}

        {customTranslateProviders.length > 0 && (
          <div className="space-y-2">
            {customTranslateProviders.map(p => (
              <div key={p.id} className="card !p-3 bg-stone-50 dark:bg-stone-800/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 text-xs">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-stone-500 dark:text-stone-400 mt-0.5 break-all">endpoint: {p.endpoint}</div>
                    {p.apiKeyRequired && (
                      <input
                        type="password"
                        value={translateApiKeys[p.id] || ''}
                        onChange={e => setTranslateApiKey(p.id, e.target.value)}
                        placeholder="API Key"
                        className="input mt-1.5 text-xs !py-1.5"
                      />
                    )}
                  </div>
                  <button
                    onClick={() => { if (confirm(`删除自定义翻译渠道 "${p.name}"?`)) removeCustomTranslateProvider(p.id) }}
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
    </>
  )
}
