// TTS 设置 - v0.22.2
import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { getVoices } from '../../lib/tts'
import { AddCustomTtsForm } from './CustomForms'

export default function TTSSection() {
  const ttsProviderId = useStore(s => s.ttsProviderId)
  const setTtsProviderId = useStore(s => s.setTtsProviderId)
  const ttsProviders = useStore(s => s.ttsProviders)
  const customTtsProviders = useStore(s => s.customTtsProviders)
  const addCustomTtsProvider = useStore(s => s.addCustomTtsProvider)
  const removeCustomTtsProvider = useStore(s => s.removeCustomTtsProvider)
  const ttsApiKeys = useStore(s => s.ttsApiKeys)
  const setTtsApiKey = useStore(s => s.setTtsApiKey)
  const voiceName = useStore(s => s.voiceName)
  const setVoiceName = useStore(s => s.setVoiceName)
  const rate = useStore(s => s.rate)
  const setRate = useStore(s => s.setRate)

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    setVoices(getVoices())
    const handler = () => setVoices(getVoices())
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = handler
    }
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null
      }
    }
  }, [])

  const englishVoices = voices.filter(v => v.lang.startsWith('en'))
  const allTtsProviders = [...ttsProviders, ...customTtsProviders]

  return (
    <>
      {/* 主 TTS 渠道 */}
      <section className="card space-y-3">
        <h3 className="font-semibold">🔊 语音朗读</h3>
        <div>
          <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">TTS 渠道</label>
          <select
            value={ttsProviderId}
            onChange={(e) => setTtsProviderId(e.target.value)}
            className="input"
          >
            {allTtsProviders.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        {ttsProviderId === 'browser' && (
          <>
            <div>
              <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">英文语音</label>
              <select
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                className="input"
              >
                <option value="">系统默认</option>
                {englishVoices.map(v => (
                  <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">
                语速: {rate.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </>
        )}

        {['azure-speech', 'elevenlabs', 'baidu-tts', 'google-tts', 'iflytek-tts'].includes(ttsProviderId) && (
          <div>
            <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">
              {ttsProviderId === 'azure-speech' ? 'API Key (Azure Speech)'
                : ttsProviderId === 'elevenlabs' ? 'API Key (ElevenLabs)'
                : ttsProviderId === 'baidu-tts' ? 'API Key|Secret Key (用 | 分隔)'
                : ttsProviderId === 'google-tts' ? 'API Key (Google Cloud)'
                : 'APPID|APIKey|APISecret (用 | 分隔)'}
            </label>
            <input
              type="password"
              value={ttsApiKeys[ttsProviderId] || ''}
              onChange={(e) => setTtsApiKey(ttsProviderId, e.target.value)}
              placeholder={
                ttsProviderId === 'azure-speech' ? 'Azure Speech Key'
                : ttsProviderId === 'elevenlabs' ? 'xi-api-...'
                : ttsProviderId === 'baidu-tts' ? 'APIKey|SecretKey'
                : ttsProviderId === 'google-tts' ? 'AIza...'
                : 'APPID|APIKey|APISecret'
              }
              className="input"
            />
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5">
              {ttsProviderId === 'azure-speech' && 'Azure Speech: 注册 Azure 账号, 在 Speech 服务获取 Key'}
              {ttsProviderId === 'elevenlabs' && 'ElevenLabs: 注册 elevenlabs.io, 在 Profile 拿 API Key'}
              {ttsProviderId === 'baidu-tts' && '百度智能云: 注册 cloud.baidu.com, 创建语音技术应用, 拿 API Key + Secret Key'}
              {ttsProviderId === 'google-tts' && 'Google Cloud TTS: 注册 cloud.google.com, 启用 Text-to-Speech API, 创建 API Key'}
              {ttsProviderId === 'iflytek-tts' && '讯飞: 注册 xfyun.cn, 创建 WebAPI 应用, 拿 APPID + APIKey + APISecret'}
            </p>
          </div>
        )}

        {ttsProviderId === 'edge-tts' && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            ⚠️ Edge TTS 浏览器直连可能受 CORS 限制, 需配合代理或浏览器扩展使用
          </p>
        )}
      </section>

      {/* 自定义 TTS 端点 */}
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">🎤 自定义 TTS 端点</h3>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-ghost text-sm">
            {showAdd ? '取消' : '+ 添加'}
          </button>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          接 Edge TTS / Azure / 有道 / ElevenLabs 等, 走统一 OpenAI 风格 HTTP。
        </p>

        {showAdd && <AddCustomTtsForm onAdd={(p) => { addCustomTtsProvider(p); setShowAdd(false) }} />}

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
                    onClick={() => { if (confirm(`删除自定义 TTS 渠道 "${p.name}"?`)) removeCustomTtsProvider(p.id) }}
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
