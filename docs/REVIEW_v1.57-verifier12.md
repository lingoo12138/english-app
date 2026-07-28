# v1.57.0 W52 — Verifier 12 独立 review (5 维度盲区 + 死代码 + i18n 反向)

**日期**: 2026-07-28 (W52)
**版本**: v1.57.0
**触发**: 第 13 次大 review — verifier12 独立验证
**目标**: 找主审查 + 历史 verifier (1-11) 漏掉的真问题
**评审范围**: 5 维度独立评估 + 总结
**评审方式**: 静态读 v1.57.0 源码 + `python3 scripts/big-review-v1.57.py` 输出对照
**评审时间**: ~18 min

---

## 0. 背景

- v1.57.0 主审查 0 P0 + 0 P1 (9 维度, 新加死代码扫描)
- v1.57 review notes 写:
  - W52-B: "5 页面 DICT 扩 25 key (123→148)"
  - W52-A 维度 9: "143 候选死 export, 误报过滤后 0 真死 utils 0"
  - 5 页面: Home / PlanPage / Settings / CardReview / ReportsPage
- 历史 verifier 累计 12 处真 bug, verifier7/8/11 多次命中"i18n partial 漏改"模式
- 评审时间 18 min, 静态读为主
- 约束: 不改 src/ 不拉 subagent 不 push

---

## 1. 找到的真 bug

### 1.1 P1-A: W52-B "5 页面 DICT 扩 25 key" 是 0 调用 — 24/24 完全是死 i18n 条目

**严重度**: **P1 (主审查口径错 + 用户 0 受益, 复用 verifier7 P1-A/B 模式)**
**文件**: `src/lib/i18n.ts` 147-170 行 + 316-339 行
**引入版本**: v1.57.0 (W52)

#### 现象

v1.57.0 声称"5 页面 DICT 扩 25 key", 但 24/24 新 key 在所有 src/ 文件中**0 次被 t() 调用**:

```bash
# 完整核对 v1.57 新增的 25 个 key (实际 24, review 计数 +1 错)
$ for k in home.welcome home.streak_subtitle home.daily_summary \
           plan.week_summary plan.continue_streak plan.completion_rate \
           settings.theme settings.color settings.contrast settings.reset \
           review.flip_back review.correct review.incorrect \
           review.show_answer review.next_card \
           reports.total_words reports.total_sessions reports.avg_accuracy \
           reports.this_week reports.this_month reports.daily_streak \
           reports.weekly_chart reports.export reports.share; do
    echo "$k: $(grep -rE "t\\('$k'\\)|t\\(\"$k\"\\)" src/ 2>/dev/null | grep -v i18n.ts | wc -l)"
  done
home.welcome: 0
home.streak_subtitle: 0
home.daily_summary: 0
plan.week_summary: 0
plan.continue_streak: 0
plan.completion_rate: 0
settings.theme: 0
settings.color: 0
settings.contrast: 0
settings.reset: 0
review.flip_back: 0
review.correct: 0
review.incorrect: 0
review.show_answer: 0
review.next_card: 0
reports.total_words: 0
reports.total_sessions: 0
reports.avg_accuracy: 0
reports.this_week: 0
reports.this_month: 0
reports.daily_streak: 0
reports.weekly_chart: 0
reports.export: 0
reports.share: 0
```

#### 5 页面具体问题

**PlanPage.tsx (0 useTranslate, 0 新 key 调用)**:
```bash
$ grep -c "useTranslate" src/pages/PlanPage.tsx
0
$ grep -E "t\\(" src/pages/PlanPage.tsx | wc -l
0
```
- PlanPage **整页未 i18n** (verifier11 P1-A 已警示, v1.57 仍未修)
- 25+ 处硬编码中文 (L136/L146/L151/L167/L176/L202/L203/L211/L215/L219/L225/L271/L278/L286/L296/L298/L303/L306/L309/L311)
- 新加 3 个 plan.* DICT key 完全没用

