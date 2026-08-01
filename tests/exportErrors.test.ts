// exportErrors.test.ts - v1.92 W86-B 错题导出 CSV 测试
import { describe, it, expect } from 'vitest'
import {
  escapeCSV,
  writingErrorToCSV,
  dictationErrorToCSV,
  writingErrorsToCSV,
  dictationErrorsToCSV,
  allErrorsToCSV,
  type WritingError,
  type DictationError,
} from '../src/lib/exportErrors'

describe('W86-B 错题导出 CSV', () => {
  describe('escapeCSV', () => {
    it('普通字符串原样', () => {
      expect(escapeCSV('hello')).toBe('hello')
    })
    it('含逗号加引号', () => {
      expect(escapeCSV('a,b')).toBe('"a,b"')
    })
    it('含引号双写', () => {
      expect(escapeCSV('say "hi"')).toBe('"say ""hi"""')
    })
    it('含换行加引号', () => {
      expect(escapeCSV('a\nb')).toBe('"a\nb"')
    })
    it('null/undefined 返空', () => {
      expect(escapeCSV(null)).toBe('')
      expect(escapeCSV(undefined)).toBe('')
    })
  })

  describe('writingErrorToCSV', () => {
    it('基本字段', () => {
      const e: WritingError = {
        id: 1,
        source: 'write',
        original: 'I go to school yesterday',
        corrected: 'I went to school yesterday',
        errors: [
          { original: 'go', suggestion: 'went', type: 'tense', explanation: '过去式', severity: 0.8 },
        ],
        ts: Date.now(),
      }
      const csv = writingErrorToCSV(e)
      expect(csv).toContain('write')
      expect(csv).toContain('go→went(tense)')
    })
  })

  describe('dictationErrorToCSV', () => {
    it('基本字段', () => {
      const e: DictationError = {
        id: 1,
        wordId: 'w-cat',
        difficulty: 'easy',
        source: 'spelling',
        transcript: 'kat',
        target: 'cat',
        score: 80,
        ts: Date.now(),
      }
      const csv = dictationErrorToCSV(e)
      expect(csv).toContain('spelling')
      expect(csv).toContain('cat')
      expect(csv).toContain('kat')
      expect(csv).toContain('80')
    })
  })

  describe('writingErrorsToCSV', () => {
    it('含 header + 行', () => {
      const csv = writingErrorsToCSV([])
      expect(csv).toContain('id,source,time,original,corrected,errors')
    })
  })

  describe('dictationErrorsToCSV', () => {
    it('含 header + 行', () => {
      const csv = dictationErrorsToCSV([])
      expect(csv).toContain('id,source,time,target,transcript,score,difficulty')
    })
  })

  describe('allErrorsToCSV (合并)', () => {
    it('合并写作 + 听写', () => {
      const w: WritingError = {
        id: 1, source: 'write', original: 'a', corrected: 'b',
        errors: [{ original: 'a', suggestion: 'b', type: 'grammar', explanation: '', severity: 0.5 }],
        ts: Date.now(),
      }
      const d: DictationError = {
        id: 2, wordId: 'w-cat', difficulty: 'easy', source: 'dictation',
        transcript: 'kat', target: 'cat', score: 80, ts: Date.now(),
      }
      const csv = allErrorsToCSV([w], [d])
      expect(csv).toContain('id,source,time,source_text,user_text,extra')
      expect(csv).toContain('write')
      expect(csv).toContain('dictation')
    })

    it('空数组只返 header', () => {
      const csv = allErrorsToCSV([], [])
      expect(csv).toContain('id,source,time,source_text,user_text,extra')
      expect(csv.split('\n').length).toBe(1)
    })
  })
})
