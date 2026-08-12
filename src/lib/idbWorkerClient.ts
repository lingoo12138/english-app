// src/lib/idbWorkerClient.ts - W142 IDB 写 Worker 客户端
// 主线程 API: writePut / writeAdd / writeBulkPut / writeBulkAdd / writeDelete / writeUpdate
// 单 Worker 实例, 队列保证顺序, Worker 不可用时 fallback 主线程 (与 fsrsWorkerClient 一致模式)
//
// 业务背景: 62 个 IDB 写入调用当前都在主线程, 高频点 (收藏/跟读/学习记录) 阻塞 UI
// W142 目标: 把高频写点 (本次 1 个: addFavorite) 移到 Worker, 主线程不阻塞
// W143 后续: 把剩余 60+ 写点按相同模式迁移
//
// 设计要点 (跟 verifier W136 P1-2 学到的):
// - Lazy Worker 单例: 第一次写才创建, 避免首屏加载
// - 顺序处理: 1 个 Worker 1 个 in-flight req, queue 保证顺序, 避免 IDB 锁竞争
// - Worker 错误: terminate + 清引用 + 后续 fallback, 避免一直用死的 worker
// - 测试环境友好: happy-dom 无 Worker, 走 fallback, 业务逻辑与 worker 路径一致

import { db } from './db'
import type { IdbWriteRequest, IdbWriteResponse } from '../workers/idb.worker'

// === 状态 ===
let workerInstance: Worker | null = null
let workerFailed = false  // Worker 初始化/运行失败旗标, 之后所有 write 走 fallback
const queue: Array<{
  req: IdbWriteRequest
  resolve: (v: { result: any; duration: number }) => void
  reject: (e: Error) => void
}> = []
let processing = false

/** Worker 是否可用 (test 环境 happy-dom 无 Worker) */
function isWorkerAvailable(): boolean {
  return typeof Worker !== 'undefined' && typeof window !== 'undefined'
}

/** 创建 Worker 单例 (Vite ?worker 等价, 用 new URL + module 模式, 与 fsrs.worker 一致) */
function ensureWorker(): Worker | null {
  if (workerInstance) return workerInstance
  if (workerFailed) return null
  if (!isWorkerAvailable()) {
    workerFailed = true
    return null
  }
  try {
    workerInstance = new Worker(
      new URL('../workers/idb.worker.ts', import.meta.url),
      { type: 'module' },
    )
    workerInstance.onmessage = (e: MessageEvent<IdbWriteResponse>) => {
      const { ok, result, error, duration } = e.data ?? ({} as IdbWriteResponse)
      const head = queue.shift()
      processing = false
      if (!head) return
      if (ok) head.resolve({ result, duration })
      else head.reject(new Error(error ?? 'IDB worker error'))
      // 继续队列
      processNext()
    }
    workerInstance.onerror = (e) => {
      // W142: worker 挂了 (Module 加载失败 / 致命语法错误)
      // 1) 清空 queue, 全部 reject (业务可选择 retry 走 fallback)
      // 2) terminate + 清引用, 之后 createNew worker 重试
      // 3) 这里采用"全部 fallback"模式: 把 pending queue 标失败, 后续 write 走主线程
      console.warn('[idbWorkerClient] Worker 错误, 之后走主线程 fallback:', e.message)
      while (queue.length) {
        const head = queue.shift()!
        head.reject(new Error(`Worker error: ${e.message}`))
      }
      processing = false
      if (workerInstance) {
        try { workerInstance.terminate() } catch { /* ignore */ }
        workerInstance = null
      }
      workerFailed = true
    }
    return workerInstance
  } catch (err) {
    console.warn('[idbWorkerClient] 创建 Worker 失败, 走主线程 fallback:', err)
    workerFailed = true
    workerInstance = null
    return null
  }
}

