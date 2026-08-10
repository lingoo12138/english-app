// src/components/UpdateToast.tsx — W135 SW 新版本可用 toast
// 监听 SW updatefound 事件, 弹一个右下角 toast 提示用户刷新
// 与 W4-B registerType:'prompt' 配合: 后台激活, 前台提示
//
// 设计原则:
//   - 不破坏 W4-B 既有 registerSW 流程 (只用虚拟模块副作用触发, 不接管 onNeedRefresh)
//   - 顶 indicator (红点): 新版本下载完, 提示用户
//   - toast 关闭: 用户选择稍后, 不强迫刷新
//   - 点击 "立即更新": 调 updateSW(true) 跳过等待, 页面 reload
//   - 0 emoji, 0 第三方依赖 (workbox-window 已有, 这里只读 registerSW 的 update)
import { useEffect, useState } from 'react'
import { IconClose, IconRefresh } from './Icon'
import { registerSW } from 'virtual:pwa-register'

interface UpdateToastState {
  /** 新 SW 等待激活 (download 完) */
  needRefresh: boolean
  /** 离线就绪 (首装完成) */
  offlineReady: boolean
}

export default function UpdateToast() {
  const [state, setState] = useState<UpdateToastState>({
    needRefresh: false,
    offlineReady: false,
  })
  // updateSW 引用, 由 registerSW 内部产生
  const [updateFn, setUpdateFn] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null)
  // 顶部红点: 不需用户操作
  const [indicator, setIndicator] = useState(false)

  useEffect(() => {
    // W135: 用 registerSW 但不抢 W4-B 那个 (它已经在 main.tsx 注册)
    // 这里重新注册一个, 只监听事件不弹 confirm, 用我们的 toast 替代
    const updateSW = registerSW({
      onNeedRefresh() {
        setState((s) => ({ ...s, needRefresh: true }))
        setIndicator(true)
      },
      onOfflineReady() {
        setState((s) => ({ ...s, offlineReady: true }))
        // 5s 后自动隐藏 (不强打扰)
        setTimeout(() => {
          setState((s) => ({ ...s, offlineReady: false }))
        }, 5000)
      },
      onRegistered() {
        // 注册成功
      },
      onRegisterError(err) {
        if (import.meta.env?.DEV) {
          console.debug('[UpdateToast] SW register error', err)
        }
      },
    })
    setUpdateFn(() => updateSW)
  }, [])

  // 顶 indicator 自动消失 (用户已看到 toast 后)
  useEffect(() => {
    if (state.needRefresh) {
      setIndicator(false)
    }
  }, [state.needRefresh])

  // 不显示: 无更新
  if (!state.needRefresh && !state.offlineReady) {
    // 只显示 indicator
    if (indicator) {
      return (
        <div
          data-testid="update-indicator"
          aria-label="有新版本可用"
          className="fixed top-2 right-2 z-40 w-3 h-3 rounded-full bg-rose-500 animate-pulse pointer-events-none"
        />
      )
    }
    return null
  }

  // 离线就绪 (短提示)
  if (state.offlineReady && !state.needRefresh) {
    return (
      <div
        role="status"
        aria-live="polite"
        data-testid="offline-ready-toast"
        className="fixed bottom-4 right-4 z-40 max-w-sm rounded-lg shadow-lg bg-emerald-600 text-white px-4 py-3 text-sm flex items-center gap-2 pointer-events-auto"
      >
        <span aria-hidden="true" className="font-bold">OK</span>
        <span>离线就绪 · 无网络也能用</span>
        <button
          onClick={() => setState((s) => ({ ...s, offlineReady: false }))}
          className="w-5 h-5 rounded-full hover:bg-white/20 flex items-center justify-center ml-1"
          aria-label="关闭离线就绪提示"
        >
          <IconClose size={10} />
        </button>
      </div>
    )
  }

  // 新版本可用 (主提示)
  return (
    <>
      {indicator && !state.needRefresh && (
        <div
          data-testid="update-indicator"
          aria-label="有新版本可用"
          className="fixed top-2 right-2 z-40 w-3 h-3 rounded-full bg-rose-500 animate-pulse pointer-events-none"
        />
      )}
      <div
        role="status"
        aria-live="polite"
        data-testid="update-toast"
        className="fixed bottom-4 right-4 z-40 max-w-sm rounded-lg shadow-lg bg-amber-500 text-white px-4 py-3 text-sm flex items-center gap-3 pointer-events-auto"
      >
        <IconRefresh size={18} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="font-medium">新版本可用</div>
          <div className="text-xs opacity-90">点击刷新以加载最新功能</div>
        </div>
        <button
          onClick={() => {
            if (updateFn) {
              updateFn(true)
            } else {
              // fallback: 强制 reload (拿到新 SW)
              window.location.reload()
            }
          }}
          className="px-3 py-1 rounded bg-white/20 hover:bg-white/30 text-xs font-medium"
          aria-label="立即更新到新版本"
        >
          立即更新
        </button>
        <button
          onClick={() => setState((s) => ({ ...s, needRefresh: false }))}
          className="w-6 h-6 rounded-full hover:bg-white/20 flex items-center justify-center shrink-0"
          aria-label="稍后提醒"
        >
          <IconClose size={12} />
        </button>
      </div>
    </>
  )
}
