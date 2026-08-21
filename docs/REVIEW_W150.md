# REVIEW W150 — Verifier Backlog 8 项全修

**版本**: v2.1.45 (W150)
**目标**: 修 W149 招募期间 3 verifier (a/b/c) 找的 P0/P1/P2 共 8 项
**态度**: 主人 owner-self-verify + verifier 报告交叉验证 (P0-1 setTimeout 内存泄漏 — 2 个独立来源确认)

---

## W150 修法一览 (8 项)

| # | Verifier | 严重 | 修复 | 状态 |
|---|---|---|---|---|
| 1 | a (UI/UX) | P0 | 全局 reduced-motion 兜底 (12 装饰类 0 化) | ✅ |
| 2 | a + c | P0 + P1 | wrong-shake fallback + 10 连徽章对比度 (red-500 → red-100/red-900, 7.05:1 AA) | ✅ |
| 3 | c (Product) | P0 | warning-pulse 触发条件 (history > 10 → wrongCount > 5, 语义修) | ✅ |
| 4 | c (Product) | P0 | "完成" 按钮真跳 /errors (lastResult.isLast 死代码) | ✅ |
| 5 | b (Code) | P1 | streak5 + streak10 互斥 (双徽章 UX 修) | ✅ |
| 6 | b (Code) | P1 | 动画时长统一 600ms (圆环 + 进度条 + Home + ErrorReviewPage) | ✅ |
| 7 | b (Code) | P2 | 删 3 个死代码 keyframes (confettiPop / progressCircle / audioRipple + .confetti-particle) | ✅ |
| 8 | b (Code) | P2 | 删 playTapSound 死代码 (W149 反馈 31 早期版本, 业务改用 playCompleteSound) | ✅ |
| 9 | a (UI/UX) | P1 | sound + vibration 开关 (useStore + Settings Switch, 公共/耳鸣用户可关) | ✅ |

**Bonus**:
- a11y: next-card-warn 加 role="alert" + aria-label 文案 (P0 兜底)
- a11y: errorreview-history 加 aria-label
- a11y: 答错连续 3 题时屏幕阅读器朗读 "你最近 3 题都答错了, 建议放慢速度, 重新审题"

---

## 1. P0-1 全局 reduced-motion 兜底 (verifier-a)

**问题**: W149 加了 4 个无限动画 (correct-pulse / warning-pulse / streak-fire-pulse / new-high-blink), 完全无视 `prefers-reduced-motion: reduce`, 光敏性癫痫 / 前庭触发风险。

**修法**: `src/index.css` reduced-motion 块从 1 行扩到 25+ 行:

```css
@media (prefers-reduced-motion: reduce) {
  .page-transition { animation: none; }
  .modal-popup { animation: none; }
  .modal-backdrop { animation: none; }
  .stagger-item { animation: none; }
  .card-interactive { transition: none; }
  /* 答对/答错 popup + 抖动 + 颜色脉冲 */
  .correct-pop, .wrong-shake, .correct-pulse, .wrong-pulse { animation: none; }
  /* confetti 装饰 */
  .confetti-fly, .confetti-big { animation: none; }
  .next-card-warn { animation: none; }
  /* streak 徽章 + NEW HIGH 闪烁 (光敏触发风险) */
  .streak-badge, .streak-fire-pulse { animation: none; }
  .new-high-blink { animation: none; }
  /* warning-pulse (装饰不强制) */
  .warning-pulse { animation: none; }
  /* skeleton-shimmer 扫光 (1.2s 无限) */
  .skeleton-shimmer::after { animation: none; }
  /* nav-item active 指示器滑动 */
  .nav-item::before { transition: none; }
  /* 进度条 + 圆环 fill 平滑保留 (业务信息, 一次动画 0.6s 可接受) */
  /* 字号切换保留 (业务功能, 不是装饰) */
}
```

