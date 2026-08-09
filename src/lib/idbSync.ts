// src/lib/idbSync.ts - W128 跨 tab IDB 同步
// 主 tab 写 IDB 时广播 (debounce 200ms), 副 tab 收到后刷新 store
// 兼容老浏览器: 无 BroadcastChannel -> 降级到 storage event
// 防回环: 副 tab 收到广播后不再次 broadcast
// 频率限制: 1 次 / 200ms (同 store+op 合并)
//
// 设计思路:
// 1. 入口: initIdbSync({ stores, onChange }) 启动 listener, 返回 teardown
// 2. 出口: notifyIdbWrite({ store, op, key }) 触发广播 (内部 debounce)
// 3. 副 tab 收到消息后回调 onChange(store, op, key), 由 UI 决定是否 setState
// 4. 收到时设置 _receiving 旗标, 避免触发回环 broadcast
// 5. 提供 storage event fallback, 用同一 key 传递消息 (受 5MB 限制)
//
// 注意: BroadcastChannel 在所有现代浏览器都支持 (Chrome 54+, FF 38+, Safari 15.4+)
// 老浏览器 (IE / Safari <15.4) 用 storage event fallback (BroadcastChannel 不存在)

const CHANNEL_NAME = 'english-app-idb-sync'
const STORAGE_KEY = '__idb-sync__'
const DEBOUNCE_MS = 200
/** 频率限制: 1 次 / 200ms (同 store+op+key 合并, 仅保留最新) */
const RATE_LIMIT_MS = 200

// 接收旗标 (防回环): 收到广播时设 true, 业务 setState 期间不再次广播
let _receiving = false

/** 是否正在接收 (供业务 setState 检测) */
export function isReceivingIdbSync(): boolean {
  return _receiving
}

// === BroadcastChannel 部分 (现代浏览器) ===

interface BroadcastMsg {
  /** 唯一 id, 收到时比对避免自身回环 */
  msgId: string
  store: string
  op: 'put' | 'delete' | 'clear' | 'bulkPut' | 'bulkDelete'
  /** 被影响的主键 (可选, 用于 store 内 select 优化) */
  key?: string | number
  /** 时间戳 (用于防 stale) */
  ts: number
  /** 源 tab id (不同 tab 不同, 用于本地过滤自己的回环) */
  sourceTab: string
}

let _channel: BroadcastChannel | null = null
let _storageHandler: ((e: StorageEvent) => void) | null = null
let _callbacks: Array<(msg: BroadcastMsg) => void> = []
let _cleanup: (() => void) | null = null

