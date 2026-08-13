// src/lib/telemetry.ts — W146 反馈回路 (v3 plan E-1)
// local-only 埋点 — 0 网络上传, 全部写 IDB `telemetry` 表
// 用途: 19 周产品 0 真实用户数据, 这个工具给"知道哪些功能被用了" 提供基础
//
// 设计原则 (按 v3 plan W137):
//  - 0 网络: 全部 IDB, 用户可关可导出
//  - 7 事件: page_view / feature_used / session_start/end / word_learned / error_made / feedback_submitted / nps_score
//  - 自动 debounce 1s, 批量 flush
//  - sessionId 标识同次访问
//  - 30 天前事件自动清理 (避免表膨胀)
//  - 用户在 Settings 可关 / 导出 JSON / 清除

import { db, type TelemetryEvent, type TelemetryEventName } from './db'

// ============================================================
// localStorage helpers (W146 telemetry 内部用, 避免依赖 storage.ts)
// ============================================================

function getStoredJSON<T>(key: string): T | undefined {
  if (typeof localStorage === 'undefined') return undefined
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return undefined
    return JSON.parse(raw) as T
  } catch {
    return undefined
  }
}

function setStoredJSON<T>(key: string, value: T): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // quota / 隐私模式 → 静默
  }
}

// ============================================================
// 配置
// ============================================================

/** W146: 用户可关的埋点开关 (默认开) */
const TELEMETRY_ENABLED_KEY = 'w146_telemetry_enabled'
/** W146: session id 持久化 (跨 reload) */
const SESSION_ID_KEY = 'w146_session_id'
/** W146: 首次使用时间戳 (用于 NPS 7 天触发) */
const FIRST_USE_KEY = 'w146_first_use_ts'
/** W146: NPS 已评标记 (避免重复弹) */
const NPS_DONE_KEY = 'w146_nps_done'
/** W146: 自动清理 30 天前事件 */
const RETENTION_DAYS = 30
/** W146: 批量 flush 间隔 (1s) */
const FLUSH_INTERVAL_MS = 1000
/** W146: 批量缓冲上限 (避免无限堆) */
const BUFFER_MAX = 50

// ============================================================
// 内存状态
// ============================================================

let enabled = true
let sessionId = ''
let buffer: TelemetryEvent[] = []
let flushTimer: ReturnType<typeof setInterval> | null = null
let initialized = false

// ============================================================
// 初始化 (App 启动调一次)
// ============================================================

/** W146: 初始化埋点 — 读开关 / 生成 sessionId / 启动 flush 循环 / 写 session_start
 *  - 由 Layout mount 时调一次
 *  - 必须在 IDB 可用后 (Dexie 初始化)
 */
export async function initTelemetry(): Promise<void> {
  if (initialized) return
  initialized = true

  // 1. 读开关 (默认 true)
  const stored = getStoredJSON<boolean>(TELEMETRY_ENABLED_KEY)
  enabled = stored === undefined ? true : stored

  // 2. sessionId — 30 分钟无活动视为新 session
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000
  const lastSession = getStoredJSON<{ id: string; ts: number }>(SESSION_ID_KEY)
  const now = Date.now()
  if (lastSession && now - lastSession.ts < SESSION_TIMEOUT_MS) {
    sessionId = lastSession.id
  } else {
    // 简单 ID: 时间戳 + 4 字符随机
    sessionId = `${now}-${Math.random().toString(36).slice(2, 6)}`
  }
  setStoredJSON(SESSION_ID_KEY, { id: sessionId, ts: now })

  // 3. 首次使用时间戳 (NPS 7 天触发用)
  if (!getStoredJSON<number>(FIRST_USE_KEY)) {
    setStoredJSON(FIRST_USE_KEY, now)
  }

  // 4. 启动 flush 循环
  if (flushTimer) clearInterval(flushTimer)
  flushTimer = setInterval(flushBuffer, FLUSH_INTERVAL_MS)

  // 5. 写 session_start
  if (enabled) {
    track('session_start', { path: window.location.pathname })
  }

  // 6. 30 天前事件自动清理 (懒执行, init 时跑一次)
  await cleanOldEvents()
}

// ============================================================
// 核心 API
// ============================================================

/** W146: 记录 1 个事件 — push 进 buffer, 由 flushTimer 批量写 IDB
 *  - 业务: 任意位置调 track('page_view', { path: '/words' })
 *  - 失败/disabled 静默, 0 副作用
 */
export function track(event: TelemetryEventName, props?: Record<string, string | number | boolean>): void {
  if (!enabled || !initialized) return
  try {
    buffer.push({
      event,
      ts: Date.now(),
      props,
      sessionId,
    })
    // buffer 满, 立即 flush (不等到 1s)
    if (buffer.length >= BUFFER_MAX) {
      void flushBuffer()
    }
  } catch {
    // 0 副作用: 埋点失败不阻塞业务
  }
}

