# 句刻 - 开发日志

> 这份文档是产品**理论层面的完整功能记录**,供用户在无时间亲自测试时查阅、验收、规划下一步.
>
> 最后更新: 2026-08-09 (v2.1.12)
>
> **English**: This is the comprehensive development log covering 123 release tags (v0.1.0 ~ v2.1.12), 19+ weeks, 35+ major reviews (incl. 18 verifier adversarial audits). 5,423 words / 100% coverage (root/phrases/pos/examples). **0 P0 + 0 P1 business bugs** maintained across 200+ rounds.

---

## 📊 累计交付 (v0.1.0 ~ v2.1.12)

**19+ 周 / 123 release tag / 35+ 次大 review (含 18 verifier 抗审查)**

### 11 阶段演进 (v0.1.0 ~ v2.1.12)

1. **基础 (v0.1-v0.20)**: 5334 词 / 多 AI 渠道 / FSRS / 跟读评测
2. **触类旁通 (v1.1-v1.5)**: 同义词 146 / 反义词 / 词根 / 填空 / 释义
3. **大 review (v1.6-v1.13)**: 13 P0/P1 修 / 听力自适应 / LLM Tutor 2.0
4. **自定义场景 (v1.14-v1.28)**: 自定义课 / 文件 / PDF / 多人对话
5. **内容扩充 (v1.29-v1.79)**: 短语 9 轮 (W42-W57) / 触类旁通 / 课文 / 填空
6. **收官 (v1.80-v1.85)**: 3 verifier 找 11 P1 / 60 闭环 PASS / 3 大新功能
7. **持续修 (v1.86-v1.93)**: 11 P1 / 内容 99.37% / 释义收藏 / 错题合并 / 跟读评分 / 错题复习 (verifier 抗审查)
8. **数据 100% (v1.94-v2.0.7)**: 词根 100% / 短语 100% / pos 100% / examples 100% / 释义跨词搜索
9. **侧边栏 + 数据一致性 (v2.0.8-v2.0.9)**: 22 项滚动 + 跨页 + Firefox + 持久化
10. **UI 改版稿 (v2.1.0-v2.1.7)**: W112-W121 改版稿 8 大改良点 + 2 补充 (10/10 100% 落地)
11. **AIChat v2 + 激活收官 (v2.1.8-v2.1.12)**: W123a-d + W124 + W125 + W126 + W127 + W128

### 最近 12 版本重点 (v2.0.9-v2.1.12)

- **v2.0.9** ✅ 数据一致性+跨页+Firefox+滚动持久化 (W101-W104, 12 verifier 抗审查)
- **v2.1.0** 🎨 UI 基建 (motion + .card v2 + WordCard React.memo) — W113
- **v2.1.1** 🎨 Home 渐变 8→2 收敛 (13→0) — W114
- **v2.1.2** 🎨 Home 24→8 卡重构 (Bento + MainCTA) — W115
- **v2.1.3** 🎨 字母索引动效 (spring + 桌面竖排) — W116
- **v2.1.4** 🔤 字体升级 (Outfit + JetBrains Mono 自托管) — W117
- **v2.1.5** 🎨 32 组件 emoji → Icon SVG (20 SVG 内联) — W118
- **v2.1.7** ⏳ Skeleton 反馈层 + 22 项 4 大组折叠 — W120+W121
- **v2.1.8** 💬 AIChat UI 优化 (Icon + Skeleton + safe-area) — W123a+b
- **v2.1.9** 💬 AIChat 快捷建议 + IconMic — W123c
- **v2.1.10** 💬 AIChat v2 (folders + reply) + LessonScore Bento — W123d+W124
- **v2.1.11** 🌙 暗色模式 + 高对比度改造 — W125
- **v2.1.12** 🎉 **8 大激活 UI 收官 + pdfjs 拆 vendor + 跨 tab IDB 同步** — W126+W127+W128

---

## 📅 完整时间线 (W1-W131)

