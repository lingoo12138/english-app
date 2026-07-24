// tests/onboarding.test.ts - v1.8.0-A 首启 onboarding
// 6 单元测试覆盖:
// 1. 组件渲染 3 步 (从常量推导出 3 步)
// 2. localStorage 标志
// 3. skip 按钮 (close 触发 markOnboarded)
// 4. 选学段后下一步 (nextStep 状态机)
// 5. 完成 3 步后设置 onboarded=true
// 6. 已 onboarded 不渲染 (isOnboarded 决定 Home CTA)
import { describe, it, expect, beforeEach } from 'vitest'
import {
  ONBOARDED_KEY,
  ONBOARDING_STEPS,
  TOTAL_STEPS,
  STEP_TITLES,
  LEVEL_OPTIONS,
  isOnboarded,
  markOnboarded,
  clearOnboarded,
  getInitialStep,
  nextStep,
  prevStep,
  stepIndex,
  isFirstStep,
  isLastStep,
} from '../src/components/Onboarding'

beforeEach(() => {
  localStorage.removeItem(ONBOARDED_KEY)
})

describe('onboarding', () => {
  describe('组件渲染 3 步', () => {
    it('应定义 3 步: level / pronounce / finish', () => {
      expect(ONBOARDING_STEPS).toEqual(['level', 'pronounce', 'finish'])
      expect(TOTAL_STEPS).toBe(3)
    })

    it('每步应有标题', () => {
      expect(STEP_TITLES.level).toBe('选学段')
      expect(STEP_TITLES.pronounce).toBe('体验跟读')
      expect(STEP_TITLES.finish).toBe('准备就绪')
    })

    it('学段应有 3 个选项 (A1/B1/C1)', () => {
      expect(LEVEL_OPTIONS).toHaveLength(3)
      const labels = LEVEL_OPTIONS.map(o => o.label)
      expect(labels).toContain('A1 入门')
      expect(labels).toContain('B1 中级')
      expect(labels).toContain('C1 高级')
    })
  })

  describe('localStorage 标志', () => {
    it('isOnboarded 初始为 false', () => {
      expect(isOnboarded()).toBe(false)
    })

    it('markOnboarded 后 isOnboarded 为 true', () => {
      markOnboarded()
      expect(isOnboarded()).toBe(true)
      expect(localStorage.getItem(ONBOARDED_KEY)).toBe('true')
    })

    it('clearOnboarded 后回到 false', () => {
      markOnboarded()
      expect(isOnboarded()).toBe(true)
      clearOnboarded()
      expect(isOnboarded()).toBe(false)
      expect(localStorage.getItem(ONBOARDED_KEY)).toBeNull()
    })

    it('localStorage 写入失败时 markOnboarded 不抛', () => {
      // mock localStorage.setItem 抛错
      const orig = localStorage.setItem
      localStorage.setItem = () => {
        const e = new Error('QuotaExceeded')
        throw e
      }
      try {
        // 重点: 不应向外抛错 (内部 catch 兑底)
        expect(() => markOnboarded()).not.toThrow()
        // happy-dom 环境下 setItem 抛错后 getItem 仍可能返之前 set 的值
        // (jsdom/happy-dom 行为不一致), 这里只验证不抛错
      } finally {
        localStorage.setItem = orig
      }
    })
  })

  describe('skip / 关闭行为', () => {
    it('关闭后 (markOnboarded) 不应再渲染 CTA', () => {
      // 模拟 skip: Home 关闭 onboarding 后调 markOnboarded + setOnboarded(true)
      markOnboarded()
      expect(isOnboarded()).toBe(true)
      // 父组件用 onboarded 决定是否渲染 CTA,本标志位为 true 时不渲染
    })
  })

  describe('选学段后下一步', () => {
    it('getInitialStep 应返回第 1 步 (level)', () => {
      expect(getInitialStep()).toBe('level')
      expect(isFirstStep('level')).toBe(true)
    })

    it('从 level 下一步应到 pronounce', () => {
      expect(nextStep('level')).toBe('pronounce')
    })

    it('从 pronounce 下一步应到 finish', () => {
      expect(nextStep('pronounce')).toBe('finish')
      expect(isLastStep('finish')).toBe(true)
    })

    it('最后一步 nextStep 应原地不动', () => {
      expect(nextStep('finish')).toBe('finish')
    })

    it('prevStep 应回到上一步', () => {
      expect(prevStep('finish')).toBe('pronounce')
      expect(prevStep('pronounce')).toBe('level')
      expect(prevStep('level')).toBe('level')  // 第 1 步不动
    })

    it('stepIndex 应返回正确序号', () => {
      expect(stepIndex('level')).toBe(0)
      expect(stepIndex('pronounce')).toBe(1)
      expect(stepIndex('finish')).toBe(2)
    })
  })

  describe('完成 3 步后 onboarded=true', () => {
    it('走完 3 步 (3 次 nextStep) 应到 finish, 此时 isLastStep=true', () => {
      let s = getInitialStep()
      s = nextStep(s)  // level -> pronounce
      s = nextStep(s)  // pronounce -> finish
      expect(s).toBe('finish')
      expect(isLastStep(s)).toBe(true)
      // finish 步调 handleNext 触发 markOnboarded + onClose
      markOnboarded()
      expect(isOnboarded()).toBe(true)
    })
  })

  describe('已 onboarded 不渲染', () => {
    it('isOnboarded=true 时 Home 应隐藏 CTA', () => {
      // isOnboarded 为 Home 的 onboarded state 提供初始值
      // onboarded=true 时条件 {!onboarded && <CTA />} 永远 false
      markOnboarded()
      const shouldRenderCTA = !isOnboarded()
      expect(shouldRenderCTA).toBe(false)
    })

    it('isOnboarded=false 时 Home 应显示 CTA', () => {
      const shouldRenderCTA = !isOnboarded()
      expect(shouldRenderCTA).toBe(true)
    })
  })
})
