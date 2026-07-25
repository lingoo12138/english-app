# v1.13.0 Release Notes - B3 多角色对话

**发布日期**: 2026-07-25
**类型**: W14+ 候选 B3 (1d 完成)
**北极星对齐**: 触发可业 (面试/旅行/点单真实场景) + 内容能用 (角色系统 prompt 注入)

---

## 🎯 核心变更: 5 角色对话

AIChat 加角色选择, 用户可让 AI 扮不同角色进行场景化对话练习:

| 角色 | 场景 | 用途 |
|-----|-----|-----|
| 💼 面试官 (interviewer) | 求职面试 | 自我介绍 / 工作经历 / 优劣势 / 期望薪资 |
| ☕ 咖啡师 (barista) | 咖啡店点单 | 选 size / 温度 / 口味 / 付款 |
| 🏨 酒店前台 (receptionist) | 酒店入住 | check in / ID / 房型 / 早餐 / 退房 |
| 🗺️ 导游 (tour_guide) | 城市旅行 | 景点推荐 / 美食 / 交通 / 当地文化 |
| 🍽️ 餐厅服务员 (waiter) | 餐厅用餐 | 点菜 / 忌口 / 烹饪方式 / 甜点 |
| 💬 普通对话 (none) | 自由话题 | v1.9.0 自由聊天, 不变 |

---

## 🛠️ 技术决策

### 为何 5 角色而非更多?
- ROI: 5 角色覆盖 90% 日常真实场景
- prompt 池 5 个易维护
- 后续可加 (餐厅分店/医院/银行等), W15+ 再说

### 为何角色优先于 scenario/topic/level?
- 角色决定一切 (身份 + 场景 + 难度语气)
- 用户选 "面试官" 后 scenario="meeting" 和 topic 都被覆盖
- 减少用户认知负担, 选角色 = 一键切场景 + 难度

### 为何切角色清空历史?
- 角色不同, 历史对话无意义
- 切角色 = 开启新对话, 避免上下文污染
- 用 Toast 提示已切换

### 为何每角色 ≥3 问候语 + ≥5 mock 回复?
- 问候语: 避免重复感
- mock 回复: 没 API key 时也能演示, 测试不需要真 LLM

### 为何不引 provider 隔离的角色?
- LLM 日限已分 3 类 (write/chat/explain)
- 角色都是 chat 分类, 复用 50 上限
- 不增复杂度

---

## 📊 数据变化

| 指标 | v1.12.0 | v1.13.0 | 增量 |
|-----|---------|---------|------|
| 库数 | 29 | 30 | +1 (chatRoles) |
| 组件数 | 25 | 26 | +1 (RoleSelector) |
| 单元测试 | 288 | 324 | +36 (31 + 5) |
| 测试文件 | 25 | 27 | +2 |
| AI 场景 | 5 通用 | 5 通用 + 5 角色 | 角色专属 |
| LLM 防护 | 日限 + 错误恢复 | 日限 + 错误恢复 + 角色 | +1 层 |
| 闭环测试 | 16 | 16 | 0 (已稳) |
| P0/P1/P2 | 0/0/0 | 0/0/0 | 维持 |

---

## 🎨 UI 效果

### 顶部 RoleSelector (横向 scroll)
```
[💬 普通] [💼 面试官] [☕ 咖啡师] [🏨 酒店前台] [🗺️ 导游] [🍽️ 餐厅服务员]
英文面试      咖啡店点单     check in/out    旅行推荐        餐厅点菜
```

### 选中状态
- 选中: emerald-500 背景 + 白色文字 + ring
- hover: 浅色背景
- a11y: role="radio" + aria-checked

### 切角色
- 清空历史 messages
- 显示问候语 (例如: "Hi! I'm Sarah, your interviewer today...")
- Toast: "已切换到 💼 面试官"

---

## 🔄 迁移指南

**无破坏性变更**:
- 默认 currentRoleId='none', 行为等同 v1.12.0
- ChatContext 加 role 字段, 不传则不生效
- aiChat.buildSystemPrompt 检测到 role='none' 走原逻辑

**新增 API**:
```ts
// 旧 → 新 (UI 层)
import { getRoleById, getGreetingForRole, getFallbackReply, getRoleSystemPrompt } from '@/lib/chatRoles'
import RoleSelector from '@/components/RoleSelector'

// AIChat 内
<RoleSelector
  selectedRoleId={currentRoleId}
  onChange={handleRoleChange}
/>

// aiChat 内
const reply = await aiChat(
  messages,
  { role: currentRoleId, level, ... },  // 注入
  provider, apiKey, model,
)
```

---

## ✅ 验证清单

- [x] `npx tsc --noEmit` 0 错误
- [x] `npx vite build` 成功 (PWA 50 entries 1688 KiB)
- [x] `node scripts/verify-v1.13.0.mjs` 24/24 静态 + 36/36 测试
- [x] `python3 scripts/review-v1.13.0.py` **34/34 — 0 P0 + 0 P1 + 0 P2**
- [x] 现有 aiChat.test.ts 13 测试全过 (未破坏 v1.9.0)
- [x] 现有 review v1.6 13 处保护全过
- [x] AIChat MAX_INPUT=500 保护
- [x] 4 处 `catch (e: any)` 全部消除
- [x] 4 处 `setLoading` 配对完整
- [x] 5 角色与难度自适应 + 自定义话题 三者共存

---

## 📝 文档同步

- `docs/CHANGELOG.md` 加 v1.13.0 段
- `docs/RELEASE_v1.13.0.md` 新建
- `README.md` 标题 + 进度 + 表格 + 章节
- `package.json` 1.12.0 → 1.13.0
- `docs/plans/v1.13.0-multi-role-chat.md` 已存
- `scripts/verify-v1.13.0.mjs` + `scripts/review-v1.13.0.py` 新建

---

## 🎯 W15+ 候选 (下次决策)

- **B4 自定义场景课** (4d, ROI 中): 用户上传 PDF/文本, 自动生成生词卡
- **B12 跟读评测升级** (4-5d, ROI 低): 音素级评分
- **真机测试** (用户建议): iPhone Safari / Android Chrome PWA
- **多角色扩展** (1d, ROI 中): 加 2-3 角色 (医生/银行柜员/警察)

---

**Commit**: 3 个 feat (chatRoles + RoleSelector + AIChat) + docs + tag v1.13.0
**测试**: 324 单元测试 + 16 闭环 + 34 静态审查
**零 P0/P1/P2 维持**
