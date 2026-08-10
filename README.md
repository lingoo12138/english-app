# 句刻 · 即时英语学习 v2.1.12

> 让你在"想用英语的瞬间就能用上"——把英语嵌进真实生活场景里.
>
> **极简本地版** —— 无后端、无云服务、无账号,所有数据存在你本地的浏览器里.

[🌐 在线预览](https://lingoo12138.github.io/english-app/) ·
[📝 更新日志](./docs/CHANGELOG.md) ·
[🗺️ 路线图](./docs/ROADMAP.md) ·
[✨ 核心特性](./docs/FEATURES.md) ·
[🏗️ 技术架构](./docs/ARCHITECTURE.md) ·
[💬 AI 对话进阶需求](./docs/AI_CHAT_ROADMAP.md) ·
[📦 v2.1.12 摘要](./docs/SUMMARY_v2.1.12.md)

---

## 🎯 当前进度 (v2.1.12)

✅ **123 release tag** (v0.1.0 ~ v2.1.12) / **19+ 周** / **35+ 次大 review** (含 **18 verifier 抗审查**)
✅ **8 大激活功能 UI 100% 收官** (W126) · **pdfjs 拆 vendor 省 6MB** (W127) · **数据导出整合 + 跨 tab IDB 同步** (W128)

> **English Summary**: v2.1.12 is the final release of the v2.1.x track. It closes three parallel workstreams: W126 4-page activation UI redesign, W127 pdfjs vendor chunk splitting (saves 6MB on first load), and W128 unified data export + cross-tab IndexedDB sync. **0 P0 + 0 P1 business bugs** maintained across 200+ review rounds.

### 最近 12 版本速览 (含 v2.1.x 全段)

| 版本 | 重点 | 状态 |
|------|------|------|
| v2.0.9 | ✅ 数据一致性+跨页+Firefox+滚动持久化 (W101-W104, 12 verifier 抗审查) | ✅ |
| v2.1.0 | 🎨 UI 基建 (motion + .card v2 + WordCard memo) | ✅ |
| v2.1.1 | 🎨 Home 渐变 8→2 收敛 (13→0) | ✅ |
| v2.1.2 | 🎨 Home 24→8 卡重构 (Bento + MainCTA) | ✅ |
| v2.1.3 | 🎨 字母索引动效 (spring + 桌面竖排) | ✅ |
| v2.1.4 | 🔤 字体升级 (Outfit + JetBrains Mono) | ✅ |
| v2.1.5 | 🎨 32 组件 emoji → Icon SVG | ✅ |
| v2.1.7 | ⏳ Skeleton 反馈层 + 22 项 4 大组折叠 | ✅ |
| v2.1.8 | 💬 AIChat UI 优化 (Icon + Skeleton + safe-area) | ✅ |
| v2.1.9 | 💬 AIChat 快捷建议 + IconMic | ✅ |
| v2.1.10 | 💬 AIChat v2 (folders + reply) + LessonScore Bento | ✅ |
| v2.1.11 | 🌙 暗色模式 + 高对比度改造 | ✅ |
| **v2.1.12** | **🎉 8 大激活 UI 收官 + pdfjs 拆 vendor + 跨 tab IDB 同步** | ✅ |

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
├─ 性能: pdfjs 拆 vendor (476KB → 142KB gzip) + react-vendor 165KB
├─ 跨 tab: BroadcastChannel + storage event fallback (idbSync.ts)
├─ 测试: Vitest 4 (1478 单元测试 / 100+ 文件)
└─ 静态审查: verify-v*.mjs + review-v*.py + 18 verifier 抗审查 (W87+)
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
npm test         # 跑全套测试 (vitest, 1478 测试)
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

### 部署到 GitHub Pages

```bash
git push origin main                    # 推代码
npm run build                            # 打包
git worktree add /tmp/gh-pages gh-pages  # 切换 gh-pages 分支
cp -r dist/. /tmp/gh-pages/
git push origin gh-pages --force         # 强制推 gh-pages
```

---

## ⚡ 性能表 (W127 pdfjs 拆 vendor 后)

| 模块 | 拆前 (gzip) | 拆后 (gzip) | 节省 | 加载策略 |
|------|------------|------------|------|----------|
| **pdfjs** | 476KB (主 bundle) | **142KB (异步)** | **-334KB (-70%)** | PDF 阅读时才 import |
| **react-vendor** | (混合) | **165KB (拆出)** | 0 (同等) | 主 bundle |
| **db-vendor** | (混合) | **52KB (拆出)** | 0 (同等) | 主 bundle |
| **state-vendor** | (混合) | **4KB (拆出)** | 0 (同等) | 主 bundle |
| **md-vendor** | (混合) | **3KB (拆出)** | 0 (同等) | 主 bundle |
| **主 bundle** | ~1.2MB | **~600KB** | **-50%** | 首屏 |
| **首屏总计** | **~6MB** | **~600KB** | **-90% (省 6MB)** | SPA 启动 |

**PWA 缓存策略**:
- **字体** (woff2/woff/ttf/eot): CacheFirst 1 年 (60 entries)
- **词库 JSON** (`/data/words.json`): StaleWhileRevalidate 7 天 (5 entries)
- **其他 data JSON**: CacheFirst 7 天 (10 entries)
- **AI/LLM 响应**: NetworkFirst 1 天 + 5s timeout (50 entries)
- **precache**: 91 entries / 2.2MB (单文件 ≤ 2MB)

---

## 📊 累计数据 (截至 v2.1.12)

- **123 release tag** (v0.1.0 ~ v2.1.12) / 19+ 周
- **35+ 次大 review** (含 **18 verifier 抗审查**, 累计 24 P0 + 49 P1 修)
- **1478 单元测试** / 100+ 文件 (v1.85 805 → v2.0.9 1120 → v2.1.7 1232 → v2.1.13 1478)
- **5,423 词 / 100% 全覆盖** ⭐ (词根/短语/pos/examples/同义词/反义词)
- **20 篇课文** (跨课复用 36 词) / **244 同义词组** (P1 146 + P3 98) / 78 反义词
- **8 大激活功能**: 听写 / 拼写 / 跟读 / 跟读评分 / 错题复习 / 错题历史 / 释义收藏 / AI 对话
- **37 页面 + 37 组件 + 50+ 库 + 460+ commit**
- **17 角色模式** (11 单 + 3 多人 + 3 复盘) / **10 LLM** / **8 TTS** / **8 翻译** / **8 主题** / **4 字号**
- **10 XP 等级 + 7 streak 里程碑**
- **150+ bug 修复** 累计
- **0 P0 + 0 P1 业务** 维持 (200+ 轮)
- **零付费依赖** (完全本地 + 公共 API + 免费层 LLM)
- **首屏省 6MB** (pdfjs 拆 vendor)

---

## 🔁 最近 3 大关键功能 (W126-W128)

### 1. 8 大激活功能 UI 改造 (v2.1.12 W126) 🎨

4 大页 UI 100% 改造 (跟读/听写/拼写/错题历史), 设计统一:
- 0 emoji (改 Icon SVG)
- 标题居中 + 3 圆按钮
- `.card card-interactive` (柔浮阴影 + hover -translate-y-0.5)
- motion token (`--t-fast/--t-base/--t-slow` + `--ease/--ease-spring`)
- 暗色模式自动适配

+20 单元测试 (`tests/w126-ui.test.ts`)

### 2. pdfjs 拆 vendor (v2.1.12 W127) ⚡

`vite.config.ts` manualChunks 拆出 pdfjs (476KB → 142KB gzip 异步), react-vendor (165KB) 独立 chunk.
**首屏省 6MB** (主 bundle 从 ~1.2MB 减到 ~600KB).

+29 单元测试 (`tests/w127-perf-pwa.test.ts`)

### 3. 数据导出整合 + 跨 tab IDB 同步 (v2.1.12 W128) 💾

- **dataExport.ts** (782 行): 统一 7 类别导出 (settings/words/chats/errors/lessonScores/achievements/favorites) + CSV/JSON/MD 转换 + `EXPORT_SCHEMA_VERSION = 2`
- **idbSync.ts** (300 行): BroadcastChannel 跨 tab 同步 + debounce 200ms + storage event fallback
- 重构 3 个旧 export lib (export.ts / exportChat.ts / exportErrors.ts) 委托 dataExport
- `main.tsx` 注册 `initIdbSync`

+48 单元测试 (`tests/w128-data-export-sync.test.ts`)

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
- **1478 单元测试** / 100+ 文件
- **5,423 词 / 100%** ⭐
- 0 P0 + 0 P1 业务 维持 200+ 轮
- **18 verifier 抗审查完整循环** (24 P0 + 49 P1 累计修)

### 性能红线 (不越)
- 词库 < 100ms / 跨路由 < 50ms / glass ≤ 2 / 0 framer-motion
- WordCard React.memo (-49 reconcile/翻页)
- 字体自托管 PWA 缓存, 首屏不增
- 0 emoji (32 组件) → 0 依赖 SVG
- pdfjs 异步 import (不阻塞首屏)

详见: [SUMMARY_v2.1.x](./docs/SUMMARY_v2.1.x.md) · [SUMMARY_v2.1.12](./docs/SUMMARY_v2.1.12.md) · [CHANGELOG v2.1.x](./docs/CHANGELOG.md#v21x-全段--2026-08-08--2026-08-09)

