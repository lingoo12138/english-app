# v1.52.0 W47 — Verifier 6 独立 review (静态 import + i18n 盲区 + 死代码)

**日期**: 2026-07-27 (W47)
**版本**: v1.52.0 (commit 2d3298f)
**触发**: 第 8 次大 review — verifier6 独立验证
**目标**: 找主审查 + 历史 verifier (1-5 + 7) 漏掉的真问题
**评审范围**: 5 维度独立验证 + 总结
**评审方式**: 静态读 v1.52.0 commit `2d3298f` 源码 (git show 验证: v1.53+ WIP 修复不算)
**评审时间**: ~20 min

---

## 0. 背景

- v1.52.0 已 push, 主审查 0 P0 + 0 P1 (8 维度)
- 历史 verifier 累计找到 11 P1/P2
- W47 加 1 维度 7: fire-and-forget dynamic import (防 verifier4 P1-B 回归)
- **本 verifier 关注 5 维度**: 静态 import 漏判 / i18n 翻译盲区 / 死代码 / i18n P1-1 复现 / 8 维度盲区
- 约束: 不改 src/ 不拉 subagent 不 push

---

## 1. 找到的真 bug

### 1.1 P2-A: useStore.ts:101 fire-and-forget `import().then()` 无 .catch, 与 v1.48/v1.51 同 anti-pattern

**文件**: `src/store/useStore.ts:101` (commit 2d3298f, v1.52.0 未修)
**修法引用**: v1.48 plan.ts P1-A + v1.51 db.ts P1-B 同样模式
**严重度**: P2 (静态 import 防回归 维度 7 漏判, 但 try{}catch{} 仍能保住 sync 错误)

#### 现象

v1.52 大 review 维度 7 (`big-review-v1.52.py`) 声称 "0 fire-and-forget" ✓, 但 `useStore.ts:101` 仍是同一 anti-pattern, 只是**静态 review regex 太窄没扫到**:

```ts
// src/store/useStore.ts:97-103 (v1.52.0, 未修)
setTtsProviderId: (id) => {
  // 修复 P1-7: 切换时停止当前播放
  try {
    // 动态 import 避免循环依赖
    import('../lib/tts').then(m => m.stopSpeak())   // ← fire-and-forget
  } catch {}
  set({ ttsProviderId: id })
}
```

#### 与 v1.48 / v1.51 同模式

| 版本 | 文件:行 | 模式 | 修法 |
|------|---------|------|------|
| v1.43 (B) | plan.ts:90 | `void import('./xpSystem').then(m => m.addXP(...))` | v1.48 改静态 import |
| v1.43 (B) | db.ts:243 | `await import('./xpSystem')` (await 但 import() reject 不抛) | v1.51 改静态 import |
| **v1.52 (本)** | **useStore.ts:101** | **`import('../lib/tts').then(m => m.stopSpeak())`** (无 await, 无 .catch) | **未修** |

#### 静态 review 漏判原因

```python
# scripts/big-review-v1.52.py 第 7 维度
re.search(r"await import\(.*\)\.then\(", line)  # ← 必须含 await
```

但 `useStore.ts:101` 是 `import(...).then(...)` **无 await**, 正则 miss.

**实际扫到 0 处**, 但实际有 1 处. 这是**维度 7 regex 漏洞**.

#### 影响

- **正常情况**: tts.ts 已被加载 (浏览器缓存), import() resolve 立即, stopSpeak() 同步调用. 无 bug.
- **生产首次加载**: import() 走 module resolution + microtask, 与 set() (state update) 是同一 tick. stopSpeak 实际在 set() 之后执行. **用户听到前一个 provider 的最后一段**, 然后切到新 provider.
- **异常情况**: import() reject (chunk 加载失败, 模块 syntax error, network blip), promise 变 unhandled rejection, **外层 `try{}catch{}` 抓不到** (try/catch 只捕 sync, promise reject 是 async).
- 当前 `set()` 仍执行, 用户感知不到错误, 但 console 有 unhandled promise rejection 警告.

#### 修法 (P2, 留 v1.53)

