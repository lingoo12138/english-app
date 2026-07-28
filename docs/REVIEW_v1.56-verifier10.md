# v1.56.0 W51 — Verifier 10 独立 review (i18n 质量 + 死代码 + import 漏判)

**日期**: 2026-07-28 (W51)
**版本**: v1.56.0 (commit `9f52a4f`)
**触发**: 第 12 次大 review — verifier10 独立验证
**目标**: 找主审查 + 历史 verifier 漏掉的真问题 (5 维度)
**评审范围**: 5 维度独立验证 + 总结
**评审方式**: 静态读 v1.56.0 commit `9f52a4f` 源码 (v1.57+ WIP 修复不算)
**评审时间**: ~18 min

---

## 0. 背景

- v1.56.0 已 push, 主审查 0 P0 + 0 P1 (8 维度)
- v1.56.0 实际只刷了 4 文档, src/ 0 改动 (从 v1.55 → v1.56 无 commit)
- 本 verifier 5 维度:
  1. i18n 翻译质量 (硬编码中文扫描)
  2. 死代码扫描 (export 但 0 引用)
  3. 静态 import 漏判 (防 verifier4 P1-B 回归)
  4. i18n useTranslate hook bug (跨组件同步)
  5. 8 维度盲区 (加新维度)
- 约束: 不改 src/ 不拉 subagent 不 push

---

## 1. 找到的真 bug

### 1.1 P1-A: useStore.ts:101 fire-and-forget `import().then()` — verifier4 P1-B 回归模式重演

**文件**: `src/store/useStore.ts:101` (v1.56.0, 引入 v0.22 时期)
**类别**: fire-and-forget dynamic import (类 v1.48 verifier4 P1-B)
**严重度**: P1 (v1.48 修过同类, 现在又漏)

#### 现象

```ts
// useStore.ts:99-105
ttsProviderId: 'browser',
setTtsProviderId: (id) => {
  // 修复 P1-7: 切换时停止当前播放
  try {
    // 动态 import 避免循环依赖
    import('../lib/tts').then(m => m.stopSpeak())   // ← P1
  } catch {}
  set({ ttsProviderId: id })
},
```

**关键问题**:
- `import(...).then(...)` **无 await, 无 .catch**
- 外层 `try { } catch {}` **只捕同步错误**, 异步 Promise reject 漏到 unhandled
- 模块 `tts.ts` 不可用时 (例如 dynamic chunk 加载失败), 会触发 `Uncaught (in promise)` 错误

#### 主审查 `big-review-v1.56.py` 维度 7 的盲区

```python
# scripts/big-review-v1.56.py 维度 7
print("\n## 7. fire-and-forget dynamic import (verifier4 P1-B 防回归)")
for root, _, files in os.walk('src/'):
    for f in files:
        if not f.endswith(('.ts', '.tsx')): continue
        fp = os.path.join(root, f)
        for i, line in enumerate(open(fp, encoding='utf-8').read().split('\n'), 1):
            if re.search(r"await import\(.*\)\.then\(", line):  # ← 只匹配 await
                ff.append((fp, i, line.strip()))
```

**Regex 漏判**: `r"await import\(.*\)\.then\("` 要求 `await` 前缀, 但 useStore.ts:101 是**裸** `import().then()` (无 await), **漏报**。

更准确的 regex: `r"(?:await\s+)?import\s*\(.*\)\.then\s*\("` 或 `r"^\s*import\s*\(.*\)\.then\s*\("`。

#### 影响

- 现代浏览器 (Chrome/Firefox) 对 unhandled promise rejection 报 `Uncaught (in promise)` 错误
- 仅在用户**切换 TTS 渠道**时触发 (P1-7 修复路径), 影响小但确实有 console 噪声
- 风险: 如果未来 tts.ts 加载失败 (network chunk failed), 切换 TTS 渠道时 setTtsProviderId 仍设上了, 但 stopSpeak() 没执行, **用户期望的"切换时停止当前播放"失效**

#### 验证

```bash
$ grep -rn "import(.*).then" src/ --include="*.ts" --include="*.tsx"
src/store/useStore.ts:101:          import('../lib/tts').then(m => m.stopSpeak())
# 仅 1 处
```

#### 修法 (2 选 1)

**A. 加 .catch (最小改动, 推荐)**:
```ts
import('../lib/tts')
  .then(m => m.stopSpeak())
  .catch(err => console.debug('[tts] stopSpeak skipped:', err))
```

**B. 同步 big-review-v1.56.py regex**:
```python
# scripts/big-review-v1.56.py 维度 7 改 regex
if re.search(r"(?:await\s+)?import\s*\(.*\)\.then\s*\(", line):  # 加 (?:await\s+)?
```
然后跑 `python3 scripts/big-review-v1.56.py` 应能发现。

---

### 1.2 P1-B: AIChat.tsx:475 历史按钮硬编码中文 (v1.52 verifier7 P1-A 回归, v1.53 verifier9 P1-A 回归, v1.56 仍未修)

