// src/components/Skeleton.tsx - W120 反 馈 层: Skeleton 模 板 (替 "加 载 中..." 文 字)
import React from 'react'

// W120: 脉 冲 灰 色 卡 片, 用 motion token
// pulse 动 效: 1.5s 无 限, 跟 --t-slow + ease
export function Skeleton({ className = '', width, height }: { className?: string; width?: number | string; height?: number | string }) {
  return (
    <div
      className={`bg-stone-200 dark:bg-stone-700 rounded animate-pulse ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}

// W120: 词 卡 Skeleton (词 库 + 词 详 情 页 用)
export function SkeletonWordCard() {
  return (
    <div className="card-interactive p-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton width={120} height={20} />
          <Skeleton width={200} height={14} />
        </div>
        <Skeleton width={32} height={32} className="rounded-full" />
      </div>
    </div>
  )
}

// W120: 列 表 Skeleton (5 词 卡)
export function SkeletonWordList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonWordCard key={i} />
      ))}
    </div>
  )
}

// W120: Bento Grid Skeleton (主 页 用)
export function SkeletonMainCTA() {
  return (
    <div className="rounded-2xl bg-stone-200 dark:bg-stone-700 p-5 h-32 animate-pulse" />
  )
}

// W120: 整 页 fallback (Suspense 用)
export function SkeletonPage() {
  return (
    <div className="space-y-4 p-2">
      <SkeletonMainCTA />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton height={80} />
        <Skeleton height={80} />
        <Skeleton height={80} />
      </div>
      <SkeletonWordList count={3} />
    </div>
  )
}

// W149 反馈 20: 扫光版 Skeleton (从左到右 brand-500 半透明 1.2s 循环)
// 用法: <SkeletonShimmer height={80} />
export function SkeletonShimmer({ height = 16, className = '' }: { height?: number; className?: string }) {
  return (
    <div
      className={`skeleton-shimmer rounded ${className}`}
      style={{ height }}
      aria-label="加载中"
    />
  )
}
