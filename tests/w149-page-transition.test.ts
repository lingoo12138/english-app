// W149 反馈 1: 验证页面切换过渡动效
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

describe('W149 反馈 1 — 页面切换过渡动效', () => {
  const css = readFileSync('src/index.css', 'utf-8')
  const layout = readFileSync('src/components/Layout.tsx', 'utf-8')

  describe('CSS: pageEnter 动效', () => {
    it('@keyframes pageEnter 定义存在', () => {
      expect(css).toMatch(/@keyframes\s+pageEnter\s*\{/)
    })

    it('from: opacity 0 + translateY(8px) (fade-up)', () => {
      expect(css).toMatch(/from\s*\{\s*opacity:\s*0\s*;?\s*transform:\s*translateY\(8px\)/)
    })

    it('to: opacity 1 + translateY(0)', () => {
      expect(css).toMatch(/to\s*\{?\s*opacity:\s*1\s*;?\s*transform:\s*translateY\(0\)/)
    })

    it('.page-transition class 使用 spring 缓动 + 240ms', () => {
      expect(css).toMatch(/\.page-transition\s*\{[^}]*animation:\s*pageEnter\s+0\.24s\s+var\(--ease-spring\)/)
    })

    it('will-change: opacity, transform (GPU 优化)', () => {
      expect(css).toMatch(/will-change:\s*opacity,\s*transform/)
    })
  })

  describe('a11y: prefers-reduced-motion fallback', () => {
    it('@media (prefers-reduced-motion: reduce) 取消动效', () => {
      expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.page-transition[^}]*animation:\s*none/)
    })
  })

  describe('Layout.tsx 集成', () => {
    it('contentRef + useEffect 触发 class toggle (不重 mount, 避免骨架闪)', () => {
      // W149 反馈 2: 之前用 key={location.pathname} 重 mount → Suspense fallback 闪
      // 改为: contentRef + classList toggle, reflow 强制重启动画
      expect(layout).toMatch(/contentRef\s*=\s*useRef/)
      expect(layout).toMatch(/classList\.remove\(['"]page-transition['"]\)/)
      expect(layout).toMatch(/classList\.add\(['"]page-transition['"]\)/)
      expect(layout).toMatch(/void\s+el\.offsetWidth/)
    })

    it('不再用 key={location.pathname} (避免重 mount 引起骨架闪)', () => {
      expect(layout).not.toMatch(/key=\{location\.pathname\}/)
    })

    it('切页面 useEffect scroll 到顶部 (避免从底部跳)', () => {
      expect(layout).toMatch(/window\.scrollTo\(\s*\{\s*top:\s*0[^}]*\}\s*\)/)
    })
  })

  describe('回归: 0 业务 P0 + 0 副作用', () => {
    it('不破坏 layout 其他功能 (NavLink / Outlet / scrollPosMap)', () => {
      expect(layout).toContain('Outlet')
      expect(layout).toContain('NavLink')
      expect(layout).toContain('scrollPosMap')
    })

    it('不引入新依赖 (无 framer-motion / react-spring)', () => {
      const pkg = readFileSync('package.json', 'utf-8')
      expect(pkg).not.toMatch(/"framer-motion"/)
      expect(pkg).not.toMatch(/"react-spring"/)
    })
  })
})
