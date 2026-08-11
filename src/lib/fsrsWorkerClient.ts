// src/lib/fsrsWorkerClient.ts - W135 FSRS Worker 客户端
// 封装 Web Worker 调用, 提供与 fsrs.ts 一致的同步 API
// 业务: 复习大量卡片时 (跟读/课程/Plan 评估) 不阻塞主线程
import type { ReviewItem } from '../types'
import {
  Rating,
  initFSRS as initFSRSWorker,
  reviewFSRS as reviewFSRSWorker,
  getRetrievability as getRetrievabilityWorker,
  getIntervalDays as getIntervalDaysWorker,
  fromSM2 as fromSM2Worker,
  toSM2 as toSM2Worker,
  type FSRSCard,
  type FsrsWorkerRequest,
  type FsrsWorkerResponse,
} from '../workers/fsrs.worker'

// === Lazy Worker 单例 (按需创建, 避免首屏加载) ===
let workerInstance: Worker | null = null
let nextReqId = 1
const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>()

/** 检测 Worker 可用性 (测试环境如 happy-dom 无 Worker) */
function isWorkerAvailable(): boolean {
  return typeof Worker !== 'undefined' && typeof window !== 'undefined'
}

function ensureWorker(): Worker {
  if (workerInstance) return workerInstance
  if (!isWorkerAvailable()) {
    throw new Error('Worker not available in this environment')
  }
  // Vite ?worker 语法: 自动产出独立 chunk (懒加载)
  workerInstance = new Worker(
    new URL('../workers/fsrs.worker.ts', import.meta.url),
    { type: 'module' },
  )
  workerInstance.onmessage = (e: MessageEvent<FsrsWorkerResponse>) => {
    const res = e.data
    const handler = pending.get(res.id)
    if (!handler) return
    pending.delete(res.id)
    if (res.ok) handler.resolve(res.result)
    else handler.reject(new Error(res.error))
  }
  workerInstance.onerror = (e) => {
    // 全部 pending 失败 + W136 P1-2 修复: 清 worker instance, 下次 ensureWorker 重建
    // 业务: worker crash 后 (Module 加载失败 / 致命语法错误), 不清会一直返回同一个死的 worker
    for (const [id, h] of pending) {
      h.reject(new Error(`Worker error: ${e.message}`))
      pending.delete(id)
    }
    if (workerInstance) {
      workerInstance.terminate()
      workerInstance = null
    }
  }
  return workerInstance
}

function call<T>(type: FsrsWorkerRequest['type'], payload: any): Promise<T> {
  const w = ensureWorker()
  const id = nextReqId++
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    const req = { id, type, ...payload } as FsrsWorkerRequest
    w.postMessage(req)
  })
}

// === 对外 API (Promise-based) — Worker 不可用时主线程 fallback ===
export async function initFSRSAsync(now?: number): Promise<FSRSCard> {
  if (!isWorkerAvailable()) return initFSRSWorker(now)
  return call<FSRSCard>('init', { now })
}

export async function reviewFSRSAsync(card: FSRSCard, rating: Rating, now?: number): Promise<FSRSCard> {
  if (!isWorkerAvailable()) return reviewFSRSWorker(card, rating, now)
  return call<FSRSCard>('review', { card, rating, now })
}

export async function getRetrievabilityAsync(card: FSRSCard, now?: number): Promise<number> {
  if (!isWorkerAvailable()) return getRetrievabilityWorker(card, now)
  return call<number>('retrievability', { card, now })
}

export async function getIntervalDaysAsync(card: FSRSCard): Promise<number> {
  if (!isWorkerAvailable()) return getIntervalDaysWorker(card)
  return call<number>('intervalDays', { card })
}

export async function fromSM2Async(item: ReviewItem, now?: number): Promise<FSRSCard> {
  if (!isWorkerAvailable()) return fromSM2Worker(item, now)
  return call<FSRSCard>('fromSM2', { item, now })
}

export async function toSM2Async(card: FSRSCard): Promise<ReviewItem> {
  if (!isWorkerAvailable()) return toSM2Worker(card)
  return call<ReviewItem>('toSM2', { card })
}

export async function batchReviewFSRSAsync(cards: FSRSCard[], ratings: Rating[], now?: number): Promise<FSRSCard[]> {
  if (!isWorkerAvailable()) {
    return cards.map((c, i) => reviewFSRSWorker(c, ratings[i], now))
  }
  return call<FSRSCard[]>('batchReview', { cards, ratings, now })
}

// === 同步 fallback (Worker 创建失败时回退主线程, 不阻塞业务) ===
// 业务: 浏览器不支持 Worker 时 (极旧环境) 仍可用
// 性能: 与 fsrs.ts 完全一致, 仅作为 fallback
import * as fallback from './fsrs'

export const fsrsSync = {
  init: fallback.initFSRS,
  review: fallback.reviewFSRS,
  retrievability: fallback.getRetrievability,
  intervalDays: fallback.getIntervalDays,
  fromSM2: fallback.fromSM2,
  toSM2: fallback.toSM2,
}

export { Rating }
export type { FSRSCard, FsrsWorkerRequest, FsrsWorkerResponse }

// === 测试 / 调试工具 ===
export function _resetFsrsWorkerForTest() {
  if (workerInstance) {
    workerInstance.terminate()
    workerInstance = null
  }
  pending.clear()
  nextReqId = 1
}

/** W136: 返回最后创建的 Worker 实例 (测试用 — 验证 Worker 路径被走) */
export function _lastFsrsWorkerInstanceForTest(): Worker | null {
  return workerInstance
}
