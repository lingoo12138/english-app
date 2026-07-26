// InAppBanner.tsx - v1.38.0 W36 iOS 学习提醒 in-app banner
// 复用 v1.34 inAppReminder lib, 顶部 banner 显示
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  shouldShowInAppReminder,
  loadInAppReminderState,
  dismissInAppReminder,
  vibrateIfSupported,
  shouldUseInAppReminder,
  type InAppReminderState,
} from '../lib/inAppReminder'

/** 全局 In-App 提醒 banner (iOS Safari PWA Notification 不支持时使用) */
export default function InAppBanner() {
  const navigate = useNavigate()
  const [state, setState] = useState<InAppReminderState | null>(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    // 仅在 iOS 或无 Notification 的环境下启用
    if (!shouldUseInAppReminder()) {
      setEnabled(false)
      return
    }
    setEnabled(true)

    // 启动时检查 + 每 60 秒检查 (匹配 reminder.ts 调度)
    const check = async () => {
      if (!shouldShowInAppReminder()) return
      const s = await loadInAppReminderState()
      if (s) {
        setState(s)
        vibrateIfSupported()  // 触发震动反馈
      }
    }
    void check()
    const interval = window.setInterval(check, 60_000)
    return () => clearInterval(interval)
  }, [])

  if (!enabled || !state) return null

  const handleClick = () => {
    dismissInAppReminder()
    setState(null)
    navigate('/review?from=inAppReminder')
  }

  const handleDismiss = () => {
    dismissInAppReminder()
    setState(null)
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 animate-[slideDown_0.3s_ease-out]"
      role="alert"
      aria-live="polite"
    >
      <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-3 shadow-lg flex items-center gap-3">
        <span className="text-2xl">⏰</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">该学英语啦</div>
          <div className="text-xs text-white/90 truncate">{state.body}</div>
        </div>
        <button
          onClick={handleClick}
          className="text-xs px-3 py-1 rounded bg-white text-blue-600 font-semibold hover:bg-blue-50 whitespace-nowrap"
          aria-label="去复习"
        >
          📚 复习
        </button>
        <button
          onClick={handleDismiss}
          className="text-white/80 hover:text-white text-lg px-1"
          aria-label="关闭提醒"
        >×</button>
      </div>
    </div>
  )
}
