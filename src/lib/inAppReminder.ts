// inAppReminder.ts - v1.34.0 W32 iOS 学习提醒兜底
// iOS Safari PWA 不支持 Web Notification, 改用 in-app banner + 震动 + Badge API
import { getReminderSettings } from './reminder'
import { getReminderStats, buildReminderBody } from './reminderContent'

/** In-app 提醒状态 (给 UI 用) */
export interface InAppReminderState {
  enabled: boolean       // 是否启用 in-app 模式
  dismissedAt: number    // 用户关闭时间戳 (24h 内不重复)
  body: string           // 通知正文
  stats: {
    dueCount: number
    newCount: number
    daysInactive: number
  }
}

const DISMISS_KEY = 'inAppReminder-dismissedAt'
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000  // 24h 内不重复

/** iOS Safari PWA 不支持 Notification 时, 返 true */
export function shouldUseInAppReminder(): boolean {
  // 检测 1: Notification API 不存在
  if (typeof window === 'undefined') return false
  const hasNotification = 'Notification' in window
  // 检测 2: 是 iOS Safari
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  // iOS 优先 in-app, 桌面无 Notification 时也用 in-app
  if (!hasNotification) return true
  if (isIOS && Notification.permission !== 'granted') return true
  return false
}

/** 检查是否需要弹 in-app 提醒 (设置启用 + 时间到 + 未 dismiss) */
export function shouldShowInAppReminder(now: Date = new Date()): boolean {
  const settings = getReminderSettings()
  if (!settings.enabled) return false
  if (now.getHours() !== settings.hour) return false
  if (now.getMinutes() !== settings.minute) return false

  // 检查 24h dismiss
  try {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0)
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DURATION_MS) {
      return false
    }
  } catch {}

  return true
}

/** 用户 dismiss in-app 提醒 (24h 内不重复) */
export function dismissInAppReminder(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch {}
}

/** 加载 in-app 提醒内容 (动态 body) */
export async function loadInAppReminderState(now: Date = new Date()): Promise<InAppReminderState | null> {
  if (!shouldShowInAppReminder(now)) return null
  const stats = await getReminderStats()
  const body = await buildReminderBody()
  return {
    enabled: true,
    dismissedAt: 0,
    body,
    stats: {
      dueCount: stats.dueCount,
      newCount: stats.newCount,
      daysInactive: stats.daysInactive,
    },
  }
}

/** 震动 (iOS Safari 不支持 navigator.vibrate, 静默忽略) */
export function vibrateIfSupported(): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(200)
    } catch {}
  }
}

/** 更新 App Badge (iOS 16.4+ / 部分 Android Chrome) */
export async function setAppBadgeIfSupported(count: number): Promise<void> {
  if (typeof navigator === 'undefined') return
  // @ts-ignore - Badge API 是实验性
  if (typeof navigator.setAppBadge === 'function') {
    try {
      // @ts-ignore
      await navigator.setAppBadge(count)
    } catch {}
  }
}

/** 清除 Badge */
export async function clearAppBadgeIfSupported(): Promise<void> {
  if (typeof navigator === 'undefined') return
  // @ts-ignore
  if (typeof navigator.clearAppBadge === 'function') {
    try {
      // @ts-ignore
      await navigator.clearAppBadge()
    } catch {}
  }
}
