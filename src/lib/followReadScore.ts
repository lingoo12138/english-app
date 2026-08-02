// src/lib/followReadScore.ts - v1.94 W88-A 跟读评分趋势图 (修 v1: 上限/真纯函数)
export interface FollowReadScore {
  id: string
  lessonId: string
  sentenceIndex: number
  score: number
  ts: number
}

const KEY = 'followReadScores'
const MAX_SCORES = 1000  // 跟读记录上限 (防 quota)

/** 保存一条 (超上限时 FIFO 删最早) */
export function saveFollowReadScore(s: Omit<FollowReadScore, 'id'>): FollowReadScore {
  const id = `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const full: FollowReadScore = { id, ...s }
  const list = loadAll()
  list.push(full)
  // FIFO 截断
  const trimmed = list.length > MAX_SCORES ? list.slice(-MAX_SCORES) : list
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed))
  } catch (e) {
    console.warn('[followReadScore] save failed (quota?):', e)
  }
  return full
}

export function loadAll(): FollowReadScore[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch (e) {
    console.warn('[followReadScore] loadAll failed:', e)
    return []
  }
}

/** 按 lessonId 过滤 (返新到旧) */
export function getFollowReadScores(lessonId?: string): FollowReadScore[] {
  const all = loadAll()
  const filtered = lessonId ? all.filter(s => s.lessonId === lessonId) : all
  return filtered.sort((a, b) => b.ts - a.ts)
}

export interface ScoreAggregates {
  avg: number
  best: number
  count: number
  recent: FollowReadScore[]
  byLesson: { lessonId: string; count: number; avg: number; best: number }[]
}

/** 聚合: 纯函数, 接受 scores (避免重读 localStorage) */
export function aggregateScores(scores: FollowReadScore[]): ScoreAggregates {
  if (scores.length === 0) {
    return { avg: 0, best: 0, count: 0, recent: [], byLesson: [] }
  }
  const total = scores.reduce((s, x) => s + x.score, 0)
  const avg = Math.round(total / scores.length)
  const best = Math.max(...scores.map(s => s.score))

  // 按 lessonId 分组
  const lessonMap = new Map<string, FollowReadScore[]>()
  for (const s of scores) {
    if (!lessonMap.has(s.lessonId)) lessonMap.set(s.lessonId, [])
    lessonMap.get(s.lessonId)!.push(s)
  }
  const byLesson = Array.from(lessonMap.entries()).map(([lid, list]) => {
    const lsTotal = list.reduce((s, x) => s + x.score, 0)
    return {
      lessonId: lid,
      count: list.length,
      avg: Math.round(lsTotal / list.length),
      best: Math.max(...list.map(s => s.score)),
    }
  }).sort((a, b) => b.count - a.count)

  return { avg, best, count: scores.length, recent: scores.slice(0, 20), byLesson }
}

/** 兼容旧 API (按 lessonId 聚合) */
export function getScoreAggregates(lessonId?: string): ScoreAggregates {
  return aggregateScores(getFollowReadScores(lessonId))
}

export function clearFollowReadScores(): void {
  try {
    localStorage.removeItem(KEY)
  } catch (e) {
    // ignore
  }
}