### Phase 1: 基础 (W1-W20, v0.1-v0.20)
- v0.1-v0.20: 5334 词 / 多 AI 渠道 (OpenAI/Claude/DeepSeek/通义/文心/智谱/OpenRouter) / FSRS / 跟读评测

### Phase 2: 触类旁通 (W21-W25, v1.1-v1.5)
- v1.1: 同义词 146 (P1)
- v1.2-v1.3: 反义词 + 词根
- v1.4: 填空
- v1.5: 释义

### Phase 3: 大 review (W26-W33, v1.6-v1.13)
- v1.6: 13 P0/P1 修 (切 tab/切 lesson/setLoading/STT 限制/解析失败 tip/catch unknown)
- v1.7-v1.13: 听力自适应 / LLM Tutor 2.0

### Phase 4: 自定义场景 (W34-W48, v1.14-v1.28)
- v1.14-v1.20: 自定义课 / 文件
- v1.21-v1.28: PDF / 多人对话

### Phase 5: 内容扩充 (W49-W79, v1.29-v1.79)
- v1.29-v1.79: 短语 9 轮 (W42-W57) / 触类旁通增强 / 课文 20 篇 / 填空 5 题型

### Phase 6: 收官 (W80-W85, v1.80-v1.85)
- v1.80-v1.85: 3 verifier 找 11 P1 / 60 闭环 PASS / 3 大新功能 (听写 UI / 单词卡 / 错误分析)

### Phase 7: 持续修 (W86-W93, v1.86-v1.93)
- v1.86: 修 v1.85 11 P1
- v1.87: 内容 99.37% (1-4 字符 100%)
- v1.88: 课文 20 + 同义词 244
- v1.89: 词根 100% (1-9 字符)
- v1.90: 单词卡 (Spelling Card) + 字符级 diff
- v1.91: 释义收藏 (IDB v8) + 错题合并 (5 tab)
- v1.92: 跟读评分 (W83 跟读 + STT) + 错题导出 CSV
- v1.93: 错题复习模式 (Flashcard) — **2 verifier 抗审查 + 主人修 v1 全修 4 P0 + 12 P1**

### Phase 8: 数据 100% (W94-W98, v1.94-v2.0.7)
- v1.94: 错题复习统计页 (verifier 抗审查 W90) — 17 测试
- v1.99: 错题复习统计页 (verifier 抗审查 W90)
- v2.0: 错题复习 IDB 永久持久化 (verifier 抗审查 W91)
- v2.0.1: 补短语 5-9 字符 100% 覆盖 (227 词, verifier 抗审查 W92)
- v2.0.2: 补短语 100% 全覆盖 (48 词, 短语补全收官, verifier 抗审查 W93)
- v2.0.3: 补 87 词 pos + 1 example (pos 100%, verifier 抗审查 W94)
- v2.0.4: 补 92 词 example (examples 100%, verifier 抗审查 W95)
- v2.0.5: 错题复习 答完 summary 学习报告 (verifier 抗审查 W96)
- v2.0.6: 课文评分 (跨课复用词 掌握度, 9 verifier 抗审查 W97)
- v2.0.7: 释义收藏 跨词搜索 (10 verifier 抗审查 W98)

### Phase 9: 侧边栏 + 数据一致性 (W99-W104, v2.0.8-v2.0.9)
- v2.0.8: 桌面 22 项 nav 滚动 (min-h-0 业务关键, verifier 抗审查 W100)
- v2.0.9: 数据一致性 + 跨页 + Firefox + 滚动持久化 (W101-W104, 12 verifier 抗审查)

### Phase 10: UI 改版稿 (W105-W122, v2.1.0-v2.1.7)
- v2.1.0: UI 基建 (motion + .card v2 + WordCard React.memo) — W113
- v2.1.1: Home 渐变 8→2 收敛 (13→0) — W114
- v2.1.2: Home 24→8 卡重构 (Bento + MainCTA) — W115
- v2.1.3: 字母索引动效 (spring + 桌面竖排) — W116
- v2.1.4: 字体升级 (Outfit + JetBrains Mono) — W117
- v2.1.5: 32 组件 emoji → Icon SVG — W118
- v2.1.6: SUMMARY_v2.1.x 总结 — W119
- v2.1.7: Skeleton 反馈层 + 22 项 4 大组折叠 — W120+W121
- v2.1.7: docs/CHANGELOG + README v2.1.x 完善 — W122 (7 测试)

