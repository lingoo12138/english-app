// W123d AIChat UI 优化 v2 — 3 大折叠 + 标题居中 + 3 圆按钮
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'

const readFile = (p: string) => fs.readFileSync(p, 'utf-8') as string

describe('W123d AIChat v2 — 3 大折叠 + 标题居中', () => {
  it('AIChat.tsx 顶部标题居中 + 3 圆按钮 (无长 btn-ghost 顶 4 操 作)', () => {
    const c = readFile('src/pages/AIChat.tsx')
    expect(c).toMatch(/W123d 顶 部 v2/)
    // 圆按钮 9x9 + hover bg
    expect(c).toContain('w-9 h-9 rounded-full hover:bg-stone-100')
    expect(c).toContain('text-lg font-bold') // 缩小 2xl → lg
  })

  it('3 大折叠 — 角色 (默认展开) + 场景/难度 + 自由话题', () => {
    const c = readFile('src/pages/AIChat.tsx')
    expect(c).toContain('openGroups.role')
    expect(c).toContain('openGroups.config')
    expect(c).toContain('aria-expanded={openGroups.role}')
    expect(c).toContain('aria-expanded={openGroups.config}')
    // 折叠箭头
    expect(c).toContain("rotate(0deg)' : 'rotate(-90deg)'")
  })

  it('角色默认展开 + 其他折叠 (W121 风格)', () => {
    const c = readFile('src/pages/AIChat.tsx')
    expect(c).toContain("role: true,")
    expect(c).toContain("config: false,")
  })

  it('Icon SVG — IconSettings + IconUser 加 入了 AIChat', () => {
    const c = readFile('src/pages/AIChat.tsx')
    expect(c).toContain('IconSettings')
    expect(c).toContain('IconUser')
  })

  it('历史按钮 badge 显示 (W123d 优化)', () => {
    const c = readFile('src/pages/AIChat.tsx')
    expect(c).toContain('chats.length}') // badge text
    expect(c).toContain('bg-brand-500 text-white text-[10px]')
  })

  it('0 emoji 顶部 4 操作 (W123a 已优化)', () => {
    const c = readFile('src/pages/AIChat.tsx')
    // 顶部不应该再有 emoji
    const topBlock = c.match(/W123d 顶 部 v2:([\s\S]{0,1000})3 圆 形 Icon 按 钮/)
    expect(topBlock).toBeTruthy()
    expect(topBlock![1]).not.toMatch(/💬|🆕|📤|📚/)
  })
})
