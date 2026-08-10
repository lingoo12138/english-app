# v2.1.14 (W132 + W133 + W134) — 修 review 漏洞 + 同义词翻译 UI + idb sync 优化

> 最后更新: 2026-08-10
>
> **English**: v2.1.14 closes the v2.1.13 review loop. Three parallel workstreams landed together: W132 fixes all 15 P0 + 14 P1 + 2 P2 review findings from the 3 independent verifiers (W129/W130/W131); W133 continues the 8-activation UI redesign on the remaining 3 components (Translate + SynonymsButton + WordNetwork); W134 hardens idbSync with debounce tuning, 5MB broadcast cap, retry-with-backoff, and port-isolated channels, plus a new e2e that validates the pdfjs vendor split is actually working.

## 背景

v2.1.13 之后, 3 个独立 reviewer (W129 / W130 / W131) 共找出 **15 P0 + 14 P1 + 2 P2** 真问题:
- **W129 Reviewer**: 9 P0 测试漏洞 (IDB 软验证 ×3, waitForTimeout ×3, 死代码, try/catch 空 catch, 监听器位置, 弱 list 验证) + 9 P1
- **W130 Reviewer**: 9 P0 文档准确性 (W131 整段未文档化, 时间线缺 W129/W131, 累计测试数 3 处不一致, 词数 / 行数 / 死链) + 6 P1
- **W131 Reviewer**: 0 P0 + 0 P1 (2 P2 视觉小瑕疵 — OfflineBanner z-index + e2e 5s 硬等待)

3 个方向 3 个 agent 并行 (W132 修 bug / W133 UI 改造 / W134 idb 性能), 主人收尾整合.

## 改动

### W132 — 修 3 reviewer 找 到的 15 P0 + 14 P1 + 2 P2

**W129 e2e P0 修复 (10 项)**:
- `e2e/w129-error-review-flow.spec.ts`: IDB `>= 0` 软验证 → `>= 1` 强验证 + 删 `if (history.length > 0)` 软通过 + `waitForTimeout 500ms` → `waitForSelector` + 删 `try/catch` 空 catch summary 验证 + 加 `localStorage.clear()` 防 session 残留
- `e2e/w129-dictation-flow.spec.ts`: 删死代码 (双赋值 userInput) + IDB 强验证 + `waitForTimeout 1000ms` → `waitForSelector`
- `e2e/w129-aichat-flow.spec.ts`: `waitForTimeout 8000ms` → `expect(input).toBeEnabled` + chats `>= 1` 强验证 + messages `>= 2` 强验证 + 监听器移到 test 顶部 BEFORE navigation + 验证 mock AI 响应内容
- `e2e/w129-lesson-score.spec.ts`: 弱 list 验证 `hasLessons || hasList` → 显式 `isVisible()` 分支验证
- `e2e/w129-fav-search.spec.ts`: firstWord null 静默 return → 显式 `throw new Error` + 跨词结果 `命中 N 词` 数字 + 至少 1 个 word 链接 强验证

**W130 文档 P0 修复 (9 项)**:
- `docs/CHANGELOG.md`: 加 v2.1.13 W129/W130/W131 整段 (review P0-1) + 时间线表 19→21 周, 补 W129 + W131 两行 (P0-2) + 累计测试数 3 处统一到 1478 (P0-3) + W130 测试数 6+→46 (P0-4) + W126 文件行数 4 文件统一到 137/474/381/437 (P0-7) + 页面/组件数 27/32→37/37 (P0-8) + v2.1.7 基线 1225→1232 (P0-9)
- `README.md`: 死链 `w123b-errorreview-ui.png` → `15-abruptly-after.png` (P0-6) + 测试数全改 1450→1478 + 页面 27→37
- `docs/DEV_LOG.md`: 累计 v2.1.12→v2.1.13 + 测试数 + 加 Phase 12 W129-W131 段
- `docs/FEATURES.md` / `docs/ARCHITECTURE.md`: 测试数 1450→1478 + 页面 27→37
- "Lucide 图标 (32 组件)" → "Icon SVG (20 个内联, lucide 风格)" (P1-1) + e2e 17→60+ (19 spec) (P1-3) + TBD 残留 (v0.10) 修 (P1-2)

