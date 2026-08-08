// tests/w116-alpha-index.test.ts - W116 字 母 索 引 动 效 改 良
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

describe('W116 字 母 索 引 动 效 改 良', () => {
  const src = readFileSync('src/pages/WordList.tsx', 'utf-8')
  const css = readFileSync('src/index.css', 'utf-8')

  it('移 动 端 字 母 索 引 横 滚 sticky top-14', () => {
    // 业 务: 移 动 端 横 滚 (md:hidden) + sticky top-14
    expect(src).toMatch(/md:hidden sticky top-14 z-10 bg-stone-50\/95/)
  })

  it('桌 面 端 字 母 索 引 右 侧 竖 排 sticky', () => {
    // 业 务: 桌 面 (hidden md:flex) 右 侧 竖 排 fixed right-3
    expect(src).toMatch(/hidden md:flex md:flex-col md:fixed md:right-3 md:top-1\/2 md:-translate-y-1\/2/)
  })

  it('激 活 态 spring 弹 入 (scale-110 + ease-spring)', () => {
    // 业 务: 激 活 态 用 spring 缓 动
    expect(src).toContain('scale-110')
    expect(src).toContain('ease-[var(--ease-spring)]')
  })

  it('hover 浮 起 (scale-105/110)', () => {
    // 业 务: hover 状 态 浮 起
    expect(src).toMatch(/hover:scale-(105|110)/)
  })

  it('a11y aria-current 标 识 激 活 字 母', () => {
    // 业 务: 屏 幕 阅 读 器 友 好
    expect(src).toMatch(/aria-current=\{isActive \? 'true' : undefined\}/)
  })

  it('字 母 button 加 data-letter (W116 自 动 跟 激 活 用)', () => {
    // 业 务: mobileAlphaRef querySelector 找 active letter 滚 动
    expect(src).toMatch(/data-letter=\{letter\}/)
  })

  it('移 动 端 useEffect 自 动 跟 激 活 字 母 (scrollIntoView center)', () => {
    // 业 务: activeLetter 变 化 时 横 滚 跟 随
    expect(src).toMatch(/useEffect[\s\S]{0,300}scrollIntoView\(\{ behavior: 'smooth', block: 'nearest', inline: 'center' \}\)/)
  })

  it('scrollbar-hide utility (W116 添 加, 移 动 端 隐 滚 动 条)', () => {
    // 业 务: 横 滚 不 显 示 滚 动 条
    expect(css).toMatch(/\.scrollbar-hide \{/)
    expect(css).toMatch(/\.scrollbar-hide::-webkit-scrollbar \{/)
  })

  it('桌 面 端 竖 排 用 rounded-full + w-6 h-6 (紧 凑)', () => {
    // 业 务: 桌 面 26 字 母 紧 凑 竖 排
    expect(src).toMatch(/rounded-full text-\[10px\]/)
  })
})
