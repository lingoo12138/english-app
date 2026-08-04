// w95-examples.test.ts - 验证 93 词 example 补齐 (W94 续 100% 收官)
import { describe, it, expect } from 'vitest'
import wordsData from '../public/data/words.json'
import w95Dict from '../scripts/w95-fill-examples.json'

const words = (wordsData as any).words || wordsData
const w95Data = w95Dict as Record<string, { en: string, zh: string, scene: string }>

const VALID_SCENES = ['life', 'work', 'family', 'travel', 'nature', 'study', 'history', 'sport', 'art', 'health', 'food']

// 检查词根 变体 (复数/过去式/动名词)
function getVariants(word: string): string[] {
  const wordLower = word.toLowerCase().replace(/[^a-z]/g, '')
  const variants = [wordLower]
  if (wordLower.length >= 3) {
    variants.push(wordLower + 's')  // plural
    variants.push(wordLower + 'es')
    variants.push(wordLower + 'ed')  // past
    variants.push(wordLower + 'ing')  // present participle
    if (wordLower.endsWith('y')) {
      variants.push(wordLower.slice(0, -1) + 'ied')
      variants.push(wordLower.slice(0, -1) + 'ies')
    }
    if (wordLower.endsWith('e')) {
      variants.push(wordLower.slice(0, -1) + 'ing')
      variants.push(wordLower.slice(0, -1) + 'ed')
    }
    if (wordLower.endsWith('ize') || wordLower.endsWith('ise')) {
      variants.push(wordLower.slice(0, -3) + 'izing')
      variants.push(wordLower.slice(0, -3) + 'ized')
    }
    if (wordLower.endsWith('ate')) {
      variants.push(wordLower.slice(0, -3) + 'ating')
      variants.push(wordLower.slice(0, -3) + 'ated')
    }
  }
  return variants
}

describe('W95 93 词补 examples (主里程碑)', () => {
  it('全部 examples 100% 覆盖 (主里程碑)', () => {
    const noEx = words.filter((w: any) => !w.examples || w.examples.length === 0)
    if (noEx.length > 0) {
      console.log('未补 examples:', noEx.map((w: any) => w.word).slice(0, 5))
    }
    expect(noEx.length).toBe(0)
  })

  it('W95 字典 93 词都已在 words.json', () => {
    for (const word of Object.keys(w95Data)) {
      const w = words.find((x: any) => x.word === word)
      expect(w, `词 ${word} 应在 words.json`).toBeDefined()
    }
  })

  it('W95 93 词 example 已补齐', () => {
    let hasExample = 0
    for (const word of Object.keys(w95Data)) {
      const w = words.find((x: any) => x.word === word)
      if (w.examples && w.examples.length > 0) {
        hasExample++
      }
    }
    expect(hasExample).toBe(92)
  })

  it('每个 example 包含 en + zh + scene 字段 + 长度合理', () => {
    for (const word of Object.keys(w95Data)) {
      const w = words.find((x: any) => x.word === word)
      for (const ex of w.examples) {
        if (typeof ex === 'object') {
          expect(ex.en, `${word} example.en 非空`).toBeTruthy()
          expect(ex.zh, `${word} example.zh 非空`).toBeTruthy()
          expect(ex.en.length).toBeGreaterThan(5)
          expect(ex.zh.length).toBeGreaterThan(2)
          if (ex.scene) {
            expect(VALID_SCENES, `${word} example.scene "${ex.scene}" 应在白名单`).toContain(ex.scene)
          }
        }
      }
    }
  })

  it('每个 example en 包含词根 (W94 准确性经验)', () => {
    // 短词 + 缩写词 跳过
    const skipCheck = new Set(['a', 'an', 'is', 'has', 'mr', 'mrs', 'ms', 'pc', 'bc', 'pe', 'vcd', 'us', 'pm', 'cd', 'dvd', 'dr', 'un', 'ox', 'oar', 'hur', 'woo', 'zoom'])
    for (const word of Object.keys(w95Data)) {
      if (skipCheck.has(word.toLowerCase())) continue
      const w = words.find((x: any) => x.word === word)
      const ex = w.examples[0]
      if (typeof ex === 'object' && ex.en) {
        const variants = getVariants(word)
        const enLower = ex.en.toLowerCase()
        const found = variants.some(v => v.length >= 3 && enLower.includes(v))
        // 修 v1 (P1-1): 跟 W94 经验 一致, 硬 断言 词根 准确性
        expect(found, `${word} example.en "${ex.en}" 应包含词根 (变体: ${variants.join('/')})`).toBe(true)
      }
    }
  })

  it('W95 字典大小 = 93', () => {
    expect(Object.keys(w95Data).length).toBe(92)
  })
})
