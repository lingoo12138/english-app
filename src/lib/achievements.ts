// achievements.ts - v1.3-F2 成就定义 + 解锁逻辑
// 4 类 × 多级 = 16 个成就, 全部可达成
import { getTotalLearned, getAllFavorites, getAllWritingErrors } from './db'
import { getStreak, getTotalDays } from './streak'

export type AchievementType = 'streak' | 'words' | 'errors' | 'favorites'

export interface Achievement {
  id: string
  type: AchievementType
  level: number         // 1-6 (递进)
  threshold: number     // 解锁阈值
  title: string
  desc: string
  emoji: string
}

export interface AchievementStatus {
  achievement: Achievement
  unlocked: boolean
  progress: number      // 当前值
  ratio: number         // 0-1 进度比例
}

// === 16 个成就定义 ===
export const ACHIEVEMENTS: Achievement[] = [
  // 🔥 连续天数 (6 个)
  { id: 'streak-1', type: 'streak', level: 1, threshold: 1, title: '初次启航', desc: '连续学习 1 天', emoji: '🌱' },
  { id: 'streak-3', type: 'streak', level: 2, threshold: 3, title: '小有所成', desc: '连续学习 3 天', emoji: '🔥' },
  { id: 'streak-7', type: 'streak', level: 3, threshold: 7, title: '一周坚持', desc: '连续学习 7 天', emoji: '⭐' },
  { id: 'streak-30', type: 'streak', level: 4, threshold: 30, title: '月度习惯', desc: '连续学习 30 天', emoji: '🏆' },
  { id: 'streak-100', type: 'streak', level: 5, threshold: 100, title: '百日筑基', desc: '连续学习 100 天', emoji: '💎' },
  { id: 'streak-365', type: 'streak', level: 6, threshold: 365, title: '年度王者', desc: '连续学习 365 天', emoji: '👑' },

  // 📖 词量 (6 个)
  { id: 'words-10', type: 'words', level: 1, threshold: 10, title: '初识词汇', desc: '学过 10 个词', emoji: '📖' },
  { id: 'words-50', type: 'words', level: 2, threshold: 50, title: '词汇新秀', desc: '学过 50 个词', emoji: '📚' },
  { id: 'words-100', type: 'words', level: 3, threshold: 100, title: '百词斩', desc: '学过 100 个词', emoji: '💯' },
  { id: 'words-500', type: 'words', level: 4, threshold: 500, title: '词汇专家', desc: '学过 500 个词', emoji: '🎓' },
  { id: 'words-1000', type: 'words', level: 5, threshold: 1000, title: '千词大师', desc: '学过 1000 个词', emoji: '🌟' },
  { id: 'words-5000', type: 'words', level: 6, threshold: 5000, title: '词海无涯', desc: '学过 5000 个词', emoji: '🚀' },

  // ✏️ 错题 (3 个 — 比其他少, 因为改错难)
  { id: 'errors-1', type: 'errors', level: 1, threshold: 1, title: '正视错误', desc: '改完第 1 个错题', emoji: '🌱' },
  { id: 'errors-10', type: 'errors', level: 2, threshold: 10, title: '知错能改', desc: '改完 10 个错题', emoji: '✏️' },
  { id: 'errors-50', type: 'errors', level: 3, threshold: 50, title: '改错达人', desc: '改完 50 个错题', emoji: '📝' },
  { id: 'errors-200', type: 'errors', level: 4, threshold: 200, title: '改错专家', desc: '改完 200 个错题', emoji: '🏅' },

  // ⭐ 收藏 (4 个)
  { id: 'fav-10', type: 'favorites', level: 1, threshold: 10, title: '开始积累', desc: '收藏 10 个词', emoji: '⭐' },
  { id: 'fav-50', type: 'favorites', level: 2, threshold: 50, title: '词海拾贝', desc: '收藏 50 个词', emoji: '🌟' },
  { id: 'fav-200', type: 'favorites', level: 3, threshold: 200, title: '收藏家', desc: '收藏 200 个词', emoji: '💖' },
  { id: 'fav-1000', type: 'favorites', level: 4, threshold: 1000, title: '词汇宝库', desc: '收藏 1000 个词', emoji: '👑' },
]

export interface AchievementStats {
  streak: number
  totalDays: number
  words: number
  errors: number
  favorites: number
}

/** 聚合用户数据 */
export async function loadAchievementStats(): Promise<AchievementStats> {
  const [streak, totalDays, words, favorites, errors] = await Promise.all([
    getStreak(),
    getTotalDays(),
    getTotalLearned(),
    getAllFavorites(),
    getAllWritingErrors(),
  ])
  return {
    streak,
    totalDays,
    words,
    favorites: favorites.length,
    errors: errors.length,
  }
}

/** 获取某类型的当前值 */
function getStatValue(stats: AchievementStats, type: AchievementType): number {
  return {
    streak: stats.streak,
    words: stats.words,
    errors: stats.errors,
    favorites: stats.favorites,
  }[type]
}

/** 计算单个成就状态 */
export function getAchievementStatus(ach: Achievement, stats: AchievementStats): AchievementStatus {
  const current = getStatValue(stats, ach.type)
  const unlocked = current >= ach.threshold
  // ratio: 进度比例 (0-1)
  const ratio = unlocked ? 1 : Math.min(current / ach.threshold, 1)
  return { achievement: ach, unlocked, progress: current, ratio }
}

/** 计算所有成就状态 */
export function getAllAchievementStatus(stats: AchievementStats): AchievementStatus[] {
  return ACHIEVEMENTS.map(a => getAchievementStatus(a, stats))
}

/** 已解锁数 */
export function getUnlockedCount(stats: AchievementStats): number {
  return getAllAchievementStatus(stats).filter(s => s.unlocked).length
}

/** 下一个即将解锁的成就 (ratio 最高但未解锁) */
export function getNextAchievement(stats: AchievementStats): AchievementStatus | null {
  const locked = getAllAchievementStatus(stats).filter(s => !s.unlocked)
  if (locked.length === 0) return null
  return locked.sort((a, b) => b.ratio - a.ratio)[0]
}
