# v1.93 收官总结 (W87-A 完结)

## 时间线
- **W87-A** (v1.93.0) — 错题复习模式 (Flashcard)
- 主人全做 (W83-W87 模式延续)
- 拉 2 verifier (A+B) 跑对抗 review, 找到 4 P0 + 12 P1, 主人修 v1 全修
- verifier 抗审查 = 0 P0 + 0 P1 业务维持

## v1.93 W87-A 新功能
- **错题复习模式 (Flashcard)**:
  - src/lib/errorReview.ts: 兼容旧 export + 新功能
    - writingToCard / dictationToCard (多错 hint 全显, ts desc 排序)
    - scoreAnswer (字符 60% + 词 40%, multiset 去空格, 跟 dictation 对齐)
    - gradeAnswer (perfect / good / ok / bad / wrong)
    - 队列模型 ReviewSession: remaining 数组
    - answerInSession: 答对 shift, 答错 shift+push 末尾, 偷看 0 分
    - sessionProgress (done/total)
  - src/pages/ErrorReviewPage.tsx: UI
    - 进度条 + 卡片翻转 + 偷看 (标 0 分) + 答题历史 (展开)
    - 4 入口空态 (写作/听写/拼写/跟读)
    - 加载错误态 (避免 '暂无错题' 误导)
    - 答完 autoFocus 下一题按钮
  - src/App.tsx: 路由 /errors/review
  - src/pages/ErrorsPage.tsx: '🔁 复习模式' 按钮

## Verifier 抗审查 (W87-A 关键)
- **Verifier A (算法/状态)**: FAIL, 3 P1 (字符权重反向 / focus 闭包竞态 / 完成 toast 死代码)
- **Verifier B (业务/UX)**: FAIL, 4 P0 (移出池/答错留/偷看 0/完成死分支)
- **主人修 v1 全修**: 字符权重改 0.6/0.4 + multiset + 队列 + 偷看 0 分 + useEffect focus + 完成 summary toast

## 累计数据 (v1.93.0)
- **93 release tag** (v0.1.0 ~ v1.93.0) / 17 周 / **22 次大 review** (含 2 verifier 抗审查)
- **939 单元测试** (917 + 22) / 68 文件
- **450+ commit** / 27 页面 / 32 组件 / 50 库
- **5,423 词 / 100% 词根** / **20 篇课文** / **244 同义词**
- **跟读 + 听写 + 拼写 + 触类旁通 + 释义收藏 + 错题复习 (W87 新)** 6 大激活功能
- 0 P0 + 0 P1 业务 维持

## 关键经验 (W87)
- **Verifier 抗审查价值**: A+B 找出 4 P0 + 15 P1, 主人单独 review 漏 90%. 业务级 bug 算法测试都过, UI/状态机漏.
- **队列模型**: 答对 shift + 答错 shift+push 末尾, 实现 '答对移出 / 答错留' 业务承诺.
- **偷看 0 分**: 不阻止, 但强制 0 + history 标 peeked, 审计 + 简化流程.
- **字符 multiset**: Set 去重错误, 重复字符 (mississippi) 永远吃亏, 改 frequency map.
- **useEffect 替代 autoFocus**: 同步 setState 后 focus 不可靠, 改 useEffect on state 切.
- **4 P0 全修**: 移出 / 留 / 偷看 / 完成, 4 个独立业务承诺都修.
- **amend commit**: 修 v1 用 git commit --amend, 不开新 commit, 部署版本号一致.

## 下一阶段 (W88 候选)
1. **第 23 次大 review** (拉 1-2 verifier 跑 W87-A 修 v1)
2. **真机测试 5 步** (15 min, 验收 v1.89-v1.93 部署)
3. **错题复习增强** (session 持久化 IDB / 难度自适应)
4. **释义收藏列表页** (复用 Notebook 模式)
5. **跟读评分趋势图** (得分曲线)
6. **10+ 字符专业词根补全** (5 词, ROI 低)
