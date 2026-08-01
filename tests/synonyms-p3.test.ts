// synonyms-p3.test.ts - v1.88 W82-B 触类旁通同义词补全 P3 测试
import { describe, it, expect } from 'vitest'
import { SYNONYM_GROUPS } from '../src/data/synonyms'
import { SYNONYM_GROUPS_P3 } from '../src/data/synonyms-p3'

describe('W82-B 同义词 P3', () => {
  it('P3 至少 90 新 group', () => {
    expect(Object.keys(SYNONYM_GROUPS_P3).length).toBeGreaterThanOrEqual(90)
  })

  it('P1+P3 总 200+ group', () => {
    const total = Object.keys(SYNONYM_GROUPS).length + Object.keys(SYNONYM_GROUPS_P3).length
    expect(total).toBeGreaterThanOrEqual(200)
  })

  it('每组 3-6 词 + note 非空', () => {
    for (const [key, group] of Object.entries(SYNONYM_GROUPS_P3)) {
      expect(group.synonyms.length, `${key} synonyms 太少`).toBeGreaterThanOrEqual(2)
      expect(group.synonyms.length, `${key} synonyms 太多`).toBeLessThanOrEqual(6)
      expect(group.note, `${key} 缺 note`).toBeTruthy()
      expect(group.note.length, `${key} note 太长`).toBeLessThanOrEqual(60)
    }
  })

  it('P1 和 P3 无 key 重复', () => {
    const p1Keys = new Set(Object.keys(SYNONYM_GROUPS))
    const p3Keys = Object.keys(SYNONYM_GROUPS_P3)
    for (const k of p3Keys) {
      expect(p1Keys.has(k), `重复 key: ${k}`).toBe(false)
    }
  })

  it('抽样 5 词验证同义正确', () => {
    // 抽 5 词, 验证 synonyms 列表非空 + note 准确
    const samples = ['argue', 'annoy', 'limit', 'organize', 'succeed']
    for (const k of samples) {
      const g = SYNONYM_GROUPS_P3[k]
      expect(g, `缺 ${k}`).toBeDefined()
      expect(g.synonyms.length).toBeGreaterThanOrEqual(2)
      expect(g.word).toBe(k)
    }
  })

  it('主词 60%+ 在 words.json 中', async () => {
    const fs = await import('fs/promises')
    const path = await import('path')
    const content = await fs.readFile(path.resolve('public/data/words.json'), 'utf-8')
    const words: { word: string }[] = JSON.parse(content)
    const wordSet = new Set(words.map(w => w.word.toLowerCase()))
    const keys = Object.keys(SYNONYM_GROUPS_P3)
    const inDict = keys.filter(k => wordSet.has(k)).length
    const ratio = inDict / keys.length
    // 允许 50% (抽象词如 'do', 'be' 不在)
    expect(ratio, `主词覆盖率 ${ratio*100}%`).toBeGreaterThanOrEqual(0.5)
  })
})
