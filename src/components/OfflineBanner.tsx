// src/components/OfflineBanner.tsx — W131 离线状态检测
// 监听 navigator.onLine + 'online'/'offline' 事件, 顶部小 banner
// v0.22.10: 跟随 v0.22.0 Layout 顶部 safe-area, 避免遮挡 header
import { useEffect, useState } from 'react'
import { IconClose } from './Icon'

export default function OfflineBanner() {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [dismissed, setDismissed] = useState<boolean>(false)
  // W131 强化: 断网后恢复时不自动隐藏, 需用户点击关闭 (避免误判)
  // 初 始 也 标 记 wasOffline=true, 确 保 启 动 时 离 线 用 户 能 看 到 "已恢复"
  const [wasOffline, setWasOffline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  )

  useEffect(() => {
    const onOnline = () => {
      setOnline(true)
      setWasOffline(true) // 确 保 "已 恢 复" 提 示 能 显 示 出 来
    }
    const onOffline = () => {
      setOnline(false)
      setWasOffline(true)
      setDismissed(false) // 离 线 时 重 新 显 示
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  // 不 显 示: 在 线 + 从 未 离 线 过, 或 用 户 关 闭
  if (online && !wasOffline) return null
  if (dismissed) return null

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-banner"
      data-online={online ? 'true' : 'false'}
      // W132 P2-1 修复: z-30 + pointer-events-none on outer wrapper
      //    修复前: banner z 过高 完全覆盖 Layout header (sticky z-10) + desktop sidebar (md:fixed z-10)
      //    修复后:
      //      - z-30 (在内容 z-0 之上, 视觉上可见)
      //      - pointer-events-none on outer wrapper (允许点击穿透到 nav 元素)
      //      - 内部交互元素 (关闭按钮) pointer-events-auto (用户仍可关闭)
      //    用户仍能看到 banner + 关闭按钮, 但返回按钮 / 侧边栏链接 不被遮挡
      className={`fixed top-0 inset-x-0 z-30 transition-all duration-[var(--t-base)] ease-[var(--ease)] pointer-events-none ${
        online
          ? 'bg-emerald-600 text-white'
          : 'bg-amber-500 text-white'
      }`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-2 text-sm pointer-events-auto">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              online ? 'bg-white' : 'bg-white/80 animate-pulse'
            }`}
            aria-hidden="true"
          />
          <span className="truncate">
            {online
              ? '网络已恢复, 功能正常'
              : '当前离线 · 仍可使用已缓存的词库与练习'}
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="w-6 h-6 rounded-full hover:bg-white/20 flex items-center justify-center shrink-0"
          aria-label="关闭网络状态提示"
        >
          <IconClose size={12} />
        </button>
      </div>
    </div>
  )
}
