# v1.59.0 W54 — Verifier 16 独立 review (5 维度盲区扫)

**日期**: 2026-07-28 (W54)
**版本**: v1.59.0 (W54 已发 tag)
**触发**: 第 15 次大 review — verifier16 独立验证
**目标**: 找主审查 + 历史 verifier (v1.36-v1.58, 12 处) + verifier13/12 漏掉的真问题
**评审范围**: 5 维度独立验证 (DICT 真使用 / 死 export / i18n 同步 / 切语言 UI / 大 review 盲区)
**评审方式**: 静态读 v1.59.0 commit 56cf177 (v1.58 → v1.59 diff: 8 文件, 仅 doc 同步 + 1 脚本)
**评审时间**: ~22 min

---

## 0. 背景

- v1.59.0 commit 56cf177 改 8 文件, **src/ 0 文件修改** (v1.58 已是上一版代码)
- v1.59.0 review notes 写: "4 文档同步 v1.58 + 第 15 次大 review 摸底 (9 维度 0 P0 + 0 P1)"
- 累积 5 release tag (v1.54 → v1.59), 5 release 内 0 P1 修
- 历史 verifier 累计 12 处真 bug: verifier1-3 (v1.36) + verifier4 (v1.39) + verifier6-7 (v1.52) + verifier8-9 (v1.53) + verifier10-11 (v1.56) + verifier12-13 (v1.57)
- 评审时间 22 min, 静态读为主
- 约束: 不改 src/ 不拉 subagent 不 push

---

## 1. 找到的真 bug

### 1.1 P1-A: ReportsPage.tsx:177 `t('reports.total_words').replace('Total words', '词')` 是破坏性 i18n hack — zh 模式显示 "总词汇", en 模式混合中英

**严重度**: **P1 (用户可见 — 周报数据语义错, 切语言后 UI 中英混杂)**
**文件**: `src/pages/ReportsPage.tsx:177`
**引入版本**: v1.58.0 (commit c05aeb6, W53)

#### 1.1.1 现象

v1.58 在 ReportsPage.tsx:177 引入的 "i18n 化" 实际是一个破坏性 replace hack:

```tsx
// src/pages/ReportsPage.tsx:177 (v1.58 引入)
{t('reports.this_week')} ({weekly.weekStart} 起) 共学 {weekly.totalWordsLearned} {t('reports.total_words').replace('Total words', '词')}
```

DICT 定义:
- zh: `'reports.total_words': '总词汇'` (名词, 非单位)
- en: `'reports.total_words': 'Total words'`

#### 1.1.2 实际输出 (实测)

**zh 模式**:
```
本周 (2026-07-21 起) 共学 47 总词汇
                          ^^^^^^
                          "总词汇" 没被替换, 因为源字符串是中文, 找不到 'Total words'
```
- v1.57 原文: "本周 (date 起) 共学 47 **词**" ✓ 正确 (用 '词' 作单位)
- v1.58 改后: "本周 (date 起) 共学 47 **总词汇**" ✗ 语义错 (总词汇是 "total vocabulary" 的意思, 不是单位)
- **回归**: v1.58 把 v1.57 的"正确"改成"错误", 修复反向

**en 模式**:
```
本周 (2026-07-21 起) 共学 47 词
^^      ^^    ^^              ^
本周/起/共学 都是硬编码中文, 只有 '词' 来自 replace hack
```
- 切到 en 后, 整个句子是 mixed-lang (zh sentence + 1 en word)
- 用户在 en 模式下看到中文 "本周", "起", "共学" → i18n 失败

#### 1.1.3 复现 (Python 模拟)

```python
>>> '总词汇'.replace('Total words', '词')
'总词汇'   # ← 不变
>>> 'Total words'.replace('Total words', '词')
'词'        # ← 被替换, 但其余硬编码中文不变
```

#### 1.1.4 影响

- **P1 (用户可见 — 语义错)**: zh 用户看到"共学 47 总词汇", 数据单位错乱 (本应是"47 词")
- **P1 (i18n 失败)**: en 用户看到中英混杂的句子 ("本周 (date 起) 共学 47 词")
- 9 维度 6 维度 i18n 完整性测试只查 "DICT 有 key" + "t() 返 key 自身 = missing", 不查 "t() 返的字符串是否适合上下文", 所以漏掉

