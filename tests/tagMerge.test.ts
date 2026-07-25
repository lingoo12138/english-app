// tests/tagMerge.test.ts - v1.25.0 W26 tag 合并/重命名
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../src/lib/db'
import { renameTag, mergeTags, findSimilarTags } from '../src/lib/wordTags'
import { addWordTag } from '../src/lib/db'

describe('tagMerge (v1.25.0-W26)', () => {
  beforeEach(async () => {
    await db.wordTags.clear()
  })

  describe('renameTag', () => {
    it('重命名 tag 返回受影响数', async () => {
      await addWordTag('w1', 'travel')
      await addWordTag('w2', 'travel')
      await addWordTag('w3', 'food')
      const n = await renameTag('travel', 'journey')
      expect(n).toBe(2)
      const newCount = await db.wordTags.where('tag').equals('journey').count()
      expect(newCount).toBe(2)
      const oldCount = await db.wordTags.where('tag').equals('travel').count()
      expect(oldCount).toBe(0)
    })

    it('同 old/new → 0 改动', async () => {
      await addWordTag('w1', 'food')
      const n = await renameTag('food', 'food')
      expect(n).toBe(0)
    })

    it('无效 tag → 0', async () => {
      expect(await renameTag('', 'food')).toBe(0)
      expect(await renameTag('food', '')).toBe(0)
    })

    it('不存在 → 0', async () => {
      const n = await renameTag('nope', 'food')
      expect(n).toBe(0)
    })
  })

  describe('mergeTags', () => {
    it('合并无重复 → 全部改', async () => {
      await addWordTag('w1', 'travel')
      await addWordTag('w2', 'travel')
      const r = await mergeTags('travel', 'journey')
      expect(r.removed).toBe(0)
      expect(r.merged).toBe(2)
    })

    it('合并有重复 → 删 source 保留 target', async () => {
      await addWordTag('w1', 'travel')
      await addWordTag('w1', 'journey')  // 重复
      await addWordTag('w2', 'travel')
      const r = await mergeTags('travel', 'journey')
      expect(r.removed).toBe(1)  // w1 的 travel
      expect(r.merged).toBe(1)   // w2 的 travel → journey
      const w1Tags = await db.wordTags.where('wordId').equals('w1').toArray()
      expect(w1Tags).toHaveLength(1)
      expect(w1Tags[0].tag).toBe('journey')
    })

    it('同 source/target → 0', async () => {
      expect(await mergeTags('food', 'food')).toEqual({ removed: 0, merged: 0 })
    })

    it('无效 tag → 0', async () => {
      expect(await mergeTags('', 'food')).toEqual({ removed: 0, merged: 0 })
    })
  })

  describe('findSimilarTags', () => {
    it('前缀匹配', async () => {
      await addWordTag('w1', 'travel')
      await addWordTag('w2', 'traveling')
      const sims = await findSimilarTags('tra')
      expect(sims).toContain('travel')
      expect(sims).toContain('traveling')
    })

    it('排除自身', async () => {
      await addWordTag('w1', 'travel')
      const sims = await findSimilarTags('travel')
      expect(sims).not.toContain('travel')
    })

    it('空 query → []', async () => {
      const sims = await findSimilarTags('')
      expect(sims).toEqual([])
    })

    it('< 2 字符 → []', async () => {
      expect(await findSimilarTags('a')).toEqual([])
    })

    it('limit 生效', async () => {
      for (let i = 0; i < 8; i++) await addWordTag(`w${i}`, `test${i}`)
      const sims = await findSimilarTags('test', 3)
      expect(sims.length).toBeLessThanOrEqual(3)
    })
  })
})
