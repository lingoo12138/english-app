# v1.45.0 W45 第 7 次大 review — Verifier 2 报告

**日期**: 2026-07-27 (W45, 独立 verifier 2)
**版本**: v1.45.0 (主审查 + verifier1 后独立复审)
**目的**: 找主审查 + verifier1 漏掉的真问题
**结论**: **找到 2 个 P1 (新) + 1 个 P2 (新)**, verifier1 找到的 2 个已修, 但漏判了 3 个真问题

---

## TL;DR

| # | 严重度 | 位置 | 简述 | 来源 |
|---|--------|------|------|------|
| **P1-A** | **P1** | `src/lib/plan.ts:84-87` × `src/pages/Home.tsx:85` × `src/pages/PlanPage.tsx:131` | **addXP 异步竞争 — XP 永远显示旧值, 升级 toast 不弹** — `markWordCompleted` 用 `void import().then(addXP)` fire-and-forget, `getXPState()` 同步读, 读的是 microtask 之前的旧 localStorage | v1.43 W43-B 引入, v1.45 未修 |
| **P1-B** | **P1** | `src/lib/plan.ts:135-150` | **getRecommendedWords 空结果无 fallback — A1 等级用户拿到空 plan** — 真实 words.json 中无 difficulty=1 (5334 词全是 2-5), 加上 A1 新手 + targetLevel='gaozhong' 时 plan 完全空 | v1.43 W43-A 引入, v1.45 未修 |
| **P2-A** | **P2** | `src/components/settings/AppearanceSection.tsx:5,10` | **`useTranslate` 解构 `t` 但 0 处调用 (死代码)** — 跟 ReportsPage v1.43 P2-1 模式一样, **i18nKeyCoverage 测试只扫 src/pages/ 漏掉 components/** | 跨目录盲区, v1.45 测试覆盖不全 |

### 累计 verifier 找到的真 bug (v1.36 → v1.45)

| 版本 | verifier 找到 | 主审查漏判 |
|------|--------------|-----------|
| v1.36 | 3 (2 P1 漏修 + 1 死代码) | 3 |
| v1.39 | 2 (1 P1 + 1 P2 verifier3) | 2 |
| **v1.45 verifier1** | 2 (P1 i18n + P2 死代码) | 2 |
| **v1.45 verifier2 (本次)** | **3 (P1×2 + P2×1)** | **3** |
| **累计** | **10 处真 bug** 由 verifier 找到, 主审查 6 维度均漏判 |

---

## P1-A: addXP 异步竞争 — XP 永远显示旧值 (新 P1, v1.43 漏修)

### 现象
用户标记一个词为"今日完成"后, Home 和 PlanPage 上的 Lv.X 数字和 XP 进度条 **永远不更新** (除非刷新页面). 跨级升级时, "🎉 升级到 Lv.X" toast **永不弹出**.

### 根因 (3 处串行 bug)

#### Bug 1: `markWordCompleted` 用 fire-and-forget addXP
`src/lib/plan.ts:84-87`:
```javascript
// v1.43.0 W43-B: 学词 +5 XP (仅新完成时, 防止重复)
if (isNewCompletion) {
  void import('./xpSystem').then(m => m.addXP(m.XP_REWARDS.LEARN, 'LEARN').catch((e: unknown) => {
    console.warn('plan.ts: addXP 失败:', e)
  }))
}
```

`void import('./xpSystem').then(m => m.addXP(...))` 是 **microtask 异步**, 不会被 await. `markWordCompleted` 是同步函数, 立刻返回. 调用方不知道 addXP 何时完成.

#### Bug 2: `Home.tsx` 同步读陈旧 XP
`src/pages/Home.tsx:79-86`:
```javascript
const handleMarkPlanWord = async (wordId: string) => {
  markWordCompleted(wordId, undefined, dailyGoal)  // 同步返回, addXP 还在 microtask
  await logAction(wordId, 'view')
  const newPlan = await generateTodayPlan(dailyGoal, targetLevel)
  setPlan(newPlan)
  // v1.43.0 W43-B: 刷新 XP 状态 (addXP 由 plan.ts markWordCompleted 内部触发)
  setXpState(getXPState())  // ← 同步读, 读的是 microtask 之前的旧 localStorage
}
```

`setXpState(getXPState())` 是同步调用. 此时 addXP microtask **还没跑完**, localStorage 还是旧 XP. setXpState 写入旧值, React 重渲染时 UI 显示旧 XP.

#### Bug 3: `PlanPage.tsx` 根本不调 setXpState
`src/pages/PlanPage.tsx:130-133`:
```javascript
const handleMark = async (wordId: string) => {
  markWordCompleted(wordId, undefined, dailyGoal)  // 同步返回, addXP 还在 microtask
  await refresh()  // refresh() 只 setPlan, 不 setXpState
}
```

PlanPage **完全没有 setXpState 调用**. 永远卡在初始值 (useState lazy init 时的 XP). 直到刷新页面.

### 验证 (运行时复现)

写了 `/tmp/race-test2.mjs` 模拟 microtask 顺序:
```
Initial:                { totalXP: 0, level: 1 }
setXpState 立即调用:    { totalXP: 0, level: 1 }  ← 读的是旧值
addXP microtask 完成后: { totalXP: 5, level: 1 }  ← localStorage 已更新, 但 UI 没刷新
```

UI 显示永远停在 L1/0 XP, 即使 localStorage 已经是 5 XP.

### 影响范围
- **Home.tsx**: Lv.X 卡永远不刷新, 升级 toast 永不弹
- **PlanPage.tsx**: Lv.X 永远停在初次打开页面的值, 升级 toast 永不弹
- **CardReview.tsx**: 同 v1.43 W43-B, 但 review 完成后不刷新 XP (因 CardReview 是不同页面, 切回 Home 时 useState lazy init 才会重读)

### 严重度判定
- **P1**: 用户每天学 10 词, 5-7 天后理应升 L2 (50 XP). 但 UI 一直显示 L1, 用户以为没进度, **违反北极星 "学得会"** (看不到成长反馈).
- 修法简单 (10 min), ROI 高.

### 主审查 + verifier1 漏判原因
- 6 维度扫: catch any / setLoading / as any / console / 空 catch / 历史修复 — **没覆盖 async 竞争条件**
- 单元测试: `tests/xpSystem.test.ts` 单独测 addXP 用 `await addXP(...)`, 跟实际 plan.ts 的 `void import().then()` 用法不一致
- 集成测试: 没有 `markWordCompleted → addXP` 的端到端测试, 没人发现 microtask 时序问题

### 推荐修法 (3 选 1, 推荐 A)

**方案 A** (推荐): `markWordCompleted` 改为 async, 返回 Promise, Home/PlanPage await 后再 setXpState:
```typescript
// plan.ts
export async function markWordCompleted(wordId: string, date?: string, goal?: number): Promise<Set<string>> {
  // ... 原有逻辑 ...
  if (isNewCompletion) {
    const { addXP, XP_REWARDS } = await import('./xpSystem')
    await addXP(XP_REWARDS.LEARN, 'LEARN').catch((e: unknown) => {
      console.warn('plan.ts: addXP 失败:', e)
    })
  }
  return completed
}

// Home.tsx
const handleMarkPlanWord = async (wordId: string) => {
  await markWordCompleted(wordId, undefined, dailyGoal)  // ← await
  // ... addXP 已完成
  setXpState(getXPState())  // 读到新 XP
}

// PlanPage.tsx
const handleMark = async (wordId: string) => {
  await markWordCompleted(wordId, undefined, dailyGoal)  // ← await
  setXpState(getXPState())  // ← 补上, 现在没有
  await refresh()
}
```

**方案 B**: 在 `markWordCompleted` 末尾直接同步调用 `getXPState()` 写到 localStorage, 调用方读自己传的 callback:
```typescript
if (isNewCompletion) {
  void import('./xpSystem').then(m => m.addXP(...)).then(() => {
    // 触发 storage 事件
    window.dispatchEvent(new StorageEvent('storage', { key: 'xp-state-v1' }))
  })
}
```

不推荐, 复杂且依赖事件机制.

**方案 C**: 加 `xpBus` event emitter, addXP 完成后广播 `XP_CHANGED` 事件, Home/PlanPage 监听.

不推荐, 增加耦合.

### 配套测试 (建议加)
```typescript
// tests/plan-xp-integration.test.ts
it('markWordCompleted 后 getXPState 立即反映新 XP', async () => {
  resetXP()
  await markWordCompleted('w-1', '2026-07-27', 10)  // ← 用 await
  // 不应该再需要 setTimeout 等 microtask
  const s = getXPState()
  expect(s.totalXP).toBe(5)
  expect(s.level).toBe(1)
})
```

---

## P1-B: getRecommendedWords 空结果无 fallback (新 P1, v1.43 漏修)

### 现象
新用户 + targetLevel='gaozhong' (高中) + 累计学词 ≥5 + 错词率 0 + 掌握率 0 + 最近 14 天 view 5 个 difficulty=1 词:
- `analyzeUserPerformance.currentLevel = 'A1'`
- `getAdaptiveLevel`: 错词率不超 30%, 掌握率不超 80%, 维持 'A1'
- `getRecommendedWords('A1', 20, seenIds={})`:
  - targetIdx=0
  - levelOrder = ['A1'] (无 -1)
  - 同 level 过滤: `difficultyToCEFR(w.difficulty) === 'A1'`
  - **真实 words.json 中无 difficulty=1 的词** (5334 词全部 difficulty 2-5)
  - 返回 `[]`
- `recommended = []`
- `w.level === 'gaozhong'` 过滤后: 仍 `[]`
- `candidates.push({ word: w, source: 'new' })`: 0 个
- `plan.words = []`, `plan.completed = 0`, `plan.total = 0`, `progressPct = 0`

用户看到 "今日计划: 0/0 词 (0%)", **没有任何可学内容**.

### 验证 (查真实数据)
```bash
$ python3 -c "
import json
from collections import Counter
data = json.load(open('public/data/words.json'))
print('Total:', len(data))
print('Difficulty:', Counter(w.get('difficulty') for w in data))
"
# Total: 5334
# Difficulty: Counter({2: 1024, 3: 1680, 4: 1442, 5: 1188})
#                                  ↑↑↑↑ 无 1
```

difficulty 1 → A1, 但生产数据无 difficulty=1. A1 永远拿不到词.

### 影响范围
- **新用户** (无历史数据) + `targetLevel='gaozhong'/'cet4'/'cet6'/'kaoyan'` + 累计学词 ≥5
  - 注: 无历史数据时 currentLevel='A2' (默认), 所以默认 targetLevel 不会触发
  - 但如果用户**有 5 个 view 记录全部是某 A1 词** (错词率 0, 掌握率 0), currentLevel 仍是 'A1'
- 此时 step 1 (review due) 可能救场, step 2 (favorites) 可能救场, 但 step 3 直接 0
- **新用户 + 无收藏 + 无 due + gaozhong 选** 组合必中

### 主审查 + verifier1 漏判原因
- 单元测试 `tests/difficultyAdapter.test.ts` mock 数据有 difficulty=1 (w-a1-1 ~ w-a1-7), 测不出生产数据无 difficulty=1 的现实
- `plan.ts:130-135` 的 try 块没 fallback, 只 catch 块有 (catch 块降级为字母序):
  ```javascript
  try {
    adaptiveLevel = await getAdaptiveLevel()
    recommended = await getRecommendedWords(adaptiveLevel, dailyGoal * 2, seenIds)
  } catch (e) {
    // ← 只 catch, 正常空结果没处理
    recommended = allWords.filter(w => !seenIds.has(w.id)).filter(...)
  }
  ```

### 严重度判定
- **P1**: 用户每日 0 词可学, 违反北极星 "内容能用" (没有可学内容)
- 但实际 99% 用户会先有 favorites 或 due reviews, 触发概率低
- 修法简单 (5 min)

### 推荐修法 (推荐 A)

**方案 A** (推荐): try 块内增加空结果 fallback:
```typescript
try {
  adaptiveLevel = await getAdaptiveLevel()
  recommended = await getRecommendedWords(adaptiveLevel, dailyGoal * 2, seenIds)
  // 新增: 空结果 fallback
  if (recommended.length === 0) {
    recommended = allWords
      .filter(w => !seenIds.has(w.id))
      .filter(w => targetLevel === 'all' || w.level === targetLevel)
  }
} catch (e) {
  // 保留原 catch fallback
  ...
}
```

**方案 B** (根本修): 扩 `DIFFICULTY_TO_CEFR` 加上 `0 → 'A1'` 让所有 difficulty 都映射到 CEFR, 或扩 difficulty 范围到 1-6 (1=A1, 6=C2). 但改生产数据 risk 大, 不推荐.

### 配套测试
```typescript
// tests/plan.test.ts 加
it('getRecommendedWords 空结果时 fallback 到 targetLevel 全集', async () => {
  // mock 一个场景: targetLevel='gaozhong' + 全是 cet4 difficulty=2
  const plan = await generateTodayPlan(5, 'gaozhong')
  expect(plan.words.length).toBeGreaterThan(0)  // 不应该是 0
})
```

---

## P2-A: AppearanceSection.tsx 死代码 (新 P2, 测试盲区)

### 现象
`src/components/settings/AppearanceSection.tsx:5,10`:
```typescript
import { useTranslate } from '../../lib/useTranslate'
// ...
const { t, locale, setLocale } = useTranslate()  // ← t 解构了
// ... 文件里 0 处 t(...) 调用
// 全部用硬编码中文: '🎨 外观', '主题色', '字号', '暗色模式', '晚上学习更护眼' 等
```

跟 v1.43 verifier1 找到的 P2-1 (ReportsPage) 模式一样. **`useTranslate` 解构了 `t` 但完全没用**, 是死代码.

### 严重度判定
- **P2**: 不影响功能 (界面全中文硬编码, 工作正常). 但反映 v1.41 W41 i18n 集成的尾巴没收
- 修法 2 选 1:
  - A) 删 useTranslate import + 解构 (回归 v1.40 状态)
  - B) 把 5+ 硬编码中文改成 t() 调用 + 加 5+ DICT key

### 主审查 + verifier1 漏判原因
- **i18nKeyCoverage 测试只扫 `src/pages/`, 不扫 `src/components/`** — 这是 v1.45.0 引入测试时的设计缺陷
- 测试只 catch `t(...)` 调用的 key 缺失, 不会 catch `useTranslate` 解构但 0 调用的情况 (因为根本没 t() 调用产生)

### 推荐修法
**短期** (推荐): 修测试 — 扩 `tests/i18nKeyCoverage.test.ts` 扫 `src/components/**/*.tsx`:
```typescript
function scanTCalls(): Set<string> {
  const result = new Set<string>()
  for (const dir of ['src/pages', 'src/components']) {
    // ... 现有 walk 逻辑
  }
  return result
}
```

**长期** (P2 累积后): 加 `tests/i18nCompleteness.test.ts` 检测:
- 所有 `useTranslate` 导入必须配 ≥1 处 `t(...)` 调用
- 所有 `<html lang>` + 大量硬编码中文 页面必须配 i18n

### 附带发现 (P3)
- `src/components/settings/CustomForms.tsx` 类似问题, `useTranslate` 导入但 0 调用
- `src/components/InstallPrompt.tsx` 等组件也无 i18n
- 整体 i18n 覆盖率约 30% (3/25 页面), 是 v1.41 W41 留下的尾巴

---

## 5 维度独立评估

### 维度 1: i18n 完整性
- **DICT zh/en 完整**: ✓ 33 个 key 全部覆盖 (测试已验证)
- **遗漏的死代码** (P2-A): 1 处 (AppearanceSection)
- **遗漏的低覆盖** (P3): CustomForms / InstallPrompt 等组件
- **测试盲区**: i18nKeyCoverage 只扫 pages/ 不扫 components/
- **发现**: P2-A

### 维度 2: 测试盲区
- `tests/i18nKeyCoverage.test.ts` (4 测试): **只扫 pages/ 不扫 components/**, 漏 P2-A
- `tests/difficultyAdapter.test.ts` (17 测试): **mock 数据有 difficulty=1**, 漏生产数据无 difficulty=1 的现实, 漏 P1-B
- `tests/xpSystem.test.ts` (22 测试): **单独测 addXP 用 await**, 漏 P1-A 的 fire-and-forget 用法
- `tests/plan.test.ts` (15 测试): **没测 markWordCompleted → addXP 集成**, 漏 P1-A
- **发现**: P1-A, P1-B, P2-A (通过盲区找到)

### 维度 3: 集成 bug
| 假设 | 验证结果 |
|------|---------|
| `getRecommendedWords` + `targetLevel='all'` 不工作 | ✓ 正常 (二次 filter 正确通过所有词) |
| Home.tsx xpState useState 默认 + useEffect setValue 丢失 | ❌ 正常 (lazy init 只跑一次, setXpState 每次 mark 重新读) |
| PlanPage difficulty 标签 plan 加载前不显示 | ✓ 正常 (加载中显示加载状态, 加载后显示标签) |
| `addXP` 异步竞争 (P1-A) | ✅ **真 bug** — mark 同步 + addXP microtask + getXPState 同步读 |
| `getRecommendedWords` 空结果 (P1-B) | ✅ **真 bug** — try 块没 fallback, catch 块才有 |
| **发现**: P1-A, P1-B |

### 维度 4: 跨文件 bug
- CardReview 26 t() key: ✓ v1.45 已修 (DICT 加 52 key, 测试覆盖)
- ReportsPage 3 t() 调用: ✓ v1.45 已修 (DICT 加 6 key, ReportsPage 改 3 处)
- **Home/PlanPage XP 状态一致性** (P1-A): ❌ PlanPage **不调 setXpState** (漏修)
- **i18n 在 components/ 死代码** (P2-A): ❌ 主审查 + verifier1 没看 components/
- **发现**: P1-A, P2-A

### 维度 5: catch any / setLoading / as any / console / 空 catch / 历史修复
- 0 catch (e: any): ✓ 维持 (v1.22 + v1.36 双 review)
- 0 setLoading 漏掉: ✓ 维持
- **17 as any 残留**: 7 浏览器 API quirks (legit), 10 type literal narrowing (待审)
  - `db.ts:224` 的 `e as any` 应该改成 `e: unknown` + Error 守卫 (P3, 不是 P1)
  - 其余 9 处 type literal (AIChat/WritePage/PreferencesSection/learnReport/chatRoles) 是 type narrowing, 改用 `as 'a' | 'b'` 更精确
- 85 console.error/warn: 14 处 v1.23-v1.43 新增, 全部 catch 守卫
- 0 空 catch: ✓ 维持
- **type literal as any 豁免理由**: 大多合法 (type narrowing), 但应改用更精确的 cast
- **发现**: 0 P0/P1/P2 (此维度无新问题)

---

## 6 维度盲区扩展建议

主审查的 6 维度已覆盖大部分问题, 但漏掉了关键的几类:

| 维度 | 状态 | 应加的检查 |
|------|------|------------|
| 1. catch (e: any) | ✓ | - |
| 2. setLoading | ✓ | - |
| 3. as any | ✓ | - |
| 4. console | ✓ | - |
| 5. 空 catch | ✓ | - |
| 6. 历史修复 | ✓ | - |
| **7. async 竞争条件** | ✗ 缺 | 扫 `void import(` / `setTimeout` / 跨 await 的 state 读 |
| **8. 空结果 fallback** | ✗ 缺 | 扫 `recommended.length === 0` 之类检查 |
| **9. 死代码 (跨目录)** | ✗ 缺 | `useTranslate` 解构但 0 调用, `import` 但 0 引用 |
| **10. 跨文件 UI 一致性** | ✗ 缺 | 同一概念在 2+ 文件实现, 行为必须一致 (例: Home/PlanPage 都 mark word, 都应刷 XP) |

下次大 review 加 7-10 维度 (类似 v1.45 加 7 维度 i18n 完整性).

---

## 推荐优先级

| 优先级 | 项 | 工作量 | 收益 |
|--------|----|--------|------|
| **P1** | 修 P1-A (markWordCompleted 改 async, Home/PlanPage await + setXpState) | 15 min | 高 (用户每天看不到 XP 成长) |
| **P1** | 修 P1-B (getRecommendedWords 空结果 fallback) | 5 min | 中 (99% 用户碰不到, 但发生时 0 词可学) |
| **P2** | 修 P2-A (删 AppearanceSection 死代码 或 扩 i18n 测试扫 components/) | 5 min | 低 (代码质量) |
| **P3** | 修 db.ts:224 `e as any` (改 unknown + Error 守卫) | 2 min | 低 (类型严格) |

### 建议下一步
1. **v1.45.1 hotfix**: P1-A + P1-B 一起修 (~20 min)
   - `markWordCompleted` 改 async, await addXP
   - `Home.handleMarkPlanWord` / `PlanPage.handleMark` await + setXpState
   - `plan.ts` try 块加空结果 fallback
2. **v1.46 大 review**: 把 7-10 维度加进 big-review 脚本, 扩 i18nKeyCoverage 扫 components/

---

## 附: 验证脚本

```bash
# 1. 跑现有测试 (v1.45 全过, 漏判的 P1-A/P1-B 是逻辑/集成问题)
cd /workspace/english-app
npx tsc --noEmit                                       # ✓ 0 错误
timeout 30 npx vitest run tests/plan.test.ts \
  tests/xpSystem.test.ts tests/difficultyAdapter.test.ts \
  tests/i18nKeyCoverage.test.ts tests/i18n.test.ts    # ✓ 63/63 通过

# 2. 复现 P1-A 竞争条件
node /tmp/race-test2.mjs
# Initial: { totalXP: 0, level: 1 }
# setXpState: { totalXP: 0, level: 1 }   ← 旧值!
# After 100ms: { totalXP: 5, level: 1 }   ← microtask 完成后, 但 UI 永远卡在旧值

# 3. 复现 P1-B 空 plan
python3 -c "
import json
from collections import Counter
data = json.load(open('public/data/words.json'))
diff = Counter(w.get('difficulty') for w in data)
print(f'Total: {len(data)} words')
print(f'Difficulty: {dict(diff)}')  # 无 1
"

# 4. 复现 P2-A 死代码
grep -nE "useTranslate|t\(" src/components/settings/AppearanceSection.tsx
# useTranslate 导入 + 解构, 但 0 处 t() 调用
```

---

**最后更新**: 2026-07-27
**下次 review**: v1.45.1 后约 5 release tag 累积
