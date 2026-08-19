# W149 微动效抗审查报告 (verifier-c, Product 业务逻辑/数据流/产品体验)

**项目**: english-app (句刻)
**commit 范围**: v2.1.29..v2.1.43 (15 commits, 5072 lines, 16 反馈)
**最新 commit**: 47a18b9 (W149 反馈 40+41+42+43)
**审查日期**: 2026-08-18
**审查人**: verifier-c (Product 抗审查)
**范围**: W149 16 反馈的微动效, 找真实业务问题 (不列建议清单)

---

## 范围合规

- W149 16 反馈里 14 个在 ErrorReviewPage.tsx (21/27/28/31/32/34/35/36/37/38/39/40/41/42/43), 1 个在 src/lib/sound.ts (31), 1 个在 src/index.css (@keyframes 集合)
- W149 0-emoji 约束: **维持**. `git diff v2.1.29..v2.1.43` 在 src/ 下所有改动文件 0 新增 emoji (24 个 .tsx/.ts 改动文件 + index.css)
- W149 0-网络: **维持**. 音效 (Web Audio API 振荡器) + 震动 (navigator.vibrate) + CSS 动画全部本地, 无任何 fetch
- W149 0-业务变更: **违反 — 业务逻辑动了 2 处 (见 P0-1 错 3 红 触发条件 + P1-1 warning-pulse 触发条件)**
- 测试覆盖: w149-motion-{2,3,4,5,6,7,8,9,10,11,12} 共 11 个测试文件, 但测试只 grep 字符串匹配, 没覆盖业务语义边界 (history.length=0/1/100 边界 + 死代码)

---

## P0 (必修 — 真实业务逻辑/数据流问题)

### P0-1: warning-pulse 触发条件语义错, 普通用户被"警告"

**位置**: `src/pages/ErrorReviewPage.tsx:746` + `src/index.css:398-404`

**问题**: 触发条件是 `session.history.length > 10` — "已答题 > 10 题" 触发橙色 `warning-pulse` 1.5s 无限循环. 这是**普通 session 状态**, 不是警告状态. 用户答 11+ 题 (错题复习正常情况) 就开始被持续橙色脉冲骚扰整堂课. CSS 注释 `/* 错题超过 10 题时 UI 抖动警告 */` 的原意大概率是"剩余错题 > 10"或"答错题 > 10", 但实现成了"已答 > 10". 错题复习用户单 session 20-30 题常见, 该动画伴随整个后半段 session. 此外 `warning-pulse` 触发的同时, `streak-fire-pulse` 0.8s 无限 + `new-high-blink` 0.5s 无限也会叠加 (见 verifier-A P0-2), reduced-motion 用户三层动画堆 0-业务判断阈值.

**修复建议**: 改为 `session.wrong > 10 ? 'warning-pulse' : ''` 或 `session.remaining.length > 10 ? 'warning-pulse' : ''`, 让橙色脉冲对应真实警告 (错太多 / 剩余太多).

---

### P0-2: "完成"按钮文本 + `lastResult.isLast` 字段是死代码, 用户答完最后一题永远看不到

**位置**: `src/pages/ErrorReviewPage.tsx:31 (type), 167 (set), 650 (button text)`

**问题**: 推断链路:
1. `newIsLast = sessionWithDifficulty.remaining.length === 0` (L158) → `setLastResult({isLast: newIsLast, ...})` (L167)
2. 下次渲染: `isComplete = session.remaining.length === 0 && lastResult !== null` (L310)
3. JSX: `{isComplete ? <summary> : currentCard ? <lastResult 或 input>}` (L449)
4. `isLast=true` 推导出 `remaining=0` 推导出 `isComplete=true` 推导出**渲染 summary 视图, 不渲染 lastResult 视图**
5. L650 的 `lastResult.isLast ? '完成' : '下一题 →'` 按钮在 lastResult 视图里 → 当 isLast=true 时**永远不在 DOM 中**

证据: 用户 1 张卡, 答对 → remaining=0, isLast=true, isComplete=true, 渲染 summary (含 "再来一轮" 按钮), L650 的 "完成" 按钮从不被点击. `isLast` 字段写入但读取永远是 false (因为读取时 isComplete=true, 已切到 summary 视图).

