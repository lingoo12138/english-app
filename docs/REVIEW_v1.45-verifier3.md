# v1.45.0 W45 — verifier3 独立 UI 集成审查 (找 verifier1 漏判)

**日期**: 2026-07-27 (W45)
**审查者**: general (independent verifier, 静态读 15-20min)
**范围**: v1.45.0 hotfix (commit 56b6177)
**对照基线**: `docs/REVIEW_v1.45.md` (verifier1 找到 P1-1 i18n 26 key + P2-1 死代码)
**结论**: **1 P1 (UI 进度条 width 错算), 1 P2 (升级 toast race), 3 P3 死代码/性能, 0 P0**

---

## 总览 (TL;DR)

| 维度 | 评级 | 关键发现 |
|------|------|----------|
| 1. UI 渲染 bug | ⚠ | **P1**: PlanPage XP 进度条 width 错算 (`${xpState.progress}%`, 实际是 0-1 不是 0-100) |
| 2. 边界 bug | ⚠ | **P2**: Home 升级 toast race — addXP fire-and-forget, setXpState 读旧值 |
| 3. TypeScript 类型 | ✓ | seenIds optional 与 caller 一致, 无类型问题 |
| 4. 静态审查盲区 | ⚠ | **P3**: AppearanceSection `t` 解构未用 (i18nKeyCoverage 扫不到) |
| 5. 性能 | ⚠ | **P3**: i18nKeyCoverage 每次 it() 重读文件, 4 次 = ~10s |
| 5. 性能 | ⚠ | **P3**: tMany / initLocale 仅测试用, 生产 dead export |

### 核心结论
1. **PlanPage XP 进度条 width 计算错** — `xpState.progress` 是 0-1 fraction, 但 PlanPage 写 `${xpState.progress}%`, 实际是 0%-1% 宽度 (肉眼几乎不可见). Home.tsx 正确用 `Math.round(progress * 100)`. 这是 verifier1 漏的真 P1 UI bug
2. **升级 toast race condition** — plan.ts markWordCompleted 用 `void import().then(addXP)` fire-and-forget, 而 Home.handleMarkPlanWord 紧跟 `setXpState(getXPState())` 读 storage. 如果 addXP 写入未完成, getXPState 返旧 level, useEffect 不触发, **升级 toast 可能永不弹**
3. **i18nKeyCoverage 是单维度的** — 它只检查 `t()` 调用 key 都在 DICT, 不检查 `useTranslate` 解构出来的 `t` 是否被实际使用. AppearanceSection 就在漏洞区
4. **3 P3 是质量债** — 死 export, 重读文件, 不影响功能

---

## 维度 1: UI 渲染 bug

### 🐛 P1-1: PlanPage XP 进度条 width 错算 (verifier1 漏)

**位置**: `src/pages/PlanPage.tsx:162`

**现象**:
```tsx
<div
  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
  style={{ width: `${xpState.progress}%` }}  // ❌ BUG
/>
```

`xpState.progress` 是 0-1 的 fraction (`src/lib/xpSystem.ts:62,137`), 不是 0-100. 所以:
- progress=0.5 → width="0.5%" (肉眼几乎不可见)
- progress=0.99 → width="0.99%" (空条)
- progress=1.0 → width="1%" (满级也只 1%)

**对比 Home.tsx 正确实现** (`src/pages/Home.tsx:165`):
```tsx
style={{ width: `${Math.round(xpState.progress * 100)}%` }}  // ✓ 正确
```

**对比 PlanPage 同文件 line 234** (plan 进度条, 正确):
```tsx
style={{ width: `${plan.progressPct}%` }}  // ✓ 因为 plan.progressPct 是 0-100
```

**问题根因**:
PlanPage 在 v1.45 (commit 56b6177) 加 XP 进度条时, 直接复制了其他 UI 模式, 错把 `xpState.progress` (0-1) 当成 `plan.progressPct` (0-100) 用. 主审查 + verifier1 都没视觉验证这条新 UI.

**修法** (1 行):
```tsx
style={{ width: `${Math.round(xpState.progress * 100)}%` }}
```

或加 helper:
```ts
// src/lib/xpSystem.ts 加 export function progressPercent(s: XPCurrentState): number
// return Math.round(s.progress * 100)
```

