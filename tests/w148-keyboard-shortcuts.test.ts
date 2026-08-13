// tests/w148-keyboard-shortcuts.test.ts - W148-A 全局快捷键 (v3 plan E-3 桌面 PWA 增强)
// 业务: 19 周产品 0 真实键盘用户数据, 桌面 PWA 上 power user 大量用 j/k/?/g 组合
//  v3 plan E-3 范围:
//   - src/lib/keyboardShortcuts.ts (顶层 keydown + 序列 + 1.5s 超时 + input skip)
//   - src/components/KeyboardShortcutsModal.tsx (? 触发 / Esc 关闭 / data-testid)
//   - src/components/Layout.tsx 集成 (registerShortcuts + 渲染 modal + 路由跳转)
//   - src/pages/WordList.tsx 集成 (j/k 选中 / Enter 跳详情 / data-selected)
//
// 测试策略: 运行时行为 + 文件内容混合
//  - 注册 / 卸载 / 派发事件 (用 happy-dom 自带 window)
//  - input/textarea/contenteditable 不监听 (mock target, 验证 isEditableTarget)
//  - 序列: 'g' 等待 1.5s 重置 (用 vi.useFakeTimers)
//  - 文件内容: 验证 Icon / Modal / Layout / WordList 集成点

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import {
  registerShortcuts,
  unregisterShortcuts,
  setEnabled,
  isEnabled,
  getRouteForAction,
  isEditableTarget,
  normalizeKey,
  _resetForTest,
  _isInstalled,
  SHORTCUT_EVENT,
  SHORTCUTS,
  SEQUENCE_TIMEOUT_MS,
  type ShortcutEventDetail,
} from '../src/lib/keyboardShortcuts'

/** 派发 KeyboardEvent (顶层, target = document.body) */
function fireKey(opts: { key: string; code?: string; shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean; target?: EventTarget | null }): void {
  const ev = new KeyboardEvent('keydown', {
    key: opts.key,
    code: opts.code ?? (opts.key.length === 1 ? `Key${opts.key.toUpperCase()}` : opts.key),
    bubbles: true,
    cancelable: true,
    shiftKey: opts.shiftKey ?? false,
    ctrlKey: opts.ctrlKey ?? false,
    metaKey: opts.metaKey ?? false,
    altKey: opts.altKey ?? false,
  })
  // 让 target 落到 opts.target 或 document.body
  const target = (opts.target ?? document.body) as EventTarget
  target.dispatchEvent(ev)
}

/** 监听 w148-shortcut 事件, 返回收集到的 detail 列表 */
function captureShortcutEvents(): ShortcutEventDetail[] {
  const got: ShortcutEventDetail[] = []
  const handler = (e: Event) => {
    const d = (e as CustomEvent<ShortcutEventDetail>).detail
    if (d) got.push(d)
  }
  window.addEventListener(SHORTCUT_EVENT, handler as EventListener)
  return {
    [Symbol.dispose]() { window.removeEventListener(SHORTCUT_EVENT, handler as EventListener) },
    get list() { return got },
  } as unknown as { list: ShortcutEventDetail[]; [Symbol.dispose]: () => void }
}

// 简化: 用一个 helper, 自动 cleanup
function withCapture(fn: (got: ShortcutEventDetail[]) => void): void {
  const got: ShortcutEventDetail[] = []
  const handler = (e: Event) => {
    const d = (e as CustomEvent<ShortcutEventDetail>).detail
    if (d) got.push(d)
  }
  window.addEventListener(SHORTCUT_EVENT, handler as EventListener)
  try {
    fn(got)
  } finally {
    window.removeEventListener(SHORTCUT_EVENT, handler as EventListener)
  }
}

beforeEach(() => {
  // 每个测试都干净: 先卸载再 reset, 再注册
  unregisterShortcuts()
  _resetForTest()
  setEnabled(true)
})

afterEach(() => {
  unregisterShortcuts()
  vi.useRealTimers()
})

// ============================================================
// 1. 文件存在性 + SHORTCUTS 数据
// ============================================================

