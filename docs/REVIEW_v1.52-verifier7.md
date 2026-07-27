# v1.52.0 W47 — Verifier 7 独立 review (UI 集成 + 跨文件)

**日期**: 2026-07-27 (W47)
**版本**: v1.52.0 (commit 2d3298f)
**触发**: 第 8 次大 review — verifier7 独立验证
**目标**: 找主审查 + 历史 verifier 漏掉的真问题 (UI 集成 + 跨文件)
**评审范围**: 5 维度独立验证 + 总结
**评审方式**: 静态读 v1.52.0 commit `2d3298f` 源码 (git show 验证: v1.53+ WIP 修复不算)
**评审时间**: ~20 min

---

## 0. 背景

- v1.52.0 已 push, 主审查 0 P0 + 0 P1 (8 维度)
- 本 verifier 专注 4 新 i18n 页面 (AIChat/WritePage/Translate/Notebook) + 跨文件集成
- 评审时间 20 min, 静态读为主
- 约束: 不改 src/ 不拉 subagent 不 push

---

## 1. 找到的真 bug

### 1.1 P1-A: AIChat.tsx:475 历史按钮硬编码中文, 与 i18n-ed h2 不一致

**文件**: `src/pages/AIChat.tsx:475`
**引入版本**: v1.52.0 (W47 改 h2 用 t(), 但漏改 button)
**修法引用**: v1.52 DICT 新加 'aichat.history' = '历史对话 (N)'/'History (N)'

#### 现象

v1.52.0 commit 改 `t('aichat.history')` 的范围**只覆盖了 panel 内的 h2**, 但**触发该 panel 的 button 没改**:

```tsx
// AIChat.tsx:475 (v1.52.0, 未改)
<button onClick={() => setShowHistory(!showHistory)} ...>
  📚 历史 ({chats.length})           // ← 硬编码中文
</button>

// AIChat.tsx:568 (v1.52.0, 已改)
<h2 className="text-sm font-semibold">
  📚 {t('aichat.history').replace('N', String(chats.length))}  // ← i18n-ed
</h2>
```

#### 影响

- 切到 en: button 显示 "📚 历史 (5)" (中文), 点开 panel 显示 "📚 History (5)" (英文)
- **UI 不一致**: 同一概念 (历史对话数) 两种语言同时出现在一个面板切换中
- en 用户看到中文 button, 破坏 v1.52 i18n 目标的完整承诺
- 主审查脚本 `big-review-v1.52.py` 维度 4 (fire-and-forget 防回归) 找不到 — 因为不是 fire-and-forget, 是遗漏

#### 验证

```bash
$ git show 2d3298f -- src/pages/AIChat.tsx | grep "历史"
-          <h2 className="text-sm font-semibold">📚 历史对话 ({chats.length})</h2>
+          <h2 className="text-sm font-semibold">📚 {t('aichat.history').replace(...)</h2>
# 上面 diff 只显示 h2 改了, button 周围没出现
$ grep "历史" src/pages/AIChat.tsx
475:          📚 历史 ({chats.length})           # ← 这行没在 v1.52 diff 里出现, 说明原始就硬编码
```

#### 修法

```tsx
// AIChat.tsx:475
<button onClick={() => setShowHistory(!showHistory)} ...>
  📚 {t('aichat.history').replace('N', String(chats.length))}
</button>
```

---

### 1.2 P1-B: WritePage.tsx:417 历史 tab 按钮硬编码中文, 与 i18n-ed h1 不一致

**文件**: `src/pages/WritePage.tsx:417`
**引入版本**: v1.52.0 (W47 改 h1 用 t(), 但漏改 tab button)
**修法引用**: v1.52 DICT 新加 'write.title' = '写作批改'/'Writing'

#### 现象

v1.52.0 commit 改 `t('write.title')` 的范围**只覆盖了 page h1**, 但**tab "我的作文" 没改**:

```tsx
// WritePage.tsx:378 (v1.52.0, 已改)
<h1 className="text-2xl font-bold mb-1">✍️ {t('write.title')}</h1>

// WritePage.tsx:417 (v1.52.0, 未改)
<button onClick={() => setActiveTab('history')} ...>
  📚 我的作文 ({history.length})      // ← 硬编码中文
</button>
```

#### 影响

