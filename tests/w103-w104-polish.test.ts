// w103-w104-polish.test.ts - W103 滚动条 + W104 导航 滚 动 持久化
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { render } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import React from 'react'
import Layout from '../src/components/Layout'

describe('W103 滚动条 Firefox 兼容', () => {
  it('index.css 含 scrollbar-width: thin (Firefox)', () => {
    const css = readFileSync('src/index.css', 'utf-8')
    expect(css).toMatch(/scrollbar-width:\s*thin/)
  })

  it('index.css 含 scrollbar-color (Firefox)', () => {
    const css = readFileSync('src/index.css', 'utf-8')
    expect(css).toMatch(/scrollbar-color:\s*rgb\(214\s*211\s*209\)/)
  })

  it('index.css dark 模式 滚动条 颜色', () => {
    const css = readFileSync('src/index.css', 'utf-8')
    expect(css).toMatch(/\.dark\s*\*[\s\S]{0,100}scrollbar-color:\s*rgb\(87\s*83\s*78\)/)
  })
})

describe('W104 导航 后 侧边栏 滚 动 持久化', () => {
  it('Layout 含 navRef + scrollPosRef', () => {
    const layout = readFileSync('src/components/Layout.tsx', 'utf-8')
    expect(layout).toContain('navRef')
    expect(layout).toContain('scrollPosRef')
  })

  it('Layout 桌面 nav 渲染 正确', () => {
    const { container } = render(React.createElement(MemoryRouter, null, React.createElement(Layout)))
    const nav = container.querySelector('aside nav')
    expect(nav).toBeTruthy()
    expect(nav?.className).toContain('overflow-y-auto')
  })
})
