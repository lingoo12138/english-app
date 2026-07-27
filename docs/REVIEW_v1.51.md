# v1.51.0 W46 — verifier4 找到 P1-B Hotfix

**日期**: 2026-07-27 (W46, 30min)
**版本**: v1.51.0
**触发**: W46 verifier4 找到 P1-B (db.ts fire-and-forget)

---

## P1-B 修: db.ts 静态 import addXP (verifier4)

### 现象
v1.48 P1-A 修了 plan.ts:84-87 的 fire-and-forget, 但漏改 db.ts:243-245. 同样有 `await import('./xpSystem').then(addXP)` 模式. addFavorite 收藏时, 调用方 getXPState() 同步读可能拿旧值.

### 修法
```ts
// 旧 (v1.43):
const { addXP, XP_REWARDS } = await import('./xpSystem')
await addXP(XP_REWARDS.FAVORITE, 'FAVORITE')

// 新 (v1.51):
import { addXP, XP_REWARDS } from './xpSystem'  // 静态
await addXP(XP_REWARDS.FAVORITE, 'FAVORITE')
```

---

## 累计 (v1.50 → v1.51)

| 维度 | v1.50 | v1.51 | 增量 |
|------|-------|-------|------|
| Release tag | 50 | **51** | +1 |
| 单元测试 | 702 | 702 | 0 |
| 0 P0/P1 | ✓ | ✓ | 维持 |

### 大 review verifier 累计
- v1.36 verifier: 3
- v1.39 verifier3: 2
- v1.45 verifier1: 2
- v1.45 verifier2: 2 P1
- v1.45 verifier3: 1 P1 + 1 P2
- **v1.48 verifier4: 1 P1 (db.ts fire-and-forget)**
- 累计: 11 处真 bug 由 verifier 找到

### Verifier 4 错位
- P1-C (i18n 7 页面) 已在 v1.49/v1.50 修完 (Notebook/WordList/ErrorsPage/WordDetail/DailyPage/CalendarPage)
- P2-A (addXP 静默) 留 v1.50+ (W47+)
- 错位 P1-B (db.ts): 真实, v1.51 修

---

**最后更新**: 2026-07-27
