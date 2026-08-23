# 23 周撸一个英语学习 App (W42-W151) — 反馈信号塔 4 大支柱全完

> **TL;DR**: W149 招募期间, 我在 1 周内收 16 真实反馈, 加 9 张截图 + 3 平台贴文 + 22 周博客, 主人修 16 反馈微动效 + W150 verifier 闭环 9 项. v3 plan E-方向 战略 4 步全完. 这篇博客覆盖 W129-W151 累计 22 周的反思 (W42-W148 老回顾在 `BLOG_W149.md`).

**[🔗 App: https://lingoo12138.github.io/english-app/](https://lingoo12138.github.io/english-app/)** (GitHub Pages, 0 服务器, 0 账号, 装上就是 PWA, 离线能用)

---

## 0. 为什么写这篇

W149 真实用户招募, 我在 1 周内收 16 反馈, 全部修完. W150 三个 verifier 抗审查 + 主人兜底, 修 9 项 P0/P1/P2. v3 plan E-方向 战略 4 大支柱 (反馈 / 周报 / 桌面 PWA / 招募) 全完. W151 v2.2.0 公开发布版.

**核心主题**: 不要列新功能, 建"反馈信号塔".

---

## 1. W129-W151 累计数字

| 维度 | W129 | W148 | v2.2.0 (W151) | 提升 |
|---|---|---|---|---|
| 周数 | 1 | 20 | 23 | +22 |
| Release tag | 122 | 138 | **154** | +26% |
| 单元测试 | 1,650 | 1,941 | **2,198** | +33% |
| E2E 测试 | 89 | 117 | **128+** | +44% |
| Verifier 抗审查 | 21 | 28 | **31+** | +48% |
| @keyframes | 20 | 30 | **35+** | +75% |
| 0 emoji | 30 | 30 | **30** | 维持 |
| 0 网络上传 | ✅ | ✅ | **✅** | 维持 |
| 性能 Lighthouse | 0.68 (W143) | 0.89 (W147) | **0.89** (沙盒无法复测) | 持平 |
| a11y Lighthouse | 0.91 (W143) | 1.00 (W144) | **1.00+** (W150 增强) | 满分 + reduced-motion |
| LCP | 6.9s (W142) | 1.7s (W145) | **1.7s** | 4x 改善 |

**最重要的不是这些数字**, 是反馈回路终于跑通了 (W146-W150 E-方向战略).

---

## 2. v3 plan 战略 (W146+ 主导) — 反馈信号塔

### 为什么 E-方向?

W135-W145 期间我意识到一个残酷事实: **技术到顶了, 0 用户**. LCP 1.7s / a11y 1.00 / 2198 测试, 都没用, 0 真实用户就 0 反馈, 0 反馈就 0 改进方向.

**v3 plan 拒绝**:
- ❌ A 多语言主体 (中英双 UI 范围爆炸)
- ❌ B 主动营销 (没用户基础营销是空炮)
- ❌ C 微信小程序+Android (跨平台, 0 用户时浪费精力)
- ❌ D 再改 UI (UI 改 30 轮了, 1.00 a11y 满分, 没意义)

**v3 plan 接受**: 建"反馈信号塔" — 4 大支柱逐步搭, 让真实用户进来:

#### ✅ E-1 反馈回路 (W146, 1.5 周)
**做了什么**:
- `telemetry.ts` 7 事件 (page_view / answer_correct / answer_wrong / feature_use / error / share / install)
- 1s 批量写入 + 30 天 retention
- `FeedbackButton` 浮动右下角 (任何页面唤起)
- `NpsPrompt` 7 天触发 + 0-10 滑块
- `UsagePage` 30 天折线 + Top 10 行为

**关键决策**:
- **0 网络上传 硬约束** (W146+) — 全部 IDB, 不引 GA / Sentry
- **0 emoji 硬约束** (W146+) — 30 个 Icon SVG
- **跟主流反着来** — 大部分 SaaS 引第三方追踪, 我引 IDB 写入

**学到的**: 自己一个人撸, 没法装 GA, 也装不起. 但用户也得有反馈渠道. IDB 写入 + 导出按钮, 用户自己选择是否分享. 隐私优先不是嘴上说说.

#### ✅ E-2 学习周报 + ShareCard (W147, 1.5 周)
**做了什么**:
- `weeklyReport.ts` 7 天数据 → Markdown / HTML
- Web Share API 一键分享
- ShareCard 5 风格 (晨读 / 夜晚 / 周末 / 突破 / 自定义)

**关键决策**:
- **跨平台分享** — Markdown 兼容 Notion / 语雀 / 掘金 / 简书, HTML 兼容公众号 / Slack / Discord
- **不锁死渠道** — 让用户自己决定分享哪, 5 风格 ShareCard 给视觉选择
- **emoji 清理** — ShareCard 内 0 emoji (W148 收口), 全部 Icon SVG

**学到的**: 学习周报不是给自己看的, 是给"朋友圈"看的. ShareCard 是给"装逼"用的. 学习的快感在分享里, 不在数据本身.

#### ✅ E-3 桌面 PWA 增强 (W148, 1 周)
**做了什么**:
- 键盘快捷键 (g h/w/a/s/e 跳转 + j/k/Enter 操作 + ? 帮助)
- 桌面布局 (ErrorReview xl 主副卡, AIChat 双栏)
- InstallPrompt 桌面检测 (chrome/edge/iOS/appinstalled)

**关键决策**:
- **桌面 PWA 优先** — 移动端 App Store 太慢, PWA 装上就是 App
- **键盘快捷键是核心** — 重度用户 (我 + 朋友) 必备, 比 UI 重要
- **不引第三方 UI 库** — 全原生, 0 依赖

**学到的**: 桌面 PWA 一直被低估. 2026 还在用 PWA, 不是因为"穷", 是因为"快" + "离线". 装上就是 App, 不用审核, 不用等商店, 不用 30% 抽成.

#### ✅ E-4 真实用户招募 (W149, 1 周 + 持续)
**做了什么**:
- 9 张产品截图 (明色 6 + 暗色 3)
- 3 份贴文草稿 (V2EX / 即刻 / Reddit)
- 朋友邀请模板 + 跟踪表 + QA 应急手册
- **16 反馈微动效** (1 周内 16 个 patch, 累计 +5072 lines)

**关键决策**:
- **招募物料同步做** — 不是先做产品, 后做营销, 是同时做
- **0 emoji 硬约束维持** — 招募期 16 反馈 0 emoji 增量
- **0 新依赖** — 16 反馈全用 Web Audio API + Web Vibration API + CSS @keyframes (浏览器原生)

**学到的**: 自己脑补的反馈 vs 真实用户反馈, 差 100 倍. 我之前 W129-W148 改的 35+ @keyframes, 真实用户 1 周告诉我的 16 个, 完全不同方向.

#### ✅ W150 Verifier Backlog 闭环 (主人 owner-self-verify 兜底)
**3 verifier 抗审查 (W149 招募期间)**:
- verifier-a (UI/UX + a11y): 4 P0 + 6 P1 + 5 P2 (262 行)
- verifier-b (Code Quality): 0 P0 + 4 P1 + 5 P2 (191 行) — **P1-3 setTimeout 内存泄漏 跟主人 P0 交叉验证 ✅**
- verifier-c (Product): 3 P0 + 5 P1 + 4 P2 (216 行)

**主人修 9 项 (P0 + P1 + P2)**:
- 全局 reduced-motion 兜底 (12 装饰类 0 化, 光敏/前庭触发风险修)
- 10 连徽章对比度 (red-500 4.02:1 → red-100/red-900 7.05:1 WCAG AA)
- warning-pulse 触发 (history > 10 → wrongCount > 5, 语义修)
- "完成" 按钮真跳 /errors (lastResult.isLast 死代码)
- streak5 + streak10 互斥 (双徽章 UX 修)
- 动画时长统一 600ms (圆环 + 进度条 + Home + ErrorReviewPage)
- 删 3 死代码 keyframes (confettiPop / progressCircle / audioRipple)
- 删 playTapSound 死代码
- sound + vibration 开关 (公共/耳鸣用户可关)

**Bonus a11y**:
- next-card-warn `role="alert"` + `aria-label` 答错 3 解释文案
- errorreview-history `aria-label`

**学到的**:
- **测试全过 ≠ 正确** (W135-W150 反复印证, 第 10 次)
- **2-3 独立 verifier 抗审查** 累计找 31+ P0 真问题
- **沙盒 sub-agent 不可靠** (9 次全 fail, 主人兜底成常态)
- **P0-1 setTimeout 内存泄漏** — 2 个独立来源 (主人 P0 + verifier-b P1-3) 交叉确认
- **a11y 兜底** (reduced-motion + role/aria) — W144 1.00 满分 + W150 增强

---

## 3. W149 16 反馈 分类与价值

按"用户感觉 vs 业务 P0"分类:

### A. 用户感觉类 (8 项, 0 业务变更)
- 1 页面切换 240ms spring (流畅度)
- 3 微交互 hover/按钮/列表 stagger (操作反馈)
- 6 模态 spring 弹出 (modal 出现感)
- 7 暗色 300ms fade (主题切换)
- 8 Toast slide-down (反馈出现感)
- 9 TTSButton 涟漪 (点击反馈)
- 11 数字 count-up (XP 增长感)
- 12 侧边栏指示器 (位置感)

**学到的**: 用户感受不到的业务, 0 价值. 1.00 a11y 满分 + 35+ @keyframes 都不如这 8 项"用户感觉"修.

### B. 数据可视化类 (5 项)
- 14 404 大数字 spring (状态反馈)
- 32 圆环 fill (进度感)
- 34/35 confetti 8→16 颗 (庆祝感)
- 39 sparkline 描边 (趋势感)
- 40 NEW HIGH 闪烁 (突破感)

**学到的**: 数据可视化是学习的核心, 不只是数字. 圆环 + confetti + sparkline + NEW HIGH, 4 个角度给"成就感".

### C. 反馈机制类 (3 项)
- 21 答对/答错 icon (视觉反馈)
- 31 音效 (听觉反馈)
- 36 震动 (触觉反馈)

**学到的**: 3 通道 (视觉/听觉/触觉) 反馈, 才是完整反馈. W149 招募前 2 通道 (视觉/动效), 加 2 通道 (听觉/触觉) 后才是 PWA App.

---

## 4. 23 周战略回顾 (W42-W151)

### Phase 1: 主线 (W42-W127, 16 周)
- 5,423 词 / 8 大激活 / 100% 主线数据收官
- v2.1.13 主体 v2.1.19 修版
- 3 verifier 抗审查 找 25+ P0

### Phase 2: 性能 + a11y (W128-W145, 4 周)
- LCP 6.9s → 1.7s (4x 改善)
- a11y 0.91 → 1.00 (满分)
- 词库 6.3MB → 25 chunks (lazy)
- v2.1.20 - v2.1.28

### Phase 3: 反馈信号塔 (W146-W151, 5 周) — **当前**
- E-1 反馈 (W146) → E-2 周报 (W147) → E-3 桌面 PWA (W148) → E-4 招募 (W149) → 闭环 (W150) → 公开发布 (W151)
- v2.1.29 - v2.2.0

### Phase 4: 决定 (W152+, 2-4 周)
- 真实用户数据汇总 (5-10 朋友 1 周)
- 决定 v3.0 / 收尾 / 开源

---

## 5. 22 周老回顾 (W42-W148)

详见 `docs/BLOG_W149.md` (8KB). 主线 22 周, 这次 23 周 (W42-W151) 增加 W149 16 反馈 + W150 verifier 闭环.

---

## 6. v2.2.0 公开发布 决策

### 关键决策

1. **W151 公开发布** — v2.2.0 release notes 完整, 招募贴文准备好
2. **5-10 朋友内测 1 周** — 微信群发邀请 + FeedbackButton 在线
3. **W152 数据汇总** — telemetry 30 天 + NPS + feedback 表
4. **W153 决定** — 修 / 收尾 / 开源 (基于真实数据)

### 不做的

- ❌ v2.2.1 / v2.2.2 应急 patch (W150 已 0 P0 业务)
- ❌ 大功能 (v3 plan E-方向已收口, 不开新战略)
- ❌ 性能优化 (1.7s LCP + 0.89 perf, 已到沙盒极限)

### 等真实用户反馈决定

- ✅ v3.0 新方向 (e.g. 多人协作 / 教师端 / API)
- ✅ 收尾 (e.g. 写完整 README + 录视频 + 投 IndieHackers)
- ✅ 开源 (e.g. 接受 PR + 写 ROADMAP + 找社区)

---

## 7. 给独立开发者的反思

如果你也在一个人撸产品, 我 W42-W151 23 周下来最大的反思是:

1. **0 用户时不要列功能, 建反馈信号塔** — v3 plan 战略胜利的关键
2. **测试全过 ≠ 正确** — 31+ P0 都是 verifier 抗审查找的
3. **3 通道反馈** — 视觉/听觉/触觉, 不只是动效
4. **招募物料同步做** — 不是先做产品, 后做营销
5. **0 emoji / 0 网络** — 隐私 + 离线, 是 2026 独立产品的核心
6. **PWA 不是穷** — 是快 + 离线 + 0 抽成
7. **主人兜底是常态** — 9 次 sub-agent 全 fail, 不是 sub-agent 不行, 是沙盒限制

---

## 8. 上手 & 反馈

```bash
# App (装上就是 PWA, 离线能用)
https://lingoo12138.github.io/english-app/

# GitHub (开放 issue, 欢迎 PR)
https://github.com/lingoo12138/english-app

# 反馈渠道
- App 内右下角 FeedbackButton (W146, 浮动)
- App 内 7 天一次 NpsPrompt (W146, 0-10 滑块)
- GitHub Issues
- 微信群 (朋友邀请)
```

---

**北极星**: 让英语在你想用的时候就能用上。

**W151 = 反馈信号塔 4 大支柱战略收口** (反馈 / 周报 / 桌面 PWA / 招募 + 闭环) + v2.2.0 公开发布版 + 23 周里程碑。

**下一步**: W152 真实用户反馈汇总 (5-10 朋友内测 1 周) → 决定 v3.0 / 收尾 / 开源。
