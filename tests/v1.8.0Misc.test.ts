// tests/v1.8.0Misc.test.ts - v1.8.0 杂项测试
// 覆盖: OpenRouter defaultModel + Daily 100 句 + WordDetail 跟读入口
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { BUILTIN_LLM_PROVIDERS } from '../src/lib/providers/llm'

describe('v1.8.0-C: OpenRouter + Daily 100 + WordDetail 跟读', () => {
  describe('OpenRouter 配置', () => {
    it('OpenRouter 渠道应存在', () => {
      const openrouter = BUILTIN_LLM_PROVIDERS.find(p => p.id === 'openrouter')
      expect(openrouter).toBeDefined()
    })

    it('OpenRouter defaultModel 应是 google/gemini-2.5-flash:free (0 成本)', () => {
      const openrouter = BUILTIN_LLM_PROVIDERS.find(p => p.id === 'openrouter')
      expect(openrouter?.defaultModel).toBe('google/gemini-2.5-flash:free')
    })

    it('OpenRouter models 应包含 free 模型', () => {
      const openrouter = BUILTIN_LLM_PROVIDERS.find(p => p.id === 'openrouter')
      const freeModels = openrouter?.models.filter(m => m.includes(':free')) || []
      expect(freeModels.length).toBeGreaterThan(0)
    })
  })

  describe('Daily 100 句 (C4)', () => {
    it('daily.json 应有 100 句', () => {
      const data = JSON.parse(readFileSync('public/data/daily.json', 'utf-8'))
      expect(data.length).toBe(100)
    })

    it('daily.json 每句应有 en + zh + scene + keyword 字段', () => {
      const data = JSON.parse(readFileSync('public/data/daily.json', 'utf-8'))
      for (const item of data) {
        expect(item).toHaveProperty('en')
        expect(item).toHaveProperty('zh')
        expect(item).toHaveProperty('scene')
        expect(item).toHaveProperty('keyword')
        expect(item.en.length).toBeGreaterThan(0)
        expect(item.zh.length).toBeGreaterThan(0)
      }
    })

    it('daily.json id 应 1-100 唯一', () => {
      const data: Array<{ id: number; en: string; zh: string; scene: string; keyword: string }> = JSON.parse(readFileSync('public/data/daily.json', 'utf-8'))
      const ids = data.map((d) => d.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(100)
      expect(Math.min(...ids)).toBe(1)
      expect(Math.max(...ids)).toBe(100)
    })

    it('daily.json 旧 30 句应保留 (向后兼容)', () => {
      const data: Array<{ id: number; en: string; zh: string; scene: string; keyword: string }> = JSON.parse(readFileSync('public/data/daily.json', 'utf-8'))
      const firstSentence = data.find((d) => d.id === 1)
      expect(firstSentence?.en).toBe('How do I look?')
    })
  })

  describe('WordDetail 跟读入口 (C8)', () => {
    it('WordDetail.tsx 应引入 PronunciationPractice', () => {
      const wd = readFileSync('src/pages/WordDetail.tsx', 'utf-8')
      expect(wd).toMatch(/import PronunciationPractice/)
    })

    it('WordDetail.tsx 应有 🎤 跟读 按钮', () => {
      const wd = readFileSync('src/pages/WordDetail.tsx', 'utf-8')
      expect(wd).toMatch(/🎤 跟读/)
    })

    it('WordDetail.tsx 应有 showPronounce state', () => {
      const wd = readFileSync('src/pages/WordDetail.tsx', 'utf-8')
      expect(wd).toMatch(/showPronounce/)
    })
  })

  describe('Settings: OpenRouter 0 成本标签', () => {
    it('LLMSection.tsx 应有 🆓 0 成本 标签', () => {
      const llm = readFileSync('src/components/settings/LLMSection.tsx', 'utf-8')
      expect(llm).toMatch(/🆓 0 成本/)
    })
  })
})
