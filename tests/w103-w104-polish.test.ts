// w103-w104-polish.test.ts - W103 滚动条 + W104 导航 滚 动 持久化
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import Layout from '../src/components/Layout'

describe('W103 滚动条 Firefox 兼容', () => {
  it('index.css 含 scrollbar-width: thin (Firefox)', () => {
    const css = readFileSync('src/index.css', 'utf-8')
    expect(css).toMatch(/(body,\s*aside|aside,\s*main|nav)[\s\S]{0,100}scrollbar-width:\s*thin/)
  })

  it('index.css 含 scrollbar-color (Firefox)', () => {
    const css = readFileSync('src/index.css', 'utf-8')
    expect(css).toMatch(/(body|aside|main|nav)[\s\S]{0,100}scrollbar-color:\s*rgb\(214\s*211\s*209\)/)
  })

  it('index.css dark 模式 滚动条 颜色', () => {
    const css = readFileSync('src/index.css', 'utf-8')
    expect(css).toMatch(/\.dark\s+(body|aside|main|nav)[\s\S]{0,200}scrollbar-color:\s*rgb\(87\s+83\s+78\)/)
  })
})

describe('W104 修 v1 + W109 跨路由 滚 动 位置 持久 化', () => {
  it('Layout 含 navRef + scrollPosMap (state)', () => {
    const layout = readFileSync('src/components/Layout.tsx', 'utf-8')
    expect(layout).toContain('navRef')
    expect(layout).toContain('scrollPosMap')
  })

  it('Layout 用 Map<path, number> 存 每 页 位置', () => {
    const layout = readFileSync('src/components/Layout.tsx', 'utf-8')
    expect(layout).toMatch(/Map<string,\s*number>/)
  })

  it('W109 改 useState 不 用 scrollPosMapRef (持久 化)', () => {
    const layout = readFileSync('src/components/Layout.tsx', 'utf-8')
    expect(layout).not.toMatch(/scrollPosMapRef\s*=\s*useRef<Map/)
  })

  it('W109 cleanup 时 调 setScrollPosMap + saveScrollPosMap', () => {
    const layout = readFileSync('src/components/Layout.tsx', 'utf-8')
    expect(layout).toMatch(/setScrollPosMap\(updated\)/)
    expect(layout).toMatch(/saveScrollPosMap\(updated\)/)
  })

  it('W109 进入 effect 时 调 scrollPosMap.get 恢复 该页 位置', () => {
    const layout = readFileSync('src/components/Layout.tsx', 'utf-8')
    expect(layout).toMatch(/scrollPosMap\.get\(location\.pathname\)/)
  })

  it('Layout 桌面 nav 渲染 正确', () => {
    const { container } = render(React.createElement(MemoryRouter, null, React.createElement(Layout)))
    const nav = container.querySelector('aside nav')
    expect(nav).toBeTruthy()
    expect(nav?.className).toContain('overflow-y-auto')
  })
})
