// xpSystem.ts - v1.43.0 W43-B 学习游戏化 XP 体系
// XP/level 计算 + 等级表 + 升级检测
// 持久化: localStorage 单 key 'xp-state-v1' (与 plan.ts 风格一致, 避免 IDB schema 升级)
//
// XP 来源:
//   - 学词 LEARN     +5
//   - 复习 REVIEW    +3
//   - 连续 STREAK    +10 (由调用方控制时机, 避免重复发)
//   - 答对 ANSWER    +2
//   - 收藏 FAVORITE  +1
//
// 等级: 1-10 (新手/学徒/学人/学者/学师/学宗/学仙/学圣/学神/学帝)

/** XP 奖励常量 */
export const XP_REWARDS = {
  LEARN: 5,
  REVIEW: 3,
  STREAK: 10,
  ANSWER: 2,
  FAVORITE: 1,
} as const

export type XPRewardReason = keyof typeof XP_REWARDS

/** 10 级阈值: 进入 L 的最低 XP (L=1→0, L=2→50, ...) */
export const LEVEL_THRESHOLDS: number[] = [0, 50, 150, 300, 500, 800, 1200, 1700, 2300, 3000]

/** 10 级称号 */
export const LEVEL_TITLES: string[] = [
  '新手',   // L1
  '学徒',   // L2
  '学人',   // L3
  '学者',   // L4
  '学师',   // L5
  '学宗',   // L6
  '学仙',   // L7
  '学圣',   // L8
  '学神',   // L9
  '学帝',   // L10
]

const STORAGE_KEY = 'xp-state-v1'

export interface XPHistoryItem {
  ts: number
  amount: number
  reason: XPRewardReason
}

export interface XPState {
  totalXP: number
  history: XPHistoryItem[]
}

export interface XPCurrentState {
  totalXP: number
  level: number                // 1-10
  levelTitle: string           // 当前称号
  nextLevelXP: number          // 下一级所需 XP (满级 = 当前 totalXP)
  nextLevelThreshold: number   // 下一级阈值 (满级 = 同 current)
  currentLevelThreshold: number // 当前级阈值
  progress: number             // 0-1, 当前级内进度
  isMaxLevel: boolean
}

export interface AddXPResult {
  totalXP: number
  level: number
  leveledUp: boolean
  prevLevel: number
}

/** 安全读 localStorage */
function readState(): XPState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { totalXP: 0, history: [] }
    const data = JSON.parse(raw) as Partial<XPState>
    const totalXP = typeof data.totalXP === 'number' && data.totalXP >= 0 ? data.totalXP : 0
    const history = Array.isArray(data.history)
      ? data.history
          .filter((h): h is XPHistoryItem =>
            !!h && typeof h.ts === 'number' && typeof h.amount === 'number' && typeof h.reason === 'string',
          )
          // 仅保留最近 200 条, 防止 localStorage 膨胀
          .slice(-200)
      : []
    return { totalXP, history }
  } catch (e) {
    // P1 修: 显式 catch 报警
    console.warn('xpSystem: readState 失败 (corrupted?):', e)
    return { totalXP: 0, history: [] }
  }
}

/** 安全写 localStorage */
function writeState(state: XPState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('xpSystem: writeState 失败 (quota?):', e)
  }
}

/** 根据 totalXP 算当前等级 (1-10) */
export function getLevel(totalXP: number): number {
  let level = 1
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) {
      level = i + 1
    } else {
      break
    }
  }
  return level
}

/** 计算完整 XP 状态 (UI 用) */
export function getXPState(): XPCurrentState {
  const { totalXP } = readState()
  return computeStateFromXP(totalXP)
}

/** 纯函数: 给定 totalXP, 算出 UI 状态 (便于测试) */
export function computeStateFromXP(totalXP: number): XPCurrentState {
  const level = getLevel(totalXP)
  const idx = level - 1
  const currentLevelThreshold = LEVEL_THRESHOLDS[idx]
  const isMaxLevel = level >= LEVEL_THRESHOLDS.length
  const nextLevelThreshold = isMaxLevel
    ? currentLevelThreshold
    : LEVEL_THRESHOLDS[idx + 1]
  const nextLevelXP = isMaxLevel
    ? totalXP
    : Math.max(0, nextLevelThreshold - totalXP)
  const span = nextLevelThreshold - currentLevelThreshold
  const progress = isMaxLevel
    ? 1
    : span > 0
      ? Math.min(1, Math.max(0, (totalXP - currentLevelThreshold) / span))
      : 1
  return {
    totalXP,
    level,
    levelTitle: LEVEL_TITLES[idx] || LEVEL_TITLES[0],
    nextLevelXP,
    nextLevelThreshold,
    currentLevelThreshold,
    progress,
    isMaxLevel,
  }
}

/**
 * 加 XP — 持久化 + 检测升级
 * @param amount XP 增量(必须 > 0)
 * @param reason 来源
 * @returns 升级检测结果
 */
export async function addXP(amount: number, reason: XPRewardReason): Promise<AddXPResult> {
  if (amount <= 0) {
    return { totalXP: readState().totalXP, level: getLevel(readState().totalXP), leveledUp: false, prevLevel: getLevel(readState().totalXP) }
  }
  const prev = readState()
  const prevLevel = getLevel(prev.totalXP)
  const newTotal = prev.totalXP + amount
  const newLevel = getLevel(newTotal)
  const leveledUp = newLevel > prevLevel
  const next: XPState = {
    totalXP: newTotal,
    history: [...prev.history, { ts: Date.now(), amount, reason }].slice(-200),
  }
  writeState(next)
  return { totalXP: newTotal, level: newLevel, leveledUp, prevLevel }
}

/** 重置 XP (测试 / 用户主动重置时用) */
export function resetXP(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (e) {
    console.warn('xpSystem: resetXP 失败:', e)
  }
}