**文件**: `src/pages/AIChat.tsx:475` (v1.56.0)
**引入版本**: v0.13.0 (历史功能) → v1.52 verifier7 找 P1 → v1.53 verifier9 找 P1 回归 → v1.54/v1.55/v1.56 都未修
**严重度**: P1 (3 次 verifier 标了, 4 个 release 漏修)

#### 现象

```tsx
// AIChat.tsx:474-476 (v1.56.0, 未改)
<button onClick={() => setShowHistory(!showHistory)} className={`btn-ghost text-sm ${showHistory ? 'bg-brand-100 dark:bg-brand-900/30' : ''}`}>
  📚 历史 ({chats.length})              // ← 硬编码中文
</button>

// AIChat.tsx:568 (v1.52 改的, 已 i18n)
<h2 className="text-sm font-semibold">📚 {t('aichat.history').replace('N', String(chats.length))}</h2>
```

#### 影响

- 切到 en: toggle button 显示 "📚 历史 (5)" (中文), 点开 panel 显示 "📚 History (5)" (英文)
- **UI 不一致**: 同一概念 "历史对话数" 在一个面板切换中两种语言混用
- DICT 早就有 `'aichat.history': '历史对话 (N)' / 'History (N)'` (v1.52 加)
- 1 行修复, 0 风险

#### 验证

```bash
$ git show 9f52a4f:src/pages/AIChat.tsx | sed -n '470,480p'
        <button onClick={() => setShowHistory(!showHistory)} className={...}>
          📚 历史 ({chats.length})              # ← v1.56.0 commit 仍未改
        </button>
```

#### 修法 (1 行)

```tsx
// AIChat.tsx:475
<button onClick={() => setShowHistory(!showHistory)} className={`btn-ghost text-sm ${showHistory ? 'bg-brand-100 dark:bg-brand-900/30' : ''}`}>
  📚 {t('aichat.history').replace('N', String(chats.length))}
</button>
```

#### 历史回归链 (重要)

| Release | Verifier | 是否修 |
|---------|----------|--------|
| v1.52.0 (W47) | verifier7 P1-A | ❌ 未修 (verifier7 自己找到的) |
| v1.53.0 (W48) | verifier9 P1-A 回归 | ❌ 仍未修 (verifier9 重新标) |
| v1.54.0 (W49) | - | ❌ 未修 (focus 2 页面 i18n) |
| v1.55.0 (W50) | - | ❌ 未修 (focus 4 页面 i18n) |
| **v1.56.0 (W51)** | **verifier10 (本) 标 P1 仍存在** | ❌ **仍未修** |

**4 个 release 没修 1 行 P1**, 这是 verifier 流程漏洞。

---

### 1.3 P1-C: WritePage.tsx:417 "📚 我的作文" tab 硬编码中文 (v1.52 verifier7 P1-B 回归, v1.53 verifier9 P1-B 回归, v1.56 仍未修)

**文件**: `src/pages/WritePage.tsx:417` (v1.56.0)
**引入版本**: v0.23.0 (历史 tab) → v1.52 verifier7 找 P1 → v1.53 verifier9 找 P1 回归 → v1.54/v1.55/v1.56 都未修
**严重度**: P1 (3 次 verifier 标了, 4 个 release 漏修)

#### 现象

```tsx
// WritePage.tsx:378 (v1.52 已改, 已 i18n)
<h1 className="text-2xl font-bold mb-1">✍️ {t('write.title')}</h1>

// WritePage.tsx:417 (v1.56.0, 仍未改)
<button onClick={() => setActiveTab('history')} className={...}>
  📚 我的作文 ({history.length})      // ← 硬编码中文
</button>
```

#### 影响

- 切到 en: 页面标题 "✍️ Writing" (英文), tab 按钮 "📚 我的作文 (3)" (中文)
- **UI 不一致**: 同一页面 标题英文 + tab 中文
- DICT 已有 `'write.title' = '写作批改' / 'Writing'`, 但**没** `'write.history_tab'`
- 需加 1 个 DICT key + 改 1 行 UI

#### 验证

```bash
$ git show 9f52a4f:src/pages/WritePage.tsx | sed -n '414,420p'
        >
          📚 我的作文 ({history.length})      # ← v1.56.0 commit 仍未改
        </button>
```

#### 修法

新增 DICT key:
```ts
// i18n.ts zh/en
'write.history_tab': '我的作文 (N)' / 'My essays (N)',
```

修 WritePage.tsx:417:
```tsx
<button onClick={() => setActiveTab('history')} className={...}>
  📚 {t('write.history_tab').replace('N', String(history.length))}
</button>
```

#### 历史回归链

| Release | Verifier | 是否修 |
|---------|----------|--------|
| v1.52.0 (W47) | verifier7 P1-B | ❌ 未修 |
| v1.53.0 (W48) | verifier9 P1-B 回归 | ❌ 仍未修 |
| v1.54.0 (W49) | - | ❌ 未修 |
| v1.55.0 (W50) | - | ❌ 未修 |
| **v1.56.0 (W51)** | **verifier10 (本) 标 P1 仍存在** | ❌ **仍未修** |