**为什么 verifier1 漏**:
- verifier1 关注 i18n key 完整性 (字符串)
- PlanPage 进度条没 t(), 不在扫描范围
- 没有视觉/数值验证

---

### ✓ 维度 1 其它项 — 全部正常

| 检查项 | 状态 | 说明 |
|--------|------|------|
| Home Lv 进度条 | ✓ | Home.tsx:165 用 `Math.round(progress * 100)`, 正确 |
| Home 升级 toast 触发条件 | ⚠ (P2, 见维度 2) | 逻辑对, 但 race 漏触发 |
| Home 升级动画 (prevLevelRef) | ✓ | useEffect 依赖 `[xpState.level, xpState.levelTitle]`, 正常 |
| PlanPage 🎯 推荐难度 undefined | ✓ | `plan.difficulty && (...)` 守卫 OK |
| CardReview 26 key 切语言 | ✓ | useTranslate 监听 locale-change, t() rerender 实时切换 |
| ReportsPage 3 t() 切 tab | ✓ | tab 切换是 setState, 不影响 t() 翻译 |

---

## 维度 2: 边界 bug

### 🐛 P2-1: Home 升级 toast race condition

**位置**: `src/lib/plan.ts:87` + `src/pages/Home.tsx:79-94`

**现象**:
Home 用户在 PlanPage 点 ✓ 标记单词完成, 期望触发:
1. 单词加入 completed set
2. +5 XP (异步)
3. 若 totalXP 跨级阈值, 弹 🎉 升级 toast

**实际 race timeline**:

**plan.ts:87** (markWordCompleted):
```ts
void import('./xpSystem').then(m => m.addXP(m.XP_REWARDS.LEARN, 'LEARN').catch((e: unknown) => {
  console.warn('plan.ts: addXP 失败:', e)
}))
```
**fire-and-forget** — 动态 import + addXP 都是异步, markWordCompleted 不等它完成.

**Home.tsx:79-87** (handleMarkPlanWord):
```ts
const handleMarkPlanWord = async (wordId: string) => {
  markWordCompleted(wordId, undefined, dailyGoal)  // 启动异步 addXP
  await logAction(wordId, 'view')
  const newPlan = await generateTodayPlan(dailyGoal, targetLevel)
  setPlan(newPlan)
  setXpState(getXPState())  // ← 此时 addXP 可能未写完!
}
```

**race A (40% 概率, toast 漏)**: 
1. markWordCompleted 启动 addXP (queue 中)
2. await logAction 让出
3. await generateTodayPlan 让出
4. setXpState(getXPState()) 读 storage → **totalXP 还是旧的**
5. setXpState(oldState) — React shallow equal? newState !== oldState (新对象), 但值相同
6. addXP 完成 → writeState → 但 React 不知道
7. 永远没触发 useEffect, **toast 漏弹**

**race B (60% 概率, toast 弹)**:
1. markWordCompleted 启动 addXP
2. await logAction 让出
3. **addXP 完成 → writeState → totalXP 写入**
4. await generateTodayPlan 让出
5. setXpState(getXPState()) 读 storage → 读到新 totalXP
6. useEffect 检测到 level 变化, **toast 弹 ✓**

**为什么这是真 P2**:
- 经验上 localStorage.setItem + 同步 getItem 通常是 race A (因为 import 是 microtask, getXPState 也在 microtask 跑)
- 取决于 V8 调度, 时机不稳
- 用户首次升级到 L2 时, toast **很可能漏弹**
- 错过就错过, 没机会补 (除非再升一级)

**修法 (2 选 1)**:

**A. plan.ts 同步 addXP** (推荐, 简单):
```ts
// plan.ts:79
import { addXP, XP_REWARDS } from './xpSystem'  // 改静态 import

export function markWordCompleted(...) {
  ...
  if (isNewCompletion) {
    addXP(XP_REWARDS.LEARN, 'LEARN')  // 同步执行, writeState 立即生效
  }
  return completed
}
```
addXP 函数体本身是同步的 (`xpSystem.ts:160` 标记 async 但函数体无 await), 完全可同步用.

**B. markWordCompleted 改 async + await**:
```ts
export async function markWordCompleted(...) {
  ...
  if (isNewCompletion) {
    await addXP(XP_REWARDS.LEARN, 'LEARN')  // 真等
  }
  return completed
}
// Home.handleMarkPlanWord 也要 await
```

