# v1.56.0 W51 — Verifier 11 独立 review (UI 集成 + 跨文件)

**日期**: 2026-07-28 (W51)
**版本**: v1.56.0 (W51 准备发版)
**触发**: 第 12 次大 review — verifier11 独立验证
**目标**: 找主审查 + 历史 verifier (v1.52/53/55) 漏掉的 UI 集成 + 跨文件 bug
**评审范围**: 5 维度独立验证
**评审方式**: 静态读 v1.55.0 commit 源码 (v1.56 4 文档同步 + i18nKeyCoverage 修 W50 验 0 P0)
**评审时间**: ~25 min

---

## 0. 背景

- v1.55.0 已 push, 主审查 0 P0 + 0 P1 (`python3 scripts/big-review-v1.55.py` 8 维度)
- v1.55.0 review notes 写: "🎉 i18n 覆盖全 25 页面" + "DICT 123 key 完整覆盖" + "i18nKeyCoverage 静态扫 0 missing"
- 本 verifier 专注 4 维度 UI 集成 + 跨文件 bug
- 评审时间 25 min, 静态读为主
- 约束: 不改 src/ 不拉 subagent 不 push

---

## 1. 找到的真 bug

### 1.1 P1-A: v1.55 review 口径 "25/25 页面 i18n 完成" 是错的 — 5 页面 0 useTranslate

**严重度**: **P1 (用户可见 — 切 en 后整页硬编码中文)**
**文件**: 5 个完整未 i18n 的页面
- `src/pages/Camera.tsx` (0 useTranslate, 30+ 硬编码中文)
- `src/pages/PlanPage.tsx` (0 useTranslate, 25+ 硬编码中文)
- `src/pages/PronounceCustom.tsx` (0 useTranslate, 6+ 硬编码中文)
- `src/pages/SceneDetail.tsx` (0 useTranslate, 15+ 硬编码中文)
- `src/pages/WeakWords.tsx` (0 useTranslate, 20+ 硬编码中文)

#### 现象

v1.55.0 review notes 写 "25/25 页面都加了 useTranslate" 但实际只有 21/26 页面有 useTranslate。 这 5 个页面在用户切到 en 后**整页都是中文**。

```bash
$ for f in src/pages/*.tsx; do
    grep -c "useTranslate" "$f"
  done | sort -n | head -5
0  src/pages/Camera.tsx
0  src/pages/PlanPage.tsx
0  src/pages/PronounceCustom.tsx
0  src/pages/SceneDetail.tsx
0  src/pages/WeakWords.tsx
```

v1.55 review 自我辩护:
- "(SceneDetail 没硬编码中文, scene.name 是数据, 不 i18n)" ← **错!** SceneDetail 有大量 UI 硬编码
- "(PronounceCustom 没 h1/h2/h3 标题, 不 i18n)" ← **错!** PronounceCustom 有 button / p / span 硬编码
- "(Camera 走 AI 多模态提示词, 不 i18n)" ← **错!** Camera h1/p/button 全是 UI 硬编码, 不进 AI prompt
- (PlanPage / WeakWords 完全没提)

#### 各页面硬编码中文具体位置

**Camera.tsx** (30+ 处):
- L37 `setError('未选择 LLM 渠道')` / L42 `请先在 设置 → AI 渠道 中为...` / L47 `不支持图像识别, 请切换渠道` / L52 `图片不能超过 4MB` / L79 `识别失败`
- L103 `📷 拍照识物` h1 / L104 `拍照或上传图片, AI 帮你识别出英语单词 (每次识别 1-5 个)` / L111 `当前渠道` / L115 `模型` / L119 `此渠道不支持图像, 建议切换` / L129 `需要先配置 API Key` / L131 `在 设置 → AI 渠道 中填入 ... 的 API Key` / L134 `选 Mock 模拟 渠道可零成本测试`
- L143 `🎯 识别场景` / L161 `选场景后 AI 会重点识别该类别的单词` / L167 `提示词(可选)` / L172 `例如: 找食物 / 找动物 / 找办公用品` / L186 `拍照` / L187 `或从相册选` / L194 `上传图片` / L195 `JPG / PNG, 4MB 以内`
- L218 `AI 正在识别... 约 5-10 秒` / L232 `没有识别到合适的英文单词` / L233 `试试更明确的提示词, 或换张图` / L241 `识别到 N 个单词` / L244 `已到上限 5 个` / L264 `🔄 换一张图` / L286 `置信 N%` / L300 `aria-label="取消收藏/收藏"` / L305 `未收录` / L312 `已在我们 N 句例句里`

**PlanPage.tsx** (25+ 处):
- L55 `toast.error('未选择 LLM 渠道')` / L136 `加载中...` / L146 `📅 学习计划` h1 / L147 `每日目标 N 词 · ...` / L151 `🎯 推荐难度` / L167 `🤖 AI 定制多日计划` / L176 `📊 近 7 天` / L202 `完成日 N/7` / L203 `日均 N 词` / L211 `连续天数 🔥` / L215 `完成 7 天中` / L219 `总学词(7天)`
- L225 `📌 今日详情` / L271 `🎉 今日计划已全部完成!继续保持` / L278 `💡 访问词详情时自动标记完成, 也可手动点 ✓` / L286 `🤖 AI 定制多日计划` / L296 `⏳ 生成中...` / L298 `✨ 生成 7 天计划` / L298 `使用当前 LLM 渠道, 消耗 1 次 explain 额度` / L303 `📌 策略` / L306 `预计学 N 词` / L309 `第 N 天 · ...` / L311 `新词 N · 复习 N · ...` / L311 `💡 ...`

