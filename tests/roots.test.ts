// tests/roots.test.ts - v1.4-A2 词根覆盖率
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

const WORDS_PATH = 'public/data/words.json'

interface Word {
  id: string
  word: string
  roots?: Array<{ root: string; meaning: string; type: string }>
}

function loadWords(): Word[] {
  return JSON.parse(readFileSync(WORDS_PATH, 'utf-8'))
}

describe('roots 词根覆盖率 (v1.4-A2)', () => {
  it('全量覆盖率应 ≥ 80%', () => {
    const words = loadWords()
    const withRoots = words.filter(w => w.roots && w.roots.length > 0).length
    const ratio = withRoots / words.length
    expect(ratio).toBeGreaterThanOrEqual(0.80)
  })

  it('Top 2k 覆盖率应 ≥ 85%', () => {
    const words = loadWords()
    const top2k = words.slice(0, 2000)
    const withRoots = top2k.filter(w => w.roots && w.roots.length > 0).length
    const ratio = withRoots / top2k.length
    expect(ratio).toBeGreaterThanOrEqual(0.85)
  })

  it('每个有词根的词应至少 1 个词根', () => {
    const words = loadWords()
    const invalid = words.filter(w => w.roots && w.roots.length === 0)
    expect(invalid.length).toBe(0)
  })

  it('词根字段应有 root/meaning/type', () => {
    const words = loadWords()
    const sample = words.find(w => w.roots && w.roots.length > 0)
    if (sample) {
      const r = sample.roots![0]
      expect(r.root).toBeTruthy()
      expect(r.meaning).toBeTruthy()
      expect(['root', 'prefix', 'suffix']).toContain(r.type)
    }
  })

  it('常见高频词应有词根', () => {
    const words = loadWords()
    const common = ['happy', 'study', 'work', 'play', 'time', 'way', 'hand', 'year']
    for (const w of common) {
      const found = words.find(x => x.word === w)
      expect(found).toBeTruthy()
      if (found) {
        expect(found.roots).toBeTruthy()
        expect(found.roots!.length).toBeGreaterThan(0)
      }
    }
  })

  it('派生词应匹配 suffix', () => {
    const words = loadWords()
    // 验证常见派生词有 suffix 词根
    const derivations = ['teacher', 'actor', 'kindness', 'national']
    for (const w of derivations) {
      const found = words.find(x => x.word === w)
      expect(found, `${w} should exist`).toBeTruthy()
      if (found) {
        const suffixRoots = (found.roots || []).filter(r => r.type === 'suffix')
        expect(suffixRoots.length, `${w} should have suffix root`).toBeGreaterThan(0)
      }
    }
  })
})