---

### 1.4 P2-A: 30 个 DICT key 死定义 (DICT 定义但 0 t() 调用) — verifier9 P2-A 扩大版

**文件**: `src/lib/i18n.ts:zh + en` (v1.56.0)
**严重度**: P2 (代码 smell, 误信号风险)

#### 现象

v1.56.0 有 123 DICT key, **30 个 (24%) 0 处 t() 调用**。详细:

| 类别 | 死 key | 状态 |
|------|--------|------|
| **nav.*** | `nav.home, nav.words, nav.daily, nav.translate, nav.notebook, nav.review, nav.scores, nav.settings` (8) | DICT 定义了, 但 Layout.tsx 硬编码中文 (verifier9 P2 已标) |
| **common.*** | `common.save, common.cancel, common.confirm, common.delete, common.empty, common.error, common.success` (7) | 早期预留, 没人调 |
| **app.*** | `app.name, app.tagline` (2) | Layout 硬编码 "句刻" / "即时英语学习" |
| **settings.*** | `settings.appearance, settings.data, settings.llm, settings.tts` (4) | 4 个设置 section 全部硬编码中文 |
| **review.*** | `review.due, review.today, review.streak, review.days` (4) | 早期命名空间, 实际页面用了 `review.empty`, `review.done` 等 |
| **其他** | `home.greeting, home.start, custom.title, notebook.empty, pronounce.back, scenedetail.words, worddetail.back` (7) | 各种早期预留, 0 使用 |
| **verifier9 已知** | `worddetail.back` | 1 个 |

#### 影响

- **误信号风险**: 静态扫描工具 (i18nKeyCoverage.test.ts) 检测"t() key 都在 DICT"时, 不会报这 30 个 DICT key 0 使用 (测试只检测反向)
- **包大小**: 30 死 key × zh + en × 2 字节/key = ~3 KB raw, gzipped 1 KB (可忽略)
- **维护风险**: 未来 i18n 大重构时, 这 30 个 key 是删还是用? 没有信号

#### 验证

```bash
$ python3 (dead-key scan at v1.56.0 commit 9f52a4f)
v1.56.0 DICT keys: 123
t() used: 95
Dead DICT keys: 30
  app.name, app.tagline, common.confirm, common.delete, common.empty, common.error,
  common.success, custom.title, home.greeting, home.start, nav.daily, nav.home,
  nav.notebook, nav.review, nav.scores, nav.settings, nav.translate, nav.words,
  notebook.empty, pronounce.back, review.days, review.due, review.streak,
  review.today, scenedetail.words, settings.appearance, settings.data,
  settings.llm, settings.tts, worddetail.back
```

#### 修法 (2 选 1)

**A. 删 30 个死 key (最小化 DICT, 推荐)**:
```ts
// i18n.ts: 删 30 行 zh + 30 行 en = 60 行
// 节省 1 KB gzipped
```

**B. 慢慢用上** (未来 i18n 扩展时):
- nav.* 8 个 → Layout.tsx nav 用 t()
- common.* 7 个 → 全站 替换硬编码中文
- settings.* 4 个 → 4 个 settings section 加 useTranslate
- 其他 → 单点替换

#### 特别: worddetail.back 死 key + L125 硬编码 (本 verifier 找到)

`worddetail.back` 是 verifier9 P2-A 找的, 现在依然死:
- DICT: `worddetail.back` = '返回' / 'Back'
- WordDetail.tsx:125: `← 返回` (硬编码, **没**用 worddetail.back)

**这是 "key 定义了但忘了用" 的最直接例子**:
- v1.53 加 DICT key, 注释写"预留"
- 至今没人接 L125 的 back button

修法 (1 行):
```tsx
// WordDetail.tsx:125
<button onClick={() => navigate(-1)} className="btn-ghost">← {t('worddetail.back')}</button>
```

---

### 1.5 P2-B: 21 个 lib 死函数 (v0.14 跟读尝试 / v0.15 学习卡 / v0.18 标签等遗物)

**文件**: 14 文件 (v1.56.0)
**严重度**: P2 (代码 smell, 误信号)

#### 现象

v1.56.0 扫 `export function` / `export const` 共 349 个, **21 个 (6%) 0 引用**:

| 文件 | 死函数 | 引入版本 | 原因 |
|------|--------|----------|------|
| `src/lib/db.ts` | `getAttemptsByWord, getBestAttempt, getChat` (3) | v0.14 / v0.15 | 跟读尝试表+聊天表定义后未集成 |
| `src/lib/plan.ts` | `getNextReview, subscribeToPlan` (2) | v0.10 计划 | 重构后没接 UI |
| `src/lib/streak.ts` | `getAllViewRecords, getFavoriteCount` (2) | v0.10 streak | streak UI 用别的接口 |
| `src/lib/learningCalendar.ts` | `getMonthActionCountSync, getMonthWordCountSync` (2) | v0.16 | 重构后没人用 |
| `src/components/Skeleton.tsx` | `SkeletonCard, Spinner` (2) | v0.6 W6 | 早期 skeleton 通用组件, 没用上 (EmptyState 有用, SkeletonCard/Spinner 没用) |
| `src/lib/tts.ts` | `clearBaiduTokenCache, testSpeak` (2) | v0.12 / v0.18 | 百度 TTS 渠道未集成 + 测试函数被忘了删 |
| 其他 6 文件 | `formatDateISO, getIntervalDays, getPdfPageCount, recognizeImages, searchWords, suggestTagsByLLM, clearAppBadgeIfSupported, MAX_TOTAL_TAGS` (8) | v0.10-v0.18 | 重构遗物 |

