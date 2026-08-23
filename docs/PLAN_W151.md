# W151 公开发布 + 真实用户反馈汇总

**日期**: 2026-08-21
**目标**: v2.2.0 公开发布 + 1 周真实用户反馈汇总
**周期**: 1 周 (W151)

---

## 1. v2.2.0 公开发布清单

### 已完成 (W148-W150 累计)

- [x] v2.1.29 (W148) 桌面 PWA 增强 (E-3)
- [x] v2.1.30-v2.1.43 (W149) 16 反馈微动效 (E-4 招募)
- [x] v2.1.44 (W150 P0 修复) setTimeout 内存泄漏
- [x] v2.1.45 (W150) verifier backlog 9 项
- [x] **v2.2.0 公开发布版** (W151, master = v2.1.45)
- [x] 招募物料 (9 截图 + 3 贴文 + 朋友邀请 + 跟踪表 + QA)
- [x] 22 周技术博客 (`BLOG_W149.md` 8KB)
- [x] 23 周技术博客 (`BLOG_W151.md` 10.8KB)
- [x] v2.2.0 Release Notes (`RELEASE_v2.2.0.md` 9.1KB)
- [x] Docs Index (`INDEX.md` 4KB, 22 周文档导航)
- [x] Lighthouse baseline + 性能轨迹
- [x] Lighthouse workflow yml (待 user 推)

### 公开发布动作

1. **GitHub main 推 ✅** — `86294ed` v2.1.45
2. **GitHub tag ✅** — v2.1.45 (跟 v2.2.0 同步, 主人决定)
3. **gh-pages 部署 ✅** — https://lingoo12138.github.io/english-app/ (200 OK)
4. **App 状态** — 0 维护, 0 P0, 0 P1 业务, 1.00 a11y 满分, 0.89 perf

### 招募贴文 (W149 已发, W151 跟踪)

- [ ] **V2EX** 创造者节点 — 中文技术社区
- [ ] **即刻** 短贴 — 中文产品/学习社区
- [ ] **Reddit** r/SideProject + r/InternetIsBeautiful — 英文社区
- [ ] **5-10 朋友** 微信群 — 内测 1 周

---

## 2. W151 真实用户反馈汇总机制

### 数据源 (全部 IDB, 0 网络上传)

| 表 | 来源 | 数据 | 频率 |
|---|---|---|---|
| `telemetry` | `lib/telemetry.ts` (W146) | 7 事件, 1s 批量, 30 天 retention | 实时 |
| `feedback` | `components/FeedbackButton.tsx` (W146) | 文本 + category + 5 星 | 用户提交 |
| `nps` | `components/NpsPrompt.tsx` (W146) | 0-10 滑块 + 文本 | 7 天触发 |
| `usage` | `pages/UsagePage.tsx` (W146) | 30 天折线 + Top 10 | 实时 |
| `errorReport` | ErrorBoundary (W147) | JS 错误堆栈 | 实时 |

### 汇总方式

**App 内** (用户视角):
- `UsagePage` 30 天行为数据
- 7 天周报 (W147) → Markdown / HTML 导出
- ShareCard 5 风格 (W147)

**主人端** (反馈汇总):
- 用户主动加微信 / 邮件 / GitHub issue → 主人记录
- 用户 App 内 FeedbackButton 提交 → IDB, 用户主动导出或截图
- 朋友内测 → 微信群反馈, 主人记录到 W151_FRIEND_TRACKER

### W151 反馈汇总模板

```markdown
## W151 反馈汇总 (YYYY-MM-DD ~ YYYY-MM-DD)

### 真实用户数据
- 朋友内测人数: 5-10
- 反馈次数: N
- NPS 平均: 0-10 (N 次)
- 0 P0 业务: ✅
- 0 P1 业务: ✅

### Top 反馈 (按频次)
1. X (N 次) — 修法 / 不修
2. Y (N 次) — 修法 / 不修
...

### Top telemetry 行为
- Top 1 页面: Home / WordList / ErrorReview
- Top 1 功能: 跟读 / 错题 / AI 写作
- Top 1 错误: ?

### 决定
- W152 主任务 (基于真实数据, 不再脑补)
- v3.0 / 收尾 / 开源 决策
```

---

## 3. W151 计划

### Day 1-2 (招募贴文发出)
- V2EX / 即刻 / Reddit 发贴 (3 份草稿 W149 已写)
- 微信群朋友邀请 (5-10 人)
- 跟踪表 W149_FRIEND_TRACKER 启动

### Day 3-7 (内测 + 反馈汇总)
- 朋友内测 1 周
- IDB telemetry 30 天数据观察
- 主人每日 review FeedbackButton / NPS / 错误报告
- 周末汇总到 W151 反馈报告

### Day 8 (W152 决定)
- 决定 v3.0 / 收尾 / 开源
- 基于真实数据 (不再基于自己脑补)

---

## 4. 关键文件