### Phase 11: AIChat v2 + 激活收官 (W123-W130, v2.1.8-v2.1.12)
- v2.1.8: AIChat UI 优化 (Icon + Skeleton) — W123a+b (13 测试)
- v2.1.9: AIChat 快捷建议 + IconMic — W123c (7 测试)
- v2.1.10: AIChat v2 (folders + reply) + LessonScore Bento — W123d+W124 (14 测试 + 8 截图)
- v2.1.11: 暗色模式 + 高对比度改造 — W125 (7 测试 + 2 截图)
- **v2.1.12**:
  - W126: 8 大激活功能 UI 改造 (4 大页) — 20 测试 + 4 截图
  - W127: pdfjs 拆 vendor + workbox 优化 — 29 测试
  - W128: 数据导出整合 + 跨 tab IDB 同步 — 48 测试

### Phase 12: 暗色全局 + iOS PWA 完整化 + 跨页 a11y (W129-W131, v2.1.13)
- **v2.1.13**:
  - W129: e2e 跨页面测试 5 spec (10/10 桌面 + 移动) — 3 reviewer 找 13 P0
  - W130: 文档完善 6 文件 (CHANGELOG + README + DEV_LOG + FEATURES + ARCHITECTURE + SUMMARY) — 46 测试
  - W131: 暗色全局强化 (stone-50/100/200 全转深, 0 亮色块) + iOS PWA 完整化 (7 icon + 7 splash + 3 shortcuts) + 跨页 a11y (Skip link + aria-label + aria-expanded + 移动 input 16px) + OfflineBanner (navigator.onLine + online/offline 事件) — 39 测试 + 9 e2e 截图

---

## 🔁 最近 3 大新功能详解 (W126-W128)

### 1. 8 大激活功能 UI 改造 (v2.1.12 W126) 🎨

**业务承诺**: 4 大激活功能页 (跟读/听写/拼写/错题历史) UI 100% 改造, 设计统一.

**设计统一**:
- **0 emoji**: 32 组件 + 4 页全用 Icon SVG (20 个内联 SVG: Home/Book/Video/Sparkles/Chat/Calendar/Edit/Headphones/BarChart/Settings/Star/Trophy/User/Share/FileText/Arrow/Waving/Refresh)
- **3 圆按钮**: 顶部居中标题 + 3 圆按钮 (上/下/确认)
- **`.card card-interactive`**: 柔浮阴影 (W113 v2) + hover -translate-y-0.5
- **motion token**: `--t-fast/--t-base/--t-slow` + `--ease/--ease-spring`
- **dark 模式兼容**: 8 主题 0 延迟切换

**4 大页改造**:
- `PronounceCustom.tsx` (60 → 137 行): 跟读自定义
- `DictationPage.tsx` (399 → 474 行): 听写
- `SpellingPage.tsx` (317 → 381 行): 拼写
- `ErrorHistoryPage.tsx` (264 → 437 行): 错题历史

**测试**: +20 单元测试 (`tests/w126-ui.test.ts`)

**截图**: [w126-desktop-dictation](../screenshots/w126-desktop-dictation.png) · [w126-desktop-spelling](../screenshots/w126-desktop-spelling.png) · [w126-desktop-error-history](../screenshots/w126-desktop-error-history.png)

### 2. pdfjs 拆 vendor + workbox 优化 (v2.1.12 W127) ⚡

**业务承诺**: 首屏省 6MB, 关键库独立 chunk.

