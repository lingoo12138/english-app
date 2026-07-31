// wordNetwork.test.ts - v1.85-A 触类旁通 (Word Network)
import { describe, it, expect, beforeEach, vi } from 'vitest'

// v1.85-A: 用 vi.mock 提供富测试数据 (含 roots + phrases)
// 测试函数都接受可选 words 参数, 不依赖真实 fetch
const TEST_WORDS = [
  {
    id: 'w-inspect',
    word: 'inspect',
    translations: ['检查'],
    pos: ['v'],
    roots: [{ root: 'spect', meaning: '看', type: 'root' }],
    phrases: [{ phrase: 'inspect the building', translation: '检查大楼' }],
    tags: [], level: 'cet4', difficulty: 3, frequency: 4,
  },
  {
    id: 'w-inspector',
    word: 'inspector',
    translations: ['检查员'],
    pos: ['n'],
    roots: [{ root: 'spect', meaning: '看', type: 'root' }, { root: '-or', meaning: '人', type: 'suffix' }],
    phrases: [],
    tags: [], level: 'cet4', difficulty: 3, frequency: 4,
  },
  {
    id: 'w-inspection',
    word: 'inspection',
    translations: ['检查'],
    pos: ['n'],
    roots: [{ root: 'spect', meaning: '看', type: 'root' }, { root: '-ion', meaning: '名词后缀', type: 'suffix' }],
    phrases: [],
    tags: [], level: 'cet4', difficulty: 3, frequency: 4,
  },
  {
    id: 'w-respect',
    word: 'respect',
    translations: ['尊重'],
    pos: ['v'],
    roots: [{ root: 'spect', meaning: '看', type: 'root' }],
    phrases: [],
    tags: [], level: 'cet4', difficulty: 3, frequency: 5,
  },
  {
    id: 'w-puzzle',
    word: 'puzzle',
    translations: ['谜'],
    pos: ['n'],
    roots: [],
    phrases: [
      { en: 'jigsaw puzzle', zh: '拼图' },
      { en: 'crossword puzzle', zh: '填字游戏' },
    ],
    tags: [], level: 'cet4', difficulty: 3, frequency: 4,
  },
  {
    id: 'w-puzzled',
    word: 'puzzled',
    translations: ['困惑的'],
    pos: ['adj'],
    roots: [],
    phrases: [
      { en: 'jigsaw puzzle', zh: '拼图' },
      { en: 'puzzle over', zh: '冥思苦想' },
    ],
    tags: [], level: 'cet4', difficulty: 3, frequency: 4,
  },
  {
    id: 'w-happy',
    word: 'happy',
    translations: ['快乐的'],
    pos: ['adj'],
    roots: [
      { root: 'hap', meaning: '运气/机会', type: 'root' },
      { root: '-y', meaning: '形容词后缀', type: 'suffix' },
    ],
    phrases: [],
    tags: [], level: 'cet4', difficulty: 2, frequency: 5,
  },
  {
    id: 'w-happiness',
    word: 'happiness',
    translations: ['幸福'],
    pos: ['n'],
    roots: [
      { root: 'hap', meaning: '运气/机会', type: 'root' },
      { root: '-i-', meaning: '连接', type: 'suffix' },
      { root: '-ness', meaning: '名词后缀', type: 'suffix' },
    ],
    phrases: [],
    tags: [], level: 'cet4', difficulty: 2, frequency: 5,
  },
  {
    id: 'w-happen',
    word: 'happen',
    translations: ['发生'],
    pos: ['v'],
    roots: [
      { root: 'hap', meaning: '运气/机会', type: 'root' },
      { root: '-en', meaning: '动词后缀', type: 'suffix' },
    ],
    phrases: [],
    tags: [], level: 'cet4', difficulty: 2, frequency: 5,
  },
  {
    id: 'w-table',
    word: 'table',
    translations: ['桌子'],
    pos: ['n'],
    roots: [],
    phrases: [{ en: 'set the table', zh: '摆桌' }],
    tags: [], level: 'cet4', difficulty: 1, frequency: 5,
  },
] as any

vi.mock('../src/lib/words', () => ({
  loadWords: async () => TEST_WORDS,
  getWord: async (id: string) => TEST_WORDS.find(w => w.id === id),
  searchWords: async () => [],
  LEVELS: [],
}))

