# v1.43.0 W44 第 6 次大 review — Verifier 1 报告

**日期**: 2026-07-27 (W44, 独立 verifier)
**版本**: v1.43.0 (W42-v1.42 + W43-v1.43 累积 21 release)
**目的**: 找主审查漏掉的真问题
**结论**: **找到 1 个 P1 + 1 个 P2 + 1 个 P3**,主审查的 0 P0/P1 漏判

---

## TL;DR

| # | 严重度 | 位置 | 简述 |
|---|--------|------|------|
| **P1-1** | **P1** | `src/pages/CardReview.tsx:20,197-418` × `src/lib/i18n.ts:10-77` | **CardReview 用 26 个 review.* key, DICT 只有 5 个** — 用户在 zh/en 都看到原始 key 字符串 (如 `review.preparing`) |
| P2-1 | P2 | `src/pages/ReportsPage.tsx:20` | `const { t } = useTranslate()` 导入但 `t` 从未使用, 死代码 (主审查写"ReportsPage useTranslate 3+ t() 调用"不实) |
| P3-1 | P3 | `src/lib/difficultyAdapter.ts:32` | CEFR C2 永远到不了 (DIFFICULTY_TO_CEFR max=5→C1), 用户天花板被卡在 C1 |

---

## P1-1: CardReview 显示原始 i18n key (用户可见, zh/en 双语全坏)

### 现象
CardReview.tsx 调用了 26 个不同的 `t('review.*')` key, 但 i18n.ts 的 DICT 只定义了 5 个 review.* key. 当 key 找不到时, `t()` fallback 到返回 key 自身, 导致用户看到字面字符串如 `review.preparing`.

### 验证 (运行时)
跑了一个临时测试 (`tests/_tmp_check_i18n.test.ts`, 已删), 把 26 个 key 喂给 t():
- **zh 模式**: 26/26 全部返回 key 自身 (e.g. `t('review.preparing', 'zh')` → `'review.preparing'`)
- **en 模式**: 26/26 全部返回 key 自身

### 影响范围
CardReview 页面的**所有 26 处** UI 文本, 包括:
- 加载提示: `review.preparing`
- 空状态: `review.empty_title`, `review.empty_desc`, `review.empty_browse`, `review.empty_notebook`
- 完成页: `review.done_title`, `review.done_subtitle`, `review.back_notebook`, `review.back_home`
- 评级按钮 (4 档 × 2 = 8 个): `review.again/hard/good/easy`, `review.again_hint/hard_hint/good_hint/easy_hint`
- 翻卡: `review.flip_hint`, `review.flipping`, `review.flip_btn`
- 导航/统计: `review.exit`, `review.session_count`, `review.due_count`, `review.switch_phrase`, `review.switch_word`, `review.from_word`

### 根因
1. v1.43 W43-C "i18n UI 完整迁移" 写了 26 个 t() 调用, 但**没扩 DICT**
2. 主审查的 v1.43 报告第 56 行 "DICT 仍未 export (需打开 i18n.ts 加 export const DICT)" — 主审查者**已经知道但没修**
3. tests/i18nMigration.test.ts 第 38-45 行的假阳性测试:
   ```typescript
   it('t() 在 zh 含 home_/review_/settings_ 命名空间 (UI 集成)', () => {
     setLocale('zh')
     expect(t('common.save')).toBeTruthy()       // ← 只测了 common.*
     expect(t('common.cancel')).toBeTruthy()      // ← 没测任何 review.* key
   })
   ```
   名字叫 "review 命名空间 UI 集成", 但**实际没测任何 review.* key**, 给了 false pass.

### 修法 (2 选 1, 推荐 A)

**方案 A**: 在 `src/lib/i18n.ts` 的 DICT 里**加 26 个 zh + 26 个 en = 52 个新 key**:
```typescript
zh: {
  ...
  'review.preparing': '准备中...',
  'review.empty_title': '生词本为空',
  'review.empty_desc': '先去词库加几个词吧',
  'review.empty_browse': '去词库浏览',
  'review.empty_notebook': '去生词本',
  'review.done_title': '🎉 复习完成',
  'review.done_subtitle': '本次复习 N 张, 共 M 张',
  'review.again': '重来',
  'review.hard': '困难',
  'review.good': '良好',
  'review.easy': '简单',
  'review.again_hint': '< 1 min',
  'review.hard_hint': '吃力',
  'review.good_hint': '正常',
  'review.easy_hint': '完美',
  'review.back_notebook': '返回生词本',
  'review.back_home': '回首页',
  'review.exit': '退出',
  'review.switch_phrase': '短语模式',
  'review.switch_word': '单词模式',
  'review.from_word': '来自',
  'review.flipping': '点击翻回正面',
  'review.flip_hint': '点击翻到背面',
  'review.flip_btn': '翻到背面',
  'review.session_count': '本次已复习 N 张',
  'review.due_count': '待复习 N 张',
},
en: {
  ... (en 版本)
}
```

