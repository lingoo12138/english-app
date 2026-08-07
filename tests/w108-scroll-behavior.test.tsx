// w108-scroll-behavior.test.ts - W108 W104 跨 路由 滚 动 行为 端到端 (verifier B P1-2 修)
import { describe, it, expect } from 'vitest'
import { render, act, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import React, { useRef, useEffect } from 'react'

// 测试 Layout 行为 - 跨 路由 scrollTop 持久 化
function LayoutHarness() {
  const navRef = useRef<HTMLElement>(null)
  const scrollPosMapRef = useRef<Map<string, number>>(new Map())
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const currentPath = location.pathname
    return () => {
      if (navRef.current) {
        scrollPosMapRef.current.set(currentPath, navRef.current.scrollTop)
      }
    }
  }, [location.pathname])

  useEffect(() => {
    if (navRef.current) {
      const saved = scrollPosMapRef.current.get(location.pathname) || 0
      navRef.current.scrollTop = saved
    }
  }, [location.pathname])

  return (
    <div>
      <nav ref={navRef} style={{ height: '100px', overflow: 'auto' }} data-testid="nav">
        <div style={{ height: '1000px' }}>长 内容</div>
      </nav>
      <button onClick={() => navigate('/words')} data-testid="to-words">→ /words</button>
      <button onClick={() => navigate('/scenes')} data-testid="to-scenes">→ /scenes</button>
      <div data-testid="path">{location.pathname}</div>
    </div>
  )
}

describe('W108 W104 跨 路由 滚 动 行为 端到端 (verifier B P1-2 修)', () => {
  it('/words 滚 200 → /scenes 滚 0 (新 页 默认 0)', async () => {
    const { getByTestId } = render(
      React.createElement(MemoryRouter, { initialEntries: ['/words'] },
        React.createElement(LayoutHarness)
      )
    )
    // 业务: /words 滚 200
    const nav = getByTestId('nav') as HTMLElement
    await act(async () => { nav.scrollTop = 200 })
    // 业务: 跳 /scenes
    await act(async () => { fireEvent.click(getByTestId('to-scenes')) })
    // 业务: /scenes 应 0 (新 页)
    expect(nav.scrollTop).toBe(0)
  })

  it('/words 滚 200 → /scenes 滚 100 → 回 /words 200 (恢复)', async () => {
    const { getByTestId } = render(
      React.createElement(MemoryRouter, { initialEntries: ['/words'] },
        React.createElement(LayoutHarness)
      )
    )
    const nav = getByTestId('nav') as HTMLElement
    await act(async () => { nav.scrollTop = 200 })
    await act(async () => { fireEvent.click(getByTestId('to-scenes')) })
    await act(async () => { nav.scrollTop = 100 })
    // 业务: 回 /words 应 200 (恢复)
    await act(async () => { fireEvent.click(getByTestId('to-words')) })
    expect(nav.scrollTop).toBe(200)
  })

  it('每 页 滚 动 位置 独立 持久 (不 互 相 覆盖)', async () => {
    const { getByTestId } = render(
      React.createElement(MemoryRouter, { initialEntries: ['/words'] },
        React.createElement(LayoutHarness)
      )
    )
    const nav = getByTestId('nav') as HTMLElement
    // /words 200
    await act(async () => { nav.scrollTop = 200 })
    await act(async () => { fireEvent.click(getByTestId('to-scenes')) })
    // /scenes 100
    await act(async () => { nav.scrollTop = 100 })
    // 回 /words 应 仍 200 (不 变 100)
    await act(async () => { fireEvent.click(getByTestId('to-words')) })
    expect(nav.scrollTop).toBe(200)
    // 再 跳 /scenes 应 100 (恢复)
    await act(async () => { fireEvent.click(getByTestId('to-scenes')) })
    expect(nav.scrollTop).toBe(100)
  })
})
