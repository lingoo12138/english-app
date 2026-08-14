// 设置 - v0.22.2 拆为 6 个子组件
// v1.8.0-A: 加 "🔄 重新看引导" 按钮 (清除 onboarded 标志)
// v1.12.0-C: 加 "📊 LLM 用量" 卡片
// W146: 加 "📊 我的使用" / "💬 反馈" / "📡 埋点设置" 入口
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
import { useTranslate } from '../lib/useTranslate'
import { getLLMUsageToday, resetLLMUsageToday, DAILY_LIMITS, type LLMCategory } from '../lib/llmUsage'
import { isTelemetryEnabled, setTelemetryEnabled } from '../lib/telemetry'
import { IconChart, IconChat } from '../components/Icon'

export default function Settings() {
  const navigate = useNavigate()
  const { t } = useTranslate()
  // v1.12.0-C: LLM 用量 state (跨日重置)
  const [usage, setUsage] = useState(() => getLLMUsageToday())
  // W146: 埋点开关 (读 + 写)
  const [telemetryOn, setTelemetryOn] = useState(() => isTelemetryEnabled())
  useEffect(() => {
    setTelemetryEnabled(telemetryOn)
  }, [telemetryOn])

  // v1.8.0-A: 重看 onboarding 引导
  const handleReplayOnboarding = () => {
    clearOnboarded()
    navigate('/')
  }

  // v1.12.0-C: 刷新用量 (跨日或重置)
  const refreshUsage = () => setUsage(getLLMUsageToday())
  const handleResetUsage = () => {
    resetLLMUsageToday()
    refreshUsage()
  }

  const CATEGORIES: Array<{ key: LLMCategory; label: string; emoji: string }> = [
    { key: 'write', label: '写作批改/中译英', emoji: '✍️' },
    { key: 'chat', label: 'AI 对话', emoji: '💬' },
    { key: 'explain', label: '错题/短语/语法/同义词讲解', emoji: '📚' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">{t('settings.page_title')}</h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm">{t('settings.theme')} · {t('settings.color')} · {t('settings.contrast')}</p>
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
      <section className="card stagger-item">
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

      {/* W146: 反馈回路 — 我的使用 / 反馈 / 埋点设置 入口 */}
      <section className="card stagger-item" data-testid="settings-feedback-section">
        <h3 className="font-semibold mb-3">反馈与使用</h3>
        <div className="space-y-2">
          <Link
            to="/usage"
            className="btn-ghost text-sm w-full flex items-center justify-center gap-2"
            data-testid="settings-usage-link"
          >
            <IconChart size={16} aria-hidden="true" />
            查看我的使用
          </Link>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            看自己 30 天活动 + 功能使用 + 导出 JSON
          </p>
          <a
            href="#feedback"
            onClick={(e) => {
              e.preventDefault()
              // FeedbackButton 在 Layout 浮动, 触发方式: 派发 CustomEvent
              window.dispatchEvent(new CustomEvent('w146-open-feedback'))
            }}
            className="btn-ghost text-sm w-full flex items-center justify-center gap-2"
            data-testid="settings-feedback-link"
          >
            <IconChat size={16} aria-hidden="true" />
            提交反馈
          </a>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            想说啥都行 (问题 / 建议 / 表白), 仅本地保存
          </p>
          <label className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              checked={telemetryOn}
              onChange={(e) => setTelemetryOn(e.target.checked)}
              className="w-4 h-4"
              data-testid="settings-telemetry-toggle"
            />
            <span className="text-sm">启用使用数据收集 (local-only, 不上传云)</span>
          </label>
        </div>
      </section>

      {/* v1.12.0-C: LLM 用量 */}
      <section className="card stagger-item">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">📊 LLM 用量 (今日)</h3>
          <div className="flex gap-2">
            <button
              onClick={refreshUsage}
              className="btn-ghost text-xs"
              aria-label="刷新用量"
            >
              🔄 刷新
            </button>
            <button
              onClick={handleResetUsage}
              className="text-xs text-red-500 hover:underline"
              aria-label={t('settings.reset')}
            >
              重置
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {CATEGORIES.map(({ key, label, emoji }) => {
            const used = usage[key] || 0
            const limit = DAILY_LIMITS[key]
            const pct = Math.min(100, Math.round((used / limit) * 100))
            const overLimit = used >= limit
            return (
              <div key={key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>{emoji} {label}</span>
                  <span className={overLimit ? 'text-red-500 font-medium' : 'text-stone-500'}>
                    {used} / {limit} {overLimit && '⚠️'}
                  </span>
                </div>
                <div className="h-1.5 bg-stone-200 dark:bg-stone-700 rounded overflow-hidden">
                  <div
                    className={`h-full ${overLimit ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-3">
          💡 限制每日 LLM 调用次数, 跨日自动重置。超限需明天或换 Mock 渠道
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
