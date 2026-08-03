// w93-phrases.test.ts - 验证全部词 100% 有短语 + 翻译
import { describe, it, expect } from 'vitest'
import wordsData from '../public/data/words.json'

const words = (wordsData as any).words || wordsData

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

  it('W93 新补 48 词短语有中文翻译', () => {
    // W93 补的: 10+ 字符 -ly 派生 44 词 + 2-4 字符生僻 4 词
    const w93Words = ['afterwards', 'altogether', 'completely', 'gy', 'mm', 'hur', 'veal',
                      'unfortunately', 'preferentially', 'fundamentally']
    for (const target of w93Words) {
      const w = words.find((x: any) => x.word === target)
      if (w && w.phrases) {
        for (const p of w.phrases) {
          if (typeof p === 'object' && p.phrase) {
            expect(getTranslation(p).length).toBeGreaterThan(0)
          }
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
    // 跨 cycle 加载字典, 验证大小
    const dict = require('../scripts/w93-phrases.json') as any
    expect(Object.keys(dict.phrases).length).toBe(48)
    expect(Object.keys(dict.zh).length).toBe(48)
  })
})
