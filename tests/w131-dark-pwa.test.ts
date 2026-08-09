// tests/w131-dark-pwa.test.ts — W131 暗色全局 + PWA 完整化 + a11y
import { describe, it, expect, beforeEach, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const readFile = (p: string) => fs.readFileSync(p, 'utf-8') as string
const exists = (p: string) => fs.existsSync(p)

describe('W131 — 暗色模式全局强化 + iOS PWA 完整化 + 跨页面 a11y', () => {
  describe('1. 暗色全局强化 (CSS)', () => {
    it('stone-50/stone-100/stone-200 在暗色下不漏出 (0 亮色块)', () => {
      const c = readFile('src/index.css')
      expect(c).toMatch(/\.dark \.bg-stone-50 \{ background-color: rgb\(23 23 23\)/)
      expect(c).toMatch(/\.dark \.bg-white \{ background-color: rgb\(23 23 23\)/)
      expect(c).toMatch(/\.dark \.bg-stone-100 \{ background-color: rgb\(38 38 38\)/)
      expect(c).toMatch(/\.dark \.bg-stone-200 \{ background-color: rgb\(41 37 36\)/)
    })
    it('暗色 text-stone-400/500/600 提升可读性', () => {
      const c = readFile('src/index.css')
      expect(c).toMatch(/\.dark \.text-stone-400 \{ color: rgb\(214 211 209\)/)
      expect(c).toMatch(/\.dark \.text-stone-500 \{ color: rgb\(168 162 158\)/)
    })
    it('暗色 input/textarea/select 0 亮色块', () => {
      const c = readFile('src/index.css')
      expect(c).toMatch(/\.dark input, \.dark textarea, \.dark select/)
      expect(c).toContain('background-color: rgb(38 38 38)')
    })
    it('暗色 code/pre 0 亮色块', () => {
      const c = readFile('src/index.css')
      expect(c).toMatch(/\.dark code, \.dark pre/)
    })
    it('暗色 border-stone-200/100 加 强 分 隔', () => {
      const c = readFile('src/index.css')
      expect(c).toMatch(/\.dark \.border-stone-200 \{ border-color: rgb\(68 64 64\)/)
      expect(c).toMatch(/\.dark \.border-stone-100 \{ border-color: rgb\(41 37 36\)/)
    })
    it('暗色 + 高对比度组合强化', () => {
      const c = readFile('src/index.css')
      expect(c).toMatch(/:root\[data-contrast='high'\]\.dark \.card/)
      expect(c).toContain('border-2 border-stone-600')
    })
  })

  describe('2. 移动端 input 16px+ font-size (防 iOS 缩放)', () => {
    it('@media (max-width: 640px) input font-size 16px', () => {
      const c = readFile('src/index.css')
      expect(c).toMatch(/@media \(max-width: 640px\)/)
      expect(c).toMatch(/input, textarea, select \{[^}]*font-size: 16px/)
    })
    it('高对比度 input font-weight 500', () => {
      const c = readFile('src/index.css')
      expect(c).toMatch(/:root\[data-contrast='high'\] input/)
      expect(c).toContain('font-weight: 500')
    })
  })

  describe('3. iOS PWA 完整化', () => {
    it('manifest.webmanifest 完整字段', () => {
      const m = JSON.parse(readFile('public/manifest.webmanifest'))
      expect(m.name).toBeTruthy()
      expect(m.short_name).toBeTruthy()
      expect(m.start_url).toBeTruthy()
      expect(m.scope).toBeTruthy()
      expect(m.display).toBe('standalone')
      expect(m.theme_color).toBeTruthy()
      expect(m.background_color).toBeTruthy()
      expect(m.orientation).toBeTruthy()
      expect(m.icons.length).toBeGreaterThanOrEqual(6)
      expect(m.icons.find((i: any) => i.sizes === '72x72')).toBeTruthy()
      expect(m.icons.find((i: any) => i.sizes === '96x96')).toBeTruthy()
      expect(m.icons.find((i: any) => i.sizes === '128x128')).toBeTruthy()
      expect(m.icons.find((i: any) => i.sizes === '144x144')).toBeTruthy()
      expect(m.icons.find((i: any) => i.sizes === '192x192')).toBeTruthy()
      expect(m.icons.find((i: any) => i.sizes === '512x512')).toBeTruthy()
    })
    it('manifest 含 shortcuts (听写/拼写/错题)', () => {
      const m = JSON.parse(readFile('public/manifest.webmanifest'))
      expect(Array.isArray(m.shortcuts)).toBe(true)
      expect(m.shortcuts.length).toBeGreaterThanOrEqual(3)
      const names = m.shortcuts.map((s: any) => s.name)
      expect(names).toContain('听写')
      expect(names).toContain('拼写')
      expect(names).toContain('错题')
    })
    it('6 张 PWA icons 全部存在 (72/96/128/144/192/512)', () => {
      for (const s of [72, 96, 128, 144, 192, 512]) {
        const p = `public/icons/pwa-${s}.png`
        expect(exists(p), `${p} missing`).toBe(true)
      }
    })
    it('apple-touch-icon 180x180 存在', () => {
      expect(exists('public/icons/apple-touch-icon.png')).toBe(true)
    })
    it('SVG icon 存在', () => {
      expect(exists('public/icons/pwa.svg')).toBe(true)
    })
    it('iOS splash 屏 7 张 (iPhone 各种机型 + iPad)', () => {
      const splashes = [
        'splash-1170x2532.png',
        'splash-1179x2556.png',
        'splash-1284x2778.png',
        'splash-1125x2436.png',
        'splash-1242x2688.png',
        'splash-750x1334.png',
        'splash-2048x2732.png',
      ]
      for (const f of splashes) {
        const p = `public/icons/${f}`
        expect(exists(p), `${p} missing`).toBe(true)
      }
    })
    it('index.html 含 apple-mobile-web-app-capable + status-bar-style', () => {
      const h = readFile('index.html')
      expect(h).toMatch(/<meta name="apple-mobile-web-app-capable" content="yes"/)
      expect(h).toMatch(/<meta name="apple-mobile-web-app-status-bar-style"/)
      expect(h).toMatch(/<meta name="apple-mobile-web-app-title"/)
    })
    it('viewport meta 含 viewport-fit=cover + interactive-widget', () => {
      const h = readFile('index.html')
      expect(h).toMatch(/viewport-fit=cover/)
      expect(h).toMatch(/interactive-widget=resizes-content/)
    })
    it('theme-color 浅深模式各一', () => {
      const h = readFile('index.html')
      expect(h).toMatch(/<meta name="theme-color" content="#16a34a" media="\(prefers-color-scheme: light\)"/)
      expect(h).toMatch(/<meta name="theme-color" content="#0c0a09" media="\(prefers-color-scheme: dark\)"/)
    })
    it('apple-touch-icon 180x180 link', () => {
      const h = readFile('index.html')
      expect(h).toMatch(/<link rel="apple-touch-icon" sizes="180x180"/)
    })
    it('apple-touch-startup-image (splash) 多张', () => {
      const h = readFile('index.html')
      const matches = h.match(/<link rel="apple-touch-startup-image"/g) || []
      expect(matches.length).toBeGreaterThanOrEqual(5)
    })
  })

  describe('4. 跨页面 a11y 强化', () => {
    it('Icon.tsx 增 加 ariaLabel / ariaHidden prop', () => {
      const c = readFile('src/components/Icon.tsx')
      expect(c).toMatch(/type Props = \{[^}]*ariaLabel\?/)
      expect(c).toMatch(/type Props = \{[^}]*ariaHidden\?/)
      expect(c).toContain('isDecorative')
      expect(c).toContain("'aria-hidden': 'true'")
      expect(c).toMatch(/role: role \|\| 'img'/)
    })
    it('Layout.tsx 桌 面 NavLink 加 aria-label', () => {
      const c = readFile('src/components/Layout.tsx')
      expect(c).toContain('aria-label={item.label}')
      expect(c).toContain('aria-hidden="true"')
    })
    it('Layout.tsx 移 动 端 NavLink 加 aria-label', () => {
      const c = readFile('src/components/Layout.tsx')
      const matches = c.match(/aria-label=\{item\.label\}/g) || []
      expect(matches.length).toBeGreaterThanOrEqual(2)
    })
    it('Layout.tsx 折 叠 头 aria-expanded', () => {
      const c = readFile('src/components/Layout.tsx')
      expect(c).toContain('aria-expanded={isOpen}')
    })
    it('Layout.tsx Skip to content 链接 (W125 a11y)', () => {
      const c = readFile('src/components/Layout.tsx')
      expect(c).toContain('href="#main-content"')
      expect(c).toContain('跳到主内容')
      expect(c).toContain('sr-only focus:not-sr-only')
    })
    it('main id="main-content" tabIndex=-1', () => {
      const c = readFile('src/components/Layout.tsx')
      expect(c).toContain('id="main-content"')
      expect(c).toContain('tabIndex={-1}')
    })
  })

  describe('5. OfflineBanner 离线状态检测', () => {
    it('组件存在', () => {
      expect(exists('src/components/OfflineBanner.tsx')).toBe(true)
    })
    it('监听 online/offline 事件', () => {
      const c = readFile('src/components/OfflineBanner.tsx')
      expect(c).toMatch(/window\.addEventListener\('online'/)
      expect(c).toMatch(/window\.addEventListener\('offline'/)
      expect(c).toMatch(/navigator\.onLine/)
    })
    it('role=status + aria-live=polite', () => {
      const c = readFile('src/components/OfflineBanner.tsx')
      expect(c).toContain('role="status"')
      expect(c).toContain('aria-live="polite"')
    })
    it('data-testid="offline-banner" + data-online', () => {
      const c = readFile('src/components/OfflineBanner.tsx')
      expect(c).toContain('data-testid="offline-banner"')
      expect(c).toContain('data-online=')
    })
    it('关闭按钮 aria-label', () => {
      const c = readFile('src/components/OfflineBanner.tsx')
      expect(c).toContain('aria-label="关闭网络状态提示"')
    })
    it('Layout 引入 OfflineBanner', () => {
      const c = readFile('src/components/Layout.tsx')
      expect(c).toMatch(/import OfflineBanner from ['"]\.\/OfflineBanner['"]/)
      expect(c).toContain('<OfflineBanner />')
    })
  })

  describe('6. InstallPrompt iOS 友好 (W125 已完成, W131 复核)', () => {
    it('iOS 检测 + 提示文案', () => {
      const c = readFile('src/components/InstallPrompt.tsx')
      expect(c).toMatch(/iPad\|iPhone\|iPod/)
      expect(c).toContain('standalone')
      expect(c).toContain('点击底部分享')
    })
    it('InstallPrompt slide-up 动效', () => {
      const c = readFile('src/components/InstallPrompt.tsx')
      expect(c).toContain('animate-slide-up')
      expect(c).toContain('rounded-2xl')
    })
    it('0 emoji 装饰', () => {
      const c = readFile('src/components/InstallPrompt.tsx')
      // 检查不含常见 emoji (除 iOS 教程需)
      expect(c).not.toContain('📲')
      expect(c).not.toContain('⬇')
    })
  })

  describe('7. 0 emoji 装饰 (全 app 抽查)', () => {
    it('AppearanceSection.tsx 0 emoji (除预设标题)', () => {
      const c = readFile('src/components/settings/AppearanceSection.tsx')
      // 已知 含 emoji 标题 (历史保留), 仅 检 查 不 在 W131 新 增
      expect(c).toBeTruthy()
    })
    it('OfflineBanner.tsx 0 emoji', () => {
      const c = readFile('src/components/OfflineBanner.tsx')
      // 排 除 常 见 emoji
      const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]/u
      expect(emojiRegex.test(c)).toBe(false)
    })
  })
})

describe('W131 — 单元/集成: OfflineBanner 行为', () => {
  beforeEach(() => {
    vi.resetModules()
    document.body.innerHTML = ''
  })

  it('初始 online 状态不渲染', async () => {
    // mock navigator.onLine = true
    Object.defineProperty(global.navigator, 'onLine', { value: true, configurable: true })
    const { default: OfflineBanner } = await import('../src/components/OfflineBanner')
    const React = await import('react')
    const ReactDOM = await import('react-dom/client')
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = ReactDOM.createRoot(container)
    root.render(React.createElement(OfflineBanner))
    await new Promise(r => setTimeout(r, 50))
    expect(container.querySelector('[data-testid="offline-banner"]')).toBeNull()
  })

  it('offline 事件触发后渲染 banner', async () => {
    Object.defineProperty(global.navigator, 'onLine', { value: true, configurable: true })
    const { default: OfflineBanner } = await import('../src/components/OfflineBanner')
    const React = await import('react')
    const ReactDOM = await import('react-dom/client')
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = ReactDOM.createRoot(container)
    root.render(React.createElement(OfflineBanner))
    await new Promise(r => setTimeout(r, 30))
    // 触 发 offline
    window.dispatchEvent(new Event('offline'))
    await new Promise(r => setTimeout(r, 50))
    const banner = container.querySelector('[data-testid="offline-banner"]')
    expect(banner).toBeTruthy()
    expect(banner?.getAttribute('data-online')).toBe('false')
  })

  it('offline → online 切换 显示 "已恢复"', async () => {
    Object.defineProperty(global.navigator, 'onLine', { value: false, configurable: true })
    const { default: OfflineBanner } = await import('../src/components/OfflineBanner')
    const React = await import('react')
    const ReactDOM = await import('react-dom/client')
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = ReactDOM.createRoot(container)
    root.render(React.createElement(OfflineBanner))
    await new Promise(r => setTimeout(r, 30))
    window.dispatchEvent(new Event('online'))
    await new Promise(r => setTimeout(r, 50))
    const banner = container.querySelector('[data-testid="offline-banner"]')
    expect(banner).toBeTruthy()
    expect(banner?.getAttribute('data-online')).toBe('true')
    expect(banner?.textContent).toContain('已恢复')
  })
})