describe('W148-A 1. 文件存在 & SHORTCUTS 数据完整性', () => {
  it('keyboardShortcuts.ts 存在', () => {
    expect(existsSync('src/lib/keyboardShortcuts.ts')).toBe(true)
  })

  it('KeyboardShortcutsModal.tsx 存在', () => {
    expect(existsSync('src/components/KeyboardShortcutsModal.tsx')).toBe(true)
  })

  it('SHORTCUTS 含 10 项 (5 序列 + j + k + Enter + ? + Esc)', () => {
    expect(SHORTCUTS.length).toBe(10)
  })

  it('SHORTCUTS 序列含 5 个 g X 路由跳转', () => {
    const gotoActions = ['goto-home', 'goto-wordlist', 'goto-ai-chat', 'goto-settings', 'goto-errors']
    for (const a of gotoActions) {
      const def = SHORTCUTS.find(s => s.action === a)
      expect(def, `missing ${a}`).toBeDefined()
      expect(def!.prefix).toBe('g')
    }
  })

  it('SHORTCUTS 序列 1.5s 超时常量', () => {
    expect(SEQUENCE_TIMEOUT_MS).toBe(1500)
  })

  it('j / k / Enter 标记 wordListOnly (仅词库页)', () => {
    const j = SHORTCUTS.find(s => s.action === 'list-down')!
    const k = SHORTCUTS.find(s => s.action === 'list-up')!
    const ent = SHORTCUTS.find(s => s.action === 'list-open')!
    expect(j.wordListOnly).toBe(true)
    expect(k.wordListOnly).toBe(true)
    expect(ent.wordListOnly).toBe(true)
  })

  it('"?" 触发 show-shortcuts, 无 prefix', () => {
    const s = SHORTCUTS.find(x => x.action === 'show-shortcuts')!
    expect(s.prefix).toBeUndefined()
    expect(s.key).toBe('?')
  })

  it('getRouteForAction 路由表覆盖 5 个 goto 动作', () => {
    expect(getRouteForAction('goto-home')!.to).toBe('/')
    expect(getRouteForAction('goto-wordlist')!.to).toBe('/words')
    expect(getRouteForAction('goto-ai-chat')!.to).toBe('/chat')
    expect(getRouteForAction('goto-settings')!.to).toBe('/settings')
    expect(getRouteForAction('goto-errors')!.to).toBe('/errors')
    // j/k/Enter/?/Esc 不是路由跳转
    expect(getRouteForAction('list-down')).toBeUndefined()
    expect(getRouteForAction('show-shortcuts')).toBeUndefined()
  })
})

// ============================================================
// 2. registerShortcuts / unregisterShortcuts / setEnabled 生命周期
// ============================================================

describe('W148-A 2. register / unregister / setEnabled 生命周期', () => {
  it('registerShortcuts 幂等 — 多次调用只装一次', () => {
    registerShortcuts()
    registerShortcuts()
    registerShortcuts()
    expect(_isInstalled()).toBe(true)
    // 验证: 一次按键只派发一次
    withCapture((got) => {
      fireKey({ key: '?' })
      expect(got.length).toBe(1)
    })
  })

  it('unregisterShortcuts 后不再派发', () => {
    registerShortcuts()
    unregisterShortcuts()
    expect(_isInstalled()).toBe(false)
    withCapture((got) => {
      fireKey({ key: '?' })
      expect(got.length).toBe(0)
    })
  })

  it('setEnabled(false) 暂停派发, true 恢复', () => {
    registerShortcuts()
    setEnabled(false)
    expect(isEnabled()).toBe(false)
    withCapture((got) => {
      fireKey({ key: '?' })
      expect(got.length).toBe(0)
    })
    setEnabled(true)
    withCapture((got) => {
      fireKey({ key: '?' })
      expect(got.length).toBe(1)
      expect(got[0].action).toBe('show-shortcuts')
    })
  })

  it('带修饰键 (Ctrl/Meta/Alt) 的 keydown 不派发, 让浏览器保留', () => {
    registerShortcuts()
    withCapture((got) => {
      fireKey({ key: 'h', ctrlKey: true })
      fireKey({ key: 'h', metaKey: true })
      fireKey({ key: 'h', altKey: true })
      fireKey({ key: 'h' })
      // 只有最后那个无修饰键的 'h' 会作为序列 prefix 等待, 不派发
      expect(got.length).toBe(0)
    })
  })
})

// ============================================================
// 3. 单键触发: ? / j / k / Enter / Esc
// ============================================================

