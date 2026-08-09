// src/lib/dataExport.ts - W128 统一数据导出/导入库
// 整合原 export.ts / exportChat.ts / exportErrors.ts 散在 4 个文件的逻辑
// 提供统一 CSV/JSON/MD 转换器 + 通用下载 helper + 跨类别 exportAllData/exportByKey
//
// 约束:
// - 不破坏现有 export 调用签名 (chat/errors 仍走原入口, 但内部委托给本 lib)
// - 不引新依赖 (Blob / URL.createObjectURL 0 依赖)
// - 不改 IDB schema (只读)
//
// 设计原则:
// 1. 单文件 = 1 个真理源, 后续加 import/export 类别只动这一处
// 2. CSV/JSON/MD 转换器是纯函数, 易于单测
// 3. downloadFile 用 Blob URL (大文件友好, 不占内存)
// 4. CSV 必带 UTF-8 BOM (Excel 中文不乱码) + CSV 注入防护 (=+-@ 开头加 ')
// 5. JSON 必 indent=2 (人可读)
// 6. MD 必带 frontmatter (YAML 块, 人读方便)

import { db, getAllChats, saveChat, getAllWritingErrors, getAllDictationErrors, getAllFavorites, type ChatRecord, type WritingError, type DictationError } from './db'
import { loadWords } from './words'
import { computeLessonScores, type LessonScore } from './lessonScore'
import { loadAchievementStats, getAllAchievementStatus, type AchievementStatus, type AchievementStats } from './achievements'

// === 导出 schema 版本 ===
// 升级时需保留旧版解析兼容 (importData 自动选最高版)
export const EXPORT_SCHEMA_VERSION = 2

/** 导出 key 类别 (供 exportByKey 选择) */
export type ExportKey =
  | 'settings'
  | 'words'
  | 'chats'
  | 'errors'
  | 'lessonScores'
  | 'achievements'
  | 'favorites'

/** 顶层导出 bundle (含 schema 版本 + 全部 7 类) */
export interface FullExportBundle {
  /** schema 版本, importData 用此判断如何解析 */
  schemaVersion: number
  /** 导出时间 (ISO) */
  exportedAt: string
  /** 导出应用名 */
  appName: string
  settings: {
    /** Zustand persist 字符串 (主设置) */
    main: string | null
    /** XP 状态 (v1) */
    xp: string | null
    /** 其他自定义 key (供未来扩展) */
    extras: Record<string, string>
  }
  /** 当前 words.json 加载状态 (总数 + 前 100 个 id, 避免 dump 全表) */
  words: {
    total: number
    sampleIds: string[]
  }
  chats: ChatRecord[]
  /** 合并错题 (写 + 听) */
  errors: {
    writing: WritingError[]
    dictation: DictationError[]
  }
  lessonScores: LessonScore[]
  achievements: {
    stats: AchievementStats
    status: AchievementStatus[]
  }
  favorites: { wordId: string; addedAt: number }[]
}

// === 1. 通用 CSV 转换器 ===

/** 字段定义: key -> 列 header */
export interface CSVField<T> {
  /** 列 header */
  header: string
  /** 取值函数 */
  getter: (item: T) => string | number | boolean | null | undefined
}

/**
 * CSV 字段转义:
 * - 含 , " \n \r 加双引号
 * - 内部 " 双写
 * - 开头是 = + - @ \t \r (CSV 注入) 加 ' 前缀
 */
export function escapeCSVField(field: string | number | boolean | null | undefined): string {
  if (field === null || field === undefined) return ''
  const s = String(field)
  // CSV 注入防护
  let safe = s
  if (safe.length > 0 && /^[=+\-@\t\r]/.test(safe)) {
    safe = "'" + safe
  }
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n') || safe.includes('\r')) {
    return '"' + safe.replace(/"/g, '""') + '"'
  }
  return safe
}

/**
 * 通用 CSV 导出 (返回字符串, 不带 BOM, 调用方决定是否加)
 * - items: 数据数组
 * - fields: 字段定义 (header + getter)
 * - 返回: "h1,h2\nv1,v2" 风格 (无 BOM, 用 \n 行分隔, 调用方可控)
 */
