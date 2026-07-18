import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { getVoices, loadVoices } from '../lib/tts'
import { db } from '../lib/db'

export default function Settings() {
  const darkMode = useStore(s => s.darkMode)
  const toggleDark = useStore(s => s.toggleDark)
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

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    loadVoices().then(setVoices)
  }, [])

  const englishVoices = voices.filter(v => v.lang.startsWith('en'))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">设置</h1>
        <p className="text-stone-500 text-sm">个性化你的学习体验</p>
      </div>

      {/* 学习偏好 */}
      <section className="card">
        <h3 className="font-semibold mb-3">🎯 学习偏好</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-stone-500 mb-1.5 block">目标学段</label>
            <select
              value={targetLevel}
              onChange={(e) => setTargetLevel(e.target.value as any)}
              className="input"
            >
              <option value="all">全部</option>
              <option value="primary">小学</option>
              <option value="junior">初中</option>
              <option value="senior">高中</option>
              <option value="cet4">CET-4</option>
              <option value="cet6">CET-6</option>
              <option value="kaoyan">考研</option>
              <option value="daily">日常</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-stone-500 mb-1.5 block">每日目标: {dailyGoal} 个词</label>
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
            <label className="text-sm text-stone-500 mb-1.5 block">英文语音</label>
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
              <p className="text-xs text-stone-400 mt-1">
                暂未检测到英文语音,首次使用 TTS 需要联网
              </p>
            )}
          </div>
          <div>
            <label className="text-sm text-stone-500 mb-1.5 block">
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
        <p className="text-xs text-stone-400 mt-2">
          当前使用免费公共 API,如不稳定可手动切换
        </p>
      </section>

      {/* 外观 */}
      <section className="card">
        <h3 className="font-semibold mb-3">🎨 外观</h3>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">暗色模式</div>
            <div className="text-sm text-stone-500">晚上学习更护眼</div>
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
      <section className="card">
        <h3 className="font-semibold mb-3">💾 数据管理</h3>
        <button
          onClick={async () => {
            if (confirm('确定要清空所有生词本和学习记录吗?此操作不可恢复。')) {
              await db.favorites.clear()
              await db.records.clear()
              await db.reviews.clear()
              alert('已清空')
              location.reload()
            }
          }}
          className="btn text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full"
        >
          清空所有数据
        </button>
      </section>

      {/* 关于 */}
      <section className="card text-center text-sm text-stone-500">
        <p className="font-semibold text-stone-700 dark:text-stone-300">句刻 v0.1</p>
        <p className="mt-1">让英语在你想用的时候就能用上</p>
        <p className="mt-3 text-xs">
          数据完全存储在本地,不上传任何隐私
        </p>
      </section>
    </div>
  )
}
