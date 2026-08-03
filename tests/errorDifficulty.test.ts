// errorDifficulty.test.ts - v1.95 W89-B 错题难度自适应测试
// v1.99 W90 修 v1: 加 analyzeScores 纯函数
import { describe, it, expect } from 'vitest'
import { analyzeScores,
  analyzeCard,
  updateCardDifficulty,
  difficultyStyle,
  trendArrow,
  countByDifficulty,
  type Difficulty,
} from '../src/lib/errorDifficulty'
import type { ReviewSession, ReviewCard } from '../src/lib/errorReview'

const makeCard = (id: string): ReviewCard => ({
  id, source: 'write', prompt: `p${id}`, answer: `a${id}`, ts: 1,
})

const makeSession = (remaining: ReviewCard[], history: { cardId: string; score: number }[] = []): ReviewSession => ({
  total: remaining.length + history.length,
  remaining,
  correct: 0, wrong: 0,
  history: history.map(h => ({ cardId: h.cardId, score: h.score, grade: 'ok' })),
})

describe('W89-B 错题难度自适应', () => {
  describe('analyzeCard', () => {
    it('无 history: medium', () => {
      const s = makeSession([makeCard('a')])
      const a = analyzeCard(s, makeCard('a'))
      expect(a.attempts).toBe(0)
      expect(a.difficulty).toBe('medium')
    })
    it('3 次 >= 80 = mastered', () => {
      const s = makeSession([makeCard('a')], [
        { cardId: 'a', score: 80 },
        { cardId: 'a', score: 90 },
        { cardId: 'a', score: 100 },
      ])
      const a = analyzeCard(s, makeCard('a'))
      expect(a.difficulty).toBe('mastered')
      expect(a.correctCount).toBe(3)
    })
    it('2 次 < 40 = hard', () => {
      const s = makeSession([makeCard('a')], [
        { cardId: 'a', score: 20 },
        { cardId: 'a', score: 30 },
      ])
      const a = analyzeCard(s, makeCard('a'))
      expect(a.difficulty).toBe('hard')
      expect(a.wrongCount).toBe(2)
    })
    it('avg >= 80 = easy', () => {
      const s = makeSession([makeCard('a')], [
        { cardId: 'a', score: 80 },
        { cardId: 'a', score: 90 },
      ])
      const a = analyzeCard(s, makeCard('a'))
      expect(a.difficulty).toBe('easy')
    })
    it('avg 40-79 = medium', () => {
      const s = makeSession([makeCard('a')], [
        { cardId: 'a', score: 50 },
        { cardId: 'a', score: 60 },
      ])
      const a = analyzeCard(s, makeCard('a'))
      expect(a.difficulty).toBe('medium')
    })
    it('trend up/down/flat', () => {
      // up: 最近 3 高于前面
      const sUp = makeSession([makeCard('a')], [
        { cardId: 'a', score: 50 },
        { cardId: 'a', score: 50 },
        { cardId: 'a', score: 80 },
        { cardId: 'a', score: 90 },
        { cardId: 'a', score: 100 },
      ])
      expect(analyzeCard(sUp, makeCard('a')).trend).toBe('up')
    })
  })

  describe('updateCardDifficulty', () => {
    it('mastered: 3 次 >= 80 后移出 remaining', () => {
      const session = makeSession([makeCard('a'), makeCard('b')], [
        { cardId: 'a', score: 90 },
        { cardId: 'a', score: 100 },
      ])
      const updated = updateCardDifficulty(session, makeCard('a'), 90)  // 第 3 次
      expect(updated.remaining.length).toBe(1)  // a 移出
      expect(updated.remaining[0].id).toBe('b')
      expect(updated.history.length).toBe(3)
    })
    it('hard: 2 次 < 40 推末尾', () => {
      const session = makeSession([makeCard('a'), makeCard('b')], [
        { cardId: 'a', score: 20 },
      ])
      const updated = updateCardDifficulty(session, makeCard('a'), 20)  // 第 2 次
      expect(updated.remaining.length).toBe(2)  // 长度不变
      expect(updated.remaining[0].id).toBe('b')  // b 在前
      expect(updated.remaining[1].id).toBe('a')  // a 推末尾
    })
    it('普通 medium: 正常操作 (无移出/加深)', () => {
      const session = makeSession([makeCard('a'), makeCard('b')], [])
      const updated = updateCardDifficulty(session, makeCard('a'), 60)
      expect(updated.remaining.length).toBe(2)
      expect(updated.history.length).toBe(1)
    })
  })

  describe('difficultyStyle', () => {
    it('4 个难度都有 emoji + color + label', () => {
      const styles = ['mastered', 'easy', 'medium', 'hard'] as Difficulty[]
      for (const d of styles) {
        const s = difficultyStyle(d)
        expect(s.emoji).toBeTruthy()
        expect(s.color).toBeTruthy()
        expect(s.label).toBeTruthy()
      }
    })
  })

  describe('trendArrow', () => {
    it('up/down/flat', () => {
      expect(trendArrow('up')).toBe('↑')
      expect(trendArrow('down')).toBe('↓')
      expect(trendArrow('flat')).toBe('→')
    })
  })

  describe('countByDifficulty', () => {
    it('统计池中各难度', () => {
      const session = makeSession([makeCard('a'), makeCard('b'), makeCard('c'), makeCard('d')], [
        { cardId: 'a', score: 90 },
        { cardId: 'a', score: 100 },
        { cardId: 'a', score: 90 },  // mastered
        { cardId: 'b', score: 20 },  // hard
      ])
      const cards = [makeCard('a'), makeCard('b'), makeCard('c'), makeCard('d')]
      const counts = countByDifficulty(session, cards)
      expect(counts.mastered).toBe(1)
      expect(counts.hard).toBe(1)
      // c, d 0 attempts = medium
      expect(counts.medium).toBe(2)
    })
  })
})

  // W90 修 v1: 纯函数 analyzeScores
  describe('analyzeScores (W90 纯函数版)', () => {
    it('空 scores = medium, 全 0', () => {
      const r = analyzeScores('a', [])
      expect(r.attempts).toBe(0)
      expect(r.avgScore).toBe(0)
      expect(r.difficulty).toBe('medium')
      expect(r.recentScores).toEqual([])
    })
    it('3 次 >= 80 = mastered', () => {
      const r = analyzeScores('a', [80, 90, 100])
      expect(r.difficulty).toBe('mastered')
      expect(r.correctCount).toBe(3)
      expect(r.avgScore).toBe(90)
    })
    it('2 次 < 40 = hard', () => {
      const r = analyzeScores('a', [20, 30])
      expect(r.difficulty).toBe('hard')
      expect(r.wrongCount).toBe(2)
    })
    it('trend up', () => {
      const r = analyzeScores('a', [40, 40, 40, 80, 90])
      expect(r.trend).toBe('up')
    })
  })
