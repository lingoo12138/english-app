// W7: PWA install prompt (iOS Safari + Android Chrome + 桌面 Chrome/Edge)
// 检测 display-mode: standalone (PWA 已安装) — 已安装则不显示
// 检测 navigator.standalone (iOS PWA) — 已安装则不显示
// W125: slide-up 动效 + 圆角 + Icon 替 emoji
// W148-C: 桌面 chrome/edge 安装检测 + IconDownload/IconCheck + data-testid + 安装完成反馈
import { useEffect, useState } from 'react'
import { IconShare, IconClose, IconDownload, IconCheck } from './Icon'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const STORAGE_KEY = 'install-prompt-dismissed'

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSHint, setShowIOSHint] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  // W148-C: 安装成功 → 短暂显示绿色反馈条 (3 秒后自动消失)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // 已 dismissed?
    if (localStorage.getItem(STORAGE_KEY) === '1') {
      setDismissed(true)
      return
    }
    // W148-C: 桌面 chrome/edge PWA 模式 + iOS PWA 模式 — 已安装则不显示
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isIOSStandalone = (navigator as any).standalone === true
    if (isStandalone || isIOSStandalone) {
      return
    }

    // Chrome / Edge (桌面 + Android) — beforeinstallprompt 事件
    const beforeInstallHandler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', beforeInstallHandler)

    // W148-C: appinstalled 事件 (chrome/edge 安装完成后触发) — 短暂显示安装成功反馈
    const installedHandler = () => setInstalled(true)
    window.addEventListener('appinstalled', installedHandler)

    // iOS 检测: navigator.standalone (PWA 已安装会 true, 已早 return)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
    if (isIOS && !isIOSStandalone) {
      setShowIOSHint(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstallHandler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  // W148-C: 安装成功 → 3 秒后自动关闭
  useEffect(() => {
    if (!installed) return
    const t = setTimeout(() => setDismissed(true), 3000)
    return () => clearTimeout(t)
  }, [installed])

  const handleInstall = async () => {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') {
      setInstalled(true)
    }
    setDeferred(null)
  }

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setDismissed(true)
  }

  if (dismissed) return null
  if (!deferred && !showIOSHint && !installed) return null

  // W148-C: 安装成功 → 绿色反馈条
  if (installed) {
    return (
      <div
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-emerald-600 text-white rounded-2xl shadow-[0_8px_24px_-6px_rgba(0,0,0,0.3)] p-3 z-50 flex items-start gap-3 animate-slide-up"
        role="status"
        aria-label="已安装到桌面"
        data-testid="install-prompt-installed"
      >
        <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
          <IconCheck size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">已安装到桌面</h3>
          <p className="text-xs opacity-90 mt-0.5">下次启动可直接打开, 无需浏览器</p>
        </div>
        <button
          onClick={handleDismiss}
          className="w-7 h-7 rounded-full hover:bg-white/15 flex items-center justify-center shrink-0"
          aria-label="关闭安装提示"
          data-testid="install-prompt-close"
        >
          <IconClose size={12} />
        </button>
      </div>
    )
  }

  return (
    <div
      // W125 改版稿 2: slide-up 动效 + 圆角加大 + Icon 替 emoji
      // W148-C: 桌面 chrome/edge / iOS 共用, button 文本统一为 "安装到桌面"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-brand-600 text-white rounded-2xl shadow-[0_8px_24px_-6px_rgba(0,0,0,0.3)] p-3 z-50 flex items-start gap-3 animate-slide-up"
      role="dialog"
      aria-label="安装应用到主屏"
      data-testid="install-prompt"
    >
      <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
        {deferred ? <IconDownload size={20} /> : <IconShare size={20} />}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm">添加到主屏</h3>
        {deferred ? (
          <p className="text-xs opacity-90 mt-0.5">安装到桌面后, 全屏使用更沉浸</p>
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
            data-testid="install-prompt-button"
          >
            安装到桌面
          </button>
        )}
        <button
          onClick={handleDismiss}
          className="w-7 h-7 rounded-full hover:bg-white/15 flex items-center justify-center mx-auto"
          aria-label="关闭安装提示"
          data-testid="install-prompt-close"
        >
          <IconClose size={12} />
        </button>
      </div>
    </div>
  )
}
