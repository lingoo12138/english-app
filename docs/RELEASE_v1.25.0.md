# v1.25.0 Release Notes - tag 合并/重命名

**发布日期**: 2026-07-26
**类型**: W26 (1d)
**北极星对齐**: 学得会 (标签系统成熟)

---

## 🎯 核心变更: tag 可管理

v1.21 加 tag + v1.22 复习按 tag 过滤后, 用户开始累积 tag。W26 解决两个真实问题:
- 拼写不一致 (travel / traveling / Travel)
- 同义重复 (food / foods / 食物)
- 想统一改 (全部 travel → journey)

### 用户视角
**之前**: 想改一个 tag 名, 得手动一个个 word 改

**现在**:
- 🏷️ 管理按钮 → 每个 tag 行加 ✏️ (重命名) 🔗 (合并)
- ✏️ 重命名: 旧 tag "travel" → 输入 "journey" → 全部 word 同步
- 🔗 合并: 源 tag "traveling" → 输入目标 "travel" → 重复的删, 唯一的改
- 🔍 相似查找: findSimilarTags("tra") → ["travel", "traveling"]

---

## 🛠️ 技术决策

### 为何 IDB put + 删旧行 而不是事务?
- 简单场景, 1-100 个 word 不会冲突
- put 幂等, 不会重复插入
- delete 加 where({wordId, tag: old}) 精确

### 为何 mergeTags 自动去重 (不报错)?
- 真实场景: 用户合并两个 tag 经常有重叠
- 保留 target (用户选定的), 删 source 重复
- 返 {removed, merged} 让用户知道

### 为何 findSimilarTags 限 limit=5?
- UI 一次显示不超过 5 个候选
- 5 个够用户看
- 性能: getAllTagsWithCount 一次查全表

---

## 📊 数据变化

| 指标 | v1.24.0 | v1.25.0 | 增量 |
|-----|---------|---------|------|
| 库数 | 39 | 39 | 0 (wordTags 扩 3 函数) |
| 单元测试 | 542 | 555 | +13 |
| tag 函数 | 12 | 15 | +3 (renameTag/mergeTags/findSimilarTags) |
| Notebook UI | tag 过滤 | + 管理 | +🏷️+✏️+🔗+Modal |

---

## 🔄 迁移指南

**无破坏性变更**: 现有 tag 数据不动

**新 API**:
```ts
import { renameTag, mergeTags, findSimilarTags } from '@/lib/wordTags'

// 1. 批量重命名
const n = await renameTag('travel', 'journey')  // 返 2 (影响 2 个 word)

// 2. 合并去重
const r = await mergeTags('traveling', 'travel')  // { removed: 1, merged: 3 }

// 3. 找相似 (前缀 + 包含)
const sims = await findSimilarTags('tra')  // ['travel', 'traveling']
```

---

## ✅ 验证清单

- [x] tsc 0 错误
- [x] vite build 成功
- [x] 555 单元测试全过 (含 13 新 tagMerge)
- [x] 13/13 review: 0 P0 + 0 P1 + 0 P2
- [x] 0 catch (e: any) 残留
- [x] v1.6/22 保护全过
- [x] v1.21 wordTags 现有 36 测试不破坏

---

**Commit**: 1 feat (lib + UI) + docs + tag v1.25.0 + push
**测试**: 555 单元测试 + 16 闭环 + 13 静态审查
**零 P0/P1/P2 维持**