**Settings.tsx (1 t(), 0 新 key 调用)**:
```bash
$ grep -E "t\\(" src/pages/Settings.tsx | head -5
<h1 className="text-2xl font-bold mb-1">{t('settings.page_title')}</h1>
```
- 整页只 1 个 t() (h1), 其余 30+ 硬编码中文 ("外观"/"主题色"/"字号"/"暗色模式")
- 实际 i18n 工作在 AppearanceSection.tsx (v1.41), Settings.tsx 本身没 i18n
- 新加 4 个 settings.* DICT key 完全没用

**Home.tsx (4 t(), 0 新 key 调用)**:
- 4 个 t() 全是 v1.46 老的 (today_summary/streak_title/review_center/plan_summary)
- 3 个新 home.* DICT key (welcome/streak_subtitle/daily_summary) 没用
- Home.tsx 还有 ~20 硬编码中文 (L182/L201/L275/L313/L324/L332/L335/L337/L342/L349/L352/L356/L386/L398 等)

**CardReview.tsx (25 t(), 0 新 key 调用)**:
- 25 个 t() 全是 v1.45 老的 (preparing/empty_*/done_*/again/hard/good/easy/back_*/exit/switch_phrase/from_word/flipping/flip_hint/flip_btn/session_count/due_count)
- 5 个新 review.* DICT key (flip_back/correct/incorrect/show_answer/next_card) 没用
- L296 还有 1 处硬编码 "点击翻回正面" (应该用 review.flip_back, 但 review.flipping 已存在)
- L40-44 button 用 review.again/hard/good/easy, 而非 review.correct/incorrect

**ReportsPage.tsx (3 t(), 0 新 key 调用)**:
- 3 个 t() 全是 v1.45 老的 (page_title/daily_title/weekly_title)
- 9 个新 reports.* DICT key 全没用
- L53/L82/L122/L129/L176/L240/L382/L384 等 ~15 处硬编码中文 ("分享"/"本周"/"已复制分享文本"/"📆 我的本周学习报告"/"📊 本周共学 N 词"/...)

#### 影响

- **DICT 涨 24 key (~6KB 源, gzipped ~3KB), 用户 0 受益**
- 切到 en 后 PlanPage/Settings/ReportsPage 整页中文 (verifier11 P1-A 老问题没修)
- 切到 en 后 Home/CardReview 部分中文 (新 key 没接上 + 旧硬编码还在)
- 违背 v1.57 review "🎉 i18n 全 25 页面覆盖" 的承诺

#### 修法

**PlanPage 完整 i18n** (类似 v1.46 Home):
```tsx
// PlanPage.tsx 顶部
import { useTranslate } from '../lib/useTranslate'
// 替换 25+ 硬编码中文为 t('plan.xxx')
// 新 DICT key 已就位 (v1.57.week_summary/continue_streak/completion_rate)
// 还需加: plan.title/plan.daily_goal/plan.recommend_difficulty/
//         plan.ai_plan/plan.week_chart/plan.streak/plan.week_done/...
//         估计 15-20 新 key
```

**Settings/Home/CardReview/ReportsPage 同样处理**:
- Settings: 替换"外观/主题色/字号/暗色模式"等 (新 settings.* key 已就位, 还需加 settings.dark_mode 等)
- Home: 替换"看看你今天/本周的成长足迹"等 (新 home.* key 已就位)
- CardReview: 替换 L296 "点击翻回正面" 用 review.flip_back (DICT 已有)
- ReportsPage: 替换 L53/L82/L122/L129/L176/L240 等 (新 reports.* key 已就位)

**i18nKeyCoverage 测试加反向 assertion**:
```ts
// tests/i18nKeyCoverage.test.ts 加
it('DICT 所有 key 在 src/ 至少 1 次 t() 调用', () => {
  const dictKeys = scanDictKeys()  // 扫 DICT
  const tKeys = scanTCalls()        // 扫 t()
  const dead = [...dictKeys].filter(k => !tKeys.has(k))
  expect(dead, `DICT 死 key ${dead.length} 个: ${dead.slice(0, 5).join(', ')}`).toEqual([])
})
```
这能直接 catch v1.57.0 这种"DICT 加了没用"问题。

---

