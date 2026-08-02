// errorReviewSession.test.ts - v1.94 W88-C 错题复习 session 持久化测试
import { describe, it, expect, beforeEach } from 'vitest'
import { saveSession, loadSession, clearSession } from '../src/lib/errorReviewSession'
import type { ReviewSession } from '../src/lib/errorReview'

const mockSession: ReviewSession = {
  total: 3,
  remaining: [
    { id: 'a', source: 'write', prompt: 'p1', answer: 'a1', ts: 1 },
    { id: 'b', source: 'write', prompt: 'p2', answer: 'a2', ts: 2 },
  ],
  correct: 1,
  wrong: 0,
  history: [{ cardId: 'a', score: 100, grade: 'perfect' }],
}

describe('W88-C 错题复习 session 持久化', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saveSession 写入 localStorage', () => {
    saveSession(mockSession)
    const raw = localStorage.getItem('errorReviewSession')
    expect(raw).not.toBe(null)
    const data = JSON.parse(raw!)
    expect(data.session.total).toBe(3)
    expect(data.ts).toBeGreaterThan(0)
  })

  it('loadSession 还原 session', () => {
    saveSession(mockSession)
    const loaded = loadSession()
    expect(loaded).not.toBe(null)
    expect(loaded!.session.total).toBe(3)
    expect(loaded!.session.remaining.length).toBe(2)
    expect(loaded!.session.history[0].cardId).toBe('a')
  })

  it('空 localStorage 返 null', () => {
    expect(loadSession()).toBe(null)
  })

  it('clearSession 删除', () => {
    saveSession(mockSession)
    clearSession()
    expect(loadSession()).toBe(null)
  })

  it('7 天过期清掉', () => {
    saveSession(mockSession)
    // 模拟 8 天前
    const raw = localStorage.getItem('errorReviewSession')!
    const data = JSON.parse(raw)
    data.ts = Date.now() - 8 * 24 * 60 * 60 * 1000
    localStorage.setItem('errorReviewSession', JSON.stringify(data))
    expect(loadSession()).toBe(null)
  })

  it('损坏 JSON 返 null 不抛', () => {
    localStorage.setItem('errorReviewSession', 'not-json{')
    expect(loadSession()).toBe(null)
  })
})