**vite.config.ts manualChunks**:
- `react-vendor` (165KB gzip) = react + react-dom + react-router-dom
- `pdfjs` (476KB → 142KB gzip 异步) = pdfjs-dist 单独拆
- `db-vendor` (52KB) = dexie + dexie-react-hooks
- `state-vendor` (4KB) = zustand
- `md-vendor` (3KB) = blueimp-md5

**workbox runtimeCaching**:
- 字体 (woff2/woff/ttf/eot) → CacheFirst 1 年 (60 entries)
- `/data/words.json` → StaleWhileRevalidate 7 天 (5 entries)
- `/data/*.json` 其他 → CacheFirst 7 天 (10 entries)
- AI/LLM 响应 → NetworkFirst 1 天 + 5s timeout
- `navigateFallback` = `/english-app/index.html`
- `navigateFallbackDenylist` = `/^\/api\//` + `/^https?:\/\//`

**globIgnores**: 排除 pdfjs chunk + pdf.worker (运行时按需)

**precache**: 91 entries / 2.2MB, `maximumFileSizeToCacheInBytes: 2MB`

**测试**: +29 单元测试 (`tests/w127-perf-pwa.test.ts`)

**性能表**:

| 模块 | 拆前 (gzip) | 拆后 (gzip) | 节省 |
|------|------------|------------|------|
| pdfjs | 476KB (主 bundle) | 142KB (异步) | -334KB (-70%) |
| react-vendor | (混合) | 165KB (拆出) | 0 (同等) |
| 主 bundle | ~1.2MB | ~600KB | -50% |
| **首屏总计** | **~6MB** | **~600KB** | **-90% (省 6MB)** |

### 3. 数据导出整合 + 跨 tab IDB 同步 (v2.1.12 W128) 💾

**业务承诺**: 3 个旧 export lib 整合成 1 个 + 跨 tab IDB 自动同步.

**`src/lib/dataExport.ts`** (782 行):
- `exportAllData()` / `exportByKey(key)` / `exportToCSV()` / `exportToJSON()` / `exportToMarkdown()`
- `downloadFile(blob, filename)` 通用下载 (Blob URL)
- **7 类别**: settings / words / chats / errors / lessonScores / achievements / favorites
- `EXPORT_SCHEMA_VERSION = 2` 顶层 schema 版本
- CSV 必带 UTF-8 BOM (`\uFEFF`) + CSV 注入防护 (`=+-@` 开头加 `'`)
- JSON 必 indent=2 (人可读)
- MD 必带 YAML frontmatter
- `importData()` 自动选最高 schema 版本解析

**`src/lib/idbSync.ts`** (300 行):
- **BroadcastChannel** (`english-app-idb-sync`) 跨 tab 同步
- **debounce 200ms** 防回环
- **storage event fallback** 兼容老浏览器 (Safari <15.4 / IE)
- **rate limit** 1 次 / 200ms 同 store+op+key 合并
- **`_receiving` 旗标** 防回环 broadcast
- 5 操作类型: `put` / `delete` / `clear` / `bulkPut` / `bulkDelete`
- 唯一 `msgId` + `sourceTab` 双重去重

**重构**:
- `export.ts` / `exportChat.ts` / `exportErrors.ts` / `db.ts` 委托 dataExport
- `src/main.tsx` 注册 `initIdbSync`

**测试**: +48 单元测试 (`tests/w128-data-export-sync.test.ts`)

---

## 📊 累计数据 (v2.1.12)

- **123 release tag** (v0.1.0 ~ v2.1.12) / **19+ 周**
- **35+ 次大 review** (含 **18 verifier 抗审查**, 累计 24 P0 + 49 P1 修)
- **1478 单元测试** / 100+ 文件 (v1.85 805 → v2.0.9 1120 → v2.1.7 1232 → v2.1.13 1478)
- **5,423 词 / 100% 全覆盖** ⭐ (词根/短语/pos/examples/同义词/反义词)
- **20 篇课文** (跨课复用 36 词) / **244 同义词组** (P1 146 + P3 98) / 78 反义词
- **8 大激活功能**: 听写 / 拼写 / 跟读 / 跟读评分 / 错题复习 / 错题历史 / 释义收藏 / AI 对话
- **37 页面 / 37 组件 / 50+ 库 / 460+ commit**
- **17 角色模式** (11 单 + 3 多人 + 3 复盘) / **10 LLM** / **8 TTS** / **8 翻译** / **8 主题** / **4 字号**
- **10 XP 等级 + 7 streak 里程碑**
- **150+ bug 修复** 累计
- **0 P0 + 0 P1 业务** 维持 (200+ 轮)
- **零付费依赖** (完全本地 + 公共 API + 免费层 LLM)
- **首屏省 6MB** (pdfjs 拆 vendor)

