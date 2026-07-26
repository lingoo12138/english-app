# v1.27.0 Release Notes - 多人对话

**发布日期**: 2026-07-26
**类型**: W28 (1.5h)
**北极星对齐**: 趣味性 (团队/聚会场景)

---

## 🎯 3 套多人场景

| 场景 | 角色组合 |
|-----|---------|
| 💼 **团队会议** | interviewer + engineer + teacher |
| ☕ **咖啡馆见面** | barista + tour_guide + waiter |
| 🏛️ **服务一条街** | banker + police + doctor |

**之前**: 只能 1 角色对话
**现在**: 1 套 3 角色拼接, 轮流发言

### 用户视角
- AIChat 顶部新增 "👥 多人场景" 行
- 选 1 套 → 3 角色 system prompt 拼接
- LLM 输出 `[面试官]: 你好` / `[工程师]: 介绍下背景` 标识
- parseMultiRoleReply 解析后, 每条消息标当前说话人 + emoji

---

## 🛠️ 技术决策

### 为何用 3 套预设, 不让用户自由选?
- 用户场景: 团队/聚会/服务, 都是常见组合
- 自由选 = 用户要懂哪些角色能搭
- 3 套预设覆盖 80% 场景, 复杂度低

### 为何 system prompt 拼接 [Name]: 前缀?
- LLM 输出格式可控 (标签前置)
- UI 解析简单 (regex match)
- 用户一眼看到当前说话人

### 为何 multiRoles 优先于单 role?
- 多人是独立模式, 概念清晰
- buildSystemPrompt 先 check multiRoles, 再 check role, 再走 scenario
- 单/多模式 UI 互斥 (选多清单, 选单清多)

### 为何用 ALL_ROLES 找 emoji?
- 11 角色已有完整 name + emoji 表
- 不重复维护
- 未匹配用默认 👤

---

## 📊 数据变化

| 指标 | v1.26.0 | v1.27.0 | 增量 |
|-----|---------|---------|------|
| 角色模式 | 11 单 | 11 单 + 3 多 | +3 多人场景 |
| 单元测试 | 562 | 573 | +11 |
| 组件 | 26 | 27 | +1 (MultiRoleSelector) |

---

## 🔄 迁移指南

**无破坏性变更**: 现有单角色照常工作

**新 API**:
```ts
import { MULTI_ROLE_SCENARIOS, buildMultiRoleSystemPrompt, parseMultiRoleReply } from '@/lib/chatRoles'

// 1. 拼 system prompt
const prompt = buildMultiRoleSystemPrompt(['interviewer', 'engineer', 'teacher'], 'B1')

// 2. 解析 LLM 输出
const parsed = parseMultiRoleReply('[面试官]: 你好')
// { name: '面试官', emoji: '💼', content: '你好' }
```

---

## ✅ 验证清单

- [x] tsc 0 错误
- [x] vite build 成功
- [x] 573 单元测试全过
- [x] 0 P0/P1/P2 维持
- [x] v1.6/22/26 保护全过

---

**Commit**: 3 feat (lib + component + integration) + docs + tag v1.27.0 + push
