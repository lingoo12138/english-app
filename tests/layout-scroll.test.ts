// layout-scroll.test.ts - 侧边栏 滚动 测
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Layout from '../src/components/Layout'
import React from 'react'

const layout = readFileSync('src/components/Layout.tsx', 'utf-8')

describe('W100 侧边栏 滚动 修复', () => {
  it('桌面 aside 包含 overflow-y 控制 (跟 flex-col 配合)', () => {
    // 业务: 22 桌面 nav 项, 屏幕 < 22*40=880px 时 应 滚
    expect(layout).toMatch(/aside[^>]*md:overflow-hidden/)
  })

  it('桌面 nav 包含 min-h-0 (flex item 滚 动 关键)', () => {
    // 业务关键: 没 min-h-0 时 flex item 默认 min-height: auto, overflow-y-auto 失效
    expect(layout).toMatch(/<nav[^>]*min-h-0/)
  })

  it('桌面 nav 包含 flex-1 (占 满 剩余 空间)', () => {
    expect(layout).toMatch(/<nav[^>]*flex-1/)
  })

  it('桌面 aside 包含 hidden md:flex (响应式 显示)', () => {
    expect(layout).toMatch(/aside[^>]*hidden[^>]*md:flex/)
  })

  it('移动 端 header 包含 md:hidden (不 在 桌面 显示)', () => {
    expect(layout).toMatch(/<header[^>]*md:hidden/)
  })

  it('移动 端 底部 nav 包含 md:hidden fixed bottom-0 (不 在 桌面 显示)', () => {
    expect(layout).toMatch(/<nav[^>]*md:hidden[^>]*fixed[^>]*bottom-0/)
  })

  it('桌面 nav 区域 包含 overflow-y-auto (内容 滚 aside 固定)', () => {
    // 业务: aside 固定, nav 内部 滚
    expect(layout).toMatch(/<nav[^>]*overflow-y-auto/)
  })

  it('业务 关键: W121 桌 面 22 项 收 敛 4 大 组 (P1-3 改 良)', () => {
    // W121: 22 项 → 4 大 组 (学 习/练 习/复 习/设 置) 折 叠
    // 源 码 验 证 4 大 组 全 存 在 (不 再 强 制 渲 染 22 项, 折 叠 后 默 认 仅 学 习 6 项)
    const layoutSrc = readFileSync('src/components/Layout.tsx', 'utf-8')
    expect(layoutSrc).toMatch(/label: '学习'/)
    expect(layoutSrc).toMatch(/label: '练习'/)
    expect(layoutSrc).toMatch(/label: '复习'/)
    expect(layoutSrc).toMatch(/label: '设置'/)
    // 22 项 原 始 项 全 存 在 源 码 (只 是 折 叠)
    expect(layoutSrc).toContain('跟读趋势')
    expect(layoutSrc).toContain('成就')
    expect(layoutSrc).toContain('文档')
  })
})

// W112 修: 移 动 Tab 10→5 UX bug (6-10 项 静默 丢 弃)
describe('W112 移 动 Tab UX bug 修', () => {
  it('移 动 Tab 缩 到 5 项 (避 免 grid-cols-5 静默 丢 弃)', () => {
    // 业务: 之前 10 项, grid-cols-5 只 渲 染 前 5, 6-10 永 远 不 见
    const mobileNavMatch = layout.match(/const mobileNav = \[([\s\S]*?)\]/)
    expect(mobileNavMatch).toBeTruthy()
    const items = (mobileNavMatch![1].match(/to: '/g) || []).length
    expect(items).toBe(5)
  })

  it('5 项 含 高频: 首页/词 库/场景/AI/我的', () => {
    expect(layout).toMatch(/to: '\/'.*首页/)
    expect(layout).toMatch(/to: '\/words'.*词库/)
    expect(layout).toMatch(/to: '\/scenes'.*场景/)
    expect(layout).toMatch(/to: '\/chat'.*AI/)
    expect(layout).toMatch(/to: '\/settings'.*我的/)
  })

  it('移 动 nav 注释 含 5 项 + UX bug 修 说明', () => {
    expect(layout).toMatch(/W112 UX bug 修/)
  })

  it('grid-cols-5 跟 5 项 一 致 (不 再 静默 丢 弃)', () => {
    // 业务: grid-cols-5 渲 染 5 项, 现 在 5 项 = 一 致
    const mobileNavMatch = layout.match(/const mobileNav = \[([\s\S]*?)\]/)
    const items = (mobileNavMatch![1].match(/to: '/g) || []).length
    expect(items).toBe(5)
    expect(layout).toContain('grid-cols-5')
  })
})
