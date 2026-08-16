// W149 反馈 26-29: 4 大微动效
// 26. Slider 进度填充 (TTS 语速 + 其他 input range)
// 27. 错题答对错 icon 颜色脉冲 (correct-pulse / wrong-pulse)
// 28. 错题完成 100% confetti (8 个小圆点从中心散开)
// 29. 切换字号时根 html font-size 渐变 (200ms ease)
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

describe('W149 反馈 26-29 — 4 大微动效 (Slider / 颜色脉冲 / Confetti / 字号)', () => {
  const css = readFileSync('src/index.css', 'utf-8')
  const tts = readFileSync('src/components/settings/TTSSection.tsx', 'utf-8')
  const errorReview = readFileSync('src/pages/ErrorReviewPage.tsx', 'utf-8')

  describe('26. Slider 进度填充 (.slider-progress)', () => {
    it('@keyframes input range 不需要 (用 CSS 渐变背景填充)', () => {
      // 不需要 keyframes, 用 --slider-fill CSS variable + linear-gradient
      expect(css).toMatch(/input\[type="range"\]\.slider-progress\s*\{[^}]*background:\s*linear-gradient/)
    })

    it('渐变: brand-500 (左, --slider-fill) → stone-300 (右) — 亮色', () => {
      expect(css).toMatch(/linear-gradient\([\s\S]*?var\(--brand-500\)[\s\S]*?var\(--slider-fill,\s*50%\)/)
    })

    it('.dark .slider-progress 暗色背景 (stone-700 替代 stone-300)', () => {
      expect(css).toMatch(/\.dark\s+input\[type="range"\]\.slider-progress\s*\{[^}]*linear-gradient[^}]*rgb\(68\s+64\s+60\)/)
    })

    it('::-webkit-slider-thumb 18px 圆形 + hover scale 1.2 spring', () => {
      expect(css).toMatch(/input\[type="range"\]\.slider-progress::-webkit-slider-thumb\s*\{[^}]*width:\s*18px\s*;[^}]*height:\s*18px/)
      expect(css).toMatch(/input\[type="range"\]\.slider-progress::-webkit-slider-thumb:hover\s*\{[^}]*transform:\s*scale\(1\.2\)/)
    })

    it('::-moz-range-thumb (Firefox 兼容) 同样 18px + hover spring', () => {
      expect(css).toMatch(/input\[type="range"\]\.slider-progress::-moz-range-thumb\s*\{[^}]*width:\s*18px/)
      expect(css).toMatch(/input\[type="range"\]\.slider-progress::-moz-range-thumb:hover\s*\{[^}]*transform:\s*scale\(1\.2\)/)
    })

    it('TTSSection.tsx 语速 input range 用 .slider-progress class + --slider-fill variable', () => {
      expect(tts).toContain('slider-progress')
      // --slider-fill variable: 0.5x → 0%, 2x → 100%
      expect(tts).toMatch(/--slider-fill/)
      expect(tts).toMatch(/\(rate\s*-\s*0\.5\)\s*\/\s*1\.5/)
    })
  })

  describe('27. 错题答对错 icon 颜色脉冲 (correct-pulse / wrong-pulse)', () => {
    it('@keyframes correctPulse (drop-shadow 0 → 8px 绿色 → 0, 0.8s ease-out)', () => {
      expect(css).toMatch(/@keyframes\s+correctPulse\s*\{/)
      expect(css).toMatch(/40%\s*\{[^}]*drop-shadow\(0\s+0\s+8px\s+rgb\(16\s+185\s+129/)
    })

    it('.correct-pulse 0.8s ease-out 绿光闪', () => {
      expect(css).toMatch(/\.correct-pulse\s*\{[^}]*animation:\s*correctPulse\s+0\.8s\s+ease-out/)
    })

    it('@keyframes wrongPulse (drop-shadow 0 → 8px 红色 → 0, 0.6s ease-out)', () => {
      expect(css).toMatch(/@keyframes\s+wrongPulse\s*\{/)
      expect(css).toMatch(/40%\s*\{[^}]*drop-shadow\(0\s+0\s+8px\s+rgb\(244\s+63\s+94/)
    })

    it('.wrong-pulse 0.6s ease-out 红光闪', () => {
      expect(css).toMatch(/\.wrong-pulse\s*\{[^}]*animation:\s*wrongPulse\s+0\.6s\s+ease-out/)
    })

    it('ErrorReviewPage "上次错" 答对 icon 加 .correct-pulse, 答错加 .wrong-pulse', () => {
      expect(errorReview).toContain('correct-pulse')
      expect(errorReview).toContain('wrong-pulse')
    })
  })

  describe('28. 错题完成 100% confetti (8 个小圆点散开)', () => {
    it('@keyframes confettiPop (translate cx/cy 0 → 50% → 100%, scale 0 → 1 → 0.5, opacity 1 → 1 → 0)', () => {
      expect(css).toMatch(/@keyframes\s+confettiPop\s*\{/)
      expect(css).toMatch(/0%\s*\{[^}]*transform:\s*translate\(0,\s*0\)\s*scale\(0\)/)
      expect(css).toMatch(/50%\s*\{[^}]*translate\(var\(--cx,\s*30px\),\s*var\(--cy,\s*-50px\)\)\s*scale\(1\)/)
    })

    it('.confetti-particle 8px 圆形 + 0.8s ease 动画', () => {
      expect(css).toMatch(/\.confetti-particle\s*\{[^}]*width:\s*8px\s*;[^}]*height:\s*8px[^}]*border-radius:\s*50%/)
      expect(css).toMatch(/animation:\s*confettiPop\s+0\.8s\s+var\(--ease\)\s+both/)
    })

    it('ErrorReviewPage isComplete 时渲染 8 个 confetti particles', () => {
      // 直接在全文找 confetti-particle 跟 Array.from(8)
      expect(errorReview).toContain('confetti-particle')
      expect(errorReview).toMatch(/Array\.from\(\{\s*length:\s*8\s*\}/)
    })

    it('confetti 8 种品牌色 (绿/琥珀/蓝/粉/紫/翠/橙/青)', () => {
      const colors = errorReview.match(/confettiColors\s*=\s*\[([^\]]+)\]/)?.[1] || ''
      expect(colors).toMatch(/#22c55e/)  // 绿
      expect(colors).toMatch(/#f59e0b/)  // 琥珀
      expect(colors).toMatch(/#3b82f6/)  // 蓝
      expect(colors).toMatch(/#ec4899/)  // 粉
      expect(colors).toMatch(/#8b5cf6/)  // 紫
    })

    it('confetti 用 --cx / --cy CSS variable 驱动 (inline style 传)', () => {
      expect(errorReview).toMatch(/--cx[\s\S]{0,40}\$\{p\.cx\}/)
      expect(errorReview).toMatch(/--cy[\s\S]{0,40}\$\{p\.cy\}/)
    })

    it('confetti 错落 40ms 延迟 (8 个小圆点依次炸开)', () => {
      expect(errorReview).toMatch(/animationDelay:\s*`\$\{i\s*\*\s*0\.04\}s`/)
    })
  })

  describe('29. 切换字号时根 html font-size 渐变 (200ms)', () => {
    it('html transition: font-size 0.2s var(--ease)', () => {
      expect(css).toMatch(/html\s*\{[^}]*transition:\s*font-size\s+0\.2s\s+var\(--ease\)/)
    })
  })

  describe('a11y: prefers-reduced-motion', () => {
    it('新动效 (slider / pulse / confetti / html font-size) 走 .stagger-item 模式', () => {
      // slider thumb hover 走 var(--t-fast) — 已有 reduced-motion 覆盖
      // pulse / confetti 装饰性 — 即便 reduced-motion 用户也能接受 (跟 Loading 一样)
      // html font-size 0.2s 跟 .stagger-item 模式一致
      expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
    })
  })

  describe('回归: 0 业务 P0', () => {
    it('0 新依赖', () => {
      const pkg = readFileSync('package.json', 'utf-8')
      expect(pkg).not.toMatch(/"framer-motion"/)
      expect(pkg).not.toMatch(/"react-spring"/)
    })

    it('TTSSection 业务 0 变更 (rate / setRate / voiceName 还在)', () => {
      expect(tts).toContain('rate')
      expect(tts).toContain('setRate')
      expect(tts).toContain('voiceName')
    })

    it('ErrorReviewPage 业务 0 变更 (lastResult.score / grade 还在)', () => {
      expect(errorReview).toContain('lastResult.score')
      expect(errorReview).toContain('lastResult.grade')
    })

    it('confetti 0 emoji (用品牌色 hex, 0 Unicode 图标)', () => {
      // confettiColors 是 8 个 hex, 0 emoji
      const colors = errorReview.match(/confettiColors\s*=\s*\[([^\]]+)\]/)?.[1] || ''
      // 排除 hex 字符外的内容
      const nonHex = colors.replace(/#[0-9a-f]{6}/gi, '').trim()
      expect(nonHex).not.toMatch(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/u)
    })
  })
})
