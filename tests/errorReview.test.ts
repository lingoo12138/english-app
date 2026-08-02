// errorReview.test.ts - v1.93 W87-A 错题复习模式 (修 v1: 适配队列模型 + 多测)
import { describe, it, expect } from 'vitest'
import {
  writingToCard,
  dictationToCard,
  toReviewCards,
  pickCard,
  scoreAnswer,
  gradeAnswer,
  newReviewSession,
  answerInSession,
  sessionProgress,
  type ReviewSession,
  type ReviewCard,
} from '../src/lib/errorReview'
import type { WritingError, DictationError } from '../src/lib/db'

const wCard = (id: number, ts: number = 1): ReviewCard => ({
  id: `w-${id}`, source: 'write', prompt: 'I go', answer: 'I went', ts,
})
const dCard = (id: number, ts: number = 1): ReviewCard => ({
  id: `d-${id}`, source: 'spelling', prompt: 'kat', answer: 'cat', ts,
})

describe('W87-A 错题复习模式 (修 v1)', () => {
  describe('writingToCard', () => {
    it('写错题 → 卡片 (多错 hint 全显)', () => {
      const we: WritingError = {
        id: 1, source: 'write', original: 'I go to school', corrected: 'I went to school',
        errors: [
          { original: 'go', suggestion: 'went', type: 'tense', explanation: '过去式', severity: 0.8 },
          { original: 'to', suggestion: 'to', type: 'prep', explanation: '介词', severity: 0.3 },
        ],
        ts: Date.now(),
      }
      const c = writingToCard(we)
      expect(c.id).toBe('w-1')
      expect(c.prompt).toBe('I go to school')
      expect(c.answer).toBe('I went to school')
      expect(c.hint).toContain('tense')
      expect(c.hint).toContain('prep')  // 多错都显
    })
  })

  describe('dictationToCard', () => {
    it('听写错题 → 卡片', () => {
      const de: DictationError = {
        id: 2, wordId: 'w-cat', difficulty: 'easy', source: 'spelling',
        transcript: 'kat', target: 'cat', score: 80, ts: Date.now(),
      }
      const c = dictationToCard(de)
      expect(c.id).toBe('d-2')
      expect(c.source).toBe('spelling')
    })
    it('无 source 默认 dictation', () => {
      const c = dictationToCard({
        id: 3, wordId: 'w-dog', difficulty: 'medium',
        transcript: 'dgo', target: 'dog', score: 50, ts: Date.now(),
      })
      expect(c.source).toBe('dictation')
    })
  })

  describe('toReviewCards', () => {
    it('合并写 + 听写, 按 ts desc 排序', () => {
      const cards = toReviewCards(
        [{ id: 1, source: 'write', original: 'a', corrected: 'b', errors: [], ts: 100 }] as WritingError[],
        [{ id: 2, wordId: 'w', difficulty: 'easy', transcript: 'k', target: 'c', score: 50, ts: 200 }] as DictationError[],
      )
      expect(cards.length).toBe(2)
      expect(cards[0].ts).toBe(200)  // 听写 ts 大, 排前
      expect(cards[1].ts).toBe(100)
    })
    it('空数组返空', () => {
      expect(toReviewCards([], [])).toEqual([])
    })
  })

  describe('pickCard', () => {
    it('空返 null', () => {
      expect(pickCard([])).toBe(null)
    })
    it('非空返 1 张', () => {
      expect(pickCard([wCard(1)])).not.toBe(null)
    })
  })

  describe('scoreAnswer (修 v1: 字符 60% + 词 40% + multiset + 去空格)', () => {
    it('完全对 100', () => {
      expect(scoreAnswer('cat', 'cat')).toBe(100)
    })
    it('大小写不敏感', () => {
      expect(scoreAnswer('Cat', 'cat')).toBe(100)
    })
    it('标点不影响', () => {
      expect(scoreAnswer('I love cats!', 'i love cats')).toBe(100)
    })
    it('全错低分', () => {
      expect(scoreAnswer('cat', 'xyz')).toBeLessThan(20)
    })
    it('部分词对中分', () => {
      const s = scoreAnswer('I went home', 'I go home')
      expect(s).toBeGreaterThanOrEqual(40)
    })
    it('字符 multiset: 重复字符计次数', () => {
      // "mississippi" vs "misis" 字符 multiset
      // m=1, i=4, s=4, p=2 (target)
      // user: m=1, i=2, s=1 (user)
      // matches: m=1, i=2, s=1 = 4
      // total: 11
      // charScore: 4/11 = 36.4
      const s = scoreAnswer('mississippi', 'misis')
      expect(s).toBeLessThan(50)
    })
    it('空格不白送分', () => {
      // target "abc", user " " (normalize 后空) - 完全错
      // 但旧版空格也算字符: a/b/c/space vs space
      // 旧: charScore = 1/4 = 25, wordScore = 0, total = 0.6*25 + 0.4*0 = 15
      // 新 (去空格): charScore = 0, total = 0
      const s = scoreAnswer('abc', ' ')
      expect(s).toBe(0)
    })
    it('空 userAnswer 返 0', () => {
      expect(scoreAnswer('cat', '')).toBe(0)
    })
    it('空 answer 返 0', () => {
      expect(scoreAnswer('', 'cat')).toBe(0)
    })
  })

  describe('gradeAnswer', () => {
    it('95+ = perfect', () => {
      expect(gradeAnswer(100)).toBe('perfect')
      expect(gradeAnswer(95)).toBe('perfect')
    })
    it('70-94 = good', () => {
      expect(gradeAnswer(70)).toBe('good')
      expect(gradeAnswer(94)).toBe('good')
    })
    it('40-69 = ok (partial)', () => {
      expect(gradeAnswer(40)).toBe('ok')
      expect(gradeAnswer(69)).toBe('ok')
    })
    it('1-39 = bad', () => {
      expect(gradeAnswer(39)).toBe('bad')
      expect(gradeAnswer(1)).toBe('bad')
    })
    it('0 = wrong', () => {
      expect(gradeAnswer(0)).toBe('wrong')
    })
  })

  describe('newReviewSession (修 v1: 队列模型)', () => {
    it('空会话初始', () => {
      const s = newReviewSession([])
      expect(s.total).toBe(0)
      expect(s.remaining).toEqual([])
      expect(s.correct).toBe(0)
      expect(s.wrong).toBe(0)
    })
    it('初始 total = cards.length, remaining = 全部 (按 ts desc)', () => {
      const cards = [wCard(1, 100), wCard(2, 200), wCard(3, 150)]
      const s = newReviewSession(cards)
      expect(s.total).toBe(3)
      expect(s.remaining.length).toBe(3)
      expect(s.remaining[0].ts).toBe(200)  // 排序
    })
  })

  describe('answerInSession (修 v1: 答对 shift, 答错 push 末尾)', () => {
    it('答对: remaining.shift, correct++, no requeue', () => {
      const session = newReviewSession([wCard(1), wCard(2), wCard(3)])
      const r = answerInSession(session, 'I went')
      expect(r.score).toBeGreaterThanOrEqual(70)
      expect(r.session.correct).toBe(1)
      expect(r.session.wrong).toBe(0)
      expect(r.session.remaining.length).toBe(2)
      expect(r.session.remaining[0].id).toBe('w-2')  // 推进到第 2 张
      expect(r.isLast).toBe(false)
    })
    it('答错: remaining.shift + push 末尾, wrong++, 下一张仍是错的', () => {
      const session = newReviewSession([wCard(1), wCard(2), wCard(3)])
      const r = answerInSession(session, 'wrong')
      expect(r.session.wrong).toBe(1)
      expect(r.session.remaining.length).toBe(3)  // 长度不变 (push 末尾)
      expect(r.session.remaining[0].id).toBe('w-2')  // 下一张
      expect(r.session.remaining[2].id).toBe('w-1')  // 错题 push 末尾
    })
    it('偷看: 0 分 + 答错处理 (push 末尾)', () => {
      const session = newReviewSession([wCard(1), wCard(2)])
      const r = answerInSession(session, 'I went', true)  // peeked=true
      expect(r.score).toBe(0)
      expect(r.grade).toBe('wrong')
      expect(r.session.wrong).toBe(1)
      expect(r.session.remaining[1].id).toBe('w-1')  // 错题 push 末尾
    })
    it('混合对错: 5 题 2 对 3 错 → correct=2 wrong=3', () => {
      let session = newReviewSession([wCard(1), wCard(2), wCard(3), wCard(4), wCard(5)])
      // 答对
      let r = answerInSession(session, 'I went')
      session = r.session
      // 答错
      r = answerInSession(session, 'X')
      session = r.session
      // 答对
      r = answerInSession(session, 'I went')
      session = r.session
      // 答错
      r = answerInSession(session, 'Y')
      session = r.session
      // 答错
      r = answerInSession(session, 'Z')
      session = r.session
      // 此时: 5 题都过了一遍, 2 对(shift) 3 错(shift+push)
      // remaining 应有 3 张 (都是答错的)
      expect(session.correct).toBe(2)
      expect(session.wrong).toBe(3)
      expect(session.remaining.length).toBe(3)
    })
    it('isLast=true 当 remaining 空', () => {
      const session = newReviewSession([wCard(1)])
      const r = answerInSession(session, 'I went')
      expect(r.isLast).toBe(true)
      expect(r.session.remaining.length).toBe(0)
    })
    it('空 session isLast=true', () => {
      const r = answerInSession(newReviewSession([]), 'x')
      expect(r.isLast).toBe(true)
      expect(r.card).toBe(null)
    })
    it('history 记录 score/grade/peeked', () => {
      let session = newReviewSession([wCard(1)])
      const r = answerInSession(session, 'I went')
      expect(r.session.history[0].cardId).toBe('w-1')
      expect(r.session.history[0].score).toBeGreaterThanOrEqual(70)
      expect(r.session.history[0].grade).toMatch(/perfect|good/)
      expect(!!r.session.history[0].peeked).toBe(false)
    })
  })

  describe('sessionProgress (修 v1: 基于 done / total)', () => {
    it('0 done / 3 = 0', () => {
      const s = newReviewSession([wCard(1), wCard(2), wCard(3)])
      expect(sessionProgress(s)).toBe(0)
    })
    it('1 done / 3 ≈ 0.333', () => {
      const session = newReviewSession([wCard(1), wCard(2), wCard(3)])
      const r = answerInSession(session, 'I went')
      expect(sessionProgress(r.session)).toBeCloseTo(0.333, 2)
    })
    it('2 done / 3 ≈ 0.667', () => {
      let session = newReviewSession([wCard(1), wCard(2), wCard(3)])
      session = answerInSession(session, 'I went').session
      session = answerInSession(session, 'I went').session
      expect(sessionProgress(session)).toBeCloseTo(0.667, 2)
    })
    it('空池 0', () => {
      expect(sessionProgress(newReviewSession([]))).toBe(0)
    })
  })
})
