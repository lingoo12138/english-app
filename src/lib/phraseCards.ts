// phraseCards.ts - v1.36.0 W34 单词短语闪卡
// 复用 words.json phrases 字段, 给 CardReview 加短语模式
import type { Word } from '../types'

/** 短语卡片数据 */
export interface PhraseCard {
  wordId: string
  word: string  // 主词
  phrase: string
  phraseTranslation: string
  source: 'word' | 'customScene'  // 单词短语 or 自定义场景
}

/** 从 words.json 抽取所有短语 */
export function extractPhrasesFromWords(words: Word[]): PhraseCard[] {
  const cards: PhraseCard[] = []
  for (const w of words) {
    if (!w.phrases) continue
    for (const p of w.phrases.slice(0, 5)) {  // 每词最多 5 短语
      cards.push({
        wordId: w.id,
        word: w.word,
        phrase: p.phrase,
        phraseTranslation: p.translation,
        source: 'word',
      })
    }
  }
  return cards
}

/** 随机打乱 */
export function shuffleCards<T>(cards: T[]): T[] {
  const r = [...cards]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

/** 短语转 TTS 文本 (取 phrase 原句, 去 / 翻译部分) */
export function getPhraseTTS(phrase: string): string {
  const idx = phrase.indexOf('/')
  if (idx < 0) return phrase.trim() || phrase
  return phrase.slice(0, idx).trim() || phrase
}
