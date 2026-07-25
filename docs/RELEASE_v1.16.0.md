# v1.16.0 Release Notes - 多场景关联

**发布日期**: 2026-07-25
**类型**: W17 候选 B6 (1d 完成)
**北极星对齐**: 学得会 (闭环"自定义场景"学完 → 入复习队列)

---

## 🎯 核心变更: 学完入复习

v1.14.0 自定义场景 + v1.15 卡片学习流 + v1.11 复习队列, 通过本次 v1.16.0 串成完整闭环。

### 完整用户旅程
```
v1.14.0: 粘贴文本 → AI 提取 → 保存场景
v1.15.0: 卡片学习流 (翻面/翻页/收藏)
v1.16.0: 学完 → 📚 加入复习队列
v1.11.0: ReviewCenter 智能排序复习
v1.11.0: FSRS 算法优化间隔
```

---

## 🛠️ 技术决策

### 为何用 `customScene:` 前缀作 wordId?
- 区分来源 (自定义 vs 生词本 vs 通用)
- 避免与真实 wordId 冲突
- 未来: 多源词统一管理

### 为何 IDB reviews 表 (而非新建 fsrsCards)?
- fsrsCards 是 v1.11 新表, 默认 useFSRS=false
- reviews 表 (SM-2) 向后兼容, 默认开启
- 不引新表 = 简单

### 为何幂等 (跳过已存)?
- 用户重学同一场景不应覆盖学习进度
- 间隔/难度/次数应保留用户实际学习历史
- 与 reviewWord() 行为一致

### 为何立即可复习 (nextReview=now)?
- 学完 = 已看过, 立即复习加深印象
- 用户可在 ReviewCenter 看到新词
- 符合艾宾浩斯遗忘曲线 (短期高频复习)

### 为何列表显示"复习中"数?
- 让用户感知学习闭环
- 鼓励: 学完 → 入复习 → 看到复习数增加
- 进度可视化

---

## 📊 数据变化

| 指标 | v1.15.0 | v1.16.0 | 增量 |
|-----|---------|---------|------|
| 库数 | 31 | 32 | +1 (sceneReview) |
| 单元测试 | 372 | 390 | +18 |
| 测试文件 | 28 | 29 | +1 |
| 闭环 | 学完词卡 | 学完 + 入复习 | 完整闭环 |
| 0 P0/P1/P2 | 维持 | 维持 | 维持 |

---

## 🎨 UI 效果

### CustomSceneLearn 完成态 (新增"加入复习队列")
```
🎉
学完啦!
你已完成 "我的工作邮件" 的 15 个生词

[📚 加入复习队列] [🔄 再学一遍] [← 返回详情]
```

### CustomSceneDetail 复习状态卡片
```
┌─────────────────────────────────┐
│ 📊 复习状态                     │
│  15    12    3                   │
│ 总词  复习中  已掌握             │
└─────────────────────────────────┘
```

### CustomScenes 列表
```
• 我的工作邮件  15 词 📚 12 复习中 · 2026-07-25
• AI 入门文章  22 词 📚 22 复习中 · 2026-07-24
```

---

## 🔄 迁移指南

**无破坏性变更**:
- 老用户的 reviews 表不受影响 (旧数据保留)
- IDB v5 → v6 升级 (新增 sceneReview 函数无新表)
- UI 仅新增卡片/标签, 不改老功能

**新增 API**:
```ts
// 学完时入复习
import { addSceneWordsToReview, getSceneReviewStatus } from '@/lib/sceneReview'

await addSceneWordsToReview(scene.words, scene.title)
// → { added: 12, skipped: 3 }

const status = await getSceneReviewStatus(scene.words)
// → { totalWords: 15, inReviewCount: 12, masteredCount: 3 }
```

---

## ✅ 验证清单

- [x] `npx tsc --noEmit` 0 错误
- [x] `npx vite build` 成功 (PWA 55 entries 1710 KiB)
- [x] `node scripts/verify-v1.16.0.mjs` 13/13 静态 + 18/18 测试
- [x] `python3 scripts/review-v1.16.0.py` **29/29 — 0 P0 + 0 P1 + 0 P2**
- [x] 现有 sceneReview 18 + customScenes 32 + customSceneLearn 16 测试全过
- [x] v1.6/11/13/14/15 全部保护通过
- [x] 7 处 `catch (e: any)` 全部消除

---

## 📝 文档同步

- `docs/CHANGELOG.md` 加 v1.16.0 段
- `docs/RELEASE_v1.16.0.md` 新建
- `README.md` 标题/进度/表格/章节
- `package.json` 1.15.0 → 1.16.0
- `docs/plans/v1.16.0-scene-to-review.md` 已存
- `scripts/verify-v1.16.0.mjs` + `scripts/review-v1.16.0.py` 新建

---

## 🎯 W18+ 候选 (下次决策)

- **B12 跟读评测升级** (4-5d, ROI 低): 音素级评分
- **真机测试** (没机器)
- **多角色扩展** (1d, ROI 中): 加 2-3 角色
- **文件上传** (1-2d, ROI 中): PDF/TXT 上传
- **学习日历** (1d, ROI 中): 每日学习可视化 (复用 ReportsPage)
- **生词本批量操作** (1d, ROI 中): 批量移入复习/批量删除

---

**Commit**: 3 个 feat + docs + tag v1.16.0
**测试**: 390 单元测试 + 16 闭环 + 29 静态审查
**零 P0/P1/P2 维持**
