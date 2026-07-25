// tests/wordTags.test.ts - v1.21.0 B11 生词本标签
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../src/lib/db'
import {
  parseTagInput,
  isValidTag,
  addTagsToWord,
  removeTagFromWord,
  clearAllTagsForWord,
  getAllTagsWithCount,
  getWordIdsByTag,
  buildWordTagMap,
  filterFavoritesByTag,
  suggestTagsFromWord,
  getTagColor,
  MAX_TAG_LEN,
  MAX_TAGS_PER_WORD,
} from '../src/lib/wordTags'
import type { Favorite } from '../src/types'

beforeEach(async () => {
  await db.wordTags.clear()
  await db.favorites.clear()
})

describe('wordTags (v1.21.0-B11)', () => {
  describe('常量', () => {
    it('MAX_TAG_LEN = 20', () => {
      expect(MAX_TAG_LEN).toBe(20)
    })
    it('MAX_TAGS_PER_WORD = 10', () => {
      expect(MAX_TAGS_PER_WORD).toBe(10)
    })
  })

  describe('parseTagInput', () => {
    it('逗号分隔', () => {
      expect(parseTagInput('work, travel, food')).toEqual(['work', 'travel', 'food'])
    })

    it('中文逗号', () => {
      expect(parseTagInput('工作, 旅行, 美食')).toEqual(['工作', '旅行', '美食'])
    })

    it('分号', () => {
      expect(parseTagInput('work; travel')).toEqual(['work', 'travel'])
    })

    it('空格分隔', () => {
      expect(parseTagInput('work travel food')).toEqual(['work', 'travel', 'food'])
    })

    it('去重', () => {
      expect(parseTagInput('work, work, travel')).toEqual(['work', 'travel'])
    })

    it('小写化', () => {
      expect(parseTagInput('Work, TRAVEL')).toEqual(['work', 'travel'])
    })

    it('去空白', () => {
      expect(parseTagInput('  work  ,  travel  ')).toEqual(['work', 'travel'])
    })

    it('长度限制 (>20 截断)', () => {
      const long = 'a'.repeat(30)
      expect(parseTagInput(long)).toEqual([])
    })

    it('空串', () => {
      expect(parseTagInput('')).toEqual([])
    })
  })

  describe('isValidTag', () => {
    it('有效', () => {
      expect(isValidTag('work')).toBe(true)
      expect(isValidTag('tech-stack')).toBe(true)
      expect(isValidTag('work_2026')).toBe(true)
      expect(isValidTag('工作')).toBe(true)
    })

    it('无效: 特殊字符', () => {
      expect(isValidTag('work!')).toBe(false)
      expect(isValidTag('work@home')).toBe(false)
    })

    it('无效: 长度', () => {
      expect(isValidTag('a'.repeat(21))).toBe(false)
    })

    it('无效: 空', () => {
      expect(isValidTag('')).toBe(false)
    })
  })

  describe('addTagsToWord', () => {
    it('批量加', async () => {
      const result = await addTagsToWord('apple', ['work', 'food'])
      expect(result.added).toBe(2)
      expect(result.skipped).toBe(0)
    })

    it('幂等: 已存跳过', async () => {
      await addTagsToWord('apple', ['work'])
      const result = await addTagsToWord('apple', ['work', 'food'])
      expect(result.added).toBe(1)  // food
      expect(result.skipped).toBe(1)  // work
    })

    it('超过 MAX_TAGS_PER_WORD 跳过', async () => {
      // 加 10 个
      const tags10 = Array.from({ length: 10 }, (_, i) => `tag${i}`)
      await addTagsToWord('apple', tags10)
      // 再加应跳过
      const result = await addTagsToWord('apple', ['newtag'])
      expect(result.added).toBe(0)
      expect(result.skipped).toBe(1)
    })

    it('无效 tag 计入 failed', async () => {
      const result = await addTagsToWord('apple', ['work', 'invalid!'])
      expect(result.added).toBe(1)
      expect(result.failed).toBe(1)
    })
  })

  describe('removeTagFromWord / clearAllTagsForWord', () => {
    it('去单个 tag', async () => {
      await addTagsToWord('apple', ['work', 'food'])
      await removeTagFromWord('apple', 'work')
      const tags = await db.wordTags.where('wordId').equals('apple').toArray()
      expect(tags.length).toBe(1)
      expect(tags[0].tag).toBe('food')
    })

    it('清所有', async () => {
      await addTagsToWord('apple', ['work', 'food', 'tech'])
      await clearAllTagsForWord('apple')
      const tags = await db.wordTags.where('wordId').equals('apple').toArray()
      expect(tags.length).toBe(0)
    })
  })

  describe('getAllTagsWithCount', () => {
    it('按 count 降序', async () => {
      await addTagsToWord('apple', ['work'])
      await addTagsToWord('banana', ['work', 'food'])
      await addTagsToWord('cherry', ['food'])
      const result = await getAllTagsWithCount()
      // work 和 food 各 2 个, 顺序可能不同
      expect(result.length).toBe(2)
      const counts = result.map(r => r.count).sort()
      expect(counts).toEqual([2, 2])
      const tags = result.map(r => r.tag).sort()
      expect(tags).toEqual(['food', 'work'])
    })

    it('空数据返空', async () => {
      const result = await getAllTagsWithCount()
      expect(result).toEqual([])
    })
  })

  describe('getWordIdsByTag', () => {
    it('按 tag 返 wordId', async () => {
      await addTagsToWord('apple', ['work'])
      await addTagsToWord('banana', ['work'])
      await addTagsToWord('cherry', ['food'])
      const ids = await getWordIdsByTag('work')
      expect(ids.sort()).toEqual(['apple', 'banana'])
    })
  })

  describe('buildWordTagMap', () => {
    it('构建 wordId -> Set<tag>', async () => {
      await addTagsToWord('apple', ['work', 'food'])
      await addTagsToWord('banana', ['food'])
      const map = await buildWordTagMap()
      expect(map.get('apple')?.has('work')).toBe(true)
      expect(map.get('apple')?.has('food')).toBe(true)
      expect(map.get('banana')?.has('food')).toBe(true)
    })
  })

  describe('filterFavoritesByTag', () => {
    const favs: Favorite[] = [
      { wordId: 'apple', addedAt: 1 },
      { wordId: 'banana', addedAt: 2 },
      { wordId: 'cherry', addedAt: 3 },
    ]

    it('tag = null 返全部', () => {
      const map = new Map<string, Set<string>>()
      const result = filterFavoritesByTag(favs, map, null)
      expect(result.length).toBe(3)
    })

    it('按 tag 过滤', () => {
      const map = new Map<string, Set<string>>([
        ['apple', new Set(['food'])],
        ['banana', new Set(['work'])],
        ['cherry', new Set(['food'])],
      ])
      const result = filterFavoritesByTag(favs, map, 'food')
      expect(result.length).toBe(2)
      expect(result.map(f => f.wordId).sort()).toEqual(['apple', 'cherry'])
    })
  })

  describe('suggestTagsFromWord 启发式', () => {
    it('computer → tech', () => {
      const tags = suggestTagsFromWord('computer')
      expect(tags).toContain('tech')
    })

    it('hotel → travel', () => {
      const tags = suggestTagsFromWord('hotel')
      expect(tags).toContain('travel')
    })

    it('restaurant → food', () => {
      const tags = suggestTagsFromWord('restaurant')
      expect(tags).toContain('food')
    })

    it('exam → study', () => {
      const tags = suggestTagsFromWord('exam')
      expect(tags).toContain('study')
    })

    it('未知词返空', () => {
      const tags = suggestTagsFromWord('xyzqwerty')
      expect(tags).toEqual([])
    })

    it('支持 translation', () => {
      const tags = suggestTagsFromWord('apple', '工作')
      // apple 不匹配, 但 '工作' 也不在工作规则里
      // 实际启发式基于 TAG_RULES 的 keywords (英文), 中文不匹配
      expect(Array.isArray(tags)).toBe(true)
    })
  })

  describe('getTagColor', () => {
    it('返 className', () => {
      const color = getTagColor('work')
      expect(color).toMatch(/bg-/)
      expect(color).toMatch(/text-/)
    })

    it('同 tag 返同色 (稳定)', () => {
      const a = getTagColor('work')
      const b = getTagColor('work')
      expect(a).toBe(b)
    })

    it('不同 tag 可能不同色', () => {
      const a = getTagColor('aaa')
      const b = getTagColor('zzz')
      // 不一定不同, 但返合理值
      expect(typeof a).toBe('string')
      expect(typeof b).toBe('string')
    })
  })
})