| 文件 | 大小 | 说明 |
|---|---|---|
| `docs/RELEASE_v2.2.0.md` | 9.1KB | v2.2.0 公开发布版 release notes |
| `docs/BLOG_W151.md` | 10.8KB | 23 周技术博客 (W129-W151 累计) |
| `docs/BLOG_W149.md` | 8.0KB | 22 周技术博客 (W42-W148) |
| `docs/PLAN_W149.md` | 5.4KB | 招募计划 |
| `docs/W149_FRIEND_INVITE.md` | 4.8KB | 朋友邀请 + 每日提醒 |
| `docs/W149_FRIEND_TRACKER.md` | 3.0KB | 朋友内测跟踪表 |
| `docs/W149_QA_PREP.md` | 4.2KB | 主人 QA 应急手册 |
| `docs/W150_BACKLOG_TEMPLATE.md` | 2.9KB | W150 backlog 模板 |
| `docs/W149_README.md` | 3.8KB | 完整物料目录 |
| `docs/W149_V2EX_POST.md` | 2.9KB | V2EX 贴文草稿 |
| `docs/W149_JIKE_POST.md` | 2.0KB | 即刻贴文草稿 |
| `docs/W149_REDDIT_POST.md` | 3.3KB | Reddit 贴文草稿 |
| `docs/INDEX.md` | 3.7KB | 23 周文档导航 |
| `docs/README_ACKNOWLEDGMENTS_TEMPLATE.md` | 2.3KB | 致谢模板 |
| `docs/CHANGELOG.md` | 4.9KB | 更新日志 (154 release tag) |
| `docs/REVIEW_W149.md` | 6.8KB | W149 主人兜底 review |
| `docs/REVIEW_W150.md` | 9.1KB | W150 主人兜底 review |
| `docs/REVIEW_W149_VERIFIER_A.md` | 262 行 | UI/UX + a11y |
| `docs/REVIEW_W149_VERIFIER_B.md` | 191 行 | Code Quality |
| `docs/REVIEW_W149_VERIFIER_C.md` | 216 行 | Product |

**累计 22 个文档 / ~93KB / 22 周导航**

---

## 5. 关键决策

1. **W151 公开发布版** (v2.2.0) — 不是新功能 release, 是招募准备 + 战略收口
2. **真实用户反馈** — 1 周内测 + 5-10 朋友, 周末汇总
3. **W152 决定** — v3.0 / 收尾 / 开源 (基于真实数据)
4. **不再做应急 patch** — W150 已 0 P0 业务, 没必要 v2.2.1 修
5. **Lighthouse workflow yml** — user 需用 workflow scope token 推 (沙盒 token 缺 scope)

---

## 6. 不做的

- ❌ v2.2.1 / v2.2.2 应急 patch (W150 已 0 P0 业务)
- ❌ 大功能 (v3 plan E-方向已收口)
- ❌ 性能优化 (1.7s LCP + 0.89 perf, 已到沙盒极限)
- ❌ 主动营销 (等真实用户进来)
- ❌ 多语言 (C 方向已拒绝)
- ❌ 微信小程序+Android (C 方向已拒绝)

---

## 7. 23 周里程碑 (W42-W151)

| 阶段 | 周 | 范围 | 状态 |
|---|---|---|---|
| 基础 | 1-4 | W42-W69 词库 / 多 AI / FSRS / 跟读 | ✅ |
| 触类旁通 | 5-8 | W70-W97 同义词 / 反义词 / 词根 | ✅ |
| 大 review | 9-13 | W98-W117 自定义场景 / 文件 / PDF | ✅ |
| 内容扩充 | 14-16 | W118-W135 短语 / 课文 / 填空 | ✅ |
| 收官 | 17-20 | W136-W148 性能 + a11y + 桌面 PWA | ✅ |
| 反馈信号塔 | 21-23 | W149-W151 招募 + verifier 闭环 + v2.2.0 | ✅ **当前** |
| 决定 | 24+ | W152+ 真实用户反馈 → 决定 | ⏸ |

**v3 plan E-方向战略收口 ✅**

---

## 8. 招募成功指标

### 量化指标
- 5-10 朋友内测
- 3 平台贴文发出 (V2EX / 即刻 / Reddit)
- 1 周内 ≥ 5 反馈 (朋友 / GitHub / 邮件 / 微信)
- 30 天 telemetry 数据 (App 内 UsagePage)
- NPS ≥ 7 (老用户)

### 失败兜底
- 0 朋友响应 → 主动找 (W152 决定前)
- 0 平台回复 → 找其他社区 (IndieHackers / Twitter / HN)
- 0 反馈 → 主人自我测试 + UsagePage 数据 (1 周内自己跑 30 天)

---

**北极星**: 让英语在你想用的时候就能用上。

**W151 = v2.2.0 公开发布 + 真实用户招募 + 23 周里程碑 + 战略收口。**

**下一步**: W152 真实用户反馈汇总 → 决定 v3.0 / 收尾 / 开源。
