# v1.14.0 Release Notes - B4 自定义场景课

**发布日期**: 2026-07-25
**类型**: W15 候选 B4 (1d 完成)
**北极星对齐**: 触发可业 (用户自己的内容) + 内容能用 (AI 提取) + 学得会 (个性化场景)

---

## 🎯 核心变更: 自定义场景

用户粘贴任意英文文本 (文章/邮件/对话/歌词) → AI 自动提取生词 → 保存为专属场景课。

### 流程
```
[用户粘贴文本]
  ↓ (10000 字符内)
[✨ 提取生词]
  ↓ (调 LLM, mock 渠道走词频)
[📋 词列表 5-30 词]
  ↓ (可编辑/删除)
[💾 保存场景]
  ↓ (IDB v5)
[📚 自定义场景列表]
  ↓ (点击进入)
[📝 详情页 + 收藏]
```

---

## 🛠️ 技术决策

### 为何不解析 PDF/TXT 文件?
- ❌ 引 pdfjs/mammoth 等依赖 (违反零成本约束)
- ✅ 简化: 用户粘贴纯文本 (浏览器/编辑器复制即可)
- 未来: 加文件上传 (W16+)

### 为何 mock 走词频而非真提取?
- LLM 失败时, mock 必须返非空
- 词频 + 停用词过滤 = 简单有效
- 释义/例句用占位 (用户能在 UI 编辑/删除)

### 为何 JSON 严格解析?
- LLM 可能返额外解释文字
- 严格 schema + 字段验证
- 解析失败 → mock fallback

### 为何 LLM 日限用 explain (30) 而非 write (20)?
- 解释类 (30): 单次生词提取算 1 次
- 写作类 (20): 写作批改贵
- 提取 30 词 = 1 次 LLM 调, 够用

### 为何 5-30 词而非固定 20?
- 文本太短 → 至少 5 词 (mock 词频 + 占位)
- 文本太长 → 最多 30 词 (避免单场景词太多)
- 灵活: 用户可手动删

---

## 📊 数据变化

| 指标 | v1.13.0 | v1.14.0 | 增量 |
|-----|---------|---------|------|
| 库数 | 30 | 31 | +1 (customScenes) |
| 页面数 | 21 | 23 | +2 (CustomScenes + Detail) |
| 单元测试 | 324 | 356 | +32 |
| IDB version | 4 | 5 | +1 (customScenes) |
| LLM 防护 | 3 类日限 | 3 类日限 + 提取复用 | 维持 |
| 闭环测试 | 16 | 16 | 0 (已稳) |
| P0/P1/P2 | 0/0/0 | 0/0/0 | 维持 |

---

## 🎨 UI 效果

### CustomScenes 列表 + 创建
```
┌─────────────────────────────────┐
│ 📝 自定义场景                  │
│ 粘贴英文文本 → AI 提取生词     │
├─────────────────────────────────┤
│ 📄 粘贴英文文本                │
│ [textarea 10000 字符]          │
│ 2345 / 10000 字符 [✨ 提取生词] │
├─────────────────────────────────┤
│ 📋 提取结果 (18 词)            │
│ [title input]                  │
│ ┌─ apple A2 释义...  ✕ ─┐     │
│ ┌─ banana B1 释义... ✕ ─┐     │
│ [💾 保存场景] [🗑️ 清空]       │
├─────────────────────────────────┤
│ 📚 已保存场景 (3)              │
│ • 我的工作邮件 (15 词)         │
│ • AI 入门文章 (22 词)          │
└─────────────────────────────────┘
```

### CustomSceneDetail 详情
```
┌─────────────────────────────────┐
│ 📝 我的工作邮件                │
│ 18 词 · 创建于 2026-07-25      │
├─────────────────────────────────┤
│ 📄 原文                        │
│ Dear team, I wanted to...      │
├─────────────────────────────────┤
│ 📚 生词列表                    │
│ ┌─ apple A2 释义... [⭐] ─┐   │
│ ┌─ banana B1 释义... [☆] ─┐   │
└─────────────────────────────────┘
```

### Home 入口
紫色渐变卡片: "📝 自定义场景 / 粘贴文本 · AI 提取生词 · 专属场景"

---

## 🔄 迁移指南

**无破坏性变更**:
- IDB v4 → v5 自动升级 (加 customScenes 表)
- 旧用户首次打开自动建表, 数据零损失
- LLM 日限复用 explain 30 上限, 不变

**新增 API**:
```ts
// 自定义场景核心
import { extractWordsFromText, saveCustomScene, getAllCustomScenes, MAX_TEXT_LEN, MAX_WORDS } from '@/lib/customScenes'

// UI
import CustomScenes from '@/pages/CustomScenes'
import CustomSceneDetail from '@/pages/CustomSceneDetail'

// 路由
<Route path="custom-scenes" element={<CustomScenes />} />
<Route path="custom-scenes/:id" element={<CustomSceneDetail />} />
```

---

## ✅ 验证清单

- [x] `npx tsc --noEmit` 0 错误
- [x] `npx vite build` 成功 (PWA 54 entries 1703 KiB)
- [x] `node scripts/verify-v1.14.0.mjs` 24/24 静态 + 32/32 测试
- [x] `python3 scripts/review-v1.14.0.py` **38/38 — 0 P0 + 0 P1 + 0 P2**
- [x] 现有 aiChat 13 + chatRoles 31 测试全过 (v1.9/v1.13 未破坏)
- [x] v1.6 review 13 处保护全过
- [x] v1.13 chatRoles 保护全过
- [x] 6 处 `catch (e: any)` 全部消除
- [x] setLoading 配对完整

---

## 📝 文档同步

- `docs/CHANGELOG.md` 加 v1.14.0 段
- `docs/RELEASE_v1.14.0.md` 新建
- `README.md` 标题/进度/表格/章节
- `package.json` 1.13.0 → 1.14.0
- `docs/plans/v1.14.0-custom-scene.md` 已存
- `scripts/verify-v1.14.0.mjs` + `scripts/review-v1.14.0.py` 新建

---

## 🎯 W16+ 候选 (下次决策)

- **B12 跟读评测升级** (4-5d, ROI 低): 音素级评分
- **真机测试** (用户建议): iPhone Safari / Android Chrome PWA
- **多角色扩展** (1d, ROI 中): 加 2-3 角色 (医生/银行/警察)
- **场景学习集成** (2d, ROI 中): CustomSceneDetail 进 SceneDetail 学习流
- **文件上传** (1-2d, ROI 中): PDF/TXT 文件直接上传 (用浏览器 File API)

---

**Commit**: 3 个 feat (customScenes + UI + docs) + tag v1.14.0
**测试**: 356 单元测试 + 16 闭环 + 38 静态审查
**零 P0/P1/P2 维持**
