# v1.11.0 Release Notes

**发布日期**: 2026-07-25
**类型**: Feature + Algorithm + Reporting
**重要性**: ⭐⭐⭐⭐ (FSRS 算法 + 智能队列 + 日报)

## 一句话总结

3 个 producer 并行 1d 干完 3d:**FSRS 间隔重复算法** (新加, 默认 false 保持 SM-2) + **复习中心智能队列** (按 due/难/新 排序) + **学习日报/周报** (ReportsPage 路由 /reports)。**230 单元测试 + 0 P0/P1**。

**v2 4 周路线图全完结** (W9 + W10 + W11 + W12): 5 轮 3 producer 并行 1d 干完 3-6d 计划。

## 🆕 新增功能

### v1.11.0-A FSRS 间隔重复算法 (B8, 新加, 默认 false 保持 SM-2)
- `src/lib/fsrs.ts` (201 行): 4 参数算法 (d 难度 / s 稳定性 / r 可检索性 / t 间隔)
- 4 评级枚举: Again / Hard / Good / Easy (复用 Anki 4 档)
- `initFSRS()` / `reviewFSRS()` / `getRetrievability()` / `getIntervalDays()`
- `fromSM2()` / `toSM2()` / `migrateFSRSToSM2()` 转换 (向后兼容)
- plan.ts 集成: `saveFSRSCard()` / `loadFSRSCard()` (IndexedDB `fsrsCards` 表)
- **不替换 SM-2**, 默认 `useFSRS: false`, 用户可切
- 18 单元测试

### v1.11.0-B 复习中心智能队列 (B10)
- `src/lib/reviewQueue.ts` (135 行): `scoreReviewItem()` + `sortReviewQueue()`
- 优先级分数 (0-100):
  - due 越早 (已过期/快到) → 分数越高 (50/40/30/20/10)
  - 难词 (ease < 2.0) → +20
  - 新词 (reps < 3) → +15
- ReviewCenter "🎯 智能排序" 切换 (默认开, 可切回时间排)
- `SortToggle` 组件
- 7 单元测试

### v1.11.0-C 学习日报/周报 (B11)
- `src/lib/learningReport.ts` (361 行):
  - `getDailyReport()` / `getWeeklyReport()` / `getTrend()` / `getEncouragement()`
  - 5-8 种鼓励文案
  - 同周对比 (上升/下降/平稳 emoji)
  - 过滤非真实词 (scene:/scene-/daily- 前缀)
- `src/pages/ReportsPage.tsx` (293 行, lazy load):
  - Tab 1: 今日日报 (学词/跟读/错题/收藏/连续/累计)
  - Tab 2: 本周周报 (7 天汇总 + Top 5 学词 + Top 5 错词)
  - "📤 分享" 按钮 (复用 ShareCard, **不引 html2canvas**)
  - `useEffect [activeTab]` 修 v1.6 规范
- 路由 `/reports` + Home 入口卡片
- 10 单元测试

## 🐛 修复

- `learningReport.ts` `WeeklyComparison` interface 加 `direction: 'up' | 'down' | 'flat'` 字段 (v1.11.0-C 类型补全)
- `ReportsPage.tsx` `useEffect []` → `useEffect [activeTab]` (v1.6 规范)
- 修 9 个测试期望 (FSRS d 转换公式 + 日报累计去重 + 鼓励文案)

## 📊 数据对比

| 指标 | v1.10.0 | v1.11.0 | 变化 |
|-----|--------|--------|------|
| 单元测试 | 195 | **230** | +35 |
| 组件 | 23 | **24** | +1 (SortToggle) |
| 库 | 26 | **27** | +3 (fsrs/reviewQueue/learningReport) |
| 页面 | 20 | **21** | +1 (ReportsPage) |
| P0/P1 bug | 0 | **0** | 维持 |
| commit | 220+ | **230+** | +10 |
| release tag | 11 | **12** | +1 |

## 🧪 验证

```
✓ 230/230 单元测试全过 (22 个测试文件)
✓ 26/26 闭环脚本 (verify-v1.11.0.mjs)
✓ 静态审查 0 P0 + 0 P1 + 0 P2 (review-v1.11.0.py)
✓ 14/14 修复点验证
✓ typecheck 0 错误
✓ vite build pass
```

## 🔗 相关

- 详细 plan: [docs/plans/v1.11.0-fsrs-review-report.md](./plans/v1.11.0-fsrs-review-report.md)
- 团队推荐: 内部 `next-phase-plan-v2.md` (4 周 W9-W12)
- 代码 diff: https://github.com/lingoo12138/english-app/compare/v1.10.0...v1.11.0
- 4 commits:
  - `637a08e` docs(plan)
  - `db53c1e` feat(v1.11.0-A): FSRS
  - `02e26f6` feat(v1.11.0-B): 复习智能队列
  - `7b0c2c4` feat(v1.11.0-C): 日报/周报

## 📦 升级

无需额外操作,直接 `git pull` 即可。

## 🛣 下一步 (W13+)

团队 v2 文档 4 周全完结 (W9-W12)。W13+ 候选:
- **B3 多角色对话**: 朋友聚会 / 会议场景
- **B4 自定义场景课**: UGC, LLM 生成 5 课
- **B12 跟读评测升级**: 句级 vs 单词级
- **B13 拍照识物升级**: 多场景 prompt
- **C6 错误恢复 / 离线降级**: LLM 挂掉友好降级
- **C7 LLM 成本控制**: AI 对话日限

按 1d 干完 3-6d 节奏,任意选 3 件并行。
