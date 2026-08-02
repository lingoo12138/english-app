// followReadScore.test.ts - v1.94 W88-A 跟读评分测试
import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveFollowReadScore,
  getFollowReadScores,
  getScoreAggregates,
  clearFollowReadScores,
  type FollowReadScore,
} from '../src/lib/followReadScore'

describe('W88-A 跟读评分趋势', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('saveFollowReadScore', () => {
    it('保存并生成 id', () => {
      const s = saveFollowReadScore({
        lessonId: 'L1', sentenceIndex: 0, score: 80, ts: Date.now(),
      })
      expect(s.id).toMatch(/^f-/)
      expect(s.lessonId).toBe('L1')
    })
    it('多条保存累加', () => {
      saveFollowReadScore({ lessonId: 'L1', sentenceIndex: 0, score: 80, ts: 1000 })
      saveFollowReadScore({ lessonId: 'L1', sentenceIndex: 1, score: 60, ts: 2000 })
      saveFollowReadScore({ lessonId: 'L2', sentenceIndex: 0, score: 100, ts: 3000 })
      const all = getFollowReadScores()
      expect(all.length).toBe(3)
    })
  })

  describe('getFollowReadScores', () => {
    it('按 ts desc 排序', () => {
      saveFollowReadScore({ lessonId: 'L1', sentenceIndex: 0, score: 50, ts: 1000 })
      saveFollowReadScore({ lessonId: 'L1', sentenceIndex: 1, score: 90, ts: 3000 })
      saveFollowReadScore({ lessonId: 'L1', sentenceIndex: 2, score: 70, ts: 2000 })
      const all = getFollowReadScores()
      expect(all[0].ts).toBe(3000)
      expect(all[1].ts).toBe(2000)
      expect(all[2].ts).toBe(1000)
    })
    it('按 lessonId 过滤', () => {
      saveFollowReadScore({ lessonId: 'L1', sentenceIndex: 0, score: 50, ts: 1000 })
      saveFollowReadScore({ lessonId: 'L2', sentenceIndex: 0, score: 90, ts: 2000 })
      expect(getFollowReadScores('L1').length).toBe(1)
      expect(getFollowReadScores('L2').length).toBe(1)
      expect(getFollowReadScores('L3').length).toBe(0)
    })
  })

  describe('getScoreAggregates', () => {
    it('空返零', () => {
      const a = getScoreAggregates()
      expect(a.count).toBe(0)
      expect(a.avg).toBe(0)
      expect(a.best).toBe(0)
      expect(a.recent).toEqual([])
      expect(a.byLesson).toEqual([])
    })
    it('avg/best/count 正确', () => {
      saveFollowReadScore({ lessonId: 'L1', sentenceIndex: 0, score: 60, ts: 1 })
      saveFollowReadScore({ lessonId: 'L1', sentenceIndex: 1, score: 80, ts: 2 })
      saveFollowReadScore({ lessonId: 'L1', sentenceIndex: 2, score: 100, ts: 3 })
      const a = getScoreAggregates()
      expect(a.count).toBe(3)
      expect(a.avg).toBe(80)  // (60+80+100)/3
      expect(a.best).toBe(100)
    })
    it('byLesson 按 count desc', () => {
      saveFollowReadScore({ lessonId: 'L1', sentenceIndex: 0, score: 60, ts: 1 })
      saveFollowReadScore({ lessonId: 'L1', sentenceIndex: 1, score: 80, ts: 2 })
      saveFollowReadScore({ lessonId: 'L2', sentenceIndex: 0, score: 100, ts: 3 })
      const a = getScoreAggregates()
      expect(a.byLesson[0].lessonId).toBe('L1')  // 2 排前
      expect(a.byLesson[1].lessonId).toBe('L2')
      expect(a.byLesson[0].count).toBe(2)
      expect(a.byLesson[0].avg).toBe(70)
      expect(a.byLesson[0].best).toBe(80)
    })
    it('recent 限 20', () => {
      for (let i = 0; i < 30; i++) {
        saveFollowReadScore({ lessonId: 'L1', sentenceIndex: 0, score: 50, ts: i })
      }
      const a = getScoreAggregates()
      expect(a.recent.length).toBe(20)
    })
  })

  describe('clearFollowReadScores', () => {
    it('清空', () => {
      saveFollowReadScore({ lessonId: 'L1', sentenceIndex: 0, score: 50, ts: 1 })
      clearFollowReadScores()
      expect(getFollowReadScores().length).toBe(0)
    })
  })
})