#### 详细列表

```
const: MAX_TOTAL_TAGS @ src/lib/wordTags.ts:12
func: SkeletonCard @ src/components/Skeleton.tsx:4
func: Spinner @ src/components/Skeleton.tsx:39
func: clearAppBadgeIfSupported @ src/lib/inAppReminder.ts:108
func: clearBaiduTokenCache @ src/lib/tts.ts:333
func: formatDateISO @ src/lib/utils.ts:9
func: getAllViewRecords @ src/lib/streak.ts:6
func: getAttemptsByWord @ src/lib/db.ts:368
func: getBestAttempt @ src/lib/db.ts:382
func: getChat @ src/lib/db.ts:216
func: getFavoriteCount @ src/lib/streak.ts:177
func: getIntervalDays @ src/lib/fsrs.ts:156
func: getMonthActionCountSync @ src/lib/learningCalendar.ts:143
func: getMonthWordCountSync @ src/lib/learningCalendar.ts:148
func: getNextReview @ src/lib/plan.ts:288
func: getPdfPageCount @ src/lib/pdfUpload.ts:90
func: recognizeImages @ src/lib/imageRecog.ts:205
func: searchWords @ src/lib/words.ts:26
func: subscribeToPlan @ src/lib/plan.ts:228
func: suggestTagsByLLM @ src/lib/tagSuggest.ts:16
func: testSpeak @ src/lib/tts.ts:328
```

#### 影响

- 21 个死函数占 lib/ 约 200 行 (估 1-2 KB gzipped, bundle 影响小)
- 重构时容易把死函数当"被用了"来改, 浪费时间
- 误信号: "tts.ts 有 clearBaiduTokenCache" 暗示百度 TTS 渠道还在, 实际已删

#### 修法 (2 选 1)

**A. 全删 (省心)**:
```ts
// 21 个死函数 + MAX_TOTAL_TAGS const 全删
// 估 1-2h 手工, 加测试验证
```

**B. 标 @deprecated**:
```ts
/** @deprecated v0.14 跟读尝试, v0.16 移除 UI 集成后无引用 */
export async function getAttemptsByWord(wordId: string): Promise<...> { ... }
```

#### 特别: Skeleton.tsx 整个文件几乎 100% 死

```ts
// src/components/Skeleton.tsx (v1.56.0)
export function SkeletonCard({ rows = 3 }: { rows?: number }) { ... }   // ← 0 引用
export function EmptyState({ icon, title, description, action }) { ... } // ← 0 引用 (但 description 等可能被 spread 用, 实际 0)
export function Spinner({ size = 'md' }) { ... }                         // ← 0 引用
```

**整个文件 3 export 全死**, 可以整文件删 (估 50 行)。

---

### 1.6 P2-C: useTranslate hook 0 测试覆盖 (DICT 测试 ≠ hook 测试)

**文件**: `src/lib/useTranslate.ts` (v1.56.0)
**严重度**: P2 (测试覆盖 gap)

#### 现象

- `t()` 函数: 测了 (tests/i18n.test.ts: 4 测试)
- `getLocale()` / `setLocale()` / `initLocale()` / `tMany()`: 测了
- **`useTranslate` hook 本身: 0 测试**

```bash
$ grep -rn "useTranslate" tests/ --include="*.ts" --include="*.tsx"
tests/i18nKeyCoverage.test.ts:81:  it('Notebook/WordList/WordDetail/ErrorsPage/ListenPage 页面都用了 useTranslate', {
tests/i18nKeyCoverage.test.ts:82:    // 5 页面必须 import useTranslate (v1.49.0 W46 集成验证)
# 只测了 5 页面"import 了 useTranslate", 没测 hook 行为
```

#### 风险

useTranslate hook 关键行为:
1. `useState(getLocale())` 启动读 localStorage
2. `useEffect` 监听 'locale-change' 事件, setLocaleState 触发 rerender
3. `t` useCallback 依赖 locale, 重建返回新翻译
4. `changeLocale` 调 setLocale 触发全局事件 + 本地 setState

如果未来某次重构**不小心删了 useEffect listener**, 没测试会捕获, 全站切语言失效 (silent bug)。

#### 修法 (新测试, 1h)

