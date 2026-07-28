# v1.57.0 W52 — Verifier 13 独立 review (UI 集成 + 跨文件)

**日期**: 2026-07-28 (W52)
**版本**: v1.57.0 (W52 已发 tag)
**触发**: 第 13 次大 review — verifier13 独立验证
**目标**: 找主审查 + 历史 verifier (v1.52-56) 漏掉的 UI 集成 + 跨文件 bug
**评审范围**: 5 维度独立验证
**评审方式**: 静态读 v1.57.0 commit 源码 (5 验证脚本 + 5 页面 DICT 扩)
**评审时间**: ~20 min

---

## 0. 背景

- v1.57.0 已发 tag, 主审查 0 P0 (`python3 scripts/big-review-v1.57.py` 9 维度)
- v1.57.0 commit (32f25e1) 改 5 文件: `docs/CHANGELOG.md` / `docs/REVIEW_v1.57.md` / `package.json` / `scripts/big-review-v1.57.py` / `src/lib/i18n.ts`
- v1.57.0 review notes 写: "5 验证脚本优化" + "5 页面 DICT 扩 25 key" + "9 维度 0 P0"
- 本 verifier 专注 5 维度 UI 集成 + 跨文件 bug
- 评审时间 20 min, 静态读为主
- 约束: 不改 src/ 不拉 subagent 不 push

---

## 1. 找到的真 bug

### 1.1 P1: v1.57 "5 页面 DICT 扩 25 key" 口径是误导 — 实际 9/24 key 死键, 0 页面源码改

**严重度**: **P1 (v1.57 任务未实质完成, DICT 扩但 UI 无变化)**
**文件**: `src/lib/i18n.ts` (v1.57.0 commit 32f25e1)
**对比**: `git diff v1.56.0..v1.57.0 --stat` 显示 5 文件改 350 行, 但 src/pages/ 0 文件改

#### 1.1.1 现象

v1.57.0 commit 声称"5 页面 DICT 扩 25 key" (commit message: "Home 3 / PlanPage 3 / Settings 4 / CardReview 5 / ReportsPage 10, DICT 123 → 148 key"), 但 git diff 显示 **src/pages/ 下 0 文件被修改**。仅 `src/lib/i18n.ts` 加了 24 个新 DICT key (commit 写 25, 实际 24)。

```bash
$ git show v1.57.0 --name-only
docs/CHANGELOG.md
docs/REVIEW_v1.57.md
package.json
scripts/big-review-v1.57.py
src/lib/i18n.ts        # ← 仅 DICT 加 24 key
# 缺: src/pages/Home.tsx
# 缺: src/pages/PlanPage.tsx
# 缺: src/pages/Settings.tsx
# 缺: src/pages/CardReview.tsx
# 缺: src/pages/ReportsPage.tsx
```

#### 1.1.2 静态扫: 24 key 中 9 key 0 引用 (死键)

| 页面 | 新增 key | 实际使用 | 死键 |
|------|---------|---------|------|
| Home | home.welcome, home.streak_subtitle, home.daily_summary | 2/3 | home.daily_summary |
| PlanPage | plan.week_summary, plan.continue_streak, plan.completion_rate | 3/3 | (全部用) |
| Settings | settings.theme, settings.color, settings.contrast, settings.reset | 4/4 | (全部用) |
| CardReview | review.flip_back, review.correct, review.incorrect, review.show_answer, review.next_card | 1/5 | review.correct, review.incorrect, review.show_answer, review.next_card |
| ReportsPage | reports.total_words, reports.total_sessions, reports.avg_accuracy, reports.this_week, reports.this_month, reports.daily_streak, reports.weekly_chart, reports.export, reports.share | 5/9 | reports.this_month, reports.daily_streak, reports.weekly_chart, reports.export |
| **合计** | **24** | **15** | **9 (37.5%)** |

#### 1.1.3 9 死键的对应位置 (本可填, 未填)

1. **home.daily_summary** (`'今日要学 · 总完成'`)
   - 位置: `src/pages/Home.tsx:234` 硬编码 "今日学词" / `:236` "累计学词"
   - 期望: 拆成 daily_summary / total_summary, 但只加 1 key, 不够用