describe('W148-A 3. 单键触发', () => {
  it('"?" 触发 show-shortcuts', () => {
    registerShortcuts()
    withCapture((got) => {
      fireKey({ key: '?' })
      expect(got.length).toBe(1)
      expect(got[0].action).toBe('show-shortcuts')
      expect(got[0].combo).toBe('?')
      expect(got[0].wordListOnly).toBeUndefined()
    })
  })

  it('"j" 触发 list-down (wordListOnly=true)', () => {
    registerShortcuts()
    withCapture((got) => {
      fireKey({ key: 'j' })
      expect(got.length).toBe(1)
      expect(got[0].action).toBe('list-down')
      expect(got[0].wordListOnly).toBe(true)
    })
  })

  it('"k" 触发 list-up (wordListOnly=true)', () => {
    registerShortcuts()
    withCapture((got) => {
      fireKey({ key: 'k' })
      expect(got.length).toBe(1)
      expect(got[0].action).toBe('list-up')
    })
  })

  it('"Enter" 触发 list-open', () => {
    registerShortcuts()
    withCapture((got) => {
      fireKey({ key: 'Enter' })
      expect(got.length).toBe(1)
      expect(got[0].action).toBe('list-open')
    })
  })

  it('"Escape" 触发 close-modal', () => {
    registerShortcuts()
    withCapture((got) => {
      fireKey({ key: 'Escape' })
      expect(got.length).toBe(1)
      expect(got[0].action).toBe('close-modal')
    })
  })

  it('"g" 单按是 prefix, 不派发 (等 1.5s 后超时)', () => {
    registerShortcuts()
    withCapture((got) => {
      fireKey({ key: 'g' })
      expect(got.length).toBe(0)
    })
  })

  it('大写 "J" / "K" / "G" 归一化为小写 (业务忽略 shift)', () => {
    registerShortcuts()
    withCapture((got) => {
      fireKey({ key: 'J', shiftKey: true })
      expect(got[0].action).toBe('list-down')
      fireKey({ key: 'K', shiftKey: true })
      expect(got[1].action).toBe('list-up')
      // 'G' 是 prefix, 不派发
      fireKey({ key: 'G', shiftKey: true })
      expect(got.length).toBe(2)
    })
  })
})

// ============================================================
// 4. 序列: "g X" 触发 5 个 goto
// ============================================================

describe('W148-A 4. 序列 g X', () => {
  it('"g h" 触发 goto-home', () => {
    registerShortcuts()
    withCapture((got) => {
      fireKey({ key: 'g' })
      fireKey({ key: 'h' })
      expect(got.length).toBe(1)
      expect(got[0].action).toBe('goto-home')
      expect(got[0].combo).toBe('g h')
    })
  })

  it('"g w" 触发 goto-wordlist', () => {
    registerShortcuts()
    withCapture((got) => {
      fireKey({ key: 'g' })
      fireKey({ key: 'w' })
      expect(got[0].action).toBe('goto-wordlist')
    })
  })

  it('"g a" 触发 goto-ai-chat (项目实际路由 /chat)', () => {
    registerShortcuts()
    withCapture((got) => {
      fireKey({ key: 'g' })
      fireKey({ key: 'a' })
      expect(got[0].action).toBe('goto-ai-chat')
    })
  })

  it('"g s" 触发 goto-settings', () => {
    registerShortcuts()
    withCapture((got) => {
      fireKey({ key: 'g' })
      fireKey({ key: 's' })
      expect(got[0].action).toBe('goto-settings')
    })
  })

  it('"g e" 触发 goto-errors (项目实际路由 /errors)', () => {
    registerShortcuts()
    withCapture((got) => {
      fireKey({ key: 'g' })
      fireKey({ key: 'e' })
      expect(got[0].action).toBe('goto-errors')
    })
  })

  it('"g" 后按非 g X 的键 (如 "g x") — 不匹配, 重置 prefix, 不派发', () => {
    registerShortcuts()
    withCapture((got) => {
      fireKey({ key: 'g' })
      fireKey({ key: 'x' })
      expect(got.length).toBe(0)
      // prefix 已重置, 后续再按 h 是单键 'h' (单键里无 h, 不派发)
      fireKey({ key: 'h' })
      expect(got.length).toBe(0)
    })
  })

  it('"g" 后按 prefix 自身 (g g) — 不匹配, 重置', () => {
    registerShortcuts()
    withCapture((got) => {
      fireKey({ key: 'g' })
      fireKey({ key: 'g' })
      expect(got.length).toBe(0)
    })
  })
})

