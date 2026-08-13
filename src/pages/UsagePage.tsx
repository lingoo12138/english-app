// src/pages/UsagePage.tsx — W146 反馈回路 (v3 plan E-1)
// "我的使用" dashboard — 折线图 (30 天学习天数) + 条形图 (功能使用频次) + 导出 JSON
// 业务: 用户自己看自己的使用数据, 同时可导出作为个人备份
//
// 设计原则:
//  - 0 emoji
//  - 30 天折线图 (inline SVG, 无依赖)
//  - 功能使用横向条形图
//  - "导出 JSON" 按钮 (1 键复制 / 下载)
//  - 复用 telemetry.ts API
//  - 不破 hard 约束

import { useState, useEffect } from 'react'
import { getDailyCounts, getEventCounts, exportTelemetryAsJSON, clearAllTelemetry, getAllEvents } from '../lib/telemetry'
import { IconChart, IconDownload, IconTrash, IconArrow } from '../components/Icon'

export default function UsagePage() {
  const [daily, setDaily] = useState<Record<string, number>>({})
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    const [d, c, events] = await Promise.all([
      getDailyCounts(30),
      getEventCounts(),
      getAllEvents(),
    ])
    setDaily(d)
    setCounts(c)
    setTotal(events.length)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // 导出
  const handleExport = async () => {
    const json = await exportTelemetryAsJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `telemetry-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 清空 (二次确认)
  const handleClear = async () => {
    if (!confirm('确定清空所有使用数据? 此操作不可恢复。')) return
    await clearAllTelemetry()
    await loadData()
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-bold">我的使用</h1>
        <p className="text-stone-500">加载中...</p>
      </div>
    )
  }

  // 30 天日期列表 (YYYY-MM-DD, 倒序)
  const today = new Date()
  const days: string[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  const maxDaily = Math.max(1, ...days.map(d => daily[d] || 0))

  // 功能使用排序 top 10
  const topCounts = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
  const maxCount = Math.max(1, ...topCounts.map(([, v]) => v))

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <IconChart size={24} aria-hidden="true" />
          我的使用
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={total === 0}
            className="min-h-10 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 flex items-center gap-1"
            data-testid="usage-export"
          >
            <IconDownload size={16} aria-hidden="true" />
            导出
          </button>
          <button
            onClick={handleClear}
            disabled={total === 0}
            className="min-h-10 px-3 py-2 rounded-lg text-sm font-medium bg-stone-100 dark:bg-stone-700 hover:bg-rose-100 dark:hover:bg-rose-900/30 hover:text-rose-700 disabled:opacity-50 flex items-center gap-1"
            data-testid="usage-clear"
          >
            <IconTrash size={16} aria-hidden="true" />
            清空
          </button>
        </div>
      </div>

      {/* 总数 */}
      <div className="grid grid-cols-3 gap-3" data-testid="usage-stats">
        <div className="card text-center">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{total}</div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">事件总数</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {Object.keys(daily).length}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">活跃天数 (30天)</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {Object.keys(counts).length}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">不同事件</div>
        </div>
      </div>

      {/* 30 天折线图 */}
      <section className="card">
        <h2 className="text-base font-semibold mb-3">30 天活动</h2>
        <div className="flex items-end gap-0.5 h-32" data-testid="usage-chart-daily">
          {days.map(d => {
            const v = daily[d] || 0
            const h = maxDaily > 0 ? (v / maxDaily) * 100 : 0
            return (
              <div
                key={d}
                className="flex-1 bg-emerald-500 dark:bg-emerald-400 rounded-t hover:bg-emerald-600 transition-colors"
                style={{ height: `${h}%`, minHeight: v > 0 ? '4px' : '1px' }}
                title={`${d}: ${v} 事件`}
              />
            )
          })}
        </div>
        <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400 mt-2">
          <span>{days[0]}</span>
          <span>今天</span>
        </div>
      </section>

      {/* 功能使用 top 10 */}
      <section className="card">
        <h2 className="text-base font-semibold mb-3">功能使用 (Top 10)</h2>
        {topCounts.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400 py-4 text-center">
            还没有数据, 多用用句刻再回来看
          </p>
        ) : (
          <div className="space-y-2" data-testid="usage-chart-features">
            {topCounts.map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-sm">
                <div className="w-32 truncate text-stone-600 dark:text-stone-400" title={k}>
                  {k}
                </div>
                <div className="flex-1 h-6 bg-stone-100 dark:bg-stone-700 rounded">
                  <div
                    className="h-full bg-emerald-500 dark:bg-emerald-400 rounded flex items-center justify-end px-2 text-xs text-white font-medium"
                    style={{ width: `${(v / maxCount) * 100}%`, minWidth: '32px' }}
                  >
                    {v}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs text-stone-500 dark:text-stone-400 text-center">
        所有数据仅保存在本地浏览器, 不会上传到云端。
      </p>
    </div>
  )
}
