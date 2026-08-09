// IndexedDB 存储: 生词本、学习记录、复习计划、跟读尝试
import Dexie, { type Table } from 'dexie'
// v1.51.0 W46: 静态 import addXP (verifier4 P1-B 修 fire-and-forget)
import { addXP, XP_REWARDS } from './xpSystem'
// W128: 跨 tab IDB 同步 (动态 import 避免循环依赖 + 启动期不能弹 UI)
import { notifyIdbWrite } from './idbSync'
import type { Favorite, LearnRecord, ReviewItem, PronunciationAttempt } from '../types'

// v1.0: export 供 migrate.ts 等使用
export type { Favorite as FavoriteRecord, PronunciationAttempt }

/** v2.0 W91: 错题复习历史 (永久 IDB 持久化) */
export interface ErrorReviewScore {
  id?: number
  cardId: string
  /** 错题来源: writing/dictation/spelling/follow-read */
  source: 'write' | 'chat' | 'chinese' | 'dictation' | 'spelling' | 'follow-read'
  score: number         // 0-100
  ts: number
}

class EnglishAppDB extends Dexie {
  favorites!: Table<Favorite, string>
  records!: Table<LearnRecord, number>
  reviews!: Table<ReviewItem, string>
  pronunciationAttempts!: Table<PronunciationAttempt, number>
  chats!: Table<ChatRecord, number>
  writingErrors!: Table<WritingError, number>
  errorExplanations!: Table<{ key: string; rule: string; examples: string; mnemonic: string; ts: number }, string>
  // v1.14.0: 自定义场景表
  customScenes!: Table<CustomScene, number>
  // v1.21.0: 生词标签表
  wordTags!: Table<{ wordId: string; tag: string; addedAt: number }, [string, string]>
  // v1.87 W81-D: 听写错题
  dictationErrors!: Table<DictationError, number>
  // v1.91 W85: 释义收藏
  translationFavs!: Table<TranslationFav, [string, number]>
  // v2.0 W91: 错题复习历史 (IDB 永久持久化)
  errorReviewHistory!: Table<ErrorReviewScore, number>

  constructor() {
    super('EnglishAppDB')
    this.version(1).stores({
      favorites: 'wordId, addedAt',
      records: '++id, wordId, action, timestamp',
      reviews: 'wordId, nextReview',
    })
    // v2: 新增跟读尝试表(仅在需要时建立)
    this.version(2).stores({
      favorites: 'wordId, addedAt',
      records: '++id, wordId, action, timestamp',
      reviews: 'wordId, nextReview',
      pronunciationAttempts: '++id, wordId, ts, score',
    })
    // v3: AI 对话持久化(场景 + messages + ts)
    this.version(3).stores({
      favorites: 'wordId, addedAt',
      records: '++id, wordId, action, timestamp',
      reviews: 'wordId, nextReview',
      pronunciationAttempts: '++id, wordId, ts, score',
      chats: '++id, scenario, level, updatedAt, createdAt, title',
      // v0.23: 写作批改错误表
      writingErrors: '++id, ts, source',
    })
    // v1.2-D2: 错题解释缓存表
    this.version(4).stores({
      favorites: 'wordId, addedAt',
      records: '++id, wordId, action, timestamp',
      reviews: 'wordId, nextReview',
      pronunciationAttempts: '++id, wordId, ts, score',
      chats: '++id, scenario, level, updatedAt, createdAt, title',
      writingErrors: '++id, ts, source',
      errorExplanations: 'key, ts',
    })
    // v1.14.0: 自定义场景表 (用户粘贴文本 + AI 提取生词)
    this.version(5).stores({
      favorites: 'wordId, addedAt',
      records: '++id, wordId, action, timestamp',
      reviews: 'wordId, nextReview',
      pronunciationAttempts: '++id, wordId, ts, score',
      chats: '++id, scenario, level, updatedAt, createdAt, title',
      writingErrors: '++id, ts, source',
      errorExplanations: 'key, ts',
      customScenes: '++id, updatedAt, createdAt, title',
    })
    // v1.21.0: 生词标签表
    this.version(6).stores({
      favorites: 'wordId, addedAt',
      records: '++id, wordId, action, timestamp',
      reviews: 'wordId, nextReview',
      pronunciationAttempts: '++id, wordId, ts, score',
      chats: '++id, scenario, level, updatedAt, createdAt, title',
      writingErrors: '++id, ts, source',
      errorExplanations: 'key, ts',
      customScenes: '++id, updatedAt, createdAt, title',
      wordTags: '[wordId+tag], wordId, tag, addedAt',
    })
    // v1.87 W81-D: 听写错题表
    this.version(7).stores({
      favorites: 'wordId, addedAt',
      records: '++id, wordId, action, timestamp',
      reviews: 'wordId, nextReview',
      pronunciationAttempts: '++id, wordId, ts, score',
      chats: '++id, scenario, level, updatedAt, createdAt, title',
      writingErrors: '++id, ts, source',
      errorExplanations: 'key, ts',
      customScenes: '++id, updatedAt, createdAt, title',
      wordTags: '[wordId+tag], wordId, tag, addedAt',
      dictationErrors: '++id, wordId, ts, score, difficulty',
    })
    // v1.91 W85: 释义收藏表
    this.version(8).stores({
      favorites: 'wordId, addedAt',
      records: '++id, wordId, action, timestamp',
      reviews: 'wordId, nextReview',
      pronunciationAttempts: '++id, wordId, ts, score',
      chats: '++id, scenario, level, updatedAt, createdAt, title',
      writingErrors: '++id, ts, source',
      errorExplanations: 'key, ts',
      customScenes: '++id, updatedAt, createdAt, title',
      wordTags: '[wordId+tag], wordId, tag, addedAt',
      dictationErrors: '++id, wordId, ts, score, difficulty',
      translationFavs: '[wordId+index], wordId, index, addedAt',
    })
    // v2.0 W91: 错题复习历史表 (IDB 永久持久化, 修 verifier 找的 localStorage 架构缺陷)
    this.version(9).stores({
      favorites: 'wordId, addedAt',
      records: '++id, wordId, action, timestamp',
      reviews: 'wordId, nextReview',
      pronunciationAttempts: '++id, wordId, ts, score',
      chats: '++id, scenario, level, updatedAt, createdAt, title',
      writingErrors: '++id, ts, source',
      errorExplanations: 'key, ts',
      customScenes: '++id, updatedAt, createdAt, title',
      wordTags: '[wordId+tag], wordId, tag, addedAt',
      dictationErrors: '++id, wordId, ts, score, difficulty',
      translationFavs: '[wordId+index], wordId, index, addedAt',
      errorReviewHistory: '++id, cardId, ts',
    })
  }
}

