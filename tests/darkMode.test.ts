// tests/darkMode.test.ts - v1.39.0 W37-3 暗色模式优化
import { describe, it, expect, beforeEach } from 'vitest'
import { isDarkMode, toggleDarkMode, initDarkMode, applyContrastFix } from '../src/lib/themes'

describe('darkMode (v1.39.0-W37-3)', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    const styleEl = document.getElementById('dark-contrast-fix')
    if (styleEl) styleEl.textContent = ''
  })

  describe('isDarkMode', () => {
    it('浅色模式返 false', () => {
      expect(isDarkMode()).toBe(false)
    })
    it('html.dark → true', () => {
      document.documentElement.classList.add('dark')
      expect(isDarkMode()).toBe(true)
    })
  })

  describe('toggleDarkMode', () => {
    it('无 force 切换', () => {
      expect(toggleDarkMode()).toBe(true)
      expect(document.documentElement.classList.contains('dark')).toBe(true)
      expect(toggleDarkMode()).toBe(false)
    })
    it('force=true 强制开', () => {
      expect(toggleDarkMode(true)).toBe(true)
    })
    it('force=false 强制关', () => {
      document.documentElement.classList.add('dark')
      expect(toggleDarkMode(false)).toBe(false)
    })
    it('持久化到 localStorage', () => {
      toggleDarkMode(true)
      expect(localStorage.getItem('dark-mode')).toBe('1')
      toggleDarkMode(false)
      expect(localStorage.getItem('dark-mode')).toBe('0')
    })
  })

  describe('applyContrastFix', () => {
    it('暗色模式注入 style', () => {
      applyContrastFix(true)
      const el = document.getElementById('dark-contrast-fix')!
      expect(el.textContent).toContain('.dark')
    })
    it('浅色模式清空', () => {
      applyContrastFix(true)
      applyContrastFix(false)
      const el = document.getElementById('dark-contrast-fix')!
      expect(el.textContent).toBe('')
    })
  })

  describe('initDarkMode', () => {
    it('localStorage=1 → 暗色', () => {
      localStorage.setItem('dark-mode', '1')
      expect(initDarkMode()).toBe(true)
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })
    it('localStorage=0 → 浅色', () => {
      localStorage.setItem('dark-mode', '0')
      expect(initDarkMode()).toBe(false)
    })
  })
})
