# v1.96 收官总结 (W89-B 完结)

## 时间线
- **W89-B** (v1.96.0) — 错题复习增强 (难度自适应 + 评分历史)
- 主人全做 (W83+ 模式)
- 主人 3 维 review 0 P0, 0 P1

## v1.96 W89-B 新功能 (3 大块)
- **错题难度自适应 (4 档)**:
  - 🌟 mastered: 答对 >= 80 次数 >= 3 → 从复习池移出
  - 🟢 easy: avg >= 80
  - 🟡 medium: 默认
  - 🔴 hard: 答错 < 40 次数 >= 2 OR avg < 40 → 推末尾加深
- **评分历史 (题目区)**:
  - '📊 最近 N 次分数' + best/worst
  - 趋势 ↑↓→ (最近 3 次 vs 前 3 次)
  - 颜色按分数 (绿/琥珀/红)
- **池中难度统计 (顶部进度区)**:
  - '🌟 掌握 X / 🟢 易 X / 🟡 中 X / 🔴 难 X'

- src/lib/errorDifficulty.ts: analyzeCard / updateCardDifficulty / difficultyStyle / trendArrow / countByDifficulty
- src/pages/ErrorReviewPage.tsx: 题目区难度标签 + 评分历史 + 池中统计 + handleSubmit 应用 updateCardDifficulty
- tests/errorDifficulty.test.ts: 12 个测试

## 累计数据 (v1.96.0)
- **96 release tag** (v0.1.0 ~ v1.96.0) / 17 周 / **24 次大 review** (含 2 verifier 抗审查)
- **986 单元测试** (974 + 12) / 73 文件
- **5,423 词 / 100% 词根** / 5,129 词含短语 (94.9%)
- **20 篇课文 / 244 同义词组**
- **7 大激活功能**: 触类旁通 / 听写 / 拼写 / 跟读评分 / 跟读趋势 / 释义收藏 / 错题复习
- 0 P0 + 0 P1 业务 维持

## 关键经验 (W89-B)
- **4 档难度阈值**: 答对 3 次 >= 80 = mastered (Anki 风格), 答错 2 次 < 40 = hard. 阈值比直觉低, 给用户成就感.
- **池中统计**: 实时算 countByDifficulty 性能可接受 (几百卡 < 1ms), 用户看到 '🌟 掌握 5' 立刻有反馈.
- **评分历史趋势**: 最近 3 次 vs 前 3 次 avg, 差 10+ 分才标 up/down, 避免抖动.
- **题目区难度标签**: 0 attempts 不显示, 避免噪音 (新卡看不出难度).

## 下一阶段 (W89-C/W90 候选)
1. **真机测试 5 步** (15 min, 验收 v1.89-v1.96 部署)
2. **释义收藏增强** (按词性过滤 / 批量导出)
3. **W88-D 继续补 246 词短语** (5-9 字符)
4. **跟读评分增强 v2** (按句统计图 / 重听评分对照)
5. **课文评分** (跨课复用 36 词的掌握度)
6. **第 25 次大 review** (拉 1-2 verifier 跑 v1.96 验证)
