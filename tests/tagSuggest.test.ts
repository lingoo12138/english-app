// tests/tagSuggest.test.ts - v1.29.0 W30 tag AI 智能推荐
import { describe, it, expect } from 'vitest'
import { parseTagSuggestions } from '../src/lib/tagSuggest'

describe('tagSuggest (v1.29.0-W30)', () => {
  describe('parseTagSuggestions', () => {
    it('解析 LLM 输出格式', () => {
      const words = [
        { wordId: 'w1', word: 'apple', translation: '苹果' },
        { wordId: 'w2', word: 'meeting', translation: '会议' },
      ]
      const llmOutput = `apple (苹果):food
meeting (会议):work`
      const r = parseTagSuggestions(llmOutput, words)
      expect(r).toHaveLength(2)
      expect(r[0].wordId).toBe('w1')
      expect(r[0].suggestedTags).toEqual(['food'])
      expect(r[1].suggestedTags).toEqual(['work'])
    })

    it('多 tag 逗号分隔', () => {
      const words = [{ wordId: 'w1', word: 'apple', translation: '苹果' }]
      const r = parseTagSuggestions('apple (苹果):food, study', words)
      expect(r[0].suggestedTags).toEqual(['food', 'study'])
    })

    it('过滤 other 标签', () => {
      const words = [{ wordId: 'w1', word: 'mystery', translation: '神秘' }]
      const r = parseTagSuggestions('mystery (神秘):other, food', words)
      expect(r[0].suggestedTags).toEqual(['food'])
    })

    it('未匹配的单词不返', () => {
      const words = [{ wordId: 'w1', word: 'apple', translation: '苹果' }]
      const r = parseTagSuggestions('banana (香蕉):food', words)
      expect(r).toEqual([])
    })

    it('无效 tag 过滤', () => {
      const words = [{ wordId: 'w1', word: 'apple', translation: '苹果' }]
      const r = parseTagSuggestions('apple (苹果):@invalid, food, ', words)
      // @invalid 被过滤, 空被过滤
      expect(r[0].suggestedTags).toEqual(['food'])
    })
  })
})
