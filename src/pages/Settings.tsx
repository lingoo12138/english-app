// 设置 - v0.22.2 拆为 6 个子组件
import PreferencesSection from '../components/settings/PreferencesSection'
import TTSSection from '../components/settings/TTSSection'
import TranslateSection from '../components/settings/TranslateSection'
import LLMSection from '../components/settings/LLMSection'
import AppearanceSection from '../components/settings/AppearanceSection'
import DataManagementSection from '../components/settings/DataManagementSection'
import AIChatDataSection from '../components/settings/AIChatDataSection'

export default function Settings() {
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
      <AIChatDataSection />

      {/* 底部 */}
      <div className="text-center text-xs text-stone-500 dark:text-stone-400 py-4">
        句刻 v0.22.2
        <div className="mt-1">让英语在你用的时候就能用上</div>
        <div className="mt-1">数据完全存在本地,不上传任何隐私</div>
      </div>
    </div>
  )
}
