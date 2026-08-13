// src/lib/weeklyReport.ts — W147 学习周报 (v3 plan E-2)
// 业务: W146 telemetry 收集了真实数据, 周报可以基于真实数据生成
//   复用 LearnRecord (records 表) + PronunciationAttempt + Favorites + WritingErrors
//   输出: HTML (含 inline CSS, 可分享) + Markdown (复制粘贴用) + Top 5 词
//
// 设计原则:
//  - 0 网络 (全部本地数据聚合)
//  - 7 天聚合 (1 周)
//  - HTML inline CSS (跨平台兼容: 微信/微博/小红书粘贴可渲染)
//  - Markdown (Twitter / 博客)
//  - 0 emoji (用 Icon SVG)
//  - Top 5 词按 学+复习 综合排序

import type { LearnRecord } from '../types'
import { db, getAllFavorites, getTotalLearned } from './db'
import { loadWordsIndex } from './words'

// ============================================================
// 类型
// ============================================================

export interface WeeklyReportData {
  /** 报告期起 (ms epoch) */
  startTs: number
  /** 报告期止 (ms epoch) */
  endTs: number
  /** 周内学过的词数 (去重 wordId) */
  wordsLearned: number
  /** 周内 view 次数 */
  views: number
  /** 周内 favorite 次数 */
  favorites: number
  /** 周内 known 次数 (标记已掌握) */
  known: number
  /** 周内 unknown 次数 (标记不认识) */
  unknown: number
  /** 周内跟读尝试次数 */
  pronunciationAttempts: number
  /** 周内跟读平均分 (0-100, 0 表示无) */
  pronunciationAvgScore: number
  /** 周内错题数 (writingErrors) */
  errorCount: number
  /** 收藏数 (累计, 不限周内) */
  totalFavorites: number
  /** 学过词数 (累计) */
  totalLearned: number
  /** Top 5 词 (学+复习综合排序) */
  topWords: Array<{ word: string; translation: string; count: number }>
  /** 最活跃日 (YYYY-MM-DD) */
  mostActiveDay: string | null
  /** 报告生成时间 */
  generatedAt: number
}

// ============================================================
// 核心 API
// ============================================================

/** W147: 聚合最近 7 天的学习数据 → WeeklyReportData
 *  - 业务: 1 用户, 7 天数据聚合
 *  - 数据源: records (LearnRecord) + pronunciationAttempts + writingErrors + favorites
 */
export async function generateWeeklyReport(): Promise<WeeklyReportData> {
  const now = Date.now()
  const startTs = now - 7 * 24 * 60 * 60 * 1000
  const endTs = now

  // 1. LearnRecords 聚合 (records 表)
  const records = await db.records
    .where('timestamp').above(startTs)
    .toArray()

  // 按 wordId 去重 (学过的词)
  const uniqueWordIds = new Set(records.map(r => r.wordId).filter(id => id))
  const wordsLearned = uniqueWordIds.size

  // 按 action 类型统计
  const views = records.filter(r => r.action === 'view').length
  const favorites = records.filter(r => r.action === 'favorite').length
  const known = records.filter(r => r.action === 'known').length
  const unknown = records.filter(r => r.action === 'unknown').length

  // Top 5 词 (按学+复习综合: view+favorite+known+unknown 计数)
  const wordCounts: Record<string, number> = {}
  records.forEach(r => {
    if (!r.wordId) return
    if (r.action === 'view' || r.action === 'favorite' || r.action === 'known' || r.action === 'unknown') {
      wordCounts[r.wordId] = (wordCounts[r.wordId] || 0) + 1
    }
  })
  const topWordIds = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id)

  // 查 word 详情 (走 index, 不查全量 chunk)
  const index = await loadWordsIndex()
  const topWords = topWordIds.map(id => {
    const entry = index.find(e => e.id === id)
    return {
      word: entry?.word || id,
      translation: entry?.first_translation || '',
      count: wordCounts[id] || 0,
    }
  })

  // 最活跃日 (按 view 数)
  const dayViews: Record<string, number> = {}
  records.filter(r => r.action === 'view').forEach(r => {
    const day = new Date(r.timestamp).toISOString().slice(0, 10)
    dayViews[day] = (dayViews[day] || 0) + 1
  })
  const mostActiveDay = Object.entries(dayViews)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null

  // 2. PronunciationAttempts
  const attempts = await db.pronunciationAttempts
    .where('ts').above(startTs)
    .toArray()
  const pronunciationAttempts = attempts.length
  const pronunciationAvgScore = attempts.length > 0
    ? Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length)
    : 0

  // 3. WritingErrors
  const errors = await db.writingErrors
    .where('ts').above(startTs)
    .toArray()
  const errorCount = errors.length

  // 4. 累计 (用于对比)
  const [allFavorites, totalLearned] = await Promise.all([
    getAllFavorites(),
    getTotalLearned(),
  ])

  return {
    startTs,
    endTs,
    wordsLearned,
    views,
    favorites,
    known,
    unknown,
    pronunciationAttempts,
    pronunciationAvgScore,
    errorCount,
    totalFavorites: allFavorites.length,
    totalLearned,
    topWords,
    mostActiveDay,
    generatedAt: now,
  }
}

// ============================================================
// 输出格式
// ============================================================

