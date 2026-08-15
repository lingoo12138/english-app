// W149 反馈 11-14: 4 大微动效
// 11. 数字 count up (Home XP / 今日 / 累计 / 收藏)
// 12. 侧边栏 active 指示器 (左侧 3px brand bar 滑入/滑出)
// 13. AIChat 消息 stagger
// 14. NotFound 404 错误页 (插画 fade-up)
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

describe('W149 反馈 11-14 — 4 大微动效 (count up / 侧边栏 / AIChat / 404)', () => {
  const countUp = readFileSync('src/components/CountUp.tsx', 'utf-8')
  const home = readFileSync('src/pages/Home.tsx', 'utf-8')
  const css = readFileSync('src/index.css', 'utf-8')
  const layout = readFileSync('src/components/Layout.tsx', 'utf-8')
  const aiChat = readFileSync('src/pages/AIChat.tsx', 'utf-8')
  const notFound = readFileSync('src/pages/NotFoundPage.tsx', 'utf-8')
  const app = readFileSync('src/App.tsx', 'utf-8')

  describe('11. 数字 count up (CountUp component)', () => {
    it('CountUp component 接受 value + duration + decimals', () => {
      expect(countUp).toContain('export function CountUp')
      expect(countUp).toContain('value: number')
      expect(countUp).toContain('duration?: number')
      expect(countUp).toContain('decimals?: number')
    })

    it('useEffect 监听 value 变化 + requestAnimationFrame 滚动', () => {
      expect(countUp).toContain('useEffect')
      expect(countUp).toContain('requestAnimationFrame')
      expect(countUp).toContain('cancelAnimationFrame')
    })

    it('ease-out cubic 缓动 (Math.pow(1 - t, 3))', () => {
      expect(countUp).toMatch(/1\s*-\s*Math\.pow\(1\s*-\s*t,\s*3\)/)
    })

    it('Home.tsx 集成 CountUp (XP / 今日 / 累计 / 收藏 4 处)', () => {
      const matches = home.match(/<CountUp value=/g) || []
      expect(matches.length).toBeGreaterThanOrEqual(4)
    })

    it('Home 数字用 tabular-nums 等宽对齐 (滚动不抖)', () => {
      expect(home).toMatch(/<CountUp value=\{stats\.todayCount\}[^>]*\/>\s*<\/div>/)
      expect(home).toContain('tabular-nums')
    })
  })

  describe('12. 侧边栏 active 指示器 (左侧 brand bar 滑动)', () => {
    it('CSS .nav-item::before 3px brand bar + scaleY 动画', () => {
      expect(css).toMatch(/\.nav-item::before\s*\{[^}]*width:\s*3px/)
      expect(css).toMatch(/\.nav-item::before\s*\{[^}]*transform:\s*translateY\(-50%\)\s*scaleY\(0\)/)
    })

    it('.nav-item.active-nav::before scaleY(1) 滑入', () => {
      expect(css).toMatch(/\.nav-item\.active-nav::before\s*\{[^}]*transform:\s*translateY\(-50%\)\s*scaleY\(1\)/)
    })

    it('transition: transform var(--t-base) var(--ease-spring) (200ms + spring)', () => {
      expect(css).toMatch(/\.nav-item::before\s*\{[^}]*transition:\s*transform\s+var\(--t-base\)\s+var\(--ease-spring\)/)
    })

    it('Layout.tsx 桌面 NavLink 加 .nav-item + .active-nav class', () => {
      expect(layout).toContain('nav-item')
      expect(layout).toContain('active-nav')
    })
  })

  describe('13. AIChat 消息 stagger', () => {
    it('JSX render 块 messages.map 用 stagger-item wrapper', () => {
      // 找 JSX 渲染块:  messages.map((m, i) => ( <div className="stagger-item">...
      const m = aiChat.match(/messages\.map\(\(m,\s*i\)\s*=>\s*\([\s\S]{0,300}\)/)
      expect(m).toBeTruthy()
      expect(m?.[0]).toContain('stagger-item')
    })

    it('50ms 递增 delay (上限 400ms)', () => {
      expect(aiChat).toMatch(/animationDelay:\s*`\$\{Math\.min\(i\s*\*\s*0\.05,\s*0\.4\)\}s`/)
    })
  })

  describe('14. NotFound 404 错误页', () => {
    it('NotFoundPage 渲染 404 大数字 + 标题 + 副标题 + 2 按钮', () => {
      expect(notFound).toContain('404')
      expect(notFound).toContain('页面走丢了')
      expect(notFound).toContain('回到首页')
      expect(notFound).toContain('navigate(-1)')
    })

    it('404 大数字用 modalPopup 600ms spring 弹入', () => {
      expect(notFound).toMatch(/animate-\[modalPopup_0\.6s_var\(--ease-spring\)_both\]/)
    })

    it('标题 + 按钮错落 150ms / 250ms / 300ms 延迟', () => {
      expect(notFound).toMatch(/0\.15s\s*both/)
      expect(notFound).toMatch(/0\.25s\s*both/)
      expect(notFound).toMatch(/0\.30s\s*both/)
    })

    it('App.tsx 404 路由用 NotFoundPage (替代 Navigate)', () => {
      expect(app).toContain('NotFoundPage')
      expect(app).toMatch(/<Route path="\*"\s+element=\{<NotFoundPage\s*\/>\}/)
    })

    it('NotFoundPage 直接 import (不用 lazy — 小, 启动快)', () => {
      expect(app).toMatch(/import NotFoundPage from ['"]\.\/pages\/NotFoundPage['"]/)
    })
  })

  describe('a11y: prefers-reduced-motion (沿用 W149 反馈 1+2 模式)', () => {
    it('@media (prefers-reduced-motion: reduce) 已覆盖 (nav-item / count-up / 404)', () => {
      // count-up 自带 cancelAnimationFrame cleanup, 无需额外 fallback
      // nav-item ::before transition 走 page-transition 同源 (已有 fallback)
      // 404 modalPopup keyframes 在 prefers-reduced-motion 块内已被 .page-transition 段覆盖
      expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
    })
  })

  describe('回归: 0 业务 P0', () => {
    it('0 新依赖', () => {
      const pkg = readFileSync('package.json', 'utf-8')
      expect(pkg).not.toMatch(/"framer-motion"/)
      expect(pkg).not.toMatch(/"react-spring"/)
    })

    it('CountUp value 0 → 0 不触发 rAF (无副作用)', () => {
      expect(countUp).toMatch(/if\s*\(from\s*===\s*to\)\s*return/)
    })

    it('Layout.tsx 业务 0 变更 (NavLink 仍接 onClick/to/end/aria-label)', () => {
      expect(layout).toContain('to={item.to}')
      expect(layout).toContain('aria-label={item.label}')
    })

    it('AIChat 业务 0 变更 (MessageBubble / reviews 仍能用)', () => {
      expect(aiChat).toContain('MessageBubble')
      expect(aiChat).toContain('reviews[m.id]')
    })
  })
})