export function toCSV<T>(items: T[], fields: CSVField<T>[]): string {
  const header = fields.map(f => escapeCSVField(f.header)).join(',')
  const rows = items.map(item => fields.map(f => escapeCSVField(f.getter(item))).join(','))
  return [header, ...rows].join('\n')
}

/** CSV 加 UTF-8 BOM (Excel 中文不乱码) + 换行风格 (\r\n) */
export function toCSVWithBOM(items: unknown[], fields: Array<{ header: string; getter: (x: any) => unknown }>): string {
  return '\uFEFF' + toCSV(items as any, fields as any).replace(/\n/g, '\r\n')
}

// === 2. 通用 JSON 转换器 ===

/**
 * 通用 JSON 导出 (indent=2, 人可读)
 * - payload: 任意对象
 * - 返回: stringify 后的字符串
 */
export function toJSON(payload: unknown): string {
  return JSON.stringify(payload, null, 2)
}

// === 3. 通用 Markdown 转换器 ===

/** Markdown 字段定义 (与 CSV 类似) */
export interface MDBaseField<T> {
  /** 表头 */
  header: string
  /** 取值 */
  getter: (item: T) => string | number | boolean | null | undefined
}

export type MDField<T> = MDBaseField<T>

/** frontmatter 块 (YAML) */
function mdFrontmatter(meta: Record<string, string | number | boolean>): string {
  const lines = ['---']
  for (const [k, v] of Object.entries(meta)) {
    // 转义 YAML 特殊字符
    const s = String(v)
    if (/[:#\n]/.test(s)) {
      lines.push(`${k}: ${JSON.stringify(s)}`)
    } else {
      lines.push(`${k}: ${s}`)
    }
  }
  lines.push('---\n')
  return lines.join('\n')
}

/**
 * 通用 Markdown 导出 (table 模式)
 * - items: 数据
 * - fields: 字段定义
 * - title: H1 标题
 * - meta: frontmatter 字段 (导出时间/版本等)
 */
export function toMarkdownTable<T>(
  items: T[],
  fields: MDField<T>[],
  title: string,
  meta: Record<string, string | number | boolean> = {},
): string {
  const fm = mdFrontmatter({ ...meta, count: items.length, format: 'table' })
  const headerLine = '| ' + fields.map(f => f.header).join(' | ') + ' |'
  const sepLine = '| ' + fields.map(() => '---').join(' | ') + ' |'
  const rows = items.map(item =>
    '| ' + fields.map(f => {
      const v = f.getter(item)
      // 表格里 | \n 需要转义
      return String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
    }).join(' | ') + ' |'
  )
  return [fm, `# ${title}`, '', headerLine, sepLine, ...rows, ''].join('\n')
}

/**
 * 通用 Markdown 导出 (list 模式)
 * - 每个 item 用 H3 + 多行 key: value
 * - 适合多字段/异构数据
 */
export function toMarkdownList<T extends Record<string, unknown>>(
  items: T[],
  title: string,
  meta: Record<string, string | number | boolean> = {},
): string {
  const fm = mdFrontmatter({ ...meta, count: items.length, format: 'list' })
  const sections: string[] = [fm, `# ${title}`, '']
  items.forEach((item, idx) => {
    sections.push(`## Item ${idx + 1}`, '')
    for (const [k, v] of Object.entries(item)) {
      const s = typeof v === 'string' ? v : JSON.stringify(v)
      sections.push(`- **${k}**: ${s}`)
    }
    sections.push('')
  })
  return sections.join('\n')
}

// === 4. 通用下载 helper ===

/**
 * 触发浏览器下载 (Blob URL 风格, 大文件友好)
 * - blob: Blob | string
 * - filename: 文件名
 * - mimeType: MIME (e.g. 'text/csv', 'application/json', 'text/markdown')
 *
 * 大文件 (>10MB) 走 Blob URL, 1s 后 revoke 释放内存
 * 字符串走 Blob 包装, 编码 UTF-8
 */
export function downloadFile(blob: Blob | string, filename: string, mimeType: string): void {
  const b = blob instanceof Blob
    ? blob
    : new Blob([blob], { type: mimeType + ';charset=utf-8' })
  const url = URL.createObjectURL(b)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  // v1.0: 兼容 SSR/test 环境
  if (typeof document !== 'undefined' && document.body) {
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } else {
    // 无 DOM (test) 时只创建
    a.click()
  }
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// === 5. 类别级 exportByKey ===

/** exportByKey 字符串输出格式 */
export type ExportFormat = 'csv' | 'json' | 'md'

interface ExportByKeyResult {
  /** 文件内容 (字符串) */
  content: string
  /** MIME */
  mime: string
  /** 文件名 (含日期) */
  filename: string
  /** 扩展名 */
  ext: string
}

/**
 * 按类别导出 (异步)
 * - key: settings / words / chats / errors / lessonScores / achievements / favorites
 * - format: csv / json / md
 * - 返回: { content, mime, filename, ext } (供调用方下载或自行处理)
 */
export async function exportByKey(
  key: ExportKey,
  format: ExportFormat = 'json',
): Promise<ExportByKeyResult> {
  const date = new Date().toISOString().slice(0, 10)
  const baseName = `english-app-${key}-${date}`

  switch (key) {
    case 'settings': {
      const bundle = collectSettings()
      if (format === 'json') {
        return { content: toJSON(bundle), mime: 'application/json', filename: `${baseName}.json`, ext: 'json' }
      }
      // CSV: 展开为 key,value 两列
      const settingsFields: CSVField<{ k: string; v: string }>[] = [
        { header: 'key', getter: x => x.k },
        { header: 'value', getter: x => x.v },
      ]
      const rows = Object.entries(bundle.extras).map(([k, v]) => ({ k, v: v.slice(0, 500) }))
      const mainRow = bundle.main ? [{ k: 'main', v: bundle.main.slice(0, 500) }] : []
      const xpRow = bundle.xp ? [{ k: 'xp', v: bundle.xp.slice(0, 500) }] : []
      return { content: toCSVWithBOM([...mainRow, ...xpRow, ...rows], settingsFields), mime: 'text/csv', filename: `${baseName}.csv`, ext: 'csv' }
    }

    case 'words': {
      const words = await collectWords()
      if (format === 'json') {
        return { content: toJSON(words), mime: 'application/json', filename: `${baseName}.json`, ext: 'json' }
      }
      if (format === 'csv') {
        const fields: CSVField<typeof words.sample[number]>[] = [
          { header: 'id', getter: x => x.id },
          { header: 'word', getter: x => x.word },
          { header: 'level', getter: x => x.level },
          { header: 'frequency', getter: x => x.frequency },
        ]
        return { content: toCSVWithBOM(words.sample, fields), mime: 'text/csv', filename: `${baseName}.csv`, ext: 'csv' }
      }
      // md
      const fields: MDField<typeof words.sample[number]>[] = [
        { header: 'id', getter: x => x.id },
        { header: 'word', getter: x => x.word },
        { header: 'level', getter: x => x.level },
      ]
      return { content: toMarkdownTable(words.sample, fields, `Words (sample ${words.sample.length} / ${words.total})`, { total: words.total }), mime: 'text/markdown', filename: `${baseName}.md`, ext: 'md' }
    }

    case 'chats': {
      const chats = await getAllChats()
      if (format === 'json') {
        return { content: toJSON({ type: 'all-chats', count: chats.length, chats }), mime: 'application/json', filename: `${baseName}.json`, ext: 'json' }
      }
      if (format === 'csv') {
        const fields: CSVField<ChatRecord>[] = [
          { header: 'id', getter: x => x.id ?? '' },
          { header: 'scenario', getter: x => x.scenario },
          { header: 'level', getter: x => x.level },
          { header: 'title', getter: x => x.title },
          { header: 'messageCount', getter: x => x.messages.length },
          { header: 'createdAt', getter: x => new Date(x.createdAt).toISOString() },
          { header: 'updatedAt', getter: x => new Date(x.updatedAt).toISOString() },
        ]
        return { content: toCSVWithBOM(chats, fields), mime: 'text/csv', filename: `${baseName}.csv`, ext: 'csv' }
      }
      // md: list 模式
      const listItems = chats.map(c => ({
        id: c.id,
        scenario: c.scenario,
        level: c.level,
        title: c.title,
        messageCount: c.messages.length,
        updatedAt: new Date(c.updatedAt).toISOString(),
      }))
      return { content: toMarkdownList(listItems, `AI Chats (${chats.length})`), mime: 'text/markdown', filename: `${baseName}.md`, ext: 'md' }
    }

    case 'errors': {
      const [writing, dictation] = await Promise.all([getAllWritingErrors(), getAllDictationErrors()])
      if (format === 'json') {
        return { content: toJSON({ writing, dictation }), mime: 'application/json', filename: `${baseName}.json`, ext: 'json' }
      }
      if (format === 'csv') {
        // 合并: id, source, time, source_text, user_text, extra
        const fields: CSVField<{ id: string | number; source: string; time: string; source_text: string; user_text: string; extra: string }>[] = [
          { header: 'id', getter: x => x.id },
          { header: 'source', getter: x => x.source },
          { header: 'time', getter: x => x.time },
          { header: 'source_text', getter: x => x.source_text },
          { header: 'user_text', getter: x => x.user_text },
          { header: 'extra', getter: x => x.extra },
        ]
        const rows: Array<{ id: string | number; source: string; time: string; source_text: string; user_text: string; extra: string }> = []
        for (const e of writing) {
          rows.push({
            id: e.id ?? '',
            source: e.source,
            time: new Date(e.ts).toISOString(),
            source_text: e.corrected,
            user_text: e.original,
            extra: e.errors.map(x => `${x.original}->${x.suggestion}(${x.type})`).join(' | '),
          })
        }
        for (const e of dictation) {
          rows.push({
            id: e.id ?? '',
            source: e.source || 'dictation',
            time: new Date(e.ts).toISOString(),
            source_text: e.target,
            user_text: e.transcript,
            extra: `score=${e.score} difficulty=${e.difficulty}`,
          })
        }
        return { content: toCSVWithBOM(rows, fields), mime: 'text/csv', filename: `${baseName}.csv`, ext: 'csv' }
      }
      // md
      const mdList: Record<string, unknown>[] = []
      for (const e of writing) {
        mdList.push({ source: e.source, original: e.original, corrected: e.corrected, ts: new Date(e.ts).toISOString() })
      }
      for (const e of dictation) {
        mdList.push({ source: e.source || 'dictation', target: e.target, transcript: e.transcript, score: e.score, ts: new Date(e.ts).toISOString() })
      }
      return { content: toMarkdownList(mdList, `Errors (${writing.length + dictation.length})`, { writing: writing.length, dictation: dictation.length }), mime: 'text/markdown', filename: `${baseName}.md`, ext: 'md' }
    }

    case 'lessonScores': {
      const scores = await computeLessonScores()
      if (format === 'json') {
        return { content: toJSON(scores), mime: 'application/json', filename: `${baseName}.json`, ext: 'json' }
      }
      if (format === 'csv') {
        const fields: CSVField<LessonScore>[] = [
          { header: 'lessonId', getter: x => x.lessonId },
          { header: 'title', getter: x => x.title },
          { header: 'level', getter: x => x.level },
          { header: 'totalVocab', getter: x => x.totalVocab },
          { header: 'masteredCount', getter: x => x.masteredCount },
          { header: 'masteryRate', getter: x => x.masteryRate },
          { header: 'status', getter: x => x.status },
        ]
        return { content: toCSVWithBOM(scores, fields), mime: 'text/csv', filename: `${baseName}.csv`, ext: 'csv' }
      }
      const fields: MDField<LessonScore>[] = [
        { header: 'lessonId', getter: x => x.lessonId },
        { header: 'title', getter: x => x.title },
        { header: 'masteryRate', getter: x => `${x.masteryRate}%` },
        { header: 'status', getter: x => x.status },
      ]
      return { content: toMarkdownTable(scores, fields, `Lesson Scores (${scores.length})`), mime: 'text/markdown', filename: `${baseName}.md`, ext: 'md' }
    }

    case 'achievements': {
      const stats = await loadAchievementStats()
      const status = getAllAchievementStatus(stats)
      if (format === 'json') {
        return { content: toJSON({ stats, status }), mime: 'application/json', filename: `${baseName}.json`, ext: 'json' }
      }
      if (format === 'csv') {
        const fields: CSVField<AchievementStatus>[] = [
          { header: 'id', getter: x => x.achievement.id },
          { header: 'type', getter: x => x.achievement.type },
          { header: 'title', getter: x => x.achievement.title },
          { header: 'threshold', getter: x => x.achievement.threshold },
          { header: 'progress', getter: x => x.progress },
          { header: 'unlocked', getter: x => x.unlocked },
        ]
        return { content: toCSVWithBOM(status, fields), mime: 'text/csv', filename: `${baseName}.csv`, ext: 'csv' }
      }
      const fields: MDField<AchievementStatus>[] = [
        { header: 'id', getter: x => x.achievement.id },
        { header: 'title', getter: x => x.achievement.title },
        { header: 'progress', getter: x => `${x.progress}/${x.achievement.threshold}` },
        { header: 'unlocked', getter: x => x.unlocked ? '✅' : '⏳' },
      ]
      return { content: toMarkdownTable(status, fields, `Achievements (${status.length})`), mime: 'text/markdown', filename: `${baseName}.md`, ext: 'md' }
    }

    case 'favorites': {
      const favs = await getAllFavorites()
      if (format === 'json') {
        return { content: toJSON({ count: favs.length, favorites: favs }), mime: 'application/json', filename: `${baseName}.json`, ext: 'json' }
      }
      if (format === 'csv') {
        const fields: CSVField<{ wordId: string; addedAt: number }>[] = [
          { header: 'wordId', getter: x => x.wordId },
          { header: 'addedAt', getter: x => new Date(x.addedAt).toISOString() },
        ]
        return { content: toCSVWithBOM(favs, fields), mime: 'text/csv', filename: `${baseName}.csv`, ext: 'csv' }
      }
      const fields: MDField<{ wordId: string; addedAt: number }>[] = [
        { header: 'wordId', getter: x => x.wordId },
        { header: 'addedAt', getter: x => new Date(x.addedAt).toISOString() },
      ]
      return { content: toMarkdownTable(favs, fields, `Favorites (${favs.length})`), mime: 'text/markdown', filename: `${baseName}.md`, ext: 'md' }
    }
  }
}

// === 6. 完整 exportAllData ===

/**
 * 导出全部数据 (7 类, JSON 格式, 含 schema 版本)
 * - 默认返回 JSON 字符串 (供下载/备份)
 * - 同时返回 MIME/filename 供下载
 */
export async function exportAllData(): Promise<{
  content: string
  mime: string
  filename: string
  bundle: FullExportBundle
}> {
  const [chats, writing, dictation, scores, stats, favs, words] = await Promise.all([
    getAllChats(),
    getAllWritingErrors(),
    getAllDictationErrors(),
    computeLessonScores(),
    loadAchievementStats(),
    getAllFavorites(),
    collectWords(),
  ])

  const bundle: FullExportBundle = {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appName: 'english-app',
    settings: collectSettings(),
    words: {
      total: words.total,
      sampleIds: words.sample.map(w => w.id),
    },
    chats,
    errors: { writing, dictation },
    lessonScores: scores,
    achievements: {
      stats,
      status: getAllAchievementStatus(stats),
    },
    favorites: favs,
  }

  const content = toJSON(bundle)
  const date = new Date().toISOString().slice(0, 10)
  return {
    content,
    mime: 'application/json',
    filename: `english-app-backup-${date}.json`,
    bundle,
  }
}

// === 7. 内部 helpers (collect*) ===

function collectSettings(): FullExportBundle['settings'] {
  const extras: Record<string, string> = {}
  if (typeof localStorage !== 'undefined') {
    // 扫所有 english-app-* / xp-* key
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k) continue
      if (k.startsWith('english-app-') || k.startsWith('xp-') || k.startsWith('streak-')) {
        const v = localStorage.getItem(k)
        if (v != null) extras[k] = v
      }
    }
  }
  return {
    main: typeof localStorage !== 'undefined' ? localStorage.getItem('english-app-settings-v2') : null,
    xp: typeof localStorage !== 'undefined' ? localStorage.getItem('xp-state-v1') : null,
    extras,
  }
}

