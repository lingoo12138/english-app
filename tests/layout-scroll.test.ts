// layout-scroll.test.ts - 侧边栏 滚动 测
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

const layout = readFileSync('src/components/Layout.tsx', 'utf-8')

describe('W99 侧边栏 滚动', () => {
  it('桌面 aside 包含 overflow-y 控制 (跟 flex-col 配合)', () => {
    // 业务: 22 桌面 nav 项, 屏幕 < 22*40=880px 时 应 滚
    expect(layout).toMatch(/aside[^>]*overflow-y-auto|aside[^>]*overflow-hidden/)
  })

  it('桌面 nav 区域 包含 overflow-y-auto (内容 滚 aside 固定)', () => {
    // 业务: aside 固定, nav 内部 滚
    expect(layout).toMatch(/<nav[^>]*overflow-y-auto/)
  })
})
