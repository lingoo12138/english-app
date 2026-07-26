# v1.26.0 Release Notes - 角色扩 8→11

**发布日期**: 2026-07-26
**类型**: W27 (1d)
**北极星对齐**: 内容覆盖 (3 个新行业角色)

---

## 🎯 3 个新角色

| 角色 | emoji | 场景 |
|-----|-------|------|
| teacher 👩‍🏫 | 英语教师 | 课堂, 讲解语法/词义/造句 |
| lawyer ⚖️ | 律师 | 法律咨询, 合同, 诉讼 |
| engineer 💻 | 软件工程师 | 技术讨论, 系统设计, 代码 review |

**之前**: 8 角色 (interviewer/barista/receptionist/tour_guide/waiter/doctor/banker/police)
**现在**: 11 角色 (NONE_ROLE + 11 = 12 ALL_ROLES)

---

## 🛠️ 技术决策

### 为何 1d 干完?
- 复用 v1.13 + v1.17 chatRoles 框架
- 每个角色只需 1 systemPrompt (2-3 句) + 5 greetings + 10 fallbackReplies
- 复制 doctor 模板改 3 次

### 为何选 teacher/lawyer/engineer?
- teacher 覆盖教育场景 (留学/家教)
- lawyer 覆盖法律 (合同/咨询)
- engineer 覆盖技术 (面试/系统设计)
- 都是高需求, 边际收益高

### 为何不改 difficulty 字段?
- 复用 role.systemPrompt, 通过 A1-C2 难度自适应
- 角色难度由 effectiveLevel 决定, 不需额外字段

---

## 📊 数据变化

| 指标 | v1.25.0 | v1.26.0 | 增量 |
|-----|---------|---------|------|
| 角色 | 8 | 11 | +3 |
| ALL_ROLES | 9 (含 none) | 12 (含 none) | +3 |
| 单元测试 | 555 | 562 | +7 |

---

## 🔄 迁移指南

**无破坏性变更**: 现有 8 角色照常工作

**新 API**:
- 角色 id 联合类型扩: `ChatRoleId` 加 teacher/lawyer/engineer
- chatRoles.ts 导出: getRoleById 已支持新 id
- AIChat RoleSelector 自动显示新角色

---

## ✅ 验证清单

- [x] tsc 0 错误
- [x] vite build 成功
- [x] 562 单元测试全过
- [x] 13/13 review 0 P0/P1/P2
- [x] v1.6/22 保护全过

---

**Commit**: 1 feat + docs + tag v1.26.0 + push