**方案 B**: 把 useTranslate 移除, 直接写中文 (放弃 i18n) — 不推荐, 浪费 v1.41 W41 工作

**配套**: tests/i18nMigration.test.ts 应加一个**真**的 review.* 覆盖测试, 或新建 `tests/i18nKeyCoverage.test.ts` 扫所有 `src/pages/**/*.tsx` 提取 `t('...')` 调用, 验证 DICT 全覆盖。

### 严重度判定
- **P1** (不是 P0) 因为: 页面仍能正常工作 (按钮可点, 逻辑正确), 用户只是看到 `review.preparing` 这种 key 而不是"准备中..."
- 不影响数据/功能, 但**所有 CardReview 用户立刻看到**, 是**功能性 bug** (i18n 实际上失败了)
- 修法简单 (52 个短字符串), ROI 高

### 主审查漏判原因
主审查的 6 维度扫描 (catch any / setLoading / as any / console / 空 catch / 历史修复) **没覆盖 i18n 完整性**。这是维度盲区, 不是简单疏漏。

---

## P2-1: ReportsPage.tsx useTranslate + t() 完全未使用 (死代码)

### 现象
```typescript
// src/pages/ReportsPage.tsx:13
import { useTranslate } from '../lib/useTranslate'
// src/pages/ReportsPage.tsx:20
const { t } = useTranslate()        // ← 解构了 t
// ... 文件里 0 处使用 t(...)
```

整个文件 365 行, 0 处 `{t(...)}` 或 `t(...)` 调用. `t` 是死变量.

### 主审查错处
主审查报告 (REVIEW_v1.43.md 第 28 行) 写:
> "src/pages/ReportsPage.tsx: useTranslate, 3+ t() 调用"

**实际上**: 1 个 import + 1 个解构 + **0 个调用**. "3+ t() 调用" 是幻觉.

### 修法
**2 选 1**:
- A) 在 ReportsPage 加 3+ t() 调用 (按 CardReview 模式: tab 标题/空状态/分享文本)
- B) 删掉 useTranslate import + 解构 (回到 v1.42 状态)

推荐 A, 跟 CardReview 一起补 i18n (与 P1-1 同步修).

### 严重度判定
- **P2**: 不影响功能, 但反映 v1.43 集成质量差 (声明做了 i18n 实际没做)
- 修法简单 (5 min)

---

## P3-1: difficultyAdapter 永远到不了 C2 (天花板问题)

### 现象
```typescript
// src/lib/difficultyAdapter.ts:30-37
const DIFFICULTY_TO_CEFR: Record<number, CEFRLevel> = {
  1: 'A1', 2: 'A2', 3: 'B1', 4: 'B2', 5: 'C1',  // ← max=5 → C1
}
```

`difficultyToCEFR(6)` 返回 null → 走 `|| 'A2'` fallback → 用户被甩回 A2.

### 实际影响
- 大多数用户到不了 C2 (本身上限是 5 档 → C1)
- 如果 words.json 未来加 `difficulty: 6` 词 (高级词), 系统会**回退到 A2** (而不是 C2)
- 这会让"高级词出现在学习计划中"的概率变大, 但用户**永远升不到 C2**

### 修法 (3 选 1)
- A) 扩 DIFFICULTY_TO_CEFR 到 6 档: `6: 'C2'`, 并把 DIFFICULTY_LADDER 用 7 档
- B) 把 5 → C2 (重映射): `1: 'A1', 2: 'A2', 3: 'B1', 4: 'B2', 5: 'C2'` (牺牲 C1 精度)
- C) 接受现状, 在 `getAdaptiveLevel` 注释 "C2 不可达" (v1.43 现状)

### 严重度判定
- **P3**: 实际 99% 用户碰不到 (高中/CET4 词汇全在 A1-B2), 进阶用户 (C1+) 才受影响
- 不阻塞任何功能, 是设计限制, 不是 bug
- 不在本轮 review 必修范围

---

## 5 维度独立评估

### 维度 1: P1 真 bug
✅ 找到 1 个 (P1-1 CardReview i18n 完整坏), 漏判主审查

### 维度 2: 测试盲区
- `tests/difficultyAdapter.test.ts`: **0 个 catch/异常测试** (analyzeUserPerformance 内部有 try/catch 但没测到)
- `tests/xpSystem.test.ts`: catch 测试只覆盖了 JSON 损坏 + 字段缺失, **没测 history 数组单元素 malformed + history 数组长度边界 (200) 在 read 时**
- `tests/plan.test.ts`: **没测 markWordCompleted → addXP 集成** (W43-B 的核心集成, 无任何验证)
- `tests/i18nMigration.test.ts`: **假阳性测试** (测了 common.* 假装测了 review.*, 见 P1-1)