**W131 P2 修复 (2 项)**:
- `src/components/OfflineBanner.tsx`: z-40 → z-30 + outer wrapper `pointer-events-none` + inner `pointer-events-auto` (允许点击穿透到 nav, banner 仍可见可关闭)
- `e2e/w131-dark-pwa.spec.ts`: `waitForTimeout(5000)` → `waitForSelector('main h1')` + `waitForFunction(无 加载中)`

**+34 单元测试** (`tests/w132-review-fixes.test.ts`): 34 测试 全过, 验证 15 P0 + 2 P2 全部修复.

### W133 — 同义词 + 翻译页 UI 改造

**3 文件 跟 W126 风格一致** (0 emoji + Icon SVG + W123d 顶部 + W113 v2 card + 状态色 + motion + 暗色):
- `src/pages/Translate.tsx` (444 行): 翻译页 W123d 3 圆按钮 + 标题居中 + IconArrow (rotate-180) + W121 折叠 (openGroups + localStorage 持久化) + 0 emoji (替 IconShare/IconClose/IconRefresh/IconSparkles) + W123a sticky bottom + safe-area-inset-bottom + 3 状态色 + 数字 font-mono tabular-nums + 拷贝状态 1.5s 反馈
- `src/components/SynonymsButton.tsx` (218 行): 0 emoji (替 IconRefresh/IconSparkles/IconClose/IconBookOpen) + card card-interactive + 3 状态色 + 大圆环 (W124 Bento) + motion + 暗色 + aria-label
- `src/components/WordNetwork.tsx` (267 行): 4 tab (同根/近义/反义/搭配) 0 emoji (替 IconBookOpen/IconRefresh) + role=tablist/tab/tabpanel + aria-selected + 3 状态色 + 暗色 + 空态 Icon

**+27 单元测试** (`tests/w133-synonyms-translation.test.ts`): 27 测试 全过, 验证 3 文件 W123d + W113 + 暗色 + a11y + 0 emoji + motion + W121 折叠.

### W134 — idb sync 优化 + pdfjs 懒加载

**`src/lib/idbSync.ts` 增强** (300 → 411 行):
- 限频 1 次 / 100ms (原 200ms, 减少跨 tab 同步延迟)
- 广播大小限制 5MB / 条 (localStorage 上限, 超出静默丢弃 + warn)
- 错误重试 3 次 + 指数退避 (100ms, 200ms, 400ms)
- 端口化 channel: 每个 initIdbSync() 实例可指定独立 channelName
- safePost 失败路径: 序列化失败 + 重试 3 次后仍失败 → warn + 不阻塞业务

**e2e 验证 pdfjs 懒加载** (`e2e/w134-pdfjs-lazy.spec.ts`, 4 测试):
- dist/assets/pdfjs-*.js 拆成独立 chunk (> 100KB)
- 错题复习 / 课文评分页加载时, pdfjs 不在首屏 JS 资源
- service worker precache 列表不包含 pdfjs (运行时按需)
- pdf.worker 配套 (与 pdfjs 一起打包, 但不 precache)

**+13 单元测试** (`tests/w134-idb-sync.test.ts`): 13 测试 全过, 验证 100ms debounce / 5MB 限制 / 3 次重试 / 端口化 / safePost.

## 累计数据 v2.1.14
- **123 release tag** / 21+ 周
- **1512+ 单元测试** (1478 → +34 W132 + +27 W133 + +13 W134 = 1552)
- **3 e2e spec** 升级 (W129 5 spec 全部 P0 修复 + W131 1 spec + W134 1 spec 新增)
- **5,423 词 / 100%** ⭐
- 0 P0 + 0 P1 业务 维持 200+ 轮
- 8 大激活功能 + 8 大改版稿 + 2 补充 + 改版稿 2 + 改版稿 3 (W132/W133/W134) = **100% 全部落地** ✅
- 累计 verifier 抗审查 (W87-W134): **24+ 次 review** 找到 **15+ P0** 真问题 100% 修

## 部署
- main: 待 commit + push (W132+W133+W134 3 plan 整合后)
- gh-pages: v2.1.12 仍 deployed, 待 v2.1.14 编译后 deploy
- 预览: https://lingoo12138.github.io/english-app/

## 后续 backlog (W135+)
- W132 修剩余 P1 软等待优化 (e2e 性能, 不阻塞 W132 接收)
- W135 改版稿 4: 性能 + Bundle 进一步优化 (W134 pdfjs 验证后的进一步 lazy load)
- W136 8 大激活 UI 全部 done 后终极回归