**SceneDetail.tsx** (15+ 处):
- L67 `场景不存在` / L69 `返回场景列表` / L141 `← 返回场景列表` / L165 `已掌握 N / N` / L179 `💡 ...` / L202 `关键词:` / L217 `✓ 已掌握` / L217 `✗ 待复习` / L230 `不认识` / L238 `认识` / L249 `← 上一句` / L256 `下一句 →` / L264 `本场景关键词汇(N)` / L285 `小贴士`

**WeakWords.tsx** (20+ 处):
- L85 `加载错题...` / L94 `没有错题` / L97 `继续保持!` / L100 `去学习新词` / L110-113 Modal `从生词本移除?` / L119 `错题本` h1 / L121 `反复标记"不认识"的词, 需要重点攻克` / L129 `薄弱词` / L133 `错题次数` / L139 `最高错次` / L147 `薄弱词分布` / L148 `N 个待攻克` / L154-156 `1-2 次 / 3-5 次 / 6+ 次` / L181 `攻克建议` / L183 `进入单词详情页, 多看几遍例句和词根, 加深印象` / L215 `错了 N 次` / L230 `标记为已掌握` / L232 `✓ 掌握` / L246-250 `今天/昨天/N天前/N周前/N个月前`

**PronounceCustom.tsx** (6+ 处):
- L23 `← 返回` / L26 `没有可跟读的文本` / L28 `请从「每日一句」点 🎤 跟读 按钮进入` / L30 `去每日一句` / L40 `← 返回` / L41 `返回每日一句` / L48 `每日一句跟读`

#### 影响

切到 en 后:
- 访问 `/camera` → 整页中文 (拍照/识别/置信/已加入/...)
- 访问 `/plan` → 整页中文 (学习计划/连续天数/AI 定制/...)
- 访问 `/scenes/:id` → 整页中文 (场景不存在/已掌握/上一句/下一句/...)
- 访问 `/weak` → 整页中文 (错题本/薄弱词/攻克建议/...)
- 访问 `/pronounce-custom` → 整页中文 (没有可跟读的文本/请从每日一句/...)

i18nKeyCoverage 测试通过的原因是: **该测试只扫 t() 调用的 key 是否在 DICT 中**, 不扫"页面是否用了 useTranslate"。 5 个页面 0 个 t() 调用 = 0 个"missing" = 测试通过 = 假阴性。

#### 修法 (v1.57 范围)

1. **5 页面分别加 useTranslate** + 把所有硬编码中文改 t():
   ```tsx
   // Camera.tsx 改造 (示意)
   import { useTranslate } from '../lib/useTranslate'
   const { t } = useTranslate()
   // L103:  <h1>📷 {t('camera.title')}</h1>
   // L241:  <h2>识别到 {results.length} 个单词</h2> →  t('camera.identified').replace('N', String(results.length))
   ```

2. **DICT 加 5 页面 namespace**:
   ```ts
   // i18n.ts
   'camera.title': '📷 拍照识物' / '📷 Camera',
   'camera.identified': '识别到 N 个单词' / 'Identified N words',
   // ... 30+ key per 页面, 5 页面共 ~100+ key
   'plan.title': '📅 学习计划' / '📅 Plan',
   // ...
   'scenedetail.not_found': '场景不存在' / 'Scene not found',
   // ...
   'weak.title': '错题本' / 'Weak Words',
   // ...
   'pronounce.empty': '没有可跟读的文本' / 'No text to read',
   ```

3. **i18nKeyCoverage 测试加 assertion**:
   ```ts
   // tests/i18nKeyCoverage.test.ts 加:
   it('所有 26 页面都用 useTranslate', () => {
     const pages = readdirSync('src/pages').filter(f => f.endsWith('.tsx'))
     for (const p of pages) {
       const content = readFileSync(`src/pages/${p}`, 'utf-8')
       expect(content.includes("from '../lib/useTranslate'"), `${p} 缺 useTranslate`).toBe(true)
     }
   })
   ```

