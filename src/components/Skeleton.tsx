// W6: Loading skeleton + EmptyState 通用组件
import type { ReactNode } from 'react'

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="card animate-pulse" role="status" aria-label="加载中">
      <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-1/3 mb-3" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-3 bg-stone-200 dark:bg-stone-700 rounded mb-2" style={{ width: `${80 - i * 10}%` }} />
      ))}
      <span className="sr-only">加载中...</span>
    </div>
  )
}

export function EmptyState({
  icon = '📭',
  title = '暂无数据',
  description,
  action,
}: {
  icon?: string
  title?: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="card text-center py-8" role="status">
      <div className="text-5xl mb-3" aria-hidden="true">{icon}</div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">{description}</p>
      )}
      {action}
    </div>
  )
}

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size]
  return (
    <div
      className={`${sizeClass} border-2 border-stone-300 dark:border-stone-600 border-t-brand-500 rounded-full animate-spin`}
      role="status"
      aria-label="加载中"
    >
      <span className="sr-only">加载中...</span>
    </div>
  )
}
