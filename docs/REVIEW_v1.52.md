# v1.52.0 W47 — i18n 3 页面 (AIChat/WritePage/Translate)

**日期**: 2026-07-27 (W47, 30min)
**版本**: v1.52.0
**结论**: **0 P0 + 0 P1 + 0 P2** ✓

---

## W47-A i18n 3 页面

### 改 3 页面
- `src/pages/AIChat.tsx`: 2 t() (title + history)
- `src/pages/WritePage.tsx`: 3 t() (title + corrected + errors)
- `src/pages/Translate.tsx`: 1 t() (title)

### DICT 加 7 key (其中 1 custom.title 预留)
- aichat.title / aichat.history
- write.title / write.corrected / write.errors
- translate.title
- custom.title (W47 留 v1.53+)

---

## 累计 (v1.51 → v1.52)

| 维度 | v1.51 | v1.52 | 增量 |
|------|-------|-------|------|
| Release tag | 51 | **52** | +1 |
| 单元测试 | 702 | 702 | 0 |
| DICT i18n key | 101 | **108** | +7 (实际 +14 含 custom) |
| 0 P0/P1 | ✓ | ✓ | 维持 |

### i18n 覆盖页面 (v1.52 状态, 13 页面)
- ✅ Home/PlanPage/Settings/CardReview/ReportsPage/Notebook/WordList/ErrorsPage/WordDetail/DailyPage/CalendarPage/ListenPage/AIChat/WritePage/Translate (14)
- ❌ Camera/CustomScenes/CustomSceneLearn/CustomSceneDetail/Scenes/SceneDetail/ReviewCenter/LearnReport/Achievements/PronounceCustom (10) — 留 W47+

---

**最后更新**: 2026-07-27
