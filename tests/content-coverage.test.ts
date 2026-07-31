// content-coverage.test.ts - v1.87 W81-A 内容覆盖率测试
// 1-4 字符词 100% 有 roots
import { describe, it, expect } from 'vitest'

interface Word {
  word: string
  roots?: { root: string; meaning: string; type: string }[]
}

const WORDS: Word[] = await (async () => {
  const fs = await import('fs/promises')
  const path = await import('path')
  const content = await fs.readFile(path.resolve('public/data/words.json'), 'utf-8')
  return JSON.parse(content)
})()

describe('W81-A 内容覆盖率', () => {
  it('1 字符词 100% 有 roots', () => {
    const w1 = WORDS.filter(w => w.word.length === 1)
    expect(w1.length).toBeGreaterThan(0)
    for (const w of w1) {
      expect(w.roots, `${w.word} 缺 roots`).toBeDefined()
      expect(w.roots!.length).toBeGreaterThan(0)
    }
  })

  it('2 字符词 100% 有 roots', () => {
    const w2 = WORDS.filter(w => w.word.length === 2)
    for (const w of w2) {
      expect(w.roots, `${w.word} 缺 roots`).toBeDefined()
      expect(w.roots!.length).toBeGreaterThan(0)
    }
  })

  it('3 字符词 100% 有 roots', () => {
    const w3 = WORDS.filter(w => w.word.length === 3)
    for (const w of w3) {
      expect(w.roots, `${w.word} 缺 roots`).toBeDefined()
      expect(w.roots!.length).toBeGreaterThan(0)
    }
  })

  it('4 字符词 100% 有 roots', () => {
    const w4 = WORDS.filter(w => w.word.length === 4)
    for (const w of w4) {
      expect(w.roots, `${w.word} 缺 roots`).toBeDefined()
      expect(w.roots!.length).toBeGreaterThan(0)
    }
  })

  it('总体覆盖率 95%+ (v1.87 后)', () => {
    const withRoots = WORDS.filter(w => w.roots && w.roots.length > 0)
    const ratio = withRoots.length / WORDS.length
    expect(ratio).toBeGreaterThanOrEqual(0.95)
  })
})
