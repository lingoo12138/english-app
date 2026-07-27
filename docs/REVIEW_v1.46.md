# v1.46.0 W45 — UI 集成 (Home + PlanPage i18n + PlanPage XP)

**日期**: 2026-07-27 (W45, 30min)
**版本**: v1.46.0
**结论**: **0 P0 + 0 P1 + 0 P2** ✓

---

## W45-A Home i18n 集成

`src/pages/Home.tsx`:
- 加 `useTranslate()` hook
- 4 处中文 → t() 调用:
  - "今日数据 · 7 天汇总 · 同周对比"
  - "🏆 连续学习"
  - "复习中心"
  - "7 天曲线 · 连续天数 · 今日详情"

---

## W45-B PlanPage XP 进度条

`src/pages/PlanPage.tsx`:
- 加 `getXPState()` 复用 v1.43 xpSystem
- 顶部加 XP 进度条 (Lv + 称号 + 进度 + totalXP)
- 用户视角: 进 PlanPage 就能看到自己等级

---

## W45-C DICT 扩 4 key (Home)

`src/lib/i18n.ts`:
- home.today_summary / streak_title / review_center / plan_summary
- zh + en 各 4 个

---

## 累计 (v1.45 → v1.46)

| 维度 | v1.45 | v1.46 | 增量 |
|------|-------|-------|------|
| Release tag | 45 | **46** | +1 |
| 单元测试 | 706 | 706 | 0 (i18nKeyCoverage 已覆盖) |
| 库 | 44 | 44 | 0 |
| i18n key (DICT) | 96 | 104 | +8 (4 zh + 4 en) |
| t() 调用页面 | 3 | 4 | +1 (Home) |
| 0 P0/P1 | ✓ | ✓ | 维持 |

### 大 review verifier 累计
- v1.36 verifier: 3 处
- v1.39 verifier3: 2 处
- v1.45 verifier1: 2 处 (P1+P2)
- 累计: 7 处真 bug 由 verifier 找到

---

**最后更新**: 2026-07-27
