import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: number
  type: ToastType
  message: string
  duration: number
}

interface ToastState {
  toasts: Toast[]
  show: (message: string, type?: ToastType, duration?: number) => number
  dismiss: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message, type = 'info', duration = 3000) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, type, message, duration }] }))
    if (duration > 0) {
      setTimeout(() => get().dismiss(id), duration)
    }
    return id
  },
  dismiss: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))

/** 便捷函数 — 替代 window.alert() */
export const toast = {
  success: (msg: string, duration = 3000) => useToastStore.getState().show(msg, 'success', duration),
  error: (msg: string, duration = 4000) => useToastStore.getState().show(msg, 'error', duration),
  info: (msg: string, duration = 3000) => useToastStore.getState().show(msg, 'info', duration),
  warning: (msg: string, duration = 3000) => useToastStore.getState().show(msg, 'warning', duration),
}

/**
 * Toast 容器 — 放在 Layout 顶层
 * 渲染所有 toast + 顶部堆叠 + 滑入动画
 */
export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  )
}

const variantClass: Record<ToastType, string> = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-blue-600 text-white',
  warning: 'bg-amber-500 text-white',
}

const variantIcon: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
  warning: '⚠️',
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div
      className={`pointer-events-auto px-4 py-3 rounded-lg shadow-lg max-w-md min-w-[200px] flex items-start gap-2 ${variantClass[t.type]} animate-slide-down`}
    >
      <span className="text-base flex-shrink-0">{variantIcon[t.type]}</span>
      <p className="text-sm font-medium flex-1 whitespace-pre-line">{t.message}</p>
      <button
        onClick={onDismiss}
        className="text-white/80 hover:text-white text-lg leading-none flex-shrink-0"
        aria-label="关闭"
      >
        ×
      </button>
    </div>
  )
}
