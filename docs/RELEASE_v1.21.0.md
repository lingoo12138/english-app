# v1.21.0 Release Notes - 生词本标签

**发布日期**: 2026-07-25
**类型**: W22 候选 B11 (1d 完成)
**北极星对齐**: 触发可业 (自定义分类) + 学得会 (按 tag 复习)

---

## 🎯 核心变更: 标签系统

收藏的词可以打多个 tag, 顶部按 tag 过滤查看。7 类启发式建议 (work/travel/food/study/tech/sport/health), 7 配色循环。

---

## 🛠️ 技术决策

### 为何 IDB v6 (新表) 而非 v5 加字段?
- 标签是 many-to-many (一词多 tag, 一 tag 多词)
- 加字段需要 array, 不灵活
- 新表 + compound index 性能更好

### 为何启发式 7 类?
- 覆盖日常 90% 场景
- 不引 NLP (简单关键词匹配)
- 用户可手动加任意 tag

### 为何每词限 10 tag?
- 避免 tag 滥用
- UI 渲染不爆
- 实际场景 3-5 tag 足够

### 为何总 tag 限 50?
- 防止 label 爆炸
- 配色只有 7 个 (哈希冲突)
- 用户可手动管理

### 为何小写化?
- "Work" 和 "work" 应等同
- 避免 UI 大小写混杂
- 排序更稳

---

## 📊 数据变化

| 指标 | v1.20.0 | v1.21.0 | 增量 |
|-----|---------|---------|------|
| 库数 | 35 | 36 | +1 (wordTags) |
| IDB | v5 | v6 | +1 表 |
| 单元测试 | 460 | 496 | +36 |
| 0 P0/P1/P2 | 维持 | 维持 | 维持 |

---

## 🎨 UI 效果

### Notebook 词条
```
┌─────────────────────────────────┐
│ ☑ apple                          │
│ /ˈæp.əl/                         │
│ 苹果 · 水果                      │
│ [work] [food×] [+]tag            │ ← v1.21.0
│                              🔊 ✕│
└─────────────────────────────────┘
```

### 顶部 tag 过滤栏
```
按 tag 过滤: [全部 (50)] [work (12)] [food (8)] [tech (5)]
```

---

## 🔄 迁移指南

**无破坏性变更**:
- IDB v5 → v6 自动升级 (加 wordTags 表)
- 老用户的 favorites/reviews/sceneTags 不受影响
- 现有收藏的词可以随时加 tag

**新增 API**:
```ts
import { addTagsToWord, getAllTagsWithCount, buildWordTagMap, suggestTagsFromWord, getTagColor } from '@/lib/wordTags'

await addTagsToWord('apple', ['work', 'food'])
const tags = await getAllTagsWithCount()  // [{ tag, count }]
const map = await buildWordTagMap()  // Map<wordId, Set<tag>>
const suggestions = suggestTagsFromWord('computer')  // ['tech']
```

---

## ✅ 验证清单

- [x] `npx tsc --noEmit` 0 错误
- [x] `npx vite build` 成功 (PWA 57 entries 1731 KiB)
- [x] `node scripts/verify-v1.21.0.mjs` 19/19 静态 + 36/36 测试
- [x] `python3 scripts/review-v1.21.0.py` **35/35 — 0 P0 + 0 P1 + 0 P2**
- [x] 现有 wordTags 36 + notebookBulk 20 + fileUpload 23 + learningCalendar 21 测试全过
- [x] v1.6/11/14/16/18/19/20 全部保护通过
- [x] 5 处 `catch (e: any)` 全部消除

---

## 📝 文档同步

- `docs/CHANGELOG.md` 加 v1.21.0 段
- `docs/RELEASE_v1.21.0.md` 新建
- `README.md` 标题/进度/表格/章节
- `package.json` 1.20.0 → 1.21.0
- `docs/plans/v1.21.0-word-tags.md` 已存
- `scripts/verify-v1.21.0.mjs` + `scripts/review-v1.21.0.py` 新建

---

## 🎯 W23+ 候选 (下次决策)

- **PDF 上传** (1-2d, ROI 中): 引 pdfjs-dist
- **角色进一步扩展** (1d, ROI 中): 教师/律师/工程师
- **学习提醒** (1d, ROI 中): Notification API 每日 9 点
- **跟读评测升级** (4-5d, ROI 低): 音素级评分
- **复习按 tag 过滤** (1d, ROI 中): 复用 ReviewCenter + tag

---

**Commit**: 3 个 feat + docs + tag v1.21.0 + push
**测试**: 496 单元测试 + 16 闭环 + 35 静态审查
**零 P0/P1/P2 维持**
