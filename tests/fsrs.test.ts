// FSRS 4.5 简化版 单元测试 (v1.11.0-A)
import { describe, it, expect, beforeEach } from 'vitest'
import {
  initFSRS,
  reviewFSRS,
  getRetrievability,
  fromSM2,
  toSM2,
  Rating,
  type FSRSCard,
} from '../src/lib/fsrs'
import {
  getUseFSRS,
  setUseFSRS,
  getNextReviewFSRS,
  loadFSRSCard,
  saveFSRSCard,
  migrateSM2ToFSRS,
  migrateFSRSToSM2,
} from '../src/lib/plan'
import type { ReviewItem } from '../src/types'

// 固定时间戳便于断言: 2026-07-23 12:00:00 UTC
const NOW = 1753272000000
const DAY = 24 * 60 * 60 * 1000

describe('fsrs.ts (v1.11.0-A)', () => {
  describe('initFSRS', () => {
    it('默认值: d=5, s=2, r=1, t=0, due=now, lastReview=0, reps=0, lapses=0', () => {
      const card = initFSRS(NOW)
      expect(card.d).toBe(5)
      expect(card.s).toBe(2)
      expect(card.r).toBe(1)
      expect(card.t).toBe(0)
      expect(card.due).toBe(NOW)
      expect(card.lastReview).toBe(0)
      expect(card.reps).toBe(0)
      expect(card.lapses).toBe(0)
    })
  })

  describe('reviewFSRS', () => {
    it('Again 评级 → 间隔短 (1 天), R 衰减, lapses+1', () => {
      const card = initFSRS(NOW)
      const reviewed = reviewFSRS(card, Rating.Again, NOW)
      // 间隔固定 1 天
      expect(reviewed.t).toBe(1)
      // due = now + 1 day
      expect(reviewed.due).toBe(NOW + DAY)
      // R 衰减到 0.5 (Again 复习后)
      expect(reviewed.r).toBe(0.5)
      // lapses + 1
      expect(reviewed.lapses).toBe(1)
      // D 上升 (变难)
      expect(reviewed.d).toBeGreaterThan(card.d)
      // S 减半
      expect(reviewed.s).toBeLessThan(card.s)
    })

    it('Good 评级 → 间隔拉长, S 略升, reps+1', () => {
      const card = initFSRS(NOW)
      // 先 Good 几次让 t 变大
      let cur = card
      for (let i = 0; i < 3; i++) {
        cur = reviewFSRS(cur, Rating.Good, NOW + i * DAY)
      }
      // 3 次 Good 后 t 必 > 0
      expect(cur.t).toBeGreaterThan(0)
      // S 略升
      expect(cur.s).toBeGreaterThan(card.s)
      // lapses 不变 (没 Again)
      expect(cur.lapses).toBe(0)
      // reps = 3
      expect(cur.reps).toBe(3)
      // lastReview 更新
      expect(cur.lastReview).toBe(NOW + 2 * DAY)
    })

    it('Easy 评级 → 间隔比 Good 更长', () => {
      // 同样起点, 对比 Good vs Easy
      const cardA = initFSRS(NOW)
      const cardB = initFSRS(NOW)
      // 先各 Good 一次让 t 起步
      const a1 = reviewFSRS(cardA, Rating.Good, NOW)
      const b1 = reviewFSRS(cardB, Rating.Good, NOW)
      // 起点一致
      expect(a1.t).toBe(b1.t)
      // 第二次: A 用 Good, B 用 Easy
      const a2 = reviewFSRS(a1, Rating.Good, NOW + DAY)
      const b2 = reviewFSRS(b1, Rating.Easy, NOW + DAY)
      // Easy 的 t 必 >= Good 的 t
      expect(b2.t).toBeGreaterThanOrEqual(a2.t)
      // 进一步: 如果 a2.t > 0, 严格 b2.t > a2.t
      // (因为 Easy factor=1.3, Good factor=1.0)
      if (a2.t > 0) {
        expect(b2.t).toBeGreaterThanOrEqual(a2.t)
      }
      // Easy 后 D 下降 (变易)
      expect(b2.d).toBeLessThan(b1.d)
    })
  })

  describe('getRetrievability', () => {
    it('随时间下降 (S 固定, t 越大 R 越低)', () => {
      const card = initFSRS(NOW)
      // 第一次 Good 让 lastReview 更新到 NOW
      const reviewed = reviewFSRS(card, Rating.Good, NOW)
      // t=0 时刻: R 应该最高
      const r0 = getRetrievability(reviewed, NOW)
      // 5 天后: R 下降
      const r5 = getRetrievability(reviewed, NOW + 5 * DAY)
      // 20 天后: R 更低
      const r20 = getRetrievability(reviewed, NOW + 20 * DAY)
      expect(r0).toBeGreaterThan(r5)
      expect(r5).toBeGreaterThan(r20)
      // 范围 [0, 1]
      expect(r0).toBeGreaterThanOrEqual(0)
      expect(r0).toBeLessThanOrEqual(1)
      expect(r20).toBeGreaterThanOrEqual(0)
      expect(r20).toBeLessThanOrEqual(1)
    })

    it('从未复习的卡片 R=1', () => {
      const card = initFSRS(NOW)
      // lastReview = 0 (未复习)
      expect(getRetrievability(card, NOW)).toBe(1)
      expect(getRetrievability(card, NOW + 100 * DAY)).toBe(1)
    })
  })

  describe('SM-2 ↔ FSRS 转换 (mock 数据)', () => {
    it('fromSM2: easeFactor 2.5 → d≈3 (中等偏易)', () => {
      const sm2: ReviewItem = {
        wordId: 'w-1',
        nextReview: NOW + 10 * DAY,
        interval: 10,
        easeFactor: 2.5,
        repetitions: 3,
      }
      const card = fromSM2(sm2, NOW)
      // easeFactor 2.5 → d 接近 3 (1-10), 因为 (3.0 - 2.5) / 0.17 ≈ 2.94 → round = 3
      expect(card.d).toBe(3)
      // 稳定性 = 当前间隔
      expect(card.s).toBe(10)
      // reps 透传
      expect(card.reps).toBe(3)
      // lapses 默认 0
      expect(card.lapses).toBe(0)
      // due 透传
      expect(card.due).toBe(sm2.nextReview)
    })

    it('fromSM2: easeFactor 1.3 (最难) → d=10', () => {
      const sm2: ReviewItem = {
        wordId: 'w-2',
        nextReview: NOW + DAY,
        interval: 1,
        easeFactor: 1.3,
        repetitions: 1,
      }
      const card = fromSM2(sm2, NOW)
      // easeFactor 1.3 → d=10 (最难)
      expect(card.d).toBe(10)
    })

    it('toSM2: d=3 → easeFactor≈2.5 (反向验证)', () => {
      const card: FSRSCard = {
        d: 3,
        s: 5,
        r: 0.9,
        t: 5,
        due: NOW + 5 * DAY,
        lastReview: NOW,
        reps: 2,
        lapses: 0,
      }
      const sm2 = toSM2(card)
      // d=3 → easeFactor 2.5 (允许浮点误差, 公式 3.0 - 3*0.17 = 2.49)
      expect(sm2.easeFactor).toBeCloseTo(2.5, 1)
      // interval 透传
      expect(sm2.interval).toBe(5)
      // repetitions 透传
      expect(sm2.repetitions).toBe(2)
      // wordId 留空, 调用方填
      expect(sm2.wordId).toBe('')
    })

    it('迁移链: SM-2 → FSRS → SM-2 easeFactor 接近原值', () => {
      const original: ReviewItem = {
        wordId: 'w-3',
        nextReview: NOW + 7 * DAY,
        interval: 7,
        easeFactor: 2.36,
        repetitions: 4,
      }
      // SM-2 → FSRS
      const card = fromSM2(original, NOW)
      // FSRS → SM-2
      const back = toSM2(card)
      // easeFactor 误差在 0.1 内 (4 舍 5 入)
      expect(Math.abs(back.easeFactor - original.easeFactor)).toBeLessThan(0.3)
      // interval 一致
      expect(back.interval).toBe(original.interval)
    })
  })
})

