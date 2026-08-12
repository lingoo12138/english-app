// src/components/UpdateToast.tsx — W135/W136 SW 新版本可用 toast
// 监听 SW updatefound 事件, 弹一个右下角 toast 提示用户刷新
// 与 W4-B registerType:'prompt' 配合: 后台激活, 前台提示
//
// 设计原则:
//   - W136-PWA: 唯一 registerSW 入口 (P1-4 修: main.tsx 已删 registerSW, 完全交给本组件)
//   - 顶 indicator (红点): 新版本下载完, 提示用户
//   - toast 关闭: 用户选择稍后, 不强迫刷新
//   - 点击 "立即更新": 调 updateSW(true) 跳过等待, 页面 reload
//   - W136-PWA: 24h 免打扰 (P1-7) — 用户点"稍后"后, 24h 内不再弹同版本 toast
//     业务: SW 检测到新版本会持续触发 onNeedRefresh, 用户每天看 N 次很烦
//     解决: 记 localStorage 'w136-update-dismiss-until' = Date.now() + 24h
//     24h 内 onNeedRefresh 触发时, 不弹 toast + 不显示 indicator
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

/** W136: 24h 免打扰 localStorage key */
const DISMISS_UNTIL_KEY = 'w136-update-dismiss-until'
/** 免打扰时长: 24h = 86_400_000 ms */
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000

/**
 * 当前是否处于免打扰期 (24h dismiss window)
 *  - localStorage 缺失 / parse 失败 / 已过期 → 返回 false
 *  - 否则返回 true (onNeedRefresh 触发时不弹)
 */
function readDismissUntil(): number {
  if (typeof localStorage === 'undefined') return 0
  try {
    const raw = localStorage.getItem(DISMISS_UNTIL_KEY)
    if (!raw) return 0
    const n = Number(raw)
    if (!Number.isFinite(n) || n <= 0) return 0
    return n
  } catch {
    return 0
  }
}

/** W136: 设置 24h 免打扰截止时间戳 (用户点"稍后"时调) */
function setDismissUntil(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(DISMISS_UNTIL_KEY, String(Date.now() + DISMISS_DURATION_MS))
  } catch {
    // localStorage 满 / 隐私模式禁用 → 静默, 下次仍会弹
  }
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
  // W136: 是否在 24h 免打扰期 (初始化即读, 避免首帧闪烁)
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissUntil() > Date.now())

  useEffect(() => {
    // W136-PWA: 唯一 registerSW 入口 (P1-4 修)
    //  - main.tsx 已删 registerSW, 完全交给本组件
    //  - onNeedRefresh 时检查 dismissed 状态, 24h 免打扰期内不弹
    const updateSW = registerSW({
      onNeedRefresh() {
        if (readDismissUntil() > Date.now()) {
          // 24h 免打扰期内, 不弹 toast 也不显示 indicator
          // 业务: 用户主动刷新 / 关闭再开, 仍能拿到新 SW (skipWaiting 仍生效)
          return
        }
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

    // W136: test hook — 让 e2e 能 不依赖真 SW update 事件, 直接 trigger onNeedRefresh 路径
    //  - production: 仅 attach 在 window, 0 副作用 (没 SW 事件时是死对象)
    //  - e2e: 调 __w136_test_updateToast.triggerNeedRefresh() 模拟 SW 触发
    if (typeof window !== 'undefined') {
      ;(window as unknown as { __w136_test_updateToast?: unknown }).__w136_test_updateToast = {
        triggerNeedRefresh: () => {
          // 走跟 onNeedRefresh 一样的路径 (含 dismiss 检查)
          if (readDismissUntil() > Date.now()) return false
          setState((s) => ({ ...s, needRefresh: true }))
          setIndicator(true)
          return true
        },
        reset: () => {
          setState({ needRefresh: false, offlineReady: false })
          setIndicator(false)
        },
        isDismissed: () => readDismissUntil() > Date.now(),
      }
    }
    setUpdateFn(() => updateSW)
  }, [])

  // 顶 indicator 自动消失 (用户已看到 toast 后)
  useEffect(() => {
    if (state.needRefresh) {
      setIndicator(false)
    }
  }, [state.needRefresh])

  // W136: 不显示任何更新 UI (dismissed 期或根本无更新)
  if (dismissed || (!state.needRefresh && !state.offlineReady)) {
    // 只在 dismissed=false 时显示 indicator; dismissed=true 整体静默
    if (!dismissed && indicator) {
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
  // W144 a11y 修:
  //  - bg-emerald-600 (#059669) 白字 3.76:1 < 4.5:1 → 改 bg-emerald-700 (#047857) ≈ 5.6:1
  //  - close 按钮 w-5 h-5 = 20px < 24px → 改 min-h-6 min-w-6 (24px 最小可点击)
  //  - 加 m-1 拉大与邻居间距, 满足 target-size 间距 ≥24px
  if (state.offlineReady && !state.needRefresh) {
    return (
      <div
        role="status"
        aria-live="polite"
        data-testid="offline-ready-toast"
        className="fixed bottom-4 right-4 z-40 max-w-sm rounded-lg shadow-lg bg-emerald-700 text-white px-4 py-3 text-sm flex items-center gap-2 pointer-events-auto"
      >
        <span aria-hidden="true" className="font-bold">OK</span>
        <span>离线就绪 · 无网络也能用</span>
        <button
          onClick={() => setState((s) => ({ ...s, offlineReady: false }))}
          className="m-1 min-h-6 min-w-6 rounded-full hover:bg-white/20 flex items-center justify-center"
          aria-label="关闭离线就绪提示"
        >
          <IconClose size={10} aria-hidden="true" />
        </button>
      </div>
    )
  }

  // 新版本可用 (主提示)
  // 稍后按钮: W136 加 24h 免打扰 (P1-7)
  //  - 用户点稍后 → localStorage 写 dismiss-until = now + 24h
  //  - 24h 内 onNeedRefresh 再触发不弹 (本组件 useEffect 已 check)
  //
  // W144 a11y 修:
  //  - "立即更新" 按钮 px-3 py-1 (text-xs, ≈17px 高) < 24px → 改 min-h-6 (24px), 加 m-1
  //    让 a11y target-size 满足 ≥24px, 间距 ≥24px
  //  - "稍后" close 按钮 aria-label "稍后提醒 (24 小时内不再弹出)" 与 visible "×" 语义不一致
  //    (Lighthouse label-content-name-mismatch) → 改成 "关闭 (24 小时内不再弹出此更新提示)"
  //    "关闭" 与 visible "×" 语义一致 (× = 关闭的国际通用符号)
  //  - 顺手 IconClose size 12 → 10 视觉一致 (不参与 target-size, target-size 由 padding/margin 决定)
  //  - 加 m-1 让两按钮之间间距 ≥24px
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
          className="m-1 px-3 min-h-6 rounded bg-white/20 hover:bg-white/30 text-xs font-medium flex items-center"
          aria-label="立即更新到新版本"
        >
          立即更新
        </button>
        <button
          onClick={() => {
            // W136: 24h 免打扰
            setDismissUntil()
            setDismissed(true)
            setState((s) => ({ ...s, needRefresh: false }))
          }}
          data-testid="update-toast-dismiss"
          className="m-1 min-h-6 min-w-6 rounded-full hover:bg-white/20 flex items-center justify-center shrink-0"
          aria-label="关闭 (24 小时内不再弹出此更新提示)"
        >
          <IconClose size={12} aria-hidden="true" />
        </button>
      </div>
    </>
  )
}
