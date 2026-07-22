// 提醒设置 - v0.22.9
import { useState, useEffect } from 'react'
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  getReminderSettings,
  setReminderSettings,
  fireTestNotification,
  formatTime,
  type ReminderSettings,
} from '../../lib/reminder'

export default function ReminderSection() {
  const [settings, setSettings] = useState<ReminderSettings>(getReminderSettings())
  const [permission, setPermission] = useState<NotificationPermission>(
    getNotificationPermission()
  )
  const [testResult, setTestResult] = useState<{ ok: boolean; reason?: string } | null>(null)
  const [supported] = useState(isNotificationSupported())

  useEffect(() => {
    setPermission(getNotificationPermission())
  }, [])

  const update = (patch: Partial<ReminderSettings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    setReminderSettings(next)
  }

  const handleEnable = async () => {
    const perm = await requestNotificationPermission()
    setPermission(perm)
    if (perm === 'granted') {
      update({ enabled: true })
    } else {
      setTestResult({ ok: false, reason: '通知权限未授予,请在浏览器设置中开启' })
    }
  }

  const handleTest = async () => {
    const r = await fireTestNotification()
    setTestResult(r)
  }

  if (!supported) {
    return (
      <section className="card">
        <h3 className="font-semibold mb-2">⏰ 学习提醒</h3>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          当前浏览器不支持 Notification API
        </p>
      </section>
    )
  }

  return (
    <section className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">⏰ 学习提醒</h3>
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            permission === 'granted'
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
              : permission === 'denied'
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
          }`}
        >
          {permission === 'granted' ? '✓ 已授权' : permission === 'denied' ? '已拒绝' : '未授权'}
        </span>
      </div>

      <p className="text-xs text-stone-500 dark:text-stone-400">
        每天固定时间弹浏览器通知,提醒你来学习。
        iOS Safari 通知支持有限,可能不弹。
      </p>

      {permission === 'denied' && (
        <p className="text-xs text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-900/20 rounded">
          ⚠️ 通知权限已拒绝,需在浏览器地址栏左侧的"锁"图标中重新开启。
        </p>
      )}

      {/* 启用开关 */}
      {permission === 'granted' && (
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">开启每日提醒</div>
            <div className="text-xs text-stone-500 dark:text-stone-400">
              到时间自动弹通知
            </div>
          </div>
          <button
            onClick={() => update({ enabled: !settings.enabled })}
            className={`w-12 h-7 rounded-full transition-colors ${
              settings.enabled ? 'bg-brand-600' : 'bg-stone-300 dark:bg-stone-700'
            }`}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                settings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
              style={{ marginTop: '4px' }}
            />
          </button>
        </div>
      )}

      {permission === 'granted' && settings.enabled && (
        <>
          {/* 时间选择 */}
          <div>
            <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">
              提醒时间
            </label>
            <div className="flex items-center gap-2">
              <select
                value={settings.hour}
                onChange={(e) => update({ hour: Number(e.target.value) })}
                className="input"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
                ))}
              </select>
              <span className="text-stone-500 dark:text-stone-400">:</span>
              <select
                value={settings.minute}
                onChange={(e) => update({ minute: Number(e.target.value) })}
                className="input"
              >
                {[0, 15, 30, 45].map(m => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                ))}
              </select>
              <span className="text-xs text-stone-500 dark:text-stone-400">
                ({formatTime(settings.hour, settings.minute)})
              </span>
            </div>
          </div>

          {/* 显示连续天数 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="reminder-streak"
              checked={settings.showStreak}
              onChange={(e) => update({ showStreak: e.target.checked })}
            />
            <label htmlFor="reminder-streak" className="text-sm">
              通知正文显示连续天数
            </label>
          </div>
        </>
      )}

      {/* 授权按钮 */}
      {permission !== 'granted' && permission !== 'denied' && (
        <button
          onClick={handleEnable}
          className="btn-primary text-sm w-full"
        >
          🔓 开启通知权限
        </button>
      )}

      {/* 测试按钮 */}
      {permission === 'granted' && (
        <button
          onClick={handleTest}
          className="btn border border-stone-300 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700 w-full text-sm"
        >
          🧪 立即测试通知
        </button>
      )}

      {/* 测试结果 */}
      {testResult && (
        <p
          className={`text-xs p-2 rounded ${
            testResult.ok
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
          }`}
        >
          {testResult.ok ? '✅ 测试通知已弹,看看是否收到' : `❌ ${testResult.reason}`}
        </p>
      )}
    </section>
  )
}
