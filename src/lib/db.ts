// IndexedDB 存储: 生词本、学习记录、复习计划
import Dexie, { type Table } from 'dexie'
import type { Favorite, LearnRecord, ReviewItem } from '../types'

class EnglishAppDB extends Dexie {
  favorites!: Table<Favorite, string>
  records!: Table<LearnRecord, number>
  reviews!: Table<ReviewItem, string>

  constructor() {
    super('EnglishAppDB')
    this.version(1).stores({
      favorites: 'wordId, addedAt',
      records: '++id, wordId, action, timestamp',
      reviews: 'wordId, nextReview',
    })
  }
}

export const db = new EnglishAppDB()

// 收藏
export async function addFavorite(wordId: string) {
  await db.favorites.put({ wordId, addedAt: Date.now() })
}

export async function removeFavorite(wordId: string) {
  await db.favorites.delete(wordId)
}

export async function isFavorite(wordId: string): Promise<boolean> {
  const f = await db.favorites.get(wordId)
  return !!f
}

export async function getAllFavorites(): Promise<Favorite[]> {
  return await db.favorites.orderBy('addedAt').reverse().toArray()
}

// 学习记录
export async function logAction(wordId: string, action: LearnRecord['action']) {
  await db.records.add({
    wordId,
    action,
    timestamp: Date.now(),
  })
}

// 判断 wordId 是否为"真实"单词 ID(过滤场景/每日一句等合成 ID)
function isRealWordId(wordId: string): boolean {
  // 场景课句子的 recId 格式: scene-{sceneId}-{...}
  if (wordId.startsWith('scene-')) return false
  // 每日一句的 recId 格式: daily-{id}
  if (wordId.startsWith('daily-')) return false
  return true
}

export async function getTodayCount(): Promise<number> {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const records = await db.records.where('timestamp').above(start.getTime()).toArray()
  // 去重: 同一词只算一次,过滤非真实单词
  const uniqueWords = new Set(
    records
      .filter(r => r.action === 'view' && isRealWordId(r.wordId))
      .map(r => r.wordId)
  )
  return uniqueWords.size
}

export async function getTotalLearned(): Promise<number> {
  const records = await db.records.where('action').equals('view').toArray()
  return new Set(records.map(r => r.wordId)).size
}

// SM-2 复习算法
export async function reviewWord(wordId: string, quality: 0 | 1 | 2 | 3 | 4 | 5) {
  // quality: 0-2 = 错, 3-5 = 对
  const existing = await db.reviews.get(wordId)

  let interval: number
  let easeFactor: number
  let repetitions: number

  if (existing) {
    easeFactor = existing.easeFactor
    repetitions = existing.repetitions
  } else {
    easeFactor = 2.5
    repetitions = 0
  }

  if (quality < 3) {
    // 答错,重置
    repetitions = 0
    interval = 1
  } else {
    repetitions += 1
    if (repetitions === 1) interval = 1
    else if (repetitions === 2) interval = 3
    else interval = Math.round(existing ? existing.interval * easeFactor : 3)
  }

  // 更新 ease factor
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  )

  await db.reviews.put({
    wordId,
    nextReview: Date.now() + interval * 24 * 60 * 60 * 1000,
    interval,
    easeFactor,
    repetitions,
  })
}

export async function getDueReviews(): Promise<ReviewItem[]> {
  const now = Date.now()
  return await db.reviews.where('nextReview').below(now).toArray()
}