4. **建议加 ESLint 规则**: 禁止在 src/pages/*.tsx 写中文字符串字面量 (除注释) — 强制走 t()。

---

### 1.2 P1-B: 2 页面 partial i18n (CustomSceneDetail/CustomSceneLearn 各只有 1-2 t() 调用, 周围 10-20+ 硬编码)

**严重度**: P1 (同 1.1, 用户可见)
**文件**:
- `src/pages/CustomSceneDetail.tsx` (2 t(), 10+ 硬编码)
- `src/pages/CustomSceneLearn.tsx` (1 t(), 20+ 硬编码)

#### 现象

v1.55.0 review 写: "改 1 页面 src/pages/CustomSceneDetail.tsx: 2 t() (review_status + original)"。 看似完成, 实际只在两个 <h3> 用了 t(), 周围 10+ 硬编码中文没动。

```tsx
// CustomSceneDetail.tsx (v1.55.0 已 "完成")
<h3 className="font-semibold mb-2 text-sm">📊 {t('customdetail.review_status')}</h3>  // ← t() 用
<h3 className="font-semibold mb-2">📄 {t('customdetail.original')}</h3>  // ← t() 用
{/* 周围 10+ 硬编码: */}
toast.error('场景不存在')  // L25
toast.success('已取消收藏')  // L46
toast.success('已加入生词本')  // L48
'操作失败'  // L51
'⏳ 加载中...'  // L57
'场景不存在'  // L65
'← 返回列表'  // L69
'{N} 词 · 创建于 ...'  // L82
'总词数 / 复习中 / 已掌握'  // L100-108
'📚 生词列表'  // L114
'开始学习' / '← 返回'  // L88, L92
'aria-label="取消收藏/收藏"'  // L130
```

```tsx
// CustomSceneLearn.tsx (v1.53.0 已 "完成")
<h1 className="text-2xl font-bold mb-2">{t('customlearn.done')}</h1>  // ← t() 用
{/* 周围 20+ 硬编码: */}
toast.error('场景不存在')  // L33
toast.success('⭐ ... 已加入生词本')  // L86
'操作失败'  // L90
confirm('重置学习进度, 从头开始?')  // L97
'⏳ 加载中...'  // L116
'你已完成 ... 的 N 个生词'  // L137
'加入复习队列' / '再学一遍' / '返回详情'  // L143-149
toast.success('🎉 N 词已加入复习队列')  // L131
toast.success('已在复习中 (N 词)')  // L133
'入复习失败'  // L137
'📚 ...' / 'N / N'  // L165-167
'← 返回' / '上一词' / '下一词' / '完成'  // L173, L221, L227, L227
'aria-label="显示释义/隐藏释义/..."'  // L184
'(点击或按空格翻面)' / '(点击或按空格查看释义)'  // L195, L201
'🔄 重置进度'  // L237
```

#### 影响

切到 en 后, 这两页面**部分英文 + 部分中文混杂**:
- CustomSceneDetail 顶部状态卡片 (i18n) + 周围 10+ 中文 (硬编码)
- CustomSceneLearn 完成态标题 (i18n) + 整页 20+ 中文 (硬编码)

更糟的是 toast.success/toast.error 的硬编码消息会让用户看英文 UI 但收中文 toast 通知。

#### 修法 (v1.57 范围)

CustomSceneDetail 加 ~10 DICT key, CustomSceneLearn 加 ~20 DICT key。 简单加 t() 调用即可。

---

### 1.3 P1-C: 13 sub-components 0 useTranslate — 跨文件 i18n 不同步

**严重度**: P1 (用户可见 — 父页 i18n, 子组件硬编码)
**文件**:
- `src/components/home/TodayPlanCard.tsx` (0 useTranslate)
- `src/components/home/DailySentenceCard.tsx` (0 useTranslate)
- `src/components/home/ReviewReminderCard.tsx` (0 useTranslate)
- `src/components/ReviewCenter/SortToggle.tsx` (0 useTranslate)
- `src/components/settings/{AIChatDataSection,CustomForms,DataManagementSection,LLMSection,MigrationSection,PreferencesSection,ReminderSection,TTSSection,TranslateSection}.tsx` (9 个, 0 useTranslate)

#### 现象

Home.tsx (用了 useTranslate) 渲染 3 个子组件, 但子组件硬编码中文:
```tsx
// Home.tsx
const { t } = useTranslate()  // ← Home i18n
<TodayPlanCard plan={plan} onMarkWord={handleMarkPlanWord} />  // ← 子组件硬编码

// TodayPlanCard.tsx (子组件)
<h2 className="font-semibold">📅 今日学习计划</h2>  // ← 硬编码
// DailySentenceCard.tsx
<span ...>每日一句</span>  // ← 硬编码
// ReviewReminderCard.tsx
<h3>有 {dueCount} 个词该复习了</h3>  // ← 硬编码
<p>按记忆曲线, 趁热打铁</p>  // ← 硬编码
```

类似 Settings 页面 (用了 useTranslate) 渲染 9 个子组件 (LLMSection / TTSSection / ReminderSection / ...), 但子组件硬编码中文。

#### 影响

切到 en 后, Home 页:
- Home 主 UI (部分 i18n + 1.1A 列的硬编码)
- TodayPlanCard h2 "📅 今日学习计划" 仍中文
- DailySentenceCard "每日一句" 仍中文
- ReviewReminderCard "有 N 个词该复习了" 仍中文
- **用户看到中英混杂的页面**, 比全中文还糟糕 (不统一)

#### 修法 (v1.57 范围)

两种方案:

**A. 子组件也 useTranslate** (推荐, 标准做法)
```tsx
// TodayPlanCard.tsx
import { useTranslate } from '../../lib/useTranslate'
export default function TodayPlanCard({ plan, onMarkWord }: Props) {
  const { t } = useTranslate()
  return <h2>📅 {t('home.today_plan_title')}</h2>
  // ...
}
```

**B. 父传 i18n 字符串 prop**
```tsx
// Home.tsx
<TodayPlanCard plan={plan} onMarkWord={...} title={t('home.today_plan_title')} />
```
不推荐 — prop 污染, N 个 prop 要加, 不如 A 干净。

**A 方案需要 DICT 加 namespace**: `home.today_plan_title`, `home.daily_title`, `home.review_reminder_title`, `home.review_reminder_subtitle` + settings.* 子组件的 key。

**i18nKeyCoverage 测试扩展** (同 1.1A 修法 3):
```ts
it('所有 sub-components 都用 useTranslate', () => {
  const compFiles = readdirSync('src/components')
    .filter(f => f.endsWith('.tsx'))
  // + subdirectories
  for (const p of compFiles) {
    const content = readFileSync(`src/components/${p}`, 'utf-8')
    // 检查有 JSX 的 (有 return 语句 + 用户可见文本) 才需 useTranslate
    // 简单粗暴: 所有有中文字符串的 .tsx 都得 useTranslate
  }
})
```

---

### 1.4 P2-A: 升级 toast 硬编码中文 + 理论 race condition (verifier3 P2 候选 confirmed)

**严重度**: P2 (次要 — 切 en 时 toast 是中文, race 仅理论)
**文件**: `src/pages/Home.tsx:86-93`

#### 现象

```tsx
// Home.tsx L86-93 (v1.43.0 W43-B 引入, v1.55.0 未改)
const prevLevelRef = useRef<number>(xpState.level)
useEffect(() => {
  if (xpState.level > prevLevelRef.current) {
    toast.success(`🎉 升级到 Lv.${xpState.level} ${xpState.levelTitle}!`)
  }
  prevLevelRef.current = xpState.level
}, [xpState.level, xpState.levelTitle])
```

**问题 1: 硬编码中文**
- toast 文本: `🎉 升级到 Lv.${xpState.level} ${xpState.levelTitle}!` 全硬编码
- 切 en 时: 弹"🎉 升级到 Lv.2 学徒!" (中文) — 周围 UI 英文, 不一致
- xpState.levelTitle 来自 `LEVEL_TITLES[idx]` 也是中文 (xpSystem.ts:27-36)

**问题 2: 理论 race condition (verifier3 P2 候选 confirmed)**
- 单次 `markWordCompleted` +5 XP, 1 click 最多升 1 级, 实际不 race
- **但** if `xpState.level` 跨级 +1 (e.g., Lv.1 → Lv.3 直跳), 中间 Lv.2 toast 丢
  - 例: 用户用 STREAK +10 + LEARN +5 = +15 XP, 一次性从 Lv.1 (50 XP) 跨 Lv.2 (150 XP) 到 Lv.3 (300 XP)
  - useEffect 只看到 1 → 3, toast 只显示 "Lv.3", 用户错过 Lv.2
- 实际触发: STREAK 在 streak 跨过 milestone 时一次 +10, LEARN 一次 +5, FAVORITE 一次 +1. 单次最大 +10, 不会跨级。但 5+1+5+5+1+1+5 = 23 XP, 加 50 XP (Lv.1→2) = 73 XP, 不会跨级。
- **真 race 触发场景**: 多 STREAK 同时触发 (实际只 1 次/天), 或 reviewWord 触发 REVIEW +3 多次 (但每次只 +3, 也不会跨级)
- **结论**: race 理论存在, 实际不触发. **P2 候选 confirmed, 但实战 P3**

#### 修法 (v1.57 范围)

```tsx
// 修 1: 硬编码 → t()
import { useTranslate } from '../lib/useTranslate'
const { t, locale } = useTranslate()
useEffect(() => {
  if (xpState.level > prevLevelRef.current) {
    // 跨 locale 切换 levelTitle: 英文用 i18n, 中文用原表
    const title = locale === 'en'
      ? LEVEL_TITLES_EN[level - 1] || xpState.levelTitle
      : xpState.levelTitle
    toast.success(t('home.level_up').replace('N', String(xpState.level)).replace('T', title))
  }
  prevLevelRef.current = xpState.level
}, [xpState.level, xpState.levelTitle, locale, t])

