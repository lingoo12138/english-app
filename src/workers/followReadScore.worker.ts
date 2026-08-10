// src/workers/followReadScore.worker.ts - W135 跟读评分 聚合 Worker
// 1500 条入, 实时聚合 (avg/best/byLesson), 移到 Worker 不阻塞主线程

export interface FollowReadScore {
  id: string
  lessonId: string
  sentenceIndex: number
  score: number
  ts: number
}

export interface ScoreAggregates {
  avg: number
  best: number
  count: number
  recent: FollowReadScore[]
  byLesson: { lessonId: string; count: number; avg: number; best: number }[]
}

export type FollowReadWorkerRequest =
  | { id: number; type: 'aggregate'; scores: FollowReadScore[] }
  | { id: number; type: 'byLesson'; scores: FollowReadScore[]; lessonId: string }
  | { id: number; type: 'recent'; scores: FollowReadScore[]; limit?: number }

export type FollowReadWorkerResponse =
  | { id: number; ok: true; type: string; result: any }
  | { id: number; ok: false; error: string }

export function aggregateScores(scores: FollowReadScore[]): ScoreAggregates {
  if (scores.length === 0) {
    return { avg: 0, best: 0, count: 0, recent: [], byLesson: [] }
  }
  let total = 0
  let best = -Infinity
  for (const s of scores) {
    total += s.score
    if (s.score > best) best = s.score
  }
  const avg = Math.round(total / scores.length)

  const lessonMap = new Map<string, FollowReadScore[]>()
  for (const s of scores) {
    let list = lessonMap.get(s.lessonId)
    if (!list) {
      list = []
      lessonMap.set(s.lessonId, list)
    }
    list.push(s)
  }
  const byLesson: ScoreAggregates['byLesson'] = []
  for (const [lid, list] of lessonMap) {
    let lsTotal = 0
    let lsBest = -Infinity
    for (const x of list) {
      lsTotal += x.score
      if (x.score > lsBest) lsBest = x.score
    }
    byLesson.push({
      lessonId: lid,
      count: list.length,
      avg: Math.round(lsTotal / list.length),
      best: lsBest,
    })
  }
  byLesson.sort((a, b) => b.count - a.count)

  // recent: 按时戳降序, 取前 20
  const sorted = [...scores].sort((a, b) => b.ts - a.ts)
  return { avg, best, count: scores.length, recent: sorted.slice(0, 20), byLesson }
}

self.onmessage = (e: MessageEvent<FollowReadWorkerRequest>) => {
  const req = e.data
  try {
    let result: any
    switch (req.type) {
      case 'aggregate':
        result = aggregateScores(req.scores)
        break
      case 'byLesson': {
        const sub = req.scores.filter(s => s.lessonId === req.lessonId)
        result = aggregateScores(sub)
        break
      }
      case 'recent': {
        const sorted = [...req.scores].sort((a, b) => b.ts - a.ts)
        result = sorted.slice(0, req.limit ?? 20)
        break
      }
      default:
        throw new Error(`unknown request type: ${(req as any).type}`)
    }
    const res: FollowReadWorkerResponse = { id: req.id, ok: true, type: req.type, result }
    ;(self as any).postMessage(res)
  } catch (err) {
    const res: FollowReadWorkerResponse = {
      id: req.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
    ;(self as any).postMessage(res)
  }
}