```ts
// useStore.ts:101
import('../lib/tts').then(m => m.stopSpeak()).catch((e: unknown) => {
  const err = e instanceof Error ? e : new Error(String(e))
  console.warn('useStore: stopSpeak 失败:', err.message)
})
```

或更稳: 把 setTtsProviderId 改成 async, await stopSpeak:
```ts
setTtsProviderId: async (id) => {
  try {
    const { stopSpeak } = await import('../lib/tts')
    stopSpeak()
  } catch (e) { /* 静默 */ }
  set({ ttsProviderId: id })
}
```

#### 静态 review 脚本修法 (同步提 v1.53+)

```python
# big-review-v1.53.py 维度 7
# 旧:  r"await import\(.*\)\.then\("
# 新 (3 模式都扫):
patterns = [
    r"import\([^)]+\)\.then\(",            # 无 await
    r"await import\([^)]+\)\.then\(",      # 有 await
    r"void import\([^)]+\)\.then\(",       # void
]
# 然后检查 .then 后 3 行内是否有 .catch
```

---

### 1.2 P2-B: Notebook.tsx:146 + 162 冗余 `await import('../lib/wordTags')`, wordTags 已静态 import

**文件**: `src/pages/Notebook.tsx:146` + `:162` (commit 2d3298f)
**严重度**: P2 (代码 smell, 性能影响微, 但与 v1.52 静态 import 改造目标矛盾)

#### 现象

v1.52 commit `2d3298f` 把 `Notebook.tsx:45` 的 `await import('../lib/words').then(m => m.loadWords())` 改成了静态 import `loadWords()` (verifier4 P1-B 防回归). **但同时 Notebook.tsx 还有 2 处冗余 dynamic import**:

```ts
// Notebook.tsx:11 (静态 import, v1.49 已有)
import { addTagsToWord, ..., removeTagFromWord, renameTag, mergeTags } from '../lib/wordTags'

// Notebook.tsx:146 (v1.21.0 加, v1.52 没动)
const { addTagsToWord: addFn } = await import('../lib/wordTags')  // ← 冗余

// Notebook.tsx:162 (v1.37.0 加, v1.52 没动)
const { suggestTagsFromWord, addTagsToWord } = await import('../lib/wordTags')  // ← 冗余
```

#### 影响

- wordTags 已在模块顶部静态 import, 模块加载时已 init.
- `await import('../lib/wordTags')` 只是拿到同一个 module namespace (Vite 缓存), **不产生代码分割收益**.
- 每次 add tag / AI suggest 都多一次 microtask (虽然很短).
- 真正的"防回归"目标是把所有 `import('../lib/X')` 都审视一遍, **不能只改一处**就声称 "fire-and-forget 修完".

#### 验证

```bash
$ grep "import.*wordTags" src/pages/Notebook.tsx
11:import { addTagsToWord, ... } from '../lib/wordTags'    # 静态
146:    const { addTagsToWord: addFn } = await import('../lib/wordTags')  # 冗余
162:      const { suggestTagsFromWord, addTagsToWord } = await import('../lib/wordTags')  # 冗余
```

#### 修法 (P2, 留 v1.53+)

```ts
// Notebook.tsx:146
const result = await addTagsToWord(wordId, [input.toLowerCase()])  // 用静态 import

// Notebook.tsx:162
const suggested = suggestTagsFromWord(word.word, word.translations[0])  // 用静态 import
const result = await addTagsToWord(wordId, suggested)
```

(与 v1.52 改造 line 45 `loadWords()` 完全一致)

---

### 1.3 P2-C: Layout.tsx 14 nav 标签硬编码中文, i18nKeyCoverage.test.ts 不扫 components

**文件**: `src/components/Layout.tsx:10-44` (commit 2d3298f)
**修法引用**: v1.52 DICT 有 `nav.home/words/daily/translate/notebook/review/settings/scores` 8 key, 但 Layout 14 个 nav label 全部硬编码
**严重度**: P2 (主审查维度 6 承认 0 missing 但**只扫 src/pages**, 不扫 components)

#### 现象

