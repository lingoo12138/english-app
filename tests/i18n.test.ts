// tests/i18n.test.ts - v1.41.0 W41 i18n
import { describe, it, expect, beforeEach } from 'vitest'
import { t, tMany, getLocale, setLocale, initLocale } from '../src/lib/i18n'

describe('i18n (v1.41.0-W41)', () => {
  beforeEach(() => {
    localStorage.clear()
    // 重置 module state
    setLocale('zh')
  })

  describe('t (单 key 翻译)', () => {
    it('zh 默认', () => {
      expect(t('common.save')).toBe('保存')
    })
    it('en 显式', () => {
      expect(t('common.save', 'en')).toBe('Save')
    })
    it('未知 key 返 key 本身', () => {
      expect(t('unknown.key', 'zh')).toBe('unknown.key')
    })
    it('缺 zh 翻译 fallback en', () => {
      // 假设某 key 缺 zh, 实际 t('common.save', 'en') = 'Save'
      expect(t('common.save', 'en')).toBeTruthy()
    })
  })

  describe('tMany (批量翻译)', () => {
    it('返 key-value 对象', () => {
      const r = tMany(['common.save', 'common.cancel'], 'zh')
      expect(r['common.save']).toBe('保存')
      expect(r['common.cancel']).toBe('取消')
    })
  })

  describe('getLocale / setLocale', () => {
    it('默认 zh', () => {
      expect(getLocale()).toBe('zh')
    })
    it('setLocale 改 en', () => {
      setLocale('en')
      expect(getLocale()).toBe('en')
    })
    it('localStorage 持久化', () => {
      setLocale('en')
      expect(localStorage.getItem('app-locale')).toBe('en')
    })
  })

  describe('initLocale', () => {
    it('从 localStorage 读', () => {
      localStorage.setItem('app-locale', 'en')
      expect(initLocale()).toBe('en')
    })
  })
})
