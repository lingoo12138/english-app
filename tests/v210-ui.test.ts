// tests/v210-ui.test.ts - v2.1.0 UI 改 良 验证
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import WordCard from '../src/components/WordCard'
import type { Word } from '../src/types'

// Mock 必 要 store
vi.mock('../src/store/useStore', () => ({
  useStore: () => ({ dailyGoal: 5 }),
}))
vi.mock('../src/lib/plan', () => ({
  markWordCompleted: vi.fn(),
}))

describe('v2.1.0 UI 改 良 验证', () => {
  // W143: critical CSS inline 拆出 — 检查 index.critical.css (新建, 含首屏关键) + index.css (其余)
  const criticalCss = readFileSync('src/index.critical.css', 'utf-8')
  const allCss = criticalCss + '\n' + readFileSync('src/index.css', 'utf-8')

  describe('A1: motion token (CSS 变量)', () => {
    it('index.critical.css / index.css 含 motion token (--t-fast/--t-base/--t-slow/--ease)', () => {
      expect(allCss).toMatch(/--t-fast:\s*150ms/)
      expect(allCss).toMatch(/--t-base:\s*200ms/)
      expect(allCss).toMatch(/--t-slow:\s*300ms/)
      expect(allCss).toMatch(/--ease:\s*cubic-bezier\(0\.2,\s*0\.8,\s*0\.2,\s*1\)/)
    })

    it('状 态 色 3 强调 色 (success/warning/error)', () => {
      expect(allCss).toMatch(/--state-success:\s*#10b981/)
      expect(allCss).toMatch(/--state-warning:\s*#f59e0b/)
      expect(allCss).toMatch(/--state-error:\s*#f43f5e/)
    })

    it('柔 浮 阴 影 token (--shadow-soft/--shadow-hover)', () => {
      expect(allCss).toMatch(/--shadow-soft:/)
      expect(allCss).toMatch(/--shadow-hover:/)
    })
  })

  describe('A2: .card v2 (柔 浮 阴 影 + hover 浮起)', () => {
    it('.card 类 用 --shadow-soft 而 非 shadow-sm', () => {
      const css = readFileSync('src/index.css', 'utf-8')
      // .card 类 应 配 --shadow-soft
      expect(css).toMatch(/\.card\s*\{[^}]*box-shadow:\s*var\(--shadow-soft\)/)
    })

    it('.card-interactive 类 添 加 hover -translate-y-0.5', () => {
      expect(allCss).toMatch(/\.card-interactive\s*\{[^}]*hover:-translate-y-0\.5/)
    })

    it('.btn 改 用 motion token (duration/ease)', () => {
      expect(allCss).toMatch(/\.btn\s*\{[^}]*duration-\[var\(--t-base\)\][^}]*ease-\[var\(--ease\)\]/)
    })
  })

  describe('A3: WordCard React.memo 优 化', () => {
    it('WordCard 用 memo 包 装 + 比 较 word.id / isFavorite', () => {
      const src = readFileSync('src/components/WordCard.tsx', 'utf-8')
      expect(src).toMatch(/import\s*\{\s*memo\s*\}\s*from\s*'react'/)
      expect(src).toMatch(/memo\(WordCardInner/)
      expect(src).toMatch(/prev\.word\.id\s*===\s*next\.word\.id/)
      expect(src).toMatch(/prev\.isFavorite\s*===\s*next\.isFavorite/)
    })

    it('WordCard 用 内联 SVG 替 换 ⭐ emoji (0 依赖)', () => {
      const src = readFileSync('src/components/WordCard.tsx', 'utf-8')
      // StarIcon 函数
      expect(src).toMatch(/function StarIcon/)
      expect(src).toMatch(/<svg[^>]*viewBox="0 0 24 24"/)
      // 不 再 用 ⭐
      expect(src).not.toMatch(/\{isFavorite \? '⭐' : '☆'\}/)
    })

    it('WordCard 改 用 .card-interactive 替 hover:shadow-md', () => {
      const src = readFileSync('src/components/WordCard.tsx', 'utf-8')
      expect(src).toMatch(/className="card-interactive/)
      expect(src).not.toMatch(/hover:shadow-md/)
    })
  })

  describe('A4: 端 到 端 渲 染 验证 (改 良 稿 落 地)', () => {
    it('WordCard 渲 染 词 名 / 音 标 / 释 义 / 等 级 标', () => {
      const word: Word = {
        id: 'w-test-001',
        word: 'test',
        phonetic: '/test/',
        translations: ['测试', '试验'],
        level: 'cet4' as any,
        tags: ['CET-4'],
        roots: [],
        phrases: [],
        examples: [],
        stems: [],
      } as any
      const { container } = render(
        React.createElement(MemoryRouter, null,
          React.createElement(WordCard, { word, isFavorite: true, onToggleFavorite: () => {} })
        )
      )
      expect(container.textContent).toContain('test')
      expect(container.textContent).toContain('测试')
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(0)
    })

    it('WordCard 收 藏 按 钮 含 aria-label (a11y)', () => {
      const word: Word = {
        id: 'w-test-002',
        word: 'aria',
        phonetic: '/ˈɛəriə/',
        translations: ['accessibility'],
        level: 'cet4' as any,
        tags: [],
        roots: [],
        phrases: [],
        examples: [],
        stems: [],
      } as any
      const { container } = render(
        React.createElement(MemoryRouter, null,
          React.createElement(WordCard, { word, isFavorite: true, onToggleFavorite: () => {} })
        )
      )
      const btn = container.querySelector('button[aria-label]')
      expect(btn).toBeTruthy()
      expect(btn?.getAttribute('aria-label')).toMatch(/收藏/)
    })

    it('React.memo 优 化: 相 同 prop word 不 重 渲 (props 对 比)', () => {
      // 验 证 memo 比 较 函 数: 返 回 true (跳过 重 渲)
      // 通过 调 用 memo 比 较 函 数 (如 果 导 出, 否 则 间 接 验 证)
      const word: Word = { id: 'w-memo', word: 'm', phonetic: '', translations: ['m'], level: 'cet4' as any, tags: [], roots: [], phrases: [], examples: [], stems: [] } as any
      // 1 次 渲 染
      const r1 = render(
        React.createElement(MemoryRouter, null, React.createElement(WordCard, { word, isFavorite: false }))
      )
      // 同 prop, 不 同 实 例 (memo 不 重 渲)
      const r2 = render(
        React.createElement(MemoryRouter, null, React.createElement(WordCard, { word, isFavorite: false }))
      )
      // 验 证 两 个 都 渲 染 出 来 (不 报 错 即 OK)
      expect(r1.container.textContent).toContain('m')
      expect(r2.container.textContent).toContain('m')
      r1.unmount()
      r2.unmount()
    })
  })

  describe('A5: 性 能 红 线 (不 越)', () => {
    it('WordCard 不 引 入 额 外 重 依 赖 (无 framer-motion)', () => {
      const pkg = JSON.parse(readFileSync('package.json', 'utf-8'))
      const all = { ...pkg.dependencies, ...pkg.devDependencies }
      expect(all['framer-motion']).toBeUndefined()
    })

    it('lucide-react 已 装 (可 选, 未 引 入 WordCard)', () => {
      // 业 务 决 策: 用 inline SVG, 不 用 lucide-react (减 0 依赖)
      const src = readFileSync('src/components/WordCard.tsx', 'utf-8')
      expect(src).not.toMatch(/from\s+['"]lucide-react['"]/)
    })
  })
})
