// src/lib/errorReviewSession.ts - v1.94 W88-C 错题复习 session 持久化 (修 v1: 删死代码 + cardIds 校验)
import type { ReviewSession, ReviewCard } from './errorReview'

const KEY = 'errorReviewSession'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000  // 7 天过期

interface PersistedSession {
  session: ReviewSession
  cardIds: string[]  // 收藏的卡 id, 错题被删时验证
  ts: number
}

/** 提取 session 当前的卡 id 列表 (剩余 + 历史) */
function extractCardIds(session: ReviewSession): string[] {
  const all = new Set<string>()
  for (const c of session.remaining) all.add(c.id)
  for (const h of session.history) all.add(h.cardId)
  return Array.from(all)
}

export function saveSession(session: ReviewSession): void {
  try {
    const data: PersistedSession = {
      session,
      cardIds: extractCardIds(session),
      ts: Date.now(),
    }
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('[errorReviewSession] save failed:', e)
  }
}

export function loadSession(): { session: ReviewSession; cardIds: string[]; ts: number } | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data: PersistedSession = JSON.parse(raw)
    if (Date.now() - data.ts > SESSION_TTL_MS) {
      clearSession()
      return null
    }
    return { session: data.session, cardIds: data.cardIds, ts: data.ts }
  } catch (e) {
    console.warn('[errorReviewSession] load failed:', e)
    return null
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY)
  } catch (e) {
    // ignore
  }
}
