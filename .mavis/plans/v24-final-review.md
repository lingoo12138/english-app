# v0.24 综合审查报告 - Mavis (主人接管)

> **审查者**: Mavis (root session 421087658755222)
> **审查方式**: 深度代码读 + Playwright 验证
> **审查时间**: 2026-07-23
> **基线**: 5ec67e6 (v0.24.0)
> **最终修复后状态**: ✅ 13/13 Playwright 验证全过

---

## 总评

**PASS-WITH-CONCERNS** — 1 个 P1 已修。

---

## P1 (1 个,已修)

### P1-1: 加载历史 chat 后 reviews state 不恢复 ✅ 修复
- **位置**: `src/pages/AIChat.tsx:75-90` (旧)
- **问题**: `loadChat` 只加载 messages,不清空 reviews。加载历史对话后,user 消息下不会显示"✏️ 纠错 (N)"按钮(因为 reviews state 为空),即使 IndexedDB `writingErrors` 表里有该消息的纠错数据
- **重现**: 1) AI 对话纠错 2 条 user 消息 2) 切到别的 chat 3) 回到这个 chat 4) user 消息下不显示纠错按钮
- **影响**: 历史对话的纠错数据"看得到查不到",UX 不一致
- **修复**:
  ```ts
  const loadChat = async (chat) => {
    // 加载 messages + 场景
    setMessages(...)
    // P1 修复: 从 writingErrors 表 (source: 'chat') 补 reviews
    const allErrors = await getAllWritingErrors()
    const userMsgs = chat.messages.filter(m => m.role === 'user')
    const newReviews = {}
    for (const um of userMsgs) {
      const match = allErrors.find(e =>
        e.source === 'chat' &&
        e.original === um.content &&
        Math.abs(e.ts - um.ts) < 10 * 60 * 1000,
      )
      if (match) newReviews[um.id] = { hasError: true, errors: ... }
    }
    setReviews(newReviews)
  }
  ```
- **限制**: 用 `original + ts 10分钟窗口`匹配,如果同 original 在不同 chat 出现会错配。后续可加 chatId 字段到 writingErrors 表

---

## 已验证的 OK 项

1. **race condition**: `reqIdRef.current` 跟踪 + `myReqId` 闭包对比(v0.22 P1-2 模式复用)
2. **Mock 渠道跳过纠错**: `if (provider?.id !== 'mock')` 包裹 reviewMessage 调用
3. **噪音过滤**: severity < 0.4 在 `parseReview()` 自动 filter
4. **错误处理**: reviewMessage 内部 catch + 返回空 review;catch in handleSend console.error
5. **P1-5 选词 tooltip 仍工作**: 数据回填时 v0.23.3 修复保留
6. **IndexedDB 持久化**: `saveWritingError({source: 'chat'})` 写入 + `getAllWritingErrors()` 读取
7. **UI 渲染**: Mock 渠道不显示纠错按钮 + 8 类型标签 + 加生词本
8. **新对话重置**: `handleNewChat` 清空 reviews
9. **build pass**: TypeScript 严格模式无错

---

## 验证

- ✅ `npm run build` pass
- ✅ `scripts/verify-v24.mjs`: 7/7 (Mock 跳过 + writingErrors 表 + UI 加载)
- ✅ `scripts/verify-v24b.mjs`: 6/6 (IndexedDB 写入 + WritePage 历史 + tooltip 回归 + loadChat 异步)
- ✅ 13/13 全过

---

## 累计

- v0.24 净增: 0 P0 + 1 P1 (已修)
- 修复后: 0 P0 + 0 P1
- W2-A 实 1d 完成(原估 4.5d,提前 3.5d)
- W2-A 留 0.5d 缓冲
- 准备开 W3 (词根扩充 54%→75% + 改错本)
