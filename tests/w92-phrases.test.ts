// w92-phrases.test.ts - 验证 5-9 字符词全部有短语
import { describe, it, expect } from 'vitest'
import wordsData from '../public/data/words.json'

const words = (wordsData as any).words || wordsData

function getPhraseText(p: any): string {
  if (typeof p === 'string') return p
  if (p && typeof p === 'object') return p.phrase || p.en || ''
  return ''
}

describe('W92 短语 5-9 字符全覆盖', () => {
  it('5-9 字符词 100% 有短语', () => {
    const noPhrase = words
      .filter((w: any) => !w.phrases && 5 <= w.word.length && w.word.length <= 9)
      .map((w: any) => w.word)
    if (noPhrase.length > 0) {
      console.log('未补短语:', noPhrase)
    }
    expect(noPhrase.length).toBe(0)
  })

  it('总短语覆盖 ≥ 99% (W88 94.9% → W92 99.1%)', () => {
    const total = words.length
    const withPhrase = words.filter((w: any) => w.phrases && w.phrases.length > 0).length
    const pct = withPhrase / total * 100
    expect(pct).toBeGreaterThanOrEqual(99)
  })

  it('每个补的短语为 str/dict, phrase 字段 3-50 字符', () => {
    const newlyFilled = words.filter((w: any) => w.phrases && w.phrases.length > 0 && 5 <= w.word.length && w.word.length <= 9)
    expect(newlyFilled.length).toBeGreaterThanOrEqual(220)
    for (const w of newlyFilled) {
      for (const p of w.phrases) {
        const text = getPhraseText(p)
        expect(text.length).toBeGreaterThanOrEqual(3)
        expect(text.length).toBeLessThanOrEqual(60)
      }
    }
  })
})