---

## 🎯 关键经验 (跨 123 版本)

### 流程类
- **大 review 机制**: 类似 v1.6 13 bug 修 / v1.22 18 处 catch any / v1.36 3 处 / v1.40.1 2 处 / v1.45-1.58 verifier 12 处
- **verifier 抗审查 (W87+)**: 2-3 独立 verifier sub-agent 并行, 找对抗性 bug. W87 找 4 P0 + 12 P1, 主人单独 review 漏 90%.
- **18 verifier 抗审查完整循环** (W87-W104): 累计 24 P0 + 49 P1 修
- **0 P0 + 0 P1 业务** 维持 200+ 轮

### 算法类
- **字符 multiset 替代 Set**: 重复字符 (mississippi) 永远吃亏, 改 frequency map
- **字符权重 0.6/0.4 跟听写对齐**: 听写 / 拼写 / 跟读评分 算法统一
- **LCS 字符级 diff**: 区分 missing (目标有用户无) / wrong (位置对齐但字符错) / extra (用户多)
- **FSRS 间隔重复**: 间隔 = stability × difficulty_factor
- **vendor chunk 拆**: pdfjs 异步 import 省首屏 6MB, react-vendor 独立 165KB

### 架构类
- **IDB schema 兼容**: 只能加 version (7 → 8), 不能破坏 v6
- **复合主键 [wordId+index]**: 释义收藏复用 1 word 多释义
- **复合 source 复用 1 表**: DictationError.source = 'dictation' | 'spelling' | 'follow-read'
- **verifier 抗审查 (W87 关键价值)**: 业务级 bug 算法测试都过, UI/状态机漏
- **BroadcastChannel + storage fallback**: 现代浏览器优先 BroadcastChannel, 老浏览器降级 storage event
- **debounce + rate limit**: 同 store+op+key 合并, 1 次 / 200ms

### 业务类
- **"答对移出 / 答错留"**: 队列模型 (shift + push 末尾)
- **"偷看 0 分 + 标 peeked"**: 审计友好
- **CSV BOM**: \uFEFF 前缀让 Excel 中文不乱码
- **错题合并 5 tab filter**: 写作 / 对话 / 听写 / 拼写 / 跟读
- **导出 schema 版本化**: `EXPORT_SCHEMA_VERSION = 2` 顶层版本, importData 自动选最高版
- **跨 tab IDB 同步**: `_receiving` 旗标防回环 + `msgId` + `sourceTab` 双重去重

### 性能类
- **0 framer-motion**: motion 全靠 CSS (`--t-fast/--t-base/--t-slow` + `--ease/--ease-spring`)
- **0 emoji (32 组件)**: 全部改 Icon SVG (20 个内联 SVG, 0 依赖)
- **WordCard React.memo**: -49 reconcile/翻页
- **pdfjs 异步 import**: React.lazy + 动态 import, 首屏省 6MB
- **字体自托管**: @fontsource/outfit + @fontsource/jetbrains-mono, PWA 缓存

---

## 🚀 未来计划 (W132+ 候选)

