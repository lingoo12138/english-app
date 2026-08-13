// src/lib/keyboardShortcuts.ts - W148-A 全局快捷键 (v3 plan E-3 桌面 PWA 增强)
// 设计目标:
//  1. 顶层 keydown 监听, 不监听 input/textarea/[contenteditable] 内的按键
//  2. 序列快捷键 (g h) — 上次按键状态 + 1.5s 超时重置
//  3. 暴露 registerShortcuts / unregisterShortcuts / setEnabled
//  4. 通过 CustomEvent 'w148-shortcut' 派发, 让 UI 组件监听 (避免耦合 react-router)
//
// 约束 (来自 v3 plan E-3):
//  - 0 emoji
//  - 1.5s 序列超时
//  - 不破坏现有 Esc 关闭 modal (Modal 自带 keydown, 互不干扰)
//  - 全部 local-only, 0 网络
//
// 用法:
//   import { registerShortcuts, unregisterShortcuts, setEnabled } from '@/lib/keyboardShortcuts'
//   useEffect(() => { registerShortcuts(); return () => unregisterShortcuts() }, [])
//   window.addEventListener('w148-shortcut', (e) => { /* detail: { action, payload } */ })
//
//  路由表 (与 App.tsx / Layout.tsx 一致):
//   g h → /         (Home)
//   g w → /words    (WordList)
//   g a → /chat     (AIChat — Layout 用 'chat' 不是 'ai-chat', 已对齐)
//   g s → /settings (Settings)
//   g e → /errors   (ErrorsPage — 实际是错误列表, 跟 /errors/review /errors/history 同源)

import type { ReactNode } from 'react'

/** 路由目标 */
export interface ShortcutRoute {
  to: string
  label: string
}

/** 快捷键定义 (单键 + 序列前缀键) */
export interface ShortcutDef {
  /** 序列前缀 (如 'g'); 单独单键 (如 '?') 时为空 */
  prefix?: string
  /** 主键 (如 'h', 'j', 'k', 'Enter', '?', 'Escape') */
  key: string
  /** 业务动作名 */
  action: ShortcutAction
  /** 描述 (供 modal 表格显示) */
  description: string
  /** 是否仅在 WordList 路由生效 (j/k/Enter) */
  wordListOnly?: boolean
}

export type ShortcutAction =
  | 'goto-home'
  | 'goto-wordlist'
  | 'goto-ai-chat'
  | 'goto-settings'
  | 'goto-errors'
  | 'list-down'         // j
  | 'list-up'           // k
  | 'list-open'         // Enter
  | 'show-shortcuts'    // ?
  | 'close-modal'       // Esc (派发给 modal, 跟 Modal 自带 listener 不冲突 — 这里派发, UI 决定用不用)

export const SHORTCUTS: ShortcutDef[] = [
  { prefix: 'g', key: 'h', action: 'goto-home',       description: '跳转首页 (g h)' },
  { prefix: 'g', key: 'w', action: 'goto-wordlist',   description: '跳转词库 (g w)' },
  { prefix: 'g', key: 'a', action: 'goto-ai-chat',    description: '跳转 AI 对话 (g a)' },
  { prefix: 'g', key: 's', action: 'goto-settings',   description: '跳转设置 (g s)' },
  { prefix: 'g', key: 'e', action: 'goto-errors',     description: '跳转错题本 (g e)' },
  { key: 'j',           action: 'list-down',          description: '词列表向下 (j)', wordListOnly: true },
  { key: 'k',           action: 'list-up',            description: '词列表向上 (k)', wordListOnly: true },
  { key: 'Enter',       action: 'list-open',          description: '进入当前词详情 (Enter)', wordListOnly: true },
  { key: '?',           action: 'show-shortcuts',     description: '显示/隐藏快捷键面板 (?)' },
  { key: 'Escape',      action: 'close-modal',        description: '关闭任何弹层 (Esc)' },
]

/** 序列超时 (ms) — 避免 g h 误触 */
export const SEQUENCE_TIMEOUT_MS = 1500

/** 自定义事件名 */
export const SHORTCUT_EVENT = 'w148-shortcut'

export interface ShortcutEventDetail {
  action: ShortcutAction
  /** 序列: prefix + ' ' + key; 单键: key */
  combo: string
  /** 是否 WordList 路由触发 (用于上层过滤) */
  wordListOnly?: boolean
}

/** 路由表 (action → 路径) */
const ACTION_TO_ROUTE: Record<string, ShortcutRoute> = {
  'goto-home':     { to: '/',         label: '首页' },
  'goto-wordlist': { to: '/words',    label: '词库' },
  'goto-ai-chat':  { to: '/chat',     label: 'AI 对话' },
  'goto-settings': { to: '/settings', label: '设置' },
  'goto-errors':   { to: '/errors',   label: '错题本' },
}

/** 内部状态 */
let installed = false
let lastPrefix: string | null = null
let lastPrefixTimer: ReturnType<typeof setTimeout> | null = null
let enabled = true

/**
 * 判断事件 target 是否是文本输入元素 (input / textarea / [contenteditable])
 * 用于决定是否拦截 keydown.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  // contenteditable (含 "true" / "" / "plaintext-only")
  if (target.isContentEditable) return true
  return false
}

/**
 * 判断当前是否按住修饰键 (Ctrl/Meta/Alt) — 浏览器保留快捷键不能抢
 *  (例: Ctrl+R 刷新, Cmd+L 地址栏, Alt+Left 返回)
 */
function hasModifier(e: KeyboardEvent): boolean {
  return e.ctrlKey || e.metaKey || e.altKey
}