```ts
// tests/useTranslate.test.ts (新)
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'  // 需 npm install — 但任务说"零成本", 改用最小化手写测试
import { useTranslate } from '../src/lib/useTranslate'
import { setLocale } from '../src/lib/i18n'

describe('useTranslate hook (v1.56.0)', () => {
  beforeEach(() => {
    localStorage.clear()
    setLocale('zh')
  })

  it('默认 locale = zh', () => {
    const { result } = renderHook(() => useTranslate())
    expect(result.current.locale).toBe('zh')
    expect(result.current.t('common.save')).toBe('保存')
  })

  it('setLocale 触发 locale change, t 返新翻译', () => {
    const { result } = renderHook(() => useTranslate())
    expect(result.current.t('common.save')).toBe('保存')
    act(() => result.current.setLocale('en'))
    expect(result.current.locale).toBe('en')
    expect(result.current.t('common.save')).toBe('Save')
  })

  it('setLocale 触发 locale-change 事件, 其他 useTranslate 实例同步', () => {
    const { result: a } = renderHook(() => useTranslate())
    const { result: b } = renderHook(() => useTranslate())
    act(() => a.current.setLocale('en'))
    expect(b.current.locale).toBe('en')
    expect(b.current.t('common.save')).toBe('Save')
  })
})
```

**注**: `renderHook` 来自 `@testing-library/react`, 当前没装。**若严格零成本, 用 happy-dom + 手写 effect 测试** (估 30 min)。

---

## 2. 5 维度独立评估

### 维度 1: i18n 翻译质量 (硬编码中文扫描)

**结论**: **0 新 P0**, **3 P1/P2 回归** (v1.52/v1.53 verifier 标了 v1.56 仍漏修)

**全 25 页面 t() + 硬编码中文 扫描结果**:

| 页面 | useTranslate | t() 调用 | 硬编码中文 (行) | 评价 |
|------|--------------|----------|----------------|------|
| AIChat.tsx | ✓ | 2 | **93** | ⚠️ P1-B 回归: L475 历史按钮 (1.1.2) |
| Achievements.tsx | ✓ | 1 | 17 | TYPE_META labels 硬编码 (维度 4) |
| CalendarPage.tsx | ✓ | 1 | 26 | - |
| Camera.tsx | ✗ | 0 | 35 | (PlanPage 同, 已知) |
| CardReview.tsx | ✓ | 30 | 18 | ✓ v1.45 26 key 完整 |
| CustomSceneDetail.tsx | ✓ | 2 | 19 | ✓ v1.55 改完 |
| CustomSceneLearn.tsx | ✓ | 1 | 30 | - |
| CustomScenes.tsx | ✓ | 2 | 53 | - |
| DailyPage.tsx | ✓ | 2 | 9 | - |
| ErrorsPage.tsx | ✓ | 8 | 44 | - |
| Home.tsx | ✓ | 4 | 62 | - |
| LearnReport.tsx | ✓ | 3 | 24 | ✓ v1.54 改完 |
| ListenPage.tsx | ✓ | 7 | 40 | - |
| Notebook.tsx | ✓ | 11 | 63 | - |
| PlanPage.tsx | ✗ | 0 | 33 | (已知) |
| PronounceCustom.tsx | ✗ | 0 | 9 | (无 h1, 已知) |
| ReportsPage.tsx | ✓ | 3 | 58 | - |
| ReviewCenter.tsx | ✓ | 2 | 29 | - |
| SceneDetail.tsx | ✗ | 0 | 30 | (scene.name 数据, 已知) |
| Scenes.tsx | ✓ | 1 | 10 | - |
| Settings.tsx | ✓ | 1 | 21 | - |
| Translate.tsx | ✓ | 1 | 18 | - |
| WeakWords.tsx | ✗ | 0 | 34 | (已知) |
| WordDetail.tsx | ✓ | 5 | 35 | ⚠️ 5 key 覆盖 5 行, 还有 11 行硬编码 (L125 死 key, 见 P2-A) |
| WordList.tsx | ✓ | 8 | 10 | - |
| WritePage.tsx | ✓ | 3 | **95** | ⚠️ P1-C 回归: L417 我的作文 tab (1.1.3) |

**全 25 页面 t() 集成状态**:
- 20/25 页面有 useTranslate (含部分 — 5 页面无)
- 95 个 t() 调用全用 string literal, **0 t(variable) 风险**

**P1 回归 (3 个 verifier 标过, 4 release 漏修)**:
- AIChat.tsx:475 📚 历史 (P1-B in v1.52/53, 仍未修)
- WritePage.tsx:417 📚 我的作文 (P1-C in v1.52/53, 仍未修)

**维度 1 结论**: v1.55 主审查扫了 DICT 完整 (0 missing) 但没扫"同屏 t() 一致性", 所以 2 个 v1.52 P1 回归 4 个 release 漏修。这是**主审查维度 6 的盲区** — 应该加 "key 调用存在性 + key 使用密度" 两维度。

---

### 维度 2: 死代码扫描

**结论**: **0 新 P0**, **2 P2 (51 处死代码)**

**v1.56.0 死代码全扫**:

| 类别 | 数量 | 严重度 | 修法 |
|------|------|--------|------|
| 死 DICT key | 30 | P2 | 删或用上 (1.4) |
| 死 export function/const | 21 | P2 | 删 (1.5) |
| 死 export type/interface | 大量 (~150) | P3 | 内部用, 不修 |

