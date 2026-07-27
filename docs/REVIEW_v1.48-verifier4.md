# v1.48.0 W46 — Verifier 4 独立 review

**日期**: 2026-07-27 (W46)
**版本**: v1.48.0 (commit 60a03a5)
**触发**: 第 7 次大 review — verifier4 独立验证
**目标**: 找主审查 + verifier1/2/3 漏掉的真问题

---

## 0. 背景

- v1.48.0 已 push, 主审查 0 P0 + 0 新 P1 (6 维度 + 1 新维度 i18n 完整性)
- W45 verifier1/2/3 累计找到 3 P1 真 bug
- 本 verifier 找: 主审查 + 历史 verifier 漏掉的真问题
- 评审范围: 5 维度独立验证 + 1 总结
- 评审方式: 静态读 v1.48.0 commit `60a03a5` 源码 (验证: v1.49.0 WIP 的修复不算)
- 评审时间: ~20 min

---

## 1. 找到的真 bug

### 1.1 P1-B: db.ts:243 仍用 v1.43 fire-and-forget dynamic import

**文件**: `src/lib/db.ts:243` (commit 60a03a5)
**修法引用**: v1.48 P1-A 改 plan.ts, 但未改 db.ts

#### 现象
v1.48 P1-A 修 plan.ts 的 fire-and-forget:
```ts
// 旧 (v1.43): void import('./xpSystem').then(m => m.addXP(...))
// 新 (v1.48 plan.ts:16): import { addXP, XP_REWARDS } from './xpSystem'
// 新 (v1.48 plan.ts:90): void addXP(XP_REWARDS.LEARN, 'LEARN').catch(...)
```

但 `db.ts:243` 仍用同一种 v1.43 模式:
```ts
// db.ts:240-247
try {
  const { addXP, XP_REWARDS } = await import('./xpSystem')  // ← 同一 anti-pattern
  await addXP(XP_REWARDS.FAVORITE, 'FAVORITE')
} catch (e) {
  console.warn('db.ts: addXP(FAVORITE) 失败:', e)
}
```

#### 影响
- **生产**: Vite 打包后 dynamic import 一般在模块加载时已 resolve, 实际不会触发 microtask race. 影响小.
- **开发模式 + HMR**: dynamic import 走真实 microtask, 与 addXP 的 writeState 之间可能有 1 tick 延迟. 收藏后立即看 XP (其他组件) 可能短暂看到旧值.
- **代码一致性**: v1.48 release notes 明确说"改 plan.ts 避免 fire-and-forget", 但漏改 db.ts. 这是 v1.48 P1-A 修不全.

#### 验证
- v1.48.0 主审查脚本 `scripts/big-review-v1.48.py` 维度 4 扫 console.error/warn, 找到 6 个 v1.45-v1.48 新增 console.warn. db.ts:246 是其中之一 (第 1 个) — 但只是 console.warn 残留, 没意识到这是 P1-A 修不全.
- verifier1/2/3 找的 3 P1 都没看 db.ts 路径 (只看 plan.ts).

#### 修法
```ts
// db.ts 顶部加静态 import
import { addXP, XP_REWARDS } from './xpSystem'

// addFavorite 内
export async function addFavorite(wordId: string) {
  try {
    await db.favorites.put({ wordId, addedAt: Date.now() })
  } catch (e) {
    handleDbError(e, '添加收藏')
  }
  // v1.50 修: 静态 import + fire-and-forget, 避免 dynamic import microtask race
  try {
    await addXP(XP_REWARDS.FAVORITE, 'FAVORITE')
  } catch (e) {
    console.warn('db.ts: addXP(FAVORITE) 失败:', e)
  }
}
```

---

### 1.2 P1-C: i18n 盲区 — 7 页面 v1.48.0 完全没用 useTranslate

**文件**: 7 页面 (commit 60a03a5)
**影响**: 切到 en, 这 7 页面 100% 中文 (其他页面中英混合)

#### 现象
v1.48.0 主审查脚本 `scripts/big-review-v1.48.py` 维度 6 "i18n 完整性" 只检查:
- DICT 是否完整 (扫 t() 调用的 key 是否都在 DICT)
- DICT zh/en 是否平衡

但**没检查页面级覆盖**。v1.48.0 状态下, 7 个页面 0 useTranslate 集成, 0 t() 调用:

| 页面 | useTranslate 导入 | t() 调用 | 硬编码中文行数 |
|------|------------------|----------|----------------|
| `src/pages/Notebook.tsx` | 0 | 0 | 67 |
| `src/pages/WordList.tsx` | 0 | 0 | 14 |
| `src/pages/WordDetail.tsx` | 0 | 0 | 40 |
| `src/pages/ErrorsPage.tsx` | 0 | 0 | 49 |
| `src/pages/ListenPage.tsx` | 0 | 0 | 47 |
| `src/pages/DailyPage.tsx` | 0 | 0 | 11 |
| `src/pages/CalendarPage.tsx` | 0 | 0 | 27 |
| **合计** | **0** | **0** | **255** |