import {
  getRelatedByRoot,
  getRelatedSynonym,
  getRelatedAntonym,
  getRelatedCollocation,
  getRelatedWords,
  getFullNetwork,
  clearNetworkCache,
  isNetworkType,
  wordExists,
  findWordByName,
  isInWordList,
  type NetworkType,
} from '../src/lib/wordNetwork'
import { SYNONYM_GROUPS, SYNONYM_KEYS } from '../src/data/synonyms'
import { ANTONYM_PAIRS, ANTONYM_REVERSE, ANTONYM_KEYS } from '../src/data/antonyms'

describe('wordNetwork (v1.85-A)', () => {
  beforeEach(() => {
    clearNetworkCache()
  })

  // ─── 基础类型守卫 ─────────────────────────────────────

  describe('isNetworkType', () => {
    it('应识别 4 个合法 type', () => {
      expect(isNetworkType('root')).toBe(true)
      expect(isNetworkType('synonym')).toBe(true)
      expect(isNetworkType('antonym')).toBe(true)
      expect(isNetworkType('collocation')).toBe(true)
    })

    it('应拒绝非法 type', () => {
      expect(isNetworkType('foo')).toBe(false)
      expect(isNetworkType('xxx')).toBe(false)
      expect(isNetworkType('')).toBe(false)
    })
  })

  // ─── 1. 同根词 ─────────────────────────────────────────

  describe('getRelatedByRoot', () => {
    it('inspect 应找到同根词 inspector/inspection/respect', async () => {
      const result = await getRelatedByRoot('inspect', TEST_WORDS)
      // 共享 root 'spect' 的词: inspector, inspection, respect
      expect(result).toContain('inspector')
      expect(result).toContain('inspection')
      expect(result).toContain('respect')
    })

    it('happy 应找到同根词 happiness/happen (共享 hap root)', async () => {
      const result = await getRelatedByRoot('happy', TEST_WORDS)
      expect(result).toContain('happiness')
      expect(result).toContain('happen')
    })

    it('puzzle 应返空 (无 roots)', async () => {
      const result = await getRelatedByRoot('puzzle', TEST_WORDS)
      expect(result).toEqual([])
    })

    it('未知词应返空数组 (不抛错)', async () => {
      const result = await getRelatedByRoot('xyzqwertynonexistent', TEST_WORDS)
      expect(result).toEqual([])
    })

    it('应排除自身', async () => {
      const result = await getRelatedByRoot('inspect', TEST_WORDS)
      expect(result.map(w => w.toLowerCase())).not.toContain('inspect')
    })

    it('应按字母顺序返回', async () => {
      const result = await getRelatedByRoot('inspect', TEST_WORDS)
      const sorted = [...result].sort()
      expect(result).toEqual(sorted)
    })

    it('大小写不敏感', async () => {
      const a = await getRelatedByRoot('Happy', TEST_WORDS)
      const b = await getRelatedByRoot('happy', TEST_WORDS)
      expect(a).toEqual(b)
      const c = await getRelatedByRoot('HAPPY', TEST_WORDS)
      expect(c).toEqual(b)
    })

    it('传 words 参数时不应调 loadWords', async () => {
      const result = await getRelatedByRoot('inspect', TEST_WORDS)
      expect(result).toContain('inspector')
    })
  })

  // ─── 2. 同义词 ─────────────────────────────────────────

  describe('getRelatedSynonym', () => {
    it('happy 应返 glad/joyful/cheerful', async () => {
      const result = await getRelatedSynonym('happy')
      expect(result).toContain('glad')
      expect(result).toContain('joyful')
      expect(result).toContain('cheerful')
    })

    it('big 应返 large/huge/enormous', async () => {
      const result = await getRelatedSynonym('big')
      expect(result).toContain('large')
      expect(result).toContain('huge')
      expect(result).toContain('enormous')
    })

    it('sad 应返 unhappy/sorrowful/depressed', async () => {
      const result = await getRelatedSynonym('sad')
      expect(result).toContain('unhappy')
      expect(result.length).toBeGreaterThan(0)
    })

    it('未知词应返空', async () => {
      const result = await getRelatedSynonym('xyzqwerty')
      expect(result).toEqual([])
    })

    it('大小写不敏感', async () => {
      const a = await getRelatedSynonym('HAPPY')
      const b = await getRelatedSynonym('happy')
      expect(a).toEqual(b)
    })

    it('SYNONYM_GROUPS 词数应 ≥ 100 (计划要求)', () => {
      expect(SYNONYM_KEYS.length).toBeGreaterThanOrEqual(100)
    })

    it('所有同义词应非空字符串', () => {
      for (const [word, group] of Object.entries(SYNONYM_GROUPS)) {
        expect(group.word, `${word} 应有 word 字段`).toBeTruthy()
        expect(group.synonyms.length, `${word} 应至少 2 个同义词`).toBeGreaterThanOrEqual(2)
        for (const s of group.synonyms) {
          expect(s, `${word} 的同义词应非空`).toBeTruthy()
          expect(s).not.toBe(group.word)  // 不应等于自身
        }
      }
    })
  })

  // ─── 3. 反义词 ─────────────────────────────────────────

  describe('getRelatedAntonym', () => {
    it('hot ↔ cold', async () => {
      const result = await getRelatedAntonym('hot')
      expect(result).toContain('cold')
    })

    it('big ↔ small', async () => {
      const result = await getRelatedAntonym('big')
      expect(result).toContain('small')
    })

    it('happy ↔ sad', async () => {
      const result = await getRelatedAntonym('happy')
      expect(result).toContain('sad')
    })

    it('双向反查: 输入反义词也能查回主词', async () => {
      const result = await getRelatedAntonym('cold')  // cold 是 hot 的反义
      expect(result).toContain('hot')
    })

    // v1.86: 修 P0 bug — 反查路径返自身 (覆盖只主词/纯反义值 两种 case)
    it('P0 修复: 纯反义值 (after/before) 应返主词 (before/after)', async () => {
      expect(await getRelatedAntonym('after')).toContain('before')
      expect(await getRelatedAntonym('before')).toContain('after')
    })
    it('P0 修复: 纯反义值 (cheap/expensive)', async () => {
      expect(await getRelatedAntonym('cheap')).toContain('expensive')
      expect(await getRelatedAntonym('expensive')).toContain('cheap')
    })
    it('P0 修复: 纯反义值 (sad/happy, dead/alive)', async () => {
      expect(await getRelatedAntonym('sad')).toContain('happy')
      expect(await getRelatedAntonym('dead')).toContain('alive')
    })

    it('未知词应返空', async () => {
      const result = await getRelatedAntonym('xyzqwerty')
      expect(result).toEqual([])
    })

    it('ANTONYM_PAIRS 应 ≥ 60 对 (计划要求)', () => {
      expect(ANTONYM_KEYS.length).toBeGreaterThanOrEqual(60)
    })

    it('ANTONYM_REVERSE 应包含所有反义词', () => {
      for (const [word, pair] of Object.entries(ANTONYM_PAIRS)) {
        expect(ANTONYM_REVERSE[pair.antonym], `${pair.antonym} 应反向索引到 ${word}`).toBe(word)
      }
    })

    it('每对反义应非空 + 不等于自身', () => {
      for (const [word, pair] of Object.entries(ANTONYM_PAIRS)) {
        expect(pair.word, `${word} 应有 word 字段`).toBeTruthy()
        expect(pair.antonym, `${word} 应有 antonym 字段`).toBeTruthy()
        expect(pair.antonym).not.toBe(pair.word)
        expect(pair.note).toBeTruthy()
      }
    })
  })

  // ─── 4. 搭配 ───────────────────────────────────────────

  describe('getRelatedCollocation', () => {
    it('puzzle 应找到 puzzled (共享 jigsaw puzzle)', async () => {
      const result = await getRelatedCollocation('puzzle', TEST_WORDS)
      expect(result).toContain('puzzled')
    })

    it('puzzled 应找到 puzzle (双向共享)', async () => {
      const result = await getRelatedCollocation('puzzled', TEST_WORDS)
      expect(result).toContain('puzzle')
    })

    it('happy 应返空 (无 phrases)', async () => {
      const result = await getRelatedCollocation('happy', TEST_WORDS)
      expect(result).toEqual([])
    })

    it('table 应返空 (短语不共享)', async () => {
      const result = await getRelatedCollocation('table', TEST_WORDS)
      expect(result).toEqual([])
    })

    it('未知词应返空', async () => {
      const result = await getRelatedCollocation('xyzqwertynonexistent', TEST_WORDS)
      expect(result).toEqual([])
    })

    it('应排除自身', async () => {
      const result = await getRelatedCollocation('puzzle', TEST_WORDS)
      expect(result.map(w => w.toLowerCase())).not.toContain('puzzle')
    })

    it('大小写不敏感', async () => {
      const a = await getRelatedCollocation('Puzzle', TEST_WORDS)
      const b = await getRelatedCollocation('puzzle', TEST_WORDS)
      expect(a).toEqual(b)
    })

    it('应兼容 en/zh 字段 (朗文 csv 格式)', async () => {
      // puzzle 用的就是 en/zh 字段格式
      const result = await getRelatedCollocation('puzzle', TEST_WORDS)
      expect(result).toContain('puzzled')
    })
  })

  // ─── 统一入口 ─────────────────────────────────────────

  describe('getRelatedWords (统一入口)', () => {
    it('root 应调用 getRelatedByRoot', async () => {
      const a = await getRelatedWords('happy', 'root')
      const b = await getRelatedByRoot('happy')
      expect(a).toEqual(b)
    })

    it('synonym 应调用 getRelatedSynonym', async () => {
      const a = await getRelatedWords('big', 'synonym')
      const b = await getRelatedSynonym('big')
      expect(a).toEqual(b)
    })

    it('antonym 应调用 getRelatedAntonym', async () => {
      const a = await getRelatedWords('big', 'antonym')
      const b = await getRelatedAntonym('big')
      expect(a).toEqual(b)
    })

    it('collocation 应调用 getRelatedCollocation', async () => {
      const a = await getRelatedWords('puzzle', 'collocation')
      const b = await getRelatedCollocation('puzzle')
      expect(a).toEqual(b)
    })
  })

  // ─── getFullNetwork ────────────────────────────────────

  describe('getFullNetwork', () => {
    it('happy 应返 4 类 (root + synonym + antonym + collocation)', async () => {
      const net = await getFullNetwork('happy')
      expect(net).toHaveProperty('root')
      expect(net).toHaveProperty('synonym')
      expect(net).toHaveProperty('antonym')
      expect(net).toHaveProperty('collocation')
      expect(Array.isArray(net.root)).toBe(true)
      expect(Array.isArray(net.synonym)).toBe(true)
      expect(Array.isArray(net.antonym)).toBe(true)
      expect(Array.isArray(net.collocation)).toBe(true)
      expect(net.synonym).toContain('glad')  // 同义词
      expect(net.antonym).toContain('sad')    // 反义词
      expect(net.root.length).toBeGreaterThan(0)  // 同根词
    })

    it('完全未知词应全空 (不抛错)', async () => {
      const net = await getFullNetwork('xyzqwertynonexistent')
      expect(net.root).toEqual([])
      expect(net.synonym).toEqual([])
      expect(net.antonym).toEqual([])
      expect(net.collocation).toEqual([])
    })
  })

  // ─── 缓存 ─────────────────────────────────────────────

  describe('cache (缓存)', () => {
    it('多次查询同词应返相同结果 (含缓存)', async () => {
      const a1 = await getRelatedSynonym('happy')
      const a2 = await getRelatedSynonym('happy')
      expect(a1).toEqual(a2)
    })

    it('clearNetworkCache 应清空', async () => {
      await getRelatedSynonym('happy')
      clearNetworkCache()
      // 重新查询应仍能成功 (重新计算)
      const r = await getRelatedSynonym('happy')
      expect(r).toContain('glad')
    })
  })

  // ─── 工具函数 ─────────────────────────────────────────

  describe('wordExists / findWordByName', () => {
    it('wordExists happy 应 true', async () => {
      const exists = await wordExists('happy', TEST_WORDS)
      expect(exists).toBe(true)
    })

    it('wordExists 大小写不敏感', async () => {
      expect(await wordExists('HAPPY', TEST_WORDS)).toBe(true)
      expect(await wordExists('Happy', TEST_WORDS)).toBe(true)
    })

    it('wordExists 未知词应 false', async () => {
      expect(await wordExists('xyzqwertynonexistent', TEST_WORDS)).toBe(false)
    })

    it('findWordByName 应返完整 Word', async () => {
      const w = await findWordByName('happy', TEST_WORDS)
      expect(w).toBeDefined()
      expect(w?.word).toBe('happy')
    })

    it('findWordByName 未知词应 undefined', async () => {
      const w = await findWordByName('xyzqwertynonexistent', TEST_WORDS)
      expect(w).toBeUndefined()
    })
  })
})

// ─── NetworkType 类型守卫 (编译期) ───────────────────────

describe('NetworkType 编译期检查', () => {
  it('应接受 4 个 type', () => {
    const types: NetworkType[] = ['root', 'synonym', 'antonym', 'collocation']
    expect(types).toHaveLength(4)
  })
})

describe('isInWordList (v1.86)', () => {
  it('在词库中的词应返 true', async () => {
    expect(await isInWordList('happy')).toBe(true)
    expect(await isInWordList('inspect')).toBe(true)
  })
  it('不在词库中的词应返 false', async () => {
    expect(await isInWordList('languid')).toBe(false)
    expect(await isInWordList('notorious')).toBe(false)
  })
  it('大小写不敏感', async () => {
    expect(await isInWordList('Happy')).toBe(true)
    expect(await isInWordList('HAPPY')).toBe(true)
  })
})