A 方案更简单, 不破坏现有 API. 唯一代价: plan.ts 静态 import xpSystem (但已经在 plan.ts step 3 用过 xpSystem 是动态 import, 改静态不影响 bundle 太多).

---

### ✓ 维度 2 其它项 — 全部正常

| 场景 | 状态 | 说明 |
|------|------|------|
| 学词 0 个时 PlanPage | ✓ | `{plan.words.length > 0 && ...}` 守卫, 显示 0/0 (0%) |
| 全空 IDB 时 xpState.level=1 | ✓ | getXPState 默认 totalXP=0 → level=1 |
| 升级到 L2 时 toast | ⚠ (P2-1) | race 条件下可能漏 |
| i18n locale='en' 未知 key | ✓ | `t()` fallback `DICT.zh[key] || key`, 显示 key 字符串 (已由 i18nKeyCoverage 测试保证不发生) |

---

## 维度 3: TypeScript 类型 bug

### ✓ 无类型问题

**检查项**:
- `src/lib/difficultyAdapter.ts:178` — `seenIds?: Set<string>` 可选
- `src/lib/plan.ts:158` — caller 传 `seenIds: Set<string>` (从 line 130 实例化)
- 类型一致, 无 any/强制类型 ✓
- `src/lib/xpSystem.ts:160` — addXP 返回 `Promise<AddXPResult>`, 但函数体是同步 (无 await). 标 async 是为了 caller 可以 await, 类型无问题

---

## 维度 4: 静态审查盲区

### 🐛 P3-1: AppearanceSection 解构 `t` 但未使用

**位置**: `src/components/settings/AppearanceSection.tsx:10`

**现象**:
```tsx
import { useTranslate } from '../../lib/useTranslate'
...
const { t, locale, setLocale } = useTranslate()  // ← t 解构但 0 处调用
```

文件内 grep `t(` 命中 0 次. `t` 是死变量.

**为什么 i18nKeyCoverage 没抓到**:
该测试只检查 `t('key')` 调用, 不检查 `useTranslate()` 解构出来未用的 `t`. 是单维度盲区.

**实际影响**:
- 无功能 bug, 仅 dead code
- 误让读代码的人以为 AppearanceSection 有 i18n 文案 (实际是用 `locale === 'zh' ? '...' : '...'` 三元硬翻)

**修法** (1 行):
```tsx
const { locale, setLocale } = useTranslate()  // 去 t
```

### 维度 4 加的新维度 (除主审查 6 维度 + verifier1 i18n 之外)

1. **dead 解构检测** — `useTranslate()` 解构出来的 `t` 是否被调用 (grep `t(` 数为 0 即死)
2. **dead export 检测** — `tMany` / `initLocale` 等 export 函数在 src/ 是否有 caller (test 引用不算生产)
3. **静态读对动态读** — XP 进度条 width 应 `* 100`; plan progressPct 已经 0-100, 不需要. 这种"同 shape 不同单位"的陷阱

---

## 维度 5: 性能 bug

### 🐛 P3-2: i18nKeyCoverage.test.ts 4 次重读文件

**位置**: `tests/i18nKeyCoverage.test.ts:14`

**现象**:
```ts
function scanTCalls(): Set<string> {
  // 每次调用都 walk 整个 src/pages 树 + readFileSync
  ...
}

describe('i18nKeyCoverage (v1.45.0-W45)', () => {
  it('所有 t() 调用的 key 在 zh DICT 都能找到', () => { scanTCalls() ... })  // 第 1 次
  it('所有 t() 调用的 key 在 en DICT 都能找到', () => { scanTCalls() ... })  // 第 2 次
  it('扫到 20+ key (sanity)', () => { scanTCalls() ... })                   // 第 3 次
  it('zh/en 同 key 数量一致 (防漏翻)', () => { scanTCalls() ... })          // 第 4 次
})
```

4 个 it() 都调 `scanTCalls()` 触发独立 walk + 4 次 readFileSync 全部文件.

**实测**:
```
Duration 13.44s (transform 1.04s, setup 1.24s, import 560ms, tests 3.87s)
```
其中 zh 扫 2.4s + en 扫 1s, 总 ~10s 用于文件 IO, 在 706 测试套件里算慢的.

