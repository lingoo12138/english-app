// tests/fileUpload.test.ts - v1.18.0 B8 文件上传
import { describe, it, expect } from 'vitest'
import {
  SUPPORTED_EXTENSIONS,
  SUPPORTED_MIME_TYPES,
  MAX_FILE_SIZE,
  MAX_TEXT_LEN,
  validateFile,
  extractFileName,
  formatFileSize,
} from '../src/lib/fileUpload'

describe('fileUpload (v1.18.0-B8)', () => {
  describe('常量', () => {
    it('SUPPORTED_EXTENSIONS 含 .txt 和 .md', () => {
      expect(SUPPORTED_EXTENSIONS).toContain('.txt')
      expect(SUPPORTED_EXTENSIONS).toContain('.md')
    })

    it('MAX_FILE_SIZE = 1MB', () => {
      expect(MAX_FILE_SIZE).toBe(1024 * 1024)
    })

    it('MAX_TEXT_LEN = 10000', () => {
      expect(MAX_TEXT_LEN).toBe(10000)
    })
  })

  describe('validateFile', () => {
    it('.txt 文件有效', () => {
      const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
      const result = validateFile(file)
      expect(result.valid).toBe(true)
    })

    it('.md 文件有效', () => {
      const file = new File(['# Title'], 'test.md', { type: 'text/markdown' })
      const result = validateFile(file)
      expect(result.valid).toBe(true)
    })

    it('大小写不敏感 (.TXT)', () => {
      const file = new File(['hello'], 'test.TXT', { type: 'text/plain' })
      const result = validateFile(file)
      expect(result.valid).toBe(true)
    })

    it('不支持类型', () => {
      // v1.23 起 .pdf 变支持, 用 .docx 作为不支持例子
      const file = new File(['data'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      const result = validateFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('不支持')
    })

    it('空文件', () => {
      const file = new File([], 'empty.txt', { type: 'text/plain' })
      const result = validateFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('空')
    })

    it('过大文件 (>1MB)', () => {
      const big = new Uint8Array(MAX_FILE_SIZE + 1)
      const file = new File([big], 'big.txt', { type: 'text/plain' })
      const result = validateFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('过大')
    })

    it('刚好 1MB 有效', () => {
      const ok = new Uint8Array(MAX_FILE_SIZE)
      const file = new File([ok], 'ok.txt', { type: 'text/plain' })
      const result = validateFile(file)
      expect(result.valid).toBe(true)
    })

    it('application/octet-stream 也接受 (某些 .md 无标准 MIME)', () => {
      const file = new File(['# md'], 'test.md', { type: 'application/octet-stream' })
      const result = validateFile(file)
      expect(result.valid).toBe(true)
    })
  })

  describe('extractFileName', () => {
    it('去 .txt 扩展名', () => {
      expect(extractFileName('hello.txt')).toBe('hello')
    })

    it('去 .md 扩展名', () => {
      expect(extractFileName('article.md')).toBe('article')
    })

    it('大小写不敏感', () => {
      expect(extractFileName('Hello.TXT')).toBe('Hello')
    })

    it('替换 _ 和 - 为空格', () => {
      expect(extractFileName('my_article-v2.txt')).toBe('my article v2')
    })

    it('超 30 字符截断 + 省略号', () => {
      const long = 'a'.repeat(50) + '.txt'
      const r = extractFileName(long)
      expect(r.length).toBeLessThanOrEqual(31)  // 30 + …
      expect(r.endsWith('…')).toBe(true)
    })

    it('空文件名返 "未命名场景"', () => {
      expect(extractFileName('')).toBe('未命名场景')
    })

    it('仅扩展名 → "未命名场景"', () => {
      expect(extractFileName('.txt')).toBe('未命名场景')
    })

    it('中文文件名保留', () => {
      expect(extractFileName('我的文章.md')).toBe('我的文章')
    })
  })

  describe('formatFileSize', () => {
    it('B (< 1024)', () => {
      expect(formatFileSize(500)).toBe('500 B')
    })

    it('KB (1024 - 1MB)', () => {
      expect(formatFileSize(2048)).toBe('2.0 KB')
    })

    it('MB (>= 1MB)', () => {
      expect(formatFileSize(MAX_FILE_SIZE)).toBe('1.00 MB')
    })

    it('小 KB 保留 1 位小数', () => {
      expect(formatFileSize(1500)).toBe('1.5 KB')
    })
  })
})