// DICT 加:
'home.level_up': '🎉 升级到 Lv.N T!' / '🎉 Level up to Lv.N T!',

// 修 2: race 防御 (可选, 实际不触发)
// 用 prevLevelRef.current 记录上次"已知 level", 改成"上次 toast level"
// for (let l = prevLevelRef.current + 1; l <= xpState.level; l++) {
//   toast.success(`升级到 Lv.${l} ${LEVEL_TITLES[l-1]}!`)
// }
```

---

### 1.5 P2-B: 6 死 import in pages (verifier10 候选)

**严重度**: P2 (死代码, 不影响功能, 仅维护性)
**文件**:
- `src/pages/WeakWords.tsx:5` — `loadWords` imported, 0 引用
- `src/pages/SceneDetail.tsx:4` — `type Scene` imported, 0 引用
- `src/pages/PlanPage.tsx:9` — `levelLabel` imported, 0 引用
- `src/pages/Home.tsx:12` — `LEVELS` imported, 0 引用
- `src/pages/Notebook.tsx:3` — `getWord` imported, 0 引用
- `src/pages/WordDetail.tsx:2` — `Link` imported, 0 引用

#### 现象

```bash
$ grep -c "loadWords" src/pages/WeakWords.tsx
1   # 只有 import 那行
$ grep -c "Scene" src/pages/SceneDetail.tsx
1   # 只有 import 那行
$ grep -c "levelLabel" src/pages/PlanPage.tsx
1   # 只有 import 那行
$ grep -c "LEVELS" src/pages/Home.tsx
1   # 只有 import 那行
$ grep -c "getWord" src/pages/Notebook.tsx
1   # 只有 import 那行
$ grep -c "Link" src/pages/WordDetail.tsx
1   # 只有 import 那行
```

#### 影响

- 死 import 占 bundle 字节 (~50 bytes raw each, 6 个 ~300 bytes)
- tsc 不会警告 (TS 默认不报 unused import)
- eslint 不会警告 (当前项目没配 no-unused-vars / no-unused-imports)
- **风险**: 未来重构时, 开发者误以为这些 import 还在用, 改了不影响

#### 修法 (v1.57 范围)

6 处删 import, 1 行 each:

```ts
// WeakWords.tsx:5
- import { getWord, loadWords } from '../lib/words'
+ import { getWord } from '../lib/words'

// SceneDetail.tsx:4
- import { SCENES, type Scene, getSentenceId } from '../data/scenes'
+ import { SCENES, getSentenceId } from '../data/scenes'

// PlanPage.tsx:9
- import { levelColor, levelLabel } from '../lib/learnReport'
+ import { levelColor } from '../lib/learnReport'

// Home.tsx:12
- import { loadWords, LEVELS } from '../lib/words'
+ import { loadWords } from '../lib/words'

// Notebook.tsx:3
- import { getWord, loadWords } from '../lib/words'
+ import { loadWords } from '../lib/words'

// WordDetail.tsx:2
- import { useParams, useNavigate, Link } from 'react-router-dom'
+ import { useParams, useNavigate } from 'react-router-dom'
```

**建议加 ESLint 规则**: `"@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }]` 防回归。

---

## 2. 5 维度独立评估

### 维度 1: 切语言 UI bug (新 i18n 全 25 页面)