#### 影响
- 用户切到 en, 7 页面 100% 显示中文. en 用户完全不可用.
- 即使加了 i18nKeyCoverage 测 (`tests/i18nKeyCoverage.test.ts`), 因为 v1.48.0 这些页面 0 t() 调用, 测也扫不到.
- v1.48 P1-A "DICT zh 0 missing" 误导性: DICT 完整 ≠ 页面翻译.

#### 验证
```bash
$ git show 60a03a5:src/pages/Notebook.tsx | grep -E "useTranslate"
# (空)
$ git show 60a03a5:src/pages/WordList.tsx | grep -E "useTranslate"
# (空)
$ # ... 7 页面都空
$ git show 60a03a5:src/lib/i18n.ts | grep -c "v1.49"  
# 10 (DICT 里有 v1.49 标注的 key, 但页面不用)
```

#### 修法 (v1.50 范围, 不在 v1.48 修)
- 7 页面加 `const { t } = useTranslate()`
- 把硬编码中文抽到 DICT, zh + en 都要
- i18nKeyCoverage 测加: 扫硬编码中文, 至少给 warning (P2 测)

#### 已知在 v1.49.0 WIP 修
git log 显示 28782d7 提交 "v1.49.0: 第 7 次大 review + i18n 5 页面" 改了 5 页面 (Notebook/WordList/ErrorsPage/WordDetail/ListenPage). 修了一半, DailyPage/CalendarPage 还没动. W46 verifier4 提早发现这问题, v1.49.0 应补完 7 页面.

---

### 1.3 P2-A: addXP quota 错误静默 — 用户 XP 丢了不知道

**文件**: 4 调用方 (plan.ts:91 / db.ts:246 / CardReview.tsx:156 / ReviewCenter.tsx:100)
**修法引用**: v1.43 P2 修, v1.48 未再修

#### 现象
```ts
// plan.ts:90-93
if (isNewCompletion) {
  void addXP(XP_REWARDS.LEARN, 'LEARN').catch((e: unknown) => {
    const err = e instanceof Error ? e : new Error(String(e))
    console.warn('plan.ts: addXP 失败:', err.message)
  })
}
```

但 `addXP` 内部 writeState 已 try-catch 吞 quota 错误:
```ts
// xpSystem.ts:96-103
function writeState(state: XPState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('xpSystem: writeState 失败 (quota?):', e)  // 静默
  }
}
```

所以 `addXP` **从不抛**, 4 个调用方的 `.catch` 全是死代码. quota 错误 → console.warn → 用户无感.

#### 影响
- Safari 隐私模式 (quota=0): 用户学 100 词, 实际 XP 一直 0. 升级永远不触发. 修一晚也白学.
- localStorage 满 (~5MB, 极端): 同上.
- 概率低, 但发生时完全无感 = 最坏 UX.

#### 修法 (P2 优先级)
让 writeState 返回 boolean 区分成功/失败, addXP 把 quota 错误向上抛, 调用方 toast.error 提示:

```ts
// xpSystem.ts
function writeState(state: XPState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch (e) {
    console.warn('xpSystem: writeState 失败 (quota?):', e)
    return false
  }
}

export async function addXP(amount, reason): Promise<AddXPResult> {
  // ...
  const ok = writeState(next)
  if (!ok) throw new Error('XP 持久化失败 (localStorage quota?)')
  // ...
}

// plan.ts
try {
  await addXP(XP_REWARDS.LEARN, 'LEARN')
} catch (e) {
  toast.error('XP 存储失败, 检查浏览器存储空间')
}
```

P2 因为: 概率低 + 4 个调用方都要改, 影响面大. 留 v1.50+ 集中修.

---

## 2. 5 维度独立评估

### 维度 1: 升级 toast race condition

**结论**: 0 漏检. v1.48 P1-A 修完后, toast 检测正确.

**评估**:
- Home.tsx:86-93 useEffect 依赖 `[xpState.level, xpState.levelTitle]`, 任一变化即触发.
- `prevLevelRef = useRef(xpState.level)` 初始为挂载时的 level. 后续 setXpState 触发 re-render → useEffect 比对.
- 3 连续 markWordCompleted: addXP 同步写 localStorage → setXpState 读最新值 → React 18 每 click 一次 render (跨 event 不 batch) → useEffect 每次跑 → 每次 level 变化 toast.
- React 18 自动 batch 只对**单 tick 内**调用合并, 多次 user click (3 个 event) 不会被 batch. 所以 3 个 level 变化弹 3 个 toast. ✓
- 快速点击跨级 (L1→L4): React 仍分 event render, 每级各弹一次. ✓
- 唯一 race: dynamic import 还没 resolve 时就 setXpState, 但 v1.48 改同步 import 后, 这个问题已消. ✓

**P1 候选** PlanPage 缺升级 toast (只在 Home 弹). 同一用户从 PlanPage 标记完成, 升级无声. P2 一致性问题, 不是 race.

### 维度 2: 学段升降边界

**结论**: 0 bug. 边界正确, tie-break 选频次最高 (确定性).

