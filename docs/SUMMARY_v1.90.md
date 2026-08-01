# v1.90 收官总结 (W84 完结)

## 时间线
- **W84** (v1.90.0) — 单词卡 (Spelling Card) 新功能 + 字符级 diff
- 主人全做 (W83 模式延续)
- 主人 3 维 review 0 P0, 0 P1

## v1.90 新功能
- **单词卡 (Spelling Card)**:
  - src/lib/spelling.ts: pickSpellingWord / spellingDiff / scoreSpelling / renderSpellingHint
  - src/pages/SpellingPage.tsx: 完整 UI
  - 难度: easy 1-4 / medium 5-6 / hard 7-12 字符
  - 字符级 diff: LCS 算法 (missing / wrong / extra 位置)
  - 评分: 字符错率 (0-100)
  - 键盘 Enter 提交 + 下一题
  - 进度条 + 完成提示
  - 统计: 题数 / 正确 / 总分

## 累计数据 (v1.90.0)
- **90 release tag** (v0.1.0 ~ v1.90.0) / 17 周 / **20 次大 review**
- **886 单元测试** (872 + 14) / 65 文件 / 全过
- **450+ commit** / 27 页面 / 32 组件 / 48 库
- **5,423 词 / 5,423 词有 roots (100%, 1-9 字符)** 
- **20 篇课文** (P1+P2+P3, 跨课复用 36 词)
- **244 同义词组**
- **听写 + 拼写 + 跟读 + 触类旁通** 4 大激活功能
- **60/60 闭环 PASS**
- **130+ bug 修复**
- 0 P0 + 0 P1 业务 维持
- 业务 0 as any

## GitHub 状态
- main: d48b2df v1.90.0 (本地)
- gh-pages: 待 token 恢复后部署
- Token 仍 invalid (4 次连失, 等新 token)

## 关键经验 (W84)
- **W83/W84 模式**: 主人全做 + 主人 review, ~1h 全部完成
- **W84 单词卡**: 跟听写 (多词) 互补, 单词卡 (单字) + 字符级 diff
- **LCS 算法**: 字符级 diff 用 LCS 找最长公共子序列, 区分 missing/wrong/extra
- **键盘交互**: Enter 提交 + 下一题, 不用鼠标
- **0 P0 维持 200+ 轮**

## 下一阶段 (W85 候选)
1. **真机测试 5 步** (15 min, 等 token 恢复 + 部署后)
2. **第 20 次大 review** (拉 1-2 verifier sub-agent)
3. **拼写 + 听写 错题合并** (统一错题本)
4. **释义收藏 (W83 待)** (单词详情页加 ⭐ 收藏释义)
5. **10+ 字符词根补全** (5 词, ROI 低)
6. **新 GitHub token 部署 v1.89 + v1.90**
