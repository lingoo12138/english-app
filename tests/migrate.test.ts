// tests/migrate.test.ts - v1.1-W1-T5: 数据迁移测试
import { describe, it, expect, beforeEach } from 'vitest'
import { db, addFavorite, saveWritingError, saveChat } from '../src/lib/db'
import { exportAll, importAll, validateSchema, getDataStats } from '../src/lib/migrate'
import type { MigrationData } from '../src/lib/migrate'

describe('migrate', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  describe('exportAll', () => {
    it('应返回空 data 当 db 为空', async () => {
      const data = await exportAll()
      expect(data.appVersion).toBeTruthy()
      expect(data.version).toBe(1)
      expect(data.favorites).toEqual([])
      expect(data.chats).toEqual([])
      expect(data.writingErrors).toEqual([])
    })

    it('应包含 timestamp', async () => {
      const data = await exportAll()
      expect(data.exportedAt).toBeGreaterThan(0)
      expect(Date.now() - data.exportedAt).toBeLessThan(5000)
    })

    it('应导出 favorites', async () => {
      await addFavorite('w-test-1')
      await addFavorite('w-test-2')
      const data = await exportAll()
      expect(data.favorites.length).toBe(2)
    })

    it('应导出 writingErrors', async () => {
      await saveWritingError({
        source: 'write',
        original: 'I am go',
        corrected: 'I am going',
        errors: [],
      })
      const data = await exportAll()
      expect(data.writingErrors.length).toBe(1)
      expect(data.writingErrors[0].source).toBe('write')
    })

    it('应导出 chats', async () => {
      await saveChat({
        title: 'test',
        scenario: 'cafe',
        level: 'a2',
        messages: [{ id: 1, role: 'user', content: 'hi', ts: Date.now() }],
      } as any)
      const data = await exportAll()
      expect(data.chats.length).toBe(1)
    })
  })

  describe('validateSchema', () => {
    it('应通过 valid data', () => {
      const data: MigrationData = {
        version: 1,
        appVersion: '1.0.0',
        exportedAt: Date.now(),
        favorites: [],
        pronunciationAttempts: [],
        writingErrors: [],
        chats: [],
        localStorage: {},
      }
      const result = validateSchema(data)
      expect(result.ok).toBe(true)
    })

    it('应拒绝缺失 version', () => {
      const data = { appVersion: '1.0.0' } as any
      const result = validateSchema(data)
      expect(result.ok).toBe(false)
    })

    it('应拒绝错误 version', () => {
      const data = {
        version: 999,
        appVersion: '1.0.0',
        exportedAt: Date.now(),
        favorites: [],
        pronunciationAttempts: [],
        writingErrors: [],
        chats: [],
        localStorage: {},
      } as any
      const result = validateSchema(data)
      expect(result.ok).toBe(false)
    })
  })

  describe('getDataStats', () => {
    it('应返回 0 当 db 空', async () => {
      const stats = await getDataStats()
      expect(stats.favorites).toBe(0)
      expect(stats.chats).toBe(0)
      expect(stats.writingErrors).toBe(0)
    })

    it('应返回正确数量', async () => {
      await addFavorite('w-1')
      await addFavorite('w-2')
      await saveWritingError({
        source: 'write',
        original: 'a',
        corrected: 'b',
        errors: [],
      })
      const stats = await getDataStats()
      expect(stats.favorites).toBe(2)
      expect(stats.writingErrors).toBe(1)
    })
  })

  describe('importAll', () => {
    it('应导入 favorites', async () => {
      const data: MigrationData = {
        version: 1,
        appVersion: '1.0.0',
        exportedAt: Date.now(),
        favorites: [{ wordId: 'w-1', addedAt: Date.now() } as any],
        pronunciationAttempts: [],
        writingErrors: [],
        chats: [],
        localStorage: {},
      }
      const result = await importAll(data)
      expect(result.favorites).toBe(1)
    })

    it('应返回计数对象', async () => {
      const data: MigrationData = {
        version: 1,
        appVersion: '1.0.0',
        exportedAt: Date.now(),
        favorites: [],
        pronunciationAttempts: [],
        writingErrors: [],
        chats: [],
        localStorage: {},
      }
      const result = await importAll(data)
      expect(result).toHaveProperty('favorites')
      expect(result).toHaveProperty('chats')
      expect(result).toHaveProperty('writingErrors')
    })
  })
})