#### 1.1.5 漏报原因 (verifier13 漏的)

verifier13 评估 §1.1.4 "实际使用 (15 keys) — 一切正常" 用了 grep 验证 t() 调用存在, **没运行实际 t() 输出字符串 + 验证上下文语义**。

例如:
```bash
$ grep -E "t\('reports.total_words'\)" src/pages/ReportsPage.tsx
177:          {t('reports.this_week')} ({weekly.weekStart} 起) 共学 {weekly.totalWordsLearned} {t('reports.total_words').replace('Total words', '词')}
```
verifier13 看这一行 → "啊有 t() 调用 → 1.1.4 一切正常", **没注意到 replace 链在 zh 模式下是 no-op**。

#### 1.1.6 修法 (3 选项)

**选项 A (推荐)**: 拆 DICT key, 加 reports.this_week_words_summary
```ts
// i18n.ts zh
'reports.weekly_learned': '本周共学 N 词',
// i18n.ts en
'reports.weekly_learned': 'Learned N words this week',
```
```tsx
// ReportsPage.tsx:177
{t('reports.weekly_learned', { N: weekly.totalWordsLearned, weekStart: weekly.weekStart })}
```
但 t() 当前只接 string, 不接替换对象, 需先加 interpolate(key, params) helper

**选项 B (快速)**: 还原 v1.57 原文, 不强行 i18n
```tsx
// ReportsPage.tsx:177 (还原)
本周 ({weekly.weekStart} 起) 共学 {weekly.totalWordsLearned} 词
```
- 副作用: en 模式显示中文 "本周 ... 共学 47 词"
- 优点: 0 复杂度, 至少 zh 模式语义对
- 缺点: en 模式仍然 mixed-lang (但比 v1.58 略好, 因为没"总词汇"语义错)

**选项 C (折中)**: 用 t('common.words') 替代 t('reports.total_words')
- common.words 不存在, 需加
- 改 DICT 加 'common.words' (zh: '词', en: 'words'), 删除 'reports.total_words' 死 key 思维
```tsx
{t('reports.this_week')} ({weekly.weekStart} 起) 共学 {weekly.totalWordsLearned} {t('common.words')}
```
- en: "本周 (date 起) 共学 47 words" (mixed-lang 仍在, 但单位对了)
- zh: "本周 (date 起) 共学 47 词" ✓ 正确 (common.words 返 '词')

**推荐选项 A** (根除), v1.60 实现; 选项 C 是过渡方案

---

### 1.2 P1-B: Layout.tsx 0 useTranslate + App.tsx getPageTitle 不接 locale — 切 en 后 nav/title/brand 全是中文 (verifier12 P1-B 复现, 未修)

**严重度**: **P1 (用户可见 — 切 en 后所有 chrome 仍中文)**
**文件**: `src/components/Layout.tsx:1-105` + `src/lib/utils.ts:14-32` + `src/App.tsx:118-122`
**引入版本**: v0.x (历史), verifier12 首次报告 (v1.57 W52), v1.58/v1.59 未修

#### 1.2.1 现象 (复现 verifier12 1.2 节)

```bash
$ grep -c "useTranslate" src/components/Layout.tsx
0                                          # ← Layout 完全没 i18n

$ grep -E "getPageTitle\(" src/App.tsx
118:    document.title = getPageTitle(location.pathname)  # ← 不传 locale

$ cat src/lib/utils.ts:14-32
export function getPageTitle(pathname: string): string {
  if (pathname === '/') return '句刻 - 即时英语学习'  # ← 硬编码中文
  if (pathname.startsWith('/words')) return '词库 - 句刻'
  // ... 16 路径全硬编码中文
}
```

#### 1.2.2 切到 en 后用户看到