这是 W149 没动但暴露的死代码, **维护性炸弹**: 后续开发者看 `isLast` 字段会以为有"答完最后一题显示完成"逻辑, 实际不存在. 同时 `lastResult.isLast` 这个布尔值对用户**毫无意义** — 用户永远跳到 summary, 永远看不到"答对最后一题 → 显示'完成'按钮"的预期交互.

**修复建议**: 要么删 `isLast` 字段 + "完成" 文本 (承认 dead code), 要么把 JSX 改为 `isComplete ? <summary> : (lastResult && !lastResult.isLast ? <lastResult> : <input>)` 让用户**先看最后一题结果再点"完成"才进 summary** — 这是 `isLast` 字段的原始意图, 但 W149 没实现.

---

### P0-3: next-card-warn 静态红边 + 5 次脉冲, 0 文案解释, 用户读不出"我在被警告"

**位置**: `src/pages/ErrorReviewPage.tsx:561-571` + `src/index.css:432-439`

**问题**: 答错连续 3 题时, 下一题 input 容器加 2px solid rose 静态边 + `nextCardWarn` 1.2s × 5 次 box-shadow 脉冲. **没有任何文字/toast/aria-live 解释为什么红**. 用户看到红边的可能反应:
- "输入框坏了?" → 试图重输
- "我刚答错了被惩罚?" → 焦虑
- "配色主题变了?" → 困惑

这是设计意图 (答错连击警告) **但传达失败**. 配色硬约束下 0 emoji, 文案是必要传达手段. `5连`/`10连` 有徽章文本 ("5连" + 颜色), 但 next-card-warn 完全没有. W149 测试 `tests/w149-motion-12.test.ts:84-106` 只 grep 字符串, 没断言"用户能感知到"任何业务需求.

更严重: 静态红边 (不是脉冲) 在用户阅读新题时一直停留 6+ 秒, 占据视觉中心 (input 是答题唯一焦点), 用户必须**忽略红边**才能答题. 实际是"先警告再要求用户做事" — 警告但阻碍任务.

**修复建议**: 在 `<label className="text-sm text-stone-500">你的答案</label>` 旁边动态加 `<span className="text-rose-500 text-xs">⚠ 连续答错 3 题, 慢一点想想</span>` (复用 0 emoji 设计 token, 仅文字), 或者用 `toast.warning` 弹一次 3s 自动消失 (Toast 组件已有). 同时考虑红边是否要做成"提示色"而非"警告色" — 答错连击不是错误, 是节奏信号.

---

## P1 (该修 — 真实 UX/边界问题)

### P1-1: setFlyConfetti 的 setTimeout 不在 handleNext 清理, 用户快速点"下一题"时小 confetti 漂在新题上

**位置**: `src/pages/ErrorReviewPage.tsx:179-180` (set) + `src/pages/ErrorReviewPage.tsx:211-216` (handleNext)

**问题**: `setTimeout(() => setFlyConfetti(null), 750)` 在 handleSubmit 启动, 不存 ref, handleNext 不清理. 用户答对 1 题 → flyConfetti 出现 → 200ms 内点"下一题" → flyConfetti 仍在 state → 渲染到新题 input 容器上方 (`<div className="absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none">` 是页面级 absolute) → 700ms 动画在新题头上跑完. 用户答题时被 1 颗 confetti 飞过头顶, 跟答对上一题无关联, 视觉错位.

数据流同步问题: setSession + setLastResult + setFlyConfetti 同步触发, 但 setTimeout 750ms 后才清 flyConfetti, handleNext 重置 lastResult/userAnswer/peeked 不重置 flyConfetti. 三个 state 跟 props 不同步.

**修复建议**: 在 handleNext 加 `setFlyConfetti(null)`, 或者把 setTimeout ref 存到 useRef, handleNext 里 clearTimeout. 顺手让 flyConfetti 的动画从 700ms 跟 setTimeout 750ms 同步 (当前 50ms 缓冲太脆).

