// W7: PWA install prompt (iOS 16+ / Android Chrome)
// 检测 beforeinstallprompt 事件,显示友好提示
import { useEffect, useState } from 'react'

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
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-brand-600 text-white rounded-lg shadow-lg p-3 z-50 flex items-start gap-3"
      role="dialog"
      aria-label="安装应用到主屏"
    >
      <div className="text-2xl shrink-0" aria-hidden="true">📲</div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm">添加到主屏</h3>
        {deferred ? (
          <p className="text-xs opacity-90 mt-0.5">安装后可全屏使用,无需打开浏览器</p>
        ) : showIOSHint ? (
          <p className="text-xs opacity-90 mt-0.5">
            iOS: 点击底部分享 <span className="inline-block bg-white/20 px-1 rounded">⎙</span> → 添加到主屏
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        {deferred && (
          <button
            onClick={handleInstall}
            className="text-xs px-2 py-1 bg-white text-brand-600 rounded font-medium hover:bg-stone-100"
          >
            安装
          </button>
        )}
        <button
          onClick={handleDismiss}
          className="text-xs px-2 py-1 hover:bg-white/10 rounded"
          aria-label="关闭安装提示"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