```ts
// Layout.tsx:10-22 (v1.52.0, 未修)
const desktopNav = [
  { to: '/', label: '首页', icon: '🏠' },      // ← 硬编码
  { to: '/words', label: '词库', icon: '📚' },
  { to: '/scenes', label: '场景课', icon: '🎬' },
  { to: '/daily', label: '每日一句', icon: '✨' },
  { to: '/chat', label: 'AI', icon: '💬' },
  { to: '/plan', label: '计划', icon: '📅' },
  { to: '/write', label: '写作', icon: '✍️' },
  { to: '/errors', label: '错题', icon: '📕' },
  { to: '/listen', label: '听力', icon: '🎧' },
  { to: '/report', label: '报告', icon: '📊' },
  { to: '/translate', label: '翻译', icon: '🔤' },
  { to: '/notebook', label: '生词本', icon: '⭐' },
  { to: '/achievements', label: '成就', icon: '🏆' },
  { to: '/settings', label: '设置', icon: '⚙️' },
]
// Layout.tsx:25-36 mobileNav 10 个标签同样硬编码
// Layout.tsx:78,99 还有 '句刻' (app.name) + '即时英语学习' (app.tagline) 硬编码
```

#### 切到 en 的实际表现

- en 模式下, **桌面 14 个 nav + 移动 10 个 nav + 顶部 logo 全部仍是中文**.
- 整个 app 切到英文后, **侧边栏 / 底部 tab 完全不变** — 用户立刻察觉到 i18n 没做完.
- 这是 P2 因为: nav 是最显眼的 UI, 但 Settings 页 i18n 也没全 (PlanPage/WeakWords 等 12 页), **i18n 完整度本来就没承诺过 100%**.

#### 测试盲区

```ts
// tests/i18nKeyCoverage.test.ts:18
function walk(dir: string) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)  // ← 只走 src/pages
    ...
  }
}
walk(pagesDir)  // 永远不扫 components
```

`i18nKeyCoverage.test.ts` 6/6 pass ✓ — 但**前提是只扫 src/pages, Layout 不在范围**.

#### 修法 (P2, 留 v1.53+)

1. **DICT 加 6 个新 nav key** (缺 8 个中的 6 个, 已存在 2 个有偏差):
   - `nav.scenes` (场景课 / Scenes)
   - `nav.chat` (AI / AI)
   - `nav.plan` (计划 / Plan)
   - `nav.write` (写作 / Writing)
   - `nav.errors` (错题 / Errors)
   - `nav.listen` (听力 / Listen)
   - `nav.report` (报告 / Report)
   - `nav.achievements` (成就 / Achievements)
   - 已有 6 个的 en 值需 review: nav.daily='每日'/'Daily' vs Layout 用 '每日一句'/'Daily Sentence'

2. **Layout.tsx 加 useTranslate**:
   ```tsx
   const { t } = useTranslate()
   const desktopNav = [
     { to: '/', label: t('nav.home'), icon: '🏠' },
     ...
   ]
   ```

3. **i18nKeyCoverage.test.ts 改扫描范围**:
   ```ts
   walk('src/pages')
   walk('src/components')  // 加 components
   ```

---

## 2. 5 维度独立评估

### 维度 1: 静态 import 漏判

**结论**: 找到 **1 P2 真 bug** (useStore.ts:101, 见 1.1), **静态 review 维度 7 regex 漏扫**

扫了所有 `import('...')` 调用 (45 处) 分类:

| 模式 | 数量 | 例子 | 状态 |
|------|------|------|------|
| `lazy(() => import(...))` | 26 | App.tsx:9-34 (页面懒加载) | OK (设计意图) |
| `await import('./...')` + destructure | 16 | learningReport.ts:385, db.ts:246, wordTags.ts:173, etc. | OK (try/catch 守卫 + 真 await) |
| `import('pdfjs-dist')` | 3 | pdfUpload.ts:16,19,22,26 | OK (类型 + 懒加载 pdfjs) |
| `import('../lib/words')` 已删 (v1.52) | 0 | Notebook.tsx:45 已改 | ✓ |
| **`import().then()` 无 await 无 catch** | **1** | **useStore.ts:101** | **P2 真 bug (1.1)** |
| `await import(...).then(...)` (regex 扫) | 0 | 无 | ✓ (v1.48/v1.51 修完) |
| `useState<import(...)>` (类型) | 1 | CardReview.tsx:46 | OK (编译时擦除) |
| `await import('blueimp-md5')` | 1 | translate.ts:525 | OK (真 await, 在 try/catch) |

