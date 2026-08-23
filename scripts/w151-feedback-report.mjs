#!/usr/bin/env node
/**
 * W151 真实用户反馈汇总脚本
 *
 * 数据源 (全部 IDB, 0 网络上传):
 * - telemetry: 7 事件, 1s 批量, 30 天 retention
 * - feedback: 文本 + category + 5 星
 * - nps: 0-10 滑块 + 文本
 * - usage: 30 天折线 + Top 10
 * - errorReport: JS 错误堆栈
 *
 * 使用方法:
 *   1. 用户 App 内: UsagePage → "导出 W151 反馈" 按钮 (W151 加)
 *   2. 主人本地:  node scripts/w151-feedback-report.mjs <idb-export.json>
 *   3. 主人汇总: 输出到 docs/REPORT_W151_FEEDBACK.md
 *
 * 输出:
 *   - 朋友内测人数
 *   - 反馈次数 (按 category)
 *   - NPS 平均 (按 7 天)
 *   - Top 5 行为 (30 天 telemetry)
 *   - Top 5 错误 (errorReport)
 *   - 0 P0 业务 / 0 P1 业务 状态
 */
import { readFileSync, writeFileSync } from 'fs'

const args = process.argv.slice(2)
if (args.length === 0) {
  console.log(`
W151 真实用户反馈汇总脚本

使用方法:
  1. App 内 UsagePage → "导出 W151 反馈" 按钮
     (W151 加, 导出 telemetry + feedback + nps + errorReport JSON)
  2. node scripts/w151-feedback-report.mjs <idb-export.json>
  3. 输出到 docs/REPORT_W151_FEEDBACK_<date>.md

数据结构 (idb-export.json):
{
  "telemetry": [{ event, timestamp, data }],
  "feedback": [{ category, rating, text, timestamp }],
  "nps": [{ score, text, timestamp }],
  "usage": [{ page, duration, timestamp }],
  "errorReport": [{ error, stack, timestamp }],
  "users": 5
}
  `)
  process.exit(0)
}

const data = JSON.parse(readFileSync(args[0], 'utf-8'))
const date = new Date().toISOString().slice(0, 10)

const report = `# W151 真实用户反馈汇总 (${date})

> 数据源: IDB 导出 (W151 App 内 UsagePage → "导出 W151 反馈")
> 周期: 1 周 (W151)
> 战略: v3 plan E-方向 第 4 步 — 真实用户招募 + 反馈闭环

---

## 1. 量化数据

| 指标 | 数据 |
|---|---|
| 朋友内测人数 | ${data.users || 0} |
| 反馈次数 (feedback) | ${(data.feedback || []).length} |
| NPS 提交次数 | ${(data.nps || []).length} |
| 30 天 telemetry 事件 | ${(data.telemetry || []).length} |
| 错误报告 | ${(data.errorReport || []).length} |

## 2. NPS 评分

${(data.nps || []).length > 0
  ? (() => {
      const scores = data.nps.map(n => n.score)
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length
      const detractors = scores.filter(s => s <= 6).length
      const passives = scores.filter(s => s === 7 || s === 8).length
      const promoters = scores.filter(s => s >= 9).length
      const npsScore = Math.round(((promoters - detractors) / scores.length) * 100)
      return `| 指标 | 数据 |
|---|---|
| 平均分 | ${avg.toFixed(2)} / 10 |
| 推荐者 (9-10) | ${promoters} (${((promoters / scores.length) * 100).toFixed(0)}%) |
| 中立者 (7-8) | ${passives} (${((passives / scores.length) * 100).toFixed(0)}%) |
| 贬损者 (0-6) | ${detractors} (${((detractors / scores.length) * 100).toFixed(0)}%) |
| **NPS 分数** | **${npsScore}** |
`
    })()
  : '_无 NPS 提交_'}

## 3. 反馈分类 (feedback)

${(data.feedback || []).length > 0
  ? (() => {
      const byCategory = data.feedback.reduce((acc, f) => {
        acc[f.category] = (acc[f.category] || 0) + 1
        return acc
      }, {})
      return `| 类别 | 次数 |
|---|---|
${Object.entries(byCategory).map(([k, v]) => `| ${k} | ${v} |`).join('\n')}

### 反馈列表 (按时间倒序)

${data.feedback
  .sort((a, b) => b.timestamp - a.timestamp)
  .map(
    (f, i) =>
      `${i + 1}. **[${f.category}]** (${f.rating} 星) ${f.text}\n   - ${new Date(f.timestamp).toLocaleString()}`
  )
  .join('\n')}
`
    })()
  : '_无 feedback 提交_'}

## 4. Top 5 行为 (telemetry)

${(data.telemetry || []).length > 0
  ? (() => {
      const eventCount = data.telemetry.reduce((acc, t) => {
        acc[t.event] = (acc[t.event] || 0) + 1
        return acc
      }, {})
      return `| 事件 | 次数 |
|---|---|
${Object.entries(eventCount)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([k, v]) => `| ${k} | ${v} |`).join('\n')}
`
    })()
  : '_无 telemetry 数据_'}

## 5. Top 5 错误 (errorReport)

${(data.errorReport || []).length > 0
  ? data.errorReport
      .slice(0, 5)
      .map(
        (e, i) =>
          `${i + 1}. **${e.error}**\n   - ${new Date(e.timestamp).toLocaleString()}\n   - Stack: \`${(e.stack || '').slice(0, 100)}...\``
      )
      .join('\n\n')
  : '_无错误报告 (✅)_'}

## 6. 决定 (W152 任务)

- [ ] 决定 v3.0 (基于真实数据, 不再脑补)
- [ ] 决定收尾 (写完整 README + 录视频 + 投 IndieHackers)
- [ ] 决定开源 (接受 PR + 写 ROADMAP + 找社区)

---

> 23 周 + W151 真实用户反馈 = v3 plan E-方向 战略胜利
> **北极星**: 让英语在你想用的时候就能用上
`
const outPath = `docs/REPORT_W151_FEEDBACK_${date}.md`
writeFileSync(outPath, report)
console.log(`✅ 报告生成: ${outPath}`)
console.log(`   - 朋友内测: ${data.users || 0}`)
console.log(`   - 反馈次数: ${(data.feedback || []).length}`)
console.log(`   - NPS 提交: ${(data.nps || []).length}`)
console.log(`   - 错误: ${(data.errorReport || []).length}`)
