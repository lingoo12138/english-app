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

describe('W104 修 v1 跨路由 滚 动 位置 独立 (verifier B P1 修)', () => {
  it('Layout 含 navRef + scrollPosMapRef', () => {
    const layout = readFileSync('src/components/Layout.tsx', 'utf-8')
    expect(layout).toContain('navRef')
    expect(layout).toContain('scrollPosMapRef')
  })

  it('Layout 用 Map<path, number> 存 每 页 位置', () => {
    const layout = readFileSync('src/components/Layout.tsx', 'utf-8')
    expect(layout).toMatch(/Map<string,\s*number>/)
  })

  it('Layout 不 仍 用 scrollPosRef 旧 单 变量 (verifier B 修)', () => {
    const layout = readFileSync('src/components/Layout.tsx', 'utf-8')
    // 旧: scrollPosRef.current = navRef...  (save)
    expect(layout).not.toMatch(/scrollPosRef\.current\s*=\s*navRef/)
    // 旧: scrollPosRef.current (used in restore)
    expect(layout).not.toMatch(/navRef\.current\.scrollTop\s*=\s*scrollPosRef/)
  })

  it('cleanup 时 调 set 保存 离 开页 位置', () => {
    const layout = readFileSync('src/components/Layout.tsx', 'utf-8')
    expect(layout).toMatch(/scrollPosMapRef\.current\.set\(currentPath/)
  })

  it('进入 effect 时 调 get 恢复 该页 位置', () => {
    const layout = readFileSync('src/components/Layout.tsx', 'utf-8')
    expect(layout).toMatch(/scrollPosMapRef\.current\.get\(location\.pathname\)/)
  })

  it('Layout 桌面 nav 渲染 正确', () => {
    const { container } = render(React.createElement(MemoryRouter, null, React.createElement(Layout)))
    const nav = container.querySelector('aside nav')
    expect(nav).toBeTruthy()
    expect(nav?.className).toContain('overflow-y-auto')
  })
})
