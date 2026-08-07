// dataConsistency.test.ts - 数据 一致性 校验 测试 (W101)
import { describe, it, expect } from 'vitest'
import { checkWordConsistency, checkAllWords, summarizeIssues } from '../src/lib/dataConsistency'
import type { Word } from '../src/types'

const base: Word = {
  id: 'w-test', word: 'test', translations: ['测试'], pos: ['n'],
  roots: [{ root: 'test', meaning: '试' }],
  tags: [], level: 'daily', difficulty: 1, frequency: 100,
  examples: [{ en: 'A test.', zh: '一个测试。' }],
  phrases: [{ phrase: 'test run', translation: '测试运行' }],
}

describe('W101 数据 一致性 校验', () => {
  it('合规 词 - 无 issue', () => {
    expect(checkWordConsistency(base)).toEqual([])
  })

  it('词性 长形式 (noun) 报 issue', () => {
    const w = { ...base, pos: ['noun'] }
    const issues = checkWordConsistency(w)
    expect(issues.some(i => i.type === 'pos_format')).toBe(true)
  })

  it('词性 短形式 (n/v/adj/adv) 通过', () => {
    const w = { ...base, pos: ['n', 'v', 'adj', 'adv'] }
    expect(checkWordConsistency(w)).toEqual([])
  })

  it('vt/vi 旧 格式 容许', () => {
    const w = { ...base, pos: ['vt', 'vi'] }
    expect(checkWordConsistency(w)).toEqual([])
  })

  it('& 旧 格式 容许', () => {
    const w = { ...base, pos: ['n', '&', 'v'] }
    expect(checkWordConsistency(w)).toEqual([])
  })

  it('空 释义 报 issue', () => {
    const w = { ...base, translations: [] }
    const issues = checkWordConsistency(w)
    expect(issues.some(i => i.type === 'missing_translation')).toBe(true)
  })

  it('空 例句 报 issue', () => {
    const w = { ...base, examples: [] }
    const issues = checkWordConsistency(w)
    expect(issues.some(i => i.type === 'empty_examples')).toBe(true)
  })

  it('空 短语 报 issue', () => {
    const w = { ...base, phrases: [] }
    const issues = checkWordConsistency(w)
    expect(issues.some(i => i.type === 'empty_phrases')).toBe(true)
  })

  it('空 词根 不 报 issue (业务 允许)', () => {
    const w = { ...base, roots: [] }
    expect(checkWordConsistency(w)).toEqual([])
  })

  it('批量 校验', () => {
    const words: Word[] = [base, { ...base, id: 'w-bad', pos: ['noun'] }, { ...base, id: 'w-bad2', translations: [] }]
    const issues = checkAllWords(words)
    expect(issues.length).toBe(2)
  })

  it('summarizeIssues 按 type', () => {
    const issues = checkAllWords([base, { ...base, id: 'w-bad', pos: ['noun'] }])
    const summary = summarizeIssues(issues)
    expect(summary.pos_format).toBe(1)
  })
})

// W105 修 v1: valid_pos 扩展 + words.json 5,423 词 自动化 测 试
import { readFileSync } from 'fs'
import wordsData from '../public/data/words.json'

describe('W105 修 v1 valid_pos 扩展 + 5,423 词 自动化', () => {
  it('valid_pos 含 det (限定词, 牛津 标 this/that)', () => {
    // 业务: 兼容 牛津/朗文 词性
    const lib = readFileSync('src/lib/dataConsistency.ts', 'utf-8')
    expect(lib).toContain("'det'")
  })

  it('valid_pos 含 pl (复数 标记)', () => {
    const lib = readFileSync('src/lib/dataConsistency.ts', 'utf-8')
    expect(lib).toContain("'pl'")
  })

  it('5,423 词 0 issue (P1-5 自动化 测 试)', () => {
    // 业务: 跑 真实 words.json, 0 issue 校验 PASS
    const issues = checkAllWords(wordsData as any)
    if (issues.length > 0) {
      console.error('W105 5,423 词 issues:', issues.slice(0, 5))
    }
    expect(issues.length).toBe(0)
  })

  it('5,423 词 ≥ 5400 (防 误 删)', () => {
    // 业务: 词库 数据 不 减
    expect(wordsData.length).toBeGreaterThanOrEqual(5400)
  })

  it('每 词 至少 1 释义', () => {
    // 业务: 5 类型 校验 - 释义 不 空
    for (const w of wordsData) {
      expect(w.translations.length).toBeGreaterThan(0)
    }
  })
})

// W111 修: dataConsistency 库 完 善 (P2-4/P3-1/P3-2/P2-5 修)
describe('W111 dataConsistency 库 完 善', () => {
  it('ConsistencyIssueType 提 取, 4 类型 (empty_roots 删)', () => {
    // 业务: empty_roots 死 type 删
    const lib = readFileSync('src/lib/dataConsistency.ts', 'utf-8')
    expect(lib).toContain('export type ConsistencyIssueType')
    expect(lib).not.toContain("'empty_roots'")
  })

  it('注 解 修 改 (W94 业务 允许 空 词根)', () => {
    // 业务: 注 解 矛盾 修
    const lib = readFileSync('src/lib/dataConsistency.ts', 'utf-8')
    expect(lib).toMatch(/5\. 词根: 业务 允许 空/)
  })

  it('package.json 含 check:data npm script', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'))
    expect(pkg.scripts['check:data']).toBe('tsx scripts/w101_check.ts')
  })
})
