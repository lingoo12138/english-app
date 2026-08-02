// src/lib/errorReviewSession.ts - v1.94 W88-C 错题复习 session 持久化
import type { ReviewSession, ReviewCard } from './errorReview'

const KEY = 'errorReviewSession'
const CARD_KEYS_KEY = 'errorReviewCardIds'  // 保存卡 id 列表, 验证与 IDB 一致

interface PersistedSession {
  session: ReviewSession
  cardIds: string[]   // 收藏的卡 id (从 IDB 加载时验证)
  ts: number
}

export function saveSession(session: ReviewSession): void {
  try {
    const data: PersistedSession = {
      session,
      cardIds: [],  // 不存 cardIds, 用 session.remaining.id 即可
      ts: Date.now(),
    }
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('[errorReviewSession] save failed:', e)
  }
}

export function loadSession(): { session: ReviewSession; ts: number } | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data: PersistedSession = JSON.parse(raw)
    // 7 天过期清掉
    if (Date.now() - data.ts > 7 * 24 * 60 * 60 * 1000) {
      clearSession()
      return null
    }
    return { session: data.session, ts: data.ts }
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
