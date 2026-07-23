// Achievements.tsx - v1.3-F2 成就墙
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ACHIEVEMENTS,
  loadAchievementStats,
  getAchievementStatus,
  getUnlockedCount,
  getNextAchievement,
  type AchievementStats,
  type AchievementStatus,
  type AchievementType,
} from '../lib/achievements'

const TYPE_META: Record<AchievementType, { label: string; emoji: string; color: string }> = {
  streak: { label: '连续学习', emoji: '🔥', color: 'from-orange-400 to-red-500' },
  words: { label: '词量', emoji: '📖', color: 'from-blue-400 to-indigo-500' },
  errors: { label: '改错', emoji: '✏️', color: 'from-amber-400 to-yellow-500' },
  favorites: { label: '收藏', emoji: '⭐', color: 'from-pink-400 to-rose-500' },
}

export default function Achievements() {
  const [stats, setStats] = useState<AchievementStats | null>(null)
  const [activeType, setActiveType] = useState<AchievementType>('streak')

  useEffect(() => {
    loadAchievementStats().then(setStats)
  }, [])

  if (!stats) {
    return <div className="text-center text-stone-500 py-10">加载中...</div>
  }

  const unlocked = getUnlockedCount(stats)
  const total = ACHIEVEMENTS.length
  const ratio = unlocked / total
  const next = getNextAchievement(stats)

  // 当前 type 的成就
  const currentAchievements = ACHIEVEMENTS.filter(a => a.type === activeType)
    .map(a => getAchievementStatus(a, stats))

  return (
    <div className="space-y-6">
      {/* 顶部总览 */}
      <div>
        <h1 className="text-2xl font-bold mb-1">🏆 成就墙</h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm">
          你的每一次坚持, 都解锁一个新徽章
        </p>
      </div>

      {/* 进度卡片 */}
      <div className={`card bg-gradient-to-br ${TYPE_META[activeType].color} text-white`}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">
            {TYPE_META[activeType].emoji} {TYPE_META[activeType].label}
          </div>
          <div className="text-sm">
            <span className="text-2xl font-bold">{unlocked}</span>
            <span className="opacity-80"> / {total}</span>
          </div>
        </div>
        {/* 进度条 */}
        <div className="h-3 bg-white/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-500"
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
        <div className="text-xs opacity-80 mt-2">
          已解锁 {Math.round(ratio * 100)}% 的成就
        </div>
        {next && (
          <div className="mt-3 pt-3 border-t border-white/20 text-xs">
            🎯 下一成就: {next.achievement.emoji} <b>{next.achievement.title}</b>
            <span className="opacity-80 ml-1">
              ({next.progress}/{next.achievement.threshold} · {Math.round(next.ratio * 100)}%)
            </span>
          </div>
        )}
      </div>

      {/* 类型 Tab */}
      <div className="grid grid-cols-4 gap-2">
        {(Object.keys(TYPE_META) as AchievementType[]).map(t => {
          const meta = TYPE_META[t]
          const isActive = activeType === t
          const unlockedInType = ACHIEVEMENTS
            .filter(a => a.type === t)
            .map(a => getAchievementStatus(a, stats))
            .filter(s => s.unlocked).length
          const totalInType = ACHIEVEMENTS.filter(a => a.type === t).length
          return (
            <button
              key={t}
              onClick={() => setActiveType(t)}
              className={`p-3 rounded-lg border-2 transition ${
                isActive
                  ? `border-transparent bg-gradient-to-br ${meta.color} text-white`
                  : 'border-stone-200 dark:border-stone-700 hover:border-stone-300'
              }`}
            >
              <div className="text-2xl mb-1">{meta.emoji}</div>
              <div className="text-xs font-medium">{meta.label}</div>
              <div className="text-[10px] opacity-70">
                {unlockedInType}/{totalInType}
              </div>
            </button>
          )
        })}
      </div>

      {/* 成就网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {currentAchievements.map(s => (
          <AchievementCard key={s.achievement.id} status={s} />
        ))}
      </div>

      {/* 底部链接 */}
      <div className="text-center text-xs text-stone-500 dark:text-stone-400 py-4">
        💡 继续坚持, 下一个徽章在等你 ·{' '}
        <Link to="/" className="text-brand-600 hover:underline">
          回到首页
        </Link>
      </div>
    </div>
  )
}

function AchievementCard({ status }: { status: AchievementStatus }) {
  const { achievement: a, unlocked, progress, ratio } = status
  return (
    <div
      className={`card text-center p-4 transition-all ${
        unlocked
          ? 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-2 border-yellow-400 dark:border-yellow-600 achievement-unlocked'
          : 'opacity-60'
      }`}
    >
      <div className={`text-4xl mb-2 ${unlocked ? 'animate-bounce-slow' : 'grayscale'}`}>
        {unlocked ? a.emoji : '🔒'}
      </div>
      <div className={`font-bold text-sm ${unlocked ? 'text-amber-700 dark:text-amber-300' : 'text-stone-500'}`}>
        {a.title}
      </div>
      <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-1 mb-2">
        {a.desc}
      </div>
      {!unlocked && (
        <>
          <div className="h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all"
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
          <div className="text-[10px] text-stone-500 mt-1">
            {progress}/{a.threshold}
          </div>
        </>
      )}
      {unlocked && (
        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
          ✓ 已解锁
        </div>
      )}
    </div>
  )
}