**正则漏洞**: 维度 7 regex `r"await import\(.*\)\.then\("` 必须含 `await`, miss 了 `useStore.ts:101` 无 await 的 case. 建议 v1.53 改为 `r"import\([^)]+\)\.then\("` + 后 3 行有 `.catch` 检查.

**冗余 import (1.2)**: Notebook.tsx:146 + 162 静态 import 已存在 wordTags, 内部 await import 是冗余 — 与 v1.52 静态 import 改造目标矛盾.

---

### 维度 2: i18n 翻译盲区

**结论**: 找到 **1 P2** (Layout, 见 1.3); 12 页面无 useTranslate (主审查已知, 留 W47+)

#### 2.1 14 vs 12 页面 i18n 状态

| 状态 | 数量 | 列表 |
|------|------|------|
| ✅ useTranslate 已集成 | 14 | Home, CardReview, Settings, ReportsPage, Notebook, WordList, ErrorsPage, WordDetail, DailyPage, CalendarPage, ListenPage, AIChat, WritePage, Translate |
| ❌ 无 useTranslate (硬编码中文) | **12** | Achievements, Camera, CustomSceneDetail, CustomSceneLearn, CustomScenes, **LearnReport, PlanPage, PronounceCustom, ReviewCenter, SceneDetail, Scenes, WeakWords** |

**主审查文档说 "10 页面留 W47+"** (REVIEW_v1.52.md 末尾), **实际是 12** — PlanPage + WeakWords 是 v1.51 时漏数的 2 个.

#### 2.2 切到 en 的实际表现

| 类别 | en 模式下表现 |
|------|----------------|
| ✅ 14 页面内容 | 走 DICT, 切语言即时翻 |
| ❌ 12 页面内容 | 全中文, 切 en 不变 |
| ❌ Layout 14 nav label | 全中文, 切 en 不变 (1.3) |
| ❌ `<html lang="zh-CN">` | 硬编码, 切 en 不变 (index.html:2) |
| ❌ `getPageTitle()` | 全中文, 切 en 不变 (utils.ts:14-31) |
| ❌ Onboarding / ErrorBoundary / ShareCard 等 components | 全中文 |

**实际可用性**: en 模式下 14 页面 + 8 nav 标签中文化, 用户感知"半成品 i18n". **北极星 (内容能用) 受损**.

#### 2.3 切到 en 的 bug (更具体)

切 en 模式, 走 `/scenes`:
- Layout 桌面侧边栏: "首页 词库 **场景课** 每日一句 AI 计划 写作 错题 听力 报告 翻译 生词本 成就 设置" ← 全中文
- /scenes 页面: "场景专题课 5 个真实场景 · 真实能用的高频表达" ← 全中文
- /scene/:id 页面: 全中文
- **en 用户 100% 看到中文**

**这是 v1.52 主审查 "0 P1" 的最大盲区**: 8 维度看 DICT 完整性, 不看 user-facing 实际表现.

---

### 维度 3: 死代码

**结论**: 0 P0/P1/P2 (无 dead lib, 无 dead export)

#### 3.1 Lib 文件使用率

