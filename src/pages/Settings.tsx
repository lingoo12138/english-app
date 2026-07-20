import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { getVoices, loadVoices } from '../lib/tts'
import { db } from '../lib/db'
import { THEMES, FONT_SIZES, applyTheme, applyFontSize, getTheme } from '../lib/themes'

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
  const targetLevel = useStore(s => s.targetLevel)
  const setTargetLevel = useStore(s => s.setTargetLevel)
  const dailyGoal = useStore(s => s.dailyGoal)
  const setDailyGoal = useStore(s => s.setDailyGoal)
  const translateProvider = useStore(s => s.translateProvider)
  const setTranslateProvider = useStore(s => s.setTranslateProvider)
  const llmApiKey = useStore(s => s.llmApiKey)
  const setLlmApiKey = useStore(s => s.setLlmApiKey)
  const llmModel = useStore(s => s.llmModel)
  const setLlmModel = useStore(s => s.setLlmModel)

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    loadVoices().then(setVoices)
  }, [])

  const englishVoices = voices.filter(v => v.lang.startsWith('en'))

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
            <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">每日目标: {dailyGoal} 个词</label>
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

      {/* TTS 设置 */}
      <section className="card">
        <h3 className="font-semibold mb-3">🔊 语音朗读</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">英文语音</label>
            <select
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              className="input"
            >
              <option value="">系统默认</option>
              {englishVoices.map(v => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
            {englishVoices.length === 0 && (
              <p className="text-xs text-stone-400 dark:text-stone-300 mt-1">
                暂未检测到英文语音,首次使用 TTS 需要联网
              </p>
            )}
          </div>
          <div>
            <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">
              语速: {rate.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* 翻译 API */}
      <section className="card">
        <h3 className="font-semibold mb-3">🔤 翻译服务</h3>
        <select
          value={translateProvider}
          onChange={(e) => setTranslateProvider(e.target.value as any)}
          className="input"
        >
          <option value="auto">自动(推荐)</option>
          <option value="libre">LibreTranslate</option>
          <option value="mymemory">MyMemory</option>
        </select>
        <p className="text-xs text-stone-400 dark:text-stone-300 mt-2">
          当前使用免费公共 API,如不稳定可手动切换
        </p>
      </section>

      {/* 外观 */}
      <section className="card">
        <h3 className="font-semibold mb-3">🎨 外观</h3>

        {/* 主题色 */}
        <div className="mb-4">
          <label className="text-sm text-stone-500 dark:text-stone-400 mb-2 block">主题色</label>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map(theme => (
              <button
                key={theme.id}
                onClick={() => {
                  setThemeColor(theme.id)
                  applyTheme(getTheme(theme.id))
                }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all ${
                  themeColor === theme.id
                    ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-stone-200 dark:border-stone-700'
                }`}
              >
                <div
                  className="w-6 h-6 rounded-full shadow-inner"
                  style={{ background: `rgb(${theme.colors[600]})` }}
                />
                <span className="text-sm font-medium">{theme.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 字号 */}
        <div className="mb-4">
          <label className="text-sm text-stone-500 dark:text-stone-400 mb-2 block">字号</label>
          <div className="grid grid-cols-4 gap-2">
            {FONT_SIZES.map(fs => (
              <button
                key={fs.id}
                onClick={() => {
                  setFontSize(fs.id)
                  applyFontSize(fs.id)
                }}
                className={`px-3 py-2 rounded-lg border-2 transition-all ${
                  fontSize === fs.id
                    ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-stone-200 dark:border-stone-700'
                }`}
              >
                <div className="text-sm font-medium">{fs.name}</div>
                <div className="text-xs text-stone-400 dark:text-stone-300">{fs.base}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 暗色模式 */}
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
              className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                darkMode ? 'translate-x-6' : 'translate-x-1'
              }`}
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
            // 危险操作: 要求二次确认
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

      {/* 图片识别 (LLM) */}
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">📷 图片识别</h2>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          拍照识物,AI 返回英文单词 + 中文 + 例句
        </p>
        <div>
          <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">OpenRouter API Key</label>
          <input
            type="password"
            value={llmApiKey}
            onChange={(e) => setLlmApiKey(e.target.value)}
            placeholder="sk-or-v1-..."
            className="input"
          />
          <p className="text-xs text-stone-400 dark:text-stone-300 mt-1">
            去 <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="underline text-brand-600">openrouter.ai/keys</a> 免费注册获取 · 默认模型 google/gemini-2.5-flash:free 完全免费
          </p>
        </div>
        <div>
          <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">模型</label>
          <input
            type="text"
            value={llmModel}
            onChange={(e) => setLlmModel(e.target.value)}
            placeholder="google/gemini-2.5-flash:free"
            className="input"
          />
          <p className="text-xs text-stone-400 dark:text-stone-300 mt-1">
            可换: openai/gpt-4o-mini · anthropic/claude-3-haiku · google/gemini-2.5-flash
          </p>
        </div>
      </section>

      {/* 关于 */}
      <section className="card text-center text-sm text-stone-500 dark:text-stone-400">
        <p className="font-semibold text-stone-700 dark:text-stone-300">句刻 v0.8</p>
        <p className="mt-1">让英语在你想用的时候就能用上</p>
        <p className="mt-3 text-xs">
          数据完全存储在本地,不上传任何隐私
        </p>
      </section>
    </div>
  )
}
