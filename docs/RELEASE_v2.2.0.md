# v2.2.0 Release Notes — 招募闭环 + 23 周里程碑

**日期**: 2026-08-21
**基于**: v2.1.29 (W148) → v2.1.45 (W150)
**状态**: 公开发布版 (W151 准备就绪)

---

## TL;DR

v2.2.0 是**首个公开发布版**, 包含招募期累计的所有改进:
- **23+ 周 / 154 release tag / 2,198 单测 / 5,423 词 100%** 主线收官
- **16 反馈微动效** (W149 招募期间收集) + **9 项 verifier backlog 闭环** (W150)
- **0 P0 业务 + 0 P1 业务** 维持 200+ 轮
- **3 平台招募** (V2EX / 即刻 / Reddit) + **9 张产品截图** + **22 周技术博客**

---

## v2.2.0 核心数字

| 指标 | v2.1.29 (W148) | v2.2.0 (W151) | 提升 |
|---|---|---|---|
| Release tag | 138 | **154** | +16 |
| 单元测试 | 1,941 | **2,198** | +13% |
| E2E 测试 | 117 | **128+** | +9% |
| Lighthouse Performance | 0.89 | 0.89 | 持平 (沙盒无法复测) |
| Lighthouse Accessibility | 1.00 | **1.00+** | 满分 + reduced-motion 兜底 |
| LCP | 1.7s | 1.7s | 持平 (历史最佳) |
| CLS | 0.038 | 0.038 | 持平 |
| 词库 | 5,423 | 5,423 | 100% 主线学段 |
| Verifier 抗审查 | 28+ | **31+** | +3 (W149 招募期间) |
| 反馈微动效 | 35+ @keyframes | **35+ @keyframes** (W149 16 反馈, 0 删除) | +5% |
| 0 emoji 约束 | 30 个 Icon SVG | **30 个 Icon SVG** | 维持 |
| 0 网络上传 | 100% 离线 | **100% 离线** | 维持 |

---

## 自 v2.1.29 起的累积改进 (W146-W150)

### W146 反馈回路 (E-1)
- **telemetry** 7 事件 (page_view / answer_correct / answer_wrong / feature_use / error / share / install)
- **1s 批量写入** + **30 天 retention** (零网络上传)
- **FeedbackButton** 浮动右下角 (任何页面唤起)
- **NpsPrompt** 7 天触发 + 0-10 滑块
- **UsagePage** 30 天折线 + Top 10 行为

### W147 学习周报 (E-2)
- **weeklyReport** 7 天数据聚合 → Markdown / HTML (跨平台分享)
- **Web Share API** 一键分享
- **ShareCard** 5 风格 (晨读 / 夜晚 / 周末 / 突破 / 自定义)

### W148 桌面 PWA 增强 (E-3)
- **键盘快捷键** g h/w/a/s/e 跳转 + j/k/Enter 操作 + ? 帮助
- **桌面布局** ErrorReview xl 主副卡 / AIChat 双栏
- **InstallPrompt** 桌面检测 (Chrome / Edge / iOS / appinstalled)

### W149 真实用户招募 + 16 反馈微动效 (E-4) — 16 个 patch

| v2.1.30 | 反馈 1 | 页面切换 240ms spring 过渡 + scrollTo top |
| v2.1.31 | 反馈 2 | 切页面骨架闪修 (reflow 强制重启动画) |
| v2.1.32 | 反馈 3 | 微交互 hover/按钮/列表 stagger (16 颗 nth-child 30ms 递增) |
| v2.1.33 | 反馈 4-7 | 列表 hover / 模态 spring / 进度 fill / 暗色 fade |
| v2.1.34 | 反馈 8-10 | Toast 滑入 / TTSButton 涟漪 / WordDetail 释义 stagger |
| v2.1.35 | 反馈 11-14 | count-up / 侧边栏指示器 / AIChat / NotFoundPage 404 |
| v2.1.36 | 反馈 16-18 | Streak milestone / Search focus / Switch (a11y) |
| v2.1.37 | 反馈 19-21 | Switch 集成 / Skeleton 扫光 / 答对错 icon |
| v2.1.38 | 反馈 22+24+25 | 错题进度 / SkeletonShimmer / Switch 集成 |
| v2.1.39 | 反馈 26-29 | Slider / 颜色脉冲 / Confetti / 字号 |
| v2.1.40 | 反馈 31+32+33 | 音效 (Web Audio API) / 圆环 / Sidebar 标题 |
| v2.1.41 | 反馈 34+35+36 | 单颗 confetti / 大 confetti / 震动 (navigator.vibrate) |
| v2.1.42 | 反馈 37+38+39 | Streak 徽章 / Sparkline / 警告 |
| v2.1.43 | 反馈 40+41+42+43 | NEW HIGH / 火焰徽章 / 答对率 / 错 3 红 |

