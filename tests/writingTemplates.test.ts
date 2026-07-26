// tests/writingTemplates.test.ts - v1.30.0 W30 写作模板
import { describe, it, expect } from 'vitest'
import { WRITING_TEMPLATES, buildTemplatePrompt } from '../src/lib/writingTemplates'

describe('writingTemplates (v1.30.0-W30)', () => {
  describe('WRITING_TEMPLATES', () => {
    it('4 模板', () => {
      expect(WRITING_TEMPLATES.length).toBe(4)
    })
    it('每个有 id/name/emoji/fields/buildPrompt', () => {
      for (const t of WRITING_TEMPLATES) {
        expect(t.id).toBeTruthy()
        expect(t.name).toBeTruthy()
        expect(t.emoji).toBeTruthy()
        expect(t.fields.length).toBeGreaterThan(0)
        expect(typeof t.buildPrompt).toBe('function')
      }
    })
    it('id 唯一', () => {
      const ids = WRITING_TEMPLATES.map(t => t.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  describe('buildTemplatePrompt', () => {
    it('email 模板', () => {
      const p = buildTemplatePrompt('email', {
        to: 'John',
        subject: 'Application',
        context: '求职',
        details: '3 年 React',
      })
      expect(p).toContain('John')
      expect(p).toContain('Application')
      expect(p).toContain('React')
    })
    it('缺必填字段抛错', () => {
      expect(() => buildTemplatePrompt('email', { to: 'John' })).toThrow('请填写')
    })
    it('未知 id 返空', () => {
      expect(buildTemplatePrompt('unknown', {})).toBe('')
    })
    it('apology 模板', () => {
      const p = buildTemplatePrompt('apology', { to: 'Tom', reason: 'missed meeting', fix: 'I will finish today' })
      expect(p).toContain('Tom')
      expect(p).toContain('missed meeting')
    })
  })
})