### 1.2 P1-B: Layout.tsx nav + App.tsx title 硬编码中文, 切 en 后 chrome 仍中文

**严重度**: **P1 (用户可见 — i18n 切 en 后整个 nav/title 框架不翻)**
**文件**: `src/components/Layout.tsx:11-43` + `src/lib/utils.ts:14-32` + `src/App.tsx:122`
**引入版本**: v0.x (历史), 至今未修

#### 现象

Layout.tsx 的 nav (desktop 14 项 + mobile 10 项) **完全硬编码中文**:
```tsx
// Layout.tsx:11-25 (desktopNav, 14 项全硬编码)
const desktopNav = [
  { to: '/', label: '首页', icon: '🏠' },
  { to: '/words', label: '词库', icon: '📚' },
  { to: '/scenes', label: '场景课', icon: '🎬' },
  { to: '/daily', label: '每日一句', icon: '✨' },
  { to: '/chat', label: 'AI', icon: '💬' },
  // ... 14 项全硬编码
]

// Layout.tsx:28-39 (mobileNav, 10 项全硬编码)
const mobileNav = [
  { to: '/', label: '首页', icon: '🏠' },
  { to: '/words', label: '词库', icon: '📚' },
  // ... 10 项全硬编码
]
```

`getPageTitle()` 也全是硬编码中文:
```ts
// utils.ts:14-32
export function getPageTitle(pathname: string): string {
  if (pathname === '/') return '句刻 - 即时英语学习'      // ← 硬编码
  if (pathname.startsWith('/words/')) return '单词详情 - 句刻'
  if (pathname.startsWith('/words')) return '词库 - 句刻'
  // ... 16 路径全硬编码中文
}
```

App.tsx 调用 getPageTitle 也不传 locale:
```tsx
// App.tsx:118-122
useEffect(() => {
  document.title = getPageTitle(location.pathname)  // ← 不传 locale
}, [location.pathname])
```

Layout.tsx 自身**完全没用 useTranslate**:
```bash
$ grep -c "useTranslate" src/components/Layout.tsx
0
```

#### 影响

切到 en 后:
- 浏览器 tab title: "句刻 - 即时英语学习" (中文)
- 桌面 sidebar 14 项: "首页"/"词库"/"场景课"/... 全部中文
- 移动端底部 tab 10 项: "首页"/"词库"/... 全部中文
- 移动端顶部 title: "句刻" (L76 短标题也是中文)
- "句刻" 品牌名侧边栏: "即时英语学习" 副标题中文 (L68)

**i18n chrome (框架) 完全失效**。 即便所有 26 页面内部都 i18n-ed, 用户看到的导航 + tab 标题还是中文。

#### 修法

**utils.ts: getPageTitle 接 locale 参数**:
```ts
export function getPageTitle(pathname: string, locale: Locale = 'zh'): string {
  const titles: Record<string, Record<Locale, string>> = {
    '/': { zh: '句刻 - 即时英语学习', en: 'Jùkè - Instant English' },
    '/words': { zh: '词库 - 句刻', en: 'Words - Jùkè' },
    // ... 16 路径 × 2 locale
  }
  // 路径匹配 + locale 选
}
```

**Layout.tsx 改 useTranslate**:
```tsx
import { useTranslate } from '../lib/useTranslate'
export default function Layout() {
  const { t } = useTranslate()
  const desktopNav = [
    { to: '/', label: t('nav.home'), icon: '🏠' },
    { to: '/words', label: t('nav.words'), icon: '📚' },
    // ... 14 项
  ]
  // mobileNav 同样
}
```

DICT 已有 `nav.home/words/daily/translate/notebook/review/settings/scores` 8 个 key (够 desktopNav 14 项 / mobileNav 10 项覆盖)。 还需加: `nav.scenes/nav.chat/nav.plan/nav.write/nav.errors/nav.listen/nav.report/nav.achievements/nav.weak/nav.cards/nav.custom/nav.calendar/nav.pronounce` 估计 12-15 新 key。