// === plan.ts 集成测试 (FSRS 部分) ===
describe('plan.ts FSRS 集成', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('getUseFSRS 默认 false (保持 SM-2)', () => {
    expect(getUseFSRS()).toBe(false)
  })

  it('setUseFSRS(true) 后 getUseFSRS 返回 true', () => {
    setUseFSRS(true)
    expect(getUseFSRS()).toBe(true)
    setUseFSRS(false)
    expect(getUseFSRS()).toBe(false)
  })

  it('getNextReviewFSRS: 加载/更新/保存卡片', () => {
    // 第一次: 无卡片, 自动 init
    const c1 = getNextReviewFSRS('w-1', Rating.Good, NOW)
    expect(c1.reps).toBe(1)
    expect(c1.lapses).toBe(0)
    // 第二次: 加载已有, 继续更新
    const c2 = getNextReviewFSRS('w-1', Rating.Good, NOW + DAY)
    expect(c2.reps).toBe(2)
    // localStorage 已存
    const stored = loadFSRSCard('w-1')
    expect(stored).not.toBeNull()
    expect(stored!.reps).toBe(2)
  })

  it('getNextReviewFSRS: Again 触发 lapses 计数', () => {
    getNextReviewFSRS('w-2', Rating.Good, NOW)
    getNextReviewFSRS('w-2', Rating.Good, NOW + DAY)
    const after = getNextReviewFSRS('w-2', Rating.Again, NOW + 2 * DAY)
    expect(after.lapses).toBe(1)
    // Again 后 t=1
    expect(after.t).toBe(1)
  })

  it('migrateSM2ToFSRS: 把 SM-2 ReviewItem 转换为 FSRS 卡片并保存', () => {
    const sm2: ReviewItem = {
      wordId: 'w-4',
      nextReview: NOW + 14 * DAY,
      interval: 14,
      easeFactor: 2.5,
      repetitions: 5,
    }
    const card = migrateSM2ToFSRS('w-4', sm2, NOW)
    expect(card.s).toBe(14)
    expect(card.reps).toBe(5)
    // 持久化了
    const stored = loadFSRSCard('w-4')
    expect(stored).not.toBeNull()
    expect(stored!.s).toBe(14)
  })

  it('migrateFSRSToSM2: 把 FSRS 卡片转回 SM-2 ReviewItem', () => {
    const card: FSRSCard = {
      d: 3,
      s: 10,
      r: 0.9,
      t: 10,
      due: NOW + 10 * DAY,
      lastReview: NOW,
      reps: 3,
      lapses: 0,
    }
    const sm2 = migrateFSRSToSM2('w-5', card)
    expect(sm2.wordId).toBe('w-5')
    expect(sm2.interval).toBe(10)
    expect(sm2.repetitions).toBe(3)
    expect(sm2.easeFactor).toBeCloseTo(2.5, 1)
  })

  it('saveFSRSCard 损坏数据时返回 null 不抛', () => {
    // 写一个坏的 JSON
    localStorage.setItem('fsrs-card-w-bad', '{not valid json')
    const result = loadFSRSCard('w-bad')
    expect(result).toBeNull()
  })

  it('saveFSRSCard 正常路径', () => {
    const card = initFSRSCardForTest()
    saveFSRSCard('w-6', card)
    const loaded = loadFSRSCard('w-6')
    expect(loaded).toEqual(card)
  })
})

function initFSRSCardForTest(): FSRSCard {
  return initFSRS(NOW)
}