2. **review.correct** (`'认识'`) / **review.incorrect** (`'不认识'`)
   - 位置: `src/pages/CardReview.tsx:382-400` 用 `review.again/hard/good/easy` (4-button FSRS)
   - 期望: 2-button 简化流 (Known/Unknown), 实际未引入

3. **review.show_answer** (`'查看答案'`)
   - 位置: `src/pages/CardReview.tsx:411` 已有 `review.flip_btn`
   - 期望: 与 flip_btn 重复语义, 未替换

4. **review.next_card** (`'下一张'`)
   - 位置: 整页无 "下一张" 按钮
   - 期望: 复习完成后可能想加 "next card" 提示, 但当前流程无此按钮

5. **reports.this_month** (`'本月'`)
   - 位置: `src/pages/ReportsPage.tsx` 仅有日/周视图, 无月视图
   - 期望: 月报 tab 未来功能, 预留

6. **reports.daily_streak** (`'连续天数'`)
   - 位置: ReportsPage 不显示 streak (在 Home)
   - 期望: ReportsPage 想加 streak stat, 未来功能

7. **reports.weekly_chart** (`'周趋势'`)
   - 位置: `src/pages/ReportsPage.tsx:183` 硬编码 "📊 7 天学词"
   - 期望: 替换但未替换

8. **reports.export** (`'导出'`)
   - 位置: ReportsPage 仅 "分享" 按钮 (line 129), 无 "导出" 按钮
   - 期望: 未来导出 JSON/CSV 功能, 预留

#### 1.1.4 实际使用 (15 keys) — 一切正常

```bash
# Home (2/3)
src/pages/Home.tsx:113:        👋 {t('home.welcome')}
src/pages/Home.tsx:296:        {t('home.streak_subtitle').replace('N', String(streakState?.current || 0))}

# PlanPage (3/3)
src/pages/PlanPage.tsx:178:    📊 {t('plan.week_summary')}
src/pages/PlanPage.tsx:213:    {t('plan.continue_streak')} 🔥
src/pages/PlanPage.tsx:217:    {t('plan.completion_rate')}

# Settings (4/4)
src/pages/Settings.tsx:48:     {t('settings.theme')} · {t('settings.color')} · {t('settings.contrast')}
src/pages/Settings.tsx:95:     aria-label={t('settings.reset')}

# CardReview (1/5)
src/pages/CardReview.tsx:296:  aria-label={flipped ? t('review.flip_back') : t('review.flip_hint')}

# ReportsPage (5/9)
src/pages/ReportsPage.tsx:122: ({t('reports.total_words')} / {t('reports.total_sessions')} / {t('reports.avg_accuracy')})
src/pages/ReportsPage.tsx:129: 📤 {t('reports.share')}
src/pages/ReportsPage.tsx:177: {t('reports.this_week')} ({weekly.weekStart} 起) 共学 {weekly.totalWordsLearned} {t('reports.total_words').replace('Total words', '词')}
src/pages/ReportsPage.tsx:241: {t('reports.this_week')}还没有学习数据,先学几个词再来看看?
```

#### 1.1.5 影响

- **P1 (用户可见性误导)**: v1.57.0 commit message + review notes 都宣传"DICT 扩 25 key"暗示 i18n 完成度提升, 但 9/24 = 37.5% 是死键, UI 实际不显示这些文案
- **P1 (技术债)**: 后续开发者看到 DICT 有 `reports.export` 等 key, 会以为对应 UI 已存在, 不会去补全
- **i18nKeyCoverage 测试盲区**: 该测试只查"missing key" (t() 用但 DICT 无), 不查"dead key" (DICT 有但无人用), 所以 v1.57 这种"只加 DICT 不改 UI"的操作无法被测试捕获

#### 1.1.6 修法 (供 owner 决策)

**选项 A (推荐)**: 修 9 处死键位置, 补全 UI
- `Home.tsx:234/236` 拆 daily_summary + total_summary
- `ReportsPage.tsx:183` 改用 `t('reports.weekly_chart')`
- `ReportsPage.tsx` 加导出按钮 (用 `t('reports.export')`)
- 删除 4 个无人用的 review.* key (correct/incorrect/show_answer/next_card) 或保留为 2-button flow 预留

