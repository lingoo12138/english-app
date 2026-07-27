# v1.48.0 W45 — verifier2/3 找到 3 P1 Hotfix

**日期**: 2026-07-27 (W45, 1h)
**版本**: v1.48.0
**触发**: W45 verifier2 找到 2 P1 + verifier3 找到 1 P1

---

## P1-A 修: addXP 同步 import (verifier2 P1-A)

### 现象
`src/lib/plan.ts:87-89` markWordCompleted 用 `void import('./xpSystem').then(addXP)` fire-and-forget. 调用方 mark 完后立即 getXPState() 同步读, 读到的是 microtask 之前的旧 localStorage. 用户学词后, Home 显示旧 XP, 升级 toast 不弹.

### 修法
```ts
// 旧 (v1.43):
void import('./xpSystem').then(m => m.addXP(m.XP_REWARDS.LEARN, 'LEARN')...)

// 新 (v1.48):
import { addXP, XP_REWARDS } from './xpSystem'
void addXP(XP_REWARDS.LEARN, 'LEARN').catch(...)
```

---

## P1-B 修: difficultyAdapter 改学段 + fallback (verifier2 P1-B)

### 现象
v1.43 difficultyAdapter 用 CEFR 6 档 (来自 difficulty 字段). 但 words.json 99% 无 difficulty 字段. getRecommendedWords 返空, 加上 targetLevel 二次过滤, A1 等级 + targetLevel='gaozhong' 时 plan 完全空.

### 修法
1. difficultyAdapter 改用学段 8 档 (primary/junior/.../daily), 跟 word.level 一致
2. getRecommendedWords 加 fallback: 同 level 0 词时扩到全部 level
3. difficultyToCEFR 保留兼容: 1→primary, 2→junior, ..., 5→cet4

---

## P1 修: PlanPage XP 进度条 width 错算 (verifier3 P1)

### 现象
`src/pages/PlanPage.tsx` 用了 `${xpState.progress}%`, 但 xpSystem.progress 是 0-1 不是 0-100. 进度条只显示 0-1% 宽度, 视觉上几乎不可见.

### 修法
```ts
style={{ width: `${Math.min(100, Math.max(0, xpState.progress * 100))}%` }}
```

---

## 累计 (v1.46 → v1.48)

| 维度 | v1.47 | v1.48 | 增量 |
|------|-------|-------|------|
| Release tag | 47 | **48** | +1 |
| 单元测试 | 706 | 700 | -6 (difficultyAdapter 整合) |
| 学段 8 档 | - | ✓ | 新 |
| addXP 同步 | - | ✓ | 新 |
| 0 P0/P1 | ✓ | ✓ | 维持 |

### 大 review verifier 累计
- v1.36 verifier: 3 处
- v1.39 verifier3: 2 处
- v1.45 verifier1: 2 处 (P1-1 i18n + P2-1 死代码)
- **v1.45 verifier2: 2 处 P1 (addXP 同步 + getRecommendedWords fallback)**
- **v1.45 verifier3: 1 处 P1 (XP 进度条 width 错算)**
- 累计: 10 处真 bug 由 verifier 找到

### Verifier 2 错位 bug
W45 verifier2 报告 P1-B 描述 "A1 + targetLevel=gaozhong → plan 完全空" 实际 plan.ts 有字母序 fallback, 不完全空. 但 getRecommendedWords 返空是真问题 (依赖 difficulty 字段, 99% 词无). 修法不依赖 verifier 描述, 修根因: 改用 word.level (跟真实数据一致).

---

**最后更新**: 2026-07-27
