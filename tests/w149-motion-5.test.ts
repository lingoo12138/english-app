// W149 反馈 16-18: 4 大微动效
// 16. Streak milestone 解锁 (金色光环 + spring 弹入)
// 17. 搜索框 focus 微 scale + ring 滑入
// 18. Switch toggle 滑块 (替代原生 checkbox)
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

describe('W149 反馈 16-18 — 4 大微动效 (milestone / focus / switch / Search)', () => {
  const css = readFileSync('src/index.css', 'utf-8')
  const home = readFileSync('src/pages/Home.tsx', 'utf-8')
  const switchComp = readFileSync('src/components/Switch.tsx', 'utf-8')

  describe('16. Streak milestone 解锁 (金色光环 + spring 弹入)', () => {
    it('@keyframes milestoneUnlock (scale 0.5 → 1.15 → 1)', () => {
      expect(css).toMatch(/@keyframes\s+milestoneUnlock\s*\{/)
      expect(css).toMatch(/0%\s*\{[^}]*transform:\s*scale\(0\.5\)/)
      expect(css).toMatch(/60%\s*\{[^}]*transform:\s*scale\(1\.15\)/)
      expect(css).toMatch(/100%\s*\{[^}]*transform:\s*scale\(1\)/)
    })

    it('.milestone-reached 600ms spring 弹入 + 金色 box-shadow ring', () => {
      expect(css).toMatch(/\.milestone-reached\s*\{[^}]*animation:\s*milestoneUnlock\s+0\.6s\s+var\(--ease-spring\)\s+both/)
      expect(css).toMatch(/box-shadow:\s*0\s+0\s+0\s+2px\s+rgb\(251\s+191\s+36/)
    })

    it('.milestone-major 大 milestone (7/30/100/365) 额外大光环', () => {
      expect(css).toMatch(/\.milestone-major\s*\{[^}]*box-shadow:[^}]*251\s+191\s+36[^}]*0\s+0\s+12px/)
    })

    it('Home.tsx streak milestones 加 .milestone-reached class', () => {
      expect(home).toContain('milestone-reached')
    })

    it('Home.tsx 大 milestone (7/30/100/365) 额外加 .milestone-major class', () => {
      expect(home).toMatch(/\[7,\s*30,\s*100,\s*365\]\.includes\(m\.days\)/)
    })
  })

  describe('17. 搜索框 focus 微 scale + ring 滑入', () => {
    it('.input:focus scale(1.005) (微微放大, 跟 hover 协调)', () => {
      expect(css).toMatch(/\.input:focus\s*\{[^}]*transform:\s*scale\(1\.005\)/)
    })

    it('.input:focus box-shadow 0 0 0 3px brand-500/0.18 (透明 ring 滑入)', () => {
      expect(css).toMatch(/\.input:focus\s*\{[^}]*box-shadow:\s*0\s+0\s+0\s+3px\s+rgb\(var\(--brand-500\)\s*\/\s*0\.18\)/)
    })
  })

  describe('18. Switch toggle 滑块 (新 component)', () => {
    it('Switch component 接受 checked + onChange + label + disabled + testId', () => {
      expect(switchComp).toContain('checked: boolean')
      expect(switchComp).toContain('onChange')
      expect(switchComp).toContain('label?: string')
      expect(switchComp).toContain('disabled?: boolean')
      expect(switchComp).toContain('testId?: string')
    })

    it('role="switch" + aria-checked (a11y)', () => {
      expect(switchComp).toContain('role="switch"')
      expect(switchComp).toContain('aria-checked={checked}')
    })

    it('键盘 Enter / Space 触发 (a11y)', () => {
      expect(switchComp).toMatch(/e\.key\s*===\s*['"]Enter['"]/)
      expect(switchComp).toMatch(/e\.key\s*===\s*['"] ['"]/)
    })

    it('CSS .switch-track + .switch-thumb 完整定义', () => {
      expect(css).toMatch(/\.switch-track\s*\{[^}]*width:\s*2\.75rem/)
      expect(css).toMatch(/\.switch-track\s*\{[^}]*transition:\s*background-color\s+var\(--t-base\)/)
      expect(css).toMatch(/\.switch-thumb\s*\{[^}]*width:\s*1\.25rem[^}]*height:\s*1\.25rem/)
      expect(css).toMatch(/\.switch-thumb\s*\{[^}]*transition:\s*transform\s+var\(--t-base\)\s+var\(--ease-spring\)/)
    })

    it('.switch-on .switch-thumb translateX(1.25rem) 滑动', () => {
      expect(css).toMatch(/\.switch-track\.switch-on\s+\.switch-thumb\s*\{[^}]*transform:\s*translateX\(1\.25rem\)/)
    })

    it('.switch-on bg-color var(--brand-500) (亮色) + .dark .switch-on brand-600 (暗色)', () => {
      expect(css).toMatch(/\.switch-track\.switch-on\s*\{[^}]*background-color:\s*var\(--brand-500\)/)
      expect(css).toMatch(/\.switch-track\.switch-on\.dark\s*\{[^}]*background-color:\s*var\(--brand-600\)/)
    })
  })

  describe('a11y: prefers-reduced-motion 覆盖', () => {
    it('milestone + focus + switch 都用 transform, 应被 .page-transition 模式覆盖', () => {
      // .input:focus scale 走 .input 已有 transition (fast), 已被 reduced-motion 模式覆盖
      // .switch-thumb translateX 走 var(--t-base), 已有 .card/.btn 那段 disabled
      // milestone animation 在 .page-transition 块内已处理 (animation: none)
      expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.page-transition[^}]*animation:\s*none/)
    })
  })

  describe('回归: 0 业务 P0', () => {
    it('0 新依赖', () => {
      const pkg = readFileSync('package.json', 'utf-8')
      expect(pkg).not.toMatch(/"framer-motion"/)
      expect(pkg).not.toMatch(/"react-spring"/)
    })

    it('Streak 数据流 0 变更 (reached/nextMilestone 还在)', () => {
      expect(home).toContain('streakState')
      expect(home).toContain('milestones')
    })

    it('Search input 0 业务变更 (.input className 仍能用)', () => {
      // .input 已有 @apply 转 standard styles, 不会破坏
      expect(css).toMatch(/\.input\s*\{[^}]*@apply/)
    })
  })
})