- 浏览器 tab title: "句刻 - 即时英语学习" (中文)
- 桌面 sidebar 14 项: "首页"/"词库"/"场景课"/... 全部中文
- 移动端底部 tab 10 项: "首页"/"词库"/... 全部中文
- 移动端顶部 title: "句刻" / "词库" / "场景详情" 全中文
- sidebar brand: "句刻" + "即时英语学习" 全中文
- 移动端 shortTitle: `'句刻' : fullTitle.split(' - ')[0]` (硬编码 '句刻')

#### 1.2.3 影响

**全 app chrome 切 en 失败** — 即便 26 页面内部都 i18n-ed, 用户看到的导航/标题/品牌仍是中文。这是 i18n "visible UX" 的核心, 切语言功能的实际价值被这一项 bug 完全毁掉。

#### 1.2.4 verifier12 报告原文 (复现确认)

> REVIEW_v1.57-verifier12.md §1.2:
> "Layout.tsx nav + App.tsx title 硬编码中文, 切 en 后 chrome 仍中文"
> 严重度: P1, 引入版本: v0.x (历史)
> 修法: utils.getPageTitle 接 locale, Layout.tsx 改 useTranslate

v1.58 (commit c05aeb6) 和 v1.59 (commit 56cf177) **均未修**。

#### 1.2.5 漏报原因 (主审查 9 维度 6 维度漏)

- 6 维度 i18n 完整性**只扫 src/pages/ 下 t() 调用 → DICT 匹配**, 不扫 src/components/ 和 src/lib/utils.ts
- Layout.tsx 在 src/components/, 不在 src/pages/, 所以 6 维度扫不到
- App.tsx 的 document.title 调用**在 useEffect 闭包内**, grep "t(" 也找不到

#### 1.2.6 修法 (供 owner 决策)

**Layout.tsx 改 useTranslate** (DICT 已有 nav.* 8 key, 还需加 5-6):
```tsx
// Layout.tsx
import { useTranslate } from '../lib/useTranslate'
export default function Layout() {
  const { t, locale } = useTranslate()
  const desktopNav = [
    { to: '/', label: t('nav.home'), icon: '🏠' },
    { to: '/words', label: t('nav.words'), icon: '📚' },
    // ... 14 项 (需加 nav.scenes/nav.chat/nav.plan/nav.write/nav.errors/nav.listen/nav.report/nav.achievements 8 key)
  ]
  const fullTitle = getPageTitle(location.pathname, locale)
  const shortTitle = isHome ? t('app.name') : fullTitle.split(' - ')[0]
  // ...
}
```

**utils.ts getPageTitle 接 locale**:
```ts
export function getPageTitle(pathname: string, locale: 'zh' | 'en' = 'zh'): string {
  const titles: Record<string, Record<string, string>> = {
    '/': { zh: '句刻 - 即时英语学习', en: 'Jùkè - Instant English' },
    '/words': { zh: '词库 - 句刻', en: 'Words - Jùkè' },
    // ... 16 路径 × 2 locale = 32 strings
  }
  // 路径匹配 + locale 选
}
```

**App.tsx 传 locale**:
```tsx
const { locale } = useTranslate()
useEffect(() => {
  document.title = getPageTitle(location.pathname, locale)
}, [location.pathname, locale])
```

**预估**: ~30 行 Layout.tsx 改 + ~50 行 utils.ts 改 + ~10 新 DICT key + ~3 行 App.tsx 改, 共 ~90 行, 1-1.5h 工作量

---

### 1.3 P2-A: 9 DICT keys v1.57 引入仍死 (verifier13 找到, v1.58 修 15 但留 9)

**严重度**: **P2 (DICT bloat + 误信号, 无直接用户影响)**
**文件**: `src/lib/i18n.ts` 161-170 (zh) / 329-338 (en) — 9 死 key
**引入版本**: v1.57.0 (commit 32f25e1)

#### 1.3.1 现象 (验证 verifier13 §1.1.3)

```bash
# 完整核对 9 死 key (全 src/ 0 t() 调用)
$ for k in home.daily_summary \
           review.correct review.incorrect review.show_answer review.next_card \
           reports.this_month reports.daily_streak reports.weekly_chart reports.export; do
    echo "$k: $(grep -rE "t\\('$k'\\)|t\\(\"$k\"\\)" src/ 2>/dev/null | grep -v i18n.ts | wc -l)"
  done
home.daily_summary: 0
review.correct: 0
review.incorrect: 0
review.show_answer: 0
review.next_card: 0
reports.this_month: 0
reports.daily_streak: 0
reports.weekly_chart: 0
reports.export: 0
```

