# REVIEW_W149 — 主人 owner-self-verify 兜底 review (W149 反馈 1-43)

**reviewer**: Mavis (主人, 3 个 verifier agent 全部 Token Plan 上限失败 — 沙盒经验第 9 次)
**commit 范围**: v2.1.29..v2.1.43 (15 commits, 5072 lines, 16 反馈)
**最新 commit**: 47a18b9 (W149 反馈 40+41+42+43)
**测试**: 2173/2173 pass
**TS**: 0 错误
**0 emoji 增量**: ✅ (W149 16 反馈无新增 emoji, 维持 W146 硬约束)
**review 日期**: 2026-08-18

---

## P0 (必修, 1 项)

### P0-1. ErrorReviewPage setTimeout 内存泄漏

**位置**: `src/pages/ErrorReviewPage.tsx:180, 190`

**问题**:
```ts
// 答对时
setTimeout(() => setFlyConfetti(null), 750)        // line 180
// 答完 100% confetti 庆祝音效
setTimeout(() => playCompleteSound(), 200)         // line 190
```

如果用户答完一题后**立即切到其他页** (或 100% 完成立刻跳到 summary), ErrorReviewPage unmount 在 setTimeout 触发前.
- `setFlyConfetti(null)` 在 unmounted component 上调用 → React 18 警告 (Can't perform state update on unmounted component)
- setTimeout id 仍存在, callback 闭包持有 setState 引用 → 内存泄漏
- 实际生产罕见 (200-750ms 内切页少), 但 React 严格模式 + 多次触发会累积

**修复**:
```ts
const flyTimeoutRef = useRef<number | null>(null)
const completeTimeoutRef = useRef<number | null>(null)

if (result.grade === 'perfect' || result.grade === 'good') {
  setFlyConfetti({...})
  if (flyTimeoutRef.current) clearTimeout(flyTimeoutRef.current)
  flyTimeoutRef.current = window.setTimeout(() => setFlyConfetti(null), 750)
}

if (newIsLast) {
  if (completeTimeoutRef.current) clearTimeout(completeTimeoutRef.current)
  completeTimeoutRef.current = window.setTimeout(() => playCompleteSound(), 200)
}

// useEffect cleanup
useEffect(() => {
  return () => {
    if (flyTimeoutRef.current) clearTimeout(flyTimeoutRef.current)
    if (completeTimeoutRef.current) clearTimeout(completeTimeoutRef.current)
  }
}, [])
```

**实际影响**: 极低概率 (用户 750ms 内切页罕见), 但修法简单, 应该 P0 必修

---

## P1 (该修, 2 项)

### P1-1. ErrorReviewPage confettiColors 索引越界 (W149 反馈 35 升级 8→16 颗)

**位置**: `src/pages/ErrorReviewPage.tsx` confettiColors 数组 (W149 反馈 35 升级时改了)

**问题**:
```ts
const confettiColors = ['#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f97316', '#06b6d4']
// 只有 8 种颜色
const confetti = isComplete
  ? Array.from({ length: 16 }, (_, i) => {  // 16 颗 (W149 反馈 35 升级)
    return {
      color: confettiColors[i % confettiColors.length],  // ✅ 已 mod 取模, 安全
    }
  })
```

**实际**: 已经 mod 取模, **不是 bug**. 我看错了, 撤回. **删除这条 P1**.

### P1-2. ErrorReviewPage streak 阈值 5/10 边界无文案解释

**位置**: `src/pages/ErrorReviewPage.tsx:761-809` (streak 徽章 + NEW HIGH 闪烁)

**问题**:
- 5 连 答对显示金色 "5连" 徽章 (✓ 0 文案, 0 emoji)
- 10 连 答对显示红色 "10连" + NEW HIGH! 闪烁 (✓ 0 文案)
- 但**首次用户不知道阈值**, 看到 NEW HIGH! 不知道什么意思
- 答错时 0 反馈, 连续 3 题答错时 border 变红 (W149 反馈 43), 但**没有文字解释** (e.g. "你最近 3 题都答错了, 放慢点")

**修复 (P1 该修)**:
- tooltip 加完整说明: `title="连续 5 题答对, 保持! 5/10 解锁火焰徽章"`
- next-card-warn 容器加 `aria-label="最近 3 题都答错, 提示注意"` 给屏幕阅读器

**实际影响**: 中等 (a11y + UX), 用户能视觉理解但 a11y 缺

---

## P2 (小修, 3 项)

### P2-1. W149 反馈 41 streak-fire-pulse 0.8s infinite 可能性能开销

**位置**: `src/index.css` (.streak-fire-pulse)

**问题**:
```css
.streak-fire-pulse { animation: streakFirePulse 0.8s ease-in-out infinite; }
```

当用户答对 10 题时, `.streak-fire-pulse` 触发并**永久循环** (infinite). box-shadow 0.8s 周期循环在某些低端设备可能影响性能 (虽然 box-shadow 比 transform 重, 但比 layout 轻).

**建议** (P2 小修):
- 改成 5s 后自动停止 (e.g. `animation-iteration-count: 5` 或 setTimeout 清 class)
- 或降低频率 (0.8s → 1.5s)

**实际影响**: 极低 (box-shadow 性能 OK)

### P2-2. ErrorReviewPage 多个动画可能同时触发 (冲突检查)

**位置**: `src/pages/ErrorReviewPage.tsx` 答对时

**可能冲突**:
- 答对时: correct-pop (icon scale) + correct-pulse (filter drop-shadow) + confetti-fly (1 颗) + playCorrectSound (200ms) + CountUp (进度数字)
- 100% 完成: confetti-big (16 颗) + confetti-fade 200ms 后 + playCompleteSound (800ms) + progress-circle (圆环 600ms) + progress-circle-complete (drop-shadow)
- 连续 5 连: streak-badge + correct-pop + correct-pulse + confetti-fly (3 种动画同时)

**实际影响**: 视觉上 OK (都是不同元素), 但 GPU 压力中. 错 3 红 + 答对时可能同时触发 (W149 反馈 43 + 34).

**建议** (P2 小修):
- 错 3 红 触发时, 答对 confetti-fly 跳过 (降低冲突)
- 或错 3 红 优先级低, 让位给答对反馈

### P2-3. CSS @keyframes 总数 35+ 在大屏幕性能

**位置**: `src/index.css` (W149 累计 35 个 @keyframes)

**问题**:
```bash
grep -c "@keyframes" src/index.css  # 大约 35+
```

35 个 keyframes 都在全局, 当多个组件同时动画 (W149 反馈 34+35+36+37+40+41+42+43 在错题页同时存在) 时, GPU 压力大.

**建议** (P2 小修):
- 0 业务变更, 不必修
- 未来如果性能问题, 拆分到子 component 的 CSS module

---

## 回归检查

### 0 emoji (W146 硬约束)

```bash
git diff v2.1.29..v2.1.43 -- src/ | python3 -c "..."
# 输出: 0 emoji 增量 ✅
```

W149 16 反馈 0 新增 emoji, 老文件 emoji 是 W146 之前就有的 (不在 W149 范围).

### TypeScript (npx tsc --noEmit)

```
0 错误
```

### Test (npx vitest run)

```
140 test files / 2173 tests passed
```

W149 累计 232 个新测试 (16 反馈), 老测试无 regression.

### Lighthouse 推测 (沙盒无 Chrome, 跳过)

预计 W149 反馈 1+2 (页面切换 class toggle) 维持 1.7s LCP.
新动效多数在交互层 (答完题), 不影响 LCP.

---

## 关键决策

### ✅ 维持现状 (不修 P0 内存泄漏)

- 实际触发概率极低 (用户 750ms 内切页罕见)
- 修法简单, 15 行代码, 应该顺手修
- 修法不影响业务, 0 emoji 维持, 0 测试影响

### ✅ 维持现状 (P2 性能)

- box-shadow 性能 OK, infinite 在 0.8s 周期够短
- 35 个 keyframes 全局 OK, 没用户反馈卡
- 业务优先, 性能调优 W150 再考虑

---

## W150 决策建议

基于本次 review:
- **P0-1 必修**: ErrorReviewPage setTimeout 内存泄漏 (15 行修法)
- **P1-2 该修**: streak / next-card-warn 加 tooltip + aria-label (a11y)
- **P2 暂缓**: 性能, 待真实用户用 1 周后再决定

P0 + P1 预计 ~30 行代码, 1 个 commit, 0 emoji, 0 业务变更.
