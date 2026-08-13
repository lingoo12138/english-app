// tests/w148-install-prompt.test.ts - W148-C 桌面 PWA InstallPrompt 改造
// 业务: W7 iOS 引导 + W125 动效 → W148 加桌面 chrome/edge 安装检测 + 已安装不显示 + Icon SVG + data-testid
// 策略: file content 检查 (跟 W133 / W147 一致, 渲染测试在 happy-dom + RTL 单独跑)

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'

const readFile = (p: string) => readFileSync(p, 'utf-8') as string

describe('W148-C InstallPrompt.tsx — 桌面 PWA 安装检测 + Icon + data-testid', () => {
  const c = readFile('src/components/InstallPrompt.tsx')

  it('文件存在 + W7/W125/W148 注释齐全', () => {
    expect(existsSync('src/components/InstallPrompt.tsx')).toBe(true)
    // 业务历史
    expect(c).toContain('W7')
    expect(c).toContain('W125')
    // W148 注释
    expect(c).toContain('W148')
  })

  it('桌面 chrome/edge PWA 模式检测 — display-mode: standalone', () => {
    // W148-C: 强制要求 matchMedia('(display-mode: standalone)')
    expect(c).toMatch(/window\.matchMedia\(['"`]\(display-mode:\s*standalone\)['"`]\)/)
    expect(c).toMatch(/isStandalone/)
  })

  it('iOS PWA 模式检测 — navigator.standalone === true (兜底)', () => {
    // W148-C: iOS Safari 装到主屏后 (navigator as any).standalone === true
    expect(c).toMatch(/navigator[^\n]*standalone\s*===\s*true/)
    expect(c).toMatch(/isIOSStandalone/)
  })

  it('未安装 — chrome/edge 桌面 + Android 都支持 beforeinstallprompt', () => {
    // 已存在 W7, W148 强化: button 文本 "安装到桌面"
    expect(c).toMatch(/addEventListener\(['"]beforeinstallprompt['"]/)
    expect(c).toContain('安装到桌面')
    expect(c).toMatch(/data-testid="install-prompt-button"/)
  })

  it('已安装 — standalone / iOS PWA 早 return 不显示', () => {
    // W148-C: 双重检测 (desktop + iOS) 命中 → return, 不渲染
    const earlyReturn = c.match(/if\s*\(isStandalone\s*\|\|\s*isIOSStandalone\)\s*\{[\s\S]{0,80}?return/)
    expect(earlyReturn).toBeTruthy()
    expect(earlyReturn![0]).toContain('return')
  })

  it('appinstalled 事件 — 安装完成后短暂反馈 (3s 自动消失)', () => {
    // W148-C: chrome/edge 安装完成后触发 appinstalled → 显示绿色成功条
    expect(c).toMatch(/addEventListener\(['"]appinstalled['"]/)
    expect(c).toContain('setInstalled(true)')
    expect(c).toMatch(/setTimeout\([\s\S]{0,80}?,\s*3000\)/)
    // 绿色反馈条
    expect(c).toContain('bg-emerald-600')
    expect(c).toContain('已安装到桌面')
    expect(c).toMatch(/data-testid="install-prompt-installed"/)
  })

  it('0 emoji — Icon SVG 替 (IconDownload / IconCheck / IconShare / IconClose)', () => {
    // 业务硬约束
    const emojiRe = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/u
    expect(emojiRe.test(c), 'InstallPrompt 0 emoji').toBe(false)
    // 4 个 Icon 必须导入
    expect(c).toContain('IconShare')
    expect(c).toContain('IconClose')
    expect(c).toContain('IconDownload')
    expect(c).toContain('IconCheck')
  })

  it('iOS 现有逻辑保留 (navigator.userAgent / iOS 提示)', () => {
    // 不破坏 W7 iOS 引导
    expect(c).toMatch(/iPad\|iPhone\|iPod/)
    expect(c).toContain('iOS:')
    expect(c).toContain('showIOSHint')
  })

  it('a11y — role="dialog" / role="status" / aria-label', () => {
    expect(c).toContain('role="dialog"')
    expect(c).toContain('role="status"')
    expect(c).toMatch(/aria-label="安装应用到主屏"/)
    expect(c).toMatch(/aria-label="已安装到桌面"/)
    expect(c).toMatch(/aria-label="关闭安装提示"/)
  })

  it('data-testid 供 e2e (4 个: prompt / button / close / installed)', () => {
    expect(c).toMatch(/data-testid="install-prompt"/)
    expect(c).toMatch(/data-testid="install-prompt-button"/)
    expect(c).toMatch(/data-testid="install-prompt-close"/)
    expect(c).toMatch(/data-testid="install-prompt-installed"/)
  })
})

// ============================================================
// Icon.tsx 必须有 IconDownload / IconCheck (W146 加的 4 个里)
// ============================================================

describe('W148-C Icon.tsx — 必备 Icon 已存在', () => {
  const icon = readFile('src/components/Icon.tsx')

  it('IconDownload 导出 (W146 UsagePage 加)', () => {
    expect(icon).toMatch(/export const IconDownload/)
  })

  it('IconCheck 导出 (W146 NPS 提示加)', () => {
    expect(icon).toMatch(/export const IconCheck/)
  })

  it('Icon 库总数 ≥ 29 (W146 加 4 个后)', () => {
    const iconCount = (icon.match(/^export const Icon/gm) || []).length
    expect(iconCount).toBeGreaterThanOrEqual(29)
  })
})
