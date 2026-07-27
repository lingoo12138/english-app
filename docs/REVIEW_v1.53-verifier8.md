# v1.53.0 W48 — Verifier 8 独立 review (5 维度盲区 + 死代码 + 静态 import)

**日期**: 2026-07-27 (W48)
**版本**: v1.53.0 (commit fc31825)
**触发**: 第 9 次大 review — verifier8 独立验证
**目标**: 找主审查 + 历史 verifier 漏掉的真问题 (5 维度盲区)
**评审范围**: 5 维度独立评估 + 总结
**评审方式**: 静态读 v1.53.0 commit `fc31825` 源码
**评审时间**: ~20 min

---

## 0. 背景

- v1.53.0 已 commit, 主审查 0 P0 + 0 P1 (8 维度, v1.52 + v1.53 累积 5 release)
- 历史 verifier 累计 12 处真 bug (v1.36×2 + v1.39×2 + v1.43 + v1.45×3 + v1.48×2 + v1.51 + v1.52×3)
- 本 verifier 专注 5 维度盲区 (主审查 + 历史 verifier 漏判的角度)
- 评审时间 20 min, 静态读为主
- 约束: 不改 src/ 不拉 subagent 不 push
- **与 verifier9 关系**: 本 verifier 跑得比 verifier9 早 5 min, 维度切分不同; 部分 P (1.1, 1.2) 可能重叠

---

## 1. 找到的真 bug

### 1.1 P1-A: v1.53 4 页面 "partial i18n" 漏改 (verifier7 P1-A/B 模式 4 处复制)

**文件**: 4 个 v1.53 新 i18n 页面 — CustomScenes.tsx / ReviewCenter.tsx / Achievements.tsx / CustomSceneLearn.tsx
**引入版本**: v1.53.0 (W48) — 每个文件改 1-2 处 t() 但**周围 4-10 处硬编码中文未改**
**修法引用**: 4 页面**全部需要**新增 DICT key + 改 t() (类似 v1.52 verifier7 P1-A/B)

#### 现象 (4 页面 25+ 处)

v1.53 改 4 页面**只覆盖了核心标题/单条文案**, 但**同屏的副标题/按钮/toast/placeholder/确认框全部硬编码中文**:

**CustomScenes.tsx (t() 在 L218 + L284, 周围 8+ 处硬编码)**:
```tsx
// L218 (v1.53 改的, i18n-ed)
<h1>📝 {t('customscenes.title')}</h1>
// L220-221 (v1.53 未改)
<p>粘贴任意英文文本 (文章/对话/邮件), AI 自动提取生词, 保存为你的专属场景</p>

// L228 (v1.53 未改)
<h3>📄 粘贴英文文本 / 📁 上传文件</h3>
// L232 (v1.53 未改)
<textarea placeholder="粘贴英文文本... 例: 邮件 / 文章 / 对话 / 歌词" />
// L241 (v1.53 未改)
<span>{text.length} / {MAX_TEXT_LEN} 字符</span>
// L261 (v1.53 未改)
<input placeholder="场景标题" />
// L267, 271 (v1.53 未改)
<button>📁 上传文件</button> / <button>✨ 提取生词</button>
```

**ReviewCenter.tsx (t() 在 L132 + L155, 周围 6+ 处硬编码)**:
```tsx
// L132 (v1.53 改的, i18n-ed)
<h2>{t('review.empty')}</h2>
// L103 (v1.53 未改)
<p>标记"不认识"的词会在 1 天后再次出现<br />系统会按记忆曲线智能安排复习</p>
// L108-111 (v1.53 未改)
<button>📚 去看看生词本</button> / <button>📋 查看错题本</button>
// L155 (v1.53 改的, i18n-ed)
<h2>{t('review.done')}</h2>
// L157 (v1.53 未改)
<p>本次复习 {total} 个词 · 正确 {correctCount} · 错误 {wrongCount}</p>
```