**选项 B (备选)**: 从 DICT 删 9 死键
- 影响: 0 (无人用)
- 优点: DICT 干净, 防止未来误用

**选项 C (集成方案)**: 加 i18nKeyCoverage test, 扫 "DICT 有但 src/ 0 引用" → CI 失败
- 加 ~10 行测试代码, 永久防回归

---

### 1.2 P2: 升级 toast race — 多 mark 合并时漏中间等级提示

**严重度**: **P2 (UI cosmetic, 用户极少触发)**
**文件**: `src/pages/Home.tsx:88-95`

#### 1.2.1 现象

升级检测用 `prevLevelRef` diff level:

```tsx
// src/pages/Home.tsx
const prevLevelRef = useRef<number>(xpState.level)
useEffect(() => {
  if (xpState.level > prevLevelRef.current) {
    toast.success(`🎉 升级到 Lv.${xpState.level} ${xpState.levelTitle}!`)
  }
  prevLevelRef.current = xpState.level
}, [xpState.level, xpState.levelTitle])
```

如果用户在 16ms 内连点 3 个词, markWordCompleted 3 次 addXP:
- Tap 1: totalXP 90→105 → level 1→2
- Tap 2: totalXP 105→120 → level 2→2 (阈值 200)
- Tap 3: totalXP 120→135 → level 2→2
- React 批量: 1 次 commit, xpState.level=2
- useEffect: prevLevelRef.current(1) < xpState.level(2) → 1 个 toast "Lv.2" ✓

但极端 case: 用户从 90 XP (Lv.1) 一口气标 5 个词, 每词 30 XP:
- Tap 1: 90→120, level 1→2
- Tap 2: 120→150, level 2→2
- Tap 3: 150→180, level 2→2
- Tap 4: 180→210, level 2→3
- Tap 5: 210→240, level 3→3
- 批量 commit: xpState.level=3
- useEffect: prevLevelRef.current(1) < xpState.level(3) → 1 个 toast "Lv.3"
- **漏: Lv.2 toast**

#### 1.2.2 影响

- P2 cosmetic: 用户错过了"中途升级"反馈
- 实际场景: 用户很少在 16ms 内连点 5 个词 (即使 auto-mark 也是有序的, 不会批量)
- 不会: 数据错误 / 崩溃 / 数据丢失

#### 1.2.3 修法 (供 owner 决策)

**选项 A (推荐)**: 改用 totalXP diff, 多 toast 支持
```tsx
const prevXPRef = useRef<number>(xpState.totalXP)
useEffect(() => {
  if (xpState.totalXP > prevXPRef.current) {
    // 检查经过的 level thresholds, 弹多个 toast
    for (let lvl = prevLevelRef.current + 1; lvl <= xpState.level; lvl++) {
      toast.success(`🎉 升级到 Lv.${lvl}!`)
    }
  }
  prevXPRef.current = xpState.totalXP
  prevLevelRef.current = xpState.level
}, [xpState.totalXP, xpState.level])
```

**选项 B (不修)**: 维持现状, 接受"批量时只 toast 最终等级"为可接受的简化

---

## 2. 5 维度独立评估

### 维度 1: 5 页面 DICT 扩 25 key 真实使用 — **不通过 (P1)**

- 24 新 key 中 15 key 实际被 5 页面 t() 引用 ✓
- 24 新 key 中 9 key (37.5%) **完全死键**, 0 引用 ✗
- 详见 1.1

### 维度 2: 切语言 UI bug — **通过 (0 bug)**

- 15 实际使用 key 全部有 zh + en 双语非空翻译 ✓
- home.streak_subtitle 用 `.replace('N', ...)` 占位, zh "连续学习 N 天" / en "N-day streak" 都正确
- reports.total_words 在 ReportsPage.tsx:177 用 `.replace('Total words', '词')` 替换 en→zh, zh 时 replace no-op ("总词汇" 不变), 不影响显示
- 切到 en 后, 5 页面新加的 15 个 key 都正确显示英文 ✓
- **pre-existing 隐患 (不算 v1.57 bug)**: Home.tsx:111 "今天来学点新东西吧" 硬编码中文, 切 en 后显示中文