**结论**: **P1 严重 — v1.55 review 口径"25/25 完成"是错的, 实际 21/26 页面 i18n**

**评估详情**:

| 文件 | useTranslate | t() 调用数 | 硬编码中文数 | 评估 |
|------|-------------|-----------|------------|------|
| Home.tsx | ✓ | 12 | 2+ (h1 "你好 👋" / "今天来学点新东西吧") | **部分** (h1 漏) |
| WordList.tsx | ✓ | 29 | < 5 | 完整 |
| WordDetail.tsx | ✓ | 12 | < 5 | 完整 |
| DailyPage.tsx | ✓ | 12 | < 5 | 完整 |
| Translate.tsx | ✓ | 6 | < 5 | 完整 |
| Notebook.tsx | ✓ | 32 | < 5 | 完整 |
| Settings.tsx | ✓ | 1 | < 5 | **部分** (1 t() 不够) |
| ReviewCenter.tsx | ✓ | 10 | < 5 | 完整 |
| CardReview.tsx | ✓ | 41 | < 5 | 完整 |
| **WeakWords.tsx** | **✗** | **0** | **20+** | **0% i18n** |
| Scenes.tsx | ✓ | 8 | < 5 | 完整 |
| LearnReport.tsx | ✓ | 12 | 5+ (Overview/WordList 子组件硬编码) | **部分** |
| **PronounceCustom.tsx** | **✗** | **0** | **6+** | **0% i18n** |
| **PlanPage.tsx** | **✗** | **0** | **25+** | **0% i18n** |
| WritePage.tsx | ✓ | 39 | **1+ (L417 "📚 我的作文")** | **99% i18n + 1 漏** |
| ErrorsPage.tsx | ✓ | 17 | < 5 | 完整 |
| ListenPage.tsx | ✓ | 26 | < 5 | 完整 |
| Achievements.tsx | ✓ | 4 | 5+ (成就数据本身硬编码) | **部分** |
| **SceneDetail.tsx** | **✗** | **0** | **15+** | **0% i18n** |
| **Camera.tsx** | **✗** | **0** | **30+** | **0% i18n** |
| AIChat.tsx | ✓ | 43 | **1+ (L475 "📚 历史")** | **99% i18n + 1 漏** |
| ReportsPage.tsx | ✓ | 10 | < 5 | 完整 |
| CustomScenes.tsx | ✓ | 12 | < 5 | 完整 |
| **CustomSceneDetail.tsx** | ✓ | **2** | **10+** | **10% i18n** |
| **CustomSceneLearn.tsx** | ✓ | **1** | **20+** | **5% i18n** |
| CalendarPage.tsx | ✓ | 2 | < 5 | 完整 |

**统计**:
- 完全 0% i18n: **5 页面** (Camera, PlanPage, PronounceCustom, SceneDetail, WeakWords)
- 部分 i18n (10% - 50%): **3 页面** (CustomSceneDetail 10%, CustomSceneLearn 5%, Home h1 漏, LearnReport 子组件, Achievements 数据)
- 99% i18n (单点漏): **2 页面** (AIChat L475, WritePage L417)
- 完整 i18n: **16 页面** (WordList, WordDetail, DailyPage, Translate, Notebook, ReviewCenter, CardReview, Scenes, ErrorsPage, ListenPage, ReportsPage, CustomScenes, CalendarPage, Settings, etc.)
- 总: 5 + 3 + 2 + 16 = **26 页面**

**v1.55 review notes 写 "25/25 页面都加了 useTranslate" — 错!** 实际只有 21/26 页面有 useTranslate。 v1.55 review notes 还说 "(SceneDetail 没硬编码中文)" / "(PronounceCustom 没 h1/h2/h3)" — 都不准, 都漏了 5+ 硬编码。

**主审查 `big-review-v1.55.py` 维度 6 "i18n 完整性"**:
```bash
  扫到 t() 调用: 91 keys
  DICT 中: 123 keys
✓ 0 missing
```
"0 missing" 只验证 "DICT 包含所有 t() 调用的 key" — 不会发现 "页面 0 个 t() 调用" (5 个页面) 或 "页面 t() 调用少, 大量硬编码"。 **测试维度本身有盲区。**

**i18nKeyCoverage.test.ts**:
- 只扫 t() 调用是否在 DICT
- 只验证 5 个特定页面 (Notebook/WordList/WordDetail/ErrorsPage/ListenPage) 有 useTranslate
- **不验证**所有 26 页面都有 useTranslate
- **不验证**t() 调用覆盖率 (10% i18n 也过测试)

**维度 1 结论**: **P1 严重 (1.1, 1.2, 1.3) — 切 en 后多个页面整页/部分中文**。 v1.55 review "25/25 完成" 错, i18nKeyCoverage 测试维度有盲区。

---

### 维度 2: 升级 toast race condition (verifier3 P2 候选)

**结论**: **P2 (硬编码中文 confirmed, race 仅理论)**, 修 1.4 即可

**分析**:

```tsx
// Home.tsx:86-93
const prevLevelRef = useRef<number>(xpState.level)
useEffect(() => {
  if (xpState.level > prevLevelRef.current) {
    toast.success(`🎉 升级到 Lv.${xpState.level} ${xpState.levelTitle}!`)
  }
  prevLevelRef.current = xpState.level
}, [xpState.level, xpState.levelTitle])
```

**问题 1: 硬编码中文** (确认)
- `🎉 升级到 Lv.${xpState.level} ${xpState.levelTitle}!` 全硬编码
- xpState.levelTitle 来自 `LEVEL_TITLES[idx]` (xpSystem.ts:27-36) 也全硬编码 (新手/学徒/学人/学者/学师/学宗/学仙/学圣/学神/学帝)
- 切 en 后, 用户升到 Lv.2 看到 "🎉 升级到 Lv.2 学徒!" — 周围 Home UI 英文 (h1 "Hello 👋"... but actually h1 is also 硬编码, 见 1.1A), toast 仍是中文
- **P2 修法**: 加 `home.level_up` DICT key + LEVEL_TITLES_EN 数组

