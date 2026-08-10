// src/lib/syncManager.ts — W135 Background Sync 抽象
// 目的: 离线时把用户的写操作 (收藏 / 错题 / 听写) 排队到 IDB,
//       在线时自动 flush 重试; 老浏览器降级到 setTimeout 轮询
//
// 与 W128 idbSync (跨 tab) 的区别:
//   - idbSync: 已经在主 tab 写完 IDB, 通知副 tab 刷新 (同步已经发生)
//   - syncManager (本文件): 网络失败时写操作暂存到 IDB 队列, 在线时再补
//
// 设计原则:
//   - 0 第三方依赖 (Background Sync API 是浏览器原生, 没 polyfill)
//   - 降级路径完整: SyncManager 不可用 → online 事件 → setTimeout 轮询
//   - 业务可只调 enqueue({type:'favorite:add', payload:{...}}), 不关心底层
//   - 测试可拿 _peekQueueForTest / _flushForTest 验证
//
// 使用:
//   import { enqueueOfflineWrite, initSyncManager, flushOfflineQueue } from '@/lib/syncManager'
//   if (navigator.onLine) {
//     await addFavorite(...)
//   } else {
//     await enqueueOfflineWrite({ type: 'favorite:add', payload: { wordId: 'w-1' } })
//   }

import 'fake-indexeddb/auto' // 测试环境需要; 生产无副作用 (browser 自带 IDB)

/** 队列里的一项写操作 */
export interface QueuedWrite<T = unknown> {
  /** 唯一 id, 用于去重 + 调试 */
  id: string
  /** 业务类型: 'favorite:add' / 'error:add' / 'dictation:add' 等 */
  type: string
  /** 业务参数, 由 type 对应的 handler 解析 */
  payload: T
  /** 入队时间戳 (毫秒) */
  ts: number
  /** 已重试次数 */
  retry: number
  /** 上次重试时间 (毫秒) */
  lastTry?: number
  /** 上次失败原因 (用于诊断) */
  lastError?: string
}

const QUEUE_STORE = 'syncManagerQueue'
const QUEUE_DB = 'EnglishAppSyncManager'
const QUEUE_VERSION = 1
/** 队列最大长度: 防止恶意/异常堆积, 超限丢弃最老 */
const MAX_QUEUE_LEN = 200
/** 单条最大重试: 超过后放弃, 用户手动重试 */
const MAX_RETRY = 5
/** 重试基础退避: 1s, 2s, 4s, 8s, 16s */
const RETRY_BASE_MS = 1000

/** 业务 handler: type -> Promise handler */
type Handler = (payload: any) => Promise<void>

const _handlers = new Map<string, Handler>()

/** 注册某个 type 的处理函数 (在 initSyncManager 时一次注册好) */
export function registerHandler(type: string, handler: Handler): void {
  _handlers.set(type, handler)
}

/** 拿到 IDB 队列 db (lazy init) */
let _dbPromise: Promise<IDBDatabase> | null = null
function getDb(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise
  _dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB 不可用'))
      return
    }
    const req = indexedDB.open(QUEUE_DB, QUEUE_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return _dbPromise
}