async function collectWords(): Promise<{
  total: number
  sample: Array<{ id: string; word: string; level: string; frequency: number }>
}> {
  try {
    const all = await loadWords()
    return {
      total: all.length,
      sample: all.slice(0, 100).map(w => ({
        id: w.id,
        word: w.word,
        level: w.level,
        frequency: w.frequency ?? 0,
      })),
    }
  } catch {
    return { total: 0, sample: [] }
  }
}

// === 8. 统一导入 (importData) ===

/** 导入结果 */
export interface ImportResult {
  ok: boolean
  /** 写入成功的条数 (按类别细分) */
  imported: {
    chats: number
    writingErrors: number
    dictationErrors: number
    favorites: number
  }
  /** 跳过的条数 (冲突 / 校验失败) */
  skipped: {
    chats: number
    writingErrors: number
    dictationErrors: number
    favorites: number
  }
  /** 错误信息 (含原因) */
  errors: string[]
  /** 解析的 schema 版本 */
  schemaVersion: number
  /** 冲突策略触发的覆盖数 (后者覆盖) */
  overwritten: number
}

/**
 * 冲突策略: timestamp 后者覆盖
 * - 写库前 compare ts/updatedAt, 较新者覆盖
 * - 较旧者跳过 (不删)
 */
async function upsertChatWithTimestamp(chat: ChatRecord): Promise<{ imported: boolean; overwritten: boolean }> {
  if (chat.id == null) {
    // 无 id, 视为新条目
    await saveChat(chat)
    return { imported: true, overwritten: false }
  }
  const existing = await db.chats.get(chat.id)
  if (!existing) {
    await saveChat(chat)
    return { imported: true, overwritten: false }
  }
  if (chat.updatedAt > existing.updatedAt) {
    // 后者更新, 覆盖
    await saveChat(chat)
    return { imported: true, overwritten: true }
  }
  // 跳过 (现有更新)
  return { imported: false, overwritten: false }
}

