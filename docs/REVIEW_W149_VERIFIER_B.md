# W149 Verifier B 报告 — 16 反馈微动效 (Code Quality)

**commit 范围**: v2.1.29..v2.1.43 (15 commits, 5072 lines)
**最新 commit**: 47a18b9
**date**: 2026-08-18

---

## TL;DR

| 项 | 结果 |
|---|---|
| `tsc --noEmit` | ✅ 0 error |
| `vitest` (140 files / 2173 tests) | ✅ all pass |
| `vite build` | ✅ built in 22.40s, PWA 生成 |
| P0 必修 | 0 |
| P1 该修 | 4 |
| P2 小修 | 5 |

> 16 反馈微动效 整体质量良好, 没找到 P0. 4 个 P1 集中在 a11y / 资源清理 / 视觉冲突.

---

## P1 (该修, 4)

### P1-1. Switch 组件无 accessible name — 屏幕阅读器读 "switch" 没名字

**位置**: `src/components/Switch.tsx:13-39`

**问题**: `<span role="switch" aria-checked={checked}>` 内只有空的 `<span className="switch-thumb" />`, 外层 `<label>` 包裹的 label 文本在 sibling `<span>`, 跟 role="switch" 元素无 `aria-labelledby` / `aria-label` 关联 — `<label>` 包非 form 控件 在 WAI-ARIA 语义下不创建隐式关联, 屏幕阅读器读 "switch" + "on/off" 但无名字.

**修复**: 给 `<span role="switch">` 加 `aria-label={label}` (label prop 已传入), 或用 `aria-labelledby` 关联外面 label span (给 label span 加 id).

---

### P1-2. ErrorReviewPage `streak5` + `streak10` 同时显示 — 双徽章 UX 冲突

**位置**: `src/pages/ErrorReviewPage.tsx:753-797`

**问题**: 当 `session.history.length === 10` 且全 perfect/good 时, `streak5=true` (因为 last5 ⊂ last10) **且** `streak10=true`, 两个 IIFE 都返回 JSX — "5连" 琥珀色徽章 + "10连" 红色徽章 + "NEW HIGH!" 一起渲染. 期望: 达到 10 连时只显示 10 连徽章 (5 连被升级覆盖).

**修复**: streak5 IIFE 条件加 `!streak10`, 或在 streak10 IIFE 里把 streak5 徽章一起渲染时隐藏.

---

### P1-3. ErrorReviewPage setTimeout 无清理 — unmount 后 setState

**位置**: `src/pages/ErrorReviewPage.tsx:180, 190`

**问题**: `setTimeout(() => setFlyConfetti(null), 750)` (line 180) 和 `setTimeout(() => playCompleteSound(), 200)` (line 190) 在 `handleSubmit` 内创建, 但 handleSubmit 的 useCallback 依赖只有 state, **没有 unmount cleanup**; 用户答完一题后 750ms 内离开页面, setFlyConfetti 在已 unmount 组件上触发 setState (React 18 静默忽略但有 warning), setTimeout 句柄本身到 GC 前不释放.

**修复**: 把 setTimeout ID 存 `useRef`, 组件 unmount 时 `clearTimeout(ref.current)`; 同样在 `handleSubmit` 开头清理上一个未触发的 timeout.

---

### P1-4. 进度条 fill (300ms) 跟 圆环 (600ms) 动画时长不一致 — 视觉撕裂

**位置**: `src/pages/ErrorReviewPage.tsx:407-444` + `src/index.css:344, 459`

**问题**: 进度条 (`.progress-fill`) transition 是 `width 300ms`, 圆环 (`.progress-circle`) transition 是 `stroke-dashoffset 600ms` — 同一份 `progress` 数据驱动两个不同步动画, 用户视觉上感觉 "条先到, 环慢半拍", 像 bug.

**修复**: 二选一 (A) 把圆环改成 `transition: stroke-dashoffset 0.3s var(--ease)` 跟条对齐; (B) 圆环用 `progressCircle` keyframe (死代码) 替代 inline `strokeDashoffset` 走 1.2s 描边动画, 跟条解耦 (条 = 即时反馈, 环 = 庆祝描边), 但要明确语义.