// ============================================================
// 5. 序列 1.5s 超时
// ============================================================

describe('W148-A 5. 序列 1.5s 超时 (避免 g h 误触)', () => {
  it('"g" 后 1.5s 内未按 X, prefix 超时重置, 后续 "h" 不触发 goto-home', () => {
    vi.useFakeTimers()
    registerShortcuts()
    withCapture((got) => {
      fireKey({ key: 'g' })
      // 推进 1.6s (超过 1.5s)
      vi.advanceTimersByTime(1600)
      fireKey({ key: 'h' })
      // 序列已超时, 'h' 又是单键里没有的 (只有 'g' 序列用 'h'), 不派发
      expect(got.length).toBe(0)
    })
  })

  it('"g" 后 1.4s 按 "h" 仍有效 (未超时)', () => {
    vi.useFakeTimers()
    registerShortcuts()
    withCapture((got) => {
      fireKey({ key: 'g' })
      vi.advanceTimersByTime(1400)
      fireKey({ key: 'h' })
      expect(got.length).toBe(1)
      expect(got[0].action).toBe('goto-home')
    })
  })

  it('"g" 后刚好 1500ms — 边界: 实现里是 setTimeout(fn, 1500), 此时刚好触发超时, 不派发', () => {
    vi.useFakeTimers()
    registerShortcuts()
    withCapture((got) => {
      fireKey({ key: 'g' })
      vi.advanceTimersByTime(1500)  // 正好到点
      fireKey({ key: 'h' })
      // 边界: 实现是 SEQUENCE_TIMEOUT_MS = 1500ms, 1500 推进后会清空 prefix
      expect(got.length).toBe(0)
    })
  })

  it('序列触发后 prefix 清空, 重新按 "g h" 仍可触发 (timer 已清)', () => {
    registerShortcuts()
    withCapture((got) => {
      fireKey({ key: 'g' })
      fireKey({ key: 'h' })
      expect(got.length).toBe(1)
      // 立即再按 g h
      fireKey({ key: 'g' })
      fireKey({ key: 'h' })
      expect(got.length).toBe(2)
      expect(got[1].action).toBe('goto-home')
    })
  })
})

// ============================================================
// 6. 不监听 input / textarea / contenteditable
// ============================================================

describe('W148-A 6. 不监听输入元素', () => {
  it('isEditableTarget — input 判定为 editable', () => {
    const div = document.createElement('div')
    document.body.appendChild(div)
    const input = document.createElement('input')
    div.appendChild(input)
    expect(isEditableTarget(input)).toBe(true)
    div.remove()
  })

  it('isEditableTarget — textarea 判定为 editable', () => {
    const ta = document.createElement('textarea')
    document.body.appendChild(ta)
    expect(isEditableTarget(ta)).toBe(true)
    ta.remove()
  })

  it('isEditableTarget — [contenteditable] 判定为 editable', () => {
    const d = document.createElement('div')
    d.setAttribute('contenteditable', 'true')
    document.body.appendChild(d)
    expect(isEditableTarget(d)).toBe(true)
    d.remove()
  })

  it('isEditableTarget — 普通 div 判定为非 editable', () => {
    const d = document.createElement('div')
    document.body.appendChild(d)
    expect(isEditableTarget(d)).toBe(false)
    d.remove()
  })

  it('isEditableTarget — null 判定为非 editable', () => {
    expect(isEditableTarget(null)).toBe(false)
  })

  it('input 内按 "j" 不派发 (避免破坏输入)', () => {
    registerShortcuts()
    const input = document.createElement('input')
    document.body.appendChild(input)
    withCapture((got) => {
      fireKey({ key: 'j', target: input })
      expect(got.length).toBe(0)
    })
    input.remove()
  })

  it('input 内按 "g h" 不派发 (避免搜索框内误触)', () => {
    registerShortcuts()
    const input = document.createElement('input')
    document.body.appendChild(input)
    withCapture((got) => {
      fireKey({ key: 'g', target: input })
      fireKey({ key: 'h', target: input })
      expect(got.length).toBe(0)
    })
    input.remove()
  })

  it('textarea 内按 "Enter" 不派发 (避免破坏换行)', () => {
    registerShortcuts()
    const ta = document.createElement('textarea')
    document.body.appendChild(ta)
    withCapture((got) => {
      fireKey({ key: 'Enter', target: ta })
      expect(got.length).toBe(0)
    })
    ta.remove()
  })

  it('contenteditable 内按 "g" 不派发', () => {
    registerShortcuts()
    const d = document.createElement('div')
    d.setAttribute('contenteditable', 'plaintext-only')
    document.body.appendChild(d)
    withCapture((got) => {
      fireKey({ key: 'g', target: d })
      fireKey({ key: 'h', target: d })
      expect(got.length).toBe(0)
    })
    d.remove()
  })

  it('input 失焦后, body 上的 keydown 仍可触发序列', () => {
    registerShortcuts()
    const input = document.createElement('input')
    document.body.appendChild(input)
    withCapture((got) => {
      // input 内按 g — 不派发
      fireKey({ key: 'g', target: input })
      // 之后在 body 上按 h — 已是新事件, prefix 被 input 触发的 keydown 重置
      fireKey({ key: 'h' })
      // 序列未匹配, 不派发
      expect(got.length).toBe(0)
    })
    input.remove()
  })
})

