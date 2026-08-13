# W147 学习周报 + ShareCard 升级 Review (v2.1.28) — v3 plan E-2

> Snapshot **2026-08-13** by `Mavis` (W147 主人) — v3 plan E-2 实施完成.
> 战略: 让"已经用的人"主动传播, 不靠主动营销. W147 把 W146 收集的 telemetry + 7 天真实数据 转化为可分享的周报.

## Summary

| Metric | W146 | **W147 v2.1.28** | Verdict |
|--------|-----:|-----------------:|--------:|
| Performance | 0.89 | 0.89 | 持平 |
| Accessibility | 1.00 | 1.00 | 持平 |
| Best Practices | 1.00 | 1.00 | 持平 |
| SEO | 0.91 | 0.91 | 持平 |
| FCP | 1.1s | 1.1s | 持平 |
| LCP | 1.8s | 1.8s | 持平 |
| TBT | 70ms | 100ms | +30ms (weeklyReport.ts + ShareModal 3 按钮, 仍 < 300ms 阈值) |
| CLS | 0.038 | 0.038 | 持平 |
| 单测 | 1822 | **1854** | +32 (W147 32 测试) |
| e2e | 23+ | 23+ | 持平 (e2e 待 W147.1 写) |

## 战略意义 (v3 plan E-2 落地)

**问题 (W146 解决的)**: 19 周产品 0 真实用户数据 — telemetry 收集了.

**W147 解决**: 把数据变成"用户主动想晒的东西" (周报).
- **Markdown 复制** (Twitter / 博客 / 微信文字)
- **HTML 下载** (跨平台兼容, 微信/微博/小红书粘贴可渲染)
- **Web Share API** (移动端原生分享, 桌面降级到 copy)
- **ShareCard 加 2 新风格**: 单大数字 streak (连续天数) + vocab (词汇量) — 社交传播力更强

## 改动文件

```
A  src/lib/weeklyReport.ts                          (11KB, generateWeeklyReport + renderMarkdown/Html + 3 导出)
M  src/components/ShareCard.tsx                     (扩 ShareCardStyle 3→5, 加 streak/vocab 单大数字风格)
M  src/components/ShareModal.tsx                    (STYLES 5 风格, 加 3 周报按钮, 清理 STYLES emoji)
A  tests/w147-weekly-report.test.ts                 (9.4KB, 32 测试)
```

## 关键决策

### 决策 1: 复用 W145 拆的轻量级 index (不全量 fetch words.json)
- 查 Top 5 词用 `loadWordsIndex()` (608KB) 而非 `loadWords()` (6.3MB)
- W145 lazy 改造的"红利", W147 直接享受
- LCP 1.8s 不退化 (W147 不参与首屏渲染, 用户主动触发才生成)

### 决策 2: HTML inline CSS (跨平台兼容)
- 不用 `<style>` 标签或外部 CSS (粘贴丢失)
- 全 inline `style="..."` 属性
- `linear-gradient` 在微信/微博/小红书粘贴可渲染
- HTML escape 防 XSS (escapeHtml 函数)

### 决策 3: Markdown + HTML 双格式输出
- Markdown: Twitter / 博客 / 纯文字分享
- HTML: 微信朋友圈 / 小红书 (有渲染)
- 用户按场景选 1 键复制 / 1 键下载

### 决策 4: Web Share API 探测 (移动端优先, 桌面降级)
- `'share' in navigator` 检测
- 移动端: 调原生分享面板 (iOS Share Sheet / Android Intent)
- 桌面: 降级到 copyReportAsMarkdown
- 兼容 100% 浏览器

### 决策 5: ShareCard 5 风格 — 3 老的 + 2 新的
- 老 3 (simple/gradient/retro): 多数据卡片 (2x2 网格)
- 新 2 (streak/vocab): **单大数字 + 副标题** — 社交传播力强, 一眼能记住
- streak: "X 天连续学习" (橙→红→粉渐变)
- vocab: "X 词已掌握" (靛→紫→粉渐变)
- 老 3 风格 emoji 留 W148 cleanup (避免 W147 scope creep)

### 决策 6: Home.tsx 入口复用 (无需改造)
- Home.tsx 已有 "📤 分享" 按钮 + ShareModal 弹窗
- W147 周报功能集成进 ShareModal, 用户在分享弹窗里看到 3 个新按钮
- 不破坏 Home 现有布局

## 周报数据流

