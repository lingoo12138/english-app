// w93-phrases.test.ts - 验证全部词 100% 有短语 + 翻译
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import wordsData from '../public/data/words.json'
import w93Dict from '../scripts/w93-phrases.json'

const words = (wordsData as any).words || wordsData
const w93Phrases = w93Dict.phrases as Record<string, string[]>

function getPhraseText(p: any): string {
  if (typeof p === 'string') return p
  if (p && typeof p === 'object') return p.phrase || p.en || ''
  return ''
}

function getTranslation(p: any): string {
  if (p && typeof p === 'object') return p.translation || p.zh || ''
  return ''
}

describe('W93 短语 100% 全覆盖 (主里程碑)', () => {
  it('所有词 100% 有短语 (W93 收官)', () => {
    const noPhrase = words
      .filter((w: any) => !w.phrases || w.phrases.length === 0)
      .map((w: any) => w.word)
    if (noPhrase.length > 0) {
      console.log('未补短语:', noPhrase)
    }
    expect(noPhrase.length).toBe(0)
  })

  it('总短语覆盖 100% (W88 94.9% → W92 99.1% → W93 100%)', () => {
    const total = words.length
    const withPhrase = words.filter((w: any) => w.phrases && w.phrases.length > 0).length
    const pct = withPhrase / total * 100
    expect(pct).toBe(100)
  })

  it('W93 字典 48 词都已在 words.json + 翻译非空', () => {
    for (const word of Object.keys(w93Phrases)) {
      const w = words.find((x: any) => x.word === word)
      expect(w, `词 ${word} 应在 words.json`).toBeDefined()
      expect(w.phrases, `${word} 短语非空`).toBeTruthy()
      expect(w.phrases.length, `${word} 短语数 > 0`).toBeGreaterThan(0)
      for (const p of w.phrases) {
        if (typeof p === 'object' && p.phrase) {
          const tr = getTranslation(p)
          expect(tr.length, `${word}:${p.phrase} 翻译非空`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('每个短语 3-60 字符 (兼容长短语)', () => {
    for (const w of words) {
      if (w.phrases) {
        for (const p of w.phrases) {
          const text = getPhraseText(p)
          expect(text.length).toBeGreaterThanOrEqual(3)
          expect(text.length).toBeLessThanOrEqual(60)
        }
      }
    }
  })

  it('W93 字典大小验证 (48 词)', () => {
    expect(Object.keys(w93Phrases).length).toBe(48)
  })
})