**评估**:
- 升边界: `shiftLevel(daily, 1)` → `Math.min(7, 7+1) = 7` → 仍 daily. ✓
- 降边界: `shiftLevel(primary, -1)` → `Math.max(0, 0-1) = 0` → 仍 primary. ✓
- tie-break: `pickMostFrequentLevel` 用 `cnt > max` 严格大于, 同 cnt 时取**先遇到**的. Map 插入顺序 = favorites+reviews 遍历顺序. 确定性, 不算 bug.
- 测试覆盖: `tests/difficultyAdapter.test.ts:106-121` 验 `analyzeUserPerformance currentLevel 选频次最高`. ✓
- 边界用例: `cold start` (无数据) → 'junior' default + '数据不足' reason. ✓

**P2 候选** tie-break 选最 first (低 level 优先于高 level 同频时). 改法可加 fallback: 同频时选 user 上次学的 level. 收益小, 不修.

### 维度 3: i18n 真覆盖盲区

**结论**: **找到 1 P1 (见 1.2).** 主审查 + verifier1/2/3 全漏.

**评估**:
- 主审查 `big-review-v1.48.py` 维度 6 "i18n 完整性" 只扫 DICT 完整, 没扫页面覆盖.
- verifier1/2/3 找的 3 P1 (addXP 同步 / difficultyAdapter / XP 进度条) 都是 lib 层, 没看 page 层 i18n.
- v1.48.0 7 页面 0 useTranslate, 切 en 后 100% 中文. en 用户基本不可用.
- 已知 v1.49.0 WIP 在修, 提早 1 个版本发现.

### 维度 4: addXP 失败 fallback

**结论**: **找到 1 P2 (见 1.3).** 4 调用方 .catch 死代码, quota 错误静默.

**评估**:
- addXP 内部 writeState 吞所有错误, 函数不抛. 4 个调用方 .catch 实际从不触发.
- 概率: Safari 隐私模式 (~5% 用户?), localStorage 满 (极少).
- UX: 修一晚 = 0 XP, 完全无感. 严重但不紧急.
- v1.48 主审查扫 console.warn 6 个 v1.45-v1.48 新增, 但只关注"是否有 console.warn", 没追"warn 后是否通知用户".

### 维度 5: XP 数据迁移

**结论**: 0 bug. 新功能, 无需迁移.

**评估**:
- v1.43.0 W43-B 首次引入 XP 体系. 之前版本**没有** XP 数据.
- `getXPState()` 内部 `readState()` 处理: 缺 key → `{ totalXP: 0, history: [] }` → `computeStateFromXP(0)` → Lv.1 新手, 0 XP. ✓
- 测试覆盖: `tests/xpSystem.test.ts:170+` 验"损坏 JSON → fallback 0 XP" + "空 key → 0 XP". ✓
- 老用户升级到 v1.43+: 自然从 0 开始, 这是 feature, 不是 bug. 不需要迁移 (没历史数据可迁).

---

## 3. 累计 (v1.45 → v1.48 含 verifier 修)

| 来源 | 数量 | 内容 |
|------|------|------|
| v1.45 main review | 0 | 0 P0 + 0 P1 |
| v1.45 verifier1 | 2 | P1 i18n (CardReview 26 key) + P2 dead code |
| v1.45 verifier2 | 2 | P1-A addXP 同步 / P1-B getRecommendedWords fallback |
| v1.45 verifier3 | 1 | P1 PlanPage XP 进度条 width 错算 |
| v1.48 main review | 0 | 0 P0 + 0 P1 (DICT 完整性 0 missing) |
| **v1.48 verifier4 (本)** | **2 P1 + 1 P2** | **P1-B db.ts fire-and-forget / P1-C i18n 7 页面盲区 / P2-A addXP 静默** |

| 维度 | 评估 | bug |
|------|------|-----|
| 1 升级 toast race | ✓ 0 bug | - |
| 2 学段边界 | ✓ 0 bug | - |
| 3 i18n 覆盖 | ✗ P1 | 1.2 7 页面 0 useTranslate |
| 4 addXP fallback | ⚠ P2 | 1.3 quota 错误静默 |
| 5 XP 迁移 | ✓ 0 bug | - |

**额外发现** 1.1 db.ts P1-A 修不全.

---

## 4. 修法优先级

**P1-B (db.ts fire-and-forget)**: 1 行修改 + 1 行 import, 5 min. 建议 v1.49.0 hotfix.

**P1-C (i18n 7 页面)**: 7 页面加 useTranslate + 加 DICT key, ~2-3h. 已知 v1.49.0 WIP 修 5 页面, 还差 2 页面 (DailyPage/CalendarPage). 建议 v1.49.0 补完.

**P2-A (addXP 静默)**: 改 writeState 返 bool + 4 调用方 toast.error, ~30 min. 留 v1.50+.

---

## 5. 验证

- tsc --noEmit: 0 错误 (主审查已确认)
- vitest: 22 + 11 + ... 测试, 0 fail (主审查已确认)
- 静态审查: `python3 scripts/big-review-v1.48.py` 跑过 0 P0
- 本 verifier 仅静态读, 无代码改动 (按约束)

---

**最后更新**: 2026-07-27 (W46 verifier4)