export const db = new EnglishAppDB()

// === AI 对话持久化 ===
export interface WritingError {
  id?: number
  source: 'write' | 'chat' | 'chinese'  // 写作批改 / AI 对话纠错 / 中译英 (v1.10.0-A)
  original: string
  corrected: string
  errors: Array<{
    original: string
    suggestion: string
    type: WritingErrorType
    explanation: string
    severity: number  // 0-1
  }>
  ts: number
}

/** 错题类型 (v1.82 提取为共享 type) */
export type WritingErrorType =
  | 'grammar' | 'vocab' | 'spelling' | 'style'
  | 'tense' | 'preposition' | 'article' | 'other'

/** v1.87 W81-D: 听写错题记录
 * v1.91 W85: 加 source 字段 (dictation | spelling), 统一错题本
 */
export interface DictationError {
  id?: number
  wordId: string
  /** 听写难度 */
  difficulty: 'easy' | 'medium' | 'hard'
  /** 来源 (v1.91: 拼写错也入此表, v1.92: 跟读错也入此表) */
  source?: 'dictation' | 'spelling' | 'follow-read'
  /** 用户口述/拼写 */
  transcript: string
  /** 目标文本 */
  target: string
  /** 0-100 得分 */
  score: number
  /** 时间戳 */
  ts: number
}

export interface ChatRecord {
  id?: number
  scenario: string
  level: string
  title: string
  messages: { id: string; role: 'user' | 'assistant' | 'system'; content: string; ts: number }[]
  createdAt: number
  updatedAt: number
}

export async function saveChat(record: ChatRecord): Promise<number> {
  const id = await db.chats.put({ ...record, updatedAt: Date.now() })
  // W128: 跨 tab 同步 (收到广播时 _receiving=true, 防回环)
  notifyIdbWrite({ store: 'chats', op: 'put', key: id })
  return id
}

// 写作错误 helpers
export async function saveWritingError(err: WritingError): Promise<number> {
  const id = await db.writingErrors.put({ ...err, ts: Date.now() })
  notifyIdbWrite({ store: 'writingErrors', op: 'put', key: id })
  return id
}

export async function getAllWritingErrors(): Promise<WritingError[]> {
  return db.writingErrors.orderBy('ts').reverse().toArray()
}

export async function deleteWritingError(id: number): Promise<void> {
  return db.writingErrors.delete(id)
}

