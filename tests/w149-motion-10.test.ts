// W149 反馈 34+35+36: 3 大微动效
// 34. 答对 1 颗 confetti 飞 (单点, 700ms)
// 35. 错题 100% 完成 大 confetti (16 颗, 大距离, 旋转, 1.2s)
// 36. 错题答错时震动反馈 (navigator.vibrate 50ms)
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

describe('W149 反馈 34+35+36 — 3 大微动效 (单颗 confetti / 大 confetti / 震动)', () => {
  const css = readFileSync('src/index.css', 'utf-8')
  const errorReview = readFileSync('src/pages/ErrorReviewPage.tsx', 'utf-8')

  describe('34. 答对 1 颗 confetti 飞 (单点, 700ms)', () => {
    it('@keyframes confettiFly (translate 0 → --fx/--fy, scale 0 → 1.2 → 0.6, opacity 0 → 1 → 0)', () => {
      expect(css).toMatch(/@keyframes\s+confettiFly\s*\{/)
      expect(css).toMatch(/0%\s*\{[^}]*transform:\s*translate\(0,\s*0\)\s*scale\(0\)/)
      expect(css).toMatch(/20%\s*\{[^}]*transform:\s*translate\(0,\s*0\)\s*scale\(1\.2\)/)
      expect(css).toMatch(/100%\s*\{[^}]*transform:\s*translate\(var\(--fx,\s*0\),\s*var\(--fy,\s*-60px\)\)\s*scale\(0\.6\)/)
    })

    it('.confetti-fly 10px 圆形 + 0.7s ease 动画', () => {
      expect(css).toMatch(/\.confetti-fly\s*\{[^}]*width:\s*10px\s*;[^}]*height:\s*10px/)
      expect(css).toMatch(/animation:\s*confettiFly\s+0\.7s\s+var\(--ease\)\s+both/)
    })

    it('ErrorReviewPage flyConfetti state 管理 (id + fx + fy + color)', () => {
      expect(errorReview).toContain('flyConfetti')
      expect(errorReview).toMatch(/const\s+\[flyConfetti,\s*setFlyConfetti\]\s*=\s*useState/)
    })

    it('答对时 trigger 1 颗 confetti 飞 (perfect/good grade + setFlyConfetti)', () => {
      // 找答对分支
      const correctBlock = errorReview.match(/result\.grade === ['"]perfect['"][\s\S]{0,800}setFlyConfetti/g)
      expect(correctBlock).toBeTruthy()
      const block = correctBlock?.[0] || ''
      expect(block).toContain('setFlyConfetti')
      expect(block).toMatch(/fx:\s*\(Math\.random\(\)\s*-\s*0\.5\)\s*\*\s*80/)
      expect(block).toMatch(/fy:\s*-60\s*-\s*Math\.random\(\)\s*\*\s*30/)
    })

    it('setTimeout 750ms 后清掉 flyConfetti (跟 animation duration 同步)', () => {
      const correctBlock = errorReview.match(/setFlyConfetti\([\s\S]{0,400}/g)?.[0] || ''
      expect(correctBlock).toMatch(/setTimeout\(\(\) => setFlyConfetti\(null\),\s*750\)/)
    })

    it('3 种品牌色 (绿/翠/蓝) 随机 (跟答对 tone 匹配)', () => {
      const correctBlock = errorReview.match(/color:\s*\[([^\]]+)\]/) || []
      const colors = correctBlock[1] || ''
      expect(colors).toMatch(/#22c55e/)  // 绿
      expect(colors).toMatch(/#10b981/)  // 翠
      expect(colors).toMatch(/#3b82f6/)  // 蓝
    })
  })

  describe('35. 错题 100% 完成 大 confetti (16 颗, 旋转, 1.2s)', () => {
    it('@keyframes confettiPopBig (scale 0 → 1.3 → 0.7 + rotate 0 → 180° → 360°)', () => {
      expect(css).toMatch(/@keyframes\s+confettiPopBig\s*\{/)
      expect(css).toMatch(/0%\s*\{[^}]*transform:\s*translate\(0,\s*0\)\s*scale\(0\)\s+rotate\(0\)/)
      expect(css).toMatch(/40%\s*\{[^}]*translate\(var\(--cx,\s*50px\),\s*var\(--cy,\s*-80px\)\)\s*scale\(1\.3\)\s+rotate\(180deg\)/)
      expect(css).toMatch(/100%\s*\{[^}]*translate\(var\(--cx,\s*50px\),\s*calc\(var\(--cy,\s*-80px\)\s*\+\s*140px\)\)\s*scale\(0\.7\)\s+rotate\(360deg\)/)
    })

    it('.confetti-big 12px 圆形 + 1.2s ease 动画 (大 confetti 升级)', () => {
      expect(css).toMatch(/\.confetti-big\s*\{[^}]*width:\s*12px\s*;[^}]*height:\s*12px/)
      expect(css).toMatch(/animation:\s*confettiPopBig\s+1\.2s\s+var\(--ease\)\s+both/)
    })

    it('ErrorReviewPage confetti 数量从 8 升到 16 颗 (W149 反馈 35)', () => {
      expect(errorReview).toMatch(/Array\.from\(\{\s*length:\s*16\s*\}/)
    })

    it('confetti 距离加大: 40 → 60+random*40, 上偏 30', () => {
      const confettiBlock = errorReview.match(/Array\.from\(\{\s*length:\s*16\s*\}[\s\S]{0,400}/)
      expect(confettiBlock).toBeTruthy()
      const block = confettiBlock?.[0] || ''
      expect(block).toMatch(/distance\s*=\s*60\s*\+\s*Math\.random\(\)\s*\*\s*40/)
      expect(block).toMatch(/cy:\s*Math\.sin\(angle\)\s*\*\s*distance\s*-\s*30/)
    })

    it('confetti 错落 30ms 延迟 (16 颗 / 480ms 启动, 1.2s 内全部放完)', () => {
      expect(errorReview).toMatch(/animationDelay:\s*`\$\{i\s*\*\s*0\.03\}s`/)
    })
  })

  describe('36. 错题答错时震动反馈 (navigator.vibrate 50ms)', () => {
    it('ErrorReviewPage 答错分支 trigger navigator.vibrate(50)', () => {
      // 找答错分支 (line 181 附近, 在 setFlyConfetti setTimeout 之后)
      const wrongBlock = errorReview.match(/setTimeout\(\(\) => setFlyConfetti\(null\),\s*750\)[\s\S]{0,500}/)
      expect(wrongBlock).toBeTruthy()
      const block = wrongBlock?.[0] || ''
      expect(block).toContain('navigator.vibrate(50)')
    })

    it('try/catch 保护 (桌面 / 不支持 vibrate 的设备静默 fail)', () => {
      const wrongBlock = errorReview.match(/navigator\.vibrate[\s\S]{0,300}/)
      expect(wrongBlock).toBeTruthy()
      const block = wrongBlock?.[0] || ''
      expect(block).toMatch(/try\s*\{\s*navigator\.vibrate\(50\)\s*\}\s*catch/)
    })

    it('typeof navigator !== \'undefined\' SSR 安全 (vite build 不爆)', () => {
      const wrongBlock = errorReview.match(/typeof\s+navigator[\s\S]{0,200}/)
      expect(wrongBlock).toBeTruthy()
      const block = wrongBlock?.[0] || ''
      expect(block).toContain('typeof navigator !== \'undefined\'')
    })
  })

  describe('a11y: prefers-reduced-motion (装饰性动效)', () => {
    it('confetti-fly / confetti-big 都是装饰, 走 .stagger-item 模式 (no reduced-motion 强制关)', () => {
      // confetti 是装饰性反馈, 即便 reduced-motion 用户也能接受 (跟 Loading 一样)
      // 不强制关, 用户可选择看 / 不看 (答对时仍有音效 + 颜色脉冲, 视觉关掉不影响语义)
      expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
    })
  })

  describe('回归: 0 业务 P0', () => {
    it('0 新依赖', () => {
      const pkg = readFileSync('package.json', 'utf-8')
      expect(pkg).not.toMatch(/"framer-motion"/)
      expect(pkg).not.toMatch(/"react-spring"/)
    })

    it('vibrate 0 网络 / 0 第三方 (Web API 浏览器原生)', () => {
      // navigator.vibrate 浏览器原生
      expect(errorReview).not.toMatch(/vibrate[\s\S]{0,50}\bfetch\b/)
    })

    it('ErrorReviewPage 业务 0 变更 (lastResult.score / grade 还在)', () => {
      expect(errorReview).toContain('lastResult.score')
      expect(errorReview).toContain('lastResult.grade')
    })
  })
})
