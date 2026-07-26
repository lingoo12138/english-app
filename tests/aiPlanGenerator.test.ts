// tests/aiPlanGenerator.test.ts - v1.32.0 W30 AI 学习计划
import { describe, it, expect } from 'vitest'
import { estimatePlanMinutes, parseAIPlan, type AIPlan, type AIPlanInput } from '../src/lib/aiPlanGenerator'

describe('aiPlanGenerator (v1.32.0-W30)', () => {
  const sampleInput: AIPlanInput = {
    currentLevel: 'A2',
    targetLevel: 'B2',
    goal: 'work',
    dailyMinutes: 30,
    totalDays: 7,
    knownWordCount: 500,
  }

  describe('parseAIPlan', () => {
    it('解析合法 JSON', () => {
      const json = JSON.stringify({
        strategy: '从词汇开始',
        estimatedWords: 100,
        tasks: [
          { day: 1, theme: '工作', newWords: 5, reviewWords: 3, focusSkills: ['词汇'], tip: 'todo' },
        ],
      })
      const r = parseAIPlan(json, sampleInput)
      expect(r.strategy).toBe('从词汇开始')
      expect(r.estimatedWords).toBe(100)
      expect(r.tasks).toHaveLength(1)
    })
    it('从 markdown 提取 JSON', () => {
      const text = '```json\n{"strategy": "s", "estimatedWords": 10, "tasks": []}\n```'
      const r = parseAIPlan(text, sampleInput)
      expect(r.strategy).toBe('s')
    })
    it('无 JSON 抛错', () => {
      expect(() => parseAIPlan('not json', sampleInput)).toThrow()
    })
    it('tasks 默认值', () => {
      const r = parseAIPlan('{"strategy": "s", "estimatedWords": 0, "tasks": []}', sampleInput)
      expect(r.tasks).toEqual([])
    })
    it('focusSkills 非数组 fallback', () => {
      const r = parseAIPlan('{"tasks": [{"day": 1, "theme": "t", "newWords": 1, "reviewWords": 0, "focusSkills": "wrong"}]}', sampleInput)
      expect(r.tasks[0].focusSkills).toEqual(['词汇'])
    })
  })

  describe('estimatePlanMinutes', () => {
    it('0 task → 0', () => {
      const plan: AIPlan = {
        input: sampleInput,
        tasks: [],
        strategy: '',
        estimatedWords: 0,
        createdAt: 0,
      }
      expect(estimatePlanMinutes(plan)).toBe(0)
    })
    it('多 task 累计', () => {
      const plan: AIPlan = {
        input: sampleInput,
        tasks: [
          { day: 1, theme: 'a', newWords: 10, reviewWords: 0, focusSkills: [], tip: '' },
          { day: 2, theme: 'b', newWords: 0, reviewWords: 20, focusSkills: [], tip: '' },
        ],
        strategy: '',
        estimatedWords: 0,
        createdAt: 0,
      }
      // 10*0.5 + 20*0.5 = 15
      expect(estimatePlanMinutes(plan)).toBe(15)
    })
  })
})