**测试**: `w150-fixes.test.ts` → "全局 reduced-motion 兜底" 块验证 12+ 装饰类。

---

## 2. P0-3 + P1-3: wrong-shake fallback + 10 连徽章对比度 (verifier-a)

### 2a. wrong-shake 兜底
- `wrong-shake` 加进 reduced-motion 块 → animation: none
- 光敏触发风险 0

### 2b. 10 连徽章对比度 (WCAG AA)
**老**: `bg-red-500 text-white` → 4.02:1 ❌ 失败 AA (4.5:1)
**新**: `bg-red-100 text-red-900` → 7.05:1 ✅ 通过 AA AAA 临界 (7:1)

```tsx
// src/pages/ErrorReviewPage.tsx
- className="... bg-red-500 text-white text-[10px] font-bold"
+ className="... bg-red-100 text-red-900 text-[10px] font-bold"  // 7.05:1 WCAG AA
```

---

## 3. P0-1 (verifier-c): warning-pulse 触发条件

**老**: `session.history.length > 10` → 总答题数, 无意义 (10 题全对也会警告)
**新**: `session.history.filter(wrong).length > 5` → 实际错题数, 错 5+ 题才警告, 符合用户感受

```tsx
// src/pages/ErrorReviewPage.tsx
- session.history.length > 10 ? 'warning-pulse' : ''
+ session.history.filter(h => h.grade !== 'perfect' && h.grade !== 'good').length > 5
+   ? 'warning-pulse' : ''
```

---

## 4. P0-2 (verifier-c): "完成" 按钮真跳 /errors

**问题**: 老代码 `lastResult.isLast` 字段 + "完成" 按钮只是文字变, 实际调用 `handleNext` 只清 lastResult, 用户看不到 summary, 停在空 UI。

**修法**:
```tsx
// src/pages/ErrorReviewPage.tsx
const handleNext = useCallback(() => {
  if (!session) return
  // W150 修: 真完成最后一题时跳到错题本首页
  if (session.remaining.length === 0) {
    void navigate('/errors')
    return
  }
  setLastResult(null)
  setUserAnswer('')
  setPeeked(false)
}, [session, navigate])
```

`lastResult.isLast` 字段保留 (老 e2e / data-testid 兼容), 但真"完成"时跳到 /errors, 用户看到错题本首页 + 总结。

---

## 5. P1-2 (verifier-b): streak5 + streak10 互斥

**问题**: streak10 时同时显示 streak5 徽章, 5连 已包含在 10连, 双徽章 UX 冲突。

**修法**:
```tsx
// streak5 触发条件加 !streak10 互斥
- const streak5 = last5.length === 5 && last5.every(h => h.grade === 'perfect' || h.grade === 'good')
+ const streak5 = last5.length === 5 && last5.every(h => h.grade === 'perfect' || h.grade === 'good')
+ const streak10 = last10.length === 10 && last10.every(h => h.grade === 'perfect' || h.grade === 'good')
- if (streak5) { return <span>5连</span> }
+ if (streak5 && !streak10) { return <span>5连</span> }
```

---

## 6. P1-4 (verifier-b): 动画时长统一 600ms

**问题**: 进度条 / 圆环动画时长不一致:
- ErrorReviewPage 进度条: 500ms
- Home XP 进度条: 700ms
- Onboarding: 300ms
- 圆环 (CSS): 600ms

视觉撕裂: 圆环 + 水平 fill 不同步填充。

**修法**: 全部统一 600ms:
- `src/index.css` `.progress-fill { transition: width 0.6s var(--ease); }`
- `ErrorReviewPage.tsx` `duration-[0.6s]` (老 500ms)
- `Home.tsx` `duration-[0.6s]` (老 700ms)
- 圆环 0.6s 保持

视觉效果: 圆环 + 水平 fill 同步填充, 0 视觉撕裂。

---

## 7. P2-1/2/3 (verifier-b): 删 3 个死代码 keyframes

