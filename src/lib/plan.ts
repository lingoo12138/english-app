// 每日学习计划 - v0.22.3
// 根据 dailyGoal + targetLevel, 智能选今天要学的 N 个词
// 选词优先级: 1) 复习 due 词  2) 已收藏但未掌握  3) targetLevel 新词
import { loadWords } from './words'
import { getAllFavorites, getDueReviews, getAllReviews } from './db'
import type { Word } from '../types'

export interface TodayPlan {
  date: string  // YYYY-MM-DD
  total: number  // 目标数
  completed: number  // 已完成数
  words: Word[]  // 今日待学/已学
  bySource: {
    review: number
    favorite: number
    new: number
  }
  isDone: boolean
  progressPct: number
}

// 今日 key 用 YYYY-MM-DD (Asia/Shanghai)
function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 今日完成的 wordId 集合 + 目标快照: 用 localStorage 缓存
// v0.22.6: 改 value 结构 {completed: string[], goal: number}
//   goal 快照, 用户改 dailyGoal 后历史显示仍是当时的 goal
const STORAGE_KEY = 'plan-progress-'

interface ProgressData {
  completed: string[]
  goal: number
}

export function loadProgress(date: string): { completed: Set<string>; goal: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY + date)
    if (raw) {
      const data = JSON.parse(raw) as ProgressData | string[]  // 兼容老数据
      if (Array.isArray(data)) {
        return { completed: new Set(data), goal: 0 }
      }
      return { completed: new Set(data.completed || []), goal: data.goal || 0 }
    }
  } catch (e) {
    // P1 修复: 显式 catch + warn(避免静默失败)
    console.warn('plan.ts: loadProgress 失败 (corrupted localStorage?):', e)
  }
  return { completed: new Set(), goal: 0 }
}

export function saveProgress(date: string, completed: Set<string>, goal: number): void {
  try {
    const data: ProgressData = { completed: Array.from(completed), goal }
    localStorage.setItem(STORAGE_KEY + date, JSON.stringify(data))
  } catch (e) {
    // P1 修: 显式 catch 报警,避免静默失败
    console.warn('plan.ts: saveProgress 失败 (quota?):', e)
  }
}

// 标记一个词今日完成
export function markWordCompleted(wordId: string, date?: string, goal?: number): Set<string> {
  const d = date || todayKey()
  const { completed, goal: storedGoal } = loadProgress(d)
  completed.add(wordId)
  saveProgress(d, completed, goal || storedGoal)
  return completed
}

// 取消标记
export function unmarkWordCompleted(wordId: string, date?: string, goal?: number): Set<string> {
  const d = date || todayKey()
  const { completed, goal: storedGoal } = loadProgress(d)
  completed.delete(wordId)
  saveProgress(d, completed, goal || storedGoal)
  return completed
}

/**
 * 生成今日学习计划
 * @param dailyGoal 每日目标词数
 * @param targetLevel 目标学段 (或 'all')
 */
export async function generateTodayPlan(dailyGoal: number, targetLevel: string): Promise<TodayPlan> {
  const date = todayKey()
  const { completed, goal: storedGoal } = loadProgress(date)
  // P1 修: 用历史快照 goal, 但如果用户改过 dailyGoal, 用新的
  const effectiveGoal = storedGoal > 0 ? storedGoal : dailyGoal
  const allWords = await loadWords()
  const wordMap = new Map<string, Word>()
  for (const w of allWords) wordMap.set(w.id, w)

  // 候选词去重
  const seenIds = new Set<string>()
  const candidates: { word: Word; source: 'review' | 'favorite' | 'new' }[] = []

  // 1) 复习 due 词 (最高优先)
  try {
    const due = await getDueReviews()
    for (const r of due) {
      if (seenIds.has(r.wordId)) continue
      const w = wordMap.get(r.wordId)
      if (w && (targetLevel === 'all' || w.level === targetLevel)) {
        candidates.push({ word: w, source: 'review' })
        seenIds.add(r.wordId)
      }
    }
  } catch {}

  // 2) 已收藏但还未掌握
  try {
    const favs = await getAllFavorites()
    const allReviews = await getAllReviews()
    const reviewSet = new Set(allReviews.map(r => r.wordId))
    for (const f of favs) {
      if (seenIds.has(f.wordId)) continue
      if (reviewSet.has(f.wordId)) continue  // 已加入 review
      const w = wordMap.get(f.wordId)
      if (w && (targetLevel === 'all' || w.level === targetLevel)) {
        candidates.push({ word: w, source: 'favorite' })
        seenIds.add(f.wordId)
      }
    }
  } catch {}

  // 3) targetLevel 新词 (按字母顺序取前 N)
  const newWords = allWords
    .filter(w => !seenIds.has(w.id))
    .filter(w => targetLevel === 'all' || w.level === targetLevel)
    .sort((a, b) => a.word.localeCompare(b.word))
  for (const w of newWords) {
    if (candidates.length >= dailyGoal * 2) break  // 多取一些, 完成也能有备选
    candidates.push({ word: w, source: 'new' })
    seenIds.add(w.id)
  }

  // 截到 dailyGoal
  const words = candidates.slice(0, dailyGoal).map(c => c.word)
  const completedCount = words.filter(w => completed.has(w.id)).length

  return {
    date,
    total: words.length,
    completed: completedCount,
    words,
    bySource: {
      review: candidates.slice(0, dailyGoal).filter(c => c.source === 'review').length,
      favorite: candidates.slice(0, dailyGoal).filter(c => c.source === 'favorite').length,
      new: candidates.slice(0, dailyGoal).filter(c => c.source === 'new').length,
    },
    isDone: completedCount >= words.length && words.length > 0,
    progressPct: words.length > 0 ? Math.round((completedCount / words.length) * 100) : 0,
  }
}

// P2 修: 清理 30 天前的 plan-progress key,避免 localStorage 无限增长
export function cleanupOldProgress(): number {
  let removed = 0
  try {
    const now = Date.now()
    const cutoff = 30 * 24 * 60 * 60 * 1000  // 30 天
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(STORAGE_KEY)) {
        const dateStr = k.slice(STORAGE_KEY.length)
        const t = Date.parse(dateStr)
        if (!isNaN(t) && now - t > cutoff) {
          localStorage.removeItem(k)
          removed++
          i--  // 调整索引
        }
      }
    }
  } catch (e) {
    console.warn('plan.ts: cleanupOldProgress 失败:', e)
  }
  return removed
}

// 简单 hook: 监听 localStorage 变化时重新加载
export function subscribeToPlan(callback: () => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key && e.key.startsWith(STORAGE_KEY)) callback()
  }
  window.addEventListener('storage', handler)
  // 同一窗口用 storage 事件不会触发, 需 polling
  // 这里简化: 不做轮询, 每次 markWordCompleted 后手动 reload
  return () => window.removeEventListener('storage', handler)
}
