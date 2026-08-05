# v2.0.9 W101-W104 - SUMMARY

> 第 109 个 release tag, **1120 单元测试 / 87 文件**
> 4 release 一起: W101 数据一致性 + W102 跨页集成 + W103 Firefox + W104 持久化

## 业务承诺 (4 release 一起)

### W101 数据 一致性 校验 (业务 价值 高)
- 5,423 词 100% 校验 (0 issue)
- 5 类型: pos_format / missing_translation / empty_examples / empty_phrases / empty_roots
- 修 4 词 pos 格式 (maximum/okay/reverse + 一 hidden)
- scripts/w101-check.py: 跑 真实 words.json 业务 价值
- 业务 价值: 防 AI 写入 残留

### W102 释义收藏 跨页 集成 (业务 价值 高)
- 词库 点 '⭐ N 收藏' 跳 释义收藏 跨词 模式
- URL ?word=xxx 跨页 query
- 跳 后 自动 跨词 + 预 填 + 渲染 命中
- 业务 价值: 跨页 数据流 业务 跑通

### W103 滚动 条 Firefox 兼容 (业务 价值 中)
- scrollbar-width: thin
- scrollbar-color 跟 主题
- Webkit 滚动 条 仍 OK

### W104 导航 后 滚 动 位置 持久化 (业务 价值 中)
- navRef + scrollPosRef
- cleanup 函数 保存 scrollTop
- useEffect 恢复 scrollTop
- 业务 价值: 22 项 底部 点 跳 不 用 重 滑

## 改动 (3 commit)

### W101+W102 commit 5ebfa30
- src/lib/dataConsistency.ts: 61 行
- scripts/w101-check.py + scripts/w101_check.ts
- src/components/WordCard.tsx: 加 favCount + onClickFavs props
- src/pages/WordList.tsx: 加 favCountMap + handleClickFavs
- src/pages/TranslationFavsPage.tsx: useSearchParams 跨页
- public/data/words.json: 4 词 pos 修
- tests/dataConsistency.test.ts: 11 测试
- tests/translationFavCrossPage.test.ts: 4 测试

### W103+W104 commit f48b27b
- src/index.css: scrollbar-width + scrollbar-color
- src/components/Layout.tsx: navRef + scrollPosRef
- tests/w103-w104-polish.test.ts: 5 测试

## 累计数据 (v2.0.9)

- **109 release tag** / 18+ 周 / **33 次大 review** (含 12 verifier 抗审查)
- **1120 单元测试** (1105 → 1120) / 87 文件
- **5,423 词 / 100% 数据 一致性 校验 PASS**
- 20 篇课文 / 244 同义词组 / 78 反义词
- 0 P0 + 0 P1 业务 维持
- 24 P0 + 49 P1 累计修

## 部署
- **main**: `f48b27b` ✅ pushed
- **gh-pages**: `e030900` ✅ pushed
- **预览**: https://lingoo12138.github.io/english-app/

## W105 候选
- 1100 测试 冲刺 (已 1120)
- P2-9 mobileNav 注释
- 第 34 次大 review
- 真机测试 5 步
- 新 业务 功能 (用户 提 需求)