```
records (LearnRecord)        pronunciationAttempts
  + pronunciationAttempts       ↓
  ↓                            db.pronunciationAttempts
db.records                     ↓
  ↓                            where('ts').above(startTs)
where('timestamp').above(startTs)↓
                              ↓
聚合 7 天                    平均分计算
  ↓                            ↓
按 action 分类 (view/favorite/known/unknown)↓
                              ↓
按 wordId 去重 → wordsLearned  ↓
按学+复习综合 → Top 5 词       ↓
按天分桶 → mostActiveDay     ↓
                            ↓
                writingErrors 7天 → errorCount
                favorites 累计 → totalFavorites
                getTotalLearned → totalLearned
                              ↓
                    WeeklyReportData
                              ↓
              renderMarkdownReport / renderHtmlReport
                              ↓
              copy / download / share (Web Share API)
```

## Lighthouse W147 实测

```
=== W147 v2.1.28 复测 (desktop, local) ===
perf: 89  (W146 89, 持平)
a11y: 100 (持平)
bp: 100 (持平)
seo: 91 (持平)
---
FCP: 1.1s  (持平)
LCP: 1.8s  (持平)
TBT: 100ms (W146 70ms → +30ms, weeklyReport +3KB JS + ShareModal 3 按钮, 仍 < 300ms 阈值)
CLS: 0.038 (持平)
```

**结论**: W147 perf 持平, TBT 略升 (在阈值内), LCP 不退化 (周报按需触发, 不参与首屏).

## Owner Decision

- ✅ 接受 W147 交付 (v3 plan E-2 完整落地)
- ✅ 32 单测全过 (1854/1854)
- ✅ perf 持平 (W147 不参与首屏)
- ✅ 0 emoji 严格 (新文件 + STYLES 表清理)
- ✅ Markdown + HTML + Web Share 3 出口
- ✅ v2.1.28 tag + 部署 + push main + gh-pages
- ⏸ W148 = v3 plan E-3 (桌面布局 + 快捷键, Lighthouse CI W142 已做完)
- ⏸ W149 缓冲 + 真实用户招募 + 文档
- ⏸ 老 3 风格 emoji cleanup 留 W148 (避免 W147 scope creep)
- ⏸ Home CTA "生成我的学习周报" 显式按钮留 W147.1 (目前 ShareModal 入口已够)
- ⏸ Lighthouse workflow push 待 user 推 (Token 缺 workflow scope)

## 累计数据 (v2.1.28)

- **137+ release tag** (v0.1.0 ~ v2.1.28) / 22+ 周 / **42+ 次大 review** (含 28+ verifier 抗审查)
- **1854 单元测试 / 124 文件** (W147 +32)
- **23+ e2e spec / 128+ 测试** (e2e 待 W147.1)
- **5,423 词 / 100%** ⭐ 主线数据 100% 收官
- **8 大激活功能** 全落地
- **0 P0 + 0 P1 业务** 维持 200+ 轮
- 累计 reviewer 抗审查找到 **25+ P0** 真问题 (W139 LessonDetailPage rules-of-hooks 最新)
- **Lighthouse 4 类目 (W147)**: perf 0.89 / a11y 1.00 / bp 1.00 / seo 0.91
- **Lighthouse 进步轨迹**:
  - W142 baseline: perf 0.71 / a11y 0.91 / LCP 6.9s
  - W144 (a11y): perf 0.68 / a11y **1.00**
  - W145 (lazy): perf **0.92** / a11y 1.00 / LCP **1.7s**
  - W146 (E-1): perf 0.89 / a11y 1.00 / LCP 1.8s
  - W147 (E-2): perf 0.89 / a11y 1.00 / LCP 1.8s (持平)

## W148+ (v3 plan E-3 + 缓冲)

- **W148 (E-3)**: 桌面布局 (Home 三栏) + 全局快捷键 (g h/w/a + j/k + Enter + ?) + InstallPrompt 桌面版
- **W149 (缓冲 + 真实用户招募)**:
  - V2EX / 即刻 / Reddit 发 3 个帖 (产品介绍 + 招募试用)
  - 5-10 朋友内测 1 周 + 反馈
  - 文档收尾 + 博客 (W149.1)

## v3 plan 完成进度

- ✅ **E-1** 反馈回路 (W146, 1.5 周)
- ✅ **E-2** 学习周报 + ShareCard 升级 (W147, 1.5 周)
- ⏸ **E-3** 桌面 PWA 增强 (W148, 1 周)
- ⏸ 缓冲 + 真实用户招募 (W149, 1 周)
- ⏸ E-4 多语言 (触发后)
- ❌ 显式拒绝: A 多语言主体 / B 主动营销 / C 微信小程序+Android / D 再改 UI