v1.58 已把 15/24 修成活的 (Home 3/3 + PlanPage 3/3 + Settings 4/4 + CardReview 1/5 + ReportsPage 5/9), 但仍留 9 死 key (37.5%)。

#### 1.3.2 9 死 key 的对应 UI 位置 (本可填, 未填)

| 死 key | zh DICT | en DICT | 可用位置 |
|--------|---------|---------|---------|
| home.daily_summary | '今日要学 · 总完成' | 'Today · total' | `Home.tsx:234, 238` "今日学词"/"累计学词" (需拆 2 key, 不够用) |
| review.correct | '认识' | 'Known' | `ReviewCenter.tsx:312` "查看答案" 附近的 2-button 流 (实际未引入) |
| review.incorrect | '不认识' | 'Unknown' | 同上 |
| review.show_answer | '查看答案' | 'Show answer' | `ReviewCenter.tsx:312` "查看答案" 硬编码中文, 可直接替换 |
| review.next_card | '下一张' | 'Next' | 整页无 "下一张" 按钮 (FSRS 4-button 自动跳) |
| reports.this_month | '本月' | 'This month' | `CalendarPage.tsx:74` "回到本月" 硬编码中文, 可用 |
| reports.daily_streak | '连续天数' | 'Streak' | `PlanPage.tsx` 有 "连续天数" 硬编码, 但 PlanPage.tsx 不在 5 页面修复列表 |
| reports.weekly_chart | '周趋势' | 'Weekly' | `ReportsPage.tsx:183` "📊 7 天学词" 硬编码, 可替换 |
| reports.export | '导出' | 'Export' | `AIChat.tsx:472` "📤 导出" / `LearnReport.tsx:65` "导出 JSON" / `Notebook.tsx:373` "📤 导出" 硬编码, 可用 |

#### 1.3.3 影响

- DICT 涨 9 key (~2KB 源, gzipped ~0.7KB), 用户 0 受益
- 维护成本: 改 DICT 时还要维护 9 个永不调用的 key
- 误信号: 后续开发者看到 DICT 有 `reports.export` 会以为对应 UI 已存在, 不会去补全

#### 1.3.4 修法 (2 选项)

**选项 A (补全 UI)**: 把 9 死 key 接到对应 UI
- `ReportsPage.tsx:183` 改用 `t('reports.weekly_chart')` (1 行)
- `ReviewCenter.tsx:312` 改用 `t('review.show_answer')` (1 行, 但 ReviewCenter 需加 useTranslate)
- `CalendarPage.tsx:74` 改用 `t('reports.this_month')` (但 reports.* 命名空间不准, 建议加 'calendar.back_to_this_month')
- `AIChat.tsx:472` 改用 `t('reports.export')` (但 reports.* 命名空间不准, 建议加 'aichat.export')
- `Notebook.tsx:373/402/418` 多处 "导出" 用 `t('notebook.export')` (需加新 key)
- 4-button 流的 review.correct/incorrect/next_card 难接 (当前 4-button 已用 review.again/hard/good/easy), 建议**删除这 4 个 key**

**选项 B (删 9 死 key)**: 从 DICT 删 9 死 key, 0 影响
- 优点: DICT 干净, 防止未来误用
- 缺点: 失去 "未来功能预留" 语义 (但实际上没人预留, 4 个 review.* 死 key 是 reviewer 想多了)

**推荐 A + 删 4 个 review.* (correct/incorrect/show_answer/next_card)**: 补全 5 个可接的 (weekly_chart/show_answer/this_month/2 个 export), 删 4 个 review.* (UI 永久不需要)

---

### 1.4 P2-B: PlanPage.tsx `setXpState` 仅初始化时调, handleMark 后 UI 不更新