/** W147: Markdown 输出 (Twitter / 博客 / 微信文字粘贴) */
export function renderMarkdownReport(data: WeeklyReportData): string {
  const lines: string[] = []
  lines.push('# 本周学习报告')
  lines.push('')
  lines.push(`> ${formatDate(data.startTs)} - ${formatDate(data.endTs)}`)
  lines.push('')
  lines.push('## 数据总览')
  lines.push('')
  lines.push(`- 学过词数: **${data.wordsLearned}** 词`)
  lines.push(`- 浏览次数: ${data.views}`)
  lines.push(`- 收藏: ${data.favorites}`)
  lines.push(`- 标记掌握: ${data.known}`)
  lines.push(`- 跟读次数: ${data.pronunciationAttempts} (平均分 ${data.pronunciationAvgScore})`)
  lines.push(`- 错题数: ${data.errorCount}`)
  if (data.mostActiveDay) {
    lines.push(`- 最活跃日: ${data.mostActiveDay}`)
  }
  lines.push('')
  if (data.topWords.length > 0) {
    lines.push('## Top 5 词')
    lines.push('')
    data.topWords.forEach((w, i) => {
      lines.push(`${i + 1}. **${w.word}** - ${w.translation} (${w.count} 次)`)
    })
    lines.push('')
  }
  lines.push('## 累计')
  lines.push('')
  lines.push(`- 累计学过: ${data.totalLearned} 词`)
  lines.push(`- 累计收藏: ${data.totalFavorites} 词`)
  lines.push('')
  lines.push('---')
  lines.push('*句刻 — 让英语在你想用的时候就能用上*')
  lines.push('https://lingoo12138.github.io/english-app/')
  return lines.join('\n')
}

/** W147: HTML 输出 (inline CSS, 跨平台: 微信/微博/小红书粘贴可渲染) */
export function renderHtmlReport(data: WeeklyReportData): string {
  const topWordsHtml = data.topWords.map((w, i) =>
    `<li style="margin: 4px 0;"><b>${escapeHtml(w.word)}</b> - ${escapeHtml(w.translation)} <span style="color: #888; font-size: 12px;">(${w.count} 次)</span></li>`
  ).join('')

  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border-radius: 16px; color: #1c1917;">
  <h1 style="margin: 0 0 8px; font-size: 24px; color: #166534;">本周学习报告</h1>
  <p style="margin: 0 0 16px; color: #57534e; font-size: 13px;">${formatDate(data.startTs)} - ${formatDate(data.endTs)}</p>

  <div style="background: white; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <h2 style="margin: 0 0 12px; font-size: 16px; color: #166534;">数据总览</h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr><td style="padding: 4px 0;">学过词数</td><td style="text-align: right; font-weight: bold; color: #166534;">${data.wordsLearned} 词</td></tr>
      <tr><td style="padding: 4px 0;">浏览次数</td><td style="text-align: right;">${data.views}</td></tr>
      <tr><td style="padding: 4px 0;">收藏</td><td style="text-align: right;">${data.favorites}</td></tr>
      <tr><td style="padding: 4px 0;">标记掌握</td><td style="text-align: right;">${data.known}</td></tr>
      <tr><td style="padding: 4px 0;">跟读</td><td style="text-align: right;">${data.pronunciationAttempts} 次 (平均 ${data.pronunciationAvgScore} 分)</td></tr>
      <tr><td style="padding: 4px 0;">错题</td><td style="text-align: right;">${data.errorCount}</td></tr>
      ${data.mostActiveDay ? `<tr><td style="padding: 4px 0;">最活跃日</td><td style="text-align: right;">${data.mostActiveDay}</td></tr>` : ''}
    </table>
  </div>

  ${topWordsHtml ? `<div style="background: white; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <h2 style="margin: 0 0 12px; font-size: 16px; color: #166534;">Top 5 词</h2>
    <ol style="margin: 0; padding-left: 20px; font-size: 14px;">${topWordsHtml}</ol>
  </div>` : ''}

  <div style="background: white; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <h2 style="margin: 0 0 8px; font-size: 14px; color: #166534;">累计</h2>
    <p style="margin: 0; font-size: 13px; color: #57534e;">学过 ${data.totalLearned} 词 · 收藏 ${data.totalFavorites} 词</p>
  </div>

  <p style="margin: 0; text-align: center; color: #a8a29e; font-size: 11px;">句刻 — 让英语在你想用的时候就能用上</p>
</div>`
}

// ============================================================
// 辅助
// ============================================================

function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** W147: 复制到剪贴板 (Markdown) */
export async function copyReportAsMarkdown(data: WeeklyReportData): Promise<boolean> {
  const md = renderMarkdownReport(data)
  try {
    await navigator.clipboard.writeText(md)
    return true
  } catch {
    return false
  }
}

/** W147: 下载 HTML 文件 */
export function downloadReportAsHtml(data: WeeklyReportData): void {
  const html = renderHtmlReport(data)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `weekly-report-${formatDate(data.endTs)}.html`
  a.click()
  URL.revokeObjectURL(url)
}

/** W147: Web Share API (移动端原生分享) */
export async function shareReport(data: WeeklyReportData): Promise<boolean> {
  const md = renderMarkdownReport(data)
  if (!navigator.share) return false
  try {
    await navigator.share({
      title: '本周学习报告',
      text: md,
    })
    return true
  } catch {
    return false
  }
}