---

### P1-2: navigator.vibrate(50) 50ms 太短, 跟 inAppReminder 不一致且体感不到

**位置**: `src/pages/ErrorReviewPage.tsx:184-186` vs `src/lib/inAppReminder.ts:80`

**问题**: 现有 `vibrateIfSupported` 用 `navigator.vibrate(200)`, W149 答错震动用 50ms. 50ms 在移动端是 1 帧 (60Hz) 振动, 多数用户体感不到. 同时是 inline 写, **没用项目已有的 `vibrateIfSupported` utility**, 重复造轮子 + 数值不一致. WCAG 2.1 视角下, 短振动不如颜色脉冲明显, 反而显得多余.

**修复建议**: 改为 `vibrateIfSupported()` 或 `navigator.vibrate(200)`, 跟项目其他震动反馈对齐. 也可考虑加 `prefers-reduced-motion` 守门 (verifier-A P0-3 已建议, 但写的是 50ms, 改 200ms 时一并加).

---

### P1-3: NEW HIGH! 标签误导 — "新高"暗示"打破记录", 实际每次 10 连都触发

**位置**: `src/pages/ErrorReviewPage.tsx:786-793`

**问题**: `streak10 = last10.length === 10 && all correct` 触发 NEW HIGH! 闪烁字. 但**没有"历史最高 streak"跟踪**, 每次达到 10 连都闪. 第一次答 10 连: NEW HIGH! (合理). 第二次答 10 连: NEW HIGH! (误导 — 没新). 第 11 连 11 连: NEW HIGH! (持续 11+ 连都闪).

业务语义: 用户期待的"NEW HIGH"= 打破自己前一次最高 10 连. 实际是"达到 10 连里程碑" → 跟"5连"徽章语义重叠. 加上 0.5s 无限闪烁, 用户每次 10 连都强制看闪烁, 体验是"哎怎么又 NEW HIGH", 反而贬值.

**修复建议**: 改成 "10 连!" 纯里程碑文案 (跟 5连/10连徽章统一), 或加 localStorage 跟踪"上次最高 streak", 只有突破才闪 NEW HIGH!. 后者更符合"NEW"语义, 也给用户长期目标.

---

### P1-4: 答对率基于"最近 20 题", 但用户看不到这个范围, 容易误读

**位置**: `src/pages/ErrorReviewPage.tsx:802-820`

**问题**: 副卡显示"答对率 X%" + sparkline, 但答对率算的是 `points = session.history.slice(-20)`, sparkline 也画这 20 题. 文案是 "最近 X 题" (X 是实际 points.length), 但用户答题时的心智是"我这 30 题错了几个" — 看到 80% 会以为整体 80%, 实际是**最后 20 题的 80%**. W89-B 难度统计、session.accuracy (buildReviewReport) 都是基于**整个 session**, sparkline 跟它们不一致.

`Math.round((correctCount / points.length) * 100)` 当 points.length=1, 答对 = 100% / 答错 = 0% — 1 题就 100% 也是误导. 边界: 答 19 题错 1 → sparkline 不显示 (gated by >= 2), 但答对率也只在 sparkline 内显示, 19 题时副卡无答对率. 业务漏.

**修复建议**: sparkline 标题改 "最近 20 题答对率" 明确范围, 或跟 session.accuracy 共享数据源. 边界 1 题时要么不显示答对率, 要么显示"答对 1/1 (100%)" 完整文本.

---

### P1-5: streak 5/10 阈值合适, 但跨 session 不持久化, 用户体感是"每次清零"

**位置**: `src/pages/ErrorReviewPage.tsx:755, 773`

**问题**: streak 完全基于 `session.history` (per-session). session 本身 IDB 持久化, 所以**单 session 内**刷新页面 streak 不丢. 但用户**第二天再来复习**, 是新 session, streak 从 0 开始. 用户期待"连续答对 streak 累积" (像 Duolingo streak), 实际是"单 session 内临时 streak". 配合 NEW HIGH! 误导 (P1-3), 用户对 streak 系统有错误心智模型.

