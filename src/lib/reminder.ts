// 学习提醒 - v0.22.9
// Web Notification API, 每日固定时间弹通知
// 兼容降级:不支持时 UI 提示,iOS Safari partial

export interface ReminderSettings {
  enabled: boolean
  hour: number        // 0-23
  minute: number      // 0-59
  showStreak: boolean
}

const STORAGE_KEY = 'reminder-settings'
const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: false,
  hour: 20,
  minute: 0,
  showStreak: true,
}

/** 浏览器是否支持 Notification */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

/** 当前权限状态 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied'
  return Notification.permission
}

/** 请求权限(返回 'granted' / 'denied' / 'default') */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

/** 读设置(从 localStorage) */
export function getReminderSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {}
  return { ...DEFAULT_SETTINGS }
}

/** 写设置 */
export function setReminderSettings(s: ReminderSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch (e) {
    console.warn('reminder.ts: setReminderSettings 失败:', e)
  }
}

// 调度器(单例:不重复 setInterval)
let schedulerInterval: number | null = null
let lastFiredKey: string | null = null  // 防止同分钟重复弹

/** 启动调度(每分钟检查) */
export function startReminderScheduler(): void {
  if (schedulerInterval !== null) return  // 已启动
  if (!isNotificationSupported()) return
  // 立即检查一次(避免用户开开关后等 1 分钟)
  checkAndFire()
  schedulerInterval = window.setInterval(checkAndFire, 60_000)
}

/** 停止调度 */
export function stopReminderScheduler(): void {
  if (schedulerInterval !== null) {
    clearInterval(schedulerInterval)
    schedulerInterval = null
  }
  lastFiredKey = null
}

/** 检查是否到时间,触发通知 */
function checkAndFire(): void {
  const settings = getReminderSettings()
  if (!settings.enabled) return
  if (Notification.permission !== 'granted') return

  const now = new Date()
  const fireKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`
  if (lastFiredKey === fireKey) return  // 本分钟已弹

  if (now.getHours() === settings.hour && now.getMinutes() === settings.minute) {
    lastFiredKey = fireKey
    fireReminderNotification(settings)
  }
}

/** 触发通知(纯文本,不读 plan 数据,避免耦合) */
function fireReminderNotification(settings: ReminderSettings): void {
  const title = '⏰ 该学英语啦'
  let body = '坚持每天学一点,养成习惯!'
  if (settings.showStreak) {
    try {
      const raw = localStorage.getItem('english-app-stats')
      if (raw) {
        const stats = JSON.parse(raw)
        if (stats.state?.streak && stats.state.streak > 0) {
          body = `连续 ${stats.state.streak} 天,今天继续!`
        }
      }
    } catch {}
  }
  try {
    new Notification(title, {
      body,
      icon: '/english-app/pwa-192.png',
      badge: '/english-app/pwa-192.png',
      tag: 'reminder-daily',
    })
  } catch (e) {
    console.warn('reminder.ts: fireNotification 失败:', e)
  }
}

/** 测试通知(立即弹) */
export async function fireTestNotification(): Promise<{ ok: boolean; reason?: string }> {
  if (!isNotificationSupported()) {
    return { ok: false, reason: '当前环境不支持 Notification' }
  }
  const perm = await requestNotificationPermission()
  if (perm !== 'granted') {
    return { ok: false, reason: '通知权限未授予' }
  }
  try {
    new Notification('🧪 测试通知', {
      body: '通知功能正常! 你将在每天设定时间收到提醒。',
      icon: '/english-app/pwa-192.png',
      tag: 'reminder-test',
    })
    return { ok: true }
  } catch (e: any) {
    return { ok: false, reason: e?.message || '未知错误' }
  }
}

/** 格式化小时/分钟显示(00:00) */
export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}
