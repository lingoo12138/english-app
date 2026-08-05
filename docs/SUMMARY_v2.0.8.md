# v2.0.8 W100 侧边栏 滚动 修复 - SUMMARY

> 第 108 个 release tag, **1105 单元测试 / 85 文件**
> 业务 bug 修复 (W100) + 11 verifier 抗审查 全 完整 循环

## 业务 bug

桌面 侧边栏 22 项 nav 在 屏幕 < 1100px 时 末 3 项 (跟读趋势/成就/文档) 不可访问.

- 之前: aside 没 overflow 控制, header 没 flex-shrink-0, nav 没 min-h-0 + overflow-y-auto
- 实际 阈值 ~1100px (header 102px + nav padding 32px + 22 项 * 44px = 1102px)
- 1080p 显示器 (可用 ~960px) 也 滚, 不只小屏

## 改动 (3 commit + docs)

### W100 主 commit 5c70688
- src/components/Layout.tsx (改 桌面 aside/nav/header):
  - aside 加 md:overflow-hidden
  - header 改 flex-shrink-0
  - nav 加 min-h-0 + overflow-y-auto
- tests/layout-scroll.test.ts (2 测试)

### W100 修 v1 commit f4795ec
- verifier 找 5 P1 + 5 P2, 修 P1-1~5 全 修, P2 暂 留:
  - P1-1: 测 试 1 正则 不 强制 md: 前缀 → 改 锚定 md:overflow-hidden
  - P1-2: **min-h-0 漏 (业务 关键)** → 加 min-h-0 + flex-1 断言
  - P1-3: **22 项 全 渲染 漏** → 加 RTL render 测 + 末 3 项 验证
  - P1-4: 跨 设备 不 变 漏 → 加 桌面 hidden md:flex + 移动 md:hidden
  - P1-5: 标 错 W99 → 改 W100
- 依赖: @testing-library/react (新 装)

### docs commit 7acc03b + 本次
- README/ROADMAP/CHANGELOG 数字 校准 (1105 测试, 11 verifier 抗审查, 32 次大 review)

## 累计数据 (v2.0.8 W100)

- **108 release tag** / 18+ 周 / **32 次大 review** (含 11 verifier 抗审查)
- **1105 单元测试** (1099 → 1105, +6) / 85 文件
- **5,423 词 / 100% 词根 / 100% 短语 / 100% pos / 100% examples** ⭐
- 20 篇课文 / 244 同义词组 / 78 反义词
- 7 大激活功能 + 释义收藏 跨词 + 课文评分
- 28 页面 / 33 组件 / 52 库 / 500+ commit
- 24 P0 + 49 P1 累计修
- 0 P0 + 0 P1 业务 维持

## 部署

- **main**: `7acc03b` ✅ pushed
- **gh-pages**: `6963626` ✅ pushed
- **预览**: https://lingoo12138.github.io/english-app/

## W101 候选

- 释义收藏 跨词 跨页 集成
- 1100 测试 冲刺 (已 1105)
- P2 滚动 条 Firefox 兼容
- P2 导航 后 滚 动 位置 持久化
- 第 33 次大 review
- 真机测试 5 步
- 数据 一致性 校验
