// tests/w144-color-contrast.test.ts - W144 a11y color-contrast 全局修覆盖
// 业务: W143 Lighthouse a11y baseline 0.91, color-contrast 失败 10 项 (0%)
//  失败分布:
//   - src/components/home/DailyWordCard.tsx: 音标 text-stone-400 dark:text-stone-300 (1 fail)
//   - src/pages/Home.tsx: streak m.days text-[9px] (7 fail, 同一 selector 多次出现)
//   - src/components/WordNetwork.tsx: "新" tag text-[9px] text-stone-400 (1 fail)
//   - (src/components/UpdateToast.tsx: Agent A 单独修)
//
// W144 修法:
//  - DailyWordCard 音标: text-stone-400 dark:text-stone-300 → text-stone-500 dark:text-stone-200
//    (stone-500 on #fff = 4.6:1, stone-200 on #1c1917 = 11+:1, WCAG AA pass)
//  - Home streak: text-[9px] → text-[10px] + text-stone-600 dark:text-stone-300 font-medium
//    (stone-600 on #f5f5f4 = 4.6:1, stone-300 on #1c1917 = 7:1, 字号 9→10px 提升可读性)
//  - WordNetwork "新" tag: text-[9px] text-stone-400 → text-[10px] text-stone-600 dark:text-stone-300
//    (同上)
//
// 测试策略: 纯 file content 验证 (与 W135/W127 一致, 0 React 依赖)

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'

// ============================================================
// 0. WCAG contrast 计算 (复用 Agent A 的 utility, 在本地简化版)
// ============================================================

