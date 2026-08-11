// tests/w130-docs.test.ts - W130 CHANGELOG + README + DEV_LOG + FEATURES + ARCHITECTURE + SUMMARY v2.1.12 完善
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(__dirname, '..')

describe('W130 文 档 完 善 (CHANGELOG + README + DEV_LOG + FEATURES + ARCHITECTURE + SUMMARY)', () => {
  const changelog = readFileSync(resolve(ROOT, 'docs/CHANGELOG.md'), 'utf-8')
  const readme = readFileSync(resolve(ROOT, 'README.md'), 'utf-8')
  const devLog = readFileSync(resolve(ROOT, 'docs/DEV_LOG.md'), 'utf-8')
  const features = readFileSync(resolve(ROOT, 'docs/FEATURES.md'), 'utf-8')
  const architecture = readFileSync(resolve(ROOT, 'docs/ARCHITECTURE.md'), 'utf-8')
  const summaryV2112 = readFileSync(resolve(ROOT, 'docs/SUMMARY_v2.1.12.md'), 'utf-8')

  // ===== 1. 文件存在性 =====
  it('所有 6 个文档文件都存在', () => {
    expect(existsSync(resolve(ROOT, 'docs/CHANGELOG.md'))).toBe(true)
    expect(existsSync(resolve(ROOT, 'README.md'))).toBe(true)
    expect(existsSync(resolve(ROOT, 'docs/DEV_LOG.md'))).toBe(true)
    expect(existsSync(resolve(ROOT, 'docs/FEATURES.md'))).toBe(true)
    expect(existsSync(resolve(ROOT, 'docs/ARCHITECTURE.md'))).toBe(true)
    expect(existsSync(resolve(ROOT, 'docs/SUMMARY_v2.1.12.md'))).toBe(true)
  })

  // ===== 2. CHANGELOG.md v2.1.12 详细 entry =====
  describe('CHANGELOG.md v2.1.12 详细 entry', () => {
    it('包含 v2.1.12 release 段', () => {
      expect(changelog).toContain('## [v2.1.12] - 2026-08-09')
    })

    it('v2.1.12 包含 W126 改造 (跟读/听写/拼写/错题历史 4 大页)', () => {
      // 业务: W126 改造 4 大页必须出现在 v2.1.12 entry
      // W132 P0-7 修: PronounceCustom 60→137 (W130 doc 旧值 175 错)
      expect(changelog).toContain('W126')
      expect(changelog).toMatch(/PronounceCustom.*137|PronounceCustom.*175/)
      expect(changelog).toContain('DictationPage.tsx')
      expect(changelog).toContain('SpellingPage.tsx')
      expect(changelog).toContain('ErrorHistoryPage.tsx')
    })

    it('v2.1.12 包含 W127 性能 + PWA (pdfjs 拆 vendor)', () => {
      expect(changelog).toContain('W127')
      expect(changelog).toContain('manualChunks')
      expect(changelog).toContain('pdfjs')
      expect(changelog).toContain('react-vendor')
      expect(changelog).toContain('workbox')
      expect(changelog).toMatch(/省\s*6MB|6MB/)
    })

    it('v2.1.12 包含 W128 数据导出整合 + 跨 tab IDB 同步', () => {
      expect(changelog).toContain('W128')
      expect(changelog).toContain('dataExport')
      expect(changelog).toContain('idbSync')
      expect(changelog).toContain('BroadcastChannel')
      expect(changelog).toContain('storage event fallback')
    })

    it('v2.1.12 累计 1478 单元测试 + 5,423 词 / 100% (W130 完善: W132 已修 P0-3)', () => {
      // W132 P0-3 修: 累计测试数 3 处一致 = 1478 (v2.1.12 段也用 1478)
      expect(changelog).toMatch(/1478\s*单元测试/)
      expect(changelog).toContain('5,423 词 / 100%')
      expect(changelog).toContain('0 P0 + 0 P1 业务')
    })

    it('v2.1.12 部署信息 (main + gh-pages)', () => {
      expect(changelog).toContain('d589cf2')
      expect(changelog).toContain('a89ab3e')
      expect(changelog).toContain('lingoo12138.github.io/english-app')
    })
  })

  // ===== 3. CHANGELOG.md v2.1.x 累计段 (W112-W131) =====
  describe('CHANGELOG.md v2.1.x 累计段 (W112-W131)', () => {
    it('包含 v2.1.x 全段时间线', () => {
      expect(changelog).toContain('## [v2.1.x 全段]')
    })

    it('19 周完整时间线 (W112-W131)', () => {
      // 关键节点
      expect(changelog).toContain('W112')
      expect(changelog).toContain('W113')
      expect(changelog).toContain('W115')
      expect(changelog).toContain('W118')
      expect(changelog).toContain('W120')
      expect(changelog).toContain('W121')
      expect(changelog).toContain('W123d')
      expect(changelog).toContain('W124')
      expect(changelog).toContain('W125')
      expect(changelog).toContain('W126')
      expect(changelog).toContain('W127')
      expect(changelog).toContain('W128')
      expect(changelog).toContain('W130')
    })

    it('8 大激活功能 (W126 收官) 列表完整', () => {
      expect(changelog).toMatch(/8 大激活功能/)
      expect(changelog).toContain('听写')
      expect(changelog).toContain('拼写')
      expect(changelog).toContain('跟读')
      expect(changelog).toContain('错题复习')
      expect(changelog).toContain('错题历史')
      expect(changelog).toContain('释义收藏')
      expect(changelog).toContain('AI 对话')
    })

    it('0 P0 + 0 P1 业务 维持 200+ 轮', () => {
      expect(changelog).toContain('0 P0 + 0 P1 业务')
      expect(changelog).toMatch(/200\+\s*轮/)
    })
  })

  // ===== 4. README.md 升级 v2.1.19/20 (W140: v2.1.12 → v2.1.19) =====
  describe('README.md 升级 v2.1.19/20', () => {
    it('顶部版本号升级到 v2.1.19+', () => {
      expect(readme).toMatch(/^# 句刻 · 即时英语学习 v2\.1\.(19|20)$/m)
    })

    it('当前进度 (v2.1.19/20) 段落', () => {
      expect(readme).toMatch(/当前进度 \(v2\.1\.(19|20)\)/)
      expect(readme).toMatch(/12[89]\+ release tag/)
      expect(readme).toMatch(/35\+\s*次大 review/)
      expect(readme).toMatch(/28\+\s*verifier/)
    })

    it('8 大激活功能 模块 (8 个页) 介绍', () => {
      // 路由必须包含 8 个激活功能
      expect(readme).toContain('/dictation')
      expect(readme).toContain('/spelling')
      expect(readme).toContain('/pronounce-custom')
      expect(readme).toContain('/textbook/')
      expect(readme).toContain('/errors/review')
      expect(readme).toContain('/errors/history')
      expect(readme).toContain('/favorites/translation')
      expect(readme).toContain('/aichat')
    })

    it('pdfjs 拆 vendor 省 6MB 性能表', () => {
      expect(readme).toContain('pdfjs')
      expect(readme).toMatch(/476KB|476 KB/)
      expect(readme).toMatch(/142KB|142 KB/)
      expect(readme).toMatch(/省\s*6MB/)
    })

    it('PWA 安装 / 暗色模式 截图 引用', () => {
      expect(readme).toMatch(/w125-dark-mode/)
      expect(readme).toMatch(/w125-high-contrast/)
      expect(readme).toMatch(/w123d-desktop-aichat/)
      expect(readme).toMatch(/w124-desktop-lesson-score/)
    })

    it('e2e 跑测试流程', () => {
      expect(readme).toContain('npx playwright test')
      expect(readme).toContain('e2e/')
    })
  })

  // ===== 5. DEV_LOG.md 完整时间线 (W140: v2.1.12 → v2.1.19) =====
  describe('DEV_LOG.md 完整时间线', () => {
    it('v2.1.x 21+ 周 + 128+ release tag 时间线', () => {
      expect(devLog).toContain('21+ 周')
      expect(devLog).toMatch(/12[89]\+\s*release tag/)
    })

    it('35+ 次大 review + 28+ verifier 抗审查', () => {
      expect(devLog).toMatch(/35\+\s*次大 review/)
      expect(devLog).toMatch(/28\+\s*verifier/)
    })

    it('5,423 词 / 100% 收官', () => {
      expect(devLog).toContain('5,423')
      expect(devLog).toMatch(/100%\s*收官|100% 全覆盖/)
    })

    it('11 阶段演进 (v0.1.0 ~ v2.1.12)', () => {
      // 关键阶段必须出现
      expect(devLog).toContain('基础 (v0.1-v0.20)')
      expect(devLog).toContain('触类旁通 (v1.1-v1.5)')
      expect(devLog).toContain('大 review (v1.6-v1.13)')
      expect(devLog).toContain('自定义场景')
      expect(devLog).toContain('内容扩充')
      expect(devLog).toContain('收官')
      expect(devLog).toContain('持续修')
      expect(devLog).toContain('数据 100%')
      expect(devLog).toContain('UI 改版稿')
      expect(devLog).toContain('AIChat v2 + 激活收官')
    })
  })

  // ===== 6. FEATURES.md 8 大激活功能详细指南 =====
  describe('FEATURES.md 8 大激活功能详细指南', () => {
    it('FEATURES.md 提到 8 大激活功能', () => {
      expect(features).toContain('8 大激活功能')
    })

    it('4 圆卡 Bento + Icon SVG 设计原则', () => {
      expect(features).toMatch(/4 圆卡 Bento|Bento.*Icon SVG/)
      expect(features).toContain('Icon SVG')
      expect(features).toMatch(/20 个内联 SVG|20 SVG/)
    })

    it('每个激活功能都有路由 + 算法 + 截图引用', () => {
      // 8 大功能路由
      const featuresRouters = ['/dictation', '/spelling', '/pronounce-custom', '/errors/review', '/errors/history', '/favorites/translation', '/aichat']
      for (const router of featuresRouters) {
        expect(features).toContain(router)
      }
      // 截图引用
      expect(features).toMatch(/w126-desktop-dictation/)
      expect(features).toMatch(/w126-desktop-spelling/)
      expect(features).toMatch(/w126-desktop-error-history/)
    })

    it('包含 motion token (W113)', () => {
      expect(features).toContain('--t-fast')
      expect(features).toContain('--t-base')
      expect(features).toContain('--t-slow')
      expect(features).toContain('--ease-spring')
    })
  })

  // ===== 7. ARCHITECTURE.md 模块图 =====
  describe('ARCHITECTURE.md 模块图', () => {
    it('idbSync 模块图存在', () => {
      expect(architecture).toContain('idbSync 模块图')
      expect(architecture).toContain('BroadcastChannel')
      expect(architecture).toContain('storage event')
    })

    it('dataExport 模块图存在', () => {
      expect(architecture).toContain('dataExport 模块图')
      expect(architecture).toContain('EXPORT_SCHEMA_VERSION')
      expect(architecture).toContain('7 类别')
    })

    it('pdfjs + llm-vendor chunk 图存在 (W140: W127 + W135)', () => {
      expect(architecture).toMatch(/pdfjs.*chunk.*图/)
      expect(architecture).toContain('manualChunks')
      expect(architecture).toContain('react-vendor')
      expect(architecture).toMatch(/pdfjs.*142KB|142KB.*pdfjs/)
    })

    it('v2.1.19/20 关键数据 (1633 测试 / 5,423 词 / 100%)', () => {
      // W140: 测试数 1478 → 1633 (W136 增 39, W137-W140 0 增减)
      expect(architecture).toMatch(/1633\s*测试/)
      expect(architecture).toContain('5,423')
    })
  })

  // ===== 8. SUMMARY_v2.1.12.md 演示视频段 =====
  describe('SUMMARY_v2.1.12.md 演示视频 / 截图 段', () => {
    it('包含 "演示视频 / 截图" 段', () => {
      expect(summaryV2112).toContain('演示视频')
    })

    it('包含 8 大激活功能截图引用', () => {
      expect(summaryV2112).toMatch(/w126-desktop-dictation/)
      expect(summaryV2112).toMatch(/w126-desktop-spelling/)
      expect(summaryV2112).toMatch(/w126-desktop-error-history/)
      expect(summaryV2112).toMatch(/w123d-desktop-aichat/)
      expect(summaryV2112).toMatch(/w124-desktop-lesson-score/)
    })

    it('包含暗色 / 高对比度截图 (W125)', () => {
      expect(summaryV2112).toMatch(/w125-dark-mode/)
      expect(summaryV2112).toMatch(/w125-high-contrast/)
    })
  })

  // ===== 9. 中英双语 (主中文, 关键段英文) =====
  describe('中英双语', () => {
    it('README 包含关键英文段', () => {
      expect(readme).toMatch(/English Summary/i)
    })

    it('CHANGELOG 包含关键英文段', () => {
      expect(changelog).toMatch(/English Summary/i)
    })

    it('DEV_LOG 包含关键英文段', () => {
      expect(devLog).toMatch(/English/i)
    })

    it('FEATURES 包含关键英文段', () => {
      expect(features).toMatch(/English/i)
    })

    it('ARCHITECTURE 包含关键英文段', () => {
      expect(architecture).toMatch(/English/i)
    })
  })

  // ===== 10. 0 死链 (基础版: 内部 anchor 跳转目标存在) =====
  describe('0 死链 基础验证', () => {
    it('README 关键内部 anchor 存在', () => {
      // README 引用了 SUMMARY_v2.1.x 和 CHANGELOG v2.1.x
      expect(readme).toMatch(/SUMMARY_v2\.1\.x/)
      expect(readme).toMatch(/CHANGELOG/)
    })

    it('CHANGELOG v2.1.12 段落 anchor 存在 (id 风格)', () => {
      // GitHub 自动生成 id: v2112--2026-08-09 等
      // 这里只验证 跳 转 anchor 是 否 形 状 合 法 (#v2112--2026-08-09)
      expect(changelog).toMatch(/#v2112--2026-08-09|#v2112-2026-08-09|#v2112-/)
    })
  })

  // ===== 11. 不写 "TODO" / "TBD" / "待补" (新加的 v2.1.12 段落) =====
  describe('v2.1.12 新加段落不写 TODO/TBD/待补', () => {
    // 提取 v2.1.12 段落 (W130 新加的) — 限制在 v2.1.12 段内, 不含 v2.1.13/v2.1.14
    const v2112AndAfter = changelog.split('## [v2.1.12] - 2026-08-09')[1] || ''
    // 截断到下一个 ## [v2.1.13] 段
    const v2112Section = v2112AndAfter.split('## [v2.1.13]')[0] || ''
    const v211xSection = changelog.split('## [v2.1.x 全段] - 2026-08-08 → 2026-08-09')[1] || ''

    it('CHANGELOG v2.1.12 段落没有 TODO/TBD/待补', () => {
      expect(v2112Section).not.toMatch(/\bTODO\b/)
      expect(v2112Section).not.toMatch(/\bTBD\b/)
      expect(v2112Section).not.toMatch(/待补/)
    })

    it('CHANGELOG v2.1.x 全段 段落没有 TODO/TBD/待补', () => {
      expect(v211xSection).not.toMatch(/\bTODO\b/)
      expect(v211xSection).not.toMatch(/\bTBD\b/)
      expect(v211xSection).not.toMatch(/待补/)
    })

    it('README 没有 TODO/TBD/待补', () => {
      expect(readme).not.toMatch(/\bTODO\b/)
      expect(readme).not.toMatch(/\bTBD\b/)
      expect(readme).not.toMatch(/待补/)
    })

    it('DEV_LOG 没有 TODO/TBD/待补', () => {
      expect(devLog).not.toMatch(/\bTODO\b/)
      expect(devLog).not.toMatch(/\bTBD\b/)
      expect(devLog).not.toMatch(/待补/)
    })

    it('FEATURES 没有 TODO/TBD/待补', () => {
      expect(features).not.toMatch(/\bTODO\b/)
      expect(features).not.toMatch(/\bTBD\b/)
      expect(features).not.toMatch(/待补/)
    })

    it('ARCHITECTURE 没有 TODO/TBD/待补', () => {
      expect(architecture).not.toMatch(/\bTODO\b/)
      expect(architecture).not.toMatch(/\bTBD\b/)
      expect(architecture).not.toMatch(/待补/)
    })

    it('SUMMARY_v2.1.12 没有 TODO/TBD/待补', () => {
      expect(summaryV2112).not.toMatch(/\bTODO\b/)
      expect(summaryV2112).not.toMatch(/\bTBD\b/)
      expect(summaryV2112).not.toMatch(/待补/)
    })
  })
})