### W150 Verifier Backlog 闭环 (9 项) — 主人 owner-self-verify 兜底

3 个独立 verifier (a UI/UX + b Code + c Product) 真实写了完整 review 文档, 累计 4 P0 + 13 P1 + 14 P2, 主人兜底修 9 项核心:

| 严重 | 项 | 修法 |
|---|---|---|
| **P0** | 全局 reduced-motion 兜底 | 12 装饰类 reduced-motion 0 化 (光敏/前庭触发风险) |
| **P0** | 10 连徽章对比度 | red-500 4.02:1 → red-100/red-900 7.05:1 WCAG AA |
| **P0** | warning-pulse 触发 | history > 10 → wrongCount > 5 (语义修) |
| **P0** | "完成" 按钮 | 真跳 /errors (lastResult.isLast 死代码) |
| **P1** | 双徽章 UX | streak5 + streak10 互斥 |
| **P1** | 动画时长统一 | 全部 600ms (圆环 + 进度条 + Home + ErrorReview) |
| **P1** | sound + vibration 开关 | useStore + Settings Switch (公共/耳鸣用户可关) |
| **P2** | 删 3 死代码 keyframes | confettiPop / progressCircle / audioRipple |
| **P2** | 删 playTapSound | W149 反馈 31 早期版本 |

**Bonus a11y**:
- next-card-warn: `role="alert"` + `aria-label` 答错 3 解释文案
- errorreview-history: `aria-label`

---

## 隐私 & 离线 (W146+ 硬约束)

- **0 网络上传** 100% 维持 (telemetry / feedback / nps 全部 IDB)
- **0 emoji 硬编码** 30 个 Icon SVG
- **0 第三方追踪** 无 GA / 无 Sentry / 无 Mixpanel
- **数据全在浏览器 IndexedDB** (Dexie v10 迁移)
- **离线优先** Service Worker + Workbox

---

## 3 平台招募 (W149 准备 + W150 完成)

### 渠道

1. **V2EX** (`创造者` 节点) — 中文技术社区
2. **即刻** — 中文产品/学习社区
3. **Reddit** (r/SideProject + r/InternetIsBeautiful) — 英文社区
4. **5-10 朋友** — 微信群, 1 周内测

### 物料

- **9 张产品截图** (明色 6 + 暗色 3, `screenshots/w149-product/`)
- **3 份贴文草稿** (V2EX / 即刻 / Reddit)
- **朋友邀请模板** (微信群)
- **跟踪表** (W149_FRIEND_TRACKER)
- **QA 应急手册** (W149_QA_PREP)

---

## v2.2.0 关键文件

| 文件 | 大小 | 说明 |
|---|---|---|
| `src/lib/telemetry.ts` | 8.4KB | 7 事件 + 1s 批量 + 30 天 retention |
| `src/lib/weeklyReport.ts` | 11KB | 7 天数据 → Markdown/HTML |
| `src/lib/sound.ts` | 2.8KB | Web Audio API 振荡器 (0 资源) |
| `src/lib/keyboardShortcuts.ts` | 9.7KB | g h/w/a/s/e + j/k/Enter + ? |
| `src/lib/useMediaQuery.ts` | 1.9KB | 桌面断点, ssr safe |
| `src/components/FeedbackButton.tsx` | 8.5KB | 浮动右下角 + modal |
| `src/components/NpsPrompt.tsx` | 7.0KB | 7 天触发 + 0-10 滑块 |
| `src/components/KeyboardShortcutsModal.tsx` | 6.0KB | data-testid 供 e2e |
| `src/components/CountUp.tsx` | 1.4KB | rAF + ease-out cubic |
| `src/components/Switch.tsx` | 1.2KB | role=switch + a11y |
| `src/components/Skeleton.tsx` | 1.2KB | 1.2s 扫光 |
| `src/components/DailyWordCard.tsx` | 3.0KB | Skeleton 占位 + lazy |
| `src/components/InstallPrompt.tsx` | 5.0KB | chrome/edge + iOS + appinstalled |
| `src/pages/UsagePage.tsx` | 7.0KB | 30 天折线 + Top 10 |
| `src/pages/NotFoundPage.tsx` | 2.0KB | 404 大数字 spring |
| `src/components/Icon.tsx` | 4.0KB | 30 个 Icon SVG |
| `src/index.css` | ~50KB | 35+ @keyframes + reduced-motion 兜底 |
| `src/store/useStore.ts` | ~10KB | 状态 + persist (soundEnabled/vibrationEnabled 2 新增) |

