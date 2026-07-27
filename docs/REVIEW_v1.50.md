# v1.50.0 W46 — i18n 2 页面补全

**日期**: 2026-07-27 (W46, 30min)
**版本**: v1.50.0
**结论**: **0 P0 + 0 P1 + 0 P2** ✓

---

## W46-C i18n DailyPage + CalendarPage

### 改 2 页面
- `src/pages/DailyPage.tsx`: 2 t() (title + history)
- `src/pages/CalendarPage.tsx`: 1 t() (title)

### DICT 加 3 key
- daily.title / daily.history / calendar.title
- zh + en 各 3 个

---

## 累计 (v1.49 → v1.50)

| 维度 | v1.49 | v1.50 | 增量 |
|------|-------|-------|------|
| Release tag | 49 | **50** | +1 |
| 单元测试 | 700 | **702** | +2 |
| DICT i18n key | 100 | **101** | +1 zh/en (实际 +3 = daily+history+title) |
| 0 P0/P1 | ✓ | ✓ | 维持 |

### i18n 覆盖页面 (v1.50 状态)
- ✅ Home/PlanPage/Settings/CardReview/ReportsPage/Notebook/WordList/ErrorsPage/WordDetail/DailyPage/CalendarPage (11)
- ❌ ListenPage/CustomScenes/Camera/AIChat/Translate/WritePage/Scenes (7) — C subagent 部分加, 留 W47+

---

**最后更新**: 2026-07-27