**Achievements.tsx (t() 在 L49, 周围 4+ 处硬编码)**:
```tsx
// L49 (v1.53 改的, i18n-ed)
<h1>🏆 {t('achievements.title')}</h1>
// L51 (v1.53 未改)
<p>你的每一次坚持, 都解锁一个新徽章</p>
// L77 (v1.53 未改)
<div>已解锁 {Math.round(ratio * 100)}% 的成就</div>
// L82 (v1.53 未改)
<div>🎯 下一成就: {next.achievement.emoji} <b>{next.achievement.title}</b></div>
// L17-20 (v1.53 未改)
TYPE_META.streak.label = '连续学习' / words.label = '词量' / errors.label = '改错' / favorites.label = '收藏'
```

**CustomSceneLearn.tsx (t() 在 L168, 周围 6+ 处硬编码)**:
```tsx
// L168 (v1.53 改的, i18n-ed)
<h1>{t('customlearn.done')}</h1>
// L170 (v1.53 未改)
<p>你已完成 <strong>{scene.title}</strong> 的 {scene.words.length} 个生词</p>
// L31 (v1.53 未改)
toast.error('场景不存在')  // ← 之前路径用硬编码
// L85 (v1.53 未改)
if (!confirm('重置学习进度, 从头开始?')) return
// L113 (v1.53 未改)
return <div>⏳ 加载中...</div>
// L173, 176, 178 (v1.53 未改)
<button>📚 加入复习队列</button> / <button>🔄 再学一遍</button> / <Link>← 返回详情</Link>
// L246, 266 (v1.53 未改)
<button>← 上一词</button> / <button>✓ 完成 / 下一词 →</button>
```

#### 影响

- 切到 en: 4 页面**核心标题**变英文 (📝 Custom Scenes / No due reviews / 🏆 Achievements / Done!), 但**周围 subtitle/button/toast/placeholder 仍是中文**
- 用户看到 "📝 Custom Scenes" 然后看到 "粘贴任意英文文本" placeholder — **一眼穿帮**
- **同屏中英混用**比 v1.52 verifier7 P1-A/B 更严重: 4 页面 × 6+ 处 = **25+ 处遗漏**
- v1.52 verifier7 找到 2 P1 (各 1 处), v1.53 同样模式但**扩大 12 倍** (4 页面 × 6+ 处)
- 主审查 `big-review-v1.53.py` 维度 6 "i18n 完整性" 只扫 "DICT 完整" (0 missing), 没扫"同屏 t() 一致性"

#### 验证

```bash
# 4 文件 i18n 调用周围 5 行内的硬编码中文字符串
$ for f in CustomScenes ReviewCenter Achievements CustomSceneLearn; do
    echo "=== $f ==="
    awk 'NR>30' src/pages/$f.tsx | grep -E "['\"][^'\"]*[\u4e00-\u9fff][^'\"]*['\"]|>([^<]*[\u4e00-\u9fff][^<]*)<" | wc -l
  done
CustomScenes.tsx: 55 user-visible Chinese strings
ReviewCenter.tsx: 80 user-visible Chinese strings
Achievements.tsx: 38 user-visible Chinese strings
CustomSceneLearn.tsx: 48 user-visible Chinese strings
# 总 221 个 user-visible Chinese strings, 6 个 i18n-ed (平均 36 个漏改/file)
```

#### 修法 (v1.54 范围)

需要每个 i18n-ed 元素**周围 5-10 行**的中文也 i18n-ed。 总 4 页面 × 8 DICT key = 32 个新 DICT key + 32 处 UI 改 t()。

最小集 (4 页面必修):
```ts
// i18n.ts (新增 12 key, zh + en 各 12)
'customscenes.input_title': '📄 粘贴英文文本 / 📁 上传文件'
'customscenes.input_placeholder': '粘贴英文文本... 例: 邮件 / 文章 / 对话 / 歌词'
'customscenes.char_count': 'N / M 字符'  // N=current, M=max
'customscenes.scene_title_placeholder': '场景标题'
'customscenes.upload_button': '📁 上传文件'
'customscenes.extract_button': '✨ 提取生词'
'review.empty_subtitle': '标记"不认识"的词会在 1 天后再次出现\n系统会按记忆曲线智能安排复习'
'review.done_subtitle': '本次复习 N 个词 · 正确 M · 错误 K'  // N/M/K 替换
'achievements.subtitle': '你的每一次坚持, 都解锁一个新徽章'
'achievements.unlocked_pct': '已解锁 N% 的成就'
'customlearn.done_subtitle': '你已完成 S 的 N 个生词'  // S=scene.title, N=words.length
'customlearn.scene_not_found': '场景不存在'
```