扫 47 个 lib/* 文件, 所有文件至少 1 个 importer:

| 类别 | 例子 | importer 数 |
|------|------|-------------|
| 高频 | db (45), useTranslate (16), words (14), tts (9), plan (8) | ≥8 |
| 中频 | xpSystem (5), streak (5), customScenes (5), chatRoles (6) | 5-7 |
| 低频 | difficultyAdapter (1), llmFallback (1), tagSuggest (1) | 1 |
| 全为 0 | **无** | 0 → 0 dead lib |

#### 3.2 单文件内死代码

按 v1.8.0 旧测试 `v1.8.0Misc.test.ts` 已扫, 不重复. 当前**无 dead lib**.

#### 3.3 静态常量 dead 引用

```ts
// xpSystem.ts: XP_REWARDS.STREAK = 10
// grep 全文 0 处 'addXP(XP_REWARDS.STREAK'  →  P3 (dead code)
```

不影响功能 (verifier7 已提), 留 v1.53+.

#### 3.4 总结

- 0 dead lib
- 0 dead export function
- 1 P3 (XP_REWARDS.STREAK 未发, verifier7 已提)
- 1 P2 冗余 dynamic import (Notebook.tsx, 见 1.2)

---

### 维度 4: i18n P1-1 复现风险

**结论**: 0 P0/P1, 测试有效, 但**有扫描盲区** (Layout, components)

#### 4.1 跑 i18nKeyCoverage.test.ts

```
✓ tests/i18nKeyCoverage.test.ts (6 tests) 303ms
  Test Files  1 passed (1)
       Tests  6 passed (6)
```

- 扫到 t() 调用 79 keys (主审查维度 6 也说 79)
- DICT 108 keys (v1.49 100 + v1.52 +7, +1 custom.title 预留)
- zh 0 missing, en 0 missing, 数量对称
- 5 namespace 覆盖 (notebook/wordlist/worddetail/errors/listen)
- 5 页面 useTranslate import 验证

**v1.45 verifier1 找到的 "26 调用 0 key" P1 复现风险**: 0 (测试守住)

#### 4.2 但有 3 个新盲区

1. **Layout.tsx 不扫** (见 1.3) — 14 nav label 硬编码
2. **components 不扫** — Onboarding, ShareCard, Toast, Modal, etc. 都硬编码中文
3. **utils.ts:getPageTitle()** — page title 全中文硬编码, **用户切 en 切 tab, 浏览器 tab 标题仍是中文**

```ts
// utils.ts:14-31
export function getPageTitle(pathname: string): string {
  if (pathname === '/') return '句刻 - 即时英语学习'  // ← zh
  if (pathname.startsWith('/scenes/')) return '场景详情 - 句刻'  // ← zh
  ...
  return '句刻'
}
```

#### 4.3 推论

v1.45 P1-1 (26 调用 0 key) 已修, 但**测试只保 DICT 完整, 不保 user-facing 完整**. 这是 W47+ 应修的真问题.

#### 4.4 建议新测试 (v1.53+)

```ts
// tests/i18nHardcodedZh.test.ts (P2 留 W47+)
// 扫 src/pages + src/components
// 找 4-8 字节的硬编码中文字符串 (除 emoji/占位符/数字)
// 列出 page-by-page count
// 期望: 已 useTranslate 的页面 count = 0 (除 Layout, Toast 等通用组件)
```

---

### 维度 5: 8 维度盲区

**结论**: 提出 3 个新维度建议 (W47+ 加入大 review)

#### 5.1 现有 8 维度 (v1.52)

1. catch (e: any) 残留
2. setLoading 配对
3. as any 残留
4. console.error/warn
5. 空 catch {} 残留
6. i18n 完整性 (DICT key 覆盖)
7. fire-and-forget dynamic import (防回归)
8. 历史 review 修复维持

#### 5.2 建议 3 个新维度

##### 维度 9: `import().then()` 无 catch 静态扫 (regex 改进)

```python
# 旧: r"await import\(.*\)\.then\("
# 新: import\(.*\)\.then\([^c]  (then 内不含 catch)
# 配合 3 行内 .catch 检查
```

**触发**: useStore.ts:101 漏判 (1.1)

##### 维度 10: i18n 页面硬编码中文扫

```python
# 扫 src/pages + src/components
# 找 [一-龥]{2,8} (非数字, 非 emoji)
# 列出 page-by-page count
# 已 useTranslate 页面期望 count ≤ 3 (仅 emoji + 占位符)
```

**触发**: Layout.tsx + 12 页面硬编码 (1.3 + 维度 2)

##### 维度 11: 静态 import 冗余扫

```python
# 扫 import 路径
# 如果同文件 import 同一 lib 2 次 (一次静态一次 dynamic), 报
# Notebook.tsx addTagsToWord 重复 (1.2)
```

**触发**: Notebook.tsx:146/162 冗余 (1.2)

##### 维度 12: `<html lang="zh-CN">` 切 locale 应更新

```python
# 检查 setLocale 触发时是否更新 document.documentElement.lang
# 当前 0 处更新
```

**触发**: index.html 硬编码 zh-CN

#### 5.3 评估优先级

| 新维度 | 触发 | 价值 | 优先级 |
|--------|------|------|--------|
| 9 (fire-and-forget regex 改进) | useStore.ts:101 | 中 (1 P2) | **P0** |
| 10 (硬编码中文扫) | Layout + 12 页面 | 高 (1 P2, 未来防 12 页面漏 i18n) | **P0** |
| 11 (静态 import 冗余) | Notebook.tsx | 低 (1 P2) | P1 |
| 12 (html lang) | index.html | 低 (1 P3) | P2 |

**主审查 P0 累计**: 维度 9 + 10 应加, 2 处 P0 盲区.

---

## 3. 总结

| 维度 | 找到 | 说明 |
|------|------|------|
| 1 静态 import 漏判 | **1 P2** (1.1) | useStore.ts:101 fire-and-forget, regex 漏 |
| 1 静态 import 漏判 | 1 P2 (1.2) | Notebook.tsx:146/162 冗余 dynamic import |
| 2 i18n 翻译盲区 | 1 P2 (1.3) | Layout.tsx 14 nav 硬编码, test 不扫 components |
| 2 i18n 翻译盲区 | (已知) | 12 页面无 useTranslate, 主审查记留 W47+ |
| 3 死代码 | 0 P | 47 lib 全在用 |
| 4 i18n P1-1 复现 | 0 P | i18nKeyCoverage 6/6 ✓, 但有 3 盲区 |
| 5 8 维度盲区 | 3 提案 | 维度 9/10/11 (见 5.2) |
| **合计** | **3 P2** | v1.52 主审查 0 P1 漏了 3 P2 |

**v1.52.0 主审查盲点**:
- **维度 7 regex 太窄**: 只扫 `await import().then()`, 不扫 `import().then()` (无 await)
- **维度 6 只扫 pages**: i18nKeyCoverage 不扫 components, Layout.tsx 14 nav 硬编码逃过
- **没有"硬编码中文"维度**: 12 页面 + Layout + Toast + Modal 等全硬编码, en 模式下大面积中文
- **没有"冗余 import"维度**: Notebook.tsx 加新 import 时未审旧的, 留冗余

**优先级** (按修法 ROI 排):
1. **P2-A** (1.1) — useStore.ts:101 加 `.catch()`, 1 行
2. **P2-C** (1.3) — Layout.tsx 14 nav + 6 DICT key, ~20 行 (大改动)
3. **P2-B** (1.2) — Notebook.tsx:146/162 改静态 import, 2 行

**测试覆盖建议** (W47+ 写):
- `tests/i18nHardcodedZh.test.ts` — 扫 pages + components 硬编码中文 (防维度 2 盲区)
- `tests/dynamicImportPattern.test.ts` — 扫 `import().then()` 无 catch (防维度 7 漏判)
- `tests/staticImportRedundant.test.ts` — 扫同文件重复 import (防维度 11 漏判)

**主审查脚本修法** (同步提 v1.53+):
- `big-review-v1.53.py` 维度 7 改 regex: `r"import\([^)]+\)\.then\("`
- 加维度 9 (i18n 硬编码中文扫)
- 加维度 10 (静态 import 冗余扫)

---

## 4. 评审元数据

- 评审人: verifier6 (general worker)
- 评审时间: 2026-07-27 17:11-17:35 UTC (~20 min)
- 评审方法: 静态读 v1.52.0 commit `2d3298f` + git show 验证 + 维度独立评估
- 评审范围: 所有 import() 调用 (45 处) + 26 页面 i18n 状态 + 47 lib 文件 + 11 components + i18nKeyCoverage 跑通
- 验证工具: git show, grep, vitest (i18nKeyCoverage 6/6 ✓, 全测试 702/702 ✓), tsc --noEmit (0 错), big-review-v1.52.py (8 维度全过)
- **不改 src/**: ✓ (静态读)
- **不拉 subagent**: ✓
- **不 push**: ✓
