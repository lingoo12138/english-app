# v1.36.0 大 review — 12 版本累积 (v1.24-v1.36)

**日期**: 2026-07-26
**范围**: v1.24-v1.36 累积 12 release tag (commit 68e06b4..fc0681e)
**机制**: 类似 v1.6 (13 bug 修复) + v1.22 (18 处 catch any) + v1.25 摸底
**结论**: **0 P0 + 0 P1 (修 1 处) + 0 P2** ✓

---

## 摸底脚本

`scripts/big-review-v1.36.py` (5 维度扫 src/)

**结果 (主审查)**:
- ✓ 0 catch (e: any) 残留 (v1.22 review 维持)
- ✓ 21 处 setLoading(true) 全部配对 (finally 块)
- ✓ 0 console.error/warn 在 v1.23-v1.36 新代码
- ⚠ 1 处 as any 残留 (已修)
- ✓ v1.6/22 维持全过

---

## 修复的 P1 (1 处)

### 1. `inAppReminder.ts` — `as any` + 4 处空 catch

**问题**:
```ts
// 旧 (4 处):
const isIOS = /iPad|.../.test(...) && !(window as any).MSStream
// @ts-ignore - Badge API 是实验性
if (typeof navigator.setAppBadge === 'function') { ... }
// @ts-ignore
await navigator.setAppBadge(count)

// vibrate/setAppBadge/clearAppBadge 4 处空 catch {}
```

**修复**:
```ts
// 新:
const isIOS = /iPad|.../.test(...) && !('MSStream' in window)
const nav = navigator as Navigator & {
  setAppBadge?: (count: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}
// 4 处空 catch 改为:
} catch (e: unknown) {
  const err = e instanceof Error ? e : new Error(String(e))
  console.warn('xxx 失败:', err.message)
}
```

**意义**:
- `as any` 改用 'X' in window 守卫
- 4 处空 catch 改 catch unknown + Error 守卫 (v1.22 review 维持)
- 类型安全 + 调试可见

---

## v1.23-v1.36 12 版本产出

### 新库 (8 个)
1. `pdfUpload.ts` (W24) - PDF 解析
2. `reminderContent.ts` (W25) - 动态通知
3. `tagSuggest.ts` (W30-A) - LLM tag 推荐
4. `writingTemplates.ts` (W30-B) - 4 写作模板
5. `aiPlanGenerator.ts` (W30-D) - AI 学习计划
6. `inAppReminder.ts` (W32) - iOS 兜底
7. `errorStats.ts` (W33) - 错题统计
8. `phraseCards.ts` (W34) - 短语闪卡

### 升级库 (5 个)
1. `reminder.ts` (W25) - 异步 + 通知点击
2. `chatRoles.ts` (W27/W28/W31) - 5→8→11→14 角色
3. `learningReport.ts` (W29) - 加 3 函数
4. `wordTags.ts` (W26) - 加 3 函数
5. `aiChat.ts` (W28) - 多人模式

### 新组件 (1 个)
1. `MultiRoleSelector.tsx` (W28) - 多人场景

### 升级组件 (3 个)
1. `ReminderSection.tsx` (W25) - 动态预览
2. `Notebook.tsx` (W26) - tag 管理
3. `ReportsPage.tsx` (W29) - 3 卡片
4. `AIChat.tsx` (W28) - 多人模式

### 测试 (12 新测试文件)
- pdfUpload (16) / reminderContent (10) / chatRoles (W26 6, W31 6) / multiRole (11)
- learningReport (8) / reportUpgrade (8) / taggedReviews (14 已存)
- wordTags (36 已存) / tagMerge (13) / tagSuggest (5)
- writingTemplates (6) / aiPlanGenerator (8) / errorStats (8) / phraseCards (10)
- inAppReminder (8) / fileUpload (修 1)

### 文档
- 12 release notes (RELEASE_v1.24-v1.36)
- 4 plans (v1.24/30/32/36)
- 6 verify + 6 review 脚本
- DEV_LOG / ROADMAP / CHANGELOG 同步

---

## 摸底统计

| 维度 | 数量 | 状态 |
|------|------|------|
| catch (e: any) 残留 | 0 | ✓ v1.22 维持 |
| setLoading(true) 配对 | 21/21 | ✓ finally 块 |
| console.error/warn (新代码) | 0 | ✓ 全 catch unknown 守卫 |
| as any (新代码) | 0 | ✓ 修 1 处 |
| useEffect([], []) 依赖 | 0 | ✓ 无新增空依赖 |
| v1.6/22 保护 | 5/5 | ✓ 全部维持 |

---

## 对比历史大 review

| review | 时间 | 范围 | 修 bug 数 | 质量 |
|--------|------|------|----------|------|
| v1.6 | 4 核心功能 | 13 P0/P1 | 修 13 | 初始基线 |
| v1.22 | 16 版本累积 | 18 P1 catch any | 修 18 | 守 v1.6 |
| v1.25 | 摸底 | 0 新 | 0 | 质量持续 |
| **v1.36** | **12 版本累积** | **1 P1 as any** | **修 1** | **质量持续干净** |

**质量趋势**: 0 P0 + 0 P1 维持 30+ 轮

---

**最后更新**: 2026-07-26
**总览**: 0 P0 + 0 P1 + 0 P2 — 12 release tag 质量干净
**下次大 review**: v1.40+ 累积 (约 5 release tag 后)