/** 本 tab 唯一 id (从 sessionStorage 读, 没有则生成) */
function getTabId(): string {
  try {
    const k = '__idb-sync-tab-id__'
    let id = sessionStorage.getItem(k)
    if (!id) {
      id = `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      try {
        sessionStorage.setItem(k, id)
      } catch { /* ignore */ }
    }
    return id
  } catch {
    return `tab-${Math.random().toString(36).slice(2)}`
  }
}

/** 简单 hash 用于 msgId (避免引入外部依赖) */
function makeMsgId(): string {
  return `${getTabId()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

/** 频率限制 + 同 store+op+key 合并 (用 Map 缓存 pending, 200ms 后 flush 最新) */
interface PendingMsg {
  store: string
  op: BroadcastMsg['op']
  key?: string | number
  ts: number
  msgId: string
}

const _pending = new Map<string, PendingMsg>()  // key: `${store}|${op}|${key}`
let _flushTimer: ReturnType<typeof setTimeout> | null = null
let _lastFlushAt = 0  // 频率限制用 (RATE_LIMIT_MS)

function flushPending(): void {
  if (_pending.size === 0) return
  const msgs = Array.from(_pending.values())
  _pending.clear()
  _flushTimer = null
  const now = Date.now()
  // 频率限制: 与上次 flush 间隔 < 200ms 推迟到下一个 RATE_LIMIT_MS
  if (now - _lastFlushAt < RATE_LIMIT_MS) {
    setTimeout(flushPending, RATE_LIMIT_MS - (now - _lastFlushAt))
    return
  }
  _lastFlushAt = now
  for (const m of msgs) {
    sendMessage(m)
  }
}

/** 实际发送 (BroadcastChannel 或 storage) */
function sendMessage(m: PendingMsg): void {
  const full: BroadcastMsg = {
    msgId: m.msgId,
    store: m.store,
    op: m.op,
    key: m.key,
    ts: m.ts,
    sourceTab: getTabId(),
  }
  if (_channel) {
    try {
      _channel.postMessage(full)
      return
    } catch (e) {
      console.warn('[idbSync] BroadcastChannel.postMessage 失败, 降级到 storage:', e)
    }
  }
  // Fallback: storage event (受 5MB 限制, 仅 small payloads)
  if (typeof localStorage !== 'undefined') {
    try {
      // 写入即触发, 然后立刻删 (避免持续触发)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(full))
      // 100ms 后清理 (避免 noise)
      setTimeout(() => {
        try {
          const cur = localStorage.getItem(STORAGE_KEY)
          if (cur && cur === JSON.stringify(full)) {
            localStorage.removeItem(STORAGE_KEY)
          }
        } catch { /* ignore */ }
      }, 100)
    } catch (e) {
      // storage 写满 (5MB) 兜底: 静默 + 警告
      console.warn('[idbSync] storage 写失败 (5MB 上限?):', e)
    }
  }
}

/**
 * 业务侧调用: IDB 写入完成后通知其他 tab
 * - 内部 debounce 200ms, 同 store+op+key 合并为最新一条
 * - 接收旗标开启时不发送 (防回环)
 * - 频率限制: 实际发送 1 次 / 200ms (RATE_LIMIT_MS)
 */
export function notifyIdbWrite(opts: {
  store: string
  op: 'put' | 'delete' | 'clear' | 'bulkPut' | 'bulkDelete'
  key?: string | number
}): void {
  if (_receiving) return  // 收到广播后触发 setState, 不再次广播
  const k = `${opts.store}|${opts.op}|${opts.key ?? ''}`
  _pending.set(k, {
    store: opts.store,
    op: opts.op,
    key: opts.key,
    ts: Date.now(),
    msgId: makeMsgId(),
  })
  if (_flushTimer) clearTimeout(_flushTimer)
  _flushTimer = setTimeout(flushPending, DEBOUNCE_MS)
}

/** 处理收到的消息 (业务侧回调 + 旗标管理) */
function handleIncoming(msg: BroadcastMsg): void {
  // 过滤自身 (同 tab 不会触发, 但 storage fallback 理论可能)
  if (msg.sourceTab === getTabId()) return
  // 开启旗标 -> 业务侧 setState 期间 notifyIdbWrite 自动 noop
  // (即使无回调也设旗标, 防止回环意外 broadcast)
  _receiving = true
  if (_callbacks.length === 0) {
    // 微任务后清旗标
    Promise.resolve().then(() => {
      _receiving = false
    })
    return
  }
  try {
    for (const cb of _callbacks) {
      try {
        cb(msg)
      } catch (e) {
        console.error('[idbSync] 回调异常:', e)
      }
    }
  } finally {
    // 微任务后清旗标 (给业务 setState 时间)
    Promise.resolve().then(() => {
      _receiving = false
    })
  }
}

/**
 * 启动跨 tab 同步
 * - onChange: 收到广播时调用 (msg) => void
 * - 返回 teardown 函数 (清理 listener + 通道)
 *
 * 用法 (在 main.tsx):
 *   initIdbSync({
 *     onChange: (msg) => {
 *       if (msg.store === 'favorites') refreshFavorites()
 *       else if (msg.store === 'chats') refreshChats()
 *     }
 *   })
 */
export interface IdbSyncOptions {
  onChange?: (msg: BroadcastMsg) => void
}

export function initIdbSync(opts: IdbSyncOptions = {}): () => void {
  // 已启动过, 复用
  if (_cleanup) {
    if (opts.onChange) _callbacks.push(opts.onChange)
    return _cleanup
  }

  if (opts.onChange) _callbacks.push(opts.onChange)

  // 优先 BroadcastChannel
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      _channel = new BroadcastChannel(CHANNEL_NAME)
      _channel.onmessage = (e: MessageEvent) => {
        const msg = e.data as BroadcastMsg
        if (msg && typeof msg === 'object' && msg.store) {
          handleIncoming(msg)
        }
      }
    } catch (e) {
      console.warn('[idbSync] BroadcastChannel 创建失败, 降级 storage:', e)
      _channel = null
    }
  }

  // storage fallback (老浏览器 + BroadcastChannel 不可用时)
  if (!_channel && typeof window !== 'undefined') {
    _storageHandler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return
      try {
        const msg = JSON.parse(e.newValue) as BroadcastMsg
        if (msg && typeof msg === 'object' && msg.store) {
          handleIncoming(msg)
        }
      } catch { /* ignore */ }
    }
    window.addEventListener('storage', _storageHandler)
  }

  // 清理
  _cleanup = () => {
    if (_channel) {
      try {
        _channel.close()
      } catch { /* ignore */ }
      _channel = null
    }
    if (_storageHandler && typeof window !== 'undefined') {
      window.removeEventListener('storage', _storageHandler)
      _storageHandler = null
    }
    _callbacks = []
    if (_flushTimer) {
      clearTimeout(_flushTimer)
      _flushTimer = null
    }
    _pending.clear()
    _cleanup = null
  }

  return _cleanup
}

/** 测试用: 强制 flush (跳过 debounce), 仅测试场景使用 */
export function _flushForTest(): void {
  flushPending()
}

/** 测试用: 重置内部状态 (包括 _receiving 旗标) */
export function _resetForTest(): void {
  _receiving = false
  if (_flushTimer) clearTimeout(_flushTimer)
  _flushTimer = null
  _pending.clear()
  _lastFlushAt = 0
  if (_cleanup) {
    try { _cleanup() } catch { /* ignore */ }
  }
  _callbacks = []
  if (_channel) {
    try { _channel.close() } catch { /* ignore */ }
    _channel = null
  }
  if (_storageHandler && typeof window !== 'undefined') {
    window.removeEventListener('storage', _storageHandler)
    _storageHandler = null
  }
}