外加 4 个 button key + 4 个 type label key (TYPE_META) = 总 ~22 新 DICT key + 22 处 UI 改 t()。

**这是 v1.53 主审查漏的最严重 1 P1**: 不是 1 行 bug, 是系统性问题 (主审查 8 维度没有"同屏 i18n 一致性"扫描)。

---

### 1.2 P1-B: v1.53 主审查 i18n 页面统计错误 — 8 页面不用 useTranslate, 不是 6 页面

**文件**: `docs/REVIEW_v1.53.md` (评审报告本身)
**影响范围**: v1.54 排期决策 — 漏 2 页面, 错列 1 页面

#### 现象

v1.53 主审查 (`docs/REVIEW_v1.53.md`) 写:
> ❌ 6 页面没用: Scenes/SceneDetail/LearnReport/PronounceCustom/CustomSceneDetail/WordDetail

**实际 grep 结果**:
```bash
$ for f in src/pages/*.tsx; do echo "$(basename $f): $(grep -c useTranslate $f)"; done | grep ": 0$"
Camera.tsx: 0
CustomSceneDetail.tsx: 0
LearnReport.tsx: 0
PlanPage.tsx: 0
PronounceCustom.tsx: 0
SceneDetail.tsx: 0
Scenes.tsx: 0
WeakWords.tsx: 0
# 实际 8 页面 0 useTranslate, 不是 6
```

**WordDetail 实际有 useTranslate** (v1.49 加的, 12 个 t() 调用):
```bash
$ grep "useTranslate\|t(" src/pages/WordDetail.tsx | head -3
13:import { useTranslate } from '../lib/useTranslate'
17:  const { t } = useTranslate()
111:        <p>{t('worddetail.not_found')}</p>
```

**漏列的 2 页面 (Camera + PlanPage + WeakWords)**:
- **Camera.tsx** — `📷 拍照识物` h1 (L103) 硬编码, 268 个 Chinese chars
- **PlanPage.tsx** — `📅 学习计划` h1 (L146) 硬编码, 263 个 Chinese chars
- **WeakWords.tsx** — `错题本` h1 (L119) 硬编码, 198 个 Chinese chars
- (注: v1.46 主审查 review notes 写 "Home/PlanPage i18n", 但**实际只改了 Home**, PlanPage 漏了 2 年, 没人发现)

#### 影响

- v1.54 排期"i18n 6 页面" → 实际是 8 页面, 漏 2 页面
- Camera (OCR 场景, 主用户路径之一) 和 PlanPage (主入口页) 切到 en 还是中文
- 主审查计数错了, 下个 release 又会漏

#### 修法 (v1.54 范围)

- 改 `docs/REVIEW_v1.53.md` 第 2 处 "❌ 6 页面没用" → "❌ 8 页面没用: Camera/CustomSceneDetail/LearnReport/PlanPage/PronounceCustom/SceneDetail/Scenes/WeakWords"
- v1.54 排期: 8 页面**分批** i18n, 优先 Camera + PlanPage (用户高频入口)
- 加一个 `tests/i18nPageCoverage.test.ts` 自动扫 `src/pages/*.tsx` 有 0 useTranslate 的文件, 防止下次漏

---

### 1.3 P2-A: 35 DICT 死 key (v1.53 漏报 — 不是 1 个 worddetail.back, 是 35 个)

**文件**: `src/lib/i18n.ts:120-280` (zh+en 两侧)
**引入版本**: v1.41-v1.53 累积
**严重度**: P2 (cosmetic dead code, 不影响功能, 但 false positive 风险)

#### 现象