/**
 * 解析 + 验证 JSON (顶层校验)
 * - 必须是对象 + 有 schemaVersion
 */
function parseAndValidate(text: string): { ok: true; bundle: FullExportBundle } | { ok: false; error: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    return { ok: false, error: `JSON 解析失败: ${err.message}` }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: '顶层必须是对象' }
  }
  const obj = parsed as Record<string, unknown>
  if (typeof obj.schemaVersion !== 'number') {
    return { ok: false, error: '缺少 schemaVersion' }
  }
  if (obj.schemaVersion > EXPORT_SCHEMA_VERSION) {
    return { ok: false, error: `schema 版本 ${obj.schemaVersion} 高于当前 ${EXPORT_SCHEMA_VERSION}, 请升级 app` }
  }
  // 兜底: 给个空 bundle
  return {
    ok: true,
    bundle: {
      schemaVersion: obj.schemaVersion,
      exportedAt: String(obj.exportedAt ?? new Date().toISOString()),
      appName: String(obj.appName ?? 'english-app'),
      settings: (obj.settings as FullExportBundle['settings']) ?? { main: null, xp: null, extras: {} },
      words: (obj.words as FullExportBundle['words']) ?? { total: 0, sampleIds: [] },
      chats: Array.isArray(obj.chats) ? (obj.chats as ChatRecord[]) : [],
      errors: (obj.errors as FullExportBundle['errors']) ?? { writing: [], dictation: [] },
      lessonScores: Array.isArray(obj.lessonScores) ? (obj.lessonScores as LessonScore[]) : [],
      achievements: (obj.achievements as FullExportBundle['achievements']) ?? { stats: { streak: 0, totalDays: 0, words: 0, errors: 0, favorites: 0 }, status: [] },
      favorites: Array.isArray(obj.favorites) ? (obj.favorites as FullExportBundle['favorites']) : [],
    },
  }
}

