// tests/chineseToEnglish.test.ts - v1.10.0-A 中译英 Tab 单元测试
import { describe, it, expect, beforeEach } from 'vitest'
import { db, saveWritingError, getAllWritingErrors } from '../src/lib/db'
import {
  CHINESE_SYSTEM_PROMPT,
  parseChineseResult,
  mockChineseTranslation,
  type ChineseResult,
} from '../src/pages/WritePage'

describe('v1.10.0-A 中译英 Tab', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  describe('parseChineseResult', () => {
    it('应正确解析有效 JSON 响应', () => {
      const valid = JSON.stringify({
        translation: 'I went to school yesterday.',
        level: 'A1',
        alternatives: [
          { en: 'Yesterday I went to school.', why_better: '强调时间' },
        ],
        notes: '过去式 went',
      })
      const result = parseChineseResult(valid, '我昨天去了学校')
      expect(result.translation).toBe('I went to school yesterday.')
      expect(result.level).toBe('A1')
      expect(result.alternatives).toHaveLength(1)
      expect(result.alternatives[0].en).toBe('Yesterday I went to school.')
      expect(result.alternatives[0].why_better).toBe('强调时间')
      expect(result.notes).toBe('过去式 went')
    })

    it('应能处理 markdown fence 包裹的 JSON', () => {
      const fenced = '```json\n{"translation":"Hello.","level":"A1","alternatives":[],"notes":"test"}\n```'
      const result = parseChineseResult(fenced, '你好')
      expect(result.translation).toBe('Hello.')
      expect(result.level).toBe('A1')
      expect(result.alternatives).toEqual([])
      expect(result.notes).toBe('test')
    })

    it('解析失败时应 fallback 显示原文', () => {
      const broken = 'not valid json {'
      const result = parseChineseResult(broken, '我昨天去了学校')
      expect(result.translation).toBe('我昨天去了学校')
      expect(result.level).toBe('A1')
      expect(result.alternatives).toEqual([])
      expect(result.notes).toContain('解析失败')
    })

    it('应校验 level 字段,非法值 fallback 到 A1', () => {
      const invalid = JSON.stringify({
        translation: 'Hi.',
        level: 'XYZ',
        alternatives: [],
        notes: '',
      })
      const result = parseChineseResult(invalid, '嗨')
      expect(result.level).toBe('A1')
    })

    it('应处理 alternatives 非数组的情况', () => {
      const broken = JSON.stringify({
        translation: 'Hi.',
        level: 'A2',
        alternatives: 'not array',
        notes: '',
      })
      const result = parseChineseResult(broken, '嗨')
      expect(result.translation).toBe('Hi.')
      expect(result.level).toBe('A2')
      expect(result.alternatives).toEqual([])
    })
  })

  describe('mockChineseTranslation', () => {
    it('5 个常用句 mock 翻译全覆盖', () => {
      const cases: Array<[string, string, ChineseResult['level']]> = [
        ['我昨天去了学校', 'I went to school yesterday.', 'A1'],
        ['我今天很开心', "I'm happy today.", 'A1'],
        ['你能帮我吗?', 'Could you help me?', 'A2'],
        ['我正在找工作', "I'm looking for a job.", 'B1'],
        ['我期待你的回复', "I'm looking forward to hearing from you.", 'B1'],
      ]
      for (const [input, expectedTranslation, expectedLevel] of cases) {
        const result = mockChineseTranslation(input)
        expect(result.translation, `输入: ${input}`).toBe(expectedTranslation)
        expect(result.level, `输入: ${input}`).toBe(expectedLevel)
        expect(result.alternatives.length, `输入: ${input} 备选`).toBeGreaterThan(0)
        expect(result.notes, `输入: ${input} 注释`).toBeTruthy()
      }
    })

    it('未匹配的输入应返回 fallback (含输入原文)', () => {
      const result = mockChineseTranslation('这是一句不存在的 mock 输入')
      expect(result.translation).toContain('Mock')
      expect(result.translation).toContain('这是一句不存在的 mock 输入')
      expect(result.level).toBe('A1')
      expect(result.alternatives).toEqual([])
      expect(result.notes).toContain('Mock')
    })

    it('应支持标点模糊匹配', () => {
      const result = mockChineseTranslation('我昨天去了学校!')
      expect(result.translation).toBe('I went to school yesterday.')
    })
  })

  describe('CHINESE_SYSTEM_PROMPT', () => {
    it('应包含完整协议字段 (translation/level/alternatives/notes)', () => {
      expect(CHINESE_SYSTEM_PROMPT).toContain('translation')
      expect(CHINESE_SYSTEM_PROMPT).toContain('level')
      expect(CHINESE_SYSTEM_PROMPT).toContain('alternatives')
      expect(CHINESE_SYSTEM_PROMPT).toContain('notes')
    })

    it('应定义所有 6 个 CEFR 等级', () => {
      for (const lv of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
        expect(CHINESE_SYSTEM_PROMPT, `缺少等级 ${lv}`).toContain(lv)
      }
    })

    it('应要求 only return valid JSON', () => {
      expect(CHINESE_SYSTEM_PROMPT.toLowerCase()).toContain('only return valid json')
    })
  })

  describe('Chinese result 保存到历史 (cached 字段)', () => {
    it('应能保存中译英结果到 writingErrors,带正确 source/original/corrected/errors 字段', async () => {
      const parsed = parseChineseResult(
        JSON.stringify({
          translation: 'I went to school yesterday.',
          level: 'A1',
          alternatives: [],
          notes: 'test',
        }),
        '我昨天去了学校',
      )
      const id = await saveWritingError({
        source: 'chinese',
        original: '我昨天去了学校',
        corrected: parsed.translation,
        errors: [],
        ts: Date.now(),
      })
      expect(id).toBeDefined()

      const all = await getAllWritingErrors()
      const found = all.find(e => e.id === id)
      expect(found).toBeDefined()
      expect(found!.source).toBe('chinese')
      expect(found!.original).toBe('我昨天去了学校')
      expect(found!.corrected).toBe('I went to school yesterday.')
      expect(found!.errors).toEqual([])
    })

    it('中译英结果应能从历史读回并恢复 ChineseResult 结构', async () => {
      const original = '我正在找工作'
      const parsed = mockChineseTranslation(original)
      await saveWritingError({
        source: 'chinese',
        original,
        corrected: parsed.translation,
        errors: [],
        ts: Date.now(),
      })
      const all = await getAllWritingErrors()
      const item = all[0]
      // 模拟 handleHistoryItem: 从历史读回,重建 ChineseResult
      const restored: ChineseResult = {
        translation: item.corrected,
        level: 'A1',
        alternatives: [],
        notes: '来自历史记录',
      }
      expect(restored.translation).toBe("I'm looking for a job.")
      expect(restored.level).toBe('A1')
    })
  })
})