---

## P2 (小修, 5)

### P2-1. `@keyframes progressCircle` + `--circumference` 死代码

**位置**: `src/index.css:339-342`

**问题**: `@keyframes progressCircle { from { stroke-dashoffset: var(--circumference) } to { stroke-dashoffset: var(--offset) } }` 定义了但 ErrorReviewPage 走的是 inline `strokeDasharray={circumference} strokeDashoffset={circleOffset}` + `.progress-circle` 的 `transition: stroke-dashoffset 0.6s`, keyframe 0 引用.

**修复**: 删 `@keyframes progressCircle` + 默认 `--circumference, 283` `--offset, 0` 死代码, 或改 ErrorReviewPage 走 CSS var + keyframe (取一).

---

### P2-2. `.confetti-particle` + `@keyframes confettiPop` 死代码

**位置**: `src/index.css:294-305`

**问题**: `.confetti-particle` (8 小圆点) 在 src/ 0 引用 — 已被 `.confetti-big` (16 颗) 取代, 但 CSS 还在, tests/w149-motion-8.test.ts:78-79 用 regex 锁住, 删 CSS 改测试.

**修复**: 删 `.confetti-particle` + `@keyframes confettiPop`, 同步删 tests/w149-motion-8.test.ts 那个 case.

---

### P2-3. `.audio-ripple` + `@keyframes audioRipple` 死代码

**位置**: `src/index.css:361-368`

**问题**: `@keyframes audioRipple` 跟 `.audio-ripple` 在 src/ 0 引用 — 注释说 "audio 不可见, 这里给视觉模拟" 但实现后没用. 0 test 锁.

**修复**: 删 8 行.

---

### P2-4. `playTapSound` 导出但 0 调用

**位置**: `src/lib/sound.ts:77-79`

**问题**: `playTapSound` 公开导出, src/ 0 引用, 是 "留作将来" 的占位 — 主人 hard rule "0 dead code".

**修复**: 删 `playTapSound` export.

---

### P2-5. Switch 双击区域重叠 — `<label>` 包 `<span role="switch" onClick>` 双触发

**位置**: `src/components/Switch.tsx:15-32`

**问题**: 外层 `<label>` (点 label 自动 click 内 first input) 跟内层 `<span role="switch" onClick>` 同时绑 click — label 的隐式 click-to-control 行为会触发内层 span 的 onClick, 但因为 role="switch" 不是 form control, 部分浏览器 label-click 不触发 onClick, 部分会双触发; 同时, 内层 onKeyDown 的 Enter 也会冒泡到 label, 不会双触发但 tab 顺序奇怪.

**修复**: 把 onClick 移到外层 `<label>` (label 已是可点击), 删内层 onClick; 或加 `e.stopPropagation()` on 内层 onClick. 任一即可.

---

## 验证命令输出

```
$ npx tsc --noEmit
(0 error, exit 0)

$ npx vitest run --reporter=default
Test Files  140 passed (140)
Tests       2173 passed (2173)
Duration    202.26s

$ npx vite build
✓ built in 22.40s
PWA v1.3.0 / precache 120 entries (3657.00 KiB)

$ git diff --stat v2.1.29..v2.1.43
167 files changed, 5072 insertions(+), 108 deletions(-)
```

---

## 文件改动覆盖 (W149 反馈 1-43)

