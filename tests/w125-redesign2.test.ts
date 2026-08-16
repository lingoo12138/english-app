// W125 改版稿 2 — 暗色强化 + 高对比度 + PWA install slide-up
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'

const readFile = (p: string) => fs.readFileSync(p, 'utf-8') as string

describe('W125 改版稿 2 — 暗色强化 + 高对比度 + PWA slide-up', () => {
  // W143: critical CSS inline 拆出 — 检查 index.critical.css + index.css
  const c = readFile('src/index.critical.css') + '\n' + readFile('src/index.css')

  it('CSS: 高对比度 [data-contrast=high] token', () => {
    expect(c).toMatch(/:root\[data-contrast='high'\]/)
    expect(c).toContain('box-shadow: var(--shadow-soft)')
    expect(c).toContain('border-2 border-stone-300')
  })

  it('CSS: prefers-contrast: more 兼容 (系统级 a11y)', () => {
    expect(c).toMatch(/@media \(prefers-contrast: more\)/)
  })

  it('CSS: 暗色强化 stone-950 + 阴影加深', () => {
    expect(c).toMatch(/\.dark body \{[^}]*bg-stone-950/)
    expect(c).toContain('.dark .card {')
    expect(c).toContain('rgba(0,0,0,0.2)')
  })

  it('CSS: PWA slide-up 动效', () => {
    expect(c).toMatch(/@keyframes slideUpBanner/)
    expect(c).toContain('.animate-slide-up')
    expect(c).toMatch(/ease-spring|cubic-bezier\(0\.34, 1\.56, 0\.64, 1\)/)
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
    // W149 反馈 25: 暗色 + 高对比度 2 个开关改用 <Switch> 组件 (替代手写 button+div)
    // Switch 内部 role="switch" + aria-checked (a11y 跟 aria-pressed 同等)
    // spring 缓动移到 .switch-thumb CSS (W149 反馈 18) — 源码不再用 ease-spring 直接
    expect(c).toMatch(/<Switch[\s\S]{0,200}settings-(darkmode|highcontrast)-toggle/)
    expect(c).toMatch(/高对比度模式/)
    // 注: 旧版 transition-transform ease-spring 移到 .switch-thumb CSS
    const css = readFile('src/index.css')
    expect(css).toMatch(/\.switch-thumb\s*\{[^}]*transition:\s*transform\s+var\(--t-base\)\s+var\(--ease-spring\)/)
  })
})