/** 取出队首, 派发给 Worker (单 in-flight 模式) */
function processNext(): void {
  if (processing) return
  if (queue.length === 0) return
  const w = ensureWorker()
  if (!w) {
    // fallback: 主线程同步处理 (注意保留顺序, 一个一个处理)
    processing = true
    const head = queue.shift()!
    fallbackWrite(head.req).then(head.resolve, head.reject).finally(() => {
      processing = false
      processNext()
    })
    return
  }
  processing = true
  w.postMessage(queue[0].req)
}

/** 主线程 fallback: 直接调 Dexie */
async function fallbackWrite(req: IdbWriteRequest): Promise<{ result: any; duration: number }> {
  const start = performance.now()
  const table = (db as any)[req.store]
  if (!table) throw new Error(`Store ${req.store} not found in db`)
  let result: any
  switch (req.type) {
    case 'put': result = await table.put(req.data); break
    case 'add': result = await table.add(req.data); break
    case 'bulkPut':
      if (!Array.isArray(req.data)) throw new Error('bulkPut requires data to be an array')
      result = await table.bulkPut(req.data)
      break
    case 'bulkAdd':
      if (!Array.isArray(req.data)) throw new Error('bulkAdd requires data to be an array')
      result = await table.bulkAdd(req.data)
      break
    case 'delete':
      if (req.id === undefined) throw new Error('delete requires id')
      result = await table.delete(req.id)
      break
    case 'update':
      if (req.id === undefined) throw new Error('update requires id')
      result = await table.update(req.id, req.data)
      break
    default:
      throw new Error(`Unknown type: ${(req as any).type}`)
  }
  return { result, duration: performance.now() - start }
}

/** 入口: 提交一个写请求, 走 Worker 或 fallback */
function write(req: IdbWriteRequest): Promise<{ result: any; duration: number }> {
  // fast path: 已知 Worker 失败, 直接 fallback
  if (workerFailed) return fallbackWrite(req)
  // worker 路径: push 到 queue, 触发 processNext
  return new Promise<{ result: any; duration: number }>((resolve, reject) => {
    queue.push({ req, resolve, reject })
    processNext()
  })
}

// === 对外 API ===
export function writePut(store: string, data: any): Promise<{ result: any; duration: number }> {
  return write({ type: 'put', store, data })
}

export function writeAdd(store: string, data: any): Promise<{ result: any; duration: number }> {
  return write({ type: 'add', store, data })
}

export function writeBulkPut(store: string, data: any[]): Promise<{ result: any; duration: number }> {
  return write({ type: 'bulkPut', store, data })
}

export function writeBulkAdd(store: string, data: any[]): Promise<{ result: any; duration: number }> {
  return write({ type: 'bulkAdd', store, data })
}

export function writeDelete(store: string, id: string | number): Promise<{ result: any; duration: number }> {
  return write({ type: 'delete', store, data: undefined, id })
}

export function writeUpdate(
  store: string,
  id: string | number,
  data: any,
): Promise<{ result: any; duration: number }> {
  return write({ type: 'update', store, data, id })
}

// === 测试 / 调试工具 ===
export function _resetIdbWorkerForTest(): void {
  if (workerInstance) {
    try { workerInstance.terminate() } catch { /* ignore */ }
    workerInstance = null
  }
  workerFailed = false
  // 清空 queue, 所有 pending reject
  while (queue.length) {
    const head = queue.shift()!
    head.reject(new Error('reset for test'))
  }
  processing = false
}

/** 当前 queue 长度 (测试用) */
export function _idbQueueLengthForTest(): number {
  return queue.length
}

/** 当前是否在 fallback 模式 (测试用 — true 表示 Worker 不可用或失败) */
export function _isIdbFallbackForTest(): boolean {
  return workerFailed || workerInstance === null
}

/** 返回最后创建的 Worker 实例 (测试用 — 验证 Worker 路径被走) */
export function _lastIdbWorkerInstanceForTest(): Worker | null {
  return workerInstance
}

export type { IdbWriteRequest, IdbWriteResponse }
