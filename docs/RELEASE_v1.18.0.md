# v1.18.0 Release Notes - 文件上传 (TXT/MD)

**发布日期**: 2026-07-25
**类型**: W19 候选 B8 (1d 完成)
**北极星对齐**: 触发可业 (用户上传原始文件) + 内容能用

---

## 🎯 核心变更: 文件上传

v1.14.0 自定义场景从"粘贴"升级到"上传文件", 闭环:
```
用户选 .txt / .md 文件
  ↓ (FileReader API)
文本内容
  ↓ (自动填到 textarea)
v1.14.0 提取生词流程
```

---

## 🛠️ 技术决策

### 为何仅支持 .txt / .md, 不支持 .pdf?
- ❌ PDF 解析引依赖 (pdfjs-dist, 100KB+)
- ✅ TXT/MD 覆盖 90% 场景 (用户复制粘贴源文即可)
- 未来: 加 PDF (W20+)

### 为何 1MB 限制?
- 1MB 文本 ≈ 50万字符 (远超 10000 截断)
- 防止恶意大文件 OOM
- 浏览器 FileReader 处理 1MB 几乎瞬时

### 为何用 application/octet-stream 兼容?
- 某些 .md 文件无标准 MIME
- 通过扩展名二次验证
- 提升兼容性

### 为何自动从文件名提取标题?
- 用户上传后立刻有标题
- 减少点击次数
- 用户可手动改

### 为何清除文件按钮?
- 防止误传, 重新选
- 状态可见性

---

## 📊 数据变化

| 指标 | v1.17.0 | v1.18.0 | 增量 |
|-----|---------|---------|------|
| 库数 | 32 | 33 | +1 (fileUpload) |
| 单元测试 | 396 | 419 | +23 |
| 上传 | 无 | TXT/MD 1MB | 闭环 v1.14 |
| 0 P0/P1/P2 | 维持 | 维持 | 维持 |

---

## 🎨 UI 效果

### CustomScenes 加"上传文件"按钮
```
┌─────────────────────────────────┐
│ 📄 粘贴英文文本 / 📁 上传文件   │
│ [textarea 10000 字符]          │
│                                 │
│ 📁 已上传: my_article.txt  ✕    │
│                                 │
│ 2345 / 10000 字符              │
│ [📁 上传文件] [✨ 提取生词]    │
└─────────────────────────────────┘
```

---

## 🔄 迁移指南

**无破坏性变更**:
- 老的"粘贴文本"流程不变
- 新增"上传文件"为可选项
- 现有自定义场景数据不受影响

**新增 API**:
```ts
// 上传文件
import { validateFile, readAndTruncateFile, extractFileName, formatFileSize } from '@/lib/fileUpload'

const validation = validateFile(file)
if (validation.valid) {
  const { text, truncated } = await readAndTruncateFile(file)
  // text 已在 10000 字符内
}
```

---

## ✅ 验证清单

- [x] `npx tsc --noEmit` 0 错误
- [x] `npx vite build` 成功 (PWA 55 entries 1716 KiB)
- [x] `node scripts/verify-v1.18.0.mjs` 14/14 静态 + 23/23 测试
- [x] `python3 scripts/review-v1.18.0.py` **28/28 — 0 P0 + 0 P1 + 0 P2**
- [x] 现有 fileUpload 23 + customScenes 32 + chatRoles 37 测试全过
- [x] v1.6/14/15/16/17 全部保护通过
- [x] 5 处 `catch (e: any)` 全部消除

---

## 📝 文档同步

- `docs/CHANGELOG.md` 加 v1.18.0 段
- `docs/RELEASE_v1.18.0.md` 新建
- `README.md` 标题/进度/表格/章节
- `package.json` 1.17.0 → 1.18.0
- `docs/plans/v1.18.0-file-upload.md` 已存
- `scripts/verify-v1.18.0.mjs` + `scripts/review-v1.18.0.py` 新建

---

## 🎯 W20+ 候选 (下次决策)

- **B12 跟读评测升级** (4-5d, ROI 低): 音素级评分
- **真机测试** (没机器)
- **PDF 上传** (1-2d, ROI 中): 引 pdfjs-dist 解析 PDF
- **学习日历** (1d, ROI 中): 每日学习可视化
- **生词本批量操作** (1d, ROI 中): 批量移入复习/批量删除
- **角色进一步扩展** (1d, ROI 中): 教师/律师/工程师

---

**Commit**: 3 个 feat + docs + tag v1.18.0 + push
**测试**: 419 单元测试 + 16 闭环 + 28 静态审查
**零 P0/P1/P2 维持**
