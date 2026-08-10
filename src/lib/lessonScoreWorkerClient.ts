// src/lib/lessonScoreWorkerClient.ts - W135 课文评分 Worker 客户端
// 拉 IDB 数据 → 发给 Worker 计算 → 不阻塞主线程
import { LESSONS } from '../data/textbook'
import { LESSONS_P2 } from '../data/textbook-p2'
import { LESSONS_P3 } from '../data/textbook-p3'
import { getAllWritingErrors, getAllDictationErrors, getAllErrorReviewScores } from './db'
import type { Lesson } from '../data/textbook'
import {
  LESSON_SCORE_THRESHOLDS as LESSON_SCORE_THRESHOLDS_W,
  CROSS_LESSON_MIN as CROSS_LESSON_MIN_W,
  findCrossLessonWords as findCrossLessonWordsW,
  computeLessonScore as computeLessonScoreW,
  type LessonScore,
  type LessonScoreWorkerRequest,
  type LessonScoreWorkerResponse,
} from '../workers/lessonScore.worker'

const ALL_LESSONS: Lesson[] = [...LESSONS, ...LESSONS_P2, ...LESSONS_P3]

let workerInstance: Worker | null = null
let nextReqId = 1
const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>()

/** 检测 Worker 是否可用 (测试环境如 happy-dom 没有 Worker) */
function isWorkerAvailable(): boolean {
  return typeof Worker !== 'undefined' && typeof window !== 'undefined'
}

function ensureWorker(): Worker {
  if (workerInstance) return workerInstance
  if (!isWorkerAvailable()) {
    throw new Error('Worker not available in this environment')
  }
  workerInstance = new Worker(
    new URL('../workers/lessonScore.worker.ts', import.meta.url),
    { type: 'module' },
  )
  workerInstance.onmessage = (e: MessageEvent<LessonScoreWorkerResponse>) => {
    const res = e.data
    const handler = pending.get(res.id)
    if (!handler) return
    pending.delete(res.id)
    if (res.ok) handler.resolve(res.result)
    else handler.reject(new Error(res.error))
  }
  workerInstance.onerror = (e) => {
    for (const [id, h] of pending) {
      h.reject(new Error(`Worker error: ${e.message}`))
      pending.delete(id)
    }
  }
  return workerInstance
}

function call<T>(type: LessonScoreWorkerRequest['type'], payload: any): Promise<T> {
  const w = ensureWorker()
  const id = nextReqId++
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    const req = { id, type, ...payload } as LessonScoreWorkerRequest
    w.postMessage(req)
  })
}

/** 异步拉 IDB 不掌握词, 降为 array 传给 worker */
async function fetchNotMasteredWords(): Promise<string[]> {
  const [writing, dictation, reviews] = await Promise.all([
    getAllWritingErrors(),
    getAllDictationErrors(),
    getAllErrorReviewScores(),
  ])
  const set = new Set<string>()
  for (const e of writing) {
    if (e.errors) {
      for (const err of e.errors) {
        if (err.suggestion) set.add(err.suggestion.toLowerCase())
      }
    }
  }
  for (const e of dictation) {
    if (e.wordId) set.add(e.wordId.toLowerCase())
  }
  for (const r of reviews) {
    if (r.score >= 60) continue
    if (r.cardId.startsWith('w-')) {
      const wid = parseInt(r.cardId.slice(2), 10)
      if (!isNaN(wid)) {
        const we = writing.find(w => w.id === wid)
        if (we?.errors) {
          for (const err of we.errors) {
            if (err.suggestion) set.add(err.suggestion.toLowerCase())
          }
        }
      }
    } else if (r.cardId.startsWith('d-')) {
      const did = parseInt(r.cardId.slice(2), 10)
      if (!isNaN(did)) {
        const de = dictation.find(d => d.id === did)
        if (de?.wordId) set.add(de.wordId.toLowerCase())
      }
    }
  }
  return Array.from(set)
}

/** 计算所有课文评分 — Worker 版, 异步 (无 Worker 时主线程回退) */
export async function computeLessonScoresAsync(): Promise<LessonScore[]> {
  if (!isWorkerAvailable()) {
    // 主线程回退: 同步计算, 测试环境 / 不支持 Worker 的浏览器
    const notMasteredList = await fetchNotMasteredWords()
    const notMastered = new Set(notMasteredList)
    const cross = findCrossLessonWordsW(ALL_LESSONS)
    const crossSet = new Set(cross)
    return ALL_LESSONS.map(l => computeLessonScoreW(l, notMastered, crossSet))
  }
  const notMastered = await fetchNotMasteredWords()
  return call<LessonScore[]>('computeAll', { lessons: ALL_LESSONS, notMastered })
}

/** 跨课复用词 — Worker 版, 异步 (无 Worker 时主线程回退) */
export async function findCrossLessonWordsAsync(minCount = 2): Promise<string[]> {
  if (!isWorkerAvailable()) {
    return findCrossLessonWordsW(ALL_LESSONS, minCount)
  }
  return call<string[]>('crossLesson', { lessons: ALL_LESSONS, minCount })
}

/** 单课评分 — Worker 版, 异步 (无 Worker 时主线程回退) */
export async function computeSingleLessonScoreAsync(
  lesson: Lesson,
  notMastered: string[],
  crossLesson: string[],
): Promise<LessonScore> {
  if (!isWorkerAvailable()) {
    return computeLessonScoreW(lesson, new Set(notMastered), new Set(crossLesson))
  }
  return call<LessonScore>('computeOne', { lesson, notMastered, crossLesson })
}

// === 同步 fallback (Worker 失败时回退主线程) ===
// 从 worker 模块重导出常量和纯函数 (主线程也可直接用)
export const LESSON_SCORE_THRESHOLDS = LESSON_SCORE_THRESHOLDS_W
export const CROSS_LESSON_MIN = CROSS_LESSON_MIN_W
export const findCrossLessonWords = findCrossLessonWordsW
export const computeLessonScore = computeLessonScoreW

/** 跨课复用词总数 (同步, 用 worker 纯函数跑一次) */
export function getCrossLessonTotal(): number {
  return findCrossLessonWordsW(ALL_LESSONS).length
}

export type { LessonScore, LessonScoreWorkerRequest, LessonScoreWorkerResponse }

export function _resetLessonScoreWorkerForTest() {
  if (workerInstance) {
    workerInstance.terminate()
    workerInstance = null
  }
  pending.clear()
}