// ============================================================
// 7. normalizeKey + 其他工具
// ============================================================

describe('W148-A 7. 工具函数', () => {
  it('normalizeKey — 单字符转小写', () => {
    expect(normalizeKey({ key: 'a' } as KeyboardEvent)).toBe('a')
    expect(normalizeKey({ key: 'A' } as KeyboardEvent)).toBe('a')
    expect(normalizeKey({ key: 'Z' } as KeyboardEvent)).toBe('z')
  })

  it('normalizeKey — 多字符键 (Enter, Escape, Tab) 保持原样', () => {
    expect(normalizeKey({ key: 'Enter' } as KeyboardEvent)).toBe('Enter')
    expect(normalizeKey({ key: 'Escape' } as KeyboardEvent)).toBe('Escape')
    expect(normalizeKey({ key: 'Tab' } as KeyboardEvent)).toBe('Tab')
    expect(normalizeKey({ key: '?' } as KeyboardEvent)).toBe('?')
  })
})

// ============================================================
// 8. Layout / WordList 集成
// ============================================================

describe('W148-A 8. Layout / WordList 集成', () => {
  const layout = readFileSync('src/components/Layout.tsx', 'utf-8')
  const wordList = readFileSync('src/pages/WordList.tsx', 'utf-8')
  const modal = readFileSync('src/components/KeyboardShortcutsModal.tsx', 'utf-8')
  const icon = readFileSync('src/components/Icon.tsx', 'utf-8')
  const card = readFileSync('src/components/WordCard.tsx', 'utf-8')

  it('Layout.tsx — import registerShortcuts / unregisterShortcuts / setEnabled', () => {
    expect(layout).toMatch(/import\s*\{[^}]*registerShortcuts[^}]*\}\s*from\s*['"]\.\.\/lib\/keyboardShortcuts['"]/)
    expect(layout).toMatch(/import\s*\{[^}]*unregisterShortcuts[^}]*\}\s*from\s*['"]\.\.\/lib\/keyboardShortcuts['"]/)
    expect(layout).toMatch(/import\s*\{[^}]*setEnabled[^}]*\}\s*from\s*['"]\.\.\/lib\/keyboardShortcuts['"]/)
  })

  it('Layout.tsx — useEffect 调 register / unregister (mount / unmount)', () => {
    expect(layout).toMatch(/useEffect\(\(\)\s*=>\s*\{[^}]*registerShortcuts\(\)[^}]*return\s*\(\)\s*=>\s*unregisterShortcuts\(\)[^}]*\}/)
  })

  it('Layout.tsx — 渲染 <KeyboardShortcutsModal /> + open / onClose 配对', () => {
    expect(layout).toMatch(/<KeyboardShortcutsModal\s+open=\{showShortcuts\}\s+onClose=\{/)
  })

  it('Layout.tsx — 监听 w148-shortcut 事件 + navigate(route)', () => {
    // 注: Layout 用 SHORTCUT_EVENT 常量 (== 'w148-shortcut'), 也可能直接字符串
    expect(layout).toMatch(/addEventListener\((SHORTCUT_EVENT|['"]w148-shortcut['"])/)
    expect(layout).toMatch(/navigate\(route\.to\)/)
  })

  it('Layout.tsx — modal 打开时 setShortcutsEnabled(false) 暂停全局', () => {
    // 业务: 避免 modal 打开时 g h 误触跳转
    expect(layout).toMatch(/setShortcutsEnabled\(false\)/)
  })

  it('WordList.tsx — 监听 w148-shortcut 事件, j/k 移动, Enter 跳详情', () => {
    // 注: WordList 用 SHORTCUT_EVENT 常量
    expect(wordList).toMatch(/addEventListener\((SHORTCUT_EVENT|['"]w148-shortcut['"])/)
    expect(wordList).toMatch(/detail\.action\s*===\s*['"]list-down['"]/)
    expect(wordList).toMatch(/detail\.action\s*===\s*['"]list-up['"]/)
    expect(wordList).toMatch(/detail\.action\s*===\s*['"]list-open['"]/)
    expect(wordList).toMatch(/navigate\([`]\/words\/\$\{/)
  })

  it('WordList.tsx — 维护 selectedIndex 状态', () => {
    expect(wordList).toMatch(/useState<number>\(-1\)/)
    expect(wordList).toMatch(/setSelectedIndex/)
  })

  it('WordList.tsx — 切换学段 / 搜索时重置 selectedIndex', () => {
    expect(wordList).toMatch(/setSelectedIndex\(-1\)[\s\S]{0,200}?level[\s\S]{0,200}?debouncedQuery/)
  })

  it('WordList.tsx — 渲染时把 globalIndex === selectedIndex 传 isSelected', () => {
    expect(wordList).toMatch(/isSelected=\{globalIndex === selectedIndex\}/)
  })

  it('WordCard.tsx — 接收 isSelected + dataTestId, 加 ring + data-selected', () => {
    expect(card).toMatch(/isSelected\?/)
    expect(card).toMatch(/data-selected=\{isSelected \? 'true' : undefined\}/)
    expect(card).toMatch(/data-testid=\{dataTestId\}/)
  })

  it('KeyboardShortcutsModal — 0 emoji (用 Icon SVG 替)', () => {
    // 业务: 0 emoji 约束, IconKeyboard + IconClose 都是 SVG
    expect(modal).toMatch(/<IconKeyboard/)
    expect(modal).toMatch(/<IconClose/)
    // 简单检查: 整个文件不含 emoji 字符 (中文标点 + ASCII + 拉丁扩展外)
    // 排除掉 \u4e00-\u9fff (中文), 检查 emoji 区段
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{27BF}]/u
    expect(emojiRegex.test(modal)).toBe(false)
  })

  it('KeyboardShortcutsModal — 含 data-testid 供 e2e', () => {
    expect(modal).toMatch(/data-testid="keyboard-shortcuts-modal"/)
    expect(modal).toMatch(/data-testid="shortcuts-modal-close"/)
    expect(modal).toMatch(/data-testid="shortcuts-modal-ok"/)
    expect(modal).toMatch(/data-testid="shortcuts-table"/)
    // 注: ShortcutRow 用模板字符串 `shortcut-row-${def.action}`, 源码不直接展开
    // 验证模板字符串
    expect(modal).toMatch(/data-testid=\{`shortcut-row-\$\{def\.action\}`\}/)
    // action 字段定义在 keyboardShortcuts.ts (单独 import), 此处不重复验证
  })

  it('KeyboardShortcutsModal — Esc 关闭 (useEffect 装 keydown)', () => {
    expect(modal).toMatch(/addEventListener\(['"]keydown['"]/)
    expect(modal).toMatch(/e\.key\s*===\s*['"]Escape['"]/)
  })

  it('KeyboardShortcutsModal — 渲染所有 SHORTCUTS 行', () => {
    // 业务: 表格不硬编码, 从 SHORTCUTS 拉数据
    expect(modal).toMatch(/SHORTCUTS\.map\(/)
  })

  it('Icon.tsx — 增 IconKeyboard (W148-A 用)', () => {
    expect(icon).toMatch(/export const IconKeyboard\s*=/)
  })
})

// ============================================================
// 9. 0 emoji 校验 (全项目相关文件)
// ============================================================

describe('W148-A 9. 0 emoji 约束 (新增/修改文件)', () => {
  const files = [
    'src/lib/keyboardShortcuts.ts',
    'src/components/KeyboardShortcutsModal.tsx',
  ]
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{27BF}]/u

  for (const f of files) {
    it(`${f} 不含 emoji`, () => {
      const c = readFileSync(f, 'utf-8')
      expect(emojiRegex.test(c)).toBe(false)
    })
  }
})