// v1.87 W81-D: 听写错题 helpers
export async function saveDictationError(err: Omit<DictationError, 'id' | 'ts'>): Promise<number> {
  const id = await db.dictationErrors.add({ ...err, ts: Date.now() })
  notifyIdbWrite({ store: 'dictationErrors', op: 'put', key: id })
  return id
}

export async function getAllDictationErrors(): Promise<DictationError[]> {
  return db.dictationErrors.orderBy('ts').reverse().toArray()
}

export async function getDictationErrorsByWord(wordId: string): Promise<DictationError[]> {
  return db.dictationErrors.where('wordId').equals(wordId).toArray()
}

/** v1.88 W82-C: 复习模式 - 返所有错题 wordId 去重 */
export async function getDictationErrorWordIds(): Promise<string[]> {
  const errors = await db.dictationErrors.toArray()
  const ids = new Set(errors.map(e => e.wordId))
  return [...ids]
}

/** v1.91 W85: 释义收藏 */
export interface TranslationFav {
  wordId: string
  /** 释义在 word.translations 中的索引 */
  index: number
  /** 释义内容 (快照, 避免 word 改后失效) */
  text: string
  addedAt: number
}

export async function addTranslationFav(wordId: string, index: number, text: string): Promise<void> {
  await db.translationFavs.put({ wordId, index, text, addedAt: Date.now() })
}

export async function removeTranslationFav(wordId: string, index: number): Promise<void> {
  await db.translationFavs.delete([wordId, index])
}

export async function getTranslationFavs(wordId: string): Promise<TranslationFav[]> {
  return db.translationFavs.where('wordId').equals(wordId).toArray()
}

export async function getAllTranslationFavs(): Promise<TranslationFav[]> {
  return db.translationFavs.toArray()
}

// === 错题解释缓存 (v1.2-D2) ===
export async function getExplanation(key: string) {
  return db.errorExplanations.get(key)
}

// === v1.21.0 生词标签 ===
export interface WordTag {
  wordId: string
  tag: string         // 小写, ≤ 20 chars
  addedAt: number
}

export async function addWordTag(wordId: string, tag: string): Promise<void> {
  await db.wordTags.put({ wordId, tag, addedAt: Date.now() })
}

export async function getWordTags(wordId: string): Promise<WordTag[]> {
  return db.wordTags.where('wordId').equals(wordId).toArray()
}

export async function getWordsByTag(tag: string): Promise<WordTag[]> {
  return db.wordTags.where('tag').equals(tag).toArray()
}

export async function getAllWordTags(): Promise<WordTag[]> {
  return db.wordTags.toArray()
}

export async function removeWordTag(wordId: string, tag: string): Promise<void> {
  await db.wordTags.where('[wordId+tag]').equals([wordId, tag]).delete()
}

export async function removeAllTagsForWord(wordId: string): Promise<void> {
  await db.wordTags.where('wordId').equals(wordId).delete()
}

// === v1.14.0 自定义场景 ===
export interface CustomScene {
  id?: number
  title: string
  sourceText: string  // 截断 10000 字符
  words: Array<{
    word: string
    translation: string
    example: string
    difficulty: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  }>
  createdAt: number
  updatedAt: number
}

export async function addCustomScene(scene: CustomScene): Promise<number> {
  return db.customScenes.put({ ...scene, updatedAt: Date.now() })
}

export async function getAllCustomScenes(): Promise<CustomScene[]> {
  return db.customScenes.orderBy('updatedAt').reverse().toArray()
}

export async function getCustomScene(id: number): Promise<CustomScene | undefined> {
  return db.customScenes.get(id)
}

export async function deleteCustomScene(id: number): Promise<void> {
  return db.customScenes.delete(id)
}

export async function saveExplanation(key: string, rule: string, examples: string, mnemonic: string) {
  return db.errorExplanations.put({ key, rule, examples, mnemonic, ts: Date.now() })
}

export async function getOrCreateExplanation(
  key: string,
  creator: () => Promise<{ rule: string; examples: string; mnemonic: string }>,
): Promise<{ rule: string; examples: string; mnemonic: string; cached: boolean }> {
  const cached = await getExplanation(key)
  if (cached) {
    return { rule: cached.rule, examples: cached.examples, mnemonic: cached.mnemonic, cached: true }
  }
  const fresh = await creator()
  await saveExplanation(key, fresh.rule, fresh.examples, fresh.mnemonic)
  return { ...fresh, cached: false }
}