- 切到 en: 页面标题 "✍️ Writing" (英文), tab 按钮 "📚 我的作文 (3)" (中文)
- **UI 不一致**: 同一页面 标题英文 + tab 中文, 像翻译只做了一半
- en 用户看到 "我的作文" 不知道是干啥的
- v1.52 主审查说"0 P1"是因为 8 维度没有"部分 i18n 覆盖一致性"维度

#### 验证

```bash
$ git show 2d3298f -- src/pages/WritePage.tsx | grep "我的作文"
# (空, diff 里完全没出现这个字符串)
$ grep "我的作文" src/pages/WritePage.tsx
417:          📚 我的作文 ({history.length})         # ← v1.52 完全没碰
```

#### 修法

新增 DICT key:
```ts
// i18n.ts zh/en
'write.history_tab': '我的作文 (N)' / 'History (N)',
```

修 WritePage.tsx:417:
```tsx
<button onClick={() => setActiveTab('history')} ...>
  📚 {t('write.history_tab').replace('N', String(history.length))}
</button>
```

---

### 1.3 P2-A: CEFRLevel 类型同名异义 (aiChat.ts vs difficultyAdapter.ts)

**文件**: `src/lib/aiChat.ts:9` + `src/lib/difficultyAdapter.ts:76`
**影响版本**: v1.48 (introduced) → v1.52 (未修)
**严重度**: P2 (命名 smell, 暂无功能 bug, 但易误用)

#### 现象

两个文件**都导出 `type CEFRLevel`**, 但内容完全不同:

```ts
// src/lib/aiChat.ts:9
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'  // 真 CEFR 6 档

// src/lib/difficultyAdapter.ts:76
export type CEFRLevel = WordLevel  // 别名, 实际是学段 8 档 (primary/junior/...)
```

#### 影响

- `aiChat.ts CEFRLevel`: A1/A2/B1/B2/C1/C2 (chat 场景用)
- `difficultyAdapter.ts CEFRLevel`: primary/junior/senior/gaozhong/cet4/cet6/kaoyan/daily (推荐场景用)
- **完全不交集**: A1 ∉ WordLevel, primary ∉ CEFR 6 档
- TypeScript 不报错 (类型不交叉, 编译器认为 OK), 但语义错位
- 当前边界守住: AIChat.tsx 只 import aiChat.CEFRLevel, plan.ts 只 import difficultyAdapter.CEFRLevel
- **未来风险**: 哪天有人把 AIChat 接到 plan.ts 的 getRecommendedWords(), 编译过, 运行时空结果 (因为 DIFFICULTY_LADDER.indexOf('A1') === -1 → fallback 全部 level)

#### 验证

```bash
$ grep -n "CEFRLevel" src/lib/aiChat.ts
9:export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
$ grep -n "CEFRLevel" src/lib/difficultyAdapter.ts
76:export type CEFRLevel = WordLevel  // 别名
$ grep -n "import.*CEFRLevel" src/ -r
src/lib/chatRoles.ts:4:        // 来自 aiChat
src/lib/plan.ts:18:              // 来自 difficultyAdapter
src/pages/AIChat.tsx:6:          // 来自 aiChat
# 3 个 import 路径清晰, 没误用
```

#### 修法 (P2 暂不修, 留 W47 后续)

```ts
// difficultyAdapter.ts
export type CEFRLevel = WordLevel  // 旧
// → 改为:
export type DifficultyLevel = WordLevel  // 改名, 消除歧义

// plan.ts 改 import
import { ... type DifficultyLevel } from './difficultyAdapter'
```

或保留兼容:
```ts
// difficultyAdapter.ts
export type CEFRLevel = WordLevel  // 旧
// 加注释
/** @deprecated 别名, 用 DifficultyLevel 替代, 避免和 aiChat.ts CEFRLevel 冲突 */
```

---

## 2. 5 维度独立评估

### 维度 1: UI 渲染 bug

**结论**: 找到 2 P1 (见 1.1 / 1.2)

| 文件 | t() 调用 | N 替换 | 一致性 |
|------|---------|--------|--------|
| AIChat.tsx (2 t) | `aichat.title` / `aichat.history` | `.replace('N', String(chats.length))` ✓ | **L1 漏改 button** (1.1) |
| WritePage.tsx (3 t) | `write.title` / `write.corrected` / `write.errors` | `.replace('N', String(result.errors.length))` ✓ | **L1 漏改 history tab** (1.2) |
| Translate.tsx (1 t) | `translate.title` | 无 N 替换 | 一致性 OK, 其他页内文本硬编码 (符合 v1.52 计划) |
| Notebook.tsx (10 t, v1.49) | 10 keys 全部对齐 DICT | `.replace('N'/... )` 正确 | OK, v1.52 仅静态 import loadWords |