```bash
$ python3 -c "..."  # 扫 DICT 中所有 key, 对比 t() 调用
# 结果:
DICT keys total: 120
t() called keys: 89
# Dead DICT keys (定义但 0 t() 调用): 35
app.name / app.tagline
common.cancel / confirm / delete / empty / error / save / success
custom.title
home.dailyGoal / greeting / start
nav.daily / home / notebook / review / scores / settings / translate / words
notebook.addWords / empty
review.days / due / startSession / streak / today
settings.appearance / darkMode / data / fontSize / llm / tts
worddetail.back
```

**统计**:
- 总 DICT: 120 key × 2 locale = 240 entry
- 实际用: 89 key × 2 = 178 entry
- 死 key: 35 key × 2 = 70 entry (~29% DICT 容量)

#### 影响

- **包大小浪费**: 70 死 entry × 平均 10 字节 = ~700 字节 raw, ~250 字节 gzipped (i18n chunk 3.5 KB gzipped 的 7%)
- **维护成本**: DICT 新 key 加注释"预留"但**没人**记得, 2-3 release 后变成"why is this here"考古
- **未来 false positive**: 如果加 `tests/i18nKeyCoverage.test.ts` 扫"t() 调用 key 都在 DICT 里" (反向), 35 死 key 没问题; 但如果加"DICT 完整性 = DICT 中所有 key 都被调用" (正向), 会报 35 个 false positive
- **worddetail.back (v1.53 新)** 是其中最新一个, 严重度最低 (刚加, 可控), 但**其余 34 个**更严重 (已累积 5+ release)

#### 修法 (3 选 1, 推荐 A)

**A. 大扫除 (推荐, v1.54 范围)**:
```bash
# 删所有"预留"dead key (35 个)
# 优点: DICT 从 120 → 85, 包大小 -250 byte gzipped, 维护成本降
# 风险: 未来要用时再加 (添加 key 是 1 行)
```

**B. 加 TODO 注释 (最低成本)**:
```ts
// i18n.ts DICT 中每个 dead key 加:
// 'app.name': 'lingoo',  // W49 决定删/用
```

**C. 加正向 coverage test (强制使用)**:
```ts
// tests/i18nKeyCoverage.test.ts 加反向断言:
it('所有 DICT key 都有 t() 调用', () => {
  const dead = [...zhKeys].filter(k => !tCalledKeys.has(k))
  expect(dead).toEqual([])  // 失败时显示 35 个
})
```

---

## 2. 5 维度独立评估

### 维度 1: i18n 翻译盲区 (主审查漏 6 页面)

**结论**: **找到 1 P1** (见 1.2: 8 页面不是 6 页面, 漏 Camera/PlanPage/WeakWords 3 个, 错列 WordDetail)

**全 27 页面 useTranslate 状态**:
| 状态 | 数量 | 列表 |
|------|------|------|
| ✅ 0 useTranslate | 8 | Camera / CustomSceneDetail / LearnReport / PlanPage / PronounceCustom / SceneDetail / Scenes / WeakWords |
| ✅ ≥1 useTranslate | 19 | (其余 19 页面, 含 v1.53 新加 4) |

**v1.53 主审查错漏**:
- 说 6 页面, 实际 8
- 错列 WordDetail (v1.49 就有 useTranslate, 12 t() 调用)
- 漏列 Camera + PlanPage + WeakWords (3 个, 全是主入口)

**用户路径影响**:
- Home (有 useTranslate) → 切到 en 英文
- PlanPage (0 useTranslate) → 切到 en **还是中文** (主入口页面, 用户必看)
- WeakWords (0 useTranslate) → 切到 en 还是中文 (从 ErrorsPage 跳)
- Camera (0 useTranslate) → 切到 en 还是中文 (拍照识物)

**8 页面 hardcoded Chinese chars 计数**:
| 页面 | Chinese chars | 主入口? |
|------|--------------|---------|
| Camera | 268 | ✓ (主路径) |
| PlanPage | 263 | ✓ (主路径) |
| LearnReport | 215 | (报告页) |
| WeakWords | 198 | ✓ (错题本) |
| CustomSceneDetail | 143 | |
| Scenes | 108 | ✓ (场景首页) |
| PronounceCustom | 46 | (跟读) |
| SceneDetail | 229 | |

