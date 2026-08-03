# v1.99 收官总结 (W90 完结)

## 时间线
- **W90** (v1.99.0) — 错题复习统计页 + verifier 抗审查
- 主人全做 (W83+ 模式)
- 拉 2 verifier (A+B) 跑对抗 review, 找到 **3 P0 + 多 P1**
- 主人修 v1 全修 (接 session 真数据 + 纯函数 + nav 入口 + 性能 + 50 字符截断)

## v1.99 W90 新功能
- **错题复习统计页** (`/errors/history`):
  - 4 大统计卡片: 总数 / 已掌握 / 难词 / 有答对过
  - 按 source 分组: ✍️写作 / 💬对话 / 🇨🇳中译英 / 🎧听写 / 🔤拼写 / 🎤跟读
  - 3 排序: 按难度 / 按时间 / 按次数
  - 过滤: 隐藏已掌握
  - 横向条形图: 每张卡一行, 颜色按 avg (绿/琥珀/红), 显示 avg+attempts+趋势+best
  - 错题原文 (line-through) + 正确答案 (绿)
- 复用 W89-B `analyzeScores` 纯函数 (修 v1)
- 复用 W88-C `loadSession` + `extractHistoryMap` (修 v1 接真数据)

## 关键 bug 修复 (verifier 抗审查 完整循环)
- **P0-1 (业务塌方)**: 全部 scores 永远 = 0 → loadSession() + extractHistoryMap() 接真数据
- **P0-2 (类型债)**: mockSession `as any` → 拆 `analyzeScores` 纯函数
- **P0-3 (UX 阻断)**: nav 无入口 → Layout desktopNav 加 '错题统计'
- **P1 性能**: N×logN 次重复分析 → useMemo `analyzedMap` 缓存
- **P2-2 (UX)**: 50 字符截断无 … → 加省略号
- **P1 死代码**: `extractHistoryMap` 在生产用 (W90 接), `groupBySource` 仍保留 (W91 计划用)

## 累计数据 (v1.99.0)
- **99 release tag** / 17 周 / **25 次大 review** (含 2 verifier 抗审查)
- **1023 单元测试** (1006 + 17) / 76 文件
- 5,423 词 / 100% 词根 / 5,129 词含短语 (94.9%)
- 20 篇课文 / 244 同义词组
- 0 P0 + 0 P1 业务 维持

## 关键经验 (W90)
- **verifier 抗审查价值**: W90 找到 3 P0 (业务塌方 + 类型债 + UX 阻断), 主人单独 review 漏. 业务级 bug 算测试都过, 业务流程闭环漏.
- **mockSession as any 风险**: TS strict 是闸门, 跳过 `as any` 闸门就是跳过安全网. 纯函数更可靠.
- **数据流闭环**: W90 显式传 `{}` 是简化, 但业务承诺 "错题统计" 实际是 "空统计". 简化要标 TODO, 不要发版时埋雷.
- **extractHistoryMap 死代码复活**: 写了没用的函数, verifier 标 Dead-1, 修 v1 真正接上后从死代码变活.
- **Layout nav 入口**: 路由可达 ≠ 用户能进, Layout nav 是用户唯一发现机制.

## 下一阶段 (W91 候选)
1. **真机测试 5 步** (15 min, 验收 v1.89-v1.99 部署)
2. **第 26 次大 review** (拉 1-2 verifier 跑 v1.99 验证)
3. **W88-D 继续补 246 词短语** (5-9 字符)
4. **错题 IDB 持久化** (修 B P0-2 localStorage 架构缺陷)
5. **课文评分** (跨课复用 36 词掌握度)
6. **错题复习答题模式** (Anki 风格: 用户抄写答案)
