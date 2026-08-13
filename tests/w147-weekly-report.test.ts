// tests/w147-weekly-report.test.ts - W147 学习周报 (v3 plan E-2) 验证
// 业务: W146 telemetry 收集了真实数据, W147 用数据生成可分享周报
//  复用 LearnRecord (records) + PronunciationAttempt + WritingErrors + Favorites
//  输出: HTML (inline CSS) + Markdown + 复制 / 下载 / Web Share
//
// 测试策略: file content + Markdown / HTML 渲染函数 + ShareModal STYLES 5 风格

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'

// ============================================================
// 1. weeklyReport.ts lib 验证
// ============================================================

describe('W147 src/lib/weeklyReport.ts — 核心 lib', () => {
  const c = readFileSync('src/lib/weeklyReport.ts', 'utf-8')

  it('src/lib/weeklyReport.ts 存在', () => {
    expect(existsSync('src/lib/weeklyReport.ts')).toBe(true)
  })

  it('导出 generateWeeklyReport (聚合 7 天数据)', () => {
    expect(c).toMatch(/export\s+(async\s+)?function\s+generateWeeklyReport/)
  })

  it('导出 renderMarkdownReport (Markdown 输出)', () => {
    expect(c).toMatch(/export\s+function\s+renderMarkdownReport/)
  })

  it('导出 renderHtmlReport (HTML inline CSS 输出)', () => {
    expect(c).toMatch(/export\s+function\s+renderHtmlReport/)
  })

  it('导出 copyReportAsMarkdown / downloadReportAsHtml / shareReport', () => {
    expect(c).toMatch(/export\s+(async\s+)?function\s+copyReportAsMarkdown/)
    expect(c).toMatch(/export\s+function\s+downloadReportAsHtml/)
    expect(c).toMatch(/export\s+(async\s+)?function\s+shareReport/)
  })

  it('WeeklyReportData 接口导出 — 13 字段', () => {
    expect(c).toMatch(/export\s+interface\s+WeeklyReportData/)
    // 关键字段
    const fields = [
      'startTs', 'endTs', 'wordsLearned', 'views', 'favorites',
      'known', 'unknown', 'pronunciationAttempts', 'pronunciationAvgScore',
      'errorCount', 'topWords', 'mostActiveDay',
    ]
    fields.forEach(f => expect(c).toContain(f))
  })

  it('聚合 7 天 LearnRecord (records 表, by action)', () => {
    // 按 view/favorite/known/unknown 4 action 统计
    expect(c).toMatch(/r\.action\s*===\s*['"]view['"]/)
    expect(c).toMatch(/r\.action\s*===\s*['"]favorite['"]/)
    expect(c).toMatch(/r\.action\s*===\s*['"]known['"]/)
    expect(c).toMatch(/r\.action\s*===\s*['"]unknown['"]/)
  })

  it('Top 5 词 (按 学+复习综合排序)', () => {
    // sort by count desc, slice 5
    expect(c).toMatch(/sort\(\(a,\s*b\)\s*=>\s*b\[1\]\s*-\s*a\[1\]\)/)
    expect(c).toMatch(/\.slice\(0,\s*5\)/)
  })

  it('复用 loadWordsIndex (W145 拆的轻量级 index, 不全量 6.3MB)', () => {
    expect(c).toMatch(/import\s*\{[^}]*loadWordsIndex[^}]*\}\s*from\s*['"]\.\/words['"]/)
    expect(c).toMatch(/await\s+loadWordsIndex\(\)/)
  })

  it('最活跃日按 view 数聚合 (按 YYYY-MM-DD 分桶)', () => {
    expect(c).toMatch(/new Date\(r\.timestamp\)\.toISOString\(\)\.slice\(0,\s*10\)/)
  })

  it('0 网络 — 全部 local IDB 查询', () => {
    expect(c).not.toMatch(/fetch\(['"`]https?:\/\//)
    expect(c).not.toMatch(/axios/)
  })
})

// ============================================================
// 2. Markdown 输出验证
// ============================================================

describe('W147 renderMarkdownReport 输出格式', () => {
  it('包含必填段落: 标题 / 数据总览 / Top 5 / 累计 / 链接', () => {
    const c = readFileSync('src/lib/weeklyReport.ts', 'utf-8')
    expect(c).toMatch(/## 数据总览/)
    expect(c).toMatch(/## Top 5 词/)
    expect(c).toMatch(/## 累计/)
    expect(c).toMatch(/https:\/\/lingoo12138\.github\.io\/english-app\//)
  })

  it('关键词包含 "本周学习报告" + "学过词数" + "跟读" + "错题"', () => {
    const c = readFileSync('src/lib/weeklyReport.ts', 'utf-8')
    expect(c).toContain('本周学习报告')
    expect(c).toContain('学过词数')
    expect(c).toContain('跟读')
    expect(c).toContain('错题')
  })

  it('格式: wordsLearned bold 数字', () => {
    const c = readFileSync('src/lib/weeklyReport.ts', 'utf-8')
    expect(c).toMatch(/学过词数:\s*\*\*\$\{/)
  })
})

// ============================================================
// 3. HTML 输出验证
// ============================================================

describe('W147 renderHtmlReport 输出格式 (inline CSS)', () => {
  it('inline style 标签 + 跨平台兼容 (微信/微博/小红书粘贴)', () => {
    const c = readFileSync('src/lib/weeklyReport.ts', 'utf-8')
    // 模板字符串内含 style="..."
    expect(c).toMatch(/style="[^"]*background:/)
    expect(c).toMatch(/style="[^"]*font-family:/)
    // 渐变背景
    expect(c).toContain('linear-gradient')
  })

  it('包含关键元素: 标题 / 数据总览 / Top 5 / 累计 / 链接', () => {
    const c = readFileSync('src/lib/weeklyReport.ts', 'utf-8')
    expect(c).toContain('本周学习报告')
    expect(c).toContain('数据总览')
    expect(c).toContain('Top 5 词')
    expect(c).toContain('累计')
    // HTML 含水印 + 链接 (Markdown 完整 URL 在 renderMarkdownReport)
    expect(c).toContain('https://lingoo12138.github.io/english-app/')
  })

  it('HTML 转义防 XSS (escapeHtml 工具函数)', () => {
    const c = readFileSync('src/lib/weeklyReport.ts', 'utf-8')
    expect(c).toMatch(/function\s+escapeHtml/)
    // 应转义 < > & " '
    expect(c).toContain('&amp;')
    expect(c).toContain('&lt;')
    expect(c).toContain('&gt;')
  })
})

// ============================================================
// 4. ShareCard 加 2 个新风格
// ============================================================

describe('W147 ShareCard.tsx 加 streak / vocab 2 风格', () => {
  const c = readFileSync('src/components/ShareCard.tsx', 'utf-8')

  it('ShareCardStyle 类型扩到 5 个: simple / gradient / retro / streak / vocab', () => {
    expect(c).toMatch(/export type ShareCardStyle\s*=\s*'simple'\s*\|\s*'gradient'\s*\|\s*'retro'\s*\|\s*'streak'\s*\|\s*'vocab'/)
  })

  it('STYLE_BG 加 streak + vocab 渐变背景', () => {
    expect(c).toMatch(/streak:\s*'[^']*gradient/);
    expect(c).toMatch(/vocab:\s*'[^']*gradient/)
  })

  it('ShareCard 组件 — streak 风格分支 (单大数字 + 副标题)', () => {
    // 早期 return 在 style === 'streak' 时
    expect(c).toMatch(/if\s*\(style\s*===\s*['"]streak['"]\)/)
    expect(c).toMatch(/data-testid="sharecard-streak"/)
    // 单大数字
    expect(c).toMatch(/text-7xl\s+font-bold/)
  })

  it('ShareCard 组件 — vocab 风格分支 (已掌握词数)', () => {
    expect(c).toMatch(/if\s*\(style\s*===\s*['"]vocab['"]\)/)
    expect(c).toMatch(/data-testid="sharecard-vocab"/)
  })

  it('STYLES 表 0 emoji (W147 新加 streak/vocab 风格 必 0 emoji)', () => {
    // 注: 老 3 风格 (simple/gradient/retro) 历史遗留 emoji 留 W148 cleanup
    //  W147 只验证新加的 2 风格 0 emoji
    // 验证 streak / vocab 段不含 emoji
    const streakBlock = c.match(/if\s*\(style\s*===\s*['"]streak['"]\)[\s\S]{0,1000}?data-testid="sharecard-streak"/)
    expect(streakBlock).toBeTruthy()
    expect(streakBlock![0]).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u)
    const vocabBlock = c.match(/if\s*\(style\s*===\s*['"]vocab['"]\)[\s\S]{0,1000}?data-testid="sharecard-vocab"/)
    expect(vocabBlock).toBeTruthy()
    expect(vocabBlock![0]).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u)
  })
})

// ============================================================
// 5. ShareModal 加 周报 + 新风格
// ============================================================

describe('W147 ShareModal.tsx 加 3 个周报按钮 + 5 风格', () => {
  const c = readFileSync('src/components/ShareModal.tsx', 'utf-8')

  it('STYLES 5 风格 (含 streak / vocab)', () => {
    expect(c).toMatch(/value:\s*['"]streak['"]/)
    expect(c).toMatch(/value:\s*['"]vocab['"]/)
  })

  it('导出 weeklyReport lib 4 函数', () => {
    expect(c).toMatch(/import\s*\{[^}]*generateWeeklyReport[^}]*\}\s*from\s*['"]\.\.\/lib\/weeklyReport['"]/)
    expect(c).toMatch(/generateWeeklyReport\(\)/)
    expect(c).toMatch(/copyReportAsMarkdown/)
    expect(c).toMatch(/downloadReportAsHtml/)
    expect(c).toMatch(/shareReport/)
  })

  it('3 个周报按钮: 复制 Markdown / 下载 HTML / 原生分享', () => {
    expect(c).toMatch(/handleWeeklyCopy/)
    expect(c).toMatch(/handleWeeklyDownload/)
    expect(c).toMatch(/handleWeeklyShare/)
    expect(c).toMatch(/data-testid="share-weekly-copy"/)
    expect(c).toMatch(/data-testid="share-weekly-download"/)
    expect(c).toMatch(/data-testid="share-weekly-share"/)
  })

  it('Web Share API 兼容性检测 (移动端 vs 桌面降级)', () => {
    // 'share' in navigator 探测
    expect(c).toMatch(/['"]share['"]\s+in\s+navigator/)
  })

  it('ShareModal 0 emoji (W147 清理 STYLES 表 emoji)', () => {
    // 注: W147 STYLES 表去掉 emoji 字段, 但 handleCopy 还有 emoji (历史遗留, 留 W148)
    // 验证 STYLES 数组定义段不含 emoji
    const stylesBlock = c.match(/const STYLES[\s\S]{0,500}?\]/)
    expect(stylesBlock).toBeTruthy()
    expect(stylesBlock![0]).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u)
  })

  it('风格选择按钮 data-testid 供 e2e', () => {
    expect(c).toMatch(/data-testid=\{`share-style-\$\{s\.value\}`\}/)
  })
})

// ============================================================
// 6. 0 emoji 全局回归 (W147 新文件 / 改造文件)
// ============================================================

describe('W147 0 emoji 新文件验证', () => {
  it('src/lib/weeklyReport.ts 0 emoji (新文件)', () => {
    const c = readFileSync('src/lib/weeklyReport.ts', 'utf-8')
    expect(c).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u)
  })

  it('src/components/ShareCard.tsx 新加 streak/vocab 段 0 emoji', () => {
    const c = readFileSync('src/components/ShareCard.tsx', 'utf-8')
    // 新加 2 风格段不含 emoji (老 3 风格 emoji 留 W148 cleanup)
    const streakBlock = c.match(/if\s*\(style\s*===\s*['"]streak['"]\)[\s\S]{0,1000}?data-testid="sharecard-streak"/)
    expect(streakBlock).toBeTruthy()
    expect(streakBlock![0]).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u)
  })

  it('src/components/ShareModal.tsx STYLES 段 0 emoji (W147 清理)', () => {
    const c = readFileSync('src/components/ShareModal.tsx', 'utf-8')
    const stylesBlock = c.match(/const STYLES[\s\S]{0,500}?\]/)
    expect(stylesBlock).toBeTruthy()
    expect(stylesBlock![0]).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u)
  })
})

// ============================================================
// 7. 集成入口验证
// ============================================================

describe('W147 Home.tsx / Settings.tsx ShareModal 集成 (入口可见)', () => {
  it('Home.tsx 已接 ShareModal (上轮 W144+ 改 share 按钮)', () => {
    const home = readFileSync('src/pages/Home.tsx', 'utf-8')
    expect(home).toMatch(/import\s*\{[^}]*ShareModal[^}]*\}\s*from\s*['"]\.\.\/components\/ShareModal['"]/)
    expect(home).toMatch(/setShowShare\(true\)/)
  })
})
