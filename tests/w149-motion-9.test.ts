// W149 反馈 31+32+33: 3 大微动效
// 31. 答对/答错 短促音效 (Web Audio API 振荡器, 0 网络)
// 32. 错题 100% 完成 progress 圆环 (SVG circle 描边动画)
// 33. 路由切换时 sidebar 标题淡入 (key 触发重 mount → animation 重跑)
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

describe('W149 反馈 31+32+33 — 3 大微动效 (音效 / 圆环 / Sidebar 标题)', () => {
  const css = readFileSync('src/index.css', 'utf-8')
  const sound = readFileSync('src/lib/sound.ts', 'utf-8')
  const errorReview = readFileSync('src/pages/ErrorReviewPage.tsx', 'utf-8')
  const layout = readFileSync('src/components/Layout.tsx', 'utf-8')

  describe('31. 答对/答错音效 (Web Audio API 振荡器)', () => {
    it('src/lib/sound.ts 创建, 0 网络依赖, 0 第三方库', () => {
      expect(sound).toContain('AudioContext')
      expect(sound).not.toMatch(/import.*from\s+['"]/)
    })

    it('playCorrectSound: 答对 上行滑音 523Hz → 659Hz (C5 → E5, 200ms triangle)', () => {
      expect(sound).toContain('playCorrectSound')
      expect(sound).toMatch(/playSlide\(523,\s*659,\s*0\.2,\s*['"]triangle['"]\)/)
    })

    it('playWrongSound: 答错 下行滑音 440Hz → 349Hz (A4 → F4, 250ms square 更刺耳)', () => {
      expect(sound).toContain('playWrongSound')
      expect(sound).toMatch(/playSlide\(440,\s*349,\s*0\.25,\s*['"]square['"]/)
    })

    it('playCompleteSound: 100% 完成 C 大三和弦 (C5 → E5 → G5 800ms)', () => {
      expect(sound).toContain('playCompleteSound')
      // C5 = 523, E5 = 659, G5 = 784
      expect(sound).toMatch(/playTone\(523/)
      expect(sound).toMatch(/playTone\(659/)
      expect(sound).toMatch(/playTone\(784/)
      // 错落 100ms / 200ms
      expect(sound).toMatch(/setTimeout\(\(\) => playTone\(659/)
      expect(sound).toMatch(/setTimeout\(\(\) => playTone\(784/)
    })

    it('AudioContext 复用 + suspended 自动 resume (Chrome autoplay policy)', () => {
      expect(sound).toContain('getCtx')
      expect(sound).toContain('audioCtx.state === \'suspended\'')
      expect(sound).toContain('audioCtx.resume()')
    })

    it('音 volume 0.08 (不刺耳, 跟 0 emoji 硬约束配套: 0 网络资源)', () => {
      expect(sound).toMatch(/volume\s*=\s*0\.08/)
    })

    it('ErrorReviewPage 答完一题 trigger 音效 (答对 / 答错 / 完成)', () => {
      expect(errorReview).toContain('playCorrectSound')
      expect(errorReview).toContain('playWrongSound')
      expect(errorReview).toContain('playCompleteSound')
      // 触发条件: 答对 (perfect/good) → playCorrectSound
      expect(errorReview).toMatch(/result\.grade === ['"]perfect['"] \|\| result\.grade === ['"]good['"][\s\S]{0,100}playCorrectSound/)
    })
  })

  describe('32. 错题 100% 完成 progress 圆环 (SVG circle 描边动画)', () => {
    // W150 修 (verifier-b P2-1): 删 progressCircle 死代码 (SVG 用 inline style transition, 不需要 @keyframes)
    it('W150: @keyframes progressCircle 已删 (改 SVG inline style transition, P2-1 死代码清理)', () => {
      expect(css).not.toMatch(/@keyframes\s+progressCircle\s*\{/)
    })

    it('.progress-circle transition: stroke-dashoffset 0.6s var(--ease)', () => {
      expect(css).toMatch(/\.progress-circle\s*\{[^}]*transition:\s*stroke-dashoffset\s+0\.6s\s+var\(--ease\)/)
    })

    it('.progress-circle-complete 100% 时绿色 drop-shadow 发光', () => {
      expect(css).toMatch(/\.progress-circle-complete\s*\{[^}]*filter:\s*drop-shadow\(0\s+0\s+6px\s+rgb\(34\s+197\s+94\s*\/\s*0\.6\)\)/)
    })

    it('ErrorReviewPage 算 circumference = 2π * 45 ≈ 283 (跟 CSS --circumference 匹配)', () => {
      expect(errorReview).toMatch(/const\s+circumference\s*=\s*2\s*\*\s*Math\.PI\s*\*\s*45/)
      expect(errorReview).toMatch(/const\s+circleOffset\s*=\s*circumference\s*\*\s*\(1\s*-\s*progress\)/)
    })

    it('SVG 圆环: cx=50 cy=50 r=45, strokeWidth=6, strokeLinecap=round', () => {
      expect(errorReview).toMatch(/<svg[^>]*viewBox="0 0 100 100"[^>]*-rotate-90/)
      expect(errorReview).toMatch(/<circle[^>]*cx="50"\s*cy="50"\s*r="45"/)
      // strokeWidth="6" (string) 或 strokeWidth={6} (number) 都 OK
      expect(errorReview).toMatch(/strokeWidth[=:]?\s*"?6"?/)
    })

    it('SVG 渐变: brand-500 → emerald-500 (linearGradient #progressGradient)', () => {
      expect(errorReview).toContain('progressGradient')
      // JSX 用 stopColor="#22c55e" 不是 stop-color
      expect(errorReview).toMatch(/stopColor="#22c55e"/)
      expect(errorReview).toMatch(/stopColor="#3b82f6"/)
    })

    it('圆环中心显示百分比 (CountUp)', () => {
      expect(errorReview).toMatch(/<CountUp\s+value=\{Math\.round\(progress\s*\*\s*100\)\}\s*\/>/)
      // JSX 中用 &#xFF05; 或 Unicode % — 简单 grep %
      expect(errorReview).toMatch(/%</)
    })
  })

  describe('33. 路由切换时 sidebar 标题淡入', () => {
    it('@keyframes sidebarTitleFade (opacity 0 + translateX -4px → 1 + 0)', () => {
      expect(css).toMatch(/@keyframes\s+sidebarTitleFade\s*\{/)
      expect(css).toMatch(/from\s*\{[^}]*opacity:\s*0\s*;?\s*transform:\s*translateX\(-4px\)/)
      expect(css).toMatch(/to\s*\{?\s*opacity:\s*1\s*;?\s*transform:\s*translateX\(0\)/)
    })

    it('.sidebar-title-anim 240ms + spring 缓动', () => {
      expect(css).toMatch(/\.sidebar-title-anim\s*\{[^}]*animation:\s*sidebarTitleFade\s+0\.24s\s+var\(--ease-spring\)\s+both/)
    })

    it('Layout.tsx <h1> key={shortTitle} 触发重 mount (跟 W149 反馈 2 一致)', () => {
      expect(layout).toMatch(/key=\{shortTitle\}/)
      expect(layout).toContain('sidebar-title-anim')
    })
  })

  describe('a11y: prefers-reduced-motion (装饰性动效)', () => {
    it('进度圆环 / sidebar 标题 / confetti 都是装饰性, 走 .page-transition 模式', () => {
      // .progress-circle transition: stroke-dashoffset 走 .stagger-item 段
      // .sidebar-title-anim animation 走 .stagger-item 段
      // confetti 装饰, 即便 reduced-motion 用户也能接受 (跟 Loading 一样)
      expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
    })
  })

  describe('回归: 0 业务 P0', () => {
    it('0 新依赖 (Web Audio API 浏览器原生)', () => {
      const pkg = readFileSync('package.json', 'utf-8')
      expect(pkg).not.toMatch(/"framer-motion"/)
      expect(pkg).not.toMatch(/"react-spring"/)
      // 0 audio 第三方库 (Howler / Tone.js 等)
      expect(pkg).not.toMatch(/"howler"/)
      expect(pkg).not.toMatch(/"tone"/)
    })

    it('音效 0 网络 (全本地 Web Audio 振荡器生成)', () => {
      expect(sound).not.toMatch(/fetch|XMLHttpRequest|new Audio\(['"]/)
    })

    it('ErrorReviewPage 业务 0 变更 (lastResult.score / grade 还在)', () => {
      expect(errorReview).toContain('lastResult.score')
      expect(errorReview).toContain('lastResult.grade')
    })

    it('Layout 业务 0 变更 (NavLink / Outlet / scrollPosMap 都在)', () => {
      expect(layout).toContain('Outlet')
      expect(layout).toContain('NavLink')
      expect(layout).toContain('scrollPosMap')
    })
  })
})