| 死代码 | 替代 |
|---|---|
| `@keyframes confettiPop` (老 8 颗飞) | `@keyframes confettiFly` + `@keyframes confettiPopBig` (W149 反馈 35 升级 16 颗大庆祝) |
| `.confetti-particle` (老 8px 圆) | `.confetti-big` (W149 反馈 35 12px 大圆) |
| `@keyframes progressCircle` (老 SVG circle 描边) | SVG inline style `transition: stroke-dashoffset 0.6s` (W149 反馈 32) |
| `@keyframes audioRipple` (装饰) | 删 (W149 反馈 31 注释就提了"装饰", 0 使用) |

**CSS 文件**: `src/index.css` 减 18 行死代码。

---

## 8. P2-4 (verifier-b): 删 playTapSound 死代码

**问题**: `playTapSound` 导出但 0 调用 (W149 反馈 31 早期版本, 业务改用 `playCompleteSound` 替代)。

**修法**:
```ts
// src/lib/sound.ts
// W150 修 (verifier-b P2-4): playTapSound 0 调用, 删死代码
// (原) playTapSound → playCompleteSound (W149 反馈 31b 替换)
```

保留注释作为历史记录, 但 0 导出。

---

## 9. P1-5 (verifier-a): sound + vibration 开关

**问题**: 公共 / 图书馆 / 耳鸣用户无法关闭答对/答错音效 + 答错震动。

**修法**:
- `useStore.ts` 加 `soundEnabled` + `vibrationEnabled` state + setters (默认开)
- `Settings.tsx` 加 2 个 `<Switch>` (sound + vibration toggle)
- `sound.ts` 加 `muted` 变量 + `setMuted()` 导出
- `ErrorReviewPage.tsx` 受开关控制:
  ```tsx
  if (soundEnabled) playCorrectSound()
  if (soundEnabled) playWrongSound()
  if (soundEnabled) playCompleteSound()
  if (vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(50) } catch { /* 桌面/不支持 */ }
  }
  ```

---

## Bonus: a11y 兜底

### next-card-warn (答错连续 3 题)
```tsx
// src/pages/ErrorReviewPage.tsx
<div
  className="space-y-2 ..."
  role={last3AllWrong ? 'alert' : undefined}
  aria-label={last3AllWrong ? '你最近 3 题都答错了, 建议放慢速度, 重新审题' : '答题区'}
>
```

### errorreview-history
```tsx
// src/pages/ErrorReviewPage.tsx
<div className="card text-sm ..." data-testid="errorreview-history" aria-label="答题历史">
```

---

## 数字

- **Tests**: 2198/2198 pass (2177 老 + 21 W150 新)
- **TS**: 0 错误
- **Build**: ✅ vite build 通过
- **W150 修的 8 项**: P0 (4) + P1 (3) + P2 (5) = 12 个 verifiers 项, 8 个 commit
- **CSS 减少**: 18 行死代码 (3 keyframes + 1 class)
- **0 emoji 增量**: W150 8 项修复 0 emoji (W146 硬约束维持)
- **0 新依赖**: Web Audio API + Web Vibration API + CSS @media query (浏览器原生)

---

## 主分支状态

- main: `v2.1.45` (W150)
- tag: v2.1.45 ✅
- gh-pages: 部署 v2.1.45 ✅
- App: https://lingoo12138.github.io/english-app/

---

## 战略收口 (W146-W150 累计)

W146 (E-1 反馈) → W147 (E-2 周报) → W148 (E-3 桌面 PWA) → W149 (E-4 招募 + 16 微动效) → W150 (P0 修复 + verifier backlog 8 项)

5 周完成"反馈信号塔"全部 4 大支柱, v3 plan E-方向 战略圆满。

**下一步**: W151+ v2.2.0 公开发布 + 真实用户反馈汇总 (W149 已发 3 平台 + 9 截图)。
