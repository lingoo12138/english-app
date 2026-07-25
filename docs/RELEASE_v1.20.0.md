# v1.20.0 Release Notes - 生词本批量操作

**发布日期**: 2026-07-25
**类型**: W21 候选 B10 (1d 完成)
**北极星对齐**: 学得会 (批量复习) + 触发可业 (批量管理)

---

## 🎯 核心变更: 批量操作

NotebookPage (生词本) 加 3 个批量操作:
- 📚 批量入复习 (复用 v1.11 复习队列)
- 📤 批量导出 CSV
- ☑ 全选 / ⇄ 反选

---

## 🛠️ 技术决策

### 为何复用 v0.14 batchMode?
- 已有选择模式 UI (复选框 + selected Set)
- 仅加新 handler + 按钮
- 0 破坏性变更

### 为何批量入复习用 SM-2 (而非 FSRS)?
- reviews 表向后兼容
- 默认 useFSRS=false
- 用户可单独词开 FSRS

### 为何 CSV 而非 JSON?
- CSV 通用 (Excel/Numbers 直接打开)
- 人类可读
- 导出 import 双向

### 为何 Dexie delete 静默成功?
- 不存在的 key 不报错 (幂等)
- 用户多次操作不会错乱
- 测试时需注意 (v1.20.0 修 1 测试)

---

## 📊 数据变化

| 指标 | v1.19.0 | v1.20.0 | 增量 |
|-----|---------|---------|------|
| 库数 | 34 | 35 | +1 (notebookBulk) |
| 单元测试 | 440 | 460 | +20 |
| Notebook 操作 | 1 (单删) | 4 (单删/批入/批出/批删) | +3 |
| 0 P0/P1/P2 | 维持 | 维持 | 维持 |

---

## 🎨 UI 效果

### Notebook 批量模式
```
[☑ 批量管理] [☑ 全选] [⇄ 反选]

选中 3 词:
[📚 入复习 (3)] [📤 导出 (3)] [🗑 删除 (3)]
```

---

## 🔄 迁移指南

**无破坏性变更**:
- 老用户数据不受影响
- 批量模式 UI 复用, 仅加 3 按钮
- 现有单词/复习/收藏不动

**新增 API**:
```ts
import { addFavoritesToReview, removeFavorites, downloadFavoritesCSV } from '@/lib/notebookBulk'

const result = await addFavoritesToReview(selectedFavs)
// { added: 3, skipped: 0, failed: 0 }

downloadFavoritesCSV(selectedFavs, lookup)
// 浏览器下载 notebook-2026-07-25.csv
```

---

## ✅ 验证清单

- [x] `npx tsc --noEmit` 0 错误
- [x] `npx vite build` 成功 (PWA 57 entries 1726 KiB)
- [x] `node scripts/verify-v1.20.0.mjs` 15/15 静态 + 20/20 测试
- [x] `python3 scripts/review-v1.20.0.py` **28/28 — 0 P0 + 0 P1 + 0 P2**
- [x] 现有 notebookBulk 20 + fileUpload 23 + chatRoles 37 + learningCalendar 21 测试全过
- [x] v1.6/11/16/19 全部保护通过
- [x] 5 处 `catch (e: any)` 全部消除

---

## 📝 文档同步

- `docs/CHANGELOG.md` 加 v1.20.0 段
- `docs/RELEASE_v1.20.0.md` 新建
- `README.md` 标题/进度/表格/章节
- `package.json` 1.19.0 → 1.20.0
- `docs/plans/v1.20.0-notebook-bulk.md` 已存
- `scripts/verify-v1.20.0.mjs` + `scripts/review-v1.20.0.py` 新建

---

## 🎯 W22+ 候选 (下次决策)

- **B12 跟读评测升级** (4-5d, ROI 低): 音素级评分
- **真机测试** (没机器)
- **PDF 上传** (1-2d, ROI 中): 引 pdfjs-dist
- **角色进一步扩展** (1d, ROI 中): 教师/律师/工程师
- **生词本标签** (1d, ROI 中): 收藏时打标签, 复习按标签过滤
- **学习提醒** (1d, ROI 中): 每日 9 点弹通知 (用 Notification API)

---

**Commit**: 3 个 feat + docs + tag v1.20.0 + push
**测试**: 460 单元测试 + 16 闭环 + 28 静态审查
**零 P0/P1/P2 维持**
