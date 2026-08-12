// tests/w144-home-buttons-a11y.test.ts - W144 Home 分享/首启引导按钮 a11y 修覆盖
// 业务: W144 v1 修完 color-contrast 后, Lighthouse 复测发现 2 个剩余 fail:
//  1. target-size: Home 分享按钮 (text-xs px-3 py-1.5 → min-h-6 m-1)
//  2. target-size + label-content-name-mismatch: 首启引导按钮 (text-[10px] → min-h-6 min-w-6 + aria-label 含 visible "NEW")
//
// W144 v2 修法:
//  - 分享按钮: 加 min-h-6 m-1, 保持可见文字 "📤 分享", aria-label 仍 "分享学习进度"
//  - 首启引导按钮: 加 min-h-6 min-w-6 flex items-center justify-center, visible text 缩为 "NEW"
//    (原 "NEW · 5 分钟了解" 含 "·" 让 Lighthouse 误判), aria-label 改为 "打开首启引导 NEW 5 分钟了解"
//    包含 visible "NEW" 关键词 → 满足 label-content-name-mismatch

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'

describe('W144 Home 分享/首启引导按钮 a11y 修', () => {
  const c = readFileSync('src/pages/Home.tsx', 'utf-8')

  it('src/pages/Home.tsx 存在', () => {
    expect(existsSync('src/pages/Home.tsx')).toBe(true)
  })

  // ============ 分享按钮 target-size 修复 ============

  it('分享按钮含 min-h-6 m-1 (24px + 间距) — target-size 修复', () => {
    // 业务: 旧 text-xs px-3 py-1.5 → 17px 高 < 24px fail
    //  W144: 加 min-h-6 (24px 最小可点击) + m-1 (拉大与邻居间距)
    // 注: className 在 aria-label 之前, 直接验证 className 内容
    expect(c).toMatch(/aria-label="分享学习进度"[\s\S]{0,50}?分享/)
    // 验证同 button 的 className 包含 min-h-6 m-1
    const shareBtnBlock = c.match(/aria-label="分享学习进度"[\s\S]{0,200}/)
    expect(shareBtnBlock).toBeTruthy()
    // 反向查: 找 aria-label 之前 200 字符里的 className
    const shareIdx = c.indexOf('aria-label="分享学习进度"')
    const before = c.substring(Math.max(0, shareIdx - 400), shareIdx)
    expect(before).toMatch(/min-h-6/)
    expect(before).toMatch(/m-1/)
  })

  it('分享按钮 visible "分享" 仍保留 (W144 不改文案)', () => {
    // aria-label + visible 一致 → 无 label-content-name-mismatch
    expect(c).toMatch(/aria-label="分享学习进度"[\s\S]{0,200}?分享/)
  })

  // ============ 首启引导按钮 target-size + label-name 修复 ============

  it('首启引导按钮含 min-h-6 min-w-6 (24x24) — target-size 修复', () => {
    // 旧 text-[10px] px-2 py-0.5 → 19px 高 < 24px fail
    // W144: min-h-6 min-w-6 强制 24x24
    const idx = c.indexOf('aria-label="打开首启引导 NEW 5 分钟了解"')
    expect(idx).toBeGreaterThan(0)
    const before = c.substring(Math.max(0, idx - 500), idx)
    expect(before).toMatch(/min-h-6/)
    expect(before).toMatch(/min-w-6/)
  })

  it('首启引导按钮 aria-label 含 visible "NEW" 关键词 — label-content-name-mismatch 修', () => {
    // 旧 aria-label "打开首启引导" 跟 visible "NEW · 5 分钟了解" 语义不匹配
    // W144: aria-label 改 "打开首启引导 NEW 5 分钟了解" — visible 关键词 (NEW, 5 分钟了解) 都在 aria-label
    expect(c).toContain('aria-label="打开首启引导 NEW 5 分钟了解"')
    // visible text 缩为 "NEW" (避免 "·" 让 Lighthouse 误判)
    // 源码结构: aria-label 在 button 标签中间, visible "NEW" 在 >...</button> 之间
    const idx = c.indexOf('aria-label="打开首启引导 NEW 5 分钟了解"')
    const after = c.substring(idx, idx + 300)
    expect(after).toMatch(/>\s*NEW\s*</)
  })

  it('首启引导按钮含 flex items-center justify-center (24x24 内居中)', () => {
    const idx = c.indexOf('aria-label="打开首启引导 NEW 5 分钟了解"')
    const before = c.substring(Math.max(0, idx - 500), idx)
    expect(before).toMatch(/flex[\s\S]{0,50}?items-center[\s\S]{0,50}?justify-center/)
  })

  it('含 W144 注释说明 a11y 修复点', () => {
    // W144 注释: "text-[10px] px-2 py-0.5 → min-h-6 min-w-6 (24x24 WCAG 2.5.8) + aria-label 含 visible 'NEW' 关键词 (label-content-name-mismatch 修)"
    expect(c).toMatch(/W144 a11y:.*label-content-name-mismatch/)
  })
})
