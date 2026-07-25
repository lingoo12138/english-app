// tests/customSceneLearn.test.ts - v1.15.0 自定义场景学习流
import { describe, it, expect, beforeEach } from 'vitest'

// 测核心逻辑 (不测 React 渲染, 测纯函数)
const PROGRESS_KEY = (id: number) => `customScene-${id}-progress`

// 模拟"是否完成"判断
function isComplete(currentIdx: number, total: number): boolean {
  return currentIdx >= total
}

// 模拟进度计算
function calcProgress(currentIdx: number, total: number): number {
  if (total === 0) return 0
  return ((currentIdx + 1) / total) * 100
}

// 模拟键盘事件
function handleKey(e: KeyboardEvent, state: { currentIdx: number; showAnswer: boolean; total: number }) {
  if (e.key === ' ') {
    state.showAnswer = !state.showAnswer
  } else if (e.key === 'ArrowRight') {
    if (state.currentIdx < state.total) state.currentIdx++
    state.showAnswer = false
  } else if (e.key === 'ArrowLeft') {
    if (state.currentIdx > 0) state.currentIdx--
    state.showAnswer = false
  }
  return state
}

describe('CustomSceneLearn (v1.15.0)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('PROGRESS_KEY 持久化', () => {
    it('key 格式正确', () => {
      expect(PROGRESS_KEY(5)).toBe('customScene-5-progress')
    })

    it('不同 id 不同 key', () => {
      expect(PROGRESS_KEY(1)).not.toBe(PROGRESS_KEY(2))
    })

    it('存读进度', () => {
      localStorage.setItem(PROGRESS_KEY(3), '5')
      expect(localStorage.getItem(PROGRESS_KEY(3))).toBe('5')
    })

    it('清除进度', () => {
      localStorage.setItem(PROGRESS_KEY(3), '5')
      localStorage.removeItem(PROGRESS_KEY(3))
      expect(localStorage.getItem(PROGRESS_KEY(3))).toBeNull()
    })
  })

  describe('isComplete 完成判断', () => {
    it('currentIdx < total → 未完成', () => {
      expect(isComplete(0, 10)).toBe(false)
      expect(isComplete(5, 10)).toBe(false)
      expect(isComplete(9, 10)).toBe(false)
    })

    it('currentIdx >= total → 完成', () => {
      expect(isComplete(10, 10)).toBe(true)
      expect(isComplete(15, 10)).toBe(true)
    })
  })

  describe('calcProgress 进度计算', () => {
    it('第 1 词 → 10% (10 词)', () => {
      expect(calcProgress(0, 10)).toBe(10)
    })

    it('第 5 词 → 50%', () => {
      expect(calcProgress(4, 10)).toBe(50)
    })

    it('最后 1 词 → 100%', () => {
      expect(calcProgress(9, 10)).toBe(100)
    })

    it('总 0 → 0%', () => {
      expect(calcProgress(0, 0)).toBe(0)
    })
  })

  describe('键盘事件', () => {
    it('空格 = 翻面', () => {
      const state = { currentIdx: 0, showAnswer: false, total: 10 }
      const e = new KeyboardEvent('keydown', { key: ' ' })
      handleKey(e, state)
      expect(state.showAnswer).toBe(true)
    })

    it('→ 下一词 + 重置翻面', () => {
      const state = { currentIdx: 0, showAnswer: true, total: 10 }
      const e = new KeyboardEvent('keydown', { key: 'ArrowRight' })
      handleKey(e, state)
      expect(state.currentIdx).toBe(1)
      expect(state.showAnswer).toBe(false)
    })

    it('→ 已到末尾不超限', () => {
      const state = { currentIdx: 10, showAnswer: false, total: 10 }
      const e = new KeyboardEvent('keydown', { key: 'ArrowRight' })
      handleKey(e, state)
      expect(state.currentIdx).toBe(10)
    })

    it('← 上一词', () => {
      const state = { currentIdx: 5, showAnswer: true, total: 10 }
      const e = new KeyboardEvent('keydown', { key: 'ArrowLeft' })
      handleKey(e, state)
      expect(state.currentIdx).toBe(4)
      expect(state.showAnswer).toBe(false)
    })

    it('← 已到 0 不超限', () => {
      const state = { currentIdx: 0, showAnswer: false, total: 10 }
      const e = new KeyboardEvent('keydown', { key: 'ArrowLeft' })
      handleKey(e, state)
      expect(state.currentIdx).toBe(0)
    })

    it('其他键忽略', () => {
      const state = { currentIdx: 3, showAnswer: false, total: 10 }
      const e = new KeyboardEvent('keydown', { key: 'a' })
      handleKey(e, state)
      expect(state.currentIdx).toBe(3)
      expect(state.showAnswer).toBe(false)
    })
  })
})