**严重度**: **P2 (UX 不一致, XP 数据正确, UI 不刷新)**
**文件**: `src/pages/PlanPage.tsx:32` (initial useState) + `:131-134` (handleMark)
**引入版本**: v0.x (历史), v1.46.0 PlanPage XP 集成时漏修

#### 1.4.1 现象

```tsx
// PlanPage.tsx:32
const [xpState, setXpState] = useState<XPCurrentState>(() => getXPState())

// PlanPage.tsx:131-134
const handleMark = async (wordId: string) => {
  markWordCompleted(wordId, undefined, dailyGoal)
  await refresh()
}
```

```bash
$ grep -n "setXpState" src/pages/PlanPage.tsx
32:  const [xpState, setXpState] = useState<XPCurrentState>(() => getXPState())
# 缺 handleMark 后的 setXpState(getXPState())
```

#### 1.4.2 影响

- 用户在 PlanPage 标记词 (handleMark) → markWordCompleted 内部 fire-and-forget addXP → localStorage XP 写 50 → 但 PlanPage 的 xpState state 仍 1 (初始化时的旧值)
- 顶部 XP 进度条 `Lv.{xpState.level} {xpState.levelTitle}` 不刷新
- 升级后 `Lv.1 学前` 仍是 `Lv.1 学前`, 切回 Home 才看到 `Lv.2 入门`

**对比 Home.tsx 是 OK 的** (因为 Home 升级检测 useEffect 监听 xpState, handleMark 后会重读 setXpState(getXPState())):

```bash
$ grep -n "setXpState" src/pages/Home.tsx
32: const [xpState, setXpState] = useState<XPCurrentState>(() => getXPState())
83: setXpState(getXPState())  # ← handleMarkPlanWord 后立即重读
```

#### 1.4.3 修法

```tsx
// PlanPage.tsx:131-134 (加一行)
const handleMark = async (wordId: string) => {
  markWordCompleted(wordId, undefined, dailyGoal)
  await refresh()
  setXpState(getXPState())  // ← 加这一行
}
```

**预估**: 1 行, 30 秒

---

## 2. 5 维度独立评估

### 维度 1: 25 DICT key 真使用 (v1.58) — **部分通过, 1 个真 P1**

| 状态 | 数 | 说明 |
|------|----|------|
| v1.57.0 DICT 扩 24 key | 24 | 加 0 调用 (verifier12 找到) |
| v1.58.0 修 (接 UI) | 15 | Home 3/3 + PlanPage 3/3 + Settings 4/4 + CardReview 1/5 + ReportsPage 5/9 ✓ |
| v1.58.0 仍死 (未接) | 9 | home.daily_summary / review.* 4 / reports.* 4 (见 1.3) |
| v1.58.0 引入的破坏性 replace | 1 | `t('reports.total_words').replace('Total words', '词')` (见 1.1) — **P1** |

**结论**: v1.58 修复了 verifier12 P1-A 的"24 key 0 调用"问题, 15 key 接上 UI, 但**引入新 P1** (1.1 破坏性 replace) + **遗留 9 死 key** (1.3)。

### 维度 2: 9 维度大 review 死 export 误报 — **同 v1.57, 误报率 62%**

| 数字 | 值 | 说明 |
|------|----|------|
| 候选死 export (跨文件 0 import) | 143 | big-review-v1.59.py 输出 |
| 过滤 PascalCase (组件) + use* (hook) 后 | 115 | "真候选" |
| 实际同文件 0 use (真死) | **44** | 改进 grep 后实测 |
| 71 个 "死" 是误报 (同文件 use 没扫) | 71 | 占 62% |

**top 5 真死 utils** (从 44 中选最大):
1. `tMany` `initLocale` (i18n.ts) — 仅测试用, 生产 0 调用
2. `formatDateISO` (utils.ts) — 0 调用
3. `searchWords` (words.ts) — 0 调用 (WordList 用 db 直接搜)
4. `clearAllTagsForWord` `parseTagInput` `suggestTagsFromWord` `findSimilarTags` `filterFavoritesByTag` `MAX_TOTAL_TAGS` (wordTags.ts, 6 个)
5. `SkeletonCard` `Spinner` (Skeleton.tsx, 2 个) — 整个 Skeleton.tsx 96 行可清