/**
 * 把 KeyboardEvent.key 归一化为快捷键定义里用的小写单字符
 *  - '?' (Shift+/) 浏览器已经给 '?', 不需要再处理
 *  - 'Escape' 保持原样 (匹配 SHORTCUTS)
 *  - 'Enter' 保持原样
 *  - 'a' / 'A' 都归一化为 'a' (uppercase -> lowercase, 业务忽略 shift)
 *  - '?' 也保持 (已经是 ?)
 */
export function normalizeKey(e: KeyboardEvent): string {
  const k = e.key
  // 特殊键: Escape / Enter / Tab / ArrowUp / ArrowDown 等保持原样
  if (k.length > 1) return k
  // 单字符: 归一化为小写
  return k.toLowerCase()
}

function clearPrefixTimer(): void {
  if (lastPrefixTimer != null) {
    clearTimeout(lastPrefixTimer)
    lastPrefixTimer = null
  }
}

function setPrefixTimer(): void {
  clearPrefixTimer()
  lastPrefixTimer = setTimeout(() => {
    lastPrefix = null
    lastPrefixTimer = null
  }, SEQUENCE_TIMEOUT_MS)
}

function dispatch(detail: ShortcutEventDetail): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<ShortcutEventDetail>(SHORTCUT_EVENT, { detail }))
}

/** 顶层 keydown handler */
function onKeyDown(e: KeyboardEvent): void {
  if (!enabled) return
  // 修饰键按住时跳过 — 让浏览器保留快捷键 (Ctrl+R, Cmd+L, Alt+←)
  if (hasModifier(e)) {
    // 但仍重置序列, 避免污染
    if (lastPrefix) {
      lastPrefix = null
      clearPrefixTimer()
    }
    return
  }
  // 不监听输入元素
  if (isEditableTarget(e.target)) {
    if (lastPrefix) {
      lastPrefix = null
      clearPrefixTimer()
    }
    return
  }

  const key = normalizeKey(e)

  // 序列处理: 已有 lastPrefix, 看是否匹配 prefix+key 组合
  if (lastPrefix) {
    const matched = SHORTCUTS.find(
      (s) => s.prefix === lastPrefix && s.key === key && s.prefix,
    )
    if (matched) {
      // 阻止浏览器默认行为 (例: 'gg' 在 vim 浏览器扩展里会被拦截, 但普通浏览器无)
      e.preventDefault()
      dispatch({
        action: matched.action,
        combo: `${lastPrefix} ${key}`,
        wordListOnly: matched.wordListOnly,
      })
      lastPrefix = null
      clearPrefixTimer()
      return
    }
    // 不匹配: 重置 (不阻止, 让单键 'h' 等可能走其它逻辑; 这里只关心是否触发序列)
    lastPrefix = null
    clearPrefixTimer()
    // 不 return, 继续处理单键
  }

  // 单键匹配 (prefix 为空, 即主键直接触发)
  const single = SHORTCUTS.find((s) => !s.prefix && s.key === key)
  if (single) {
    // 某些单键需要 preventDefault:
    //  - '?': 浏览器默认是 Shift+/ 组合, 不会触发 help, 但 preventDefault 安全
    //  - 'Enter': 在 form / button 上 preventDefault 会阻止点击; 只在非 form 元素上拦截
    //    这里我们不主动 preventDefault, 让浏览器自然处理 (本组件只派发事件)
    //  - 'j' / 'k' / 'Escape': 浏览器无默认, 不需要拦截
    if (key === '?') e.preventDefault()
    dispatch({
      action: single.action,
      combo: key,
      wordListOnly: single.wordListOnly,
    })
    return
  }

  // 序列前缀: 'g' 本身是 prefix
  const isPrefix = SHORTCUTS.some((s) => s.prefix === key)
  if (isPrefix) {
    // '?' 不可能是 prefix (它是单键), 但 key=='g' 时会进入
    // 'g' 本身是 prefix
    lastPrefix = key
    setPrefixTimer()
    return
  }
}

/**
 * 注册顶层 keydown 监听
 * 幂等: 多次调用只装一次
 */
export function registerShortcuts(): void {
  if (typeof window === 'undefined') return
  if (installed) return
  installed = true
  window.addEventListener('keydown', onKeyDown)
}

/**
 * 卸载顶层 keydown 监听
 */
export function unregisterShortcuts(): void {
  if (typeof window === 'undefined') return
  if (!installed) return
  installed = false
  window.removeEventListener('keydown', onKeyDown)
  lastPrefix = null
  clearPrefixTimer()
}

/**
 * 启用 / 禁用全局快捷键
 *  - false 时 onKeyDown 直接 return (仍占用 listener, 但不触发)
 *  - 典型场景: modal 打开时禁用, 避免 g h 误触跳转; Esc 仍由 Modal 自带处理
 */
export function setEnabled(value: boolean): void {
  enabled = value
}

export function isEnabled(): boolean {
  return enabled
}

/**
 * 根据 action 拿到路由 (供 listener 调 navigate)
 *  不是快捷键的 action (j/k/Enter/?/Esc) 返回 undefined
 */
export function getRouteForAction(action: ShortcutAction): ShortcutRoute | undefined {
  return ACTION_TO_ROUTE[action]
}

/**
 * 重置序列状态 (测试 / 调试用)
 */
export function _resetForTest(): void {
  lastPrefix = null
  clearPrefixTimer()
  enabled = true
}

// 仅供单测, 让测试能拿到"已装"状态
export function _isInstalled(): boolean {
  return installed
}

// 仅供类型推断
export type ShortcutReactNode = ReactNode
