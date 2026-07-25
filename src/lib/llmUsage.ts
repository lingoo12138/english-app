// llmUsage.ts - v1.12.0-C LLM 成本控制
// 日限 + 用量统计 + 跨日重置
// 数据存 localStorage (不持久化到 IndexedDB, 简单够用)

/** LLM 调类别 */
export type LLMCategory = 'write' | 'chat' | 'explain'

/** 各类别日限 */
export const DAILY_LIMITS: Record<LLMCategory, number> = {
  write: 20,      // WritePage 写作批改 + 中译英
  chat: 50,       // AIChat 对话 (含难度自适应)
  explain: 30,    // ErrorExplain + Usage + Grammar + Synonyms 4 个讲解按钮
}

/** 每日用量记录 */
export interface LLMUsageRecord {
  date: string            // YYYY-MM-DD
  write: number
  chat: number
  explain: number
}

const LLM_USAGE_KEY = 'llm-usage'

/** 取今日日期字符串 (YYYY-MM-DD) */
function getTodayString(): string {
  return new Date().toISOString().slice(0, 10)
}

/** 读 localStorage 用量 */
function readUsage(): LLMUsageRecord | null {
  try {
    const raw = localStorage.getItem(LLM_USAGE_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw) as LLMUsageRecord
    return obj
  } catch (e: unknown) {
    return null
  }
}

/** 写 localStorage 用量 */
function writeUsage(record: LLMUsageRecord): void {
  try {
    localStorage.setItem(LLM_USAGE_KEY, JSON.stringify(record))
  } catch (e: unknown) {
    console.warn('[llmUsage] localStorage 写入失败:', e)
  }
}

/** 取今日用量 (跨日重置) */
export function getLLMUsageToday(): LLMUsageRecord {
  const today = getTodayString()
  const existing = readUsage()
  if (!existing || existing.date !== today) {
    // 跨日或首次 → 重置
    return { date: today, write: 0, chat: 0, explain: 0 }
  }
  return existing
}

/** 累加今日某类调用数 */
export function recordLLMCall(category: LLMCategory): LLMUsageRecord {
  const record = getLLMUsageToday()
  record[category] = (record[category] || 0) + 1
  writeUsage(record)
  return record
}

/** 取今日某类已用次数 */
export function getLLMUsage(category: LLMCategory): number {
  return getLLMUsageToday()[category] || 0
}

/** 取某类日限 */
export function getDailyLimit(category: LLMCategory): number {
  return DAILY_LIMITS[category]
}

/** 取某类剩余 */
export function getRemaining(category: LLMCategory): number {
  return Math.max(0, getDailyLimit(category) - getLLMUsage(category))
}

/** 检查是否超限 (不修改数据) */
export interface LLMLimitCheck {
  ok: boolean           // false = 已超限
  used: number
  limit: number
  remaining: number
}

export function checkLLMLimit(category: LLMCategory): LLMLimitCheck {
  const used = getLLMUsage(category)
  const limit = getDailyLimit(category)
  return {
    ok: used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  }
}

/** 重置今日用量 (调试用) */
export function resetLLMUsageToday(): void {
  try {
    localStorage.removeItem(LLM_USAGE_KEY)
  } catch (e: unknown) {
    console.warn('[llmUsage] localStorage 清除失败:', e)
  }
}

/** 格式化提示信息 (超限时) */
export function getLimitExceededMessage(category: LLMCategory): string {
  const check = checkLLMLimit(category)
  if (check.ok) return ''
  return `⏰ 今日 ${category} 调用已达上限 (${check.used}/${check.limit}), 明天再来。`
}
