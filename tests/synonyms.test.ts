// tests/synonyms.test.ts - v1.10.0-B 同义词辨析
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../src/lib/db'
import {
  parseSynonyms,
  mockSynonyms,
  synonymKey,
  getSynonyms,
} from '../src/lib/synonyms'

describe('synonyms (v1.10.0-B)', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  describe('synonymKey', () => {
    it('应标准化 (lowercase + trim + 截断 200)', () => {
      expect(synonymKey('Happy', 'ADJ')).toBe('synonym::happy::adj')
    })

    it('超长应截断 200 字符', () => {
      const long = 'a'.repeat(300)
      const key = synonymKey(long, 'noun')
      expect(key.length).toBe(200)
    })
  })

  describe('mockSynonyms', () => {
    it('happy 应返 glad/joyful/cheerful', () => {
      const r = mockSynonyms('happy')
      expect(r.synonyms.length).toBeGreaterThanOrEqual(3)
      const words = r.synonyms.map(s => s.word)
      expect(words).toContain('glad')
      expect(words).toContain('joyful')
    })

    it('sad 应返 unhappy/gloomy/depressed', () => {
      const r = mockSynonyms('sad')
      const words = r.synonyms.map(s => s.word)
      expect(words).toContain('unhappy')
    })

    it('big 应返 large/huge/enormous', () => {
      const r = mockSynonyms('big')
      const words = r.synonyms.map(s => s.word)
      expect(words).toContain('large')
    })

    it('happy/sad/angry/big/small/good/bad/fast 8 词覆盖', () => {
      const words = ['happy', 'sad', 'angry', 'big', 'small', 'good', 'bad', 'fast']
      for (const w of words) {
        const r = mockSynonyms(w)
        expect(r.synonyms.length).toBeGreaterThan(0)
        expect(r.cached).toBe(true)
      }
    })

    it('未知单词应返通用 fallback', () => {
      const r = mockSynonyms('xyzabc')
      expect(r.synonyms.length).toBeGreaterThan(0)
      expect(r.synonyms[0].word).toContain('xyzabc')
    })
  })

  describe('parseSynonyms', () => {
    it('有效 JSON 应正确解析', () => {
      const json = JSON.stringify({
        synonyms: [{ word: 'glad', nuance: '口语', example: 'I am glad.' }],
        confused: [{ word: 'happy', diff: '通用' }],
      })
      const r = parseSynonyms(json)
      expect(r.synonyms).toHaveLength(1)
      expect(r.synonyms[0].word).toBe('glad')
      expect(r.confused).toHaveLength(1)
    })

    it('markdown fence 应正确处理', () => {
      const fenced = '```json\n{"synonyms":[],"confused":[]}\n```'
      const r = parseSynonyms(fenced)
      expect(r.synonyms).toEqual([])
      expect(r.confused).toEqual([])
    })

    it('解析失败应返空数组', () => {
      const r = parseSynonyms('not valid json {')
      expect(r.synonyms).toEqual([])
      expect(r.confused).toEqual([])
    })

    it('缺字段应 fallback', () => {
      const r = parseSynonyms('{}')
      expect(r.synonyms).toEqual([])
      expect(r.confused).toEqual([])
    })
  })

  describe('getSynonyms 集成', () => {
    it('mock 渠道 getSynonyms 应返 mock', async () => {
      const mockProvider = { id: 'mock', name: 'Mock', type: 'mock' as any, apiKeyRequired: false, defaultModel: 'mock' }
      const r = await getSynonyms(mockProvider, '', 'mock', 'happy', 'adj')
      expect(r.synonyms.length).toBeGreaterThan(0)
    })

    it('无 API key 时 getSynonyms 应返 mock', async () => {
      const openai = { id: 'openai', name: 'OpenAI', type: 'openai' as any, apiKeyRequired: true, defaultModel: 'gpt-4o-mini' }
      const r = await getSynonyms(openai, undefined, undefined, 'big', 'adj')
      expect(r.synonyms.length).toBeGreaterThan(0)
    })
  })
})
