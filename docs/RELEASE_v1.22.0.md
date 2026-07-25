# v1.22.0 Release Notes - 复习按 tag 过滤

**发布日期**: 2026-07-25
**类型**: W23 候选 B12 (1d 完成)
**北极星对齐**: 学得会 (按类别复习)

---

## 🎯 核心变更: 复习 tag 过滤

ReviewCenter 加 tag 过滤栏, 用户能按 tag 复习 (只看某类词), 复用 v1.11 reviewQueue + v1.21 wordTags。

### 用户体验
```
ReviewCenter 顶部:
  tag: [全部] [work (3/5)] [food (1/8)] [tech (0/2)]
       (due/total 格式)

点 "work"
  ↓
复习队列仅含 work tag 的词
  ↓
复习完成 → 标记掌握
  ↓
下次点 "全部" 看完整列表
```

---

## 🛠️ 技术决策

### 为何复用 v1.11 sortReviewQueue?
- 不重写排序逻辑
- 智能排序 vs 时间排 用户已熟
- 1d 模式零成本

### 为何 due/total 格式?
- 直观: "我有 3 个 work 词待复习, 总 5 个 work 词"
- 鼓励: 看到 due=0 不气馁
- 一目了然复习压力

### 为何不强制 tag 复习?
- 用户可选择"全部"
- 鼓励分类, 不强制
- 渐进式养成习惯

### 为何按 due 数降序排 tag 列表?
- 最紧急的 tag 在前
- 减少用户点击次数
- 复习压力可视化

---

## 📊 数据变化

| 指标 | v1.21.0 | v1.22.0 | 增量 |
|-----|---------|---------|------|
| 库数 | 36 | 37 | +1 (taggedReviews) |
| 单元测试 | 496 | 510 | +14 |
| ReviewCenter | 全部 + 智能排序 | + tag 过滤 | +1 维度 |
| 0 P0/P1/P2 | 维持 | 维持 | 维持 |

---

## 🎨 UI 效果

### ReviewCenter 顶部
```
🃏 复习中心
[X 个待复习] [5 个已完成]

tag: [全部] [work (3/5)] [food (1/8)] [tech (0/2)]

✨ 智能排序 ↔
```

---

## 🔄 迁移指南

**无破坏性变更**:
- 老用户可继续 "全部" 复习 (默认)
- tag 过滤是新增, 不强制
- 现有 reviews/sceneTags 不动

**新增 API**:
```ts
import { getReviewsByTag, getAllTagsWithReviewCount, getReviewsByTagWithScore } from '@/lib/taggedReviews'

const reviews = await getReviewsByTag('work', true)
const stats = await getAllTagsWithReviewCount(true)
// [{ tag, count, totalCount }]
const sorted = await getReviewsByTagWithScore('work', true, true)
```

---

## ✅ 验证清单

- [x] `npx tsc --noEmit` 0 错误
- [x] `npx vite build` 成功 (PWA 58 entries 1733 KiB)
- [x] `node scripts/verify-v1.22.0.mjs` 12/12 静态 + 14/14 测试
- [x] `python3 scripts/review-v1.22.0.py` **25/25 — 0 P0 + 0 P1 + 0 P2**
- [x] 现有 taggedReviews 14 + wordTags 36 + notebookBulk 20 测试全过
- [x] v1.6/11/21 全部保护通过
- [x] 5 处 `catch (e: any)` 全部消除

---

## 📝 文档同步

- `docs/CHANGELOG.md` 加 v1.22.0 段
- `docs/RELEASE_v1.22.0.md` 新建
- `README.md` 标题/进度/表格/章节
- `package.json` 1.21.0 → 1.22.0
- `docs/plans/v1.22.0-review-by-tag.md` 已存
- `scripts/verify-v1.22.0.mjs` + `scripts/review-v1.22.0.py` 新建

---

## 🎯 W24+ 候选 (下次决策)

- **PDF 上传** (1-2d, ROI 中): 引 pdfjs-dist
- **角色进一步扩展** (1d, ROI 中): 教师/律师/工程师
- **学习提醒** (1d, ROI 中): Notification API
- **跟读评测升级** (4-5d, ROI 低): 音素级评分
- **tag 合并/重命名** (1d, ROI 中): 批量管理 tag

---

**Commit**: 3 个 feat + docs + tag v1.22.0 + push
**测试**: 510 单元测试 + 16 闭环 + 25 静态审查
**零 P0/P1/P2 维持**