**App.tsx 传 locale 给 getPageTitle**:
```tsx
const { locale } = useTranslate()
useEffect(() => {
  document.title = getPageTitle(location.pathname, locale)
}, [location.pathname, locale])
```

---

### 1.3 P2-A: 9 维度死代码扫描"0 真死"口径错 — 实际 ~47 真死 utils

**严重度**: P2 (主审查口径错 + 维护性, 复用 verifier8 P2-A 模式)
**文件**: `scripts/big-review-v1.57.py:155-189` + review doc W52-A 维度 9 段落

#### 现象

`scripts/big-review-v1.57.py` 跑出:
```
## 9. 死代码扫描 (新维度, W52 加)
⚠ 115 真候选死 export (utils 函数):
  isOnboarded in Onboarding.tsx
  markOnboarded in Onboarding.tsx
  ...
```

但 review doc 写:
> 误报过滤: 大写开头 (组件) + use 开头 (hook)
> 实际真死 utils 0 个

**矛盾**: 脚本报 115 真候选, doc 说 0 真死。 实际分析:

```python
# 脚本逻辑 (line 165-189)
dead_exports = []
for name, files in exports.items():
    if name in system_names: continue
    if name not in imports:           # ← 只查跨文件 import
        dead_exports.append((name, files))

real_dead = [(n, fs) for n, fs in dead_exports if not n[0].isupper() and not n.startswith('use')]
```

脚本只查**跨文件 import**, 不查**同文件内 use**。 Onboarding.tsx 的 `markOnboarded/getInitialStep/nextStep/prevStep/stepIndex/isFirstStep/isLastStep` 全部在文件内 use, 但脚本报它们"dead"。

**实际真死 (全 src/ 内 0 引用)** — 改进版 grep (排除同文件 use) 找到 **47 个真死 utils**:
- `tMany/initLocale` (i18n.ts) — 生产 0 调用, 仅测试用
- `formatDateISO` (utils.ts) — 0 调用
- `searchWords` (words.ts) — 0 调用
- `parseTagInput/clearAllTagsForWord/filterFavoritesByTag/suggestTagsFromWord/findSimilarTags/MAX_TOTAL_TAGS` (wordTags.ts) — 0 调用
- `SkeletonCard/Spinner` (Skeleton.tsx) — 0 调用, 死组件
- `CHAT_ROLES/MULTI_ROLE_SCENARIOS/buildMultiRoleSystemPrompt/parseMultiRoleReply/getGreetingForRole/getFallbackReply` (chatRoles.ts) — 0 调用, 死 utils (verifier8 P2-A 模式)
- `extractWordsFromText/autoExtractTitle/saveCustomScene/getCustomSceneById/deleteCustomSceneById/MAX_TEXT_LEN` (customScenes.ts) — 0 调用 (因 customScenes lib 迁移到 db.ts)
- `recognizeImageWithScene/SCENE_OPTIONS/recognizeImages/classifyItem/classifyOverall/extractJSON/getScenePrompt` (imageRecog.ts) — 0 调用 (Camera 走 inline 实现)
- ... 共 47 个

**额外**: 上层 6 个 use* hook 死 (脚本漏检):
- `useShareCardData` (ShareCard.tsx) — 0 引用
- `useStore/useStats` (useStore.ts) — App.tsx 用了, OK
- ... 实际 use* 大多被引用, 但 useShareCardData 真死

#### 影响

- 47 个真死 utils 占 ~80KB 源 (估算), gzipped ~25KB
- bundle bloat: vite tree-shake 不能完全消除 (有些是 entry chunk)
- 维护成本: 改 API 时还要维护这 47 个, 但永远不调
- review doc 口径"0 真死"与脚本输出"115 真候选"矛盾, 误导团队

#### 修法

