// W7: PWA install prompt (iOS 16+ / Android Chrome)
// 检测 beforeinstallprompt 事件,显示友好提示
// W125: slide-up 动效 + Icon 替 emoji
import { useEffect, useState } from 'react'
import { IconShare, IconClose } from './Icon'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const STORAGE_KEY = 'install-prompt-dismissed'

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSHint, setShowIOSHint] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // 已 dismissed?
    if (localStorage.getItem(STORAGE_KEY) === '1') {
      setDismissed(true)
      return
    }
    // 已安装 PWA? (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return
    }

    // Chrome / Edge Android
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS 检测: navigator.standalone
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
    const isInPWA = (navigator as any).standalone === true
    if (isIOS && !isInPWA) {
      setShowIOSHint(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') {
      setDismissed(true)
    }
    setDeferred(null)
  }

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setDismissed(true)
  }

  if (dismissed || (!deferred && !showIOSHint)) return null

  return (
    <div
      // W125 改版稿 2: slide-up 动效 + 圆角加大 + Icon 替 emoji
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-brand-600 text-white rounded-2xl shadow-[0_8px_24px_-6px_rgba(0,0,0,0.3)] p-3 z-50 flex items-start gap-3 animate-slide-up"
      role="dialog"
      aria-label="安装应用到主屏"
    >
      <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
        <IconShare size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm">添加到主屏</h3>
        {deferred ? (
          <p className="text-xs opacity-90 mt-0.5">安装后可全屏使用,无需打开浏览器</p>
        ) : showIOSHint ? (
          <p className="text-xs opacity-90 mt-0.5">
            iOS: 点击底部分享 → 添加到主屏
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        {deferred && (
          <button
            onClick={handleInstall}
            className="text-xs px-2.5 py-1 bg-white text-brand-600 rounded-full font-medium hover:bg-stone-100 transition-colors duration-[var(--t-fast)]"
          >
            安装
          </button>
        )}
        <button
          onClick={handleDismiss}
          className="w-7 h-7 rounded-full hover:bg-white/15 flex items-center justify-center mx-auto"
          aria-label="关闭安装提示"
        >
          <IconClose size={12} />
        </button>
      </div>
    </div>
  )
}