业务意义: 5连/10连 是**短期成就感** (15 秒内), 适合单 session. 但**长期成就感**需要 IDB 跟踪每日最高 streak, 跨 session 累积. 当前实现只有短期.

**修复建议**: 短期不动 (单 session streak 设计合理). 加 IDB `errorReview.bestStreak` 跟踪, 副卡显示 "历史最高: 23 连", 跟当前 session streak 区分. 数据流: handleSubmit 末尾比对 + 更新 bestStreak.

---

## P2 (小修 — 微小问题)

### P2-1: streak 徽章文本"5连"/"10连"对首次用户无解释, 红色徽章易误读为"危险"

**位置**: `src/pages/ErrorReviewPage.tsx:765, 784` + `src/index.css:376-379, 418-429`

**问题**: `5连`/`10连` 是缩略语, 没 hover 提示 (有 `title="连续 5 题答对"` 但移动端没 hover), 新用户看不懂"5连" = 5 consecutive correct. 红色徽章 (`bg-red-500 text-white`) 在中西方文化下都有"警告/危险"暗示, 加上 `.streak-fire-pulse` 0.8s 无限 box-shadow 20px 模糊, 视觉冲击像"警报". 5连 (金色) → 10连 (红色) 的颜色升级, 业务上想表达"火焰级成就", 但用户先入为主会读"红=错" (因为答错整个系统用 rose-500 红色).

**修复建议**: 徽章文本加 `<span class="sr-only">连续 N 题答对</span>` 屏幕阅读器友好. 颜色: 10连可改用 bg-orange-500 或 bg-rose-600 区分答错 (rose-500), 视觉上"庆祝红"而非"警告红". title 移到 aria-label 兼顾移动端.

---

### P2-2: `confetti` 数组在 isComplete 时每次渲染重算 Math.random(), React 18 strict mode 双调用会随机两次

**位置**: `src/pages/ErrorReviewPage.tsx:316-326`

**问题**: `const confetti = isComplete ? Array.from({length: 16}, () => { Math.random() ... }) : []` 在函数体顶层. summary 视图虽然交互少, 但 `CountUp` 在 progress 卡片 600ms 跑 37 帧 React re-render, 每次 re-render confetti 数组都重新 random, 16 颗 dot 的 CSS 变量 `--cx`/`--cy` 改变, 动画 keyframe 在 confetti 还在跑 (1.2s) 时被新值覆盖 → confetti 位置会**跳变**.

实际: React 18 dev 模式 useEffect 双调用, confetti 也会被算两次. 浏览器渲染时 confetti 的 inline style 在 React 协调下会被 patch (key=index 0..15 复用 DOM, 但 style prop 改). 1.2s 内 style 改变 30+ 次, 视觉是 confetti 抖动.

**修复建议**: `useMemo(() => isComplete ? Array.from(...) : [], [isComplete])`, 锁定一次计算. 顺手把 `confettiColors` 也用 useMemo 包.

---

### P2-3: 答完 100% 弹 toast + summary 双倍展示同一信息

**位置**: `src/pages/ErrorReviewPage.tsx:145-149` + `src/pages/ErrorReviewPage.tsx:449-506`

**问题**: useEffect 监听 `session.remaining.length === 0 && lastResult && cards.length > 0` 弹 `toast.success('复习完成! 对 X 错 Y')`. 同时 summary 视图显示 "🎉 复习完成!" + 准确率/分数/难度/成绩/偷看报告. toast 是 3-4s 自动消失的浮层, 跟 summary 同时出现, 信息重复 (X/Y 数字在 summary "📈 分数" 也有).

业务意义: toast 适合"完成瞬间"提醒, summary 适合"完整复盘". 两个一起出现, 用户的注意力被切两次 (先 toast, 再 summary). toast 还挡视线, summary 完整报告时 toast 还在.

**修复建议**: 删 toast, 让 summary 独占完成态. 或 toast 只在 "再来一轮" 提示时弹, 不在初次完成时弹.

---

### P2-4: streak-badge 入场动画 + 父级 warning-pulse 叠加, 视觉抖动