**细节**:
- `t('aichat.history')` DICT 值: zh='历史对话 (N)' / en='History (N)'
- `t('write.errors')` DICT 值: zh='错误清单 (N)' / en='Errors (N)'
- `t('notebook.count_summary')` 双 N 替换: `.replace('N', words).replace('M', due)` — 顺序 OK
- 测试 `i18nKeyCoverage.test.ts` 6 项全过, 113 DICT key × 2 locale 对称 ✓

---

### 维度 2: 跨文件集成 bug

**结论**: 0 P0/P1 (v1.48 plan.ts + v1.51 db.ts 静态 import addXP 都修了)

**已修验证**:

```ts
// plan.ts:16 (v1.48 修)
import { addXP, XP_REWARDS } from './xpSystem'  // ← 静态
// plan.ts:90-93
if (isNewCompletion) {
  void addXP(XP_REWARDS.LEARN, 'LEARN').catch((e: unknown) => {  // 同步
    const err = e instanceof Error ? e : new Error(String(e))
    console.warn('plan.ts: addXP 失败:', err.message)
  })
}

// db.ts:4 (v1.51 修)
import { addXP, XP_REWARDS } from './xpSystem'  // ← 静态
// db.ts:246
try { await addXP(XP_REWARDS.FAVORITE, 'FAVORITE') } catch (e) { ... }
```

**streak + XP 同显示**: Home.tsx 两个独立 card, 无跨文件调用链:
- streak card (line 290-330): getStreakWithMilestones() / getStreakMessage() / `home.streak_title`
- XP card (line 145-167): getXPState() / levelTitle / progress bar
- 不互相调用, 各自从 streak.ts / xpSystem.ts 拉数据 ✓

**streak XP 未发**: `XP_REWARDS.STREAK = 10` 定义, 但 grep 全文 0 处 `addXP(XP_REWARDS.STREAK, 'STREAK')` — P3 (dead code), 不影响功能

**locale-change 事件**: useTranslate 监听, setLocale 触发, 所有 useTranslate 组件 rerender ✓ (无跨组件 locale 不同步)

---

### 维度 3: i18n 上下文 bug

**结论**: 0 P0/P1

**验证 useTranslate 行为**:
```ts
// useTranslate.ts:7
const [locale, setLocaleState] = useState<Locale>(getLocale())  // 启动时读 localStorage

// useTranslate.ts:10-15
useEffect(() => {
  const handler = (e: Event) => {
    setLocaleState((e as CustomEvent<Locale>).detail)
  }
  window.addEventListener('locale-change', handler)
  return () => window.removeEventListener('locale-change', handler)
}, [])

// useTranslate.ts:17
const t = useCallback((key: string) => translate(key, locale), [locale])  // locale 变 → t 重建 → rerender
```

**locale 保留**:
- setLocale(l) 同步更新模块 `currentLocale` + localStorage + dispatch 事件
- 切 tab 不重置 (因为 locale 在 zustand store 外, 但 useTranslate 自己 useState 持有)
- **无 bug**

**i18n.ts:228 t() fallback**:
```ts
export function t(key: string, locale: Locale = currentLocale): string {
  return DICT[locale]?.[key] || DICT.zh[key] || key  // zh → en → 返 key
}
```
3 级 fallback 健壮 ✓

---

### 维度 4: 类型 strict 漏判

**结论**: 1 P2 (见 1.3), 0 P1

**plan.ts 静态 import 类型**:
```ts
// plan.ts:16
import { addXP, XP_REWARDS } from './xpSystem'
// plan.ts:90
void addXP(XP_REWARDS.LEARN, 'LEARN')  // type: (amount: number, reason: XPRewardReason) => Promise<AddXPResult>
```
类型对齐 ✓

**db.ts 静态 import 类型**:
```ts
// db.ts:4
import { addXP, XP_REWARDS } from './xpSystem'
// db.ts:246
await addXP(XP_REWARDS.FAVORITE, 'FAVORITE')  // type OK
```
类型对齐 ✓

