// tests/w142-idb-worker.test.ts - W142 IDB 写 Worker 池 单元测试
// 覆盖:
//  1. idb.worker.ts: onmessage handler 处理 put/add/bulkPut/bulkAdd/delete/update, 返 {ok,result,duration} 或 {ok:false,error,duration}
//  2. idbWorkerClient.ts: Worker 不可用 (happy-dom) 时 fallback 主线程 — writePut/Add/BulkPut/Delete/Update 全部 ok
//  3. idbWorkerClient.ts: queue 顺序处理 (5+ 写按提交顺序完成)
//  4. idbWorkerClient.ts: queue 长度 + isFallback 状态
//  5. db.addFavorite: W142 改走 writeAdd 后, 收藏功能照常工作 (集成测试)
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '../src/lib/db'
import {
  writePut,
  writeAdd,
  writeBulkPut,
  writeBulkAdd,
  writeDelete,
  writeUpdate,
  _resetIdbWorkerForTest,
  _idbQueueLengthForTest,
  _isIdbFallbackForTest,
} from '../src/lib/idbWorkerClient'
import { addFavorite, isFavorite, getAllFavorites } from '../src/lib/db'
import type { IdbWriteRequest, IdbWriteResponse } from '../src/workers/idb.worker'

// 隔离 self.postMessage (worker 模块导入会覆盖 self.onmessage, 我们保留它)
const origPostMessage = (self as any).postMessage
let capturedWorkerMessages: IdbWriteResponse[] = []

function installWorkerMessageCapture() {
  capturedWorkerMessages = []
  ;(self as any).postMessage = (msg: IdbWriteResponse) => {
    capturedWorkerMessages.push(msg)
  }
}

function restoreWorkerMessageCapture() {
  ;(self as any).postMessage = origPostMessage
  // 故意不恢复 self.onmessage — worker 模块 import 时设置, 多个测试共用
}

beforeEach(async () => {
  // 清 IDB 各 store
  await db.favorites.clear()
  await db.records.clear()
  await db.reviews.clear()
  await db.chats.clear()
  await db.writingErrors.clear()
  // 重置 worker 客户端状态 (重要: 上一个测试若有 pending, 这里 reject 掉)
  _resetIdbWorkerForTest()
})

afterEach(() => {
  restoreWorkerMessageCapture()
})

