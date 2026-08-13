// src/components/KeyboardShortcutsModal.tsx - W148-A 快捷键面板
// 设计目标:
//  1. 表格 / 列表显示所有快捷键 (从 SHORTCUTS 拉数据, 0 硬编码)
//  2. 按 '?' 触发 (外层 Layout 调 setOpen(true))
//  3. 再按 '?' 或 Esc 关闭
//  4. 0 emoji (用 Icon SVG 或纯文字)
//  5. data-testid 供 e2e
//  6. 复用 Layout 的 modal 风格 (不强制走 src/components/Modal.tsx 的 confirm/cancel,
//     因为这是"信息展示" 不是"确认"; 自己用 dialog 语义 + 自带样式)
//
// 复用:
//   <KeyboardShortcutsModal open={open} onClose={() => setOpen(false)} />
//
// 路由:
//   '?' 在 keyboardShortcuts.ts 触发 'show-shortcuts' action, Layout 监听 w148-shortcut
//   调 setShowShortcuts(true)。
//   本组件自带 Esc 关闭: 当 open 时 addEventListener('keydown', Esc -> onClose), unmount 移除。
//   Layout 在 open 时调 setShortcutsEnabled(false) 暂停全局 g-h 等, 避免误触。

import { useEffect } from 'react'
import { SHORTCUTS, type ShortcutDef } from '../lib/keyboardShortcuts'
import { IconClose, IconKeyboard } from './Icon'

export interface KeyboardShortcutsModalProps {
  open: boolean
  onClose: () => void
}

/** 把 "g h" / "?" / "Enter" 渲染成按键样式 (kbd-like) */
function Kbd({ children }: { children: string }) {
  return (
    <kbd
      className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded border border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-800 text-xs font-mono font-semibold text-stone-700 dark:text-stone-200 shadow-[0_1px_0_rgba(0,0,0,0.08)]"
    >
      {children}
    </kbd>
  )
}

function Combo({ def }: { def: ShortcutDef }) {
  if (def.prefix) {
    return (
      <span className="inline-flex items-center gap-1" aria-label={`组合键 ${def.prefix} 加 ${def.key}`}>
        <Kbd>{def.prefix.toUpperCase()}</Kbd>
        <span className="text-stone-400 dark:text-stone-500 text-xs" aria-hidden="true">then</span>
        <Kbd>{def.key.toUpperCase()}</Kbd>
      </span>
    )
  }
  return <Kbd>{def.key === '?' ? '?' : def.key === 'Enter' ? 'Enter' : def.key === 'Escape' ? 'Esc' : def.key.toUpperCase()}</Kbd>
}

function ShortcutRow({ def }: { def: ShortcutDef }) {
  return (
    <tr
      data-testid={`shortcut-row-${def.action}`}
      className="border-t border-stone-100 dark:border-stone-800"
    >
      <td className="py-2.5 pr-3 align-top w-[40%]">
        <span className="text-sm text-stone-700 dark:text-stone-200">{def.description}</span>
        {def.wordListOnly && (
          <span className="ml-2 text-[10px] uppercase tracking-wider text-stone-400 dark:text-stone-500">
            (仅词库页)
          </span>
        )}
      </td>
      <td className="py-2.5 align-top">
        <Combo def={def} />
      </td>
    </tr>
  )
}

export function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  // Esc 关闭: open 时装一个顶层 keydown, 关闭时移除
  // (全局 shortcuts 在 open 时被 Layout 设为 disabled, 所以这里需要自己处理 Esc)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
      data-testid="keyboard-shortcuts-modal"
    >
      <div className="max-w-md w-full rounded-lg shadow-2xl bg-white dark:bg-slate-800">
        <div className="p-6 pb-3 flex items-center justify-between border-b border-stone-200 dark:border-stone-700">
          <h2
            id="shortcuts-modal-title"
            className="text-lg font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2"
          >
            <IconKeyboard size={20} strokeWidth={2} aria-hidden="true" />
            <span>键盘快捷键</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭快捷键面板"
            data-testid="shortcuts-modal-close"
            className="text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 p-1 rounded min-w-[28px] min-h-[28px] flex items-center justify-center"
          >
            <IconClose size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <div className="p-6 pt-4 max-h-[70vh] overflow-y-auto">
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
            按 <Kbd>?</Kbd> 打开 / 关闭此面板 · <Kbd>Esc</Kbd> 关闭 · 序列 <Kbd>g</Kbd> 等待 1.5 秒后超时
          </p>
          <table className="w-full text-left" data-testid="shortcuts-table">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400">
                <th scope="col" className="pb-2 font-semibold">动作</th>
                <th scope="col" className="pb-2 font-semibold">按键</th>
              </tr>
            </thead>
            <tbody>
              {SHORTCUTS.map((def) => (
                <ShortcutRow key={def.action} def={def} />
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 pb-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="shortcuts-modal-ok"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  )
}

export default KeyboardShortcutsModal
