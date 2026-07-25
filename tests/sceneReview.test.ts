// tests/sceneReview.test.ts - v1.16.0 B6 多场景关联
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../src/lib/db'
import {
  addSceneWordsToReview,
  getSceneReviewStatus,
  getSceneInReviewCount,
  removeSceneWordsFromReview,
  CUSTOM_SCENE_WORD_PREFIX,
  type SceneReviewStatus,
} from '../src/lib/sceneReview'
import type { CustomWord } from '../src/lib/customScenes'

// 临时 IDB 表
beforeEach(async () => {
  await db.reviews.clear()
})

const sampleWords: CustomWord[] = [
  { word: 'apple', translation: '苹果', example: 'An apple a day.', difficulty: 'A1' },
  { word: 'banana', translation: '香蕉', example: 'A yellow banana.', difficulty: 'A1' },
  { word: 'cherry', translation: '樱桃', example: 'Red cherries.', difficulty: 'A2' },
  { word: 'dragon', translation: '龙', example: 'A fierce dragon.', difficulty: 'B2' },
]

describe('sceneReview (v1.16.0-B6)', () => {
  describe('CUSTOM_SCENE_WORD_PREFIX', () => {
    it('应为 customScene:', () => {
      expect(CUSTOM_SCENE_WORD_PREFIX).toBe('customScene:')
    })
  })

  describe('addSceneWordsToReview', () => {
    it('新词全部入复习', async () => {
      const result = await addSceneWordsToReview(sampleWords, 'Test Scene')
      expect(result.added).toBe(4)
      expect(result.skipped).toBe(0)
    })

    it('入复习后 IDB 有数据', async () => {
      await addSceneWordsToReview(sampleWords, 'Test Scene')
      const all = await db.reviews.toArray()
      expect(all.length).toBe(4)
    })

    it('wordId 含 customScene: 前缀', async () => {
      await addSceneWordsToReview([sampleWords[0]], 'Test')
      const item = await db.reviews.get('customScene:apple')
      expect(item).toBeDefined()
      expect(item?.wordId).toBe('customScene:apple')
    })

    it('nextReview 初始化为 now (立即可复习)', async () => {
      const before = Date.now()
      await addSceneWordsToReview([sampleWords[0]], 'Test')
      const after = Date.now()
      const item = await db.reviews.get('customScene:apple')
      expect(item?.nextReview).toBeGreaterThanOrEqual(before)
      expect(item?.nextReview).toBeLessThanOrEqual(after)
    })

    it('SM-2 初始值: easeFactor=2.5, interval=0, repetitions=0', async () => {
      await addSceneWordsToReview([sampleWords[0]], 'Test')
      const item = await db.reviews.get('customScene:apple')
      expect(item?.easeFactor).toBe(2.5)
      expect(item?.interval).toBe(0)
      expect(item?.repetitions).toBe(0)
    })

    it('已存在跳过 (idempotent)', async () => {
      await addSceneWordsToReview(sampleWords, 'Test')
      const result2 = await addSceneWordsToReview(sampleWords, 'Test')
      expect(result2.added).toBe(0)
      expect(result2.skipped).toBe(4)
    })

    it('部分已存在: 跳过已存, 新增未存', async () => {
      await addSceneWordsToReview(sampleWords.slice(0, 2), 'Test')
      const result = await addSceneWordsToReview(sampleWords, 'Test')
      expect(result.added).toBe(2)  // cherry + dragon
      expect(result.skipped).toBe(2)  // apple + banana
    })

    it('空数组: 0 入 0 跳', async () => {
      const result = await addSceneWordsToReview([], 'Empty')
      expect(result.added).toBe(0)
      expect(result.skipped).toBe(0)
    })
  })

  describe('getSceneReviewStatus', () => {
    it('未入复习: 0 / 0 / 0', async () => {
      const status = await getSceneReviewStatus(sampleWords)
      expect(status.totalWords).toBe(4)
      expect(status.inReviewCount).toBe(0)
      expect(status.masteredCount).toBe(0)
    })

    it('部分入复习', async () => {
      await addSceneWordsToReview(sampleWords.slice(0, 2), 'Test')
      const status = await getSceneReviewStatus(sampleWords)
      expect(status.totalWords).toBe(4)
      expect(status.inReviewCount).toBe(2)
      expect(status.masteredCount).toBe(0)
    })

    it('已掌握: repetitions >= 3', async () => {
      await addSceneWordsToReview(sampleWords, 'Test')
      // 手动标记 apple 为已掌握
      await db.reviews.put({
        wordId: 'customScene:apple',
        nextReview: Date.now(),
        interval: 10,
        easeFactor: 2.5,
        repetitions: 5,
      })
      const status = await getSceneReviewStatus(sampleWords)
      expect(status.inReviewCount).toBe(4)
      expect(status.masteredCount).toBe(1)  // 只有 apple
    })
  })

  describe('getSceneInReviewCount', () => {
    it('未入: 0', async () => {
      const count = await getSceneInReviewCount(sampleWords)
      expect(count).toBe(0)
    })

    it('入 2: 2', async () => {
      await addSceneWordsToReview(sampleWords.slice(0, 2), 'Test')
      const count = await getSceneInReviewCount(sampleWords)
      expect(count).toBe(2)
    })
  })

  describe('removeSceneWordsFromReview', () => {
    it('入后删: 0 剩余', async () => {
      await addSceneWordsToReview(sampleWords, 'Test')
      const removed = await removeSceneWordsFromReview(sampleWords)
      expect(removed).toBe(4)
      const all = await db.reviews.toArray()
      expect(all.length).toBe(0)
    })

    it('未入: 0 删', async () => {
      const removed = await removeSceneWordsFromReview(sampleWords)
      expect(removed).toBe(0)
    })

    it('只删场景词, 不影响其他词', async () => {
      // 加自定义场景词 + 真实词
      await addSceneWordsToReview(sampleWords, 'Test')
      await db.reviews.put({
        wordId: 'realword:hello',
        nextReview: Date.now(),
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
      })
      const removed = await removeSceneWordsFromReview(sampleWords)
      expect(removed).toBe(4)
      const remaining = await db.reviews.toArray()
      expect(remaining.length).toBe(1)  // hello 仍在
      expect(remaining[0].wordId).toBe('realword:hello')
    })
  })

  describe('v1.11 reviewQueue 集成 (mock)', () => {
    it('入复习后 scoreReviewItem 可算分', async () => {
      await addSceneWordsToReview(sampleWords, 'Test')
      const items = await db.reviews.toArray()
      expect(items.length).toBe(4)
      // 所有词 nextReview = now, 分数应相近
      // (实际排序在 reviewQueue.ts, 这里只验证数据可用)
      for (const item of items) {
        expect(item.wordId).toContain('customScene:')
        expect(item.easeFactor).toBe(2.5)
      }
    })
  })
})
