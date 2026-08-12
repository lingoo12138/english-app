// src/workers/idb.worker.ts - W142 IDB 写 Web Worker
// 接收主线程批量写请求, 在 Worker 内串行调 IDB (put / add / bulkPut / bulkAdd / delete / update)
// 业务: 把 62 个 IDB 写入调用中 1+ 个高频写点 (收藏/跟读/学习记录) 移到 Worker, 主线程不阻塞
// 模式: 跟 fsrs.worker.ts / followReadScore.worker.ts / lessonScore.worker.ts 一致
//   - 自包含, 不依赖外部 store 配置 (Dexie 实例从 '../lib/db' 导入)
//   - 测试环境 (happy-dom) 不创建 Worker, 走 idbWorkerClient 的 main-thread fallback

import { db } from '../lib/db'

// === Worker message protocol ===
// W142: 1 个 req 1 个 res, 顺序处理 (避免 IDB 锁竞争)
export type IdbOpType = 'put' | 'add' | 'bulkPut' | 'bulkAdd' | 'delete' | 'update'

export interface IdbWriteRequest {
  type: IdbOpType
  /** 目标 store 名: favorites / records / reviews / chats / writingErrors / ... */
  store: string
  /** put/add/update 的单条数据; bulkPut/bulkAdd 的数组 */
  data: any
  /** delete/update 的主键 (string | number 取决于 store schema) */
  id?: string | number
}

export interface IdbWriteResponse {
  ok: boolean
  result?: any
  error?: string
  /** 执行耗时 (ms), 主线程可观察 Worker 内 IDB 操作的真实延迟 */
  duration: number
}

self.onmessage = async (e: MessageEvent<IdbWriteRequest>) => {
  const start = performance.now()
  const req = e.data
  try {
    if (!req || !req.type || !req.store) {
      throw new Error('Invalid request: type and store required')
    }
    const table = (db as any)[req.store]
    if (!table) {
      throw new Error(`Store ${req.store} not found in db`)
    }
    let result: any
    switch (req.type) {
      case 'put':
        result = await table.put(req.data)
        break
      case 'add':
        result = await table.add(req.data)
        break
      case 'bulkPut':
        if (!Array.isArray(req.data)) {
          throw new Error('bulkPut requires data to be an array')
        }
        result = await table.bulkPut(req.data)
        break
      case 'bulkAdd':
        if (!Array.isArray(req.data)) {
          throw new Error('bulkAdd requires data to be an array')
        }
        result = await table.bulkAdd(req.data)
        break
      case 'delete':
        if (req.id === undefined) {
          throw new Error('delete requires id')
        }
        result = await table.delete(req.id)
        break
      case 'update':
        if (req.id === undefined) {
          throw new Error('update requires id')
        }
        result = await table.update(req.id, req.data)
        break
      default:
        throw new Error(`Unknown type: ${(req as any).type}`)
    }
    const res: IdbWriteResponse = {
      ok: true,
      result,
      duration: performance.now() - start,
    }
    ;(self as any).postMessage(res)
  } catch (err: any) {
    const res: IdbWriteResponse = {
      ok: false,
      error: err?.message ?? String(err),
      duration: performance.now() - start,
    }
    ;(self as any).postMessage(res)
  }
}