**问题 2: 理论 race** (verifier3 P2 候选, confirmed)
- useEffect 只看 final xpState.level, 不看 addXP 内部 prevLevel
- 多 STREAK/REVIEW 跨级跳时, 中间级 toast 丢
- 实际触发需 +1 级以上单次 addXP。 当前 XP_REWARDS:
  - LEARN: 5 (单次 +5, 不会跨级 50→150)
  - REVIEW: 3 (不会跨级)
  - STREAK: 10 (不会跨级, 但 streak 跨 milestone 时 +10)
  - ANSWER: 2 (不会跨级)
  - FAVORITE: 1 (不会跨级)
- **跨级最严苛**: Lv.1 (50 XP) → Lv.2 (150 XP), 需 100 XP. 1 次 STREAK (+10) + 1 次 LEARN (+5) = +15. 不可能 1 次跨级.
- **结论**: race 实际不触发, 但代码逻辑有缺陷 (prevLevelRef 跟 final level, 不跟 addXP 内部 prevLevel), 是潜在 bug

**为什么 verifier3 标 P2 候选**:
- 触发条件窄 (几乎不发生), 但代码 anti-pattern 明确 (prevLevelRef + useEffect 是常见的错误模式, 应该用 addXP 返回的 leveledUp)
- 修法简单 (改用 addXP 的 leveledUp 字段, 或在 plan.ts 返回 addXP 结果)

**修法对比**:

| 方案 | 优点 | 缺点 |
|------|------|------|
| A. 改用 addXP 的 leveledUp | 一级不丢 | 改 plan.ts 接口, 影响面大 |
| B. for-loop toast 跨级 | 一行修, 局部改 | prevLevelRef.current 不能简单 +1, 需重置 |
| C. 只修硬编码, race 不动 | 5 行修 | race 仍然潜在 |

**推荐 A**: 让 plan.ts 的 markWordCompleted 返回 addXP 的 {leveledUp, prevLevel, newLevel}, Home.tsx 用之触发 toast。 改 3 个文件 ~10 行, 一劳永逸。

**维度 2 结论**: 1.4 P2 综合, 硬编码修 5 行, race 实际不触发但修 10 行更稳妥。 总 ~15 行。

---

### 维度 3: t() N 替换 bug (verifier2 提示)

**结论**: **0 bug** — 3 处 t().replace('N', String(...)) 全部正确

**3 处验证**:

```ts
// AIChat.tsx:568
t('aichat.history').replace('N', String(chats.length))
// DICT zh: '历史对话 (N)' / en: 'History (N)'
// N=5 → "历史对话 (5)" / "History (5)" ✓

// CustomScenes.tsx:284
t('customscenes.extracted').replace('N', String(extractedWords.length))
// DICT zh: '提取结果 (N 词)' / en: 'Extracted (N words)'
// N=3 → "提取结果 (3 词)" / "Extracted (3 words)" ✓

// WritePage.tsx:477
t('write.errors').replace('N', String(result.errors.length))
// DICT zh: '错误清单 (N)' / en: 'Errors (N)'
// N=2 → "错误清单 (2)" / "Errors (2)" ✓
```

**Edge case** (理论但实际不触发):
- `t(key)` 返回 key 自身 (DICT 缺 key) → `key.replace('N', '5')` 是 no-op (key 不含 'N') → 显示 "aichat.history" 而非 "History (5)" → P2 命名 smell, 但 3 key 都在 DICT, 不触发
- `String(undefined)` = "undefined" → 显示 "历史对话 (undefined)" → 难看但不 crash。 `chats.length` / `extractedWords.length` / `result.errors.length` 都来自 useState, 永远是数组, 不可能 undefined. 不修。

**DICT N 一致性扫** (12 个 t().replace('N', ...)):
- AIChat:568 ✓
- CardReview:230 (.replace('N', reviewedCount).replace('M', queue.length)) — 2-replace ✓
- CardReview:417 ✓
- CardReview:418 ✓
- CustomScenes:284 ✓
- ListenPage:614 (replace N with lesson.title, 1 异常) — 字符串替字符串, 类型不一致但功能正确
- Notebook:276 (.replace('N', words).replace('M', due)) ✓
- Notebook:341 ✓
- Notebook:458 ✓
- WordList:169 (3-replace N/M/K) ✓
- WordList:292 ✓
- WritePage:477 ✓

**维度 3 结论**: 0 bug. 12 个 N 替换全部安全, race-free (同步字符串操作), DICT 完整。 比 v1.49 addXP race 简单 — .replace 是同步单线程, 不可能 race.

---

### 维度 4: 跨文件 i18n bug (嵌套组件 locale 同步)

**结论**: **P1 严重 — 13 sub-components 0 useTranslate, 父页 i18n 时子组件硬编码**

**useTranslate 行为验证** (v1.41.0 W41 引入, 当前 v1.55):

```ts
// useTranslate.ts
export function useTranslate() {
  const [locale, setLocaleState] = useState<Locale>(getLocale())
  useEffect(() => {
    const handler = (e: Event) => {
      setLocaleState((e as CustomEvent<Locale>).detail)
    }
    window.addEventListener('locale-change', handler)
    return () => window.removeEventListener('locale-change', handler)
  }, [])
  const t = useCallback((key: string) => translate(key, locale), [locale])
  return { t, locale, setLocale: changeLocale }
}
```

