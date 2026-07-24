// tests/llmTutor.test.ts - v1.2-D2 LLM 错题讲解
import { describe, it, expect, beforeEach } from 'vitest'
import { db, getOrCreateExplanation, getExplanation, saveExplanation } from '../src/lib/db'
import { explainError, explanationKey, mockExplanation, explainGrammar, grammarKey, mockGrammar } from '../src/lib/llmTutor'
import { BUILTIN_LLM_PROVIDERS } from '../src/lib/providers/llm'

describe('llmTutor', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  describe('explanationKey', () => {
    it('应标准化 (lowercase + trim)', () => {
      expect(explanationKey('grammar', 'I am go', 'I am going'))
        .toBe('grammar::i am go::i am going')
    })

    it('应限制 200 字符', () => {
      const k = explanationKey('grammar', 'a'.repeat(150), 'b'.repeat(150))
      expect(k.length).toBe(200)
    })
  })

  describe('mockExplanation', () => {
    it('应返回 grammar 解释', () => {
      const r = mockExplanation('grammar', 'I am go', 'I am going')
      expect(r.rule).toContain('语法')
      expect(r.examples.length).toBeGreaterThan(0)
      expect(r.mnemonic.length).toBeGreaterThan(0)
    })

    it('应覆盖所有 8 错误类型', () => {
      const types = ['grammar', 'vocab', 'spelling', 'style', 'tense', 'preposition', 'article', 'other']
      for (const t of types) {
        const r = mockExplanation(t, 'x', 'y')
        expect(r.rule).toBeTruthy()
      }
    })

    it('应 fallback 到 other 当未知类型', () => {
      const r = mockExplanation('unknown', 'x', 'y')
      expect(r.rule).toBeTruthy()
    })
  })

  describe('getOrCreateExplanation (缓存)', () => {
    it('应返回 cached=true 当缓存命中', async () => {
      const key = explanationKey('grammar', 'a', 'b')
      await saveExplanation(key, 'rule1', 'ex1', 'mem1')
      const result = await getOrCreateExplanation(key, async () => {
        return { rule: 'WRONG', examples: 'WRONG', mnemonic: 'WRONG' }
      })
      expect(result.cached).toBe(true)
      expect(result.rule).toBe('rule1')
      expect(result.examples).toBe('ex1')
      expect(result.mnemonic).toBe('mem1')
    })

    it('应返回 cached=false 当缓存 miss', async () => {
      const key = explanationKey('grammar', 'a', 'b')
      const result = await getOrCreateExplanation(key, async () => {
        return { rule: 'NEW', examples: 'NEW', mnemonic: 'NEW' }
      })
      expect(result.cached).toBe(false)
      expect(result.rule).toBe('NEW')
      // 第二次应命中
      const r2 = await getOrCreateExplanation(key, async () => {
        return { rule: 'WRONG', examples: 'WRONG', mnemonic: 'WRONG' }
      })
      expect(r2.cached).toBe(true)
      expect(r2.rule).toBe('NEW')
    })
  })

  describe('explainError (Mock 渠道)', () => {
    it('应直接返回 mock 解释当 mock 渠道', async () => {
      const mockProvider = BUILTIN_LLM_PROVIDERS.find(p => p.id === 'mock')!
      const r = await explainError(mockProvider, '', '', 'grammar', 'I am go', 'I am going')
      expect(r.rule).toBeTruthy()
      expect(r.cached).toBe(true)
    })

    it('应直接返回 mock 解释当无 API key', async () => {
      const openai = BUILTIN_LLM_PROVIDERS.find(p => p.id === 'openai')!
      const r = await explainError(openai, undefined, undefined, 'tense', 'yesterday I go', 'yesterday I went')
      expect(r.rule).toBeTruthy()
      expect(r.cached).toBe(true)
    })
  })

  describe('getExplanation 直接查询', () => {
    it('应返回 undefined 当 key 不存在', async () => {
      const r = await getExplanation('nonexistent::key::here')
      expect(r).toBeUndefined()
    })
  })
})

import { explainUsage, usageKey, mockUsage } from '../src/lib/llmTutor'

describe('llmTutor 短语用法 (v1.5-D3)', () => {
  describe('usageKey', () => {
    it('应标准化 (lowercase + trim + namespace)', () => {
      expect(usageKey('Hello')).toBe('usage::hello')
    })
  })

  describe('mockUsage', () => {
    it('应返回 4 个短语 (make/take/have + maker)', () => {
      const r = mockUsage('decision')
      expect(r.phrases.length).toBe(4)
      expect(r.phrases[0].phrase).toContain('decision')
    })
  })

  describe('explainUsage (Mock 渠道)', () => {
    it('应直接返回 mock 当 mock 渠道', async () => {
      const mock = BUILTIN_LLM_PROVIDERS.find(p => p.id === 'mock')!
      const r = await explainUsage(mock, '', '', 'test', '测试')
      expect(r.phrases.length).toBeGreaterThan(0)
      expect(r.cached).toBe(true)
    })

    it('应返回 mock 当无 API key', async () => {
      const openai = BUILTIN_LLM_PROVIDERS.find(p => p.id === 'openai')!
      const r = await explainUsage(openai, undefined, undefined, 'test', '测试')
      expect(r.phrases.length).toBeGreaterThan(0)
    })
  })

  // === v1.8-A: D3 LLM Tutor 2.0 (语法讲解) ===
  describe('explainGrammar', () => {
    it('mockGrammar 应返定义 + 例句 + 易错点', () => {
      const r = mockGrammar('decision', 'noun')
      expect(r.definition).toBeTruthy()
      expect(r.examples.length).toBe(3)
      expect(r.examples[0].en).toBeTruthy()
      expect(r.examples[0].zh).toBeTruthy()
      expect(r.commonMistakes.length).toBeGreaterThan(0)
    })

    it('grammarKey 应标准化 (lowercase + trim)', () => {
      expect(grammarKey('Decision', 'NOUN')).toBe('grammar::decision::noun')
    })

    it('mock 渠道 explainGrammar 应直接返 mock', async () => {
      const mockProvider = { id: 'mock', name: 'Mock', type: 'mock' as any, apiKeyRequired: false, defaultModel: 'mock' }
      const r = await explainGrammar(mockProvider, '', 'mock', 'book', 'noun', '书')
      expect(r.definition).toContain('名词')
      expect(r.examples.length).toBe(3)
    })

    it('无 API key 时 explainGrammar 应返 mock', async () => {
      const openai = BUILTIN_LLM_PROVIDERS.find(p => p.id === 'openai')!
      const r = await explainGrammar(openai, undefined, undefined, 'happy', 'adj', '快乐')
      expect(r.definition).toBeTruthy()
      expect(r.examples.length).toBe(3)
    })
  })
})
