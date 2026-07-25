# v1.17.0 Release Notes - 多角色扩展 (5 → 8 角色)

**发布日期**: 2026-07-25
**类型**: W18 候选 B7 (1d 完成)
**北极星对齐**: 触发可业 (医生/银行/警察 真实场景) + 学得会 (场景化对话)

---

## 🎯 核心变更: 加 3 角色

v1.13.0 chatRoles 5 角色扩展到 8 角色:

| # | 角色 | 场景 | 用途 |
|---|------|-----|-----|
| 1 | 💼 面试官 | 求职面试 | 自我介绍 / 工作经历 / 优劣势 |
| 2 | ☕ 咖啡师 | 咖啡店 | 选 size / 温度 / 口味 |
| 3 | 🏨 酒店前台 | 酒店 | check in / 房型 / 早餐 |
| 4 | 🗺️ 导游 | 旅行 | 景点 / 美食 / 文化 |
| 5 | 🍽️ 餐厅服务员 | 餐厅 | 点菜 / 忌口 / 烹饪 |
| 6 | 🏥 **医生 (v1.17.0)** | **诊所** | **症状 / 开药 / 急救** |
| 7 | 🏦 **银行柜员 (v1.17.0)** | **银行** | **开户 / 存款 / 贷款** |
| 8 | 👮 **警察 (v1.17.0)** | **警务** | **报警 / 失物 / 问路** |

---

## 🛠️ 技术决策

### 为何加 3 角色而非 1 或 5?
- 3 = 进度合适 (1d 完成)
- 3 = 覆盖新场景 (医疗/金融/安全)
- 3 = 未来扩展模板 (任何行业都能加)

### 为何 doctor / banker / police?
- 日常真实场景 (3 个用户都遇到过的)
- 对话模板明确 (症状/业务/求助)
- LLM 容易扮 (语料丰富)
- 面试/旅行/点单已有覆盖 (不重复)

### 为何 8 角色 + NONE_ROLE = 9 ALL_ROLES?
- 9 角色不挤 (UI 横向 scroll)
- NONE_ROLE 必保留 (普通对话)
- 未来 12-15 角色都 OK

### 为何 ChatRoleId 用 union string 而非 enum?
- 简单, 编译时检查
- 与 `getRoleById(id: string)` 兼容
- 不引 enum (TS 习惯)

---

## 📊 数据变化

| 指标 | v1.16.0 | v1.17.0 | 增量 |
|-----|---------|---------|------|
| 角色数 | 5 | 8 | +3 (doctor/banker/police) |
| 单元测试 | 390 | 396 | +6 (chatRoles 改) |
| 0 P0/P1/P2 | 维持 | 维持 | 维持 |

---

## 🎨 UI 效果 (AIChat RoleSelector 自动显示)

```
[💬 普通] [💼 面试官] [☕ 咖啡师] [🏨 酒店前台] [🗺️ 导游] [🍽️ 餐厅服务员] [🏥 医生] [🏦 银行柜员] [👮 警察]
```

横向 scroll, 9 卡片自动布局。

---

## 🔄 迁移指南

**无破坏性变更**:
- 现有 5 角色不变, 仅追加 3 个
- ChatRoleId 加 3 字符串, 旧调用兼容
- AIChat / RoleSelector 自动显示

**新增角色**:
```ts
import { getRoleById } from '@/lib/chatRoles'
const doctor = getRoleById('doctor')  // 新
const banker = getRoleById('banker')  // 新
const police = getRoleById('police')  // 新
```

---

## ✅ 验证清单

- [x] `npx tsc --noEmit` 0 错误
- [x] `npx vite build` 成功 (PWA 55 entries 1713 KiB)
- [x] `node scripts/verify-v1.17.0.mjs` 12/12 静态 + 37/37 测试
- [x] `python3 scripts/review-v1.17.0.py` **24/24 — 0 P0 + 0 P1 + 0 P2**
- [x] 现有 chatRoles 37 + aiChat 13 + roleIntegration 5 测试全过
- [x] v1.6/13/14/15/16 全部保护通过
- [x] 4 处 `catch (e: any)` 全部消除

---

## 📝 文档同步

- `docs/CHANGELOG.md` 加 v1.17.0 段
- `docs/RELEASE_v1.17.0.md` 新建
- `README.md` 标题/进度/表格/章节
- `package.json` 1.16.0 → 1.17.0
- `docs/plans/v1.17.0-more-roles.md` 已存
- `scripts/verify-v1.17.0.mjs` + `scripts/review-v1.17.0.py` 新建

---

## 🎯 W19+ 候选 (下次决策)

- **B12 跟读评测升级** (4-5d, ROI 低): 音素级评分
- **真机测试** (没机器)
- **文件上传** (1-2d, ROI 中): PDF/TXT 上传 (File API)
- **学习日历** (1d, ROI 中): 每日学习可视化
- **生词本批量操作** (1d, ROI 中): 批量移入复习/批量删除
- **角色进一步扩展** (1d, ROI 中): 加 2-3 角色 (教师/律师/工程师)

---

**Commit**: 2 个 feat + docs + tag v1.17.0 (push 暂缓, 等 token)
**测试**: 396 单元测试 + 16 闭环 + 24 静态审查
**零 P0/P1/P2 维持**