**difficultyAdapter.ts CEFRLevel = WordLevel 别名**:
- `as WordLevel` / `as CEFRLevel` 互相转换不报错
- `levelToIndex('A1')` → DIFFICULTY_LADDER.indexOf('A1') = -1 → 返回 -1
- `indexToLevel(-1)` → Math.max(0, Math.min(7, -1)) = 0 → 'primary' (默认)
- **不抛错, 但语义错位** (A1 → primary 是巧合还是正确? 看不出意图)
- v1.43 测试 `tests/difficultyAdapter.test.ts` 通过, 但测试只测 WordLevel 边界

---

### 维度 5: 性能 / 包大小

**结论**: 0 P0/P1 (12K i18n chunk, 合理)

**实测 bundle**:
```bash
$ du -sh dist/assets/useTranslate-*.js
12K  dist/assets/useTranslate-CNOrdYcc.js
```
- 113 DICT key × 2 locale = 226 字符串 (~6KB 源, gzipped ~3KB)
- 12K minified 是含 react import + event listener 代码, 实际 DICT 约 6K
- **懒加载评估**: i18n 全 app 用, lazy 收益小 (useTranslate 是同步函数). 不建议改

**streak getDailyStats 性能**:
```ts
// streak.ts:14
const start = Date.now() - days * 24 * 60 * 60 * 1000
return await db.records.where('timestamp').above(start).toArray()  // 3650 天
```
getLongestStreak 走 3650 天 (10 年). 数据库扫描 — 在 home page mount 时调. **首次加载可能慢 100-200ms**, 但缓存后秒开. 不是 P0.

**Home.tsx 启动**:
- 4 useEffect 并行 (sentence/wordOfDay/streak/plan)
- 全部 Promise.all 内部 (Promise.all([favorites, records, errors, reviews, words]) 5 个 IDB 表)
- 合理, 无 P0/P1

---

## 3. 总结

| 维度 | 找到 | 说明 |
|------|------|------|
| 1 UI 渲染 | **2 P1** (1.1, 1.2) | i18n 漏改触发按钮 |
| 2 跨文件 | 0 P | v1.48/v1.51 已修 |
| 3 i18n 上下文 | 0 P | useTranslate + event OK |
| 4 类型 strict | 1 P2 (1.3) | CEFRLevel 同名异义 |
| 5 性能/包大小 | 0 P | 12K i18n chunk 合理 |
| **合计** | **2 P1 + 1 P2** | v1.52 主审查 0 P1 漏了 |

**v1.52.0 主审查盲点**:
- 8 维度扫 fire-and-forget / console.warn / dead code / 大文件变更, 但**没扫"同一概念中英混用"**
- v1.48 verifier4 P1-C 已警示"7 页面 0 useTranslate" — 但 v1.52 部分修复后又出现"i18n 漏改触发按钮"
- **建议 v1.53 加维度 9**: "t() 调用和硬编码中文一致率" (扫每个 i18n 页面, 同一概念不应同时出现中英)

**优先级**:
1. **P1-A** (1.1) — AIChat 历史 button 改 t('aichat.history'), 1 行, 必修
2. **P1-B** (1.2) — WritePage 加 'write.history_tab' key + tab 改 t(), 2 行, 必修
3. **P2-A** (1.3) — difficultyAdapter.ts CEFRLevel 改 DifficultyLevel, 跨文件 rename, 留 v1.54

**测试覆盖建议**:
- 现有 `i18nKeyCoverage.test.ts` 只扫 "DICT 完整性" 和 "5 页面有 useTranslate"
- 缺: "i18n 页面**硬编码中文数**应 = 0" (除 emoji/占位符)
- 写一个 `tests/i18nHardcodedZh.test.ts` (P2), 扫 i18n-ed 页面 (Notebook/WordList/WordDetail/ErrorsPage/ListenPage/AIChat/WritePage/Translate/Home/...), 找 4-8 字节的硬编码中文字符串
- 这能防 v1.52 这类"部分 i18n"漏网

---

## 4. 评审元数据

- 评审人: verifier7 (general worker)
- 评审时间: 2026-07-27 17:11-17:30 UTC (~20 min)
- 评审方法: 静态读 v1.52.0 commit `2d3298f` + git show 验证 + 维度独立评估
- 评审范围: 4 新 i18n 页面 + i18n.ts + useTranslate.ts + plan.ts + db.ts + xpSystem.ts + difficultyAdapter.ts + streak.ts + Home.tsx
- 验证工具: git show, grep, vitest (i18nKeyCoverage 6/6 ✓), bundle size 检查
- **不改 src/**: ✓ (静态读)
- **不拉 subagent**: ✓
- **不 push**: ✓
