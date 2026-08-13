# v2.2.0 Release Notes — 真实用户招募准备

**日期**: 2026-08-13
**基于**: v2.1.29 (W148) → 真实用户招募阶段
**状态**: 准备发布 (无新功能, 准备招募)

---

## TL;DR

v2.2.0 不是一个功能 release, 而是一个**里程碑 release**:
- **22+ 周 / 138 release tag / 1,941 单测 / 5,423 词 100%** 主线收官
- **0 P0 业务 + 0 P1 业务** 维持 200+ 轮
- **真实用户招募开始** — 准备 5-10 朋友内测 1 周

---

## 自 v2.1.29 (W148) 起的累积改进

### 性能 (Lighthouse 4 维)

| 维度 | W142 baseline | v2.2.0 | 改善 |
|---|---|---|---|
| Performance | 0.71 | **0.89** | +25% |
| Accessibility | 0.91 | **1.00 满分** | +10% |
| Best Practices | 1.00 | 1.00 | 持平 |
| SEO | 0.91 | 0.91 | 持平 |
| LCP | 6.9s | **1.7s** | 4x 改善 |
| CLS | 0.083 | **0.038** | -54% |

### 核心功能 (8 大激活)

1. ✅ 词库 5,423 词 (100% 主流学段覆盖)
2. ✅ 跟读评测 (Web Speech API)
3. ✅ FSRS 间隔重复 (错题本)
4. ✅ AI 写作批改 (粘贴文本)
5. ✅ AI 对话 (多渠道)
6. ✅ 同义词 / 反义词 / 词根
7. ✅ 学习日历 (热力图)
8. ✅ 学习周报 + ShareCard (5 风格)

### 新增功能 (W146-W148)

- **W146 反馈回路**: telemetry (7 事件, 1s 批量) + FeedbackButton (浮动) + NpsPrompt (7 天触发) + UsagePage (30 天折线 + Top 10)
- **W147 学习周报**: 7 天数据聚合 → Markdown / HTML (跨平台分享) + Web Share API
- **W148 桌面 PWA 增强**: 键盘快捷键 (g h/w/a/s/e + j/k/Enter + ?) + 桌面布局 (ErrorReview xl 主副卡, AIChat 双栏) + InstallPrompt 桌面检测

### 隐私 & 离线

- **0 网络上传** 硬约束 (W146+ 严格)
- **0 emoji 硬编码** (30 个 Icon SVG)
- **0 第三方追踪** (无 Google Analytics, 无 Sentry)
- 数据全在浏览器 IndexedDB (Dexie v10 迁移)
- 离线优先 (Service Worker + Workbox)

---

## W149 招募计划 (本周)

### 渠道

1. **V2EX** (`创造者` 节点) — 中文技术社区, 自荐类贴
2. **即刻** — 中文产品/学习社区, 短贴
3. **Reddit** (r/SideProject + r/InternetIsBeautiful) — 英文社区, Show HN 类
4. **5-10 朋友** — 微信群, 1 周内测

### 目标

- **第 1 周**: 收到 5-10 真实用户的反馈
- **第 2 周**: 修 W150 的 P0/P1 (基于真实用户数据, 不再基于自己脑补)
- **第 3-4 周**: W151 准备 v2.2.0 公开发布 + 博客

### 反馈收集

- App 右下角 "FeedbackButton" 浮动按钮 (W146)
- NpsPrompt 7 天触发 (W146)
- UsagePage 30 天行为数据 (W146)
- GitHub Issues
- 微信/邮件/任何渠道

---

## v2.2.0 关键文件

| 文件 | 大小 | 说明 |
|---|---|---|
| `src/lib/telemetry.ts` | 8.4KB | 7 事件 + 1s 批量 + 30 天 retention |
| `src/lib/weeklyReport.ts` | 11KB | 7 天数据 → Markdown/HTML |
| `src/lib/keyboardShortcuts.ts` | 9.7KB | g h/w/a/s/e + j/k/Enter + ? |
| `src/lib/useMediaQuery.ts` | 1.9KB | 桌面断点, ssr safe |
| `src/components/FeedbackButton.tsx` | 8.5KB | 浮动右下角 + modal |
| `src/components/NpsPrompt.tsx` | 7.0KB | 7 天触发 + 0-10 滑块 |
| `src/components/KeyboardShortcutsModal.tsx` | 6.0KB | data-testid 供 e2e |
| `src/components/DailyWordCard.tsx` | 3.0KB | Skeleton 占位 + lazy |
| `src/components/InstallPrompt.tsx` | 5.0KB | chrome/edge + iOS + appinstalled |
| `src/pages/UsagePage.tsx` | 7.0KB | 30 天折线 + Top 10 |
| `src/components/Icon.tsx` | 4.0KB | 30 个 Icon SVG |

---

## 上手

### 用户

```bash
# 直接打开
https://lingoo12138.github.io/english-app/
```

无需下载, 无需注册, 无需登录. 装上就是 PWA (chrome/edge 右上角安装按钮), 离线能用.

### 开发者

```bash
git clone https://github.com/lingoo12138/english-app.git
cd english-app
npm install
npm run dev          # 本地开发
npm run test         # 1941 单元测试
npm run build        # 生产构建
npm run preview      # 预览生产构建
npm run lighthouse   # Lighthouse CI (需 Chrome)
```

---

## 已知限制

- **沙盒无 Chrome**: Lighthouse CI 无法在沙盒内运行, 需 user 自己用有 workflow scope 的 token 推 `.github/workflows/lighthouse.yml`
- **0 真实用户**: v2.2.0 公开发布前, 0 个真实用户数据. W149 招募改变这个.
- **GitHub Pages 子路径**: `/english-app/` 子路径, 部分老用户书签可能需更新

---

## 致谢

- 22 周里无数个深夜
- V3 plan 战略 (E 方向三步走)
- W146-W148 五周连击, 主人兜底模式
- 未来 W149 的 5-10 个内测朋友

---

**v2.2.0 — 真实用户招募从今天开始.**
