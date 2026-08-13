// tests/w146-telemetry.test.ts - W146 反馈回路 (v3 plan E-1) 验证覆盖
// 业务: 19 周产品 0 真实用户数据, 这个工具给"知道哪些功能被用了" 提供基础
// W146 范围 (v3 plan W137):
//  - src/lib/telemetry.ts (track / flush / 7 事件 / 30天 retention)
//  - src/lib/db.ts IDB v10 迁移 (telemetry / feedback / nps 3 表)
//  - src/components/FeedbackButton.tsx (浮动 + modal + 写 IDB)
//  - src/components/NpsPrompt.tsx (7 天触发 + 0-10 滑块 + 写 IDB)
//  - src/pages/UsagePage.tsx (dashboard 30天折线 + Top 10 条形 + 导出)
//  - Settings.tsx 改造 (3 入口)
// 测试策略: file content + IDB schema + 关键 lib 函数

import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, existsSync } from 'fs'

// ============================================================
// 1. IDB v10 schema 验证
// ============================================================

describe('W146 IDB v10 schema — telemetry / feedback / nps 3 表', () => {
  const c = readFileSync('src/lib/db.ts', 'utf-8')

  it('EnglishAppDB 升级到 v10', () => {
    expect(c).toMatch(/this\.version\(10\)\.stores\(\{[\s\S]{0,500}?\}\)/)
  })

  it('v10 schema 含 telemetry 表 (id 索引 + ts + event + 复合索引)', () => {
    // W146: telemetry: '++id, ts, event, [ts+event]' — 复合索引用于按时间范围查特定事件
    expect(c).toMatch(/telemetry:\s*'[^']*ts[^']*event[^']*\[ts\+event\]'/)
  })

  it('v10 schema 含 feedback 表 (type 索引)', () => {
    expect(c).toMatch(/feedback:\s*'[^']*type[^']*'/)
  })

  it('v10 schema 含 nps 表 (score 索引)', () => {
    expect(c).toMatch(/nps:\s*'[^']*score[^']*'/)
  })

  it('class 顶部声明 3 个新 table 类型', () => {
    expect(c).toMatch(/telemetry!:\s*Table<TelemetryEvent,\s*number>/)
    expect(c).toMatch(/feedback!:\s*Table<FeedbackEntry,\s*number>/)
    expect(c).toMatch(/nps!:\s*Table<NpsEntry,\s*number>/)
  })

  it('导出 TelemetryEvent / FeedbackEntry / NpsEntry / FeedbackType 类型', () => {
    expect(c).toMatch(/export type TelemetryEventName/)
    expect(c).toMatch(/export interface TelemetryEvent/)
    expect(c).toMatch(/export type FeedbackType/)
    expect(c).toMatch(/export interface FeedbackEntry/)
    expect(c).toMatch(/export interface NpsEntry/)
  })

  it('TelemetryEventName 含 7 事件类型 (v3 plan)', () => {
    const names = ['page_view', 'feature_used', 'session_start', 'session_end', 'word_learned', 'error_made', 'feedback_submitted', 'nps_score']
    names.forEach(n => {
      expect(c).toContain(`'${n}'`)
    })
  })

  it('FeedbackType 含 bug / feature / praise 3 类型', () => {
    expect(c).toMatch(/export type FeedbackType\s*=\s*'bug'\s*\|\s*'feature'\s*\|\s*'praise'/)
  })
})

// ============================================================
// 2. telemetry.ts lib 验证
// ============================================================

