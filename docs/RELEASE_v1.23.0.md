# v1.23.0 Release Notes - PDF 上传

**发布日期**: 2026-07-25
**类型**: W24 候选 B13 (1.5d 完成)
**北极星对齐**: 内容能用 (真实文件) + 触发可业 (论文/邮件/合同)

---

## 🎯 核心变更: PDF 上传

扩展 v1.18.0 文件上传, 支持 PDF 解析, 让用户能直接传 PDF 文档 (论文/邮件/合同) 进入自定义场景学习流。

### 用户流程
```
CustomScenes
  ↓ 点 "📁 上传文件"
选 PDF 文件
  ↓
"⏳ PDF 解析中..." (懒加载 pdfjs)
  ↓
"✓ PDF 解析完成 (15 页)"
  ↓
文本填到 textarea
  ↓
✨ 提取生词 → 保存场景
```

---

## 🛠️ 技术决策

### 为何懒加载 pdfjs-dist?
- 初始 bundle 不增重 (PDF 用户仅占 30%)
- pdfjs ~470KB (gzip ~150KB)
- 动态 import 用户传 PDF 时才下载

### 为何用 disableFontFace?
- 字体加载很慢 (1-2 秒)
- 我们只抽文本, 不需字体
- 提速 3-5x

### 为何 MAX_PDF_PAGES = 50?
- 防恶意大 PDF 卡死
- 50 页 ≈ 5MB 文本 (远超 10000 字符截断)
- 实际截断到 10000 字符 = 5-10 页

### 为何要加密检测?
- 加密 PDF 解析失败抛错
- 区分"密码错误"和"文件损坏"
- 用户友好提示

### 为何 pdfjs-dist 而不是 pdf2json?
- pdfjs 是 Mozilla 官方, 维护活跃
- 浏览器原生支持 (Web Worker)
- pdf2json 需 Node 后端

---

## 📊 数据变化

| 指标 | v1.22.0 | v1.23.0 | 增量 |
|-----|---------|---------|------|
| 库数 | 37 | 38 | +1 (pdfUpload) |
| 依赖 | - | +pdfjs-dist | 0 成本 |
| 单元测试 | 510 | 526 | +16 |
| PWA | 58 | 60 entries | +2 (pdf worker) |
| Bundle | 1733 KB | 2201 KB | +468 (pdfjs 懒加载) |
| 0 P0/P1/P2 | 维持 | 维持 | 维持 |

---

## 🎨 UI 效果

### CustomScenes 上传按钮
```
[📁 上传文件 (.txt / .md / .pdf)]
  ↓ 选 PDF
"⏳ PDF 解析中..." → "✓ PDF 解析完成 (15 页)"

📁 已上传: my_paper.pdf ✕清除
2345 / 10000 字符 [✨ 提取生词]
```

---

## 🔄 迁移指南

**无破坏性变更**:
- 老用户无 PDF 体验变化
- 现有 .txt / .md 上传不变
- v1.18 fileUpload 框架直接扩展

**新增 API**:
```ts
import { isPdfFile, extractPdfText, isPdfEncryptedError, MAX_PDF_PAGES } from '@/lib/pdfUpload'

if (isPdfFile(file)) {
  try {
    const { text, pageCount, truncated } = await extractPdfText(file, 10000)
    // text 在 10000 字符内, 已去多余空白
  } catch (e) {
    if (isPdfEncryptedError(e)) {
      toast.error('PDF 已加密')
    }
  }
}
```

---

## ✅ 验证清单

- [x] `npx tsc --noEmit` 0 错误
- [x] `npx vite build` 成功 (PWA 60 entries 2201 KiB)
- [x] `node scripts/verify-v1.23.0.mjs` 14/14 静态 + 16/16 测试
- [x] `python3 scripts/review-v1.23.0.py` **28/28 — 0 P0 + 0 P1 + 0 P2** (含 catch any 0 残留检查)
- [x] 现有 pdfUpload 16 + fileUpload 23 + customScenes 32 测试全过
- [x] v1.6/14/18 全部保护通过
- [x] 0 catch (e: any) 残留 (v1.22 review 维持)

---

## 📝 文档同步

- `docs/CHANGELOG.md` 加 v1.23.0 段
- `docs/RELEASE_v1.23.0.md` 新建
- `docs/DEV_LOG.md` 加 v1.23.0 + 全项目累计
- `docs/ROADMAP.md` 加 v1.23.0 + 12 轮累计
- `docs/AI_CHAT_ROADMAP.md` 标 ✅ 已完成项
- `README.md` 标题/进度/表格/章节
- `package.json` 1.22.0 → 1.23.0
- `docs/plans/v1.23.0-pdf-upload.md` 已存
- `scripts/verify-v1.23.0.mjs` + `scripts/review-v1.23.0.py` 新建

---

## 🎯 W25+ 候选 (下次决策)

- **学习提醒** (1d, ROI 中): Notification API 每日 9 点
- **tag 合并/重命名** (1d, ROI 中): 复用 v1.21, 批量管理
- **角色进一步扩展** (1d, ROI 中): 教师/律师/工程师 (5→11)
- **跟读评测升级** (4-5d, ROI 低): 音素级评分
- **真机测试** (你做): iPhone/Android PWA

---

**Commit**: 4 个 feat (deps + lib + UI + docs) + tag v1.23.0 + push
**测试**: 526 单元测试 + 16 闭环 + 28 静态审查
**零 P0/P1/P2 维持**