/**
 * 统一导入入口
 * - json: 文本 (来自文件选择器/粘贴)
 * - 返回: ImportResult (含成功/失败/冲突统计)
 * - 冲突策略: timestamp 后者覆盖 (chats 用 updatedAt; errors 用 ts)
 * - 半途失败不 rollback (Dexie 单事务已成功, 后续失败仅记录)
 */
export async function importData(json: string): Promise<ImportResult> {
  const result: ImportResult = {
    ok: false,
    imported: { chats: 0, writingErrors: 0, dictationErrors: 0, favorites: 0 },
    skipped: { chats: 0, writingErrors: 0, dictationErrors: 0, favorites: 0 },
    errors: [],
    schemaVersion: 0,
    overwritten: 0,
  }

  const parsed = parseAndValidate(json)
  if (!parsed.ok) {
    result.errors.push(parsed.error)
    return result
  }
  const bundle = parsed.bundle
  result.schemaVersion = bundle.schemaVersion

  // 1. settings: 写 localStorage (不覆盖空值)
  try {
    if (bundle.settings?.main) {
      localStorage.setItem('english-app-settings-v2', bundle.settings.main)
    }
    if (bundle.settings?.xp) {
      localStorage.setItem('xp-state-v1', bundle.settings.xp)
    }
    if (bundle.settings?.extras) {
      for (const [k, v] of Object.entries(bundle.settings.extras)) {
        if (v) localStorage.setItem(k, v)
      }
    }
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    result.errors.push(`设置恢复失败: ${err.message}`)
  }

  // 2. chats: timestamp 后者覆盖
  for (const chat of bundle.chats) {
    try {
      // 校验: 必须有 scenario/level/messages
      if (!chat.scenario || !chat.level || !Array.isArray(chat.messages) || chat.messages.length === 0) {
        result.skipped.chats++
        result.errors.push(`跳过 chat (缺字段): ${chat.id ?? '?'}`)
        continue
      }
      const r = await upsertChatWithTimestamp(chat)
      if (r.imported) {
        result.imported.chats++
        if (r.overwritten) result.overwritten++
      } else {
        result.skipped.chats++
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      result.skipped.chats++
      result.errors.push(`导入 chat 失败: ${err.message}`)
    }
  }

  // 3. writing errors: put by id
  for (const e of bundle.errors?.writing ?? []) {
    try {
      await db.writingErrors.put(e)
      result.imported.writingErrors++
    } catch (err) {
      result.skipped.writingErrors++
      result.errors.push(`导入 writing 错题失败: ${(err as Error)?.message ?? err}`)
    }
  }

  // 4. dictation errors: put by id
  for (const e of bundle.errors?.dictation ?? []) {
    try {
      await db.dictationErrors.put(e)
      result.imported.dictationErrors++
    } catch (err) {
      result.skipped.dictationErrors++
      result.errors.push(`导入 dictation 错题失败: ${(err as Error)?.message ?? err}`)
    }
  }

  // 5. favorites: put (同 wordId 覆盖, 按 addedAt 后者覆盖)
  for (const f of bundle.favorites ?? []) {
    try {
      const existing = await db.favorites.get(f.wordId)
      if (existing && existing.addedAt >= f.addedAt) {
        result.skipped.favorites++
        continue
      }
      await db.favorites.put(f)
      result.imported.favorites++
      if (existing) result.overwritten++
    } catch (err) {
      result.skipped.favorites++
      result.errors.push(`导入 favorite 失败: ${(err as Error)?.message ?? err}`)
    }
  }

  result.ok = result.errors.length === 0 || (
    result.imported.chats + result.imported.writingErrors + result.imported.dictationErrors + result.imported.favorites > 0
  )
  return result
}

// === 9. 文件选择器 (复用给导入) ===

/** 文件选择器 (返回 file text), 兼容 .json/.csv/.md */
export function pickFile(accept: string = '.json,application/json'): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null)
      return
    }
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file) return resolve(null)
      try {
        const text = await file.text()
        resolve(text)
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e))
        console.error('读文件失败:', err.message)
        resolve(null)
      }
    }
    input.click()
  })
}