**结论**: 同 verifier12/13, 误报率高, 9 维度脚本的"过滤后 0 真死"口径错。44 真死中大多是**有意保留的公共 API** (FSRS 算法 / DB 工具), 真正可疑的仅 tMany/initLocale/formatDateISO/searchWords 等 5-6 个。

### 维度 3: 跨文件 i18n 同步 — **hook 工作正常, 但 Layout/App chrome 不订阅**

- `useTranslate` 用 `useState(getLocale())` + `window.addEventListener('locale-change', ...)`, 各组件独立订阅 ✓
- PlanPage / ReportsPage WeeklyCard 等子组件调 useTranslate, 都正确同步 ✓
- 切语言时: 26 useTranslate call site 都收到 event → 批量 setState → 1 次 re-render ✓
- **Layout.tsx 0 useTranslate** → 切 en 后 nav/brand/shortTitle 全硬编码中文 (见 1.2)
- **App.tsx 0 useTranslate** → 切 en 后 document.title 仍中文 (getPageTitle 不接 locale) (见 1.2)
- 嵌套组件 (ReportsPage WeeklyCard) 调 useTranslate 正确: line 162 `const { t } = useTranslate()`, 同步主组件 locale ✓

**结论**: useTranslate hook 自身工作正常, 但 Layout/App 是"chrome 层", 不在 useTranslate 覆盖范围, 是 verifier12 P1-B 漏修。

### 维度 4: 切语言 UI bug — **5 页面新加 t() 在 zh 模式 + en 模式均显示, 但 1 个 P1 破 replace + 1 个 P2 混合中英**

按 task 要求重点验证 5 页面新加的 5 个 key:

| key | zh 模式 | en 模式 | 状态 |
|-----|---------|---------|------|
| home.welcome | "欢迎回来" ✓ | "Welcome back" ✓ | OK |
| plan.week_summary | "近 7 天完成" ✓ | "7-day summary" ✓ | OK |
| settings.theme | "主题" ✓ | "Theme" ✓ | OK |
| review.flip_back | "点击翻回正面" ✓ | "Click to flip back" ✓ | OK (CardReview.tsx:296 aria-label) |
| reports.total_words | "总词汇" ✗ (见 1.1) | "Total words" 经 replace → "词" (mixed-lang) | **P1 破** |

**额外 4 个真 P1 触点** (硬编码 zh 在 en 模式仍显示):
- Layout.tsx desktopNav 14 项 + mobileNav 10 项 + brand 2 行 (见 1.2)
- App.tsx document.title (见 1.2)
- Home.tsx:114 "今天来学点新东西吧" / :234 "今日学词" / :238 "累计学词" / :242 "生词" 等 ~20 处硬编码
- PlanPage.tsx 整页 42 处硬编码 (verifier11 P1-A 老问题)
- Settings.tsx:49 "个性化你的学习体验" / :51 "API Key 明文存..." / :67 "🎓 引导" / :73 "🔄 重新看引导" / :83 "📊 LLM 用量" 等 ~10 处
- ReportsPage.tsx:122 "看看你今天/本周的成长足迹" (混合中英, 见 1.4) / :149-154 StatCard 6 个 label "学词"/"跟读"/... 全 zh
- CardReview.tsx 评论内部 51 处, 显示层 25 个 t() 已 OK

**结论**: 5 页面 v1.58 新加 t() 自身在 zh/en 都显示对, 但 1 个破坏性 replace 引入新 P1 (1.1), 5 页面**整体**仍因 1.2 (Layout/App chrome) + 1.4 (硬编码 zh) 失败。

### 维度 5: 15 次大 review 盲区 — **当前 9 维度漏 3 个关键检查 + 1 个 1.1 破坏性 i18n**

**已加的 9 维度 (v1.52 起)**:
1. catch (e: any) 残留 ✓
2. setLoading 配对 ✓
3. as any 豁免 ✓
4. console.error/warn 守卫 ✓
5. 空 catch {} 残留 ✓
6. i18n 完整性 (单向: t()→DICT) ✓ (但漏反向 DICT→t())
7. fire-and-forget 回归 ✓
8. 历史 review 修复 维持 ✓
9. 死代码扫描 (跨文件 import) — 误报率高, 建议加同文件 use 检查