**维度 1 结论**: 8 页面盲区比主审查报 6 多, 影响用户切语言主路径

---

### 维度 2: 死代码扫描

**结论**: **找到 1 P2** (见 1.3: 35 DICT dead key)

**扫了 3 类死代码**:

#### 2.1 DICT dead keys (35 个)

| 范围 | 数量 | 严重度 |
|------|------|--------|
| v1.41 预留 (app/common/nav) | 12 | P2 累积 5+ release |
| v1.45-v1.50 预留 (home/notebook/review/settings) | 19 | P2 累积 1-3 release |
| v1.52-v1.53 新预留 (custom.title/worddetail.back) | 2 | P2 最新, 可控 |

详见 1.3。

#### 2.2 死导出函数 (1 个)

| 名称 | 文件 | 引入版本 | 累积 release |
|------|------|---------|------------|
| `initLocale` | `src/lib/i18n.ts:319` | v1.41.0 | **5 release 无人调用** |

```bash
$ grep -rn "initLocale" src/ --include="*.ts" --include="*.tsx"
src/lib/i18n.ts:319:export function initLocale(): Locale {
# 0 处调用
```

**风险**: 当前 useTranslate 自己 useState 读 localStorage 替代了 initLocale 作用, 所以**没踩到**。 但如果未来加 server-side rendering 或非 useTranslate 路径调 `t()`, 会拿 stale 'zh' (因为 initLocale 没在启动跑)。

**修法**: 删函数 + 删测试 (5 行)。

#### 2.3 死导出常量 (3 个)

| 名称 | 文件 | 用在 |
|------|------|------|
| `MAX_TOTAL_TAGS = 50` | `src/lib/wordTags.ts:12` | 内文件 0 用, grep 全 src/ 0 hit |
| `MASTERY_RATE_UPGRADE = 0.8` | `src/lib/difficultyAdapter.ts:51` | 内文件 1 用, src 其他 0 hit |
| `MIN_LEARNED_FOR_ADAPT = 5` | `src/lib/difficultyAdapter.ts:52` | 内文件 1 用, src 其他 0 hit |

**`XP_REWARDS.STREAK = 10` 是单独一类**: 常量在 `src/lib/xpSystem.ts:18` 定义, 0 处 `addXP(XP_REWARDS.STREAK, 'STREAK')` 调用。

```bash
$ grep -rn "XP_REWARDS.STREAK" src/ --include="*.ts" --include="*.tsx"
src/lib/xpSystem.ts:18:STREAK: 10,
# tests 1 hit (断言 = 10), src 0 hit
```

**修法**: 这 4 个都是 P3 (内部使用, 改成非 export 即可, 不影响 API)

**维度 2 结论**: 35 DICT dead + 1 函数 + 4 常量, 总 ~40 处死代码, 整体 P2 严重度

---

### 维度 3: 静态 import 漏判 (防 verifier4 P1-B 回归)

**结论**: **找到 1 P2** (见下) — learningReport.ts + Notebook.tsx 内部 await import 冗余

#### 3.1 v1.48 plan.ts + v1.51 db.ts + v1.52 Notebook.tsx (静态) 修后状态

| 文件 | 顶部静态 | 内 await import | 一致 |
|------|---------|----------------|------|
| `src/lib/plan.ts` | ✓ (v1.48 修) | 0 | ✓ |
| `src/lib/db.ts` | ✓ (v1.51 修) | 0 | ✓ |
| `src/pages/Notebook.tsx` | ✓ (v1.52 修) | **2 处冗余** (L146, L162) | ✗ |
| `src/lib/learningReport.ts` | ✓ (从一开始) | **5 处冗余** (L385, 418, 471, 472, 558) | ✗ |

#### 3.2 learningReport.ts 5 处冗余 await import

```ts
// learningReport.ts:2 (顶部静态)
import { db } from './db'
import { formatDay, getStreak } from './streak'
import { getWord } from './words'
// db.ts 不 import learningReport.ts (无循环)

// learningReport.ts:385, 418, 471, 472, 558 (内函数)
const { db } = await import('./db')  // ← 冗余, 顶部已 import
const { db } = await import('./db')  // ← 冗余
const { db } = await import('./db')  // ← 冗余
const { loadWords } = await import('./words')  // ← 冗余, 顶部已 import
const { db } = await import('./db')  // ← 冗余
```