/** W146: 立即 flush buffer → IDB
 *  - 由 flushTimer 1s 触发, 或 buffer 满, 或 App 退出前
 *  - 失败静默 (retry 1 次后丢, 不影响业务)
 */
export async function flushBuffer(): Promise<void> {
  if (buffer.length === 0) return
  const toWrite = buffer
  buffer = []
  try {
    await db.telemetry.bulkAdd(toWrite)
  } catch (e) {
    if (import.meta.env?.DEV) {
      console.debug('[telemetry] flush failed:', e)
    }
    // 失败 1 次, 不重试, 不影响业务
  }
}

/** W146: 用户主动关埋点 — 后续 track() 静默
 *  - Settings "埋点设置" 开关 = false 时调
 */
export function setTelemetryEnabled(value: boolean): void {
  enabled = value
  setStoredJSON(TELEMETRY_ENABLED_KEY, value)
  if (!value) {
    // 关时清空 buffer (避免恢复后写入老数据)
    buffer = []
  }
}

/** W146: 当前埋点开关状态 (Settings UI 读) */
export function isTelemetryEnabled(): boolean {
  return enabled
}

// ============================================================
// 查询 / 导出 (UsagePage 用)
// ============================================================

/** W146: 拿所有事件 (按 ts 倒序)
 *  - UsagePage dashboard 读
 *  - 默认最近 30 天, limit 1000 (UI 渲染压力)
 */
export async function getAllEvents(limit = 1000): Promise<TelemetryEvent[]> {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
  return db.telemetry
    .where('ts').above(cutoff)
    .reverse()
    .limit(limit)
    .toArray()
}

/** W146: 按事件类型聚合计数 (UsagePage "功能使用频次" 条形图)
 *  - 例如: feature_used: 50 次, page_view '/words': 30 次
 *  - 注: key 是 string (含 props 子分类), 不是 TelemetryEventName
 */
export async function getEventCounts(): Promise<Record<string, number>> {
  const events = await getAllEvents()
  const counts: Record<string, number> = {}
  events.forEach(e => {
    let key: string = e.event
    if (e.props && typeof e.props.feature === 'string') key = `${e.event}:${e.props.feature}`
    else if (e.props && typeof e.props.path === 'string') key = `${e.event}:${e.props.path}`
    counts[key] = (counts[key] || 0) + 1
  })
  return counts
}

/** W146: 按天聚合 (UsagePage "30 天学习天数" 折线图)
 *  - 返回 { 'YYYY-MM-DD': count } 映射
 */
export async function getDailyCounts(days = 30): Promise<Record<string, number>> {
  const events = await getAllEvents(days * 100) // 假设每天 ≤ 100 事件
  const counts: Record<string, number> = {}
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  events.forEach(e => {
    if (e.ts < cutoff) return
    const d = new Date(e.ts).toISOString().slice(0, 10)
    counts[d] = (counts[d] || 0) + 1
  })
  return counts
}

/** W146: 导出所有 telemetry 为 JSON 字符串
 *  - Settings "导出数据" 按钮调
 *  - 给用户自己保存, 不上传
 */
export async function exportTelemetryAsJSON(): Promise<string> {
  const events = await db.telemetry.toArray()
  return JSON.stringify({
    exportTime: new Date().toISOString(),
    appVersion: '2.1.26+',
    eventCount: events.length,
    events,
  }, null, 2)
}

/** W146: 清空 telemetry (Settings "清空数据" 按钮)
 *  - 不可逆, 弹确认
 */
export async function clearAllTelemetry(): Promise<void> {
  await db.telemetry.clear()
}

/** W146: 清 30 天前事件 (init 时跑一次, 也可手动触发) */
export async function cleanOldEvents(): Promise<void> {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
  await db.telemetry.where('ts').below(cutoff).delete()
}

// ============================================================
// 一次性指标 (供 NPS 触发判断)
// ============================================================

/** W146: 距首次使用天数 (NPS 7 天触发) */
export function daysSinceFirstUse(): number {
  const first = getStoredJSON<number>(FIRST_USE_KEY)
  if (!first) return 0
  return Math.floor((Date.now() - first) / (24 * 60 * 60 * 1000))
}

/** W146: NPS 是否已评 */
export function isNpsDone(): boolean {
  return getStoredJSON<boolean>(NPS_DONE_KEY) === true
}

/** W146: 标记 NPS 已评 */
export function markNpsDone(): void {
  setStoredJSON(NPS_DONE_KEY, true)
}

/** W146: 当前 sessionId (暴露给 NpsPrompt/FeedbackButton 用于写入) */
export function getCurrentSessionId(): string {
  return sessionId
}