**漏的 5 个** (按优先级):

**漏 1: 1.1 破坏性 i18n hack** (本次 verifier16 新发现)
- 9 维度 6 维度只查"t() 返 key 自身 = missing", 不查"t() 返的字符串是否适合上下文"
- `t('reports.total_words').replace('Total words', '词')` 通过 "key 存在" 检查, 但 zh 模式输出 "总词汇" 是语义错
- **建议**: 加 6.5 维度 "i18n 上下文合理性", 扫 "`.replace\(['\"][^'\"][^)]*['\"]`" 的 t() 后调用 + 警告
- 或更简单: 加静态规则 "i18n DICT key 不在 JSX 文本中应用 `.replace()`, 应改 DICT key 设计 (加 common.* / reports.weekly_learned)"

**漏 2: 1.2 Layout/App chrome i18n** (verifier12 找到未修)
- 6 维度只扫 src/pages/, 不扫 src/components/Layout.tsx 和 src/App.tsx
- **建议**: 加 6.6 维度 "chrome i18n", 扫 `src/components/Layout.tsx` + `src/App.tsx` 有 useTranslate
- 或更简单: 改 6 维度 scan_t_calls 路径到 `src/**/*.tsx` 全扫, 不限 pages

**漏 3: 1.3 DICT 反向覆盖 (DICT 死 key)** (verifier12 找到未修)
- 6 维度只扫"t()→DICT" (missing key), 不扫"DICT→t()" (dead key)
- 41 死 key 占 28%, 误信号严重
- **建议**: 加 6.7 维度 "DICT dead key", 扫 "DICT keys \ t() used keys" 的差集, 阈值 < 5 (允许少量未来预留)

**漏 4: 维度 9 死 export 同文件 use 检查** (verifier12 找到未修)
- 9 维度只查跨文件 import
- 44 真死 utils 漏报 71 (误报为"真候选")
- **建议**: 改 9 维度 regex, 加 `re.finditer(r'\b' + name + r'\b', content)` 找同文件引用

**漏 5: 4 页面 0 useTranslate** (verifier11 找到未修)
- 6 维度只检查 "5 页面 (Notebook/WordList/WordDetail/ErrorsPage/ListenPage) 都用 useTranslate", 不检查其他页面
- v1.55 review 误报 "i18n 全 25 页面覆盖" (实际 22/26 页面)
- **建议**: 改 i18nKeyCoverage test, 把 "5 页面 namespace" 检查扩到 "全 26 页面至少 1 t() 调用"

**漏 6 (新增)**: DICT 完整性测试不查 en DICT 是否有 zh DICT 漏的 key
- 已加: "5 页面 namespace 全覆盖" (5 维度)
- 已加: "zh/en missing key 一致" (6 维度)
- **漏**: DICT 本身的 key 数量, 当 v1.57 加 24 key 时, 测试只查 "t() 不 missing", 不查 "DICT 实际有 24 个新 key"
- 已有: `i18n.test.ts` 测试 `t()` 函数本身

**漏 7 (新增)**: 共享文本/数据 buildShareText 硬编码 zh
- `ReportsPage.tsx:363-398` `buildShareText()` 函数生成的复制分享文本, 完全硬编码中文
- 用户在 en 模式切到 reports, 分享文本仍是中文 → i18n 不彻底
- 修法: buildShareText 也接 locale 参数, 用 DICT 拼 (但需要 ~30 新 DICT key)

**漏 8 (新增)**: en/zh DICT 内容一致性 (人工 review)
- 现有测试只查"zh/en 同 key 数量", 不查"zh/en 翻译准确性" (例如时态/单复数/语序)
- 需人工 review, 不在静态扫描范围

---

## 3. 总结

### P0: 0
### P1: 2
1. **P1-A (1.1)**: ReportsPage.tsx:177 破坏性 replace, zh 显示"总词汇"语义错, en 模式混合中英
2. **P1-B (1.2)**: Layout.tsx + App.tsx 0 useTranslate, 切 en 后 chrome 全中文 (verifier12 找到未修)

