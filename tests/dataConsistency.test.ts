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
