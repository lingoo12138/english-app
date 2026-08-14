// W149 反馈 4-7: 验证 4 大微动效
// 4. 列表项 hover (stagger-item)
// 5. 模态框 spring popup (modal-popup + modal-backdrop)
// 6. 进度条 fill (progress-fill)
// 7. 暗色切换 fade (body + cards bg-color transition)
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

describe('W149 反馈 4-7 — 4 大微动效 (列表 / 模态 / 进度 / 暗色)', () => {
  const css = readFileSync('src/index.css', 'utf-8')

  describe('4. 列表项 hover (stagger-item)', () => {
    it('transition: transform + box-shadow (fast 150ms)', () => {
      expect(css).toMatch(/\.stagger-item\s*\{[^}]*transition:\s*transform\s+var\(--t-fast\)\s+var\(--ease\),\s*box-shadow\s+var\(--t-fast\)\s+var\(--ease\)/)
    })

    it('hover: scale(1.005) 微缩放 (跟卡片轻一些)', () => {
      expect(css).toMatch(/\.stagger-item:hover\s*\{[^}]*transform:\s*scale\(1\.005\)/)
    })
  })

  describe('5. 模态框 spring popup', () => {
    it('@keyframes modalPopup (scale 0.92 + translateY 8px → 1 + 0)', () => {
      expect(css).toMatch(/@keyframes\s+modalPopup\s*\{/)
      expect(css).toMatch(/from\s*\{[^}]*opacity:\s*0\s*;?\s*transform:\s*scale\(0\.92\)\s+translateY\(8px\)/)
      expect(css).toMatch(/to\s*\{?\s*opacity:\s*1\s*;?\s*transform:\s*scale\(1\)\s+translateY\(0\)/)
    })

    it('.modal-popup 320ms + spring 缓动 + GPU 优化', () => {
      expect(css).toMatch(/\.modal-popup\s*\{[^}]*animation:\s*modalPopup\s+0\.32s\s+var\(--ease-spring\)\s+both[^}]*will-change:\s*opacity,\s*transform/)
    })

    it('@keyframes backdropFade 背景淡入 (200ms ease)', () => {
      expect(css).toMatch(/@keyframes\s+backdropFade\s*\{/)
      expect(css).toMatch(/\.modal-backdrop\s*\{[^}]*animation:\s*backdropFade\s+0\.2s\s+var\(--ease\)\s+both/)
    })

    it('5 个 modal 都集成 .modal-backdrop + .modal-popup', () => {
      // Modal.tsx
      const modal = readFileSync('src/components/Modal.tsx', 'utf-8')
      expect(modal).toContain('modal-backdrop')
      expect(modal).toContain('modal-popup')
      // FeedbackButton.tsx
      const fb = readFileSync('src/components/FeedbackButton.tsx', 'utf-8')
      expect(fb).toContain('modal-backdrop')
      expect(fb).toContain('modal-popup')
      // NpsPrompt.tsx
      const nps = readFileSync('src/components/NpsPrompt.tsx', 'utf-8')
      expect(nps).toContain('modal-backdrop')
      expect(nps).toContain('modal-popup')
      // KeyboardShortcutsModal.tsx
      const ks = readFileSync('src/components/KeyboardShortcutsModal.tsx', 'utf-8')
      expect(ks).toContain('modal-backdrop')
      expect(ks).toContain('modal-popup')
    })
  })

  describe('6. 进度条 fill (progress-fill)', () => {
    it('.progress-fill transition: width 300ms ease', () => {
      expect(css).toMatch(/\.progress-fill\s*\{[^}]*transition:\s*width\s+var\(--t-slow[^}]*\)/)
    })

    it('3 个进度条集成 .progress-fill (Home XP / TodayPlan / Onboarding)', () => {
      const home = readFileSync('src/pages/Home.tsx', 'utf-8')
      expect(home).toMatch(/className="[^"]*progress-fill[^"]*"/)
      const today = readFileSync('src/components/home/TodayPlanCard.tsx', 'utf-8')
      expect(today).toMatch(/className="[^"]*progress-fill[^"]*"/)
      const ob = readFileSync('src/components/Onboarding.tsx', 'utf-8')
      expect(ob).toMatch(/className="[^"]*progress-fill[^"]*"/)
    })
  })

  describe('7. 暗色切换 fade (body + 卡片 bg-color 过渡)', () => {
    it('html, body transition: background-color + color 300ms', () => {
      expect(css).toMatch(/html,\s*body\s*\{[^}]*transition:\s*background-color\s+var\(--t-slow[^}]*\),\s*color\s+var\(--t-slow[^}]*\)/)
    })

    it('.card, .btn, .input, .card-interactive bg-color + border-color 过渡', () => {
      expect(css).toMatch(/\.card,\s*\.btn,\s*\.input,\s*\.card-interactive\s*\{[^}]*transition-property:[^}]*background-color,\s*border-color/)
    })
  })

  describe('a11y: prefers-reduced-motion 全关', () => {
    it('取消 .modal-popup + .modal-backdrop animation', () => {
      expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.modal-popup,\s*\.modal-backdrop\s*\{[^}]*animation:\s*none/)
    })

    it('取消 .progress-fill transition', () => {
      expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.progress-fill\s*\{[^}]*transition:\s*none/)
    })

    it('取消 html, body transition (暗色切换无淡入)', () => {
      expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?html,\s*body\s*\{[^}]*transition:\s*none/)
    })
  })

  describe('回归: 0 业务 P0', () => {
    it('0 新依赖', () => {
      const pkg = readFileSync('package.json', 'utf-8')
      expect(pkg).not.toMatch(/"framer-motion"/)
      expect(pkg).not.toMatch(/"react-spring"/)
    })

    it('Modal.tsx 0 业务变更 (onClick / onCancel / 焦点 都不动)', () => {
      const modal = readFileSync('src/components/Modal.tsx', 'utf-8')
      expect(modal).toContain('onConfirm')
      expect(modal).toContain('onCancel')
      expect(modal).toContain('confirmRef')
    })
  })
})
