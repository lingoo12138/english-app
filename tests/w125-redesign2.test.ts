// W125 改版稿 2 — 暗色强化 + 高对比度 + PWA install slide-up
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'

const readFile = (p: string) => fs.readFileSync(p, 'utf-8') as string

describe('W125 改版稿 2 — 暗色强化 + 高对比度 + PWA slide-up', () => {
  it('CSS: 高对比度 [data-contrast=high] token', () => {
    const c = readFile('src/index.css')
    expect(c).toMatch(/:root\[data-contrast='high'\]/)
    expect(c).toContain('box-shadow: var(--shadow-soft)')
    expect(c).toContain('border-2 border-stone-300')
  })

  it('CSS: prefers-contrast: more 兼容 (系统级 a11y)', () => {
    const c = readFile('src/index.css')
    expect(c).toMatch(/@media \(prefers-contrast: more\)/)
  })

  it('CSS: 暗色强化 stone-950 + 阴影加深', () => {
    const c = readFile('src/index.css')
    expect(c).toMatch(/\.dark body \{[^}]*bg-stone-950/)
    expect(c).toContain('.dark .card {')
    expect(c).toContain('rgba(0,0,0,0.2)')
  })

  it('CSS: PWA slide-up 动效', () => {
    const c = readFile('src/index.css')
    expect(c).toMatch(/@keyframes slideUpBanner/)
    expect(c).toContain('.animate-slide-up')
    expect(c).toContain('cubic-bezier(0.34, 1.56, 0.64, 1)')
  })

  it('Icon.tsx: IconClose 新增 (W125 install prompt 用)', () => {
    const c = readFile('src/components/Icon.tsx')
    expect(c).toMatch(/export const IconClose = makeIcon/)
  })

  it('InstallPrompt.tsx: slide-up + Icon 替 emoji', () => {
    const c = readFile('src/components/InstallPrompt.tsx')
    expect(c).toContain('animate-slide-up')
    expect(c).toContain('rounded-2xl')
    expect(c).toContain('IconShare')
    expect(c).toContain('IconClose')
    // 无 emoji
    expect(c).not.toContain('📲')
    expect(c).not.toContain('⎙')
  })

  it('AppearanceSection.tsx: 高对比度 toggle + 暗色 toggle 动效', () => {
    const c = readFile('src/components/settings/AppearanceSection.tsx')
    expect(c).toContain('HIGH_CONTRAST_KEY')
    expect(c).toContain("data-contrast")
    expect(c).toContain("aria-pressed")
    expect(c).toMatch(/高对比度模式/)
    expect(c).toMatch(/ease-\[var\(--ease-spring\)\]/)
  })
})