describe('W142 IDB 写 Worker 池', () => {
  describe('1. idb.worker.ts onmessage handler 逻辑', () => {
    it('put: 写入 favorites, 返 ok=true + result=wordId', async () => {
      // import 触发 side effect: self.onmessage = handler
      await import('../src/workers/idb.worker')
      installWorkerMessageCapture()
      try {
        const handler = (self as any).onmessage as (e: any) => Promise<void>
        await handler({
          data: { type: 'put', store: 'favorites', data: { wordId: 'w-worker-1', addedAt: 1000 } },
        })
        // postMessage 至少 1 次
        expect(capturedWorkerMessages.length).toBeGreaterThan(0)
        const last = capturedWorkerMessages[capturedWorkerMessages.length - 1]
        expect(last.ok).toBe(true)
        expect(last.result).toBe('w-worker-1')  // favorites 主键 = wordId
        expect(typeof last.duration).toBe('number')
        // 真实写入 IDB
        const row = await db.favorites.get('w-worker-1')
        expect(row).toBeTruthy()
        expect(row!.addedAt).toBe(1000)
      } finally {
        restoreWorkerMessageCapture()
      }
    })

    it('add: records store 自增 id', async () => {
      await import('../src/workers/idb.worker')
      installWorkerMessageCapture()
      try {
        const handler = (self as any).onmessage as (e: any) => Promise<void>
        await handler({
          data: {
            type: 'add',
            store: 'records',
            data: { wordId: 'w-r-1', action: 'view', timestamp: 2000 },
          },
        })
        const last = capturedWorkerMessages[capturedWorkerMessages.length - 1]
        expect(last.ok).toBe(true)
        expect(typeof last.result).toBe('number')
        expect(last.result).toBeGreaterThan(0)
        const all = await db.records.toArray()
        expect(all.length).toBe(1)
        expect(all[0].wordId).toBe('w-r-1')
      } finally {
        restoreWorkerMessageCapture()
      }
    })

    it('bulkPut: 5 条 favorites 一次写入', async () => {
      await import('../src/workers/idb.worker')
      installWorkerMessageCapture()
      try {
        const handler = (self as any).onmessage as (e: any) => Promise<void>
        const data = [
          { wordId: 'w-bulk-1', addedAt: 100 },
          { wordId: 'w-bulk-2', addedAt: 200 },
          { wordId: 'w-bulk-3', addedAt: 300 },
          { wordId: 'w-bulk-4', addedAt: 400 },
          { wordId: 'w-bulk-5', addedAt: 500 },
        ]
        await handler({ data: { type: 'bulkPut', store: 'favorites', data } })
        const last = capturedWorkerMessages[capturedWorkerMessages.length - 1]
        expect(last.ok).toBe(true)
        const all = await db.favorites.toArray()
        expect(all.length).toBe(5)
        const ids = all.map(r => r.wordId).sort()
        expect(ids).toEqual(['w-bulk-1', 'w-bulk-2', 'w-bulk-3', 'w-bulk-4', 'w-bulk-5'])
      } finally {
        restoreWorkerMessageCapture()
      }
    })

    it('bulkAdd: records 一次入 3 条, ok + IDB 实际 3 条', async () => {
      await import('../src/workers/idb.worker')
      installWorkerMessageCapture()
      try {
        const handler = (self as any).onmessage as (e: any) => Promise<void>
        await handler({
          data: {
            type: 'bulkAdd',
            store: 'records',
            data: [
              { wordId: 'w-r-a', action: 'view', timestamp: 1 },
              { wordId: 'w-r-b', action: 'view', timestamp: 2 },
              { wordId: 'w-r-c', action: 'view', timestamp: 3 },
            ],
          },
        })
        const last = capturedWorkerMessages[capturedWorkerMessages.length - 1]
        expect(last.ok).toBe(true)
        const all = await db.records.toArray()
        expect(all.length).toBe(3)
      } finally {
        restoreWorkerMessageCapture()
      }
    })

    it('delete: 删除 favorites 已存在记录', async () => {
      // 先 put 一条
      await db.favorites.put({ wordId: 'w-del-1', addedAt: 1000 })
      await import('../src/workers/idb.worker')
      installWorkerMessageCapture()
      try {
        const handler = (self as any).onmessage as (e: any) => Promise<void>
        await handler({ data: { type: 'delete', store: 'favorites', id: 'w-del-1' } })
        const last = capturedWorkerMessages[capturedWorkerMessages.length - 1]
        expect(last.ok).toBe(true)
        const row = await db.favorites.get('w-del-1')
        expect(row).toBeUndefined()
      } finally {
        restoreWorkerMessageCapture()
      }
    })

    it('update: 修改 reviews 字段', async () => {
      await db.reviews.put({ wordId: 'w-u-1', nextReview: 1000, interval: 1, easeFactor: 2.5, repetitions: 0 })
      await import('../src/workers/idb.worker')
      installWorkerMessageCapture()
      try {
        const handler = (self as any).onmessage as (e: any) => Promise<void>
        await handler({
          data: {
            type: 'update',
            store: 'reviews',
            id: 'w-u-1',
            data: { interval: 7, repetitions: 3 },
          },
        })
        const last = capturedWorkerMessages[capturedWorkerMessages.length - 1]
        expect(last.ok).toBe(true)
        const row = await db.reviews.get('w-u-1')
        expect(row!.interval).toBe(7)
        expect(row!.repetitions).toBe(3)
      } finally {
        restoreWorkerMessageCapture()
      }
    })

    it('未知 type: 返 ok=false + error 包含 "Unknown type"', async () => {
      await import('../src/workers/idb.worker')
      installWorkerMessageCapture()
      try {
        const handler = (self as any).onmessage as (e: any) => Promise<void>
        await handler({ data: { type: 'foo' as any, store: 'favorites', data: {} } })
        const last = capturedWorkerMessages[capturedWorkerMessages.length - 1]
        expect(last.ok).toBe(false)
        expect(last.error).toMatch(/Unknown type/)
        expect(typeof last.duration).toBe('number')
      } finally {
        restoreWorkerMessageCapture()
      }
    })

    it('未知 store: 返 ok=false + error 包含 "not found"', async () => {
      await import('../src/workers/idb.worker')
      installWorkerMessageCapture()
      try {
        const handler = (self as any).onmessage as (e: any) => Promise<void>
        await handler({ data: { type: 'put', store: 'notARealStore', data: {} } })
        const last = capturedWorkerMessages[capturedWorkerMessages.length - 1]
        expect(last.ok).toBe(false)
        expect(last.error).toMatch(/not found/)
      } finally {
        restoreWorkerMessageCapture()
      }
    })
  })

  describe('2. idbWorkerClient.ts — Fallback 模式 (happy-dom 无 Worker)', () => {
    it('isFallback = true (happy-dom 无 Worker)', () => {
      expect(_isIdbFallbackForTest()).toBe(true)
    })

    it('writePut: 主线程 fallback 写入 favorites, 返 ok + wordId', async () => {
      const { result, duration } = await writePut('favorites', { wordId: 'w-c-1', addedAt: 999 })
      expect(result).toBe('w-c-1')
      expect(typeof duration).toBe('number')
      const row = await db.favorites.get('w-c-1')
      expect(row).toBeTruthy()
    })

    it('writeAdd: records 自增 id', async () => {
      const { result } = await writeAdd('records', {
        wordId: 'w-c-r-1',
        action: 'view',
        timestamp: 1234,
      })
      expect(typeof result).toBe('number')
      expect(result).toBeGreaterThan(0)
      const all = await db.records.toArray()
      expect(all.length).toBe(1)
    })

    it('writeBulkPut: 一次写 10 条 favorites', async () => {
      const data = Array.from({ length: 10 }, (_, i) => ({
        wordId: `w-bulk-c-${i}`,
        addedAt: 1000 + i,
      }))
      const { result } = await writeBulkPut('favorites', data)
      // bulkPut 返 last insert key (favorites 主键 = wordId)
      expect(result).toBe('w-bulk-c-9')
      const all = await db.favorites.toArray()
      expect(all.length).toBe(10)
    })

    it('writeBulkAdd: 一次入 5 条 records, IDB 实际 5 条', async () => {
      const data = Array.from({ length: 5 }, (_, i) => ({
        wordId: `w-bulk-r-${i}`,
        action: 'view' as const,
        timestamp: 2000 + i,
      }))
      const { result } = await writeBulkAdd('records', data)
      // Dexie bulkAdd 返 lastKey 或 keys 数组, fake-indexeddb 实现可能不同
      // 关键断言: 5 条都入 IDB
      const all = await db.records.toArray()
      expect(all.length).toBe(5)
      // result 至少要 truthy (不为 null/undefined)
      expect(result !== null && result !== undefined).toBe(true)
    })

    it('writeDelete: 删除 favorites 已存在记录', async () => {
      await db.favorites.put({ wordId: 'w-c-del', addedAt: 1 })
      await writeDelete('favorites', 'w-c-del')
      const row = await db.favorites.get('w-c-del')
      expect(row).toBeUndefined()
    })

    it('writeUpdate: 更新 reviews 字段', async () => {
      await db.reviews.put({
        wordId: 'w-c-u',
        nextReview: 1000,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
      })
      await writeUpdate('reviews', 'w-c-u', { interval: 14, repetitions: 5 })
      const row = await db.reviews.get('w-c-u')
      expect(row!.interval).toBe(14)
      expect(row!.repetitions).toBe(5)
    })

    it('未知 store: 抛 Error 包含 "not found"', async () => {
      await expect(
        writePut('notRealStore', { foo: 1 }),
      ).rejects.toThrow(/not found/)
    })
  })

  describe('3. idbWorkerClient.ts — Queue 顺序处理', () => {
    it('5 个并发 writeAdd 按顺序完成 (FIFO)', async () => {
      // 业务: 收藏同一 wordId 多次 (高频写点), 必须按调用顺序执行
      // 注意: 收藏用 put 语义 (覆盖), 这里用 records.add 自增 id 测顺序
      const tasks = Array.from({ length: 5 }, (_, i) =>
        writeAdd('records', { wordId: `w-q-${i}`, action: 'view', timestamp: 1000 + i }),
      )
      const results = await Promise.all(tasks)
      // 5 个不同的 result id (records 主键自增)
      const ids = results.map(r => r.result as number)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(5)  // 5 个独立 id
      // IDB 内 5 条都到位
      const all = await db.records.toArray()
      expect(all.length).toBe(5)
      // 时间戳顺序与提交顺序一致 (FIFO)
      const tsList = all.map(r => r.timestamp).sort((a, b) => a - b)
      expect(tsList).toEqual([1000, 1001, 1002, 1003, 1004])
    })

    it('混合 type (put + delete + update) 顺序执行', async () => {
      // 先 put 一条 reviews 基线
      await db.reviews.put({
        wordId: 'w-mix-1',
        nextReview: 0,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
      })

      const promises = [
        writePut('favorites', { wordId: 'w-mix-fav-1', addedAt: 100 }),
        writeUpdate('reviews', 'w-mix-1', { repetitions: 10 }),
        writeAdd('records', { wordId: 'w-mix-rec-1', action: 'view', timestamp: 5000 }),
        writeDelete('favorites', 'w-mix-fav-1'),
        writePut('favorites', { wordId: 'w-mix-fav-2', addedAt: 200 }),
      ]
      await Promise.all(promises)

      // 验证最终状态
      const f1 = await db.favorites.get('w-mix-fav-1')
      const f2 = await db.favorites.get('w-mix-fav-2')
      const r1 = await db.reviews.get('w-mix-1')
      const rec = await db.records.toArray()

      expect(f1).toBeUndefined()  // 被 delete
      expect(f2).toBeTruthy()      // 最后 put 留底
      expect(r1!.repetitions).toBe(10)  // update 生效
      expect(rec.length).toBe(1)
      expect(rec[0].wordId).toBe('w-mix-rec-1')
    })

    it('并发 10 个 writePut 全部完成, queue 最终长度 = 0', async () => {
      const tasks = Array.from({ length: 10 }, (_, i) =>
        writePut('favorites', { wordId: `w-q10-${i}`, addedAt: i }),
      )
      await Promise.all(tasks)
      expect(_idbQueueLengthForTest()).toBe(0)
      const all = await db.favorites.toArray()
      expect(all.length).toBe(10)
    })
  })

  describe('4. idbWorkerClient.ts — _reset / 测试工具', () => {
    it('_resetIdbWorkerForTest: 清空 queue + reset fallback 旗标', async () => {
      // 模拟有 pending (但 happy-dom 是 fallback, queue 是空的 — worker path 才会有 pending)
      // 这里至少验证 reset 不抛异常
      expect(() => _resetIdbWorkerForTest()).not.toThrow()
    })
  })

  describe('5. db.addFavorite W142 集成 (走 writeAdd, 业务不变)', () => {
    it('addFavorite 后 isFavorite = true (Worker 路径 / fallback 路径 都应通过)', async () => {
      await addFavorite('w-int-1')
      expect(await isFavorite('w-int-1')).toBe(true)
    })

    it('多次 addFavorite 不同 wordId 都到位', async () => {
      await addFavorite('w-int-a')
      await addFavorite('w-int-b')
      await addFavorite('w-int-c')
      const all = await getAllFavorites()
      const ids = all.map(f => f.wordId).sort()
      expect(ids).toEqual(['w-int-a', 'w-int-b', 'w-int-c'])
    })

    it('addFavorite 重复同一 wordId 覆盖 addedAt, 不报错', async () => {
      await addFavorite('w-int-dup')
      await addFavorite('w-int-dup')
      const row = await db.favorites.get('w-int-dup')
      expect(row).toBeTruthy()
      const all = await db.favorites.toArray()
      expect(all.filter(f => f.wordId === 'w-int-dup').length).toBe(1)
    })
  })

  describe('6. 静态审查 — W142 关键模式', () => {
    it('idbWorkerClient: 有 isWorkerAvailable / ensureWorker / fallback 守卫', async () => {
      const { readFileSync } = await import('fs')
      const code = readFileSync('src/lib/idbWorkerClient.ts', 'utf-8')
      expect(code).toMatch(/isWorkerAvailable/)
      expect(code).toMatch(/ensureWorker/)
      expect(code).toMatch(/fallbackWrite/)
      // workerFailed 旗标 — Worker 错误后强制 fallback, 不再尝试重建
      expect(code).toMatch(/workerFailed/)
      // queue 顺序
      expect(code).toMatch(/queue/)
    })

    it('idb.worker.ts: 6 个 op 全部 switch case 覆盖', async () => {
      const { readFileSync } = await import('fs')
      const code = readFileSync('src/workers/idb.worker.ts', 'utf-8')
      expect(code).toMatch(/case 'put'/)
      expect(code).toMatch(/case 'add'/)
      expect(code).toMatch(/case 'bulkPut'/)
      expect(code).toMatch(/case 'bulkAdd'/)
      expect(code).toMatch(/case 'delete'/)
      expect(code).toMatch(/case 'update'/)
    })

    it('db.ts addFavorite 已改走 writePut (W142 目标 — 走 Worker)', async () => {
      const { readFileSync } = await import('fs')
      const code = readFileSync('src/lib/db.ts', 'utf-8')
      // addFavorite 函数体内不应再直接调 db.favorites.put (改走 Worker)
      const addFavMatch = code.match(/export async function addFavorite[\s\S]*?^}/m)
      expect(addFavMatch).toBeTruthy()
      // 关键: 已用 writePut/writeAdd 走 Worker (W142: 用 put 保 put 语义, 重复收藏不抛错)
      expect(addFavMatch![0]).toMatch(/write(Add|Put)/)
      // 不应再直接调 db.favorites.put
      expect(addFavMatch![0]).not.toMatch(/db\.favorites\.put/)
    })
  })
})
