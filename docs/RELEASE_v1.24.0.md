# v1.24.0 Release Notes - 学习提醒升级

**发布日期**: 2026-07-26
**类型**: W25 (1d)
**北极星对齐**: 触发可业 (召回流失) + 学得会 (动态反馈)

---

## 🎯 核心变更: 通知变聪明

把 v0.22 reminder 从"通用文本"升级为"个性化内容 + 流失召回"。

### 用户视角
**之前**: 每天 9 点 → "⏰ 该学英语啦" + "坚持每天学一点, 养成习惯!"

**现在**:
- 有复习: "⏰ 5 个复习 + 3 个新词, 3 分钟搞定 · 连续 7 天"
- 3 天未学: "⏰ 别断! 3 天前你学了 5 个词, 今天 5 分钟恢复一下"
- 啥也没: "⏰ 今天 0 个复习, 学 3 个新词 1 分钟搞定"

**点通知** → 直达 /review?from=reminder 页面

### Settings 动态预览卡
新增蓝色预览卡, 实时显示今日动态通知内容

---

## 🛠️ 技术决策

### 为何动态导入 reminderContent?
- 避免 reminderContent 在每次 import reminder.ts 时加载
- reminderContent 依赖 db + learningReport, 较重
- 懒加载节省初始 bundle

### 为何 catch (e: unknown) 在 reminder.ts 加?
- 异步 fireReminderNotification 失败需降级
- 维持 v1.22 review 基线
- 失败时 console.warn + 用默认 body

### 为何 3 天未学门槛?
- 1-2 天: 用户可能忙, 不算流失
- 3+ 天: 习惯中断, 需召回
- 7+ 天: 强召回, 文案更急迫

---

## 📊 数据变化

| 指标 | v1.23.0 | v1.24.0 | 增量 |
|-----|---------|---------|------|
| 库数 | 38 | 39 | +1 (reminderContent) |
| 单元测试 | 526 | 542 | +16 |
| reminder 函数 | 9 | 12 | +3 (buildReminderBody/getReminderStats/getLastStudyTimestamp) |
| 通知正文 | 静态 | 动态 | 4 模式 |

---

## 🔄 迁移指南

**无破坏性变更**: v0.22 启用用户照常工作, body 自动变动态

**新 API**:
```ts
import { buildReminderBody, getReminderStats } from '@/lib/reminderContent'
const body = await buildReminderBody()  // "5 个复习, 3 分钟搞定"
const stats = await getReminderStats()  // { dueCount, newCount, learnedToday, minutes, daysInactive }
```

---

## ✅ 验证清单

- [x] tsc 0 错误
- [x] vite build 成功 (PWA 60 entries)
- [x] 542 单元测试全过 (含 10 新 reminderContent)
- [x] 29/29 review: 0 P0 + 0 P1 + 0 P2
- [x] 0 catch (e: any) 残留
- [x] v1.6/22 保护全过
- [x] 修 v1.23 .pdf 改 .docx 例子 (fileUpload 测试)

---

**Commit**: 1 feat (lib + UI) + docs + tag v1.24.0 + push
**测试**: 542 单元测试 + 16 闭环 + 29 静态审查
**零 P0/P1/P2 维持**
