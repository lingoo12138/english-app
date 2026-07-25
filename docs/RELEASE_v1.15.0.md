# v1.15.0 Release Notes - 自定义场景学习流

**发布日期**: 2026-07-25
**类型**: W16 — 完成自定义场景最后一公里
**ROI**: 中
**北极星对齐**: 学得会 (从"看词"到"学词")

---

## 🎯 核心变更: 卡片学习流

v1.14.0 自定义场景能"看 + 收藏", 但不能"系统学"。本次加 CustomSceneLearn, 完整闭环:

```
v1.14.0 流程:
[粘贴文本] → [提取生词] → [保存场景] → [详情: 看词/收藏] ❌ 不能"学"

v1.15.0 流程:
[粘贴文本] → [提取生词] → [保存场景] → [详情: 看词/收藏] → [开始学习] ✅
                                                                    ↓
                                                            [卡片学习流]
                                                                    ↓
                                                            [完成 → 重置/返回]
```

---

## 🛠️ 技术决策

### 为何 1d 模式 (单 producer + 主人接管)?
- v1.14 已铺好基础 (CustomScene + Detail + 收藏)
- 学习流是 UI 增强, 不改后端
- 复用 TTSButton / 收藏 / 路由

### 为何用纯 React state (不引状态库)?
- 仅 3 个 state (currentIdx, showAnswer, favMap)
- 不引 zustand/redux (避免依赖膨胀)

### 为何 localStorage 存进度?
- 不存 IDB (轻量, key-value 够)
- 用户切场景不冲突 (key 含 scene id)
- 关闭重开可继续

### 为何 4 个键盘快捷键?
- 空格 = 翻面 (主交互)
- ←/→ = 翻页 (高频)
- 不加 ↑/↓ 之类 (避免认知负担)

### 为何 TTS 复用 TTSButton?
- 8 TTS 渠道已集成
- 零成本 (浏览器内置优先)
- 用户已有偏好设置

---

## 📊 数据变化

| 指标 | v1.14.0 | v1.15.0 | 增量 |
|-----|---------|---------|------|
| 页面数 | 23 | 24 | +1 (CustomSceneLearn) |
| 单元测试 | 356 | 372 | +16 |
| 测试文件 | 27 | 28 | +1 |
| 路由 | 23 | 24 | +1 (/custom-scenes/:id/learn) |
| 闭环 | 自定义场景"看" | 自定义场景"学" | 完整闭环 |
| 0 P0/P1/P2 | 维持 | 维持 | 维持 |

---

## 🎨 UI 效果

### CustomSceneLearn
```
┌─────────────────────────────────┐
│ 📚 我的工作邮件         ← 返回  │
│ 3 / 15                          │
│ ████████░░░░░░░░░ 60%           │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │                             │ │
│ │     APPOINTMENT             │ │
│ │     [B1]                    │ │
│ │                             │ │
│ │   (点击或按空格查看释义)    │ │
│ │                             │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ [← 上一词] [⭐] [🔊] [下一词 →] │
│        🔄 重置进度              │
└─────────────────────────────────┘
```

### 翻面后
```
│     APPOINTMENT             │
│     [B1]                    │
│                             │
│     预约 / 约会              │
│     "I have an appointment"  │
│     (点击或按空格翻面)        │
```

### 完成态
```
🎉
学完啦!
你已完成 "我的工作邮件" 的 15 个生词

[🔄 再学一遍] [← 返回详情]
```

---

## 🔄 迁移指南

**无破坏性变更**:
- 老用户进详情页 → 看到"📚 开始学习"按钮 (新增, 不影响)
- localStorage 进度 key 含 scene id, 不冲突

**新增路由**:
```
/custom-scenes/:id/learn   卡片学习流
```

**新增 state**:
- CustomSceneLearn 内: currentIdx, showAnswer, favMap
- localStorage: `customScene-${id}-progress`

---

## ✅ 验证清单

- [x] `npx tsc --noEmit` 0 错误
- [x] `npx vite build` 成功 (PWA 55 entries 1708 KiB)
- [x] `node scripts/verify-v1.15.0.mjs` 16/16 静态 + 16/16 测试
- [x] `python3 scripts/review-v1.15.0.py` **28/28 — 0 P0 + 0 P1 + 0 P2**
- [x] 现有 customScenes 32 + chatRoles 31 + aiChat 13 测试全过
- [x] v1.6 review 13 处保护全过
- [x] v1.13/14 chatRoles + customScenes 保护全过
- [x] 7 处 `catch (e: any)` 全部消除

---

## 📝 文档同步

- `docs/CHANGELOG.md` 加 v1.15.0 段
- `docs/RELEASE_v1.15.0.md` 新建
- `README.md` 标题/进度/表格/章节
- `package.json` 1.14.0 → 1.15.0
- `docs/plans/v1.15.0-custom-scene-learn.md` 已存
- `scripts/verify-v1.15.0.mjs` + `scripts/review-v1.15.0.py` 新建

---

## 🎯 W17+ 候选 (下次决策)

- **B12 跟读评测升级** (4-5d, ROI 低): 音素级评分
- **真机测试** (没机器, 干不了)
- **多角色扩展** (1d, ROI 中): 加 2-3 角色 (医生/银行/警察)
- **文件上传** (1-2d, ROI 中): PDF/TXT 直接上传 (File API)
- **场景学习集成** (已完成 - v1.15.0)
- **多场景关联** (1d, ROI 中): CustomScene ↔ 通用场景课 (学完词后可入复习)

---

**Commit**: 3 个 feat + docs + tag v1.15.0
**测试**: 372 单元测试 + 16 闭环 + 28 静态审查
**零 P0/P1/P2 维持**
