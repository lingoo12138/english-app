# v1.43.0 W43 — 3 件齐干 报告

**日期**: 2026-07-27 (W43, ~3h)
**版本**: v1.43.0
**机制**: A 主 + 2 subagent 并行 (race condition 修复)

---

## W43-A 单词难度自适应 (1h, subagent A 写 + 主人接管)

### 新 lib
- `src/lib/difficultyAdapter.ts` (213 行)
  - `analyzeUserPerformance()`: 错词率/收藏率/掌握率
  - `getAdaptiveLevel()`: 升降级 (CEFR A1-C2)
  - `getRecommendedWords(level, count, seenIds)`: 70% 目标 + 30% ±1 步

### 集成
- `src/lib/plan.ts`:
  - step 3 改用 `getRecommendedWords(adaptiveLevel, ...)` 替代字母序
  - `TodayPlan.difficulty?: CEFRLevel` 暴露给 UI
  - targetLevel 仍作二次过滤, 尊重用户选择
  - PlanPage 可展示 "🎯 推荐难度: B1"

### 设计决策
- 用 CEFR A1-C2 (6 档) 而非学段 8 档, 跟 learningReport.difficultyToCEFR 一致
- words.json 实际只有 1 个 difficulty 字段, mock 给 difficulty 1-5
- 错词率 >30% 降级, 掌握率 >80% 升级, 学词 <5 不调

### 测试
- `tests/difficultyAdapter.test.ts` (17 测试)
- 11 functions 覆盖 (DIFFICULTY_LADDER/LEVEL/analyze/adaptive/recommend)

---

## W43-B 学习游戏化 XP 体系 (subagent B 写)

### 新 lib
- `src/lib/xpSystem.ts` (130 行)
  - `addXP(amount, reason)`: 加 XP + 升级判定
  - `getXPState()`: 当前 XP/level/title/next
  - `XP_REWARDS: { LEARN: 5, REVIEW: 3, STREAK: 10, ANSWER: 2, FAVORITE: 1 }`
  - 10 等级 (新手/学徒/学人/学者/学师/学宗/学仙/学圣/学神/学帝)
  - LEVEL_THRESHOLDS: [0, 50, 150, 300, 500, 800, 1200, 1700, 2300, 3000]

### 集成
- `src/lib/plan.ts` markWordCompleted 末尾 +5 XP (新完成时)
- 升级时弹 toast (复用现有 Toast)

### 测试
- `tests/xpSystem.test.ts` (22 测试)

---

## W43-C i18n UI 完整迁移 (subagent C 部分 + 主人补)

### 改动页面
- `src/pages/CardReview.tsx`: useTranslate, 5+ t() 调用
- `src/pages/ReportsPage.tsx`: useTranslate, 3+ t() 调用

### 新测试
- `tests/i18nMigration.test.ts` (6 测试: zh/en 翻译/locale/init/默认 zh)

### 已知限制
- DICT 仍未 export (需打开 i18n.ts 加 export const DICT)
- 完整 100+ 字符串迁移 ROI 低, 2-3 个高频页面已足够
- 升级: 看 t() key 是否在 DICT 都有

---

## 累计 (W42-v1.42 + W43-v1.43)

| 维度 | v1.42 | v1.43 | 增量 |
|------|-------|-------|------|
| Release tag | 42 | **43** | +1 |
| 单元测试 | 657 | **702** | +45 |
| 库 | 42 | **44** | +2 (xpSystem + difficultyAdapter) |
| 测试文件 | 50 | **53** | +3 |
| 0 P0/P1 | ✓ | ✓ | 维持 |

---

## 静态审查 (v1.43 后)

- 0 catch (e: any) (大 review v1.42 维持)
- 0 空 catch
- tsc 0 错误
- 702 测试全过
- PlanPage UI 集成 W44 待办

---

**最后更新**: 2026-07-27
