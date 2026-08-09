// tests/w122-docs.test.ts - W122 docs/CHANGELOG + README v2.1.x 完 善
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

describe('W122 文 档 完 善 (CHANGELOG + README)', () => {
  const changelog = readFileSync('docs/CHANGELOG.md', 'utf-8')
  const readme = readFileSync('README.md', 'utf-8')
  const summary = readFileSync('docs/SUMMARY_v2.1.x.md', 'utf-8')

  it('CHANGELOG.md v2.1.x 大 节 存 在 (W112-W121 详 细 entry)', () => {
    // 业 务: 大 改 良 必 须 有 CHANGELOG entry
    expect(changelog).toContain('## [v2.1.x]')
    expect(changelog).toContain('W120 — Skeleton')
    expect(changelog).toContain('W121 — 22 项 4 大组折叠')
    expect(changelog).toContain('W118 — 32 组件 emoji 替 Icon SVG')
    expect(changelog).toContain('W117 — 字体升级')
    expect(changelog).toContain('W116 — 字母索引动效')
    expect(changelog).toContain('W115 — Home 24→8 卡重构')
    expect(changelog).toContain('W114 — Home 渐变 8→2 收敛')
    expect(changelog).toContain('W113 — UI 基建')
    expect(changelog).toContain('W112 — 移动 Tab UX bug 修')
  })

  it('CHANGELOG.md 改 版 稿 8 大 改 良 点 落 地 状 态 表 (8/8 完 整)', () => {
    // 业 务: 8 大 改 良 点 100% 完 整 落 地 标 识
    expect(changelog).toContain('卡片柔浮 (.card v2)')
    expect(changelog).toContain('渐变 8→2 收敛')
    expect(changelog).toContain('Bento Grid + MainCTA')
    expect(changelog).toContain('字母索引动效')
    expect(changelog).toContain('Lucide 图标')
    expect(changelog).toContain('字体升级')
    expect(changelog).toContain('Motion token')
    expect(changelog).toContain('主 CTA ≤ 5 步')
    expect(changelog).toContain('反馈层 (Skeleton)')
    expect(changelog).toContain('22 项 → 4 大组折叠')
  })

  it('CHANGELOG.md 累 计 数 据 (1225 测 试 / 5,423 词 / 0 P0+P1)', () => {
    // 业 务: 累 计 数 据 一 致
    expect(changelog).toContain('1225 单元测试')
    expect(changelog).toContain('5,423 词 / 100%')
    expect(changelog).toContain('0 P0 + 0 P1 业务')
    expect(changelog).toContain('18 verifier')
  })

  it('README.md 升 级 v2.1.7 (v2.0.9 升 2 阶)', () => {
    // 业 务: 顶 部 版 本 号 升 级
    expect(readme).toContain('v2.1.7')
    expect(readme).not.toMatch(/^# 句刻 · 即时英语学习 v2\.0\.9$/m)
  })

  it('README.md v2.1.x 改 良 段 落 (10/10 落 地 状 态)', () => {
    // 业 务: README 包 含 改 版 稿 8 大 + 2 补 充 落 地 状 态
    expect(readme).toContain('v2.1.x UI 改造总结')
    expect(readme).toContain('10/10 业务价值完整落地')
  })

  it('SUMMARY_v2.1.x.md W112-W118 完 整 总 结 (1.0 节)', () => {
    // 业 务: SUMMARY 总 结 文 档
    expect(summary).toContain('W112')
    expect(summary).toContain('W113')
    expect(summary).toContain('W114')
    expect(summary).toContain('W115')
    expect(summary).toContain('W116')
    expect(summary).toContain('W117')
    expect(summary).toContain('W118')
    expect(summary).toContain('改版稿 8 大改良点')
  })

  it('README.md 链 接 SUMMARY_v2.1.x + CHANGELOG', () => {
    // 业 务: README 引 用 SUMMARY + CHANGELOG
    expect(readme).toContain('SUMMARY_v2.1.x')
    expect(readme).toContain('CHANGELOG')
  })
})
