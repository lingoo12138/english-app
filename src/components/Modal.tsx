import { useEffect, useRef } from 'react'

export interface ModalProps {
  open: boolean
  title: string
  message: string
  variant?: 'default' | 'danger' | 'info'
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * 共享 Modal 组件 — 替代 window.confirm()
 * 用法:
 *   const [open, setOpen] = useState(false)
 *   <Modal open={open} title="..." message="..." onConfirm={...} onCancel={() => setOpen(false)} />
 */
export function Modal({
  open,
  title,
  message,
  variant = 'default',
  confirmText = '确定',
  cancelText = '取消',
  showCancel = true,
  onConfirm,
  onCancel,
}: ModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    // 焦点管理: 打开时聚焦到确认按钮
    confirmRef.current?.focus()
    // Esc 关闭
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    // body 滚动锁定
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onCancel])

  if (!open) return null

  const variantClass = {
    default: 'bg-white dark:bg-slate-800',
    danger: 'bg-white dark:bg-slate-800 border-t-4 border-red-500',
    info: 'bg-white dark:bg-slate-800 border-t-4 border-blue-500',
  }[variant]

  const confirmClass = {
    default: 'bg-blue-600 hover:bg-blue-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    info: 'bg-blue-600 hover:bg-blue-700 text-white',
  }[variant]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={`max-w-md w-full rounded-lg shadow-2xl ${variantClass}`}>
        <div className="p-6">
          <h2 id="modal-title" className="text-lg font-semibold mb-3 text-slate-900 dark:text-slate-100">
            {title}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">{message}</p>
        </div>
        <div className="px-6 pb-6 flex gap-2 justify-end">
          {showCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-md text-sm font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
            >
              {cancelText}
            </button>
          )}
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-md text-sm font-medium ${confirmClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