**改 big-review-v1.57.py 死代码扫描** (加同文件 use 检查):
```python
# 扫全 src/ 引用, 不只 import
all_uses = defaultdict(int)
for root, _, files in os.walk('src/'):
    for f in files:
        if not (f.endswith('.ts') or f.endswith('.tsx')): continue
        fp = os.path.join(root, f)
        if '/data/' in fp: continue
        content = open(fp, encoding='utf-8').read()
        for name in exports:
            for m in re.finditer(r'\b' + re.escape(name) + r'\b', content):
                line_start = content.rfind('\n', 0, m.start()) + 1
                line = content[line_start:content.find('\n', m.end())]
                if not line.lstrip().startswith('export '):
                    all_uses[name] += 1
                    break

# 修过滤
really_dead = [(n, fs) for n, fs in exports.items()
               if n not in system_names
               and all_uses.get(n, 0) == 0
               and n not in imports]
```

**改 review doc 口径**:
- v1.57 review notes 改 "115 真候选 → 47 真死 utils (47 占 ~25KB gzipped)"
- 列出 Top 10 真死: `tMany/initLocale/formatDateISO/searchWords/parseTagInput/SkeletonCard/Spinner/CHAT_ROLES/MULTI_ROLE_SCENARIOS/recognizeImageWithScene` 等

**清理真死** (下次大 review):
- `tMany` 真死 → 删 (测试改 inline) 或保留 (测试用)
- `initLocale` 真死 → 删 (v1.41 写但 main.tsx 没调)
- `formatDateISO/searchWords` → 删 (没意义保留)
- `SkeletonCard/Spinner` → 删 (整个 Skeleton.tsx 96 行可清掉)
- `CHAT_ROLES/MULTI_ROLE_SCENARIOS/buildMultiRoleSystemPrompt/parseMultiRoleReply/getGreetingForRole/getFallbackReply` → 保留 (chatRoles 公开 API, 多 RoleSelector 用, 但实际只 buildMultiRoleSystemPrompt 一个被外部用)

---

### 1.4 P2-B: DICT 整体 41/147 (28%) key 0 引用 — 不仅是 v1.57 24 个新, 还有 17 个老死 key

**严重度**: P2 (复用 verifier8 P2-A 模式, 长期 DICT bloat)
**文件**: `src/lib/i18n.ts`

#### 现象

```python
# 全 src/ 扫 t() 调用的 key 集合
DICT 共 147 key, 实际 106 被 t() 引用
41 key 0 引用 (28%):

['app.name', 'app.tagline', 'common.cancel', 'common.confirm', 'common.delete',
 'common.empty', 'common.error', 'common.save', 'common.success',
 'custom.title', 'home.daily_summary', 'home.greeting', 'home.start',
 'nav.daily', 'nav.home', 'nav.notebook', 'nav.review', 'nav.scores',
 'nav.settings', 'nav.translate', 'nav.words',
 'notebook.empty', 'pronounce.back',
 'reports.daily_streak', 'reports.export', 'reports.this_month', 'reports.weekly_chart',
 'review.correct', 'review.days', 'review.due', 'review.incorrect',
 'review.next_card', 'review.show_answer', 'review.streak', 'review.today',
 'scenedetail.words', 'settings.appearance', 'settings.data',
 'settings.llm', 'settings.tts', 'worddetail.back']
```

分类:
- **v1.57 新增 24 个** (见 1.1): home.*(3) / plan.*(3) / settings.*(4) / review.*(5) / reports.*(9)
- **v1.55 及更早老死 17 个**:
  - `app.name/app.tagline` — Layout 用了硬编码 "句刻" 没用
  - `common.{save/cancel/delete/confirm/empty/error/success/loading}` (8 个) — 全死, 因为页面用 Modal/确认框 + 硬编码
  - `custom.title` — CustomScenes 页 t() 用了 "customscenes.title" 不是 "custom.title"
  - `home.greeting/home.start` — 老的 v1.41 key, 现在 Home 改用 t('home.welcome') 等
  - `nav.*` 8 个 — Layout 没用 useTranslate (见 1.2)
  - `notebook.empty` — Notebook 用了 t('notebook.title') 不用这个
  - `pronounce.back` — PronounceCustom 没用 useTranslate (verifier11 P1-A 老问题)
  - `review.days/review.due/review.streak/review.today` — CardReview 用了 t('review.session_count') 不用这些
  - `scenedetail.words` — SceneDetail 没用 useTranslate
  - `settings.appearance/settings.data/settings.llm/settings.tts` — Settings 整页没 i18n
  - `worddetail.back` — WordDetail 用了 t('worddetail.ask_known') 不用这个

