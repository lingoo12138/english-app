// 导出收藏生词为 CSV / JSON
// W128: 委托给 dataExport.ts 统一实现 (保证行为一致)
// W141: 动态 import dataExport (782 行) — 仅导出时加载
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

  // CSV 头部 (历史格式, 兼容老调用方)
  const fields = [
    { header: 'Word', getter: (w: Word) => w.word },
    { header: 'Phonetic', getter: (w: Word) => w.phonetic || '' },
    { header: 'POS', getter: (w: Word) => w.pos.join('/') },
    { header: 'Translations', getter: (w: Word) => w.translations.join('; ') },
    { header: 'Tags', getter: (w: Word) => w.tags.join('; ') },
    { header: 'Level', getter: (w: Word) => w.level },
    { header: 'AddedAt', getter: () => new Date().toISOString() },
  ]
  // W141: 动态 import — 仅当用户点 "导出 CSV" 时才加载 dataExport (782 行)
  const { toCSVWithBOM } = await import('./dataExport')
  // CSV 文件头加 UTF-8 BOM,Excel 打开中文不乱码
  return toCSVWithBOM(words, fields)
}

export async function exportToJSON(): Promise<string> {
  const favs = await getAllFavorites()
  const words: (Word & { addedAt: number })[] = []
  for (const f of favs) {
    if (f.wordId.startsWith('daily-')) continue
    const w = await getWord(f.wordId)
    if (w) words.push({ ...w, addedAt: f.addedAt })
  }

  // W141: 动态 import dataExport
  const { toJSON } = await import('./dataExport')
  return toJSON({
    version: 1,
    exportedAt: new Date().toISOString(),
    count: words.length,
    words,
  })
}

// 触发浏览器下载 (转发到 dataExport)
// W141: async — 动态 import dataExport
export async function downloadFile(content: string, filename: string, mimeType: string): Promise<void> {
  const { downloadFile: _downloadFile } = await import('./dataExport')
  _downloadFile(content, filename, mimeType)
}

// 完整数据备份(收藏 + 复习计划 + 设置)
// W128: 改用 exportAllData 返回的 bundle, 加 records/reviews
export async function exportFullBackup(): Promise<string> {
  const favorites = await db.favorites.toArray()
  const records = await db.records.toArray()
  const reviews = await db.reviews.toArray()
  const settings = localStorage.getItem('english-app-settings')

  // W141: 动态 import dataExport
  const { toJSON } = await import('./dataExport')
  return toJSON({
    version: 1,
    exportedAt: new Date().toISOString(),
    favorites,
    records,
    reviews,
    settings,
  })
}