**locale 切换流程**:
1. setLocale('en') → 触发 `locale-change` CustomEvent
2. 所有挂载 useTranslate 的组件都通过 listener 收到通知
3. 各组件 setLocaleState('en') → 自身 rerender
4. t() callback 因 locale 依赖重建, 后续调用返 en 翻译

**问题: 不挂 useTranslate 的组件不 rerender**:
- 父 Home.tsx 挂 useTranslate, 切 en 后 rerender
- 子 TodayPlanCard/DailySentenceCard/ReviewReminderCard **不挂 useTranslate**, 不挂 listener, **不 rerender**
- 子组件仍显示父组件首次渲染时的中文 (因为 props 没变, state 没动, 不会 rerender)
- 父 rerender 时 React 协调子组件, 但因 props 无变化, 跳过子组件 render — **子组件硬编码中文永不变**

**13 个子组件验证**:
```bash
$ grep -L "useTranslate" src/components/home/*.tsx src/components/ReviewCenter/*.tsx src/components/settings/*.tsx
src/components/home/DailySentenceCard.tsx
src/components/home/ReviewReminderCard.tsx
src/components/home/TodayPlanCard.tsx
src/components/ReviewCenter/SortToggle.tsx
src/components/settings/AIChatDataSection.tsx
src/components/settings/CustomForms.tsx
src/components/settings/DataManagementSection.tsx
src/components/settings/LLMSection.tsx
src/components/settings/MigrationSection.tsx
src/components/settings/PreferencesSection.tsx
src/components/settings/ReminderSection.tsx
src/components/settings/TTSSection.tsx
src/components/settings/TranslateSection.tsx
```

每个都是父页 (Home/Settings/ReviewCenter) 用了 useTranslate, 子组件没。 切 en 时父页 OK, 子组件硬编码中文。

**LearnReport 同样问题**:
- LearnReport.tsx 主组件 useTranslate ✓, t('learnreport.title') ✓
- 子组件 `function Overview({ report })` (L131) useTranslate ✓ (L132)
- 子组件 `function WordList({ title, words, empty })` (L225) **✗ 无 useTranslate**
- WordList 通过 prop 传 title, 父 LearnReport 传硬编码中文 "🔥 高频词(前 30)" / "💎 难词(B2+)" / "🕐 最近用词" / "还没有用过 B2 以上难词"
- 切 en 后 LearnReport 标题英文, WordList 内容中文

**Layout.tsx 也是** (v1.53 verifier9 P2 已知):
- Layout 没用 useTranslate
- desktopNav/mobileNav 全硬编码中文 (14 桌面 + 10 移动 = 24 个 nav label)
- 切 en 后, 桌面侧边栏 + 移动底部 Tab 全中文

**维度 4 结论**: 13 sub-components 死组件 + 1 Layout 死组件 + 1 LearnReport 子组件死 = **15 个 i18n 失效点**。 修法见 1.3, 主要工作: 子组件加 useTranslate + DICT 加 namespace key。 估计 ~30-50 DICT key, ~15 个文件 import + ~15 处的硬编码改 t()。

---

### 维度 5: 死代码 (verifier10 候选)

**结论**: **P2 — 6 死 import in pages + 56 死 DICT key + 1 死导出**

**5.1 死 import in pages** (6 处):
- `src/pages/WeakWords.tsx:5` — `loadWords` (0 引用)
- `src/pages/SceneDetail.tsx:4` — `type Scene` (0 引用)
- `src/pages/PlanPage.tsx:9` — `levelLabel` (0 引用)
- `src/pages/Home.tsx:12` — `LEVELS` (0 引用)
- `src/pages/Notebook.tsx:3` — `getWord` (0 引用)
- `src/pages/WordDetail.tsx:2` — `Link` (0 引用)

修法见 1.5。 6 行删除。

**5.2 死 DICT key** (56 个):
- nav.* (8): nav.daily/home/notebook/review/scores/settings/translate/words
- common.* (7): common.cancel/confirm/delete/empty/error/save/success
- settings.* (8): settings.appearance/color/contrast/data/llm/reset/theme/tts
- reports.* (9): reports.avg_accuracy/daily_streak/export/share/this_month/this_week/total_sessions/total_words/weekly_chart
- review.* (9): review.correct/days/due/flip_back/incorrect/next_card/show_answer/streak/today
- home.* (5): home.daily_summary/greeting/start/streak_subtitle/welcome
- plan.* (3): plan.completion_rate/continue_streak/week_summary
- app.* (2): app.name/tagline
- notebook.empty (1)
- pronounce.back (1)
- scenedetail.words (1)
- worddetail.back (1) — v1.53 verifier9 P2-A
- custom.title (1)

**为什么死**:
- 多数是 v1.41 i18n 引入时定义, 但页面没接
- Layout nav (8 个) 等 Layout 接入
- common.* (7) 等 Modal 接入
- settings.* (8) 等 Settings 完整接入 (目前 Settings 只 1 t())
- reports.* (9) 等 ReportsPage 完整接入 (目前 10 t(), 但 9 个 DICT key 没用上, 用了自己硬编码)
- review.* (9) 等 CardReview 完整接入 (目前 41 t(), 用的 DICT key 是 review.done_title / review.empty_title / review.preparing 等, 不用 review.days / review.due / review.streak 等)
- home.greeting (1) 等 Home h1 接入 (目前硬编码)

**修法 (3 选 1)**:
- A. 删 56 个死 DICT key (省 ~1.5 KB raw, ~0.5 KB gzipped)
- B. 用上 (跟 1.1 / 1.2 / 1.3 一起做, 全部 56 个 DICT key 都对应页面有 0 useTranslate)
- C. 加 ESLint `no-unused-dict-keys` (自写规则或 plugin)

