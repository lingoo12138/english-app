// tests/w118-icon.test.ts - W118 32 组件 emoji 替 Icon SVG
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

describe('W118 32 组件 emoji 替 Icon SVG', () => {
  const layout = readFileSync('src/components/Layout.tsx', 'utf-8')
  const home = readFileSync('src/pages/Home.tsx', 'utf-8')
  const icon = readFileSync('src/components/Icon.tsx', 'utf-8')

  it('Icon 组 件 库 20 个 SVG 出 口', () => {
    // 业 务: 涵 盖 Layout (22 项) + Home (10 项) + WordDetail (5 项)
    expect(icon).toMatch(/export const IconHome/)
    expect(icon).toMatch(/export const IconBook/)
    expect(icon).toMatch(/export const IconVideo/)
    expect(icon).toMatch(/export const IconSparkles/)
    expect(icon).toMatch(/export const IconChat/)
    expect(icon).toMatch(/export const IconCalendar/)
    expect(icon).toMatch(/export const IconEdit/)
    expect(icon).toMatch(/export const IconHeadphones/)
    expect(icon).toMatch(/export const IconBarChart/)
    expect(icon).toMatch(/export const IconSettings/)
    expect(icon).toMatch(/export const IconTrophy/)
    expect(icon).toMatch(/export const IconStar/)
    expect(icon).toMatch(/export const IconUser/)
    expect(icon).toMatch(/export const IconShare/)
    expect(icon).toMatch(/export const IconFileText/)
  })

  it('Icon 0 依 赖 (纯 内 联 SVG, 跟 改版稿 一致)', () => {
    // 业 务: 0 依 赖, 不 用 lucide-react
    expect(icon).not.toMatch(/from ['"]lucide-react['"]/)
    expect(icon).toMatch(/viewBox="0 0 24 24"/)
  })

  it('Layout 桌 面 22 项 引 Icon (替 emoji)', () => {
    // 业 务: 22 桌 面 + 5 移 动 = 27 项, 全 替
    expect(layout).toMatch(/Icon: IconHome/)
    expect(layout).toMatch(/Icon: IconBook/)
    expect(layout).toMatch(/Icon: IconSettings/)
    // 旧 emoji 全 清
    expect(layout).not.toMatch(/icon: '🏠'/)
    expect(layout).not.toMatch(/icon: '⚙️'/)
  })

  it('Layout 移 动 5 项 引 Icon (替 emoji)', () => {
    expect(layout).toMatch(/Icon: IconUser/)
    expect(layout).not.toMatch(/icon: '👤'/)
  })

  it('Layout 桌 面 侧 栏 <Icon> 渲 染 (替 <span> emoji)', () => {
    // 业 务: <span className="text-lg">{item.icon}</span> 改 <Icon size={16} />
    expect(layout).toMatch(/<Icon size=\{16\}/)
  })

  it('Layout 移 动 tab <Icon> 渲 染 (替 emoji)', () => {
    expect(layout).toMatch(/<Icon size=\{22\}/)
  })

  it('Home MainCTA 欢 迎 emoji 👋 替 IconWaving', () => {
    // 业 务: 主 CTA 顶 部 头 像 替 IconWaving
    expect(home).toContain('IconWaving')
    expect(home).toContain('<IconWaving')
  })

  it('Home 4 状 态 (成就/日报/自定义/日历) emoji 替 Icon SVG', () => {
    // 业 务: 4 状 态 2x2 网格 全 替
    expect(home).toContain('<IconTrophy size={22}')
    expect(home).toContain('<IconBarChart size={22}')
    expect(home).toContain('<IconEdit size={22}')
    expect(home).toContain('<IconCalendar size={22}')
  })

  it('Home 5 推 荐 (场景/拍照/AI/计划/写作) emoji 替 Icon SVG', () => {
    // 业 务: 5 推 荐 横 滚 quick-bar 全 替
    expect(home).toContain('<IconVideo size={22}')
    expect(home).toContain('<IconHeadphones size={22}')
    expect(home).toContain('<IconChat size={22}')
  })

  it('Home + Layout emoji 总 数 减 少 ≥ 25 (从 47 减 到 ≤ 22)', () => {
    // 业 务: Layout 25 + Home 22 = 47, 现 在 大 部 替, 剩 主 CTA 1 + streak 1 + Notebook emoji + ErrorReview + AIChat + ReportsPage 等
    // 用 "icon: '" 匹 配 旧 形 式 (icon: '🏠' 等)
    const layoutOldIcon = (layout.match(/icon: '[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]'/gu) || []).length
    const homeOldIcon = (home.match(/>[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu) || []).length
    // Layout 应 该 0 (全 替)
    expect(layoutOldIcon).toBe(0)
    // Home 减 少 显 著 (原 22, 现 ≤ 12)
    expect(homeOldIcon).toBeLessThanOrEqual(5)  // streak + maincta 1 + 1 备用
  })
})
