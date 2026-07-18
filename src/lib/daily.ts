// 每日一句: 静态列表, 按日期取模
import type { DailySentence } from '../types'
import data from '../../public/data/daily.json'

const sentences = data as DailySentence[]

export function getTodaySentence(): DailySentence {
  const start = new Date('2024-01-01').getTime()
  const day = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24))
  return sentences[day % sentences.length]
}

export function getAllSentences(): DailySentence[] {
  return sentences
}