**位置**: `src/pages/ErrorReviewPage.tsx:760, 779` + `src/index.css:376-379, 402-404, 423-429`

**问题**: 答对 5/10 时 `.streak-badge` `streakBadge 0.6s spring` (scale 0→1.3→1 + rotate -180°→20°→0) 入场. 同时如果 history > 10 (P0-1 已说过这是误触发), 父级卡是 `.warning-pulse` 1.5s 无限 box-shadow. 两个动画叠: 徽章旋转入场 + 父级脉冲底色, 视觉混乱. 10连时还有 `.streak-fire-pulse` 0.8s 无限 + `.new-high-blink` 0.5s 无限 (verifier-A P0-2 已指出).

**修复建议**: 跟 P0-1 联动修 — 改 warning-pulse 触发条件后, 父子动画冲突消除. 单独保留 streak 入场动画没问题.

---

## 验证证据 (sampling)

| 验证项 | 命令/位置 | 结果 |
|---|---|---|
| "完成"按钮死代码 | ErrorReviewPage.tsx:650 + 449 条件渲染 | isLast=true → isComplete=true → summary 替代 lastResult 视图 |
| 0 emoji W149 维持 | `git diff v2.1.29..v2.1.43` + python3 emoji regex | 24 个改动文件, 0 新增 emoji ✓ |
| warning-pulse 触发 | ErrorReviewPage.tsx:746 grep `history.length > 10` | 普通 11+ 题 session 触发, 无限循环 |
| flyConfetti 跨题残留 | ErrorReviewPage.tsx:180 + 211-216 | handleNext 不重置 flyConfetti, setTimeout 不清理 |
| vibrate 50ms vs 项目标准 | src/lib/inAppReminder.ts:80 (200ms) | 不一致, 50ms 体感不到 |
| NEW HIGH 业务语义 | ErrorReviewPage.tsx:786 + 全文件 grep `bestStreak\|maxStreak` | 0 命中, 无历史最高跟踪 |
| 答对率计算范围 | ErrorReviewPage.tsx:808-810 `points.length` | 20 题窗口, 跟 session.accuracy 不一致 |
| streak 跨 session | ErrorReviewPage.tsx:755, 773 + IDB grep | 仅 per-session history, 无跨 session 跟踪 |
| confetti 每次渲染重算 | ErrorReviewPage.tsx:316 (无 useMemo) + CountUp 600ms × 37 帧 | Math.random() 每帧重算, 1.2s 内 style 抖动 |
| testid 覆盖 | w149-motion-{10,11,12}.test.ts grep | 4 个 testid (streak-badge / streak-badge-fire / new-high / correct-rate), 0 个验证业务语义边界 |

---

## 关键文件清单 (W149 改动)

- `src/pages/ErrorReviewPage.tsx` (883 lines, 14/16 反馈落点, P0-1/2/3 + P1-1/3/4/5 + P2-1/2/3/4)
- `src/lib/sound.ts` (79 lines, W149 反馈 31, P1-2 vibrate 不一致)
- `src/index.css` (715+ lines, @keyframes 集合, P2-1 颜色 + 文本对比)
- `tests/w149-motion-{9,10,11,12}.test.ts` (测试只 grep 字符串, 没断言业务边界, 0 业务覆盖)

---

## 优先级排序

1. **P0-1** warning-pulse 触发条件 (改 1 行) — 影响所有 11+ 题用户
2. **P0-2** 死代码 (删字段 + 改 JSX) — 维护性炸弹
3. **P0-3** next-card-warn 加文案 (加 1 行 label) — 用户读不懂
4. **P1-1** flyConfetti 跨题清理 (handleNext 加 1 行) — 数据流不同步
5. **P1-2** vibrate 200ms + 用 utility (改 1 行) — 项目一致性
6. **P1-3** NEW HIGH 改 10连 (改 1 字符串) — 业务语义
7. **P1-4** 答对率文本明确 (改 1 字符串) — 用户误读
8. **P1-5** 跨 session 最佳 streak (IDB + 1 字段) — 长期成就
9. **P2** 集中 cleanup PR

---

**报告完**, verifier-c 2026-08-18 20:13 UTC.