describe('W146 src/lib/telemetry.ts — 核心 API', () => {
  const c = readFileSync('src/lib/telemetry.ts', 'utf-8')

  it('src/lib/telemetry.ts 存在', () => {
    expect(existsSync('src/lib/telemetry.ts')).toBe(true)
  })

  it('导出 initTelemetry (App 启动调一次)', () => {
    expect(c).toMatch(/export\s+(async\s+)?function\s+initTelemetry/)
  })

  it('导出 track (核心写事件 API)', () => {
    expect(c).toMatch(/export\s+function\s+track\(\s*event:\s*TelemetryEventName/)
  })

  it('导出 flushBuffer (批量写 IDB, 1s 触发)', () => {
    expect(c).toMatch(/export\s+(async\s+)?function\s+flushBuffer/)
  })

  it('导出 setTelemetryEnabled / isTelemetryEnabled (用户开关)', () => {
    expect(c).toMatch(/export\s+function\s+setTelemetryEnabled/)
    expect(c).toMatch(/export\s+function\s+isTelemetryEnabled/)
  })

  it('导出 getDailyCounts / getEventCounts (UsagePage 用)', () => {
    expect(c).toMatch(/export\s+(async\s+)?function\s+getDailyCounts/)
    expect(c).toMatch(/export\s+(async\s+)?function\s+getEventCounts/)
  })

  it('导出 exportTelemetryAsJSON / clearAllTelemetry (导出 + 清空)', () => {
    expect(c).toMatch(/export\s+(async\s+)?function\s+exportTelemetryAsJSON/)
    expect(c).toMatch(/export\s+(async\s+)?function\s+clearAllTelemetry/)
  })

  it('30 天 retention — 自动清理老事件', () => {
    expect(c).toMatch(/RETENTION_DAYS\s*=\s*30/)
    expect(c).toMatch(/export\s+(async\s+)?function\s+cleanOldEvents/)
  })

  it('批量 flush 间隔 1s + buffer 上限 50', () => {
    expect(c).toMatch(/FLUSH_INTERVAL_MS\s*=\s*1000/)
    expect(c).toMatch(/BUFFER_MAX\s*=\s*50/)
  })

  it('localStorage key 命名 w146_ 前缀 (避免冲突)', () => {
    expect(c).toContain("'w146_telemetry_enabled'")
    expect(c).toContain("'w146_session_id'")
    expect(c).toContain("'w146_first_use_ts'")
    expect(c).toContain("'w146_nps_done'")
  })

  it('track 失败 / disabled 静默 (0 副作用)', () => {
    // track 函数体内有 try/catch 静默
    const trackFn = c.match(/export\s+function\s+track\([\s\S]{0,500}?\n\}/)
    expect(trackFn).toBeTruthy()
    expect(trackFn![0]).toMatch(/try\s*\{/)
    expect(trackFn![0]).toMatch(/catch\s*\{/)
  })

  it('NPS 触发天数 7 (v3 plan W137 spec)', () => {
    // NpsPrompt.tsx 应有 NPS_TRIGGER_DAYS = 7
    const nps = readFileSync('src/components/NpsPrompt.tsx', 'utf-8')
    expect(nps).toMatch(/NPS_TRIGGER_DAYS\s*=\s*7/)
  })
})

// ============================================================
// 3. FeedbackButton 验证
// ============================================================

describe('W146 src/components/FeedbackButton.tsx', () => {
  const c = readFileSync('src/components/FeedbackButton.tsx', 'utf-8')

  it('src/components/FeedbackButton.tsx 存在', () => {
    expect(existsSync('src/components/FeedbackButton.tsx')).toBe(true)
  })

  it('浮动右下角按钮 (fixed bottom-X right-X)', () => {
    expect(c).toMatch(/fixed\s+bottom-\d+\s+right-\d+\s+z-40/)
  })

  it('0 emoji — 全部 Icon SVG', () => {
    // 不应出现 📊 / 💬 / ✓ / 📝 等 emoji
    expect(c).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u)
    // 应 import IconChat / IconClose / IconCheck
    expect(c).toMatch(/import\s*\{[^}]*IconChat[^}]*\}\s*from\s*['"]\.\/Icon['"]/)
  })

  it('feedback 文本限制 200 字', () => {
    expect(c).toMatch(/MAX_TEXT_LENGTH\s*=\s*200/)
  })

  it('写 IDB feedback 表 (本地, 0 云)', () => {
    expect(c).toMatch(/db\.feedback\.add/)
    // 不应 fetch / axios 等
    expect(c).not.toMatch(/fetch\(['"`]https?:\/\//)
  })

  it('调 track("feedback_submitted") 埋点', () => {
    expect(c).toMatch(/track\(['"]feedback_submitted['"]/)
  })

  it('ESC 关闭 modal (a11y)', () => {
    expect(c).toMatch(/e\.key\s*===\s*['"]Escape['"]/)
  })

  it('modal 含 aria-modal + role="dialog" (a11y)', () => {
    expect(c).toMatch(/role="dialog"/)
    expect(c).toMatch(/aria-modal="true"/)
  })

  it('data-testid 供 e2e 测试', () => {
    expect(c).toMatch(/data-testid="feedback-button"/)
    expect(c).toMatch(/data-testid="feedback-text"/)
    expect(c).toMatch(/data-testid="feedback-submit"/)
  })
})

// ============================================================
// 4. NpsPrompt 验证
// ============================================================

describe('W146 src/components/NpsPrompt.tsx', () => {
  const c = readFileSync('src/components/NpsPrompt.tsx', 'utf-8')

  it('src/components/NpsPrompt.tsx 存在', () => {
    expect(existsSync('src/components/NpsPrompt.tsx')).toBe(true)
  })

  it('0-10 滑块 (11 个按钮 0-10)', () => {
    expect(c).toMatch(/Array\.from\(\{\s*length:\s*11\s*\}/)
  })

  it('触发条件: 首次使用 + 7 天 + 没评过', () => {
    expect(c).toMatch(/daysSinceFirstUse\(\)\s*>=\s*NPS_TRIGGER_DAYS/)
    expect(c).toMatch(/isNpsDone\(\)/)
  })

  it('评分后 markNpsDone (避免重复弹)', () => {
    expect(c).toMatch(/markNpsDone\(\)/)
  })

  it('写 IDB nps 表 (本地, 0 云)', () => {
    expect(c).toMatch(/db\.nps\.add/)
    expect(c).not.toMatch(/fetch\(['"`]https?:\/\//)
  })

  it('调 track("nps_score") 埋点', () => {
    expect(c).toMatch(/track\(['"]nps_score['"]/)
  })

  it('0 emoji (Icon SVG)', () => {
    expect(c).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u)
    expect(c).toMatch(/import\s*\{[^}]*IconCheck[^}]*\}\s*from\s*['"]\.\/Icon['"]/)
  })

  it('a11y: role="radiogroup" + aria-checked', () => {
    expect(c).toMatch(/role="radiogroup"/)
    expect(c).toMatch(/aria-checked=/)
  })

  it('data-testid 供 e2e 测试', () => {
    // 注: nps-score 用模板字符串 `nps-score-${i}` (0-10)
    expect(c).toMatch(/data-testid=\{`nps-score-\$\{i\}`\}/)
    expect(c).toMatch(/data-testid="nps-submit"/)
  })
})

// ============================================================
// 5. UsagePage 验证
// ============================================================

describe('W146 src/pages/UsagePage.tsx — dashboard', () => {
  const c = readFileSync('src/pages/UsagePage.tsx', 'utf-8')

  it('src/pages/UsagePage.tsx 存在', () => {
    expect(existsSync('src/pages/UsagePage.tsx')).toBe(true)
  })

  it('30 天折线图 (inline SVG, 0 依赖)', () => {
    // 30 个 div 高度按 maxDaily 比例
    expect(c).toMatch(/for\s*\(\s*let\s+i\s*=\s*29;\s*i\s*>=\s*0;\s*i--\s*\)/)
  })

  it('功能使用 Top 10 条形图', () => {
    expect(c).toMatch(/\.slice\(0,\s*10\)/)
  })

  it('导出 JSON 按钮 (1 键下载)', () => {
    expect(c).toMatch(/handleExport/)
    expect(c).toMatch(/Blob/)
  })

  it('清空数据按钮 (二次确认)', () => {
    expect(c).toMatch(/handleClear/)
    expect(c).toMatch(/confirm\(/)
  })

  it('0 emoji (Icon SVG)', () => {
    expect(c).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u)
    expect(c).toMatch(/IconChart/)
    expect(c).toMatch(/IconDownload/)
    expect(c).toMatch(/IconTrash/)
  })

  it('复用 telemetry.ts API (getDailyCounts / getEventCounts / exportTelemetryAsJSON / clearAllTelemetry)', () => {
    expect(c).toMatch(/import\s*\{[^}]*getDailyCounts[^}]*\}\s*from\s*['"]\.\.\/lib\/telemetry['"]/)
    expect(c).toMatch(/getEventCounts\(\)/)
    expect(c).toMatch(/exportTelemetryAsJSON\(\)/)
    expect(c).toMatch(/clearAllTelemetry\(\)/)
  })

  it('data-testid 供 e2e 测试', () => {
    expect(c).toMatch(/data-testid="usage-stats"/)
    expect(c).toMatch(/data-testid="usage-chart-daily"/)
    expect(c).toMatch(/data-testid="usage-export"/)
  })
})

// ============================================================
// 6. Settings 改造 + Layout 集成验证
// ============================================================

describe('W146 Layout 集成 + Settings 入口', () => {
  it('Layout 集成 FeedbackButton + 调 initTelemetry', () => {
    const layout = readFileSync('src/components/Layout.tsx', 'utf-8')
    // 注: W146 FeedbackButton / NpsPrompt 是 default import (export default)
    expect(layout).toMatch(/import\s+FeedbackButton\s+from\s+['"]\.\/FeedbackButton['"]/)
    expect(layout).toMatch(/import\s+NpsPrompt\s+from\s+['"]\.\/NpsPrompt['"]/)
    expect(layout).toMatch(/import\s*\{[^}]*initTelemetry[^}]*\}\s*from\s*['"]\.\.\/lib\/telemetry['"]/)
  })

  it('Settings 改造 — 加 我的使用 / 反馈 / 埋点设置 入口', () => {
    const settings = readFileSync('src/pages/Settings.tsx', 'utf-8')
    // 我的使用入口
    expect(settings).toMatch(/我的使用|Usage|usage/)
    // 反馈入口
    expect(settings).toMatch(/反馈|Feedback/)
    // 埋点开关
    expect(settings).toMatch(/埋点|telemetry/)
  })

  it('App.tsx 注册 /usage 路由', () => {
    const app = readFileSync('src/App.tsx', 'utf-8')
    // 嵌套路由 path="usage" (父路由 /english-app/ 已带前缀)
    expect(app).toMatch(/path="usage"/)
    expect(app).toMatch(/UsagePage/)
  })
})

// ============================================================
// 7. 0 emoji 全局回归 (W146 后不能加 emoji)
// ============================================================

describe('W146 0 emoji 全局回归 (新增 4 文件)', () => {
  const files = [
    'src/lib/telemetry.ts',
    'src/components/FeedbackButton.tsx',
    'src/components/NpsPrompt.tsx',
    'src/pages/UsagePage.tsx',
  ]
  files.forEach(f => {
    it(`${f} 0 emoji`, () => {
      const c = readFileSync(f, 'utf-8')
      expect(c).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u)
    })
  })
})
