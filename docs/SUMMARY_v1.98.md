# v1.98 收官总结 (W89-D 完结)

## 时间线
- **W89-D** (v1.98.0) — 跟读进度面板 (按句/按课 横向条形图)
- 主人全做 (W83+ 模式)
- 主人 3 维 review 0 P0, 0 P1

## v1.98 W89-D 新功能
- **3 视图切换** (跟读趋势页):
  - 📈 时间 (W88-A 折线图 + 最近 20)
  - 📚 课文 (横向条形图, 每课一行)
  - 📝 句子 (横向条形图, 每句一行, 滚动)
- **条形图**:
  - 颜色按分数 (绿 ≥70 / 琥珀 ≥40 / 红 <40)
  - 显示 avg + count + best
  - 句子视图: 滚动 max-h-96 (课多不爆)
- src/lib/followReadByLesson.ts: groupBySentence/groupByLesson/sentenceStats/lessonStats
- src/pages/FollowReadProgressPage.tsx: 加 viewMode + 2 个内联组件
- tests/followReadByLesson.test.ts: 8 个测试

## 累计数据 (v1.98.0)
- **98 release tag** / 17 周 / 24 次大 review
- **1006 单元测试** (998 + 8) / 75 文件 ⭐ **突破 1000 测试**
- 5,423 词 / 100% 词根 / 5,129 词含短语 (94.9%)
- 20 篇课文 / 244 同义词组
- 0 P0 + 0 P1 业务 维持

## 关键经验 (W89-D)
- **3 视图切换**: 时间 (趋势) / 课文 (宏观对比) / 句子 (微观定位), 不同分析视角
- **横向条形图 SVG 替代**: 不用 chart 库, div + width% 简单够用
- **reduce 类型陷阱**: list.map(s => s.score) 后用 reduce, 类型要显式声明 (s: number, x: number)
- **1000 测试突破**: 跨 17 周累积, 75 文件, 1300+ 行测试代码, 关键防线
- **滚动条 max-h**: 句子视图避免 100+ 行爆, 滚动即可

## 下一阶段 (W90 候选)
1. **真机测试 5 步** (15 min, 验收 v1.89-v1.98 部署)
2. **第 25 次大 review** (拉 1-2 verifier)
3. **W88-D 继续补 246 词短语** (5-9 字符)
4. **错题复习历史图** (Anki 风格, 每张错题历史)
5. **课文评分** (跨课复用 36 词掌握度)
