# v1.95 收官总结 (W89-A 完结)

## 时间线
- **W89-A** (v1.95.0) — 跟读评分增强 (重听原音 + 全部重听 + 每句最好分指示器)
- 主人全做 (W83+ 模式)
- 拉 1 verifier 跑 W88 修 v1 验证, **PASS** (11/11 项通过)
- 加 verifier 建议的 2 测试 (R1 cardIds 字段 + R2 MAX_SCORES 边界)

## v1.95 W89-A 新功能
- **跟读评分增强 (3 块)**:
  1. 🔊 **重听原音** - 跟读前/后随时点 TTS 重读当前句
  2. ▶️ **全部重听** - TTS 连续读所有句 (4s/句)
  3. **每句最好分指示器** - 跟读评分后, 显示 `句号:最好分` 圆角小标签
     - state: `sentenceScores: Record<number, number>` 按句 idx 存
     - 评分时更新: `Math.max(prev, currentScore)`
     - UI: 颜色按分数 (绿 ≥70 / 琥珀 ≥40 / 红 <40)
- src/pages/LessonDetailPage.tsx: 加 state + 重听按钮 + 每句指示器
- tests/followReadEnhancement.test.ts: 8 个测试 (computeBestScores + colorForScore)

## Verifier W88 修 v1 验证 (关键流程)
- **Verifier A** 验证主人 W88 修 v1 改动: **PASS** ✅
- 11 项验证清单:
  - P0-1 cardIds 字段 (extractCardIds 去重) ✅
  - P1-1 MAX_SCORES=1000 FIFO ✅
  - P1-4 matchRatio >= 0.5 cardIds 校验 ✅
  - P1-9 路由入口 3 处 (Layout/LessonDetail/WordDetail) ✅
  - B P1-2 toast.warning ✅
  - B P1-3 响应式 grid ✅
  - B P1-4 lessonTitleMap 反查 ✅
  - B P1-5 ✕ 按钮 ✅
  - B P1-6 formatTimeAgo ✅
  - useMemo 链正确 ✅
  - 兼容旧 API ✅
- 加 2 测试 (R1 cardIds + R2 MAX_SCORES 边界)

## 累计数据 (v1.95.0)
- **95 release tag** (v0.1.0 ~ v1.95.0) / 17 周 / **24 次大 review** (含 2 verifier 抗审查)
- **974 单元测试** (962 + 12) / 72 文件
- **5,423 词 / 100% 词根 / 5,129 词含短语 (94.9%)**
- **20 篇课文 / 244 同义词组**
- **7 大激活功能**: 触类旁通 / 听写 / 拼写 / 跟读评分 / 跟读趋势 / 释义收藏 / 错题复习
- 0 P0 + 0 P1 业务 维持

## 关键经验 (W89)
- **Verifier 验证闭环**: W88 修 v1 → Verifier 验证 PASS → 主人加 2 建议测试 → 974 全过. 这是 verifier 抗审查完整循环, 不只是修 bug, 还要验证修对了.
- **状态分层**: `followScore` 是当前题评分, `sentenceScores` 是历史最好分. UI 显示当前题反馈 + 历史最好分指示器, 让用户有持续进步感.
- **TTS 重听**: `speak({ text, rate: 0.8 })` 复用 W83 跟读模式, 0 额外依赖.
- **setTimeout 链式 TTS**: 4s/句, 可中断 (用户点新句), 简单但够用.

## 下一阶段 (W89-B 候选)
1. **真机测试 5 步** (15 min, 验收 v1.89-v1.95 部署)
2. **错题复习增强** (难度自适应 / 评分历史)
3. **释义收藏增强** (按词性过滤 / 批量导出)
4. **W88-D 继续补 246 词短语** (5-9 字符)
5. **跟读评分增强 v2** (按句统计图 / 重听评分对照)
6. **课文评分** (跨课复用 36 词的掌握度)
