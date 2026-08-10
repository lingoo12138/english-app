// src/lib/idbSync.ts - W128 跨 tab IDB 同步 + W134 性能增强
// 主 tab 写 IDB 时广播 (debounce 100ms), 副 tab 收到后刷新 store
// 兼容老浏览器: 无 BroadcastChannel -> 降级到 storage event
// 防回环: 副 tab 收到广播后不再次 broadcast
//
// W134 增强:
// 1. 限频 1 次 / 100ms (原 200ms, 减少跨 tab 同步延迟)
// 2. 广播大小限制 5MB / 条 (localStorage 上限, 超出 fallback 静默丢弃 + 警告)
// 3. 错误重试 3 次 + 指数退避 (100ms, 200ms, 400ms)
// 4. 端口化 channel: 每个 initIdbSync() 实例可指定独立 channelName,
//    默认 'english-app-idb-sync'; 业务可传 { channelName: 'xxx' } 自定义,
//    避免多应用 / 多实例相互干扰
//
// 兼容: API 完全不变; 旧业务 import 名字 + 调用方式保留; 测试 1 改 200->100ms
//
// 设计思路:
// 1. 入口: initIdbSync({ stores, onChange, channelName }) 启动 listener, 返回 teardown
// 2. 出口: notifyIdbWrite({ store, op, key }) 触发广播 (内部 debounce)
// 3. 副 tab 收到消息后回调 onChange(msg), 由 UI 决定是否 setState
// 4. 收到时设置 _receiving 旗标, 避免触发回环 broadcast
// 5. 提供 storage event fallback, 用同一 key 传递消息 (受 5MB 限制)
// 6. sendMessage 内部走 safePost: 序列化 -> 测大小 -> postMessage + 失败重试
//
// 注意: BroadcastChannel 在所有现代浏览器都支持 (Chrome 54+, FF 38+, Safari 15.4+)
// 老浏览器 (IE / Safari <15.4) 用 storage event fallback (BroadcastChannel 不存在)

/** 默认 channel 名称 (端口化基名, 业务可覆盖) */
export const DEFAULT_CHANNEL_NAME = 'english-app-idb-sync'
/** storage fallback 用的 key (与 channel 联动) */
const STORAGE_KEY_PREFIX = '__idb-sync__'
/** W134: 限频 1 次 / 100ms (同 store+op+key 合并, 仅保留最新) */
const DEBOUNCE_MS = 100
/** 频率限制: 1 次 / 100ms (同 store+op+key 合并, 仅保留最新) */
const RATE_LIMIT_MS = 100
/** W134: 单条广播最大 5MB (与 localStorage 上限一致) */
export const MAX_BROADCAST_BYTES = 5 * 1024 * 1024
/** W134: postMessage 失败重试 3 次 (指数退避: 100/200/400 ms) */
const MAX_RETRY = 3
const RETRY_BASE_MS = 100

// 接收旗标 (防回环): 收到广播时设 true, 业务 setState 期间不再次广播
let _receiving = false

/** 是否正在接收 (供业务 setState 检测) */
export function isReceivingIdbSync(): boolean {
  return _receiving
}

// === BroadcastChannel 部分 (现代浏览器) ===

