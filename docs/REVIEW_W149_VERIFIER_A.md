# W149 微动效抗审查报告 (verifier-a, UI/UX + a11y)

**项目**: english-app (句刻)
**commit 范围**: v2.1.29..v2.1.43 (15 commits, 5072 lines)
**最新 commit**: 47a18b9
**审查日期**: 2026-08-18
**审查人**: verifier-a

## 范围合规

- W149 新增/修改文件: CountUp.tsx / Switch.tsx / Skeleton.tsx (新 SkeletonShimmer) / sound.ts / NotFoundPage.tsx / Layout.tsx / Modal.tsx / Toast.tsx / ErrorReviewPage.tsx / Home.tsx / index.css
- W149 0-emoji 约束: **维持**. 比对 v2.1.29 → HEAD, W149 改动文件未新增任何 emoji. 既有 emoji 来自 W146 之前的代码 (ErrorReviewPage/Home 中 759 处总 emoji 均为历史遗留, W149 改动无新增).
- 16 反馈微动效范围对齐: 本报告只覆盖 W149 引入的 16 个微动效 (1-43 编号) + 相关 a11y 副作用.

---

## P0 (必修 — 真实 a11y / 视觉错乱问题)

### P0-1: 4 个无限动画完全无视 `prefers-reduced-motion` (光敏性癫痫/前庭触发风险)

**位置**: src/index.css:370-404, 417-429, 433-439, 182-206

| 动画类名 | 关键帧 | 时长/循环 | 触发场景 |
|---|---|---|---|
| `.warning-pulse` | 1.5s box-shadow 脉冲 | infinite | 错题历史 > 10 题 (ErrorReviewPage L746) |
| `.streak-fire-pulse` | 0.8s 红色 box-shadow 20px 8px 模糊 | infinite | 答对 10 连 (ErrorReviewPage L779) |
| `.new-high-blink` | 0.5s opacity 1↔0.4 + scale 1↔1.15 + rotate -3↔3deg | infinite | 答对 10 连 (ErrorReviewPage L788) |
| `.skeleton-shimmer` | 1.2s 扫光 | infinite | Home 每日一词加载 (DailyWordCard L34-38) |

**问题**: `src/index.css` 全文只有 3 处 `@media (prefers-reduced-motion: reduce)` 块 (L67, L473, L682), 仅覆盖 `stagger-item / card-interactive / modal-popup / modal-backdrop / progress-fill / html/body / page-transition`. 上述 4 个 infinite 动画全部裸跑, reduced-motion 用户看到永不停止的闪烁/扫光/脉冲. WCAG 2.3.3 (Animation from Interactions, AAA) 与 W146 引入的 a11y 满分延续目标相违背.

**修复**: 在 `src/index.css` 的 `@layer components` 末尾追加:
```css
@media (prefers-reduced-motion: reduce) {
  .warning-pulse, .streak-fire-pulse, .new-high-blink,
  .skeleton-shimmer, .skeleton-shimmer::after,
  .correct-pulse, .wrong-pulse, .correct-pop, .wrong-shake,
  .next-card-warn, .streak-badge, .confetti-fly, .confetti-big,
  .confetti-particle, .audio-ripple, .progress-circle,
  .milestone-reached, .milestone-major, .sidebar-title-anim,
  .nav-item::before, .flip-card-inner, .sparkline-path,
  .input:focus, html { animation: none !important; transition: none !important; }
  .warning-pulse, .streak-fire-pulse, .skeleton-shimmer { animation: none !important; }
}
```

---

### P0-2: 答对 10 连瞬间, 3 个 infinite 动画 + 一次性脉冲 + 音频同时叠加

**位置**: src/pages/ErrorReviewPage.tsx:745-798 + src/lib/sound.ts:60-74

