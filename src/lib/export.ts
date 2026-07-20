// 导出收藏生词为 CSV / JSON
import type { Word } from '../types'
import { getAllFavorites, db } from './db'
import { getWord } from './words'

export async function exportToCSV(): Promise<string> {
  const favs = await getAllFavorites()
  const words: Word[] = []
  for (const f of favs) {
    if (f.wordId.startsWith('daily-')) continue
    const w = await getWord(f.wordId)
    if (w) words.push(w)
  }

  // CSV 头部
  const headers = ['Word', 'Phonetic', 'POS', 'Translations', 'Tags', 'Level', 'AddedAt']
  const rows: string[][] = [headers]

  for (const w of words) {
    rows.push([
      w.word,
      w.phonetic || '',
      w.pos.join('/'),
      w.translations.join('; '),
      w.tags.join('; '),
      w.level,
      new Date().toISOString(),
    ])
  }

  // CSV 转义:含逗号/引号/换行/回车的字段加双引号
  // 修复: 防 CSV 注入(以 = + - @ 开头的单元格可能触发公式注入)
  // 修复: \r 换行也需要转义
  function escape(field: string): string {
    let safe = field
    // 防止 CSV 注入(Excel 打开时会公式执行)
    if (safe.length > 0 && /^[=+\-@\t\r]/.test(safe)) {
      safe = "'" + safe
    }
    if (safe.includes(',') || safe.includes('"') || safe.includes('\n') || safe.includes('\r')) {
      return '"' + safe.replace(/"/g, '""') + '"'
    }
    return safe
  }

  // CSV 文件头加 UTF-8 BOM,Excel 打开中文不乱码
  return '\uFEFF' + rows.map(row => row.map(escape).join(',')).join('\r\n')
}

export async function exportToJSON(): Promise<string> {
  const favs = await getAllFavorites()
  const words: (Word & { addedAt: number })[] = []
  for (const f of favs) {
    if (f.wordId.startsWith('daily-')) continue
    const w = await getWord(f.wordId)
    if (w) words.push({ ...w, addedAt: f.addedAt })
  }

  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    count: words.length,
    words,
  }, null, 2)
}

// 触发浏览器下载
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType + ';charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// 完整数据备份(收藏 + 复习计划 + 设置)
export async function exportFullBackup(): Promise<string> {
  const favorites = await db.favorites.toArray()
  const records = await db.records.toArray()
  const reviews = await db.reviews.toArray()
  const settings = localStorage.getItem('english-app-settings')

  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    favorites,
    records,
    reviews,
    settings,
  }, null, 2)
}
