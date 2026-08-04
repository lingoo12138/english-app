// w94-examples.test.ts - 验证 89 词补 pos + example
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import wordsData from '../public/data/words.json'
import w94Dict from '../scripts/w94-fill-examples.json'

const words = (wordsData as any).words || wordsData
const w94Data = w94Dict as Record<string, { pos: string[], example: { en: string, zh: string, scene: string } }>

function getExampleText(p: any): string {
  if (typeof p === 'string') return p
  if (p && typeof p === 'object') return p.en || p.sentence || ''
  return ''
}

describe('W94 89 词补 pos + example', () => {
  it('89 词 pos 已补齐 (pos 100% 覆盖)', () => {
    for (const word of Object.keys(w94Data)) {
      const w = words.find((x: any) => x.word === word)
      expect(w, `词 ${word} 应在 words.json`).toBeDefined()
      expect(w.pos, `${word} pos 已补`).toBeDefined()
      expect(w.pos.length, `${word} pos 长度 > 0`).toBeGreaterThan(0)
    }
  })

  it('89 词 example 已补齐 (89 个 example 字段)', () => {
    let hasExample = 0
    for (const word of Object.keys(w94Data)) {
      const w = words.find((x: any) => x.word === word)
      if (w.examples && w.examples.length > 0) {
        hasExample++
      }
    }
    expect(hasExample).toBe(89)
  })

  it('每个 example 包含 en + zh 字段 + 长度合理', () => {
    for (const word of Object.keys(w94Data)) {
      const w = words.find((x: any) => x.word === word)
      for (const ex of w.examples) {
        if (typeof ex === 'object') {
          expect(ex.en, `${word} example.en 非空`).toBeTruthy()
          expect(ex.zh, `${word} example.zh 非空`).toBeTruthy()
          expect(ex.en.length).toBeGreaterThan(5)
          expect(ex.zh.length).toBeGreaterThan(2)
        }
      }
    }
  })

  it('pos 字典大小 = 89', () => {
    expect(Object.keys(w94Data).length).toBe(89)
  })

  it('全部词 pos 100% 覆盖 (主里程碑)', () => {
    const noPos = words.filter((w: any) => !w.pos || w.pos.length === 0)
    expect(noPos.length).toBe(0)
  })
})
