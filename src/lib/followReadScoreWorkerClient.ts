// src/lib/followReadScoreWorkerClient.ts - W135 跟读评分 Worker 客户端
// 提供 score 聚合的异步 API, 把 1500 条入的 reduce 移到 Worker
import {
  aggregateScores as aggregateScoresWorker,
  type FollowReadScore,
  type ScoreAggregates,
  type FollowReadWorkerRequest,
  type FollowReadWorkerResponse,
} from '../workers/followReadScore.worker'

let workerInstance: Worker | null = null
let nextReqId = 1
const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>()

function isWorkerAvailable(): boolean {
  return typeof Worker !== 'undefined' && typeof window !== 'undefined'
}

function ensureWorker(): Worker {
  if (workerInstance) return workerInstance
  if (!isWorkerAvailable()) {
    throw new Error('Worker not available in this environment')
  }
  workerInstance = new Worker(
    new URL('../workers/followReadScore.worker.ts', import.meta.url),
    { type: 'module' },
  )
  workerInstance.onmessage = (e: MessageEvent<FollowReadWorkerResponse>) => {
    const res = e.data
    const handler = pending.get(res.id)
    if (!handler) return
    pending.delete(res.id)
    if (res.ok) handler.resolve(res.result)
    else handler.reject(new Error(res.error))
  }
  workerInstance.onerror = (e) => {
    // W136 P1-2 修复: 全部 pending 失败后, terminate worker 并清引用
    // 业务: worker crash 后 (Module 加载失败), 不清会一直返回死的 worker
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

function call<T>(type: FollowReadWorkerRequest['type'], payload: any): Promise<T> {
  const w = ensureWorker()
  const id = nextReqId++
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    const req = { id, type, ...payload } as FollowReadWorkerRequest
    w.postMessage(req)
  })
}

export async function aggregateScoresAsync(scores: FollowReadScore[]): Promise<ScoreAggregates> {
  if (!isWorkerAvailable()) return aggregateScoresWorker(scores)
  return call<ScoreAggregates>('aggregate', { scores })
}

export async function aggregateByLessonAsync(scores: FollowReadScore[], lessonId: string): Promise<ScoreAggregates> {
  if (!isWorkerAvailable()) {
    return aggregateScoresWorker(scores.filter(s => s.lessonId === lessonId))
  }
  return call<ScoreAggregates>('byLesson', { scores, lessonId })
}

export async function recentScoresAsync(scores: FollowReadScore[], limit = 20): Promise<FollowReadScore[]> {
  if (!isWorkerAvailable()) {
    return [...scores].sort((a, b) => b.ts - a.ts).slice(0, limit)
  }
  return call<FollowReadScore[]>('recent', { scores, limit })
}

// === 同步 fallback (在主线程运行, 与 lib/followReadScore.ts 行为一致) ===
export { aggregateScores, type FollowReadScore, type ScoreAggregates } from '../workers/followReadScore.worker'
export type { FollowReadWorkerRequest, FollowReadWorkerResponse }

export function _resetFollowReadWorkerForTest() {
  if (workerInstance) {
    workerInstance.terminate()
    workerInstance = null
  }
  pending.clear()
  nextReqId = 1
}

/** W136: 返回最后创建的 Worker 实例 (测试用) */
export function _lastFollowReadWorkerInstanceForTest(): Worker | null {
  return workerInstance
}