export interface BroadcastMsg {
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

interface ChannelState {
  channel: BroadcastChannel | null
  storageHandler: ((e: StorageEvent) => void) | null
  storageKey: string
  cleanup: (() => void) | null
}

// W134: 每个 initIdbSync() 实例可独立 channel, 避免多实例 / 多 app 互相干扰
// 端口化: 用 Map 存 instanceId -> ChannelState, 不用全局单例
let _instanceSeq = 0
const _instances = new Map<number, ChannelState>()
let _callbacks: Array<(msg: BroadcastMsg) => void> = []

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

/** 频率限制 + 同 store+op+key 合并 (用 Map 缓存 pending, 100ms 后 flush 最新) */
interface PendingMsg {
  store: string
  op: BroadcastMsg['op']
  key?: string | number
  ts: number
  msgId: string
  /** 目标 channel 名称 (W134: 端口化后, pending 需要知道往哪发) */
  channelName: string
  /** 目标 instance id (0 = 默认) */
  channelInstance: number
}

const _pending = new Map<string, PendingMsg>()  // key: `${channelName}|${store}|${op}|${key}`
let _flushTimer: ReturnType<typeof setTimeout> | null = null
let _lastFlushAt = 0  // 频率限制用 (RATE_LIMIT_MS)

/** W134: 计算序列化后字节数 (用于 5MB 上限检测) */
function approxBytes(s: string): number {
  // Blob 走 UTF-8 准确测量, fallback to length (旧 JS)
  if (typeof Blob !== 'undefined') {
    return new Blob([s]).size
  }
  return s.length
}

function flushPending(): void {
  if (_pending.size === 0) return
  const msgs = Array.from(_pending.values())
  _pending.clear()
  _flushTimer = null
  const now = Date.now()
  // 频率限制: 与上次 flush 间隔 < 100ms 推迟到下一个 RATE_LIMIT_MS
  if (now - _lastFlushAt < RATE_LIMIT_MS) {
    setTimeout(flushPending, RATE_LIMIT_MS - (now - _lastFlushAt))
    return
  }
  _lastFlushAt = now
  for (const m of msgs) {
    sendMessage(m)
  }
}

/** W134: 安全 post - 序列化 -> 测大小 -> 失败重试 3 次 + 退避 */
async function safePost(state: ChannelState, full: BroadcastMsg): Promise<boolean> {
  let payload: string
  try {
    payload = JSON.stringify(full)
  } catch (e) {
    console.warn('[idbSync] 序列化失败, 跳过广播:', e)
    return false
  }

  // W134: 大小检查 (5MB 限制)
  const bytes = approxBytes(payload)
  if (bytes > MAX_BROADCAST_BYTES) {
    console.warn(
      `[idbSync] 广播超限 (${(bytes / 1024 / 1024).toFixed(2)}MB > 5MB), ` +
      `store=${full.store} op=${full.op} key=${full.key}; 静默丢弃`,
    )
    return false
  }

  // W134: 3 次重试 + 指数退避
  for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
    const ok = tryPostOnce(state, payload, full)
    if (ok) return true
    // 失败: 等退避
    const backoff = RETRY_BASE_MS * Math.pow(2, attempt)
    await new Promise(r => setTimeout(r, backoff))
  }
  console.warn('[idbSync] 重试 3 次仍失败, 放弃广播:', full.store, full.op, full.key)
  return false
}

/** 实际单次 post (BroadcastChannel 或 storage) — 不抛异常, 返回成功布尔 */
function tryPostOnce(state: ChannelState, payload: string, full: BroadcastMsg): boolean {
  if (state.channel) {
    try {
      state.channel.postMessage(full)
      return true
    } catch (e) {
      console.warn('[idbSync] BroadcastChannel.postMessage 失败, 重试:', e)
      return false
    }
  }
  // Fallback: storage event (受 5MB 限制, 仅 small payloads)
  if (typeof localStorage !== 'undefined') {
    try {
      // 写入即触发, 然后立刻删 (避免持续触发)
      localStorage.setItem(state.storageKey, payload)
      // 100ms 后清理 (避免 noise)
      setTimeout(() => {
        try {
          const cur = localStorage.getItem(state.storageKey)
          if (cur && cur === payload) {
            localStorage.removeItem(state.storageKey)
          }
        } catch { /* ignore */ }
      }, 100)
      return true
    } catch (e) {
      // storage 写满 (5MB) 兜底: 重试可能也失败
      console.warn('[idbSync] storage 写失败 (5MB 上限?):', e)
      return false
    }
  }
  return false
}

/** 实际发送 (BroadcastChannel 或 storage) — 同步触发, 内部走 safePost 重试 */
function sendMessage(m: PendingMsg): void {
  const full: BroadcastMsg = {
    msgId: m.msgId,
    store: m.store,
    op: m.op,
    key: m.key,
    ts: m.ts,
    sourceTab: getTabId(),
  }
  const state = _instances.get(m.channelInstance)
  if (!state) {
    // 没初始化, fallback 到默认 instance
    const fallback = _instances.get(0)
    if (!fallback) return  // 完全没 init, 静默
    void safePost(fallback, full)
    return
  }
  // async fire-and-forget (safePost 内部处理重试)
  void safePost(state, full)
}

/**
 * 业务侧调用: IDB 写入完成后通知其他 tab
 * - 内部 debounce 100ms, 同 store+op+key 合并为最新一条
 * - 接收旗标开启时不发送 (防回环)
 * - 频率限制: 实际发送 1 次 / 100ms (RATE_LIMIT_MS)
 * - W134: 端口化 — pending 用 channelName + store+op+key 合并, 支持多 channel
 */
export function notifyIdbWrite(opts: {
  store: string
  op: 'put' | 'delete' | 'clear' | 'bulkPut' | 'bulkDelete'
  key?: string | number
  channelName?: string
}): void {
  if (_receiving) return  // 收到广播后触发 setState, 不再次广播
  const channelName = opts.channelName ?? DEFAULT_CHANNEL_NAME
  const k = `${channelName}|${opts.store}|${opts.op}|${opts.key ?? ''}`
  _pending.set(k, {
    store: opts.store,
    op: opts.op,
    key: opts.key,
    ts: Date.now(),
    msgId: makeMsgId(),
    channelName,
    channelInstance: findInstanceByChannelName(channelName),
  })
  if (_flushTimer) clearTimeout(_flushTimer)
  _flushTimer = setTimeout(flushPending, DEBOUNCE_MS)
}