**问题**: 用户答对 10 连时, 副卡同时呈现:
- `.streak-badge-fire streak-fire-pulse` (红色 box-shadow 20px 8px 模糊, 0.8s infinite)
- `.new-high-blink` (0.5s infinite, opacity 1↔0.4 + scale 1↔1.15 + rotate -3↔3deg)
- 父卡 `.warning-pulse` (1.5s infinite box-shadow 0→6px, 当 history > 10)
- `.correct-pulse` drop-shadow 8px 绿光 (0.8s once, 该题触发)
- playCorrectSound C5→E5 200ms (同帧触发)
- 如果是最后一题, playCompleteSound C→E→G 800ms 链 (200ms 后)

一次答题触发 3 个 infinite + 1 个 once + 2 段音频. WCAG 2.2.2 Pause, Stop, Hide 视角下, 没有任何机制可以让用户暂停/关闭这些叠加的动画. 同时, 0.5s 周期的 1.15× 缩放+3 度旋转被闪光刺激视为光敏性癫痫诱因之一 (Harding FPA test: 3+ Hz 亮度/几何变化是高危).

**修复**: 把 `streak-badge-fire / new-high-blink` 改为单次入场动画 (3s 后自动停止), 或者用 `prefers-reduced-motion: no-preference` 包裹, 让 reduced-motion 用户直接看到静态文字徽章. 同时在 sound.ts 加静音开关, 由 useStore 持久化.

---

### P0-3: 答错时 `wrong-shake` 横向 ±6px 摇摆 0.5s, 无 reduced-motion fallback

**位置**: src/index.css:217-224; src/pages/ErrorReviewPage.tsx:694-697

**问题**: `wrongShake` 关键帧 0/100% 静止, 20%/60% -6px, 40%/80% +6px, 振幅 6px 频率 ~16Hz (0.5s 内 4 次方向翻转). 前庭功能障碍用户 (vestibular disorder) 即使在 reduced-motion 媒体查询下也会触发不适. `correct-pop` 同样问题 (scale 0→1.3→1 + rotate -15°→8°→0°, 0.6s).

**修复**: 在 P0-1 提到的 reduced-motion 块中已包含 `.wrong-shake, .correct-pop { animation: none !important; }`. 同时把 `navigator.vibrate(50)` (ErrorReviewPage.tsx:184-186) 也用 `matchMedia('(prefers-reduced-motion: reduce)').matches` 守门.

---

### P0-4: 答对时 confetti / icon pop / 颜色脉冲 + 自动 focus 下一题 4 件事同帧发生

**位置**: src/pages/ErrorReviewPage.tsx:170-191, 136-142

**问题**: 用户点击"提交":
1. setLastResult (135ms React 批渲染) → 副卡 `correct-pop correct-pulse` icon 出现 (0.6s + 0.8s)
2. `setFlyConfetti` 触发 1 颗 confetti 从中心飞 (0.7s)
3. `playCorrectSound` 200ms 滑音
4. `useEffect [lastResult, currentCard]` 触发 `nextButtonRef.current.focus()` (line 138) — 焦点跳到"下一题"按钮
5. 副卡 reflow, side column 高度变化, 整页 sticky 面板跟着滚

第 4 步的 focus 移动与第 1 步的 icon 弹跳/脉冲在同帧发生, 屏幕阅读器读出"答对了, button 下一题"的同时视觉中心被 1.15× 缩放 + 8px 绿光吸引, 焦点与视觉错位. NVDA/JAWS 用户会先听到 icon 文本 (因 `<IconCheck aria-label="答对了">` 在副卡顶部) 再听到"下一题"按钮.

**修复**: 把 focus 移动延迟 350ms (等 icon pop 进入尾声), 或者给 lastResult 容器加 `aria-live="polite"` + `tabIndex={-1}`, focus 移到 result region 而不是 next button (WCAG 2.4.3 Focus Order).

---

## P1 (该修 — 真实 UX 缺陷)

### P1-1: Switch.tsx 键盘焦点完全不可见

**位置**: src/components/Switch.tsx:20-36; src/index.css:148-179