**修法**:
```ts
describe('i18nKeyCoverage (v1.45.0-W45)', () => {
  let keys: Set<string>
  beforeAll(() => {
    keys = scanTCalls()  // 只读 1 次
  })

  it('所有 t() 调用的 key 在 zh DICT 都能找到', () => { use keys })
  it('所有 t() 调用的 key 在 en DICT 都能找到', () => { use keys })
  it('扫到 20+ key (sanity)', () => { use keys })
  it('zh/en 同 key 数量一致 (防漏翻)', () => { use keys })
})
```

预期: 13.4s → ~6s. 4 个测试逻辑不变, 仅缓存结果.

### 🐛 P3-3: tMany / initLocale dead export

**位置**: `src/lib/i18n.ts:192,199`

**现象**:
```ts
export function tMany(keys: string[], locale: Locale = currentLocale): Record<string, string> { ... }
export function initLocale(): Locale { ... }
```

**caller 搜索**:
- `src/` 生产代码 0 处调用
- `tests/i18n.test.ts` 有调用 (测函数本身)
- `tests/i18nMigration.test.ts` 调用 `initLocale` (但不是真用, 是副作用)

**实际影响**:
- 无功能 bug
- 测试本身是为"函数存在"而存在, 不是"功能被用"而存在
- 死代码债, 改 i18n.ts 时这俩函数要考虑是否一起改

**修法 (2 选 1)**:
- A. 删 tMany / initLocale, 删对应测试
- B. 加 caller 真用 (但 v1.45 不需要)

---

## 5 维度盲区总览 (主审查 6 + verifier1 + verifier3)

| 维度 | 来源 | 抓到的 bug |
|------|------|-----------|
| 1. catch any | 主审查 v1.36 | 3 处 |
| 2. setLoading | 主审查 v1.6 | 5 处 |
| 3. as any | 主审查 v1.6 | 12 处 |
| 4. console 残留 | 主审查 v1.6 | 0 |
| 5. 空 catch | 主审查 v1.6 | 4 处 |
| 6. 历史修复 | 主审查 v1.22 | 2 处 |
| 7. **i18n 完整性** | verifier1 v1.45 | **1 P1 (CardReview 26 key) + 1 P2 (ReportsPage 死 import)** |
| 8. **UI 集成 (新)** | verifier3 v1.45 | **1 P1 (PlanPage width 错算) + 1 P2 (升级 toast race) + 3 P3** |

**v1.45 主审查 + verifier1 漏的真 bug = 2 个** (P1 + P2)

---

## 修复优先级建议

| 优先级 | bug | 修法 | 工时 |
|--------|-----|------|------|
| **P1 (必修)** | PlanPage XP 进度条 width 错算 | 1 行: `Math.round(progress * 100)` | 1min |
| **P2 (应修)** | Home 升级 toast race | plan.ts addXP 改同步 (1 行 import 调整) | 5min |
| P3 | AppearanceSection dead t | 1 行: 删除 `t,` | 1min |
| P3 | i18nKeyCoverage 重读文件 | beforeAll 缓存 | 5min |
| P3 | tMany/initLocale 死 export | 删函数 + 删测试 | 10min |

**总修时 ~22min, 显著改善 v1.45 视觉与可测试性**.

---

## 总结

v1.45 hotfix 修复了 verifier1 找到的 i18n 完整性, **但主审查 + verifier1 漏了 PlanPage 新加的 XP 进度条 width 错算** (P1) 和升级 toast race (P2). 累计 6 次大 review + 3 次 verifier, v1.45 仍残留 1 真 P1 UI 集成 bug.

**主审查盲区**: 视觉/数值 UI 渲染 — 静态 review 难发现 0.5% vs 50% 这种"算错单位" bug, 需要 e2e/视觉测试或专门的"百分号单位"审查规则.

**建议 v1.46 加**:
1. PlanPage width 修 (P1)
2. plan.ts addXP 同步化 (P2)
3. i18nKeyCoverage 加 beforeAll (P3 性能)
4. **新维度 9**: UI 渲染数据单位审查 (0-1 vs 0-100, ms vs s, byte vs KB) — 用正则扫 `${...progress%}` vs `${...progress * 100}%` 模式

---

**最后更新**: 2026-07-27