### 维度 3: 9 维度大 review 死 export 误报 — **误报率高 (脚本需修)**

- 9-dim 脚本报 143 候选, 115 "真候选" (过滤组件 + hook 后)
- 自写更严格的脚本 (`/tmp/real_dead_check.py`) 扫到 **57 真死 export** (0 跨文件引用, 0 内部使用)
- 9-dim 脚本的 115 误报来源: regex `import\s*\{...\}\s*from` 不支持 `import X, { a } from` 模式 (如 `import Onboarding, { isOnboarded } from` 不被识别)
- 57 真死 export 中, 多数是**有意保留的公共 API** (FSRS 算法工具, DB 工具, type 定义), 不算 bug
- 真正可疑的: `src/lib/i18n.ts:382 tMany` / `src/lib/i18n.ts:389 initLocale`
  - `initLocale()` 导出但**永远 0 调用** — 应在 `src/main.tsx` 启动时调一次, 否则 `currentLocale` 模块变量在 app 启动时永远是 'zh' (即使 localStorage 是 'en')
  - 但 useTranslate 内部用 `useState(getLocale())` 读 localStorage, 所以 React 组件 OK, 隐藏的 bug 仅在: 任何**非 React 代码**直接调 `t(key)` 不传 locale 时, 会拿到错翻译 (因为 currentLocale 默认 zh)
  - 当前 0 处非 React 代码调 `t()`, 所以这个 bug **当前不触发**, 是 P3 隐患

### 维度 4: 升级 toast race — **P2 候选 (详见 1.2)**

- 详见 1.2
- 总结: 多 mark 合并时漏中间等级 toast, 但用户极少触发

### 维度 5: 跨文件 i18n bug — **通过 (0 bug)**

- `useTranslate` 内部用 `useState(getLocale())` + `window.addEventListener('locale-change', ...)`, 各组件独立订阅
- LearnReport.tsx 同时在主组件 (line 10) 和 Overview 子组件 (line 132) 调 useTranslate, 都正常同步
- 切语言时: 26 useTranslate call site 都收到 event → React 批量 setState → 1 次 re-render → 所有 t() 用新 locale
- 嵌套子组件 (LearnReport.Overview / WordList) 正确同步
- 无 closure 陷阱 (useCallback 的 `t` 依赖 locale, locale 变化时 t 重建)
- 无内存泄漏 (useEffect cleanup 正确 removeEventListener)

---

## 3. 总结

### P0: 0
### P1: 1 (v1.57 任务口径误导, 9/24 DICT key 死键)
### P2: 1 (升级 toast race 漏中间等级)

### 修法优先级

1. **P1 必修 (下个 release)**: 修 9 死键 + 加 dead-key 静态测试
   - 修法见 1.1.6 选项 A 或 B
   - 推荐 A (补全 UI) + C (加测试), 总计 ~30 行代码 + 1 测试

2. **P2 可选 (下次顺手修)**: 升级 toast 改 totalXP diff
   - 修法见 1.2.3
   - 影响极小, 可延后

### 静态审查脚本建议

- `scripts/big-review-v1.57.py` 第 9 维度"死代码扫描" 误报 143→115, 应改 regex 支持 `import X, { ... } from` 模式
- 新增第 10 维度: 扫"DICT 有但 src/ 0 引用"的死 key
- 防止 v1.57 这种"只加 DICT 不改 UI"的操作再次发生

### 评审耗时

20 min (静态读为主, 跑 9-dim 脚本 + 自写 dead-key / dead-export 检查)

---

**评审人**: general agent (verifier13)
**评审时间**: 2026-07-28 00:59 UTC (W52)
**评审范围**: v1.57.0 commit 32f25e1 + 关联文件
**评审结论**: 1 P1 + 1 P2, v1.57.0 "5 页面 DICT 扩 25 key" 任务实际只完成 62.5% (15/24 key 真用)