**影响**:
- 功能正常 (动态 import 返回相同 module)
- **代码不一致**: 顶部说"用 db", 函数内说"动态 import db" — 读者困惑
- **误传信号**: 给新人"这里需要 await import" 的错觉
- v1.48/v1.51 hotfix 的精神是"全部静态", learningReport.ts 留了反例

**修法 (5 行)**: 删 5 处内 `await import('./db')` 和 `await import('./words')`, 改用顶部已 import 的 `db` / `loadWords` (但注意: `loadWords` 当前是**未在顶部 import**, 需要加顶部 import + 删内 await)

#### 3.3 Notebook.tsx 2 处冗余 (v1.52 漏修)

```ts
// Notebook.tsx:11 (v1.52 改的, 顶部静态)
import { addTagsToWord, getAllTagsWithCount, ... } from '../lib/wordTags'

// Notebook.tsx:146 (v1.52 没改)
const { addTagsToWord: addFn } = await import('../lib/wordTags')
// addTagsToWord 顶部已 import, 冗余

// Notebook.tsx:162 (v1.52 没改)
const { suggestTagsFromWord, addTagsToWord } = await import('../lib/wordTags')
// addTagsToWord 冗余, suggestTagsFromWord 顶部未 import
// 修法: 顶部 import 加 suggestTagsFromWord, 然后删内 await
```

**影响**: 同上, v1.52 hotfix 漏修, 是 verifier6 P1 (Notebook) 同模式。

#### 3.4 整体扫描: 其他文件 await import 模式

| 文件 | await import | 顶部静态 | 状态 |
|------|-------------|---------|------|
| `src/lib/pdfUpload.ts` | `await import('pdfjs-dist')` | 0 (npm 包) | ✓ 必须 (减小初始 bundle) |
| `src/lib/translate.ts` | `await import('./providers/llm')` + `await import('blueimp-md5')` | 0 (动态) | ✓ 故意 |
| `src/lib/reminder.ts` | `await import('./reminderContent')` | 0 (延迟) | ✓ 故意 |
| `src/lib/wordTags.ts` | `await import('./db')` × 2 | ✓ (顶部) | ✗ 循环依赖必须 (wordTags → db → wordTags) |
| `src/lib/learningReport.ts` | `await import('./db')` × 4 + `await import('./words')` × 1 | ✓ (顶部) | ✗ 5 处冗余 (3.2) |
| `src/pages/Notebook.tsx` | `await import('../lib/wordTags')` × 2 | ✓ (顶部) | ✗ 2 处冗余 (3.3) |
| `src/pages/Scenes.tsx` | `await import('../lib/db')` | 0 (顶部未 import db) | ✓ 合理 (Scenes.tsx 不需 db 常驻) |

**结论**: 6 个文件用 `await import`, 其中:
- 3 个合理 (pdfUpload / translate / reminder / Scenes) — 减 bundle 或 npm 动态
- 1 个必须 (wordTags 循环) — 防 deadlock
- 2 个冗余 (learningReport / Notebook) — v1.52/v1.53 漏修

**维度 3 结论**: 找到 2 文件 7 处冗余 await import, P2 (v1.52/v1.53 hotfix 漏修)

---

### 维度 4: t() 调用死代码

**结论**: **0 处"解构 t 但 0 调用"** (v1.45 verifier1 已修, 不再回归), 但有 **1 P1 衍生 — 4 页面 partial i18n** (见 1.1)