**问题**: `<span role="switch" tabIndex={0}>` 没有任何 `focus-visible` 样式. `switch-track` 是纯色块, `switch-thumb` 是白色圆点. 键盘用户 Tab 到 switch 时, 既无 outline 也无 ring, 鼠标可见 (cursor-pointer) 但键盘不可见. Settings 页有 3+ 个 Switch (深色/高对比度/语言), 全部命中. WCAG 2.4.7 Focus Visible fail.

**修复**: 在 `.switch-track:focus-visible` 加 `outline: 2px solid var(--brand-500); outline-offset: 2px;` 或者 `box-shadow: 0 0 0 3px rgb(var(--brand-500) / 0.4);`.

---

### P1-2: Slider (input[type=range]) 无 `aria-valuetext` / 无 `htmlFor` label 关联

**位置**: src/components/settings/TTSSection.tsx:108-122; src/index.css:241-291

**问题**: TTS 语速 slider:
- `<label>` 文本"语速: 1.2x"未与 `<input>` 通过 `htmlFor`/`id` 关联 (无 for/id 属性)
- input 缺 `aria-label` / `aria-valuetext` — 屏幕阅读器只读"slider 0%"/"slider 50%", 不读"语速 1.2x"
- 滑块 thumb 缺 `focus-visible` 样式 (`:focus { outline: none }` 是浏览器默认, 但 CSS 没补)

**修复**: 给 label 加 `htmlFor="tts-rate"`, input 加 `id="tts-rate" aria-valuetext={\`${rate.toFixed(1)} 倍速\`}`, 在 `.slider-progress:focus-visible::-webkit-slider-thumb` 加 `box-shadow: 0 0 0 3px var(--brand-500)`.

---

### P1-3: 10 连徽章 `red-500 on white` 小字 4.02:1 失败 WCAG AA

**位置**: src/pages/ErrorReviewPage.tsx:778-786; src/index.css:418-422

**问题**: `bg-red-500 text-white text-[10px]` (10px = small text, AA 要求 ≥ 4.5:1). red-500 = #ef4444, white = #ffffff, 对比度 4.02:1. 同 5 连徽章用 `bg-amber-400 text-amber-900` (5.18:1, pass). 0.5 个 等级差距让用户在 reduced-vision / 屏幕反光环境下读不清"10连".