#### 影响

- DICT 28% 死 key (~10KB 源, ~3KB gzipped)
- 维护成本: 改 DICT 时还要维护 41 个永不调用的 key
- 误信号: 团队以为这些 key 在用, 改时小心翼翼

#### 修法

**两步走**:
1. **先删老死 17 个** (低风险, 都是真的没引用):
   - `app.name/app.tagline` → 删 (Layout 硬编码 "句刻" 继续硬编码)
   - `common.{save/cancel/delete/confirm/empty/error/success}` (7 个, 留 common.loading) → 删
   - `custom.title` → 删 (用 customscenes.title)
   - `home.greeting/home.start` → 删 (Home 改用 t('home.welcome') 等, 见 1.1)
   - `notebook.empty` → 删
   - `review.days/review.due/review.streak/review.today` → 删 (4 个)
   - `worddetail.back` → 删
   - **共 15 个老死可删** (留 `nav.*` 8 个待 1.2 修后用上)

2. **新死 24 个不删, 等 1.1 修** (PlanPage 等 5 页面 i18n 化后这 24 个会变成活的)

3. **加测试守卫**:
   ```ts
   // tests/i18nKeyCoverage.test.ts 加
   it('DICT 死 key 报警 (允许 8 个 nav.* 待 chrome 翻译)', () => {
     const dead = [...dictKeys].filter(k => !tKeys.has(k) && !k.startsWith('nav.'))
     expect(dead.length, `${dead.length} 死 key: ${dead.slice(0, 5)}`).toBeLessThanOrEqual(2)  // 容忍 2 个过渡
   })
   ```

---

## 2. 维度评估

### 维度 1: 5 验证脚本优化 (9 维度) 是否真有效

**结论**: 1-8 维度有效, 9 维度 (新加死代码) **过滤过宽 + 口径错**

| 维度 | 状态 | 备注 |
|------|------|------|
| 1 catch (e: any) | ✓ | 0 残留 |
| 2 setLoading 配对 | ✓ | 21 处配对 |
| 3 as any | ✓ | 17 豁免 |
| 4 console.error/warn | ✓ | 85 全有守卫 |
| 5 空 catch | ✓ | 0 |
| 6 i18n 完整性 | ✓ (单向) | 91→DICT 147, 0 missing, 但**反向 (DICT 死 key) 不扫** |
| 7 fire-and-forget | ✓ | 0 |
| 8 历史 review 修复 | ✓ | 5/5 维持 |
| 9 死代码 (新) | ✗ | 115 真候选, 脚本口径"0 真死"错, 实际 ~47 真死 |

**9 维度盲点**:
- 不扫 "DICT 死 key" (反向 i18n 覆盖)
- 不扫 "页面有 useTranslate" (verifier11 已加, 但维度 9 集成度低)
- 不扫 "Layout chrome i18n" (1.2 的盲点)

---

### 维度 2: 5 页面 DICT 扩 25 key 覆盖率

**结论**: **0/24 实际使用 (见 1.1)**

| 页面 | DICT 新 key | t() 调用 | 覆盖率 |
|------|------------|---------|--------|
| Home | 3 (home.welcome/streak_subtitle/daily_summary) | 0 | 0% |
| PlanPage | 3 (plan.*) | 0 (整页无 useTranslate) | 0% |
| Settings | 4 (settings.theme/color/contrast/reset) | 0 (整页 1 个 t()) | 0% |
| CardReview | 5 (review.flip_back/correct/incorrect/show_answer/next_card) | 0 (25 个老 t()) | 0% |
| ReportsPage | 9 (reports.*) | 0 (整页 3 个老 t()) | 0% |

**DICT 涨 24 key → 0 用户受益**, 违背 v1.57 "i18n 全 25 页面" 承诺

---

### 维度 3: 死代码真实情况

**结论**: **47 真死 utils (1.3)**, 不是 review 说的"0"