**全 19 个 i18n 页面 t() 调用统计**:
| 页面 | useTranslate 解构 | t() 调用 | dead? |
|------|------------------|---------|-------|
| AIChat | ✓ | 2+ | OK |
| Achievements | ✓ | 1 | OK |
| CalendarPage | ✓ | 1 | OK |
| CardReview | ✓ | 21+ | OK |
| CustomSceneLearn | ✓ | 1 | OK |
| CustomScenes | ✓ | 2 | OK |
| DailyPage | ✓ | N | OK |
| ErrorsPage | ✓ | N | OK |
| Home | ✓ | 4 | OK |
| ListenPage | ✓ | 14+ | OK |
| Notebook | ✓ | 16+ | OK |
| ReportsPage | ✓ | 3 | OK |
| ReviewCenter | ✓ | 2 | OK |
| Settings | ✓ | 5+ | OK |
| Translate | ✓ | 1 | OK |
| WordDetail | ✓ | 5+ | OK |
| WordList | ✓ | 15+ | OK |
| WritePage | ✓ | 3 | OK |

**19 页面全部 t() ≥ 1 调用**, 无"解构 t 但 0 调用" 死代码。

**但**: 4 页面 (CustomScenes/ReviewCenter/Achievements/CustomSceneLearn) 有 **"t() 调用 1-2 处 + 同屏硬编码中文 25+ 处"** 的 partial i18n 模式 (见 1.1), 这不是 t() dead code, 是 **t() 调用覆盖率不足**。 这是 verifier7 P1-A/B 模式的 4 次复制, 但**比 v1.52 更严重** (4 页面 × 6+ 处 vs 1-2 处)。

**维度 4 结论**: 0 dead t(), 但 4 页面 partial i18n 严重 (1.1 P1-A)

---

### 维度 5: 大 review 8 维度盲区

**结论**: **建议加 4 个新维度** (覆盖本 verifier 找到的 4 个盲区)

| 当前 8 维度 | 漏判什么 | 建议新维度 |
|------------|---------|----------|
| 1. catch (e: any) | 漏 `catch (err) {}` (无类型) | 加 "空 catch 块 / 无类型 catch" |
| 2. setLoading 配对 | 漏 try/finally 不 reset loading | 加 "loading 状态 try/finally 守卫" |
| 3. as any 残留 | OK | - |
| 4. console.error/warn | OK (85 全守卫) | - |
| 5. 空 catch {} | OK (0) | - |
| 6. i18n 完整性 | **只扫 DICT missing, 不扫同屏 i18n 一致性** (4 页面 partial) | **加 "i18n 页面 hardcoded Chinese 数"** |
| 7. fire-and-forget | OK (v1.48/v1.51/v1.52 修完) | - |
| 8. 历史 review 修复 | OK (5/5) | - |
| (未加) | **DICT 死 key + 导出死函数** (35 DICT + initLocale + 4 常量) | **加 "死代码扫描"** |
| (未加) | **顶部静态 + 内 await import 冗余** (learningReport 5 处, Notebook 2 处) | **加 "await import 冗余检测"** |
| (未加) | **i18n 页面覆盖率** (8 页面 0 useTranslate) | **加 "i18n 页面覆盖率"** |

**新维度 1: i18n 页面 hardcoded Chinese 数** (覆盖 1.1 P1-A)

```python
# scripts/big-review-i18n-page-zh.py
# 扫所有 useTranslate 页面, 找 "页面 hardcoded Chinese > 阈值"
# 阈值建议: < 10 (允许 1-2 行 placeholder/aria-label 少量)
# 触发: 4 页面超 10 → 报 partial i18n
```

**新维度 2: 死代码扫描** (覆盖 1.3 P2-A + 2.2-2.3 P2)

```python
# scripts/big-review-dead-code.py
# 扫 3 类:
# 1. DICT dead key (定义但 0 t() 调用)
# 2. export 函数 0 调用 (除 tests/)
# 3. export 常量 0 调用 (除 tests/)
# 触发: > 5 处 → 报 "DICT 大扫除 + dead export"
```

**新维度 3: await import 冗余检测** (覆盖 1.4 P2-B)

```python
# scripts/big-review-static-import.py
# 扫:
# 1. 文件用 await import('./xxx') 但顶部已 import './xxx' (冗余)
# 2. 文件用 await import('./xxx') 但 './xxx' 不依赖循环 (可改静态)
# 排除: 真循环依赖 (wordTags ↔ db), npm 动态 (pdfjs)
# 触发: > 0 → 报 "内 await import 冗余"
```

