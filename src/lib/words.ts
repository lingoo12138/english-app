// 加载词库
import type { Word } from '../types'

let cached: Word[] | null = null

export async function loadWords(): Promise<Word[]> {
  if (cached) return cached
  try {
    const res = await fetch('/data/words.json')
    cached = await res.json()
    return cached!
  } catch (e) {
    console.error('词库加载失败', e)
    return []
  }
}

export async function getWord(id: string): Promise<Word | undefined> {
  const words = await loadWords()
  return words.find(w => w.id === id)
}

export async function searchWords(query: string, level?: string): Promise<Word[]> {
  const words = await loadWords()
  const q = query.trim().toLowerCase()
  return words.filter(w => {
    const matchQ = !q || w.word.toLowerCase().includes(q) || w.translations.some(t => t.includes(q))
    const matchLevel = !level || level === 'all' || w.level === level
    return matchQ && matchLevel
  })
}

export const LEVELS = [
  { value: 'all', label: '全部', color: 'bg-stone-500' },
  { value: 'primary', label: '小学', color: 'bg-pink-500' },
  { value: 'junior', label: '初中', color: 'bg-orange-500' },
  { value: 'senior', label: '高中', color: 'bg-amber-500' },
  { value: 'gaozhong', label: '高考', color: 'bg-amber-600' },
  { value: 'cet4', label: 'CET-4', color: 'bg-sky-500' },
  { value: 'cet6', label: 'CET-6', color: 'bg-blue-500' },
  { value: 'kaoyan', label: '考研', color: 'bg-indigo-500' },
  { value: 'daily', label: '日常', color: 'bg-emerald-500' },
] as const
