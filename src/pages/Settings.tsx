// 设置 - v0.11 多渠道版本
import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { getVoices } from '../lib/tts'
import { db } from '../lib/db'
import { THEMES, FONT_SIZES, applyTheme, applyFontSize, getTheme } from '../lib/themes'
import { BUILTIN_LLM_PROVIDERS } from '../lib/providers/llm'

export default function Settings() {
  const darkMode = useStore(s => s.darkMode)
  const toggleDark = useStore(s => s.toggleDark)
  const themeColor = useStore(s => s.themeColor)
  const setThemeColor = useStore(s => s.setThemeColor)
  const fontSize = useStore(s => s.fontSize)
  const setFontSize = useStore(s => s.setFontSize)
  const voiceName = useStore(s => s.voiceName)
  const setVoiceName = useStore(s => s.setVoiceName)
  const rate = useStore(s => s.rate)
  const setRate = useStore(s => s.setRate)
  const ttsProviderId = useStore(s => s.ttsProviderId)
  const setTtsProviderId = useStore(s => s.setTtsProviderId)
  const ttsProviders = useStore(s => s.ttsProviders)
  const targetLevel = useStore(s => s.targetLevel)
  const setTargetLevel = useStore(s => s.setTargetLevel)
  const dailyGoal = useStore(s => s.dailyGoal)
  const setDailyGoal = useStore(s => s.setDailyGoal)

  // LLM
  const llmProviderId = useStore(s => s.llmProviderId)
  const setLlmProviderId = useStore(s => s.setLlmProviderId)
  const llmProviders = useStore(s => s.llmProviders)
  const llmApiKeys = useStore(s => s.llmApiKeys)
  const setLlmApiKey = useStore(s => s.setLlmApiKey)
  const llmModels = useStore(s => s.llmModels)
  const setLlmModel = useStore(s => s.setLlmModel)

  // 翻译
  const translateProviderId = useStore(s => s.translateProviderId)
  const setTranslateProviderId = useStore(s => s.setTranslateProviderId)
  const translateProviders = useStore(s => s.translateProviders)
  const translateApiKeys = useStore(s => s.translateApiKeys)
  const setTranslateApiKey = useStore(s => s.setTranslateApiKey)

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

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
  const currentLlm = llmProviders.find(p => p.id === llmProviderId)
  const currentTranslate = translateProviders.find(p => p.id === translateProviderId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">设置</h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm">个性化你的学习体验</p>
      </div>

      {/* 学习偏好 */}
      <section className="card">
        <h3 className="font-semibold mb-3">🎯 学习偏好</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">目标学段</label>
            <select
              value={targetLevel}
              onChange={(e) => setTargetLevel(e.target.value as any)}
              className="input"
            >
              <option value="all">全部</option>
              <option value="primary">小学</option>
              <option value="junior">初中</option>
              <option value="senior">高中</option>
              <option value="gaozhong">高考</option>
              <option value="cet4">CET-4</option>
              <option value="cet6">CET-6</option>
              <option value="kaoyan">考研</option>
              <option value="daily">日常</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">
              每日目标: {dailyGoal} 个词
            </label>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={dailyGoal}
              onChange={(e) => setDailyGoal(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* 语音朗读 (TTS) */}
      <section className="card space-y-3">
        <h3 className="font-semibold">🔊 语音朗读</h3>
        <div>
          <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">TTS 渠道</label>
          <select
            value={ttsProviderId}
            onChange={(e) => setTtsProviderId(e.target.value)}
            className="input"
          >
            {ttsProviders.map(p => (
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
      </section>

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
            {translateProviders.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}{p.apiKeyRequired ? ' 🔑' : ''}
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
              {currentTranslate.id === 'baidu' ? 'App ID|Key (用 | 分隔)' : 'API Key'}
            </label>
            <input
              type="password"
              value={translateApiKeys[currentTranslate.id] || ''}
              onChange={(e) => setTranslateApiKey(currentTranslate.id, e.target.value)}
              placeholder="填入后自动保存"
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

      {/* AI 渠道 (图片识别 + 对话共用) */}
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
            {llmProviders.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}{p.supportsVision ? ' 👁' : ''}{p.free ? ' ✓免费' : ''}
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
      </section>

      {/* 主题色 */}
      <section className="card space-y-3">
        <h3 className="font-semibold">🎨 外观</h3>
        <div>
          <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">主题色</label>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map(theme => (
              <button
                key={theme.id}
                onClick={() => {
                  setThemeColor(theme.id)
                  applyTheme(getTheme(theme.id))
                }}
                className={`p-3 rounded-lg border-2 transition-all ${
                  themeColor === theme.id
                    ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-stone-200 dark:border-stone-700'
                }`}
              >
                <div className="w-6 h-6 rounded-full mx-auto mb-1" style={{ background: `rgb(${theme.colors['500']})` }} />
                <div className="text-xs">{theme.name}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">字号</label>
          <div className="grid grid-cols-4 gap-2">
            {FONT_SIZES.map(fs => (
              <button
                key={fs.id}
                onClick={() => {
                  setFontSize(fs.id)
                  applyFontSize(fs.id)
                }}
                className={`p-2 rounded-lg border-2 ${
                  fontSize === fs.id
                    ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-stone-200 dark:border-stone-700'
                }`}
              >
                <div className="text-sm font-medium">{fs.name}</div>
                <div className="text-xs text-stone-500 dark:text-stone-400">{fs.base}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-700">
          <div>
            <div className="font-medium">暗色模式</div>
            <div className="text-sm text-stone-500 dark:text-stone-400">晚上学习更护眼</div>
          </div>
          <button
            onClick={toggleDark}
            className={`w-12 h-7 rounded-full transition-colors ${
              darkMode ? 'bg-brand-600' : 'bg-stone-300 dark:bg-stone-700'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                darkMode ? 'translate-x-6' : 'translate-x-1'
              }`}
              style={{ marginTop: '4px' }}
            />
          </button>
        </div>
      </section>

      {/* 数据管理 */}
      <section className="card space-y-3">
        <h3 className="font-semibold mb-3">💾 数据管理</h3>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          选择清空范围:场景课进度会独立保留,不会影响其他学习记录。
        </p>
        <button
          onClick={async () => {
            if (confirm('确定清空生词本/错题本?场景课进度会保留。')) {
              await db.favorites.clear()
              await db.reviews.clear()
              alert('生词本和错题本已清空,场景课进度保留。')
            }
          }}
          className="btn border border-stone-300 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700 w-full"
        >
          清空生词本 + 错题本
        </button>
        <button
          onClick={async () => {
            if (!confirm('⚠️ 危险:此操作会清空所有数据,包括生词本、错题本、跟读记录、场景课进度。\n\n确定要清空所有数据吗?')) return
            if (!confirm('请再次确认:此操作不可恢复。\n\n真的要清空所有数据吗?')) return
            await db.favorites.clear()
            await db.records.clear()
            await db.reviews.clear()
            alert('所有数据已清空')
            location.reload()
          }}
          className="btn text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 w-full"
        >
          ⚠️ 清空所有数据(含场景课)
        </button>
      </section>

      {/* 底部 */}
      <div className="text-center text-xs text-stone-500 dark:text-stone-400 py-4">
        句刻 v0.11
        <div className="mt-1">让英语在你用的时候就能用上</div>
        <div className="mt-1">数据完全存在本地,不上传任何隐私</div>
      </div>
    </div>
  )
}