export async function getAllChats(): Promise<ChatRecord[]> {
  return db.chats.orderBy('updatedAt').reverse().toArray()
}

export async function getChat(id: number): Promise<ChatRecord | undefined> {
  return db.chats.get(id)
}

export async function deleteChat(id: number): Promise<void> {
  await db.chats.delete(id)
  notifyIdbWrite({ store: 'chats', op: 'delete', key: id })
}

/** 统一处理 IDB 写入错误(quota exceeded 等) */
function handleDbError(e: unknown, context: string): never {
  const err = e as { name?: string; code?: number; message?: string }
  if (err?.name === 'QuotaExceededError' || err?.code === 22) {
    throw new Error(`${context}: 存储空间已满,请清理数据后再试`)
  }
  if (err?.message) {
    throw new Error(`${context}: ${err.message}`)
  }
  throw new Error(`${context}: 写入失败`)
}

// 收藏
export async function addFavorite(wordId: string) {
  try {
    await db.favorites.put({ wordId, addedAt: Date.now() })
  } catch (e) {
    handleDbError(e, '添加收藏')
  }
  // W128: 跨 tab 同步
  notifyIdbWrite({ store: 'favorites', op: 'put', key: wordId })
  // v1.43.0 W43-B: 收藏 +1 XP (静默, 失败不阻塞主流程)
  // v1.51.0 W46: 改静态 import (verifier4 P1-B 修, 避免 fire-and-forget)
  try {
    await addXP(XP_REWARDS.FAVORITE, 'FAVORITE')
  } catch (e) {
    console.warn('db.ts: addXP(FAVORITE) 失败:', e)
  }
}

export async function removeFavorite(wordId: string) {
  await db.favorites.delete(wordId)
  notifyIdbWrite({ store: 'favorites', op: 'delete', key: wordId })
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
  try {
    await db.records.add({
      wordId,
      action,
      timestamp: Date.now(),
    })
  } catch (e) {
    handleDbError(e, '记录学习行为')
  }
}

// 判断 wordId 是否为"真实"单词 ID(过滤场景/每日一句等合成 ID)
const SYNTHETIC_ID_PREFIXES = [
  'scene:',  // 场景课句子: scene:{sceneId}:s{idx}
  'scene-',  // 兼容旧格式
  'daily-',  // 每日一句: daily-{id}
]
function isRealWordId(wordId: string): boolean {
  return !SYNTHETIC_ID_PREFIXES.some(p => wordId.startsWith(p))
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

export async function getAllReviews(): Promise<ReviewItem[]> {
  return await db.reviews.toArray()
}

export async function getDueReviews(): Promise<ReviewItem[]> {
  const now = Date.now()
  return await db.reviews.where('nextReview').below(now).toArray()
}

// 跟读尝试: 写一条新尝试
export async function addPronunciationAttempt(attempt: Omit<PronunciationAttempt, 'id'>) {
  try {
    return await db.pronunciationAttempts.add(attempt)
  } catch (e) {
    handleDbError(e, '保存跟读记录')
  }
}

// 取某词的所有尝试(按时间倒序)
export async function getAttemptsByWord(wordId: string): Promise<PronunciationAttempt[]> {
  try {
    return await db.pronunciationAttempts
      .where('wordId')
      .equals(wordId)
      .reverse()
      .sortBy('ts')
  } catch (e) {
    console.warn('读取跟读记录失败', e)
    return []
  }
}

// 取某词最佳一次尝试(按 score 倒序)
export async function getBestAttempt(wordId: string): Promise<PronunciationAttempt | undefined> {
  try {
    return db.pronunciationAttempts.where('wordId').equals(wordId).reverse().sortBy('score').then(arr => arr[0])
  } catch (e) {
    console.warn('取最佳尝试失败', e)
    return undefined
  }
}

export async function addErrorReviewScore(s: Omit<ErrorReviewScore, 'id'>): Promise<number> {
  try {
    const id = await db.errorReviewHistory.add(s)
    notifyIdbWrite({ store: 'errorReviewHistory', op: 'put', key: id })
    return id
  } catch (e) {
    handleDbError(e, '保存错题评分')
  }
}

export async function getAllErrorReviewScores(): Promise<ErrorReviewScore[]> {
  return db.errorReviewHistory.orderBy('ts').reverse().toArray()
}

export async function getErrorReviewScoresByCard(cardId: string): Promise<ErrorReviewScore[]> {
  return db.errorReviewHistory.where('cardId').equals(cardId).sortBy('ts')
}

export async function clearErrorReviewScores(): Promise<void> {
  return db.errorReviewHistory.clear()
}