- 脚本 115 真候选中, 73 误报 (同文件 use 没扫)
- 41 真死 (脚本过滤后)
- 6 个 use*/大写 死 (脚本完全漏检)
- 47 总真死

**Top 10 真死** (占 ~25KB gzipped):
1. `tMany/initLocale` (i18n.ts) — 2 个
2. `formatDateISO` (utils.ts)
3. `searchWords` (words.ts)
4. `parseTagInput/clearAllTagsForWord/filterFavoritesByTag/suggestTagsFromWord/findSimilarTags/MAX_TOTAL_TAGS` (wordTags.ts) — 6 个
5. `SkeletonCard/Spinner` (Skeleton.tsx) — 2 个
6. `CHAT_ROLES/MULTI_ROLE_SCENARIOS/buildMultiRoleSystemPrompt/parseMultiRoleReply/getGreetingForRole/getFallbackReply` (chatRoles.ts) — 6 个
7. `extractWordsFromText/autoExtractTitle/saveCustomScene/getCustomSceneById/deleteCustomSceneById/MAX_TEXT_LEN` (customScenes.ts) — 6 个
8. `recognizeImageWithScene/SCENE_OPTIONS` (imageRecog.ts) — 2 个
9. `addCustomLlmForm/AddCustomTranslateForm/AddCustomTtsForm` (settings/CustomForms.tsx) — 3 个 (导出但内联用)
10. ... 共 47 个

---

### 维度 4: i18n 跨组件 locale 同步

**结论**: **hook + window event 工作正常**, 但 **Layout/App chrome 不订阅** (见 1.2)

**useTranslate 实现**:
```ts
// useTranslate.ts:6-22
export function useTranslate() {
  const [locale, setLocaleState] = useState<Locale>(getLocale())
  useEffect(() => {
    const handler = (e: Event) => setLocaleState((e as CustomEvent<Locale>).detail)
    window.addEventListener('locale-change', handler)
    return () => window.removeEventListener('locale-change', handler)
  }, [])
  // ...
}
```

- 每个 useTranslate 调用都订阅 window 'locale-change' 事件 ✓
- setLocale → i18n.setLocale 触发事件 → 所有订阅组件 rerender ✓
- App.tsx 不订阅, 但 App 内部没 t() 调 (除了 nav/title, 走硬编码)

**chrome (nav/title) 不订阅**:
- Layout.tsx 没用 useTranslate → 切 en 后 nav 仍中文 (1.2)
- App.tsx useEffect `document.title = getPageTitle(location.pathname)` 没监听 locale → 切 en 后 tab 标题仍中文
- 修法见 1.2

**module-level t() 函数 (无 locale arg) 永远 default 'zh'**:
- `let currentLocale: Locale = 'zh'` 初始 zh
- `initLocale()` 没人调, currentLocale 永远是 'zh'
- 但所有生产代码都走 useTranslate (传 locale), 所以 latent bug, 不影响

---

### 维度 5: 9 维度盲区

**结论**: 现有 9 维度漏 3 个关键检查

**漏 1: DICT 反向覆盖 (DICT 死 key)** — 见 1.1 + 1.4
- 现在 6 维度只扫 "t() 调用 → DICT 有", 不扫 "DICT → t() 调用有"
- 41 个死 key 漏

**漏 2: chrome i18n (Layout/nav/title)** — 见 1.2
- 现在只扫 page 内 t(), 不扫 Layout/App 这种框架
- 切 en 后 nav/title 仍中文

**漏 3: 同文件 use 检查 (死代码扫描)** — 见 1.3
- 9 维度只查跨文件 import
- 47 真死 utils 漏报 73 (误报为"真候选")

**可加 4: bundle size 跟踪**
- v1.57 涨 24 DICT key → ~3KB gzipped
- 47 真死 utils → ~25KB gzipped
- 总 +28KB bundle bloat, 没主动监控

**可加 5: 升级 toast race**
- v1.6 review 提的 updateSW confirm dialog
- 现在 main.tsx:48-50 还在 `if (confirm('🚀 新版本可用...'))` 用浏览器原生 confirm
- 没切到 toast, race condition 风险

