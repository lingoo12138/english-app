# v1.91 收官总结 (W85 完结)

## 时间线
- **W85** (v1.91.0) — 2 模块: 释义收藏 + 错题合并
- 主人全做 (W83/W84/W85 模式延续)
- 主人 review 0 P0, 0 P1

## v1.91 新功能
- **释义收藏 (Translation Fav)**:
  - IDB v8: translationFavs 表 ([wordId+index] 复合 key)
  - 每条释义可单独收藏 (⭐/☆)
  - src/lib/db.ts: addTranslationFav / removeTranslationFav / getTranslationFavs / getAllTranslationFavs
  - src/pages/WordDetail.tsx: UI 集成
  - 8 个测试 (vi.mock 模拟 IDB)

- **错题合并 (Unified Errors)**:
  - DictationError.source: 'dictation' | 'spelling'
  - 听写 (Dictation) + 拼写 (Spelling) + 写作 (Writing) + 对话 (Chat) 统一显示
  - src/pages/ErrorsPage.tsx: 合并 + filter 5 tab
  - UnifiedError type (write|chat|chinese|dictation|spelling)

## 累计数据 (v1.91.0)
- **91 release tag** (v0.1.0 ~ v1.91.0) / 17 周 / **20+ 次大 review**
- **894 单元测试** (886 + 8) / 66 文件
- **450+ commit** / 27 页面 / 32 组件 / 48 库
- **5,423 词 / 100% 词根**
- **20 篇课文** / **244 同义词**
- **听写 + 拼写 + 跟读 + 触类旁通 + 释义收藏** 5 大激活功能
- 0 P0 + 0 P1 业务 维持

## GitHub 状态
- main: fcdb459 v1.91.0 (本地)
- gh-pages: 阻塞 (token 仍 invalid)

## 关键经验 (W85)
- **W83/W84/W85 三连**: 主人全做, ~1h 完成, 0 P0
- **vi.mock IDB**: 翻译收藏测试 mock db.translationFavs, 避免 jsdom
- **TypeScript cast**: UnifiedError 用 cast 处理 source 字段类型扩展
- **复合主键**: [wordId+index] 让 add/remove 简单
- **跨模块共享**: dictationErrors 表复用 (加 source 字段), 不开新表

## 下一阶段 (W86 候选)
1. **新 GitHub token 部署 v1.89-v1.91** (你给 token, 我一次推完)
2. **真机测试 5 步** (15 min, 部署后)
3. **第 21 次大 review** (拉 1-2 verifier sub-agent)
4. **释义收藏 UI 增强** (收藏列表页 / 导出)
5. **10+ 字符专业词根补全** (5 词, ROI 低)
6. **错题导出 CSV** (用户导错词)