/** 通用 id 生成 */
function makeId(): string {
  return `swq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 离线时入队: 写 IDB 队列, 尝试注册 Background Sync, online 时 flush
 */
export async function enqueueOfflineWrite<T>(
  item: Omit<QueuedWrite<T>, 'id' | 'ts' | 'retry'>
): Promise<QueuedWrite<T>> {
  const queued: QueuedWrite<T> = {
    id: makeId(),
    type: item.type,
    payload: item.payload,
    ts: Date.now(),
    retry: 0,
  }
  await _put(queued)
  await _trim()
  // 尝试注册 Background Sync (浏览器原生 API, 不可用就降级)
  await _tryRegisterSync()
  return queued
}

/** 拿到队列里的所有项 (peek, 不删) */
export async function _peekQueue(): Promise<QueuedWrite[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await getDb()
      const tx = db.transaction(QUEUE_STORE, 'readonly')
      const req = tx.objectStore(QUEUE_STORE).getAll()
      req.onsuccess = () => resolve((req.result || []) as QueuedWrite[])
      req.onerror = () => reject(req.error)
    } catch (e) {
      reject(e)
    }
  })
}

/** 测试用: 拿队列快照 */
export async function _peekQueueForTest(): Promise<QueuedWrite[]> {
  return _peekQueue()
}

/** 清空队列 (仅测试) */
export async function _resetForTest(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await getDb()
      const tx = db.transaction(QUEUE_STORE, 'readwrite')
      tx.objectStore(QUEUE_STORE).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    } catch (e) {
      reject(e)
    }
  })
}

/** 内部: 写一条到队列 */
async function _put(item: QueuedWrite): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await getDb()
      const tx = db.transaction(QUEUE_STORE, 'readwrite')
      tx.objectStore(QUEUE_STORE).put(item)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    } catch (e) {
      reject(e)
    }
  })
}

/** 内部: 删除一条 */
async function _remove(id: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await getDb()
      const tx = db.transaction(QUEUE_STORE, 'readwrite')
      tx.objectStore(QUEUE_STORE).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    } catch (e) {
      reject(e)
    }
  })
}

/** 内部: 队列超出上限时丢弃最老的 */
async function _trim(): Promise<void> {
  const all = await _peekQueue()
  if (all.length <= MAX_QUEUE_LEN) return
  // 按 ts 升序, 删多余
  all.sort((a, b) => a.ts - b.ts)
  const toRemove = all.slice(0, all.length - MAX_QUEUE_LEN)
  for (const item of toRemove) {
    await _remove(item.id)
  }
  if (import.meta.env?.DEV) {
    console.warn(
      `[syncManager] queue overflow, dropped ${toRemove.length} oldest items`
    )
  }
}

/** 计算下次重试退避 (指数 + 抖动) */
function nextBackoff(retry: number): number {
  const base = RETRY_BASE_MS * Math.pow(2, retry)
  // ±20% 抖动, 防多 client 集中重试
  const jitter = base * 0.2 * (Math.random() * 2 - 1)
  return Math.max(1000, Math.floor(base + jitter))
}

/**
 * Flush 队列: 逐条调 handler, 成功删, 失败递增 retry, 超过 MAX_RETRY 永久放弃
 *  - 返回 { ok: 成功数, fail: 失败数 (含重试中) }
 */
export async function flushOfflineQueue(): Promise<{ ok: number; fail: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: 0, fail: 0 }
  }
  const items = await _peekQueue()
  let ok = 0
  let fail = 0
  for (const item of items) {
    const handler = _handlers.get(item.type)
    if (!handler) {
      // 没有 handler: 当作完成, 删除 (业务可能已下线)
      await _remove(item.id)
      ok++
      continue
    }
    try {
      await handler(item.payload)
      await _remove(item.id)
      ok++
    } catch (err: any) {
      const next: QueuedWrite = {
        ...item,
        retry: item.retry + 1,
        lastTry: Date.now(),
        lastError: String(err?.message || err),
      }
      if (next.retry >= MAX_RETRY) {
        // 永久放弃, 删
        await _remove(item.id)
        if (import.meta.env?.DEV) {
          console.warn(
            `[syncManager] give up after ${MAX_RETRY} retries: ${item.type}`,
            next.lastError
          )
        }
      } else {
        await _put(next)
      }
      fail++
    }
  }
  return { ok, fail }
}

/** 安排后台 flush (退避到下次允许重试时间) */
export function scheduleFlush(delayMs = 1000): void {
  setTimeout(() => {
    flushOfflineQueue().catch(() => {
      // swallow
    })
  }, delayMs)
}

// === 触发源 ===

let _initialized = false
let _onlineHandler: (() => void) | null = null
let _intervalId: ReturnType<typeof setInterval> | null = null
const SW_SYNC_TAG = 'english-app-offline-sync'

/**
 * 初始化: 注册 online 事件 + 周期轮询 + SW Background Sync (如果可用)
 *
 * 业务: 在 main.tsx 启动期调一次 initSyncManager({ onFlush: () => toast(...)
 */
export interface SyncManagerInitOptions {
  /** Flush 完成后回调 (e.g. 弹 toast 提示) */
  onFlush?: (result: { ok: number; fail: number }) => void
  /** online 事件触发 (内部用) */
  onOnline?: () => void
  /** 周期轮询间隔 (ms, 默认 60s) */
  pollIntervalMs?: number
}

export function initSyncManager(opts: SyncManagerInitOptions = {}): () => void {
  if (_initialized) {
    return () => {
      /* 幂等: 重复调用返回 noop teardown */
    }
  }
  _initialized = true

  _onlineHandler = () => {
    opts.onOnline?.()
    scheduleFlush(0)
  }
  window.addEventListener('online', _onlineHandler)

  // 周期轮询兜底 (老浏览器 / SW 不可用)
  const pollMs = opts.pollIntervalMs ?? 60_000
  _intervalId = setInterval(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      flushOfflineQueue()
        .then((r) => {
          if (r.ok > 0) opts.onFlush?.(r)
        })
        .catch(() => {
          /* swallow */
        })
    }
  }, pollMs)

  // 监听 SW 消息: SW 完成后台同步时, 主动 flush (避免等下次 online)
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data?.type === 'sync-complete') {
        flushOfflineQueue()
          .then((r) => {
            if (r.ok > 0) opts.onFlush?.(r)
          })
          .catch(() => {})
      }
    })
  }

  // 返回 teardown
  return () => {
    if (_onlineHandler) {
      window.removeEventListener('online', _onlineHandler)
      _onlineHandler = null
    }
    if (_intervalId) {
      clearInterval(_intervalId)
      _intervalId = null
    }
    _initialized = false
  }
}

/** 内部: 尝试注册 SW Background Sync */
async function _tryRegisterSync(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.ready
    // SyncManager 是实验 API, 类型可能没有
    const sync = (reg as any).sync
    if (sync && typeof sync.register === 'function') {
      await sync.register(SW_SYNC_TAG)
    }
  } catch {
    // 浏览器不支持, 静默; 后续靠 online 事件 + 轮询兜底
  }
}

/** SW_SYNC_TAG (供业务 SW 集成用) */
export const SYNC_TAG = SW_SYNC_TAG

// === 业务注册 helper ===

/** 注册内置默认 handler (FavoritesPage / Dictation) */
export function registerDefaultHandlers(): void {
  // 收藏: lazy require 避免循环依赖
  registerHandler('favorite:add', async (payload: { wordId: string }) => {
    const { addFavorite } = await import('./db')
    await addFavorite(payload.wordId)
  })
  registerHandler('favorite:remove', async (payload: { wordId: string }) => {
    const { removeFavorite } = await import('./db')
    await removeFavorite(payload.wordId)
  })
  registerHandler('dictation:add', async (payload: any) => {
    const { saveDictationError } = await import('./db')
    await saveDictationError(payload)
  })
  registerHandler('errorReview:add', async (payload: any) => {
    const { addErrorReviewScore } = await import('./db')
    await addErrorReviewScore(payload)
  })
}