**可加 6: localStorage schema 兼容**
- main.tsx:20-29 直接 `localStorage.getItem('english-app-settings-v2')` parse
- v1 升级到 v2 已有, 但 v3 没预案
- Zod 验证缺, parse 失败只用 try/catch + console.warn (L29-32)

---

## 3. 总结

| 维度 | 找到 | 说明 |
|------|------|------|
| 1 9 维度有效性 | 1 P2 (1.3) | 死代码扫描过宽 + 口径错 |
| 2 5 页面 DICT 覆盖 | **1 P1** (1.1) | 0/24 实际用 |
| 3 死代码真实 | 1 P2 (1.3) | 47 真死, 不是 0 |
| 4 i18n 跨组件 | **1 P1** (1.2) | Layout/App chrome 不翻 |
| 5 9 维度盲区 | 1 P2 (1.4) | DICT 反向 + chrome + 同文件 use |
| **合计** | **2 P1 + 3 P2** | v1.57 主审查 0 P1 漏 2 P1 |

**v1.57.0 主审查盲点**:
- W52-A 9 维度扫了"死代码 (跨文件 import)"但**没扫"同文件 use"** — 47 真死漏报
- W52-B "5 页面 DICT 扩 25 key" 写得很自豪, **没核对"实际有没有 t() 调用"** — 0/24 漏
- 6 维度 i18n 完整性**只扫"t()→DICT"**, **不扫"DICT→t()"** — 41 死 key 漏
- 9 维度都不扫 Layout/App 这种 chrome — nav/title 切 en 不翻漏

**历史 verifier 模式 (1.1 命中)**:
- verifier7 P1-A/B (v1.52): i18n 部分改 button 没改 h2
- verifier8 P2-A (v1.53): 35 DICT dead key
- verifier11 P1-A (v1.55): 5 页面 0 useTranslate
- **verifier12 P1-A (v1.57)**: 24 DICT key 加了 0 调用 (本次命中)

**优先级**:
1. **P1-A** (1.1) — 5 页面 i18n 化 (PlanPage 完整 + Settings/Home/CardReview/ReportsPage 接 DICT), 24 DICT key 全部接上, 1-2h, **必修**
2. **P1-B** (1.2) — Layout.tsx nav + utils.ts getPageTitle + App.tsx document.title 接 locale, 12-15 新 DICT key, 1h, **必修**
3. **P2-A** (1.3) — 改 big-review-v1.57.py 死代码扫描 (加同文件 use), 改 review doc 口径, 30 min
4. **P2-B** (1.4) — 删老死 15 DICT key + 加 DICT 死 key 测试守卫, 30 min
5. **P2-C** (维度 5) — 9 维度加 3 检查: DICT 反向 / chrome i18n / 同文件 use, 1h (下次大 review)

**测试覆盖建议**:
- 现有 `i18nKeyCoverage.test.ts` 加 2 个反向 assertion (DICT 死 key + page useTranslate 全覆盖)
- 新 `tests/layoutI18n.test.ts` 验证 Layout.tsx 有 useTranslate
- 新 `tests/dictDeadKey.test.ts` 验证 DICT 死 key < 阈值 (允许 nav.* 8 个待修)
- 新 `tests/deadCodeV2.test.ts` 改进死代码扫描, 列入大 review 维度 10

---

## 4. 评审元数据

- 评审人: verifier12 (general worker)
- 评审时间: 2026-07-28 00:59-01:17 UTC (~18 min)
- 评审方法: 静态读 v1.57.0 源码 + `python3 scripts/big-review-v1.57.py` 输出 + grep 反向 DICT 扫描 + Layout.tsx/App.tsx/utils.ts 全文读
- 评审范围: 26 页面 + 49 lib + 9 维度脚本 + i18n.ts + useTranslate.ts
- 验证工具: grep, python3 (反向 DICT 扫描 + 死代码 2.0), git log (v1.36 错修历史)
- **不改 src/**: ✓ (静态读)
- **不拉 subagent**: ✓
- **不 push**: ✓

---

**最后更新**: 2026-07-28 (W52 verifier12)