| 反馈 | 文件 | 验证 |
|---|---|---|
| 1, 2 page 切换 | Layout.tsx (31 +) | ✅ contentRef + class toggle 替代 key={pathname} |
| 3 hover lift | index.css (.stagger-item) | ✅ scale(1.005) + box-shadow |
| 4-7 modal / progress / dark | index.css + 5 modal | ✅ modal-popup / progress-fill 全测 |
| 8-10 toast / tts / word stagger | Toast / TTSButton / WordDetail | ✅ |
| 11 count-up | CountUp.tsx (46 +) | ✅ RAF cleanup 正确, deps [value, duration] |
| 12-13 sidebar indicator | 已有 | ✅ |
| 14 404 | NotFoundPage.tsx (50 +) | ✅ fade-up + spring 0.4s |
| 15-17 streak / focus | index.css | ✅ |
| 18 Switch | Switch.tsx (40 +) | ⚠ P1-1 a11y 缺名字 |
| 19-21 Switch 集成 / Skeleton / icon | Settings / DailyWordCard / ErrorReview | ✅ |
| 22 错题进度 | ErrorReviewPage | ⚠ P1-4 双动画时长不一致 |
| 24-25 多 Switch | AppearanceSection | ✅ |
| 26 slider | index.css | ✅ |
| 27 颜色脉冲 | index.css + ErrorReview | ✅ |
| 28 confetti 8 | index.css (.confetti-particle) | ⚠ P2-2 死代码 |
| 29 字号 | index.css | ✅ |
| 31 音效 | sound.ts (79 +) | ✅ AudioContext 单例 + suspend resume |
| 32 圆环 | ErrorReviewPage + index.css | ⚠ P1-4 + P2-1 keyframe 死 |
| 33 sidebar 标题 | Layout.tsx (key={shortTitle}) | ✅ |
| 34 单颗 confetti | ErrorReview + .confetti-fly | ✅ |
| 35 大 confetti | ErrorReview + .confetti-big | ✅ 16 颗 transform-only |
| 36 震动 | ErrorReview navigator.vibrate | ✅ try/catch 桌面静默 |
| 37 streak 5 | ErrorReview .streak-badge | ⚠ P1-2 跟 streak10 冲突 |
| 38 sparkline | ErrorReview + .sparkline-path | ✅ |
| 39 warning-pulse | ErrorReview + index.css | ✅ history>10 触发 |
| 40 NEW HIGH! | ErrorReview .new-high-blink | ✅ |
| 41 火焰徽章 | ErrorReview .streak-fire-pulse | ✅ |
| 42 答对率 | ErrorReview 自动算 | ✅ 3 档色 ≥80/≥50/<50 |
| 43 错 3 红 | ErrorReview .next-card-warn | ✅ last3 slice 触发 |

---

## 已检查但无问题

- **CountUp.tsx RAF cleanup**: 正确 — `useRef<number | null>` + `cancelAnimationFrame` in cleanup, deps `[value, duration]` 完整.
- **sound.ts AudioContext 单例**: 单例 + suspend resume 正确; OscillatorNode stop 后自动 GC, 无泄漏.
- **ErrorReviewPage saveSession useEffect**: 单 `[session]` dep 完整, saveSession 内部从 session 提 cardIds.
- **Layout.tsx contentRef 触发 reflow**: `void el.offsetWidth` 标准做法, GPU 友好的 will-change 已加.
- **TS strict**: 0 error, `(window as any).webkitAudioContext` 唯一一处 `any`.
- **CSS 性能**: 16 颗 confetti 全用 `transform: translate/scale/rotate` (GPU), `progress-circle` 用 `stroke-dashoffset` (非 layout), `sparkline` 同 — 0 layout thrash 风险.
- **a11y reduced-motion**: `.stagger-item / .page-transition / .modal-popup / .modal-backdrop / .progress-fill` 都包在 `@media (prefers-reduced-motion: reduce)`, 通过 w149-motion-2.test 验证. `streak-badge / streak-fire-pulse / new-high-blink / confetti-*/ next-card-warn / warning-pulse` 是装饰性, 显式不强制关 (语义信息在徽章颜色/边框).

---

## 硬约束自检

- ✅ 0 emoji 增量: ErrorReviewPage 仍用既有 🔁/📋/🎉/✓/✗ 等 (W148 之前), W149 反馈 40/41 走 IconTrophy SVG + NEW HIGH 文字.
- ✅ 0 业务变更: handleSubmit / handleNext / handleResume / answerInSession / session 持久化逻辑 0 改, 仅加 confetti / sound / streak 徽章 / 进度圆环 / sparkline 视觉.
- ✅ 0 测试覆盖降低: 13 个 w149-* test 新增 1576 行, w149-motion-12.test 锁 streak10, w149-motion-11 锁 streak5, w149-motion-8 锁 .confetti-particle 死代码 (这一条导致 P2-2 删 CSS 必须同步改 test).
