// src/components/OfflineBanner.tsx — W131 离线状态检测 + W135 增强
// W135 增强:
//   1. 显示离线时长 (从 offline 事件触发起开始计时)
//   2. 提示哪些功能可用 (缓存词库/复习/生词本) / 哪些不可用 (翻译/AI/听写 TTS)
//   3. 重新连接时短 toast 提示 (顶部绿条, 5s 自动消失)
//   4. 展开/收起: 离线时 banner 默认收起, 用户点 "?" 看详情
//
// v0.22.10: 跟随 v0.22.0 Layout 顶部 safe-area, 避免遮挡 header
import { useEffect, useState, useRef } from 'react'
import { IconClose } from './Icon'

/** 离线时仍可用的功能 */
const OFFLINE_AVAILABLE = ['已缓存的词库', '生词本', '错题复习', '听写练习', '设置 (本地)']

/** 离线时不可用的功能 */
const OFFLINE_UNAVAILABLE = ['AI 对话 (需网络)', '翻译 (需网络)', '听写语音评测', '场景专题课', '每日一句']

/** 格式化毫秒为 "X 分 Y 秒" */
function formatDuration(ms: number): string {
  if (ms < 0) return '0 秒'
  const totalSec = Math.floor(ms / 1000)
  if (totalSec < 60) return `${totalSec} 秒`
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min < 60) return `${min} 分 ${sec} 秒`
  const hr = Math.floor(min / 60)
  const m2 = min % 60
  return `${hr} 时 ${m2} 分`
}

export default function OfflineBanner() {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [dismissed, setDismissed] = useState<boolean>(false)
  // W131 强化: 断网后恢复时不自动隐藏, 需用户点击关闭 (避免误判)
  const [wasOffline, setWasOffline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  )
  // W135: 离线开始时间 (用于显示时长)
  const [offlineSince, setOfflineSince] = useState<number | null>(null)
  // W135: 现在时间 (用于 reactively 更新时长)
  const [, setNow] = useState(Date.now())
  // W135: 展开/收起详情
  const [expanded, setExpanded] = useState(false)
  // W135: 重新连接 toast (短提示, 5s 自动消失)
  const [reconnectFlash, setReconnectFlash] = useState<string | null>(null)
  // 抑制 onMount 重连 toast (启动时已经在线, 不该闪)
  const mountedRef = useRef(false)

  useEffect(() => {
    const onOnline = () => {
      setOnline(true)
      setWasOffline(true) // 确 保 "已 恢 复" 提 示 能 显 示 出 来
      // W135: 重连 toast
      if (mountedRef.current) {
        const dur = offlineSince ? formatDuration(Date.now() - offlineSince) : ''
        setReconnectFlash(dur ? `网络已恢复 · 离线 ${dur}` : '网络已恢复')
        setTimeout(() => setReconnectFlash(null), 5000)
      }
      setOfflineSince(null)
    }
    const onOffline = () => {
      setOnline(false)
      setWasOffline(true)
      setDismissed(false) // 离 线 时 重 新 显 示
      setOfflineSince(Date.now())
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    mountedRef.current = true
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [offlineSince])

  // W135: 离 线 时, 每秒刷新一次 "离线时长" 文字
  useEffect(() => {
    if (online) return
    const id = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(id)
  }, [online])

  // 不 显 示: 在 线 + 从 未 离 线 过, 或 用 户 关 闭
  if (online && !wasOffline) return null
  if (dismissed) return null

  const offlineDuration =
    online || !offlineSince ? '' : formatDuration(Date.now() - offlineSince)

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        data-testid="offline-banner"
        data-online={online ? 'true' : 'false'}
        data-offline-duration={offlineDuration || '0'}
        // W132 P2-1 修复: z-30 + pointer-events-none on outer wrapper
        className={`fixed top-0 inset-x-0 z-30 transition-all duration-[var(--t-base)] ease-[var(--ease)] pointer-events-none ${
          online
            ? 'bg-emerald-600 text-white'
            : 'bg-amber-500 text-white'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-2 text-sm pointer-events-auto">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                online ? 'bg-white' : 'bg-white/80 animate-pulse'
              }`}
              aria-hidden="true"
            />
            <span className="truncate flex-1" data-testid="offline-message">
              {online
                ? reconnectFlash || '网络已恢复, 功能正常'
                : `当前离线${offlineDuration ? ` · ${offlineDuration}` : ''} · 已缓存内容可用`}
            </span>
            {!online && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="w-5 h-5 rounded-full hover:bg-white/20 flex items-center justify-center text-xs font-bold shrink-0"
                aria-label={expanded ? '收起详情' : '查看可用功能'}
                aria-expanded={expanded}
                data-testid="offline-expand"
              >
                {expanded ? '−' : '?'}
              </button>
            )}
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="w-6 h-6 rounded-full hover:bg-white/20 flex items-center justify-center shrink-0"
            aria-label="关闭网络状态提示"
          >
            <IconClose size={12} />
          </button>
        </div>
        {/* W135: 展开详情: 列出可用/不可用功能 */}
        {expanded && !online && (
          <div
            data-testid="offline-detail"
            className="px-4 pb-3 pt-1 text-xs pointer-events-auto border-t border-white/20"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <div className="font-medium opacity-90 mb-1">离线可用</div>
                <ul className="space-y-0.5 opacity-90">
                  {OFFLINE_AVAILABLE.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="font-medium opacity-90 mb-1">需网络</div>
                <ul className="space-y-0.5 opacity-80">
                  {OFFLINE_UNAVAILABLE.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
