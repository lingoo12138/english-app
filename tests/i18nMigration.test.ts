// tests/i18nMigration.test.ts - v1.43.0 W43-C i18n UI 迁移验证
import { describe, it, expect, beforeEach } from 'vitest'
import { t, getLocale, setLocale, initLocale } from '../src/lib/i18n'

describe('i18nMigration (v1.43.0-W43-C)', () => {
  beforeEach(() => {
    initLocale()
  })

  it('t() 默认 zh 翻译正确', () => {
    setLocale('zh')
    expect(t('common.save')).toBe('保存')
  })

  it('t() 显式 en 翻译正确', () => {
    setLocale('en')
    expect(t('common.save')).toBe('Save')
  })

  it('未知 key 返 key 本身', () => {
    expect(t('xyz.unknown', 'zh')).toBe('xyz.unknown')
  })

  it('getLocale 返回当前 locale', () => {
    setLocale('en')
    expect(getLocale()).toBe('en')
    setLocale('zh')
    expect(getLocale()).toBe('zh')
  })

  it('getLocale 默认 zh (无 localStorage)', () => {
    localStorage.clear()
    initLocale()
    expect(getLocale()).toBe('zh')
  })

  it('t() 在 zh 含 home_/review_/settings_ 命名空间 (UI 集成)', () => {
    setLocale('zh')
    // 这些 key 必须在 DICT 里
    expect(t('common.save')).toBeTruthy()
    expect(t('common.cancel')).toBeTruthy()
  })
})
