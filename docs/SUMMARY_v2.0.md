# v2.0.0 W91 错题复习 IDB 永久持久化 - SUMMARY

> 第 100 个 release tag, **1031 单元测试 / 77 文件** ⭐
> "完结"前的最后冲刺, 主线收官的最后一块

## 业务承诺

W91 解决了 verifier B (W90) 找出的 **P0-2 localStorage 架构缺陷**:
- 之前: session 完成后清空, 全部历史丢失
- 现在: IDB 永久, session 仅做"继续上次/重新开始", 跨 session 累计

## 改动 (5 commit)

### 1. W91 v2.0.0 commit b6f09ed
- IDB **v9** schema 新表 `errorReviewHistory` (++id, cardId, ts, score, source)
- `ErrorReviewScore` interface + 4 helpers (addErrorReviewScore / getAll / getByCard / clear)
- `ErrorReviewPage.handleSubmit` 永久存 IDB
- `ErrorHistoryPage` 优先 IDB, fallback session
- 6 测试

### 2. W91 修 v1 commit ed8290f (verifier A 找 1 P0 + 4 P1/P2)
- P0-1: 删 session fallback, IDB 是 source of truth (mid-session 双倍计数)
- P1-A: addErrorReviewScore 加 try/catch + handleDbError
- P1-C: 删 score/source 索引, 改 '++id, cardId, ts' (ts 留为 getAll orderBy)
- P2-A: ErrorHistoryPage 加 '🗑️ 清除历史' 按钮
- P2-G: 偷看 0 分不入 IDB
- 测试改写 (闭包共享修复) + 7 测试

### 3. W91 修 v2 commit 6f71ec7 (verifier B 找 1 P0 + 6 P1/P2)
- **P0-2**: `updateCardDifficulty` 二次 append (W89-B 历史 bug)
  - 修: 信任 `answerInSession` 已 append, updateCardDifficulty 仅改 remaining
  - 同步修 tests/errorDifficulty.test.ts 3 个 it
- P1-1: 答完 summary 加 '📊 错题统计' 入口
- P1-2: IDB 写入失败 toast 提示 (不静默吞错)
- **P1-3**: 删 vi.mock, 改 fake-indexeddb 真测 (跟 db.test.ts 同样模式)
- P1-4: clearErrorReviewScores UI 入口 (修 v1 已加, 此处确认)
- P1-5: 删错题时级联清理 errorReviewHistory
- P1-6: 拆错题卡数 + 复习次数 (语义)
- P2-2: 跟读按钮 /listen → /textbook

## 累计数据 (v2.0.0 W91)

- **100 release tag** / 17+ 周 / **25 次大 review** (含 2 verifier 抗审查完整循环 W87 + W91)
- **1031 单元测试** (1029 → 1031) / 77 文件 / 全过 ⭐ **稳定 1000+**
- 5,423 词 / 5,423 词根 (100%) / 5,129 词短语 (94.9%)
- 20 篇课文 / 244 同义词组 / 78 反义词
- **7 大激活功能**: 触类旁通 / 听写 / 拼写 / 跟读评分 / 跟读趋势 / 释义收藏 / **错题复习 (永久 IDB)**
- 130+ bug 修复 (含 verifier 抗审查累计 **9 P0 + 39 P1**)

## Verifier 抗审查经验 (W91 完整循环)

W87 + W91 两次完整循环, 找到 **9 P0 真业务塌方**:
- W87: 4 P0 (移出池未实现 / 答错留形同虚设 / 偷看零成本 / 完成按钮死代码)
- W91: 2 P0 (mid-session 双倍计数 / updateCardDifficulty 二次 append)

**核心经验**:
1. 业务级 bug 算法测试都过, 业务流程闭环漏
2. 测试 vi.mock 整模块 = 假阳性, 必用 fake-indexeddb 真测
3. 双源合并必去重 (IDB + session)
4. W89-B 历史 bug 可能叠加 W91, 需独立 verifier 找
5. session 完成后清空 = 全部历史丢失 = 架构缺陷, IDB 必永久

## 新增 IDB 迁移路径 (v8 → v9)

- 老用户自动升 v9, errorReviewHistory 表空, 老数据不丢
- 老用户 session (localStorage) 兼容期保留, W92 之后清理
- 新用户 IDB 走, session 仅"继续上次"用

## 测试

1031 测试 / 77 文件:
- errorReviewHistory.test.ts: 12 测试 (fake-indexeddb 真测 v8→v9 + Dexie auto-increment + clear)
- errorDifficulty.test.ts: 16 测试 (修 v1: caller 负责 append, updateCardDifficulty 仅改 remaining)
- ErrorReviewPage 路由闭环: /errors/review → /errors/history
- ErrorHistoryPage 跨 session 累计 + 清除历史 + 总数拆错题卡/复习次数

## 下一步

W92 候选:
- **真机测试 5 步** (15 min, 验收 v1.89-v2.0 部署)
- **第 27 次大 review** (拉 1-2 verifier 跑 v2.0 验证)
- W88-D 继续补 246 词短语 (5-9 字符 → 100%)
- 课文评分 (跨课复用 36 词掌握度)
- 错题复习答题模式 (Anki 风格: 用户抄写答案)
- 1100 测试冲刺 (新功能 + 覆盖率)