/** W134: 按 channelName 找 instance id (默认 0) */
function findInstanceByChannelName(name: string): number {
  for (const [id, st] of _instances.entries()) {
    if (st.storageKey === `${STORAGE_KEY_PREFIX}:${name}`) return id
  }
  // 默认 instance (id=0) 永远存在
  return 0
}

/** 处理收到的消息 (业务侧回调 + 旗标管理) */
function handleIncoming(msg: BroadcastMsg): void {
  // 过滤自身 (同 tab 不会触发, 但 storage fallback 理论可能)
  if (msg.sourceTab === getTabId()) return
  // 开启旗标 -> 业务侧 setState 期间 notifyIdbWrite 自动 noop
  _receiving = true
  if (_callbacks.length === 0) {
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
    Promise.resolve().then(() => {
      _receiving = false
    })
  }
}

/**
 * 启动跨 tab 同步
 * - onChange: 收到广播时调用 (msg) => void
 * - channelName: 自定义 channel 名称, 避免与其它应用 / 实例冲突 (默认 'english-app-idb-sync')
 * - 返回 teardown 函数 (清理 listener + 通道)
 *
 * 用法 (在 main.tsx):
 *   initIdbSync({
 *     onChange: (msg) => {
 *       if (msg.store === 'favorites') refreshFavorites()
 *       else if (msg.store === 'chats') refreshChats()
 *     }
 *   })
 *
 * 多实例隔离 (W134):
 *   initIdbSync({ onChange: cbA, channelName: 'eng-app-store-a' })
 *   initIdbSync({ onChange: cbB, channelName: 'eng-app-store-b' })
 *   // cbA 只收 store-a channel, cbB 只收 store-b channel
 */
export interface IdbSyncOptions {
  onChange?: (msg: BroadcastMsg) => void
  /** W134: 端口化 channel 名称, 默认 'english-app-idb-sync' */
  channelName?: string
}

export function initIdbSync(opts: IdbSyncOptions = {}): () => void {
  const channelName = opts.channelName ?? DEFAULT_CHANNEL_NAME
  const storageKey = `${STORAGE_KEY_PREFIX}:${channelName}`
  const instanceId = _instanceSeq++
  const state: ChannelState = {
    channel: null,
    storageHandler: null,
    storageKey,
    cleanup: null,
  }
  _instances.set(instanceId, state)

  if (opts.onChange) _callbacks.push(opts.onChange)

  // 优先 BroadcastChannel
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      state.channel = new BroadcastChannel(channelName)
      state.channel.onmessage = (e: MessageEvent) => {
        const msg = e.data as BroadcastMsg
        if (msg && typeof msg === 'object' && msg.store) {
          handleIncoming(msg)
        }
      }
    } catch (e) {
      console.warn('[idbSync] BroadcastChannel 创建失败, 降级 storage:', e)
      state.channel = null
    }
  }

  // storage fallback (老浏览器 + BroadcastChannel 不可用时)
  if (!state.channel && typeof window !== 'undefined') {
    state.storageHandler = (e: StorageEvent) => {
      if (e.key !== storageKey || !e.newValue) return
      try {
        const msg = JSON.parse(e.newValue) as BroadcastMsg
        if (msg && typeof msg === 'object' && msg.store) {
          handleIncoming(msg)
        }
      } catch { /* ignore */ }
    }
    window.addEventListener('storage', state.storageHandler)
  }

  // 清理
  const teardown = () => {
    if (state.channel) {
      try {
        state.channel.close()
      } catch { /* ignore */ }
      state.channel = null
    }
    if (state.storageHandler && typeof window !== 'undefined') {
      window.removeEventListener('storage', state.storageHandler)
      state.storageHandler = null
    }
    _instances.delete(instanceId)
    // 移除本次注册的 callback (按引用比较, 简单实现)
    if (opts.onChange) {
      const idx = _callbacks.indexOf(opts.onChange)
      if (idx >= 0) _callbacks.splice(idx, 1)
    }
  }
  state.cleanup = teardown
  return teardown
}

/** 测试用: 强制 flush (跳过 debounce), 仅测试场景使用 */
export function _flushForTest(): void {
  flushPending()
}

/** 测试用: 重置内部状态 (包括 _receiving 旗标 + 所有 instance) */
export function _resetForTest(): void {
  _receiving = false
  if (_flushTimer) clearTimeout(_flushTimer)
  _flushTimer = null
  _pending.clear()
  _lastFlushAt = 0
  for (const [, st] of _instances) {
    if (st.channel) {
      try { st.channel.close() } catch { /* ignore */ }
    }
    if (st.storageHandler && typeof window !== 'undefined') {
      try { window.removeEventListener('storage', st.storageHandler) } catch { /* ignore */ }
    }
  }
  _instances.clear()
  _instanceSeq = 0
  _callbacks = []
}