**推荐 B** (与 1.1/1.2/1.3 一起做), 自然消亡。 单独做 A 简单, 但只省 0.5 KB gzipped, 不重要。

**5.3 死导出**:
- `src/lib/i18n.ts:389` — `initLocale()` 函数 (v1.41 引入), 仅测试用, 无生产代码调用
  - v1.53 verifier9 P2-B noted
  - 修法: 删函数 + 删 2 个测试用例 (tests/i18n.test.ts:50, tests/i18nMigration.test.ts:7/33)
  - 或: 在 main.tsx 调一次 (项目 5 个 release 没调, 死代码)

**5.4 死变量** (扫了但 0 发现):
- 各 page/component 内 const 变量, 全部有引用 (除 WeakWords L18 `filter state 已删除` 注释, v0.14 死代码 已清, 干净)

**5.5 死 type/interface** (扫了但 0 发现):
- 全部 type/interface 都有引用 (type WeakWordItem / type TodayPlan / type AddXPResult 等都是用到的)

**维度 5 结论**: 6 死 import (P2), 56 死 DICT key (P2, 跟 1.1-1.3 一起修自然消亡), 1 死导出 (P2, v1.53 已 noted), 0 死变量/死 type。 总体 P2 维护性清理, 不影响功能。

---

## 3. 累计 (v1.55 → v1.56)

| 来源 | 数量 | 内容 |
|------|------|------|
| v1.55 main review | 0 | 0 P0 + 0 P1 (口径"v1.55 范围") |
| v1.53 verifier9 | 2 P1 + 2 P2 | AIChat 回归 / WritePage 回归 / worddetail.back / initLocale |
| **v1.56 verifier11 (本)** | **3 P1 + 2 P2** | **P1-A 5 页面 0 i18n / P1-B 2 页面 partial / P1-C 13 sub-components 死组件 / P2-A 升级 toast 硬编码+race / P2-B 6 死 import** |

| 维度 | 评估 | bug |
|------|------|-----|
| 1 切语言 UI | ✗ P1 严重 | 1.1 (5 页面 0 i18n) + 1.2 (2 页面 partial) + 1.3 (13 sub-components 死组件) |
| 2 升级 toast race | ⚠ P2 候选 confirmed | 1.4 (硬编码中文 + 理论 race) |
| 3 t() N 替换 race | ✓ 0 bug | - |
| 4 跨文件 i18n | ✗ P1 严重 | 1.3 (13 sub-components 死组件, 嵌套 locale 不同步) |
| 5 死代码 | ⚠ P2 维护 | 1.5 (6 死 import + 56 死 DICT key) |

**v1.55 主审查 0 P1 的口径是"v1.55 范围 0 新 P1"**, 不是"v1.55 累计 0 P1"。 实际上 v1.53 verifier9 找到的 2 P1 (AIChat / WritePage 回归) 到 v1.55 仍未修。 v1.55 review 自身口径"25/25 完成"也是错的。

---

## 4. 修法优先级

**P1-A (5 页面 0 i18n)**: **最高优先级**。 影响 5 个路由 (/camera, /plan, /scenes/:id, /weak, /pronounce-custom), 用户切 en 后整页中文。 建议 v1.57 必修, 估 2-3h。

**P1-B (2 页面 partial)**: 高优。 CustomSceneDetail/CustomSceneLearn 周围 30+ 硬编码, 1-2h。

**P1-C (13 sub-components 死组件)**: 高优。 13 个子组件 + LearnReport WordList + Layout = 15 个 i18n 失效点。 2-3h, 跟 P1-A/B 一起做。

**P2-A (升级 toast 硬编码 + race)**: 中优。 单文件 15 行修, 跟 1.1A 一起做。

**P2-B (6 死 import)**: 低优。 6 行删, 1 min。

**总估时**: 5-7h (P1 全包) + 30 min (P2 全包) = **6-8h for v1.57 release**.

---

## 5. 验证

- tsc --noEmit: 0 错误 (主审查已确认, 本 verifier 仅静态读)
- vitest: i18nKeyCoverage 6 测试全过 (主审查已确认) — 但测试有盲区, 见 1.1 修法 3
- 静态审查: `python3 scripts/big-review-v1.55.py` 跑过 0 P0 (主审查已确认)
- 本 verifier 仅静态读, 无代码改动 (按约束)

---

## 6. 总结

**v1.55.0 自身 i18n 集成有 3 P1 严重问题**:
- 5 页面 0 useTranslate (Camera / PlanPage / PronounceCustom / SceneDetail / WeakWords)
- 2 页面 partial i18n (CustomSceneDetail / CustomSceneLearn)
- 13 sub-components 死组件 (跨文件 locale 不同步)

**v1.55.0 review 口径"25/25 页面 i18n 完成"是错的**, 实际只有 21/26 页面有 useTranslate, 其中 2 页面只 5-10% 覆盖率。

**i18nKeyCoverage 测试有盲区**: 只扫 t() 调用的 key, 不扫"页面是否用了 useTranslate", 不扫"页面 t() 覆盖率"。 建议 v1.57 加 assertion (1.1 修法 3) + ESLint 规则 (1.5 修法)。

**v1.55 自身有 2 P2**:
- 升级 toast 硬编码中文 + 理论 race (verifier3 候选 confirmed)
- 6 死 import in pages

**v1.55 主审查 0 P0 + 0 P1 的口径"v1.55 范围 0 新 P1"**, 不代表 "v1.55 累计 0 P1"。 本 verifier 找到的 3 P1 + 2 P2 需 v1.57 修。

**v1.56 4 文档同步 + 12 次大 review**: 静态 0 P0 ✓, 但 v1.55 残留 3 P1 + 2 P2 待 v1.57 修。

---

**最后更新**: 2026-07-28 (W51 verifier11)
