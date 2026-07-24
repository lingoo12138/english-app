// 设置 - v0.22.2 拆为 6 个子组件
// v1.8.0-A: 加 "🔄 重新看引导" 按钮 (清除 onboarded 标志)
import { useNavigate } from 'react-router-dom'
import PreferencesSection from '../components/settings/PreferencesSection'
import TTSSection from '../components/settings/TTSSection'
import TranslateSection from '../components/settings/TranslateSection'
import LLMSection from '../components/settings/LLMSection'
import AppearanceSection from '../components/settings/AppearanceSection'
import DataManagementSection from '../components/settings/DataManagementSection'
import MigrationSection from '../components/settings/MigrationSection'
import AIChatDataSection from '../components/settings/AIChatDataSection'
import ReminderSection from '../components/settings/ReminderSection'
import { clearOnboarded } from '../components/Onboarding'

export default function Settings() {
  const navigate = useNavigate()

  // v1.8.0-A: 重看 onboarding 引导
  const handleReplayOnboarding = () => {
    clearOnboarded()
    navigate('/')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">设置</h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm">个性化你的学习体验</p>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
          ⚠️ 所有 API Key 明文存于浏览器 localStorage, 公共电脑请勿填写
        </p>
      </div>

      <PreferencesSection />
      <TTSSection />
      <TranslateSection />
      <LLMSection />
      <AppearanceSection />
      <DataManagementSection />
      <MigrationSection />
      <AIChatDataSection />
      <ReminderSection />

      {/* v1.8.0-A: 重新看引导 */}
      <section className="card">
        <h3 className="font-semibold mb-3">🎓 引导</h3>
        <button
          onClick={handleReplayOnboarding}
          className="btn-ghost text-sm w-full"
          aria-label="清除 onboarding 标志, 跳回首页重新查看引导"
        >
          🔄 重新看引导
        </button>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
          清除首次使用标记, 跳回首页重新弹 onboarding 弹层
        </p>
      </section>

      {/* 底部 */}
      <div className="text-center text-xs text-stone-500 dark:text-stone-400 py-4">
        句刻 v0.22.2
        <div className="mt-1">让英语在你用的时候就能用上</div>
        <div className="mt-1">数据完全存在本地,不上传任何隐私</div>
      </div>
    </div>
  )
}
