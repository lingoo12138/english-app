# v2.0.6 W97 课文评分 - SUMMARY

> 第 106 个 release tag, **1071 单元测试 / 83 文件**
> W96 业务 增强 后, W97 业务 增强: 课文评分

## 业务承诺

20 篇 课文 评分 业务: 用户 答完 课文 后 看 掌握度 排名 + 跨课 复用 词.

## 改动 (1 commit + docs)

### W97 主 commit 9838773
- src/lib/lessonScore.ts: 88 行 (findCrossLessonWords/computeLessonScores/getCrossLessonTotal + LessonScore interface)
- src/pages/LessonScorePage.tsx: 163 行 (总体统计 + filter + 课文列表 + 进度条)
- src/App.tsx: 加 route /textbook/score
- tests/lessonScore.test.ts: 6 测试

### 累计
- 1071 测试 / 83 文件
- 0 P0 + 0 P1 业务

## 累计数据 (v2.0.6 W97)

- **106 release tag** / 17+ 周 / **30 次大 review** (含 8 verifier 抗审查)
- **1071 单元测试** (1065 → 1071) / 83 文件
- **5,423 词 / 100% 词根 / 100% 短语 / 100% pos / 100% examples** ⭐
- 20 篇课文 / 244 同义词组 / 78 反义词
- **7 大激活功能**
- 130+ bug 修复 (含 verifier 抗审查累计 **21 P0 + 39 P1**)

## W98 候选

- 释义收藏 跨词搜索
- 1100 测试冲刺
- 数据一致性校验
- 第 31 次大 review
- 真机测试 5 步