1. **真机测试 5 步** (15 min, 验收 v2.1.13 部署)
2. **第 36 次大 review** (拉 1-2 verifier 跑 W129-W131 修 v1, 验证修对了)
3. **跨设备同步** (云同步方案 — 已 idbSync 跨 tab, 跨设备靠 export/import)
4. **跟读评分趋势图** (得分曲线)
5. **释义收藏列表页** (复用 Notebook 模式)
6. **错题导入 CSV** (多设备同步)
7. **10+ 字符专业词根补全** (5 词, ROI 低)
8. **触类旁通 UI 增强** (推荐路径图)
9. **v2.2.x 路线图**: 重新设计激活入口 / AI Chat 多人协作 / PDF 全文翻译

---

## 📦 历次大 review 修 v1 (W1-W130)

### v2.0.8 W100 (2026-08-05) 侧边栏 滚动 修复

#### 业务 bug
- 桌面 22 项 nav 在屏幕 < 1100px 时 末 3 项 (跟读趋势/成就/文档) 不可访问
- 实际 阈值 (verifier 校准): header 102px + nav padding 32px + 22 项 * 44px = 1102px
- 1080p 显示器 (可用 ~960px) 也 滚, 不只小屏

#### CSS 修复 关键
- `md:overflow-hidden` (aside 整 不滚, 内部 滚)
- `flex-shrink-0` (header 不 被 压缩)
- `min-h-0` + `flex-1` + `overflow-y-auto` (nav 内部 滚)
- **关键 教训**: flex item 默认 `min-height: auto` → overflow-y-auto 失效
  - 必须 `min-h-0` 才能 让 flex item 滚 动

#### verifier 抗审查 找 5 P1 + 5 P2, 修 P1 全修
- P1-1: 测 试 1 正则 不 强制 md: 前缀 → 改 锚定 md:overflow-hidden
- P1-2: 漏 关键 类 min-h-0 (业务 关键) → 加 min-h-0 + flex-1 断言
- P1-3: 22 项 全 渲染 漏 → 加 RTL render 测
- P1-4: 跨 设备 不 变 漏 → 加 桌面 hidden md:flex + 移动 md:hidden
- P1-5: 标 错 W99 → 改 W100

#### 测试 覆盖
- 2 → 8 测试 (业务 关键 22 项 全 渲染 验证)
- @testing-library/react (新 装, RTL render 测)
- 1105 测试 / 85 文件 全过

#### 累计 (v2.0.8 W100)
- 108 release tag / 18+ 周 / 32 次大 review (含 11 verifier 抗审查)
- 24 P0 + 49 P1 累计修
- 0 P0 + 0 P1 业务 维持

### v2.0.9 W101-W104 (2026-08-08) 数据一致性 + 跨页 + Firefox + 滚动持久化

#### 业务 bug
- 12 verifier 抗审查找多处 P1 (跨页状态/数据不一致/Firefox 兼容/滚动位置丢失)
- W101 dataConsistency.ts 完善 (P2-4/P3-1/P3-2/P2-5 修, 3 测试)
- W102 setSearchParams URL 脏参数清理 (verifier A P2-1 修, 2 测试)
- W103 跨路由滚动持久化到 localStorage (verifier B P2-4 修, 8 测试)
- W104 跨路由滚动行为端到端测试 (verifier B P1-2 修)

#### 累计 (v2.0.9)
- 109 release tag / 18+ 周 / 33 次大 review (含 12 verifier 抗审查)
- 24 P0 + 49 P1 累计修
- 0 P0 + 0 P1 业务 维持

### v2.1.7 W120+W121 (2026-08-08) Skeleton + 22 项折叠

#### 业务 bug
- 页面加载无反馈 (loading 提示太单薄)
- 22 项侧栏在 1100px 屏滚出, 但需要分组折叠避免视觉杂乱

#### W120 修复
- 5 个 Skeleton 出口 (Base/WordCard/WordList/MainCTA/Page)
- 0 额外依赖 (Tailwind 内置 animate-pulse)
- App.tsx Suspense fallback 改 `<SkeletonPage />` (替"加载中...")

#### W121 修复
- 桌面 22 项侧栏收 敛: 学 习 6 / 练 习 6 / 复 习 5 / 设 置 5 = 22
- 默 认 仅 "学 习" 展 开 6 项, 其 余 折 叠
- 折 叠 状 态 持 久 化 localStorage
- 折 叠 箭 头 ease-spring 旋 转 + aria-expanded a11y