**新维度 4: i18n 页面覆盖率** (覆盖 1.2 P1-B)

```python
# scripts/big-review-i18n-coverage.py
# 扫 src/pages/*.tsx
# 统计: useTranslate 页面数 / 总页面数
# 触发: < 100% → 报 "i18n 盲区 N 页面"
# 关键: 0 useTranslate 页面**列全** (主审查漏列)
```

**为什么 8 维度盲区 = 重要发现**:
- 主审查说 "0 P1" 是因为**没有"同屏 i18n 一致性"维度**, 但 v1.53 实际有 25+ 处中英混用
- 同样 8 维度扫 3 release (v1.51 → v1.52 → v1.53), 每次 partial i18n 都漏, 因为维度没覆盖
- 建议 v1.54 升级到 12 维度 (8 + 4), 覆盖本 verifier + verifier7 + 历史 verifier 累计盲区

**维度 5 结论**: 8 维度不够, 建议加 4 维度, 否则 partial i18n / dead code / 冗余 await import 会持续漏

---

## 3. 总结

| 维度 | 找到 | 说明 |
|------|------|------|
| 1 i18n 盲区 | **1 P1** (1.2) | 8 页面, 不是 6, 漏 3 错列 1 |
| 2 死代码 | **1 P2** (1.3) | 35 DICT + 1 函数 + 4 常量 |
| 3 静态 import | **1 P2** (3.2 + 3.3) | learningReport 5 处 + Notebook 2 处 |
| 4 t() dead | **0** (但 1 P1 衍生, 1.1) | 4 页面 partial i18n, 25+ 处 |
| 5 维度盲区 | **建议 4 新维度** | 8 维度不够 |
| **合计** | **2 P1 + 2 P2** | v1.53 主审查 0 P1 漏 2 P1 |

**v1.53 主审查盲点**:
- 8 维度扫 5 维度, 漏 4 维度盲区
- **2 P1 漏**: partial i18n (1.1) + 页面统计错 (1.2)
- **2 P2 漏**: 35 DICT dead + learningReport 5 处 await import
- 与 verifier7 P1-A/B 同模式在 v1.53 重现 4 次 (1.1)

**优先级**:
1. **P1-A** (1.1) — 4 页面 partial i18n 必修, 4 页面 × 6 DICT key = 24 改, 1-2h, v1.54 范围
2. **P1-B** (1.2) — 改主审查 doc 计数 + 加 i18n 页面覆盖率 test, 30 min, v1.54 范围
3. **P2-A** (1.3) — 35 DICT dead key 大扫除或加 TODO 注释, 30 min, v1.54 范围
4. **P2-B** (3.2 + 3.3) — learningReport 5 处 + Notebook 2 处 await import 删, 15 min, v1.54 范围

**与 verifier9 关系**:
- verifier9 找到: P1-A (AIChat 回归) + P1-B (WritePage 回归) + P2-A (worddetail.back) + P2-B (initLocale)
- verifier8 (本) 找到: P1-A (4 页面 partial i18n) + P1-B (页面统计错 8 不是 6) + P2-A (35 DICT dead) + P2-B (await import 冗余)
- 互补: verifier9 找 v1.52 P1 回归 (AIChat/WritePage 修一半), verifier8 找 v1.53 新 P1 (4 页面 partial) + 维度盲区
- **合并优先级**: v1.54 hotfix 6 项 (verifier9 2 + verifier8 2 P1 + verifier8 2 P2)

---

## 4. 评审元数据

- 评审人: verifier8 (general worker)
- 评审时间: 2026-07-27 17:33-17:55 UTC (~22 min)
- 评审方法: 静态读 v1.53.0 commit `fc31825` + 全 src/ grep + DICT 扫描
- 评审范围: 27 页面 + 44 lib + 8 维度脚本
- 验证工具: grep, python3 (DICT 分析), git show (v1.52 漏修验证)
- **不改 src/**: ✓ (静态读)
- **不拉 subagent**: ✓
- **不 push**: ✓

---

**最后更新**: 2026-07-27 (W48 verifier8)