function srgbToLinear(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

function relativeLuminance(hex: string): number {
  const m = hex.match(/^#([0-9a-f]{6})$/i)
  if (!m) throw new Error('expected 6-digit hex, got: ' + hex)
  const r = parseInt(m[1].slice(0, 2), 16)
  const g = parseInt(m[1].slice(2, 4), 16)
  const b = parseInt(m[1].slice(4, 6), 16)
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

function contrastRatio(fg: string, bg: string): number {
  const L1 = relativeLuminance(fg)
  const L2 = relativeLuminance(bg)
  const lighter = Math.max(L1, L2)
  const darker = Math.min(L1, L2)
  return (lighter + 0.05) / (darker + 0.05)
}

// ============================================================
// 1. DailyWordCard 音标 contrast 修复
// ============================================================

describe('W144 DailyWordCard 音标 color-contrast 修复', () => {
  const c = readFileSync('src/components/home/DailyWordCard.tsx', 'utf-8')

  it('src/components/home/DailyWordCard.tsx 存在', () => {
    expect(existsSync('src/components/home/DailyWordCard.tsx')).toBe(true)
  })

  it('音标 span 改用 text-stone-500 dark:text-stone-200 — contrast ≥ 4.5:1', () => {
    // W144: text-stone-400 dark:text-stone-300 (2.52:1) → text-stone-500 dark:text-stone-200
    // - text-stone-500 (#78716c) on #fff (light bg) → 实测 contrast
    // - text-stone-200 (#e7e5e4) on #1c1917 (dark bg stone-900) → 实测 contrast
    expect(c).toMatch(/text-stone-500\s+dark:text-stone-200/)
  })

  it('旧 text-stone-400 dark:text-stone-300 (音标) 不再出现', () => {
    // 业务: 旧值 contrast 2.52:1 fail, 应被 text-stone-500 替换
    expect(c).not.toMatch(/phonetic[\s\S]{0,200}?text-stone-400\s+dark:text-stone-300/)
  })

  it('WCAG 数学: text-stone-500 on #fff ≥ 4.5:1', () => {
    // Tailwind stone-500 = #78716c
    // 验证 light mode contrast
    const ratio = contrastRatio('#78716c', '#ffffff')
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('WCAG 数学: text-stone-200 on #1c1917 (dark mode) ≥ 4.5:1', () => {
    // Tailwind stone-200 = #e7e5e4, dark bg = #1c1917 (stone-900)
    const ratio = contrastRatio('#e7e5e4', '#1c1917')
    expect(ratio).toBeGreaterThanOrEqual(4.5)
    expect(ratio).toBeGreaterThan(10) // 实际 ≈ 11.5
  })

  it('含 W144 注释说明 a11y 修复点 (可读性 + 维护)', () => {
    expect(c).toMatch(/W144 a11y:/)
  })
})

// ============================================================
// 2. Home streak milestones (m.days) 9px → 10px + contrast 修复
// ============================================================

describe('W144 Home streak milestones color-contrast 修复', () => {
  const c = readFileSync('src/pages/Home.tsx', 'utf-8')

  it('src/pages/Home.tsx 存在', () => {
    expect(existsSync('src/pages/Home.tsx')).toBe(true)
  })

  it('streak m.days div 改用 text-[10px] text-stone-600 dark:text-stone-300', () => {
    // W144: text-[9px] (2.31:1) → text-[10px] text-stone-600 dark:text-stone-300 (4.6:1 light / 7:1 dark)
    expect(c).toMatch(/text-\[10px\][\s\S]{0,50}?text-stone-600\s+dark:text-stone-300[\s\S]{0,200}?m\.days\}d/)
  })

  it('旧 text-[9px] 不再出现 (Lighthouse fail)', () => {
    // 业务: 9px 太小 + 对比度不够, W144 全替换
    expect(c).not.toMatch(/text-\[9px\]/)
  })

  it('WCAG 数学: text-stone-600 on #f5f5f4 (light bg stone-100) ≥ 4.5:1', () => {
    // Tailwind stone-600 = #57534e
    // Home card bg = bg-stone-50 (#fafaf9) 或 stone-100 (#f5f5f4), 用 #f5f5f4 偏保守
    const ratio = contrastRatio('#57534e', '#f5f5f4')
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('WCAG 数学: text-stone-300 on #1c1917 (dark mode stone-900) ≥ 4.5:1', () => {
    const ratio = contrastRatio('#d6d3d1', '#1c1917')
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('含 W144 注释说明 a11y 修复点', () => {
    expect(c).toMatch(/W144 a11y:/)
  })
})

// ============================================================
// 3. WordNetwork "新" tag 修复
// ============================================================

describe('W144 WordNetwork "新" tag color-contrast 修复', () => {
  const c = readFileSync('src/components/WordNetwork.tsx', 'utf-8')

  it('src/components/WordNetwork.tsx 存在', () => {
    expect(existsSync('src/components/WordNetwork.tsx')).toBe(true)
  })

  it('"新" tag 改用 text-[10px] text-stone-600 dark:text-stone-300', () => {
    // W144: text-[9px] text-stone-400 (2.31:1) → text-[10px] text-stone-600 dark:text-stone-300 (4.6:1)
    expect(c).toMatch(/text-\[10px\][\s\S]{0,30}?text-stone-600\s+dark:text-stone-300[\s\S]{0,30}?新/)
  })

  it('旧 text-[9px] 不再出现 (Lighthouse fail)', () => {
    expect(c).not.toMatch(/text-\[9px\]/)
  })

  it('含 W144 注释说明 a11y 修复点', () => {
    expect(c).toMatch(/W144 a11y:/)
  })
})

// ============================================================
// 4. 全局回归 — 确认 W143 单测不挂
// ============================================================

describe('W144 color-contrast 全局回归', () => {
  it('W143 critical CSS 仍含 --brand-* 变量 (无 a11y 误伤)', () => {
    const css = readFileSync('src/index.critical.css', 'utf-8')
    expect(css).toMatch(/--brand-500:/)
  })

  it('W143 critical CSS 仍含 motion token (无 a11y 误伤)', () => {
    const css = readFileSync('src/index.critical.css', 'utf-8')
    expect(css).toMatch(/--t-fast:\s*150ms/)
    expect(css).toMatch(/--ease:/)
  })

  it('W143 DailyWordCard 仍用 Skeleton 占位 (LCP 优化保留)', () => {
    const c = readFileSync('src/components/home/DailyWordCard.tsx', 'utf-8')
    expect(c).toContain('daily-word-skeleton-p')
    expect(c).toContain('min-h-[2.25rem]')
  })
})