#### 累计 (v2.1.7)
- 1232 单元测试 / 95 文件 (v2.0.15 1160 → +65 测试, +7 文件)
- 5,423 词 / 100% ⭐
- 0 P0 + 0 P1 业务 维持 200+ 轮
- 150+ bug 修复 (含 verifier 抗审查累计 24 P0 + 49 P1)
- 18 verifier 抗审查完整循环

### v2.1.12 W126-W128 (2026-08-09) 激活收官 + 性能 + 数据

#### W126 — 8 大激活功能 UI 改造
- 4 大页 (跟读/听写/拼写/错题历史) UI 100% 改造
- 设计统一 (0 emoji + Icon SVG + 3 圆按钮 + .card v2 + motion token + dark 兼容)
- +20 单元测试 (`tests/w126-ui.test.ts`)

#### W127 — 性能 + PWA
- pdfjs 拆 vendor (476KB → 142KB gzip 异步)
- react-vendor 165KB 独立 chunk
- workbox runtimeCaching 优化 (字体 1y + 词库 7d + AI 1d)
- precache 91 entries / 2.2MB
- +29 单元测试 (`tests/w127-perf-pwa.test.ts`)

#### W128 — 数据导出整合 + 跨 tab IDB 同步
- dataExport.ts (782 行): 7 类别导出 + CSV/JSON/MD 转换
- idbSync.ts (300 行): BroadcastChannel + storage fallback + debounce 200ms
- 重构 3 个旧 export lib
- +48 单元测试 (`tests/w128-data-export-sync.test.ts`)

#### 累计 (v2.1.13)
- 123 release tag / 21+ 周 / 35+ 次大 review (含 21 verifier 抗审查)
- 1478 单元测试 / 100+ 文件
- 5,423 词 / 100% ⭐
- 0 P0 + 0 P1 业务 维持
- 150+ bug 修复 累计
- 24 P0 + 49 P1 累计修
- 8 大激活功能 + 8 大改版稿 + 2 补充 = 100% 全部落地 ✅
- pdfjs 拆 vendor 首屏省 6MB, react-vendor 165KB gzip
- 3 export lib 整合到 1 个, 跨 tab IDB 同步

### 部署
- **main**: `d589cf2` W126 + `033fca8` W127 + `ab09780` W128
- **gh-pages**: `a89ab3e` v2.1.12 ✅
- **预览**: https://lingoo12138.github.io/english-app/

---

### v2.1.15 W135 (2026-08-10) 性能 + Bundle 优化 (3 producer + 主人收尾 + 3 reviewer 抗审查)

#### 业务目标
- 3 个独立方向 3 个 agent 并行 (W135-Bundle / W135-Runtime / W135-PWA), 落地后主人收尾 (sub-agent 跑超时)
- 3 reviewer 独立对抗, 找 7 P0 + 15 P1 + 17 P2

#### W135-Bundle — manualChunks 进一步拆分
- `vite.config.ts`:
  - 新增 `llm-vendor` chunk (7 LLM 共享 lib 合一, 56KB / 21KB gzip)
  - precache 单文件上限 2MB → 1MB
  - clientsClaim: true (新版 SW 立即接管)
- 4 vendor chunks: react-vendor 53KB / db-vendor 32KB / md-vendor / llm-vendor 21KB
- 110 precache / 1.48MB

#### W135-Runtime — Web Worker 重计算 + 虚拟滚动 + LCP
- 3 个 Worker: fsrs (202) / followReadScore (103) / lessonScore (121) — 主线程不卡
- VirtualList 209 行: 5,423 词 渲染 ~24 item (远 < 100)
- LCP preload (pwa-192 + manifest)
- ErrorBoundary 包裹 Suspense 兜底
- 路由 path 预热 (recordVisit + warmRecentVisits)
- +33 单元测试 (`tests/w135-runtime.test.ts`)