### 维度 3: 集成 bug
| 假设 | 验证结果 |
|------|---------|
| `getRecommendedWords` + `targetLevel='all'` 不工作 | ❌ **正常工作**, 二次 filter `targetLevel === 'all' \|\| w.level === targetLevel` 正确通过所有词 |
| Home.tsx xpState useState 默认 `getXPState()` 同步, useEffect setValue 丢失 | ❌ **正常**, useState lazy init 只跑一次, setXpState(getXPState()) 每次 mark 重新读 localStorage, 无丢失 |
| PlanPage difficulty 标签只 plan 加载后显示, 冷启动无 | ❌ **正常**, 早 return `<div>加载中...</div>` 是预期, 冷启动有 brief loading 然后显示 |
| CardReview 用 26 个 t() key 但 DICT 只有 5 个 | ✅ **真 bug (P1-1)**, 全部返回 key 字符串 |
| ReportsPage useTranslate 完整 i18n 迁移 | ❌ **完全没迁移**, 0 处 t() 调用 (P2-1) |

### 维度 4: 历史修复维持
- v1.6 修复的 catch (e: unknown) + Error 守卫: **维持** ✓
  - difficultyAdapter.ts:79,101 显式守卫
  - xpSystem.ts:85,98 显式守卫
  - plan.ts:130,144,195 显式守卫
- v1.0-v1.5 已完成模块 (成就墙/学习卡/词根/短语/错题讲解): **未动** ✓

### 维度 5: catch any / setLoading / as any / console / 空 catch
- 0 catch (e: any): ✓ (difficultyAdapter 显式 `e: unknown` + Error 守卫, 跟 v1.6 风格一致)
- 0 空 catch (4 个 try/catch 都有 warn 提示): ✓
- console.warn 数量: 8 处 (合理, 不是噪音)
- 0 setLoading 漏掉: ✓ (CardReview 已有 loading 状态守卫)

### tsc / build 状态
- `npx tsc --noEmit`: 0 错误 (P1-1 是运行时 bug, tsc 看不见)
- `npx vitest run`: 全部通过 (P1-1 因假阳性测试漏过)

---

## 推荐优先级

| 优先级 | 项 | 工作量 | 收益 |
|--------|----|--------|------|
| **P1** | 修 P1-1 (扩 DICT 26×2=52 key + 加真覆盖测试) | 15 min | 高 (用户立刻看到, 是 v1.43 W43-C 主要交付) |
| **P2** | 修 P2-1 (ReportsPage 3+ t() 调用 或 删 useTranslate) | 5 min | 中 (反映集成质量) |
| **P3** | 修 P3-1 (扩 DIFFICULTY_TO_CEFR 到 6 档) | 5 min | 低 (99% 用户碰不到) |

### 建议下一步
1. v1.43.1 hotfix: P1-1 + P2-1 一起修 (~20 min)
   - 加 52 个 DICT key
   - 加 `tests/i18nKeyCoverage.test.ts` 扫所有 `t('...')` 调用做完整性断言
   - ReportsPage 补 3+ t() 调用
2. v1.44 增量: 视情况修 P3-1

---

## 附: 验证脚本 (临时)

主审查 + 我都跑过 `npx tsc --noEmit` (0 错误) 和 `npx vitest run` (全过), 但 P1-1 是**逻辑完整性** bug, 类型检查和现有单元测试都看不到。

我加了一个临时测试 (已删) 跑 26 个 key 过 t(), 26/26 全返 key 自身 — 100% 确认 P1-1 存在。

```typescript
// 临时验证 (放在 tests/_tmp_check_i18n.test.ts, 验证后删除)
import { t } from '../src/lib/i18n'
const cardReviewKeys = [
  'review.preparing', 'review.empty_title', 'review.empty_desc',
  'review.empty_browse', 'review.empty_notebook',
  'review.done_title', 'review.done_subtitle',
  'review.again', 'review.hard', 'review.good', 'review.easy',
  'review.again_hint', 'review.hard_hint', 'review.good_hint', 'review.easy_hint',
  'review.back_notebook', 'review.back_home', 'review.exit',
  'review.switch_phrase', 'review.switch_word', 'review.from_word',
  'review.flipping', 'review.flip_hint', 'review.flip_btn',
  'review.session_count', 'review.due_count',
]
// zh + en 各跑: 26/26 全返 key 自身
```

**最后更新**: 2026-07-27
