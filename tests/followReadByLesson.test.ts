// followReadByLesson.test.ts - v1.98 W89-D 跟读按句/按课分组测试
import { describe, it, expect } from 'vitest'
import { groupBySentence, groupByLesson, sentenceStats, lessonStats, type FollowReadScore } from '../src/lib/followReadByLesson'

const make = (lessonId: string, sentenceIndex: number, score: number, ts = 1): FollowReadScore => ({
  id: `f-${lessonId}-${sentenceIndex}-${ts}`,
  lessonId, sentenceIndex, score, ts,
})

describe('W89-D 跟读按句/按课', () => {
  describe('groupBySentence', () => {
    it('按 lessonId + sentenceIndex 二级分组', () => {
      const scores = [
        make('L1', 0, 80),
        make('L1', 0, 90),
        make('L1', 1, 70),
        make('L2', 0, 100),
      ]
      const g = groupBySentence(scores)
      expect(g['L1'][0].length).toBe(2)
      expect(g['L1'][1].length).toBe(1)
      expect(g['L2'][0].length).toBe(1)
    })

    it('空返空', () => {
      expect(groupBySentence([])).toEqual({})
    })
  })

  describe('groupByLesson', () => {
    it('按 lessonId 分组', () => {
      const scores = [
        make('L1', 0, 80),
        make('L1', 1, 90),
        make('L2', 0, 100),
      ]
      const g = groupByLesson(scores)
      expect(g['L1'].length).toBe(2)
      expect(g['L2'].length).toBe(1)
    })
  })

  describe('sentenceStats', () => {
    it('算 best/worst/avg/count', () => {
      const scores = [
        make('L1', 0, 50),
        make('L1', 0, 80),
        make('L1', 0, 100),
        make('L1', 1, 60),
      ]
      const stats = sentenceStats(scores)
      expect(stats.length).toBe(2)
      const s0 = stats.find(s => s.sentenceIndex === 0)!
      expect(s0.best).toBe(100)
      expect(s0.worst).toBe(50)
      expect(s0.avg).toBe(77)  // (50+80+100)/3
      expect(s0.count).toBe(3)
    })

    it('排序: lessonId asc, sentenceIndex asc', () => {
      const scores = [
        make('L2', 1, 50),
        make('L1', 0, 80),
        make('L1', 1, 90),
      ]
      const stats = sentenceStats(scores)
      expect(stats[0].lessonId).toBe('L1')
      expect(stats[0].sentenceIndex).toBe(0)
      expect(stats[1].lessonId).toBe('L1')
      expect(stats[1].sentenceIndex).toBe(1)
      expect(stats[2].lessonId).toBe('L2')
    })

    it('空返空', () => {
      expect(sentenceStats([])).toEqual([])
    })
  })

  describe('lessonStats', () => {
    it('算 best/worst/avg/count + sentenceCount', () => {
      const scores = [
        make('L1', 0, 50),
        make('L1', 0, 80),
        make('L1', 1, 100),
        make('L2', 0, 60),
      ]
      const stats = lessonStats(scores)
      const l1 = stats.find(s => s.lessonId === 'L1')!
      expect(l1.best).toBe(100)
      expect(l1.worst).toBe(50)
      expect(l1.avg).toBe(77)  // (50+80+100)/3
      expect(l1.count).toBe(3)
      expect(l1.sentenceCount).toBe(2)  // 2 个不同句
    })

    it('空返空', () => {
      expect(lessonStats([])).toEqual([])
    })
  })
})
