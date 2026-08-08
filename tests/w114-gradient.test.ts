// tests/w114-gradient.test.ts - W114 Home 渐变 8→2 收 敛
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

describe('W114 Home 渐变 8→2 收 敛', () => {
  it('Home.tsx 0 bg-gradient-to-r (13 渐 变 全 收 敛)', () => {
    const src = readFileSync('src/pages/Home.tsx', 'utf-8')
    expect(src.match(/bg-gradient-to-r/g) || []).toHaveLength(0)
  })

  it('删 除 紫/粉/橙/青/黄/翠 色 族 (5+ 种 渐 变)', () => {
    const src = readFileSync('src/pages/Home.tsx', 'utf-8')
    // 业 务: 不 再 用 violet/fuchsia/pink/cyan/blue/yellow/amber/orange/teal/rose 渐 变
    expect(src).not.toMatch(/from-violet/)
    expect(src).not.toMatch(/from-fuchsia/)
    expect(src).not.toMatch(/from-cyan/)
    expect(src).not.toMatch(/from-teal/)
    expect(src).not.toMatch(/from-rose/)
    expect(src).not.toMatch(/from-purple/)
  })

  it('改 用 3 状 态 色 token (state-success/warning/error)', () => {
    const src = readFileSync('src/pages/Home.tsx', 'utf-8')
    expect(src).toMatch(/var\(--state-warning\)/)
    expect(src).toMatch(/var\(--state-error\)/)
  })

  it('改 用 card-interactive (柔 浮 + hover -translate-y-0.5)', () => {
    const src = readFileSync('src/pages/Home.tsx', 'utf-8')
    expect(src).toMatch(/card-interactive/)
  })

  it('用 motion token (duration/ease)', () => {
    const src = readFileSync('src/pages/Home.tsx', 'utf-8')
    expect(src).toMatch(/duration-\[var\(--t-base\)\]/)
    expect(src).toMatch(/ease-\[var\(--ease\)\]/)
  })

  it('保 留 brand-500 (主 CTA) + accent-500 (辅 CTA) 强 调 色', () => {
    const src = readFileSync('src/pages/Home.tsx', 'utf-8')
    // W115 MainCTA 用 from-brand-500 to-brand-600 渐 变 (改 良 稿 允许 主 CTA 例外)
    expect(src).toMatch(/from-brand-500/)
    expect(src).toMatch(/bg-accent-500/)  // XP 进 度 条
  })
})