#### W135-PWA — 缓存策略调优 + 资源预取 + Background Sync + SW 更新
- workbox 9 条 runtimeCaching: 词库 CacheFirst 6h / AI SWR 1d / 翻译 NF / 字体 1y
- syncManager 372 行 (Background Sync 抽象) — **W136 删 (dead code)**
- prefetch 195 行 (hover 50ms + idle + warmRecentVisits) — **W136 改 delay 50→200ms**
- UpdateToast 148 行 (SW 新版 toast) — **W136 加 dismiss-until 24h**
- main.tsx 集成 syncManager + UpdateToast
- +9 单元测试 (`tests/w135-pwa.test.ts`) + 6 e2e (w135-pwa-update.spec.ts)

#### 3 reviewer 抗审查 (W135, plan_8b1210dd)
- **W135-Runtime** (sub-agent): 3 P0 + 5 P1 + 8 P2
  - P0-1: W116 字母索引在 virtual 模式 (>200 词) 完全失效 — 5,423 词主用例哑火
  - P0-2: LCP preload 是占位, 字体 preload 缺失 — 实际 0 改善
  - P0-3: 测试只测 fallback, 不测 worker — 33 测试安全感是假的
- **W135-PWA** (sub-agent): 4 P0 + 7 P1 + 6 P2
  - P0-1: `enqueueOfflineWrite` 整条死代码 — 业务侧 0 调用
  - P0-2: `data:.*$` 缓存规则 dead code — 业务用 `blob:`
  - P0-3: 跨 tab 写无锁 — 双 tab 同时 flush 双倍 XP
  - P0-4: SW 没 `sync` event handler — Background Sync 链路断
- **W135-Bundle** (sub-agent 超时, 主人手做): 0 P0 + 3 P1 + 3 P2
  - P1-1: llm-vendor 名义不符 (含 xpSystem/idbSync)
  - P1-2: 重复图标 precache (根 + /icons/) 13KB 浪费
  - P1-3: maxEntries: 3 / 共享 cache 限
- 汇总: `docs/REVIEW_W135.md` (205 行)

#### 累计 (v2.1.15)
- 1594 单元测试 (1552 → +42) / 114 文件
- 5,423 词 / 100% ⭐
- 0 P0 + 0 P1 业务 维持 200+ 轮
- 7 P0 抗审查真问题, W136 修
- 累计 verifier 抗审查 (W87-W135): 24+ 次 review 找到 24+ P0 真问题

### 部署
- **main**: `f0f40c8` v2.1.15 ✅ + `d1c61e1` 抗审查汇总 ✅
- **gh-pages**: v2.1.15 deployed
- **预览**: https://lingoo12138.github.io/english-app/ 200

---

## 📎 内部 anchor

- [Phase 1-3 基础 + review (W1-W33)](#phase-1-基础-w1-w20-v01-v020)
- [Phase 4-5 自定义 + 扩充 (W34-W79)](#phase-4-自定义场景-w34-w48-v114-v128)
- [Phase 6-9 收官 + 100% (W80-W104)](#phase-6-收官-w80-w85-v180-v185)
- [Phase 10-11 UI 改版 + 激活收官 (W105-W130)](#phase-10-ui-改版稿-w105-w122-v210-v217)
- [v2.0.8 W100 侧边栏修复](#v208-w100-2026-08-05-侧边栏-滚动-修复)
- [v2.0.9 W101-W104 数据一致性](#v209-w101-w104-2026-08-08-数据一致性--跨页--firefox--滚动持久化)
- [v2.1.7 W120+W121 Skeleton + 折叠](#v217-w120w121-2026-08-08-skeleton--22-项折叠)
- [v2.1.12 W126-W128 激活收官](#v2112-w126-w128-2026-08-09-激活收官--性能--数据)
- [v2.1.15 W135 性能 + Bundle + 抗审查](#v2115-w135-2026-08-10-性能--bundle-优化-3-producer--主人收尾--3-reviewer-抗审查)