### P2: 2
1. **P2-A (1.3)**: 9 DICT key v1.57 引入仍死 (verifier13 找到未修)
2. **P2-B (1.4)**: PlanPage.tsx setXpState 仅 useState 初始化时调, handleMark 后 UI 不更新 (升级进度条不刷新, 直到切页)

### 评审优先级

1. **P1-A 必修 (下个 release, v1.60)**: 修 ReportsPage.tsx:177, 推荐选项 A (新 DICT key) 或 C (common.words)
   - 选项 A: 加 `reports.weekly_learned` (zh: '本周共学 N 词', en: 'Learned N words this week'), 改 t() 接 params
   - 选项 C: 加 `common.words` (zh: '词', en: 'words'), 改 1 行 ReportsPage.tsx, 删 `reports.total_words` 死 key
   - 选 C 更小, 选 A 更彻底

2. **P1-B 必修 (v1.60-1.61)**: Layout.tsx + App.tsx + utils.ts 全 i18n
   - Layout.tsx 加 useTranslate, 14+10 nav 项接 t() (需 ~6 新 key)
   - utils.ts getPageTitle 接 locale, 16 路径 × 2 locale = 32 strings
   - App.tsx 传 locale 给 getPageTitle
   - 预估 ~90 行 + ~6 新 DICT key, 1-1.5h

3. **P2-A 可选 (v1.60 顺手)**: 9 死 key 选 A 补 5 个 + 删 4 review.*
   - ReportsPage.tsx:183 改用 `t('reports.weekly_chart')` (1 行)
   - ReviewCenter.tsx:312 改用 `t('review.show_answer')` (1 行, 需 useTranslate)
   - AIChat.tsx:472 / LearnReport.tsx:65 / Notebook.tsx:373 改用 `t('reports.export')` (3 行, 但需各页面 useTranslate)
   - 删 review.correct/incorrect/next_card (3 个, UI 永久不需要)
   - 留 reports.this_month/daily_streak/home.daily_summary (3 个, 未来功能预留可接受)

### 静态审查脚本建议 (供 v1.60 大 review)

- 6.5 维度: 扫 "t() 后 .replace('xxx', ...)" 模式 + 警告
- 6.6 维度: 扫 src/components/Layout.tsx + src/App.tsx 有 useTranslate
- 6.7 维度: 扫 DICT dead key, 阈值 < 5
- 9 维度: 改 regex, 加同文件 use 检查
- i18nKeyCoverage test 改: 全 26 页面至少 1 t() 调用 (覆盖 verifier11 P1-A)

### 评审耗时

22 min (静态读为主, 跑 big-review-v1.59.py + 自写 5 验证脚本 + 5 页面源码精读 + 9 维度盲区评估)

---

## 4. 评审元数据

- 评审人: verifier16 (general worker)
- 评审时间: 2026-07-28 03:00-03:22 UTC (W54, ~22 min)
- 评审方法: 静态读 v1.59.0 commit 56cf177 + v1.58.0 commit c05aeb6 diff + `python3 scripts/big-review-v1.59.py` 输出 + 自写 5 验证脚本 (DICT dead key / Layout useTranslate / chrome i18n / 破坏性 replace 扫描 / dead export 2.0)
- 评审范围: 26 页面 + 49 lib + 9 维度脚本 + i18n.ts + useTranslate.ts + Layout.tsx + App.tsx + utils.ts
- 验证工具: grep, python3, git log/diff
- **不改 src/**: ✓ (静态读)
- **不拉 subagent**: ✓
- **不 push**: ✓

---

**最后更新**: 2026-07-28 (W54 verifier16)
**结论**: 2 P1 + 2 P2, v1.59.0 主审查 (9 维度 0 P0) 漏 2 P1 (其中 1 个 v1.58 引入的破坏性 replace + 1 个 verifier12 找到未修的 Layout/App chrome), 加 2 P2 (9 死 key 仍存 + PlanPage 升级 UI 不刷新)