**死 DICT key 类别 (30 个)**:
- nav.* 8 (Layout 硬编码)
- common.* 7 (早期预留)
- settings.* 4 (settings 硬编码)
- review.* 4 (早期命名空间)
- 其他 7

**死 export function 类别 (21 个)**:
- v0.14 跟读尝试遗物 (db.ts 3 个)
- v0.16 计划/日历重构遗物 (plan.ts 2 + learningCalendar.ts 2)
- v0.10 streak 重构遗物 (streak.ts 2)
- v0.6 skeleton 通用组件 (Skeleton.tsx 3 - 整个文件几乎 100% 死)
- 其他 v0.10-v0.18 8 个零碎

**维度 2 结论**: 51 处死代码 = 3 KB gzipped, 不是性能问题, 是**代码 smell**。如果 1 维护人月做死代码清理, DICT 砍 30 key, lib/ 砍 21 函数, 包大小 -2 KB, 信号清晰度大幅提升。

**主审查盲区**: big-review-v1.56.py 8 维度无"死代码"扫描。**建议加维度 9**。

---

### 维度 3: 静态 import 漏判 (防 verifier4 P1-B 回归)

**结论**: **1 P1 真问题** (useStore.ts:101)

**全扫 `import(...)` 模式 (v1.56.0)**:

```bash
$ grep -rn "import(.*)" src/ --include="*.ts" --include="*.tsx" | wc -l
47
```

47 处 import() 调用, 分类:

| 模式 | 数量 | 评价 |
|------|------|------|
| `lazy(() => import('...'))` (App.tsx 路由) | 25 | ✓ 标准 React 模式 |
| `await import('./db')` (learningReport.ts 4 处, wordTags.ts 2 处, Scenes.tsx) | 7 | ✓ 异步, 防循环依赖 |
| `await import('pdfjs-dist')` (pdfUpload.ts) | 3 | ✓ 异步, 大依赖延迟加载 |
| `await import('./reminderContent')` (reminder.ts) | 1 | ✓ 异步 |
| `await import('./providers/llm')` (translate.ts) | 1 | ✓ 异步 |
| `await import('blueimp-md5')` (translate.ts) | 1 | ✓ 异步, 第三方 |
| `await import('../lib/wordTags')` (Notebook.tsx) | 2 | ✓ 异步 |
| **`import('../lib/tts').then(m => m.stopSpeak())` (useStore.ts:101)** | 1 | ⚠️ **fire-and-forget, P1** |
| `import('../lib/phraseCards')` (CardReview.tsx 46, 类型位置) | 1 | ✓ 类型, 非运行时 |
| `importChats` / `importAll` (settings/*) | 2 | ✓ 业务函数名, 非 import() |
| `loadPdfJs` (内部函数) | 1 | ✓ 函数, 非 import() |

**P1 唯一**:
- `useStore.ts:101: import('../lib/tts').then(m => m.stopSpeak())`
  - **无 await, 无 .catch**
  - **外层 try-catch 只捕同步错误**
  - **Promise reject 漏到 unhandled**

**主审查盲区**:
- big-review-v1.56.py 维度 7 regex: `r"await import\(.*\)\.then\("` 
  - 要求 `await` 前缀
  - useStore 案例**无 await**, 漏报
- 应改为: `r"(?:await\s+)?import\s*\(.*\)\.then\s*\("`

**v1.48 verifier4 P1-B 背景**:
- 旧代码: `void import('./xpSystem').then(m => m.addXP(...))` (动态 addXP)
- v1.48 修: 静态 import xpSystem, 同步 addXP
- 当前 useStore.ts:101 是**同一类 fire-and-forget 模式**回归 (不同位置, 不同函数)

**维度 3 结论**: 47 处 import() 模式扫了 1 P1 (useStore), 加 1 个 P1 regex 修复。

---

### 维度 4: i18n useTranslate hook bug (跨组件同步)

**结论**: **0 bug, 0 race condition**

**useTranslate 行为分析 (v1.56.0)**:

```ts
// src/lib/useTranslate.ts (v1.56.0)
export function useTranslate() {
  const [locale, setLocaleState] = useState<Locale>(getLocale())  // 启动读 localStorage

  useEffect(() => {
    const handler = (e: Event) => {
      setLocaleState((e as CustomEvent<Locale>).detail)
    }
    window.addEventListener('locale-change', handler)
    return () => window.removeEventListener('locale-change', handler)  // 清理
  }, [])

  const t = useCallback((key: string) => translate(key, locale), [locale])  // 依赖 locale
  const changeLocale = useCallback((l: Locale) => {
    setLocale(l)         // 1. 改模块 currentLocale + 写 localStorage + dispatch 事件
    setLocaleState(l)    // 2. 改本组件 state
  }, [])

  return { t, locale, setLocale: changeLocale }
}
```

**locale 切换流程 (用户点 Settings → 选 en)**:
1. `setLocale('en')` 调 useTranslate.changeLocale
2. changeLocale 调 i18n.setLocale:
   - 改模块 `currentLocale = 'en'`
   - 写 `localStorage['app-locale'] = 'en'`
   - `window.dispatchEvent(new CustomEvent('locale-change', { detail: 'en' }))`
3. changeLocale 调 setLocaleState('en') (本地 useState)
4. **所有挂载 useTranslate 的组件**通过事件 listener 收到通知, 各自 setLocaleState → rerender
5. t() callback 因 locale 依赖重建, 后续调用返 en 翻译

**App.tsx 是否需要 rerender?**:
- App.tsx 不调 t(), 只渲染 `<Suspense>` + `<Routes>` + `<Layout>`
- App.tsx 不挂 useTranslate
- **不需要 rerender** — 因为 App 渲染的子组件 (Routes 下的页面) 各自挂 useTranslate, 各自 rerender

**多 useTranslate 实例同步**:
- 1 个 Settings page 调 setLocale('en')
- N 个其他页面挂 useTranslate, 通过 'locale-change' 事件**全同步** → N 个 setLocaleState
- React 18 自动 batch 多个 setState, 单次 rerender (efficiency)

**潜在 race 条件 (无)**:
- t() 是 useCallback, 依赖 locale, locale 变 → t 重建 → 下次 render 用新 t
- 没有 stale closure 风险 (useState 总是最新)
- 没有 async 竞态 (i18n.setLocale 是同步)

**潜在 edge case (无 bug, 已知)**:
- **跨 tab 不同步**: tab A 改语言, tab B 不会自动更新 (没有 `storage` 事件 listener)。 这是有意的 — PWA 不强求跨 tab 同步
- **first mount 时**: useState(getLocale()) 读 localStorage, 与 i18n.currentLocale (默认 'zh') 可能不一致。 但 getLocale() 是同步, 正确读, OK

**模块级 t() 默认参数风险**:
- `t(key)` 不传 locale → 用模块 `currentLocale`
- 唯一调 `t(key)` 不传 locale 的地方: `tests/i18n.test.ts` (测试显式传 'zh' 或 'en')
- 实际 src/ 没用 `t(key)` 不用 locale 的, 全是 useTranslate 闭包, OK

**维度 4 结论**: 0 bug, hook 设计正确, 跨组件同步靠 'locale-change' CustomEvent。

**主审查盲区**: 8 维度无 "useTranslate hook 行为" 测试覆盖。**建议加 useTranslate.test.ts** (见 1.6 P2-C)。

---

### 维度 5: 8 维度盲区 (加新维度)

**结论**: **4 个新维度可加** (死代码 / DICT key 引用 / 跨 tab 同步 / lazy chunk 监控)

**主审查 8 维度 (v1.56)**:
1. catch (e: any) — ✓ 0
2. setLoading 配对 — ✓ 21/21
3. as any 残留 — ✓ 17 (全豁免)
4. console.error/warn — ✓ 85 (全守卫)
5. 空 catch {} — ✓ 0
6. i18n 完整性 — ✓ 0 missing (DICT 完整)
7. fire-and-forget dynamic import — ✓ 0 (regex 漏 useStore 1 处)
8. 历史 review 修复 — ✓ 5/5

**盲区**:

| 新维度 | 检测内容 | 价值 | 实施成本 |
|--------|----------|------|----------|
| **9. 死代码扫描** | export function/const 0 引用; DICT key 0 t() 调用 | 高 (发现 51 处, 维度 2) | 1h Python 脚本 |
| **10. t() 跨页一致性** | 同一概念 (如 "历史") 用了 1 个 key, 没用另 1 个 | 高 (发现 AIChat/WritePage 2 回归) | 1h Python 脚本 |
| **11. lazy chunk 监控** | 每次 build 后 dist/assets/*.js 体积对比 | 中 (性能回归预警) | 30 min |
| **12. useTranslate hook 测试** | event-driven rerender, locale 跨实例同步 | 中 (silent bug 防护) | 1h (需 @testing-library/react, 违反零成本) |
| 13. 跨 tab 同步 (P3) | localStorage 事件监听 | 低 (PWA 一般不做) | 0 (默认不做) |

**verifier3 提的"升级 toast race condition"**:
- Toast 重复弹: 用户点 "导出" 2 次, 2 个 toast 同时出现, 各自 setTimeout
- 不会 race, 各自独立 id, filter no-op on missing
- 风险: 同一 message 重复弹 N 次, 用户视觉混乱
- **P3**: 加去重 (同 message 在 500ms 内只显示 1 次), 30 min

**verifier3 P2 候选 toast race**:
- 当前 Toast zustand 0 race (id 唯一, setTimeout 独立)
- nextId 起始 1, 单用户会话 < 1000, 不溢出
- **不修, 0 P2**

**维度 5 结论**: 主审查 8 维度够, 但**维度 6 (i18n 完整性) 应拆为 6a (DICT key 存在性) + 6b (t() 调用存在性) + 6c (DICT 死 key 警告) + 6d (同屏 t() 一致性)**, 加**维度 9 (死代码)**, 加**维度 11 (lazy chunk 监控)**。3 个新维度, ~3h 实施。

---

## 3. 累计 (v1.45 → v1.56 含 verifier 修)

| 来源 | 数量 | 内容 |
|------|------|------|
| v1.45 main review | 0 | 0 P0 + 0 P1 |
| v1.45 verifier1 | 2 | P1 i18n (CardReview 26 key) + P2 dead code |
| v1.45 verifier2 | 2 | P1-A addXP 同步 / P1-B getRecommendedWords fallback |
| v1.45 verifier3 | 1 | P1 PlanPage XP 进度条 width 错算 |
| v1.48 verifier4 | 2 + 1 | P1-B db.ts fire-and-forget / P1-C i18n 7 页面盲区 / P2-A addXP 静默 |
| v1.51 verifier5 | 1 | P1-B db.ts addXP quota |
| v1.52 verifier6 | 1 | P1 Notebook 漏修 |
| v1.52 verifier7 | 2 + 1 | P1-A AIChat history button / P1-B WritePage 我的作文 tab / P2-A CEFRLevel 命名 |
| v1.53 verifier9 | 2 + 2 | P1-A AIChat 回归 / P1-B WritePage 回归 / P2-A worddetail.back 死 key / P2-B initLocale 死代码 |
| v1.54 main | 0 | 0 P0 + 0 P1 |
| v1.55 main | 0 | 0 P0 + 0 P1 |
| **v1.56 verifier10 (本)** | **3 P1 + 4 P2** | **P1-A useStore fire-and-forget / P1-B AIChat 历史回归 / P1-C WritePage 我的作文回归 / P2-A 30 死 DICT key / P2-B 21 死函数 / P2-C useTranslate hook 0 测试** |

| 维度 | 评估 | bug |
|------|------|-----|
| 1 i18n 翻译质量 | ⚠️ 0 新 P0, 2 P1 回归 (历史) | 1.2, 1.3 |
| 2 死代码扫描 | ⚠️ 51 处死代码 | 1.4 (DICT), 1.5 (lib/) |
| 3 import 漏判 | ⚠️ 1 P1 fire-and-forget 漏报 | 1.1 |
| 4 useTranslate hook | ✓ 0 bug, hook 设计正确 | (P2-C 测试覆盖 gap) |
| 5 8 维度盲区 | - | 4 个新维度建议 |

---

## 4. 修法优先级

| 优先级 | Bug | 改动量 | 估时 | 建议 |
|--------|-----|--------|------|------|
| **P1-A** | useStore.ts:101 fire-and-forget | 1 行加 .catch | 1 min | **v1.57 hotfix** |
| **P1-B** | AIChat.tsx:475 历史按钮 | 1 行改 t() | 1 min | **v1.57 hotfix** |
| **P1-C** | WritePage.tsx:417 我的作文 | 1 行 DICT + 1 行 UI | 5 min | **v1.57 hotfix** |
| P2-A | 30 死 DICT key | 60 行删 或 Layout 集成 8 nav | 1h / 4h | 1 维护人月 |
| P2-B | 21 死函数 | 21 函数删 或标 @deprecated | 2h | 1 维护人月 |
| P2-C | useTranslate hook 测试 | 新 tests/useTranslate.test.ts | 1h | v1.58 |

**3 个 P1 共估 7 min 修**, **强烈建议 v1.57 hotfix 一并修**。

---

## 5. 验证

- tsc --noEmit: 0 错误 (主审查已确认, 本 verifier 仅静态读)
- vitest: 全部通过 (主审查已确认)
- 静态审查: `python3 scripts/big-review-v1.56.py` 跑过 0 P0, **但 1 P1 useStore 漏报 (regex 需更新)**
- 本 verifier 仅静态读, 无代码改动 (按约束)

**建议 v1.57 同步改 big-review-v1.56.py regex**:
```diff
- if re.search(r"await import\(.*\)\.then\(", line):
+ if re.search(r"(?:await\s+)?import\s*\(.*\)\.then\s*\(", line):
```

---

## 6. 总结

**v1.56.0 本身 0 新 P0/P1** (因为 src/ 无改动), 但**有 3 个真 P1 待修**:
- 2 个 v1.52 verifier7 / v1.53 verifier9 漏修的 P1 回归 (AIChat / WritePage)
- 1 个新的 useStore fire-and-forget 漏报 (verifier4 P1-B 模式重演)

**51 处死代码 (30 DICT + 21 lib 函数)**: 1 维护人月清理, 信号清晰度大幅提升。

**useTranslate hook 0 测试覆盖**: silent bug 风险, 建议加 tests/useTranslate.test.ts。

**主审查 8 维度盲区**: 维度 6 (i18n 完整性) 应拆 4 子维度, 加维度 9 (死代码), 加维度 11 (lazy chunk 监控)。

**3 个 P1 共 7 min 修**, 强烈建议 v1.57 hotfix 一并清。

---

**最后更新**: 2026-07-28 (W51 verifier10)
