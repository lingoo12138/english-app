// tests/phraseCards.test.ts - v1.36.0 W34 短语闪卡
import { describe, it, expect } from 'vitest'
import { extractPhrasesFromWords, shuffleCards, getPhraseTTS } from '../src/lib/phraseCards'
import type { Word } from '../src/types'

describe('phraseCards (v1.36.0-W34)', () => {
  const sampleWords: Word[] = [
    {
      id: 'w1',
      word: 'take',
      translations: ['拿'],
      pos: ['v'],
      phrases: [
        { phrase: 'take a break', translation: '休息一下' },
        { phrase: 'take over', translation: '接管' },
        { phrase: 'take off', translation: '起飞/脱下' },
      ],
    } as any,
    {
      id: 'w2',
      word: 'make',
      translations: ['制作'],
      pos: ['v'],
      // 无 phrases
    } as any,
  ]

  describe('extractPhrasesFromWords', () => {
    it('从 words 抽短语', () => {
      const r = extractPhrasesFromWords(sampleWords)
      expect(r.length).toBe(3)
      expect(r[0].phrase).toBe('take a break')
    })

    it('每词最多 5 短语', () => {
      const longWords: Word[] = [{
        id: 'w1',
        word: 'go',
        translations: ['去'],
        pos: ['v'],
        phrases: Array.from({ length: 8 }, (_, i) => ({ phrase: `go ${i}`, translation: `t${i}` })),
      } as any]
      const r = extractPhrasesFromWords(longWords)
      expect(r.length).toBe(5)
    })

    it('无 phrases 的词不返', () => {
      const r = extractPhrasesFromWords([sampleWords[1]])
      expect(r).toEqual([])
    })

    it('空数组返空', () => {
      expect(extractPhrasesFromWords([])).toEqual([])
    })
  })

  describe('shuffleCards', () => {
    it('保持元素', () => {
      const arr = [1, 2, 3, 4, 5]
      const r = shuffleCards(arr)
      expect(r.sort()).toEqual([1, 2, 3, 4, 5])
    })

    it('不修改原数组', () => {
      const arr = [1, 2, 3]
      shuffleCards(arr)
      expect(arr).toEqual([1, 2, 3])
    })

    it('空数组', () => {
      expect(shuffleCards([])).toEqual([])
    })
  })

  describe('getPhraseTTS', () => {
    it('去 / 前缀', () => {
      expect(getPhraseTTS('take a break / 休息一下')).toBe('take a break')
    })

    it('无 / 返原', () => {
      expect(getPhraseTTS('take a break')).toBe('take a break')
    })

    it('空返空', () => {
      expect(getPhraseTTS('')).toBe('')
    })
  })
})