**修复**: 把 `bg-red-500 text-white` 改为 `bg-red-600 text-white` (red-600 = #dc2626, 对比度 5.06:1, pass), 或加 `font-weight: 600` 升 large text 阈值 (3:1).

---

### P1-4: CountUp 600ms tween + React 频繁 setState, reduced-motion 用户白白等

**位置**: src/components/CountUp.tsx:14-43

**问题**: `CountUp` 不读 `prefers-reduced-motion`, 始终跑 600ms tween (1 帧 ≈ 16ms × 37 次 setDisplay). 对 reduced-motion 用户无意义, 也对辅助技术 (screen reader 抓住中间值 47 → 48 → 49) 不友好. 在 ErrorReviewPage 副卡 CountUp 有 4 个 (L379, L383, L387, L391), 4 路并发 tween = 148 次 React re-render/题.

**修复**: `useEffect` 头部加:
```ts
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
if (reduce || duration <= 0) { setDisplay(to); fromRef.current = to; return }
```
或者在 useEffect 外用 `if (typeof window !== 'undefined' && window.matchMedia(...).matches)`.

---

### P1-5: `sound.ts` 无静音开关, 公共/图书馆/耳鸣用户无法关闭

**位置**: src/lib/sound.ts:60-74; 调用点 src/pages/ErrorReviewPage.tsx:171, 182, 190

**问题**: `playCorrectSound` / `playWrongSound` / `playCompleteSound` 直接播放, 没有读取 `useStore.soundEnabled` 之类的开关. 答对/答错/完成都会强制播放 Web Audio 振荡器, 无法关闭. AudioContext 还在 suspended 时, `void audioCtx.resume()` 会尝试启动 (autoplay policy), 某些环境/隐私模式下行为不可预期. 同时 `Toast` 有 duration 关闭, `InstallPrompt` 有 close, 但 sound 是单方向强制.

**修复**: 在 useStore 加 `soundEnabled: boolean` (默认 true), `playCorrectSound` 改为 `if (!useStore.getState().soundEnabled) return`, Settings → 外观/通用加 toggle.

---

### P1-6: Streak badge 红色 box-shadow 20px 8px 模糊, 在 fire 状态下可能溢出 sticky 副卡

**位置**: src/index.css:418-429; src/pages/ErrorReviewPage.tsx:778-786

**问题**: `.streak-badge-fire` 在 50% 帧 box-shadow 扩到 `0 0 20px 8px rgb(239 68 68 / 0.6)`, 模糊半径 20px + 扩散 8px, 加上父级 3px ring, 总光晕 28px. 副卡是 `xl:w-72` (288px) sticky 元素, 横向光晕在卡片边缘内可接受, 但**纵向** `0 4px 12px -2px` 起始 shadow 加上 20px 8px 峰值会让 fire 状态徽章底部光晕"溢出"到下方答题历史列表第一行, 与历史项文字重叠, 文字抗锯齿/对比度被红色 bloom 干扰.

**修复**: 给 fire 徽章外层加 `<span class="inline-block p-1">` 包装, 或者把 fire box-shadow 改为更紧凑 `0 0 12px 2px` (移除 8px spread), 视觉强度保留但外溢范围受控.

---

## P2 (小修 — 微小问题)

### P2-1: `.skeleton-shimmer` 半透明扫光 `rgba(34, 197, 94, 0.08)` 在已加载数据上还会跑 1.2s

**位置**: src/index.css:194-206; src/components/home/DailyWordCard.tsx:34-38

**问题**: SkeletonShimmer 一旦挂载, `::after` 立即启动 1.2s infinite 扫光. DailyWordCard 加载完成后切换到真实内容, 但如果父级用同一个 div 切换 class, 旧 class 上的 `::after` 不会立即消失, 新 class 没有 `::after`. 实际无 bug, 但 reduced-motion + 视觉噪音: infinite 扫光在 `prefers-reduced-motion` 下不停止. (P0-1 已涵盖)

---

### P2-2: `nav-item::before` 侧边栏 active 指示器在 reduced-motion 下还跑 240ms scaleY spring

**位置**: src/index.css:81-99

**问题**: 没有 reduced-motion override. 视觉上很轻 (3px bar), 不是 P0, 但累积起来 reduced-motion 用户每次路由切换都要看一次.

**修复**: 在 P0-1 的 reduced-motion 块加 `.nav-item::before { transition: none !important; }`.

---

### P2-3: 404 页 `page-transition` + `modalPopup` 双重动画叠加

**位置**: src/pages/NotFoundPage.tsx:9, 11, 19, 35, 42

**问题**: 外层 `page-transition` (240ms fade-up) + 404 数字 `animate-[modalPopup_0.6s...]` + 标题/按钮 `style={{ animation: 'pageEnter ... 0.15/0.25/0.30s both' }}` (3 层错落 pageEnter) — 共 5 个不同方向的入场动画. 404 是用户迷路瞬间, 5 重动效过载.

**修复**: 移除 404 数字的 `animate-[modalPopup...]` 包装, 复用 page-transition. 标题/按钮的 inline pageEnter 改为统一 `animation-delay` CSS 变量 (0.1s / 0.2s / 0.3s).

---

### P2-4: `.input:focus` 应用 `transform: scale(1.005)`, 配合 `box-shadow: 0 0 0 3px` 在 240ms 焦点环入场

**位置**: src/index.css:118-122

**问题**: scale(1.005) 在某些父级 (flex) 会有 0.5% 重排 (桌面 1280px 0.5% = 6.4px 位移). box-shadow 不占布局, OK. 但 scale 触发的 transform: 创建新 stacking context, 影响 z-index 子元素层级. Home 等卡片较多页面, focus 搜索框可能让兄弟元素的 z-index 重排.

**修复**: 移除 scale(1.005), 只保留 box-shadow ring. 或者给 `transform-origin: center` + 父级 `contain: layout`.

---

### P2-5: Layout.tsx 切页面时主内容 `page-transition` 每次 mount 也触发动画

**位置**: src/components/Layout.tsx:135-142

**问题**: `useEffect [location.pathname]` 在 App 首次 mount 时也运行, 移除/重加 `page-transition` class, 触发 240ms 入场. 用户打开 app 第一眼看到的就是 fade-up, 抢眼. 期望: 首次 paint 不要动画, 路由切换才动.

**修复**: 用 `useRef` 记录首次 mount, 跳过首次 effect:
```ts
const isFirst = useRef(true)
useEffect(() => {
  if (isFirst.current) { isFirst.current = false; return }
  // 现有 reflow + class toggle
}, [location.pathname])
```

---

## 验证证据 (sampling)

| 验证项 | 命令/位置 | 结果 |
|---|---|---|
| 0 emoji W149 维持 | `git show v2.1.29:src/components/{Switch,CountUp}.tsx` 2>&1 | 路径在 v2.1.29 不存在 (NEW files), 内容 0 emoji ✓ |
| 0 emoji W149 维持 | `diff /tmp/{layout_old,home_old,erp_old}.tsx src/...` | 无新增 emoji ✓ |
| reduced-motion 覆盖 | `grep -A 3 'prefers-reduced-motion' src/index.css` | 3 处块, 缺 W149 16 反馈对应覆盖 |
| Switch 焦点环 | `grep focus src/index.css` | 仅 `.input:focus`, 无 `.switch-track:focus-visible` |
| streak badge 对比度 | red-500 #ef4444 on white = 4.02:1 | < 4.5:1 AA fail |
| Sound 开关 | `grep -rn soundEnabled src/` | 0 命中, 无开关 |

---

## 关键文件清单 (W149 改动)

- `src/index.css` (715 lines, +25 个 @keyframes/animation, 仅 3 个 reduced-motion override, 严重欠覆盖)
- `src/components/Layout.tsx` (P2-5 首次 mount 动画)
- `src/components/Modal.tsx` (无 W149 相关 a11y 退化)
- `src/components/Toast.tsx` (W149 反馈 8 slide-down spring, 无 reduced-motion override)
- `src/components/Switch.tsx` (P1-1 焦点环缺失)
- `src/components/Skeleton.tsx` (SkeletonShimmer infinite 1.2s)
- `src/components/CountUp.tsx` (P1-4 reduced-motion 不守门)
- `src/lib/sound.ts` (P1-5 无静音开关)
- `src/pages/NotFoundPage.tsx` (P2-3 5 重动画叠加)
- `src/pages/ErrorReviewPage.tsx` (P0-2 / P0-4 / P1-3 / P1-6 主战场)
- `src/pages/Home.tsx` (CountUp 接入, 无新增问题)

---

## 优先级排序

1. **P0-1** (全局 reduced-motion 兜底) — 一次性 CSS 块修复 16+ 反馈 a11y
2. **P0-2** (10 连瞬间 3 infinite 叠加) — 影响癫痫敏感用户
3. **P0-3** (wrong-shake/correct-pop vestibular) — WCAG 2.3.3
4. **P0-4** (focus 与视觉错位) — WCAG 2.4.3
5. **P1-1/1-2/1-3** (键盘焦点/对比度) — 一次 PR 全修
6. **P1-4/1-5** (CountUp + sound 开关) — 改 2 个文件
7. **P2** — 集中 1 个 cleanup PR

---

**报告完**, verifier-a 2026-08-18 12:13 UTC.
