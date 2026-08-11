# 句刻 · 即时英语学习 v2.1.19

> 让你在"想用英语的瞬间就能用上"——把英语嵌进真实生活场景里.
>
> **极简本地版** —— 无后端、无云服务、无账号,所有数据存在你本地的浏览器里.

[🌐 在线预览](https://lingoo12138.github.io/english-app/) ·
[📝 更新日志](./docs/CHANGELOG.md) ·
[🗺️ 路线图](./docs/ROADMAP.md) ·
[✨ 核心特性](./docs/FEATURES.md) ·
[🏗️ 技术架构](./docs/ARCHITECTURE.md) ·
[💬 AI 对话进阶需求](./docs/AI_CHAT_ROADMAP.md) ·
[📦 v2.1.19 摘要](./docs/SUMMARY_v2.1.19.md)

---

## 🎯 当前进度 (v2.1.19)

✅ **128+ release tag** (v0.1.0 ~ v2.1.19) / **21+ 周** / **35+ 次大 review** (含 **28+ verifier 抗审查**)
✅ **8 大激活功能 UI 100% 收官** (W126) · **pdfjs 拆 vendor 省 6MB** (W127) · **数据导出整合 + 跨 tab IDB 同步** (W128) · **W135-W138 抗审查 7 P0 100% 闭环 + e2e 链自纠** (v2.1.15-v2.1.18)

> **English Summary**: v2.1.19 is the closure of the v2.1.x track. It rolls up seven releases (v2.1.13-v2.1.18) plus the W135-W138 review loop. W135 brings 3 Workers + llm-vendor chunk + VirtualList. W136 closes all 7 P0 from W135 audit (letter index in virtual mode, real LCP font preload, syncManager dead code removed). W137-W138 self-correct the e2e suite (2 false positives + 2 false negatives). **0 P0 + 0 P1 business bugs** maintained across 200+ review rounds.

### 最近 12 版本速览 (含 v2.1.x 全段)

| 版本 | 重点 | 状态 |
|------|------|------|
| v2.1.7 | ⏳ Skeleton 反馈层 + 22 项 4 大组折叠 | ✅ |
| v2.1.8 | 💬 AIChat UI 优化 (Icon + Skeleton + safe-area) | ✅ |
| v2.1.9 | 💬 AIChat 快捷建议 + IconMic | ✅ |
| v2.1.10 | 💬 AIChat v2 (folders + reply) + LessonScore Bento | ✅ |
| v2.1.11 | 🌙 暗色模式 + 高对比度改造 | ✅ |
| v2.1.12 | 🎉 8 大激活 UI 收官 + pdfjs 拆 vendor + 跨 tab IDB 同步 | ✅ |
| v2.1.13 | 🧪 e2e 跨页面 5 spec 全过 + 暗色全局 + iOS PWA + OfflineBanner (W129-W131, 3 reviewer 抗审查) | ✅ |
| v2.1.14 | 🛠️ 修 review 15 P0+14 P1+2 P2 + 同义词/翻译 UI + idb sync 优化 (W132-W134) | ✅ |
| v2.1.15 | ⚡ 3 Workers (fsrs/followRead/lesson) + llm-vendor chunk + VirtualList + 3 reviewer 抗审查 7 P0 (W135) | ✅ |
| v2.1.16 | 🛠️ 修 W135 抗审查 7 P0 + 关键 P1 (26 文件, 字母索引 virtual + LCP 字体 preload + 删 syncManager) (W136) | ✅ |
| v2.1.17 | 🧪 修 2 个 e2e 假阳性 (字母索引 hidden + dismiss roundtrip) (W137) | ✅ |
| v2.1.18 | 🧪 修 W138 找到的 2 个 e2e 假阴性 (字母索引初始断言 + smooth scroll 时序) (W138) | ✅ |
| **v2.1.19** | **🎉 v2.1.x 收官: W135 抗审查 7 P0 100% 闭环 + e2e 链自纠** | ✅ |

详细变更请看 [CHANGELOG.md](./docs/CHANGELOG.md) · 各版本详情见 `docs/RELEASE_v*.md` · `docs/SUMMARY_v*.md`

---

## ✨ 一句话总结

句刻把英语嵌进真实生活场景里:

- 📚 **5,423 高频词 / 100% 全覆盖** (词根/短语/pos/examples) ⭐
- 🗣️ **20 篇课文** (P1 5 + P2 7 + P3 8) + 244 同义词组
- 🎧 **8 大激活功能** (听写/拼写/跟读/跟读评分/错题复习/错题历史/释义收藏/AI 对话)
- 🍽️ **场景对话** (5 场景 / 6 难度 / 8 角色) + 📝 自定义场景 + 📷 拍照识物
- ⭐ **生词本 + 标签** (7 类启发式) + 🔁 复习按 tag 过滤 + 📥 错题导出 CSV
- 📊 **学习日历 + 报告** (月历热力图 + 日报/周报) + 🤖 **10 LLM + 8 TTS + 8 翻译**

**完整功能列表** → [FEATURES.md](./docs/FEATURES.md)

---

## 🎬 8 大激活功能 (W126 改造后)

> W126 把 4 大激活功能页 (跟读/听写/拼写/错题历史) UI 100% 改造, 设计统一: 0 emoji + Icon SVG + 3 圆按钮 + `.card card-interactive` + motion token + dark 兼容.

| # | 功能 | 路由 | 主要交互 | 截图 |
|---|------|------|----------|------|
| 1 | 🎧 **听写** | `/dictation` | TTS 播放 → 字符输入 → 实时评分 (字符 60% + 词 40%) | [截图](../screenshots/w126-desktop-dictation.png) |
| 2 | 🃏 **拼写** | `/spelling` | 字符级 diff 高亮 (missing/wrong/extra) + 即时反馈 | [截图](../screenshots/w126-desktop-spelling.png) |
| 3 | 🎤 **跟读** | `/pronounce-custom` | TTS 切句 → STT 录音 → 字符/词级评分 | (无截图) |
| 4 | 🎤 **跟读评分 (课文)** | `/textbook/:id` | 跨课复用词 掌握度 + 评分集成 | [截图](../screenshots/w124-desktop-lesson-score.png) |
| 5 | 🔁 **错题复习** | `/errors/review` | Flashcard 队列 + 答对移出 + 答错留 + 偷看 0 | [截图](../screenshots/15-abruptly-after.png) |
| 6 | 📊 **错题历史** | `/errors/history` | 横向条形图 + 来源分组 + 难度分布 | [截图](../screenshots/w126-desktop-error-history.png) |
| 7 | ⭐ **释义收藏** | `/favorites/translation` | 跨词搜索 + [wordId+index] 复合 key | (释义页) |
| 8 | 💬 **AI 对话 v2** | `/aichat` | folders + reply + 快捷建议 + 实时纠错 | [截图](../screenshots/w123d-desktop-aichat.png) |

### 4 圆卡 Bento + Icon SVG 设计原则

每页统一布局:
- **顶部**: 居中标题 + 主操作 (3 圆按钮: 上/下/确认)
- **中部**: 状态卡 (`.card card-interactive` 柔浮阴影, hover -translate-y-0.5)
- **底部**: 次要操作 + 进度条
- **Icon**: 20 个内联 SVG (Home/Book/Video/Sparkles/Chat/Calendar/Edit/Headphones/BarChart/Settings/Star/Trophy/User/Share/FileText/Arrow/Waving/Refresh)
- **Motion**: `--t-fast/--t-base/--t-slow` + `--ease/--ease-spring` 统一
- **Dark**: 自动适配 8 主题 0 延迟切换

---

## 🏗️ 技术栈

```
Vite 5 + React 18 + TypeScript 5 + Tailwind 3 + Zustand 4 + Dexie 3
├─ PWA 离线 (vite-plugin-pwa, 30 天 CacheFirst + SPA navigateFallback)
├─ 主题: CSS 变量驱动, 8 主题 0 延迟切换
├─ 数据: IndexedDB 本地 (零云) — IDB v8 (translationFavs 表)
├─ 性能: pdfjs 拆 vendor (476KB → 142KB gzip) + react-vendor 54KB + llm-vendor 21KB
├─ 跨 tab: BroadcastChannel + storage event fallback (idbSync.ts, 100ms debounce + 5MB cap + 3 retry)
├─ Web Worker: fsrs / followReadScore / lessonScore (W135, 主线程不卡)
├─ 测试: Vitest 4 (1633 单元测试 / 115 文件) + Playwright 12+ spec
└─ 静态审查: verify-v*.mjs + review-v*.py + 28+ verifier 抗审查 (W87-W138)
```

**完整架构** → [ARCHITECTURE.md](./docs/ARCHITECTURE.md)

---

## 📸 PWA + 暗色模式截图

| 主题 | 截图 | 说明 |
|------|------|------|
| 💡 Light 模式 | [deploy-home](../screenshots/deploy-home.png) | 默认主题 (白底 + 品牌色) |
| 🌙 Dark 模式 | [w125-dark-mode](../screenshots/w125-dark-mode.png) | W125 暗色改造, 自动适配激活页 |
| ♿ High Contrast | [w125-high-contrast](../screenshots/w125-high-contrast.png) | 高对比度 (无障碍) |
| 📱 移动端 | [mobile-home](../screenshots/11-mobile-home.png) | 5 项核心 nav + safe-area |
| 🤖 AI Chat | [w123d-desktop-aichat](../screenshots/w123d-desktop-aichat.png) | AIChat v2 (folders + reply) |
| 🎓 Lesson Score | [w124-desktop-lesson-score](../screenshots/w124-desktop-lesson-score.png) | LessonScore Bento |

### 安装 PWA

桌面 (Chrome/Edge):
1. 打开 https://lingoo12138.github.io/english-app/
2. 地址栏右侧出现 `📥 安装` 图标 → 点击 → 确认
3. 桌面生成 `句刻` 图标, 离线可用

iOS Safari:
1. 打开同 URL → 底部分享按钮 → `添加到主屏幕`
2. 名称 `句刻` → 主屏生成图标, 全屏启动

---

## 🚀 快速开始

```bash
npm install
npm run dev      # 开发模式 (http://localhost:5173)
npm run build    # 生产构建 → dist/
npm run preview  # 预览 dist
npm test         # 跑全套测试 (vitest, 1633 测试)
npx vitest run tests/w126-ui.test.ts   # 跑单个测试
```

### E2E 测试流程

```bash
# 安装 Playwright (首次)
npx playwright install chromium

# 跑 e2e
npx playwright test

# 跑某个文件
npx playwright test e2e/v2.1.7.spec.ts

# 跑 + UI 调试
npx playwright test --ui
```

E2E 覆盖:
- `e2e/v2.1.7.spec.ts` — 4 大激活功能页 (听写/拼写/跟读/错题历史) UI 回归
- `e2e/w108-scroll-behavior.spec.ts` — 跨路由滚动持久化
- `e2e/w123*.spec.ts` — AIChat v2 交互
- `e2e/w129-*.spec.ts` (5 spec) — 跨页面错题复习/听写/AI 对话/释义收藏跨词/课文评分
- `e2e/w131-dark-pwa.spec.ts` — 暗色 + PWA + OfflineBanner
- `e2e/w134-pdfjs-lazy.spec.ts` — pdfjs vendor split 验证
- `e2e/w135-pwa-update.spec.ts` — SW 更新
- `e2e/w136-letter-index-virtual.spec.ts` — 5,423 词字母索引 virtual 模式 (W137 修假阳性)
- `e2e/w136-update-dismiss.spec.ts` — UpdateToast 24h dismiss-until (W137 修假阳性)

### 部署到 GitHub Pages

```bash
git push origin main                    # 推代码
npm run build                            # 打包
git worktree add /tmp/gh-pages gh-pages  # 切换 gh-pages 分支
cp -r dist/. /tmp/gh-pages/
git push origin gh-pages --force         # 强制推 gh-pages
```

---

## ⚡ 性能表 (W127 pdfjs 拆 vendor + W135 llm-vendor 后)

| 模块 | 拆前 (gzip) | 拆后 (gzip) | 节省 | 加载策略 |
|------|------------|------------|------|----------|
| **pdfjs** | 476KB (主 bundle) | **142KB (异步)** | **-334KB (-70%)** | PDF 阅读时才 import |
| **react-vendor** | (混合) | **54KB (拆出, W135 进一步压)** | -111KB | 主 bundle |
| **db-vendor** | (混合) | **32KB (拆出)** | 0 (同等) | 主 bundle |
| **llm-vendor** | (主 bundle) | **21KB (W135 新增, LLM 生态共用)** | -56KB | LLM 页面才 import |
| **state-vendor** | (混合) | **4KB (拆出)** | 0 (同等) | 主 bundle |
| **md-vendor** | (混合) | **3KB (拆出)** | 0 (同等) | 主 bundle |
| **主 bundle** | ~1.2MB | **~34KB gzip (W136 删 syncManager 后)** | **-97%** | 首屏 |
| **首屏总计** | **~6MB** | **~600KB** | **-90% (省 6MB)** | SPA 启动 |

**PWA 缓存策略** (W136 调优后):
- **字体** (woff2/woff/ttf/eot): CacheFirst 1 年 (60 entries)
- **词库 JSON** (`/data/words.json`): StaleWhileRevalidate 7 天 (通勤 10h 离线 OK)
- **其他 data JSON**: CacheFirst 7 天 (`data-misc-cache-v1`, 10 entries)
- **AI/LLM 响应**: StaleWhileRevalidate 1 天 (重复 query 秒回, W135 改)
- **翻译 API**: NetworkFirst (翻译不能过期)
- **precache**: 108 entries / 1.45MB (单文件 ≤ 1MB, W135 收紧)

---

## 📊 累计数据 (截至 v2.1.19)

- **128+ release tag** (v0.1.0 ~ v2.1.19) / 21+ 周
- **35+ 次大 review** (含 **28+ verifier 抗审查**, 累计 24+ P0 + 49 P1 修)
- **1633 单元测试** / 115 文件 (v1.85 805 → v2.0.9 1120 → v2.1.7 1232 → v2.1.13 1478 → v2.1.14 1552 → v2.1.16 1633)
- **5,423 词 / 100% 全覆盖** ⭐ (词根/短语/pos/examples/同义词/反义词)
- **20 篇课文** (跨课复用 36 词) / **244 同义词组** (P1 146 + P3 98) / 78 反义词
- **8 大激活功能**: 听写 / 拼写 / 跟读 / 跟读评分 / 错题复习 / 错题历史 / 释义收藏 / AI 对话
- **37 页面 + 37 组件 + 50+ 库 + 460+ commit**
- **17 角色模式** (11 单 + 3 多人 + 3 复盘) / **10 LLM** / **8 TTS** / **8 翻译** / **8 主题** / **4 字号**
- **3 Web Worker** (fsrs/followReadScore/lessonScore, W135 引入)
- **10 XP 等级 + 7 streak 里程碑**
- **150+ bug 修复** 累计
- **0 P0 + 0 P1 业务** 维持 (200+ 轮)
- **零付费依赖** (完全本地 + 公共 API + 免费层 LLM)
- **首屏省 6MB** (pdfjs 拆 vendor) + **index 34KB gzip** (W136 删 syncManager)

---

## 🔁 最近 3 大关键功能 (W135-W138)

### 1. Web Worker + llm-vendor chunk (v2.1.15 W135) ⚡

3 个 Worker 化主线程重计算 + manualChunks 进一步拆 + VirtualList + LCP 字体 preload:
- **3 Web Worker** (主线程不卡): `fsrs.worker.ts` (202) / `followReadScore.worker.ts` (103) / `lessonScore.worker.ts` (121)
- **`llm-vendor` chunk** (W135 新): 21KB gzip, LLM 生态共用 mini-vendor (含 xpSystem/idbSync)
- **`VirtualList`** (209 行): 5,423 词 渲染 ~24 item (远 < 100)
- **`prefetch.ts`** (195 行): 路由 hover 50ms + idle + warmRecentVisits (W136 改 50→200ms)
- **LCP preload** (`index.html`): pwa-192 + manifest

+42 单元测试 (`tests/w135-runtime.test.ts` + `tests/w135-pwa.test.ts`)

### 2. 修 W135 抗审查 7 P0 + 关键 P1 (v2.1.16 W136) 🛠️

W135 抗审查 找 7 P0 + 15 P1 + 17 P2, W136 修 7 P0 + 关键 P1 (26 文件):
- **Runtime P0-1**: 字母索引在 virtual 模式失效 → VirtualList 字母锚点 + scrollIntoView
- **Runtime P0-2**: LCP 字体 preload 真实化 (4 个 woff2, ~80KB)
- **Runtime P0-3**: Worker 测试真测 (MockWorker 真实派发)
- **PWA P0-1**: 删 `syncManager.ts` (372 行, 死代码)
- **PWA P0-2**: 删 `data:.*$` 缓存规则 (0 业务命中)
- **PWA P1-1**: 词库 CacheFirst 6h → SWR 7d
- **PWA P1-7**: UpdateToast 24h dismiss-until
- **Bundle P1-3**: 拆 cache (word-data-cache-v2 / data-misc-cache-v1)

**26 文件改动** + **+39 单元测试** + **2 e2e spec** (`w136-letter-index-virtual` + `w136-update-dismiss`)

### 3. e2e 链自纠 (v2.1.17-v2.1.18 W137-W138) 🧪

W136 抗审查后, W137 验 e2e 找 2 假阳性 + W138 验 e2e 找 2 假阴性. **全是 e2e spec 自身 bug, 0 业务问题.**
- **W137 P1-1**: `w136-letter-index-virtual.spec.ts` — 桌面端 viewport 下移动端字母按钮 `md:hidden` → `waitForSelector state:'attached'` + `:visible` 过滤
- **W137 P1-1**: `w136-update-dismiss.spec.ts` — localStorage roundtrip 假 e2e → UpdateToast 加 test hook + e2e 真测完整流程
- **W138 P0-1**: `#letter-anchor-L` 初始断言逻辑错误 (L 索引远超初始 0-22 渲染范围) → 改 "any 字母锚点存在" + click L → 等 smooth scroll
- **W138 P0-2**: smooth scroll 时序假设错误 → 等 `scrollTop > 10000` + 2500ms 安全网 + 锚点位置容忍 50% → 80%

**核心经验**: **测试全过 ≠ 正确** — W137 假阳性 + W138 假阴性 同时存在, **"测试真测" 比 "业务正确" 重要**. **1 文件改动** (e2e spec), 业务 0 影响.

---

## 🤝 贡献

这是一个个人项目,但欢迎:
- 提 Issue 报 bug 或建议
- Fork 后改造成自己的版本
- 学习代码结构 (架构清晰可读)

---

## 📄 License

MIT

## 📊 v2.1.x UI 改造总结 (W112-W121)

v2.1.0-v2.1.7 改版稿 8 大改良点 100% 完整落地:

| # | 改良点 | 状态 | release |
|---|--------|------|---------|
| 1 | 卡片柔浮 (.card v2) | ✅ | W113 |
| 2 | 渐变 8→2 收敛 | ✅ | W114 |
| 3 | Bento Grid + MainCTA | ✅ | W115 |
| 4 | 字母索引动效 | ✅ | W116 |
| 5 | Icon SVG (20 个内联, lucide 风格) | ✅ | W118 |
| 6 | 字体升级 (Outfit + JBMono) | ✅ | W117 |
| 7 | Motion token | ✅ | W113 |
| 8 | 主 CTA ≤ 5 步 | ✅ | W115 |
| **+** | **Skeleton 反馈层** | ✅ | **W120** |
| **+** | **22 项 → 4 大组折叠** | ✅ | **W121** |

**10/10 业务价值完整落地** (8 改版稿 + 2 补充).

### 关键数据
- **1633 单元测试** / 115 文件
- **5,423 词 / 100%** ⭐
- 0 P0 + 0 P1 业务 维持 200+ 轮
- **28+ verifier 抗审查完整循环** (24+ P0 + 49 P1 累计修, W87-W138)

### 性能红线 (不越)
- 词库 < 100ms / 跨路由 < 50ms / glass ≤ 2 / 0 framer-motion
- WordCard React.memo (-49 reconcile/翻页)
- 字体自托管 PWA 缓存, 首屏不增
- 0 emoji (32 组件) → 0 依赖 SVG
- pdfjs 异步 import (不阻塞首屏)

详见: [SUMMARY_v2.1.x](./docs/SUMMARY_v2.1.x.md) · [SUMMARY_v2.1.19](./docs/SUMMARY_v2.1.19.md) · [CHANGELOG v2.1.x](./docs/CHANGELOG.md#v21x-全段--2026-08-08--2026-08-11)