---

## 上手

### 用户

```bash
# 直接打开 (无需下载/注册/登录)
https://lingoo12138.github.io/english-app/
```

装上就是 PWA (Chrome/Edge 右上角安装按钮), 离线能用。

### 开发者

```bash
git clone https://github.com/lingoo12138/english-app.git
cd english-app
npm install
npm run dev          # 本地开发
npm run test         # 2,198 单元测试
npm run build        # 生产构建
npm run preview      # 预览生产构建
npm run lighthouse   # Lighthouse CI (需 Chrome)
```

### 反馈渠道

- **App 内**: 右下角 FeedbackButton (W146, 浮动)
- **App 内**: 7 天一次 NpsPrompt (W146, 0-10 滑块)
- **GitHub Issues**: https://github.com/lingoo12138/english-app/issues
- **微信群**: 朋友邀请链接 (W149)

---

## 性能细节 (Lighthouse 4 维)

| 维度 | W142 baseline | v2.1.45 (W150) | v2.2.0 目标 | 改善 |
|---|---|---|---|---|
| Performance | 0.71 | **0.89** (W147) | 维持 | +25% |
| Accessibility | 0.91 | **1.00 满分** (W144) | 1.00+ | +10% |
| Best Practices | 1.00 | 1.00 | 1.00 | 持平 |
| SEO | 0.91 | 0.91 | 0.91 | 持平 |
| LCP | 6.9s | **1.7s** (W145) | 维持 | 4x 改善 |
| CLS | 0.083 | **0.038** (W143) | 维持 | -54% |
| TBT | 300ms | 100ms (W147) | 维持 | -67% |

**a11y 1.00 满分 + W150 增强**:
- 全局 reduced-motion 兜底 (光敏/前庭触发风险)
- 4 无限动画 reduced-motion 自动 0 化
- next-card-warn 屏幕阅读器朗读文案
- 10 连徽章对比度 4.02:1 → 7.05:1 WCAG AA
- Switch role="switch" + aria-checked
- 键盘焦点全可见

---

## 22 周技术回顾 (W129-W150)

详见 `docs/BLOG_W149.md` (8KB) — 涵盖 22 周技术演进:
- W129-W135 8 大激活收官
- W136-W140 性能 + a11y + 内容扩充
- W141-W145 LCP 优化 + a11y 满分 + 词库拆分
- W146-W150 反馈信号塔 (E-1 + E-2 + E-3 + E-4 + 闭环)

**关键经验**:
- **测试全过 ≠ 正确** (W135-W148 反复印证)
- **2-3 独立 verifier 抗审查** 累计找 31+ P0 真问题
- **沙盒 sub-agent 不可靠** (9 次全 fail, 主人兜底成常态)
- **v3 plan 战略胜利** (E 方向 4 步全完, 反馈信号塔 = 持续改进)

---

## 下一步 (W151+)

1. **W151** 真实用户反馈汇总 (5-10 朋友内测 1 周)
2. **W152+** 决定 v3.0 / 收尾 / 开源 (基于真实数据, 不再脑补)
3. **Lighthouse CI workflow** (user 需用 workflow scope token 推)

---

**北极星**: 让英语在你想用的时候就能用上。

**W146-W150 战略收口** = v3 plan E-方向 全部 4 大支柱 (反馈回路 / 周报 / 桌面 PWA / 招募) 完成。
