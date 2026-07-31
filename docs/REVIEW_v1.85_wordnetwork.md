# Verifier E 报告 — v1.85.0 触类旁通 (Word Network) 深度 review

**审查员**: verifier E (独立对抗性审查)
**日期**: 2026-07-31
**范围**: `/workspace/english-app` HEAD = `v1.85.0` (commit `a555cae`)
**方法**: 独立代码阅读 + 9 维度全扫 + 数据抽样验证 + 算法规格实验. **不信任 producer 总结**.

---

## §0 任务背景

- 任务对象: 触类旁通 (Word Network) 模块, 即 v1.85-A
- 涉及文件:
  - `src/lib/wordNetwork.ts` (282 行) — 4 个 get 函数 + 缓存 + 入口
  - `src/components/WordNetwork.tsx` (192 行) — 4 tab 卡片网格 + 跳转
  - `src/data/synonyms.ts` (801 行) — 146 主词 × 3 同义词 (声称 100 词 50 组, **实际 146**)
  - `src/data/antonyms.ts` (465 行) — 78 主词 (声称 60 组, **实际 78**)
  - `src/pages/WordDetail.tsx` (集成, 仅 +4 行)
  - `tests/wordNetwork.test.ts` (466 行) — 47 测试 (全过)
- 实际 git HEAD: `a555cae v1.85.0: 3 大新功能 (触类旁通 + 课文 + 填空, 87 测试)`
- 未提交修改: 0
- 真实词库: 5,423 词 (`public/data/words.json`, 5,182 有 root, 5,129 有 phrase)

---

## §1 总览: P0 + P1 + P2

| 等级 | 数量 | 关键问题 |
|------|------|---------|
| **P0** (致命逻辑 / 静默错数据) | **1** | 反义词双向查 (46/124 词) 返自身, UI 静默错误 |
| **P1** (setLoading 缺 finally / 重大 UX) | **4** | setLoading 无 finally + 跳词 ?q= 不被 WordList 读 + 同根 tab 30/146 空白 + 117/389 同义词不在 words.json |
| **P2** (i18n 缺失 / 多词同义 / 死重复) | **6+** | i18n 0 翻译键 + 'sleepy' 重复 drowsy + 多词同义 (11 处) + 文档/数据数量不符 + stale data 闪现 + polysemy 未注明 |

**测试覆盖率**: 47/47 PASS ✓ — 但 **P0 bug 未被任何测试覆盖** (test 只用主词作输入, 漏了反查路径)

---

## §2 P0 (致命): 1 处

### 2.1 反义词双向查 (reverse-lookup) 静默返回错误值 — 影响 46/124 词

**位置**: `src/lib/wordNetwork.ts:189-205` (`getRelatedAntonym`)

**BUG 描述**: 当输入词是某反义对中的"反义值" (而非主词) 时, 函数返回**输入词自身**而非对应主词.

**根本原因**:
```ts
let pair = ANTONYM_PAIRS[target]
if (!pair) {
  const reverseWord = ANTONYM_REVERSE[target]
  if (reverseWord) {
    pair = ANTONYM_PAIRS[reverseWord]  // ← BUG: 取了反向的主词 pair
  }
}
const result = pair ? [pair.antonym] : []  // ← 但返回的是主词对的 antonym 字段, 即原始输入
```

**复现路径**:

| 输入 | 期望 | 实际 (BUG) | 现状 |
|------|------|-----------|------|
| `'after'` | `['before']` | `['after']` | **返回自身** |
| `'below'` | `['above']` | `['below']` | **返回自身** |
| `'cheap'` | `['expensive']` | `['cheap']` | **返回自身** |
| `'dangerous'` | `['safe']` | `['dangerous']` | **返回自身** |
| `'dead'` | `['alive']` | `['dead']` | **返回自身** |
| `'question'` | `['ask']` | `['question']` | **返回自身** |
| `'sad'` | `['happy']` | `['sad']` | **返回自身** |
| `'cold'` (主词也是主词) | `['hot']` | `['hot']` | ✓ 正确 (因 cold 也是主词, 走第 1 路径) |

**数据实证**:
- `ANTONYM_PAIRS` 中 78 个主词
- 其中反义值"也作为主词"的有 32 个 (双向定义, 如 hot↔cold)
- 纯反义值 (即只作 B 不作 A) 的有 **46 个**, 这 46 个全部 BUG
- 命中率: 46/124 (37%) 反义词/值组合出错

**测试盲点**:
- `tests/wordNetwork.test.ts:281-283` "双向反查" 测试只验证 `'cold' → 'hot'` (cold 本身是主词, 走第 1 路径, **不触发 reverse 路径**)
- 现有测试 100% 不会触发 BUG 路径

**修复建议** (具体可落地):
```ts
export async function getRelatedAntonym(word: string): Promise<string[]> {
  const cached = getCached('antonym', word)
  if (cached) return cached
  const target = norm(word)
  // 1. 直接查 (主词 → 反义词)
  const direct = ANTONYM_PAIRS[target]
  if (direct) {
    const result = [direct.antonym]
    setCached('antonym', word, result)
    return result
  }
  // 2. 反向查 (反义词 → 主词): 输入是"反义值"时
  const reverseWord = ANTONYM_REVERSE[target]
  if (reverseWord) {
    const result = [reverseWord]  // ← FIX: 返主词本身 (它就是输入的反义)
    setCached('antonym', word, result)
    return result
  }
  setCached('antonym', word, [])
  return []
}
```

**回归测试** (需补):
```ts
it('P0 修复: 输入反义值 (after) 应返主词 (before)', async () => {
  expect(await getRelatedAntonym('after')).toEqual(['before'])
  expect(await getRelatedAntonym('cheap')).toEqual(['expensive'])
  expect(await getRelatedAntonym('dangerous')).toEqual(['safe'])
  expect(await getRelatedAntonym('question')).toEqual(['ask'])
  expect(await getRelatedAntonym('sad')).toEqual(['happy'])
})
```

---

## §3 P1 (重要): 4 处

### 3.1 setLoading(true) 缺 setLoading(false) finally — 历史问题未根治

**位置**: `src/components/WordNetwork.tsx:89-105` (`useEffect` 加载逻辑)

**问题**:
```ts
useEffect(() => {
  if (!word) return
  let cancelled = false
  setLoading(true)                                       // L92
  Promise.all([...]).then(([root, synonym, antonym, collocation]) => {
    if (cancelled) return
    setData(...)
    setLoadedTabs(...)
    setLoading(false)                                    // L102 — 仅在 .then 内
  })
  // ← 无 .catch, 无 finally
  return () => { cancelled = true }
}, [word])
```

**触发场景**:
- `loadWords()` 网络/解析失败 → Promise.all reject
- 整个 `.then` 跳过 → `setLoading(false)` 永远不调用
- UI 永远显示 "⏳ 加载中..." — 需刷新页面

**对照 v1.80 verifier 报告**: `docs/REVIEW_v1.80_verifierA.md:64-99` 已列出 11 处同类 P1. **本组件 (新增) 重蹈覆辙**.

**修复**:
```ts
Promise.all([...])
  .then(([root, synonym, antonym, collocation]) => {
    if (cancelled) return
    setData(...)
    setLoadedTabs(...)
  })
  .catch((e) => {
    if (cancelled) return
    console.error('[WordNetwork] load failed:', e)
    // 可选: toast.error('加载失败, 请重试')
  })
  .finally(() => {
    if (!cancelled) setLoading(false)
  })
```

### 3.2 点词跳 `/words?q=` 不被 WordList 接收 — 静默走回首页

**位置**: `src/components/WordNetwork.tsx:108-116` (`handlePick`)

```ts
const handlePick = useCallback(async (target: string) => {
  const w = await findWordByName(target)
  if (w) {
    navigate(`/words/${w.id}`)                              // 找到 → 详情页
  } else {
    navigate(`/words?q=${encodeURIComponent(target)}`)     // 未找到 → 搜索 (?)
  }
}, [navigate])
```

**问题**: `WordList.tsx` **不读 URL `?q=` 参数** (已 grep 验证, 0 处 `useSearchParams`/`searchParams`/`URLSearchParams`).

```ts
// src/pages/WordList.tsx:21
const [query, setQuery] = useState('')   // 内部 state, 不从 URL 初始化
// src/pages/WordList.tsx:69-82  useMemo
if (debouncedQuery.trim()) {
  const q = debouncedQuery.toLowerCase()
  result = result.filter(...)
}
```

**结果**: 用户点 117 个不在 words.json 的同义词 (如 notorious, perilous, languid) → URL 跳到 `/words?q=notorious` → **进入词库页, 但搜索框是空的, 显示全部 5,423 词**. 用户需要手动重新搜索.

**影响范围**:
- 117/389 (30%) 同义词值不在 words.json
- 1/124 (0.8%) 反义词 (cowardice) 同样
- 多词同义 (11 处: 'give up' 等) 全部不在

**修复** (二选一):
1. **首选**: `WordList.tsx` 改用 `useSearchParams`, mount 时用 URL `q` 初始化 query state
2. **次选**: 去掉 `?q=` fallback, 改为 `toast.warn('该词不在词库中: ${target}')` 或类似提示

### 3.3 同根 tab 30/146 主词 (21%) 永远空白

**位置**: 算法 `findRelatedByRoot` (`src/lib/wordNetwork.ts:80-101`) + words.json 根数据

**数据实证** (用真实 words.json 跑算法):
- 146 个同义主词中, **30 个在 words.json 没有共享任何根**:
  ```
  ['brave', 'build', 'calm', 'cheat', 'dark', 'exhausted', 'fast', 'fault',
   'fight', 'fresh', 'get', 'glad', 'good', 'great', 'grow', 'hard', 'help',
   'hot', 'huge', 'idea', 'kill', 'kind', 'know', 'laugh', 'look', 'make',
   'old', 'push', 'scared', 'true']
  ```
- 原因: words.json 中这些词**完全没有 root 字段** 或 root 是过于细分的 (-e, -y 等)

**用户表现**:
- 进入 happy 详情 → 切到 "同根" tab → 显示 "暂无相关词"
- 进入 big 详情 → 切到 "同根" tab → 显示 23 个词 (含 bible, bicycle, bid, bike, bill...) **这些都是 big 共享 'bi-' 前缀, 但 big 实际是词根, 不是前缀词**

**测试假象**: 测试用 mock 数据, 每个词都精心分配了共享 root. **真实数据中 happy 没有任何根, 实际返回 []**.

### 3.4 117/389 同义词值不在 words.json — 30% 点击落空

**数据实证**:
- 146 主词 × 3 同义词 = 438 项, 去重后 **389 个唯一同义词值**
- 其中 **117 个 (30%) 不在 words.json**:
  ```
  高级词:  perilous, opulent, languid, valiant, tumultuous, scintillating...
  常见词:  comfy, sizable, beat (动词), allow (允许)... 等
  ```

**触发链**: 用户点 "notorious" → `findWordByName` undefined → 走 `?q=` fallback → 3.2 节问题

**修复**: 建议数据驱动 — 在 `src/data/synonyms.ts` 增补 117 词 (或接受 30% 折损 + UI 标注 "外部词").

---

## §4 P2 (次要): 6+ 处

### 4.1 i18n 完整性: 0 个 i18n 键 (与项目其他模块不一致)

`WordNetwork.tsx` 所有 UI 文本硬编码中文:
- "同根" "近义" "反义" "搭配" (L30-33, TABS 数组)
- "暂无相关词" (L175)
- "加载中..." (L179)
- "⏳ 加载中..." (L157)
- "共 X 个" (L184)
- "暂无相关词" (L51)
- "跳转到 ${w}" (title, L66)

`grep useTranslate / useTranslation` 命中 0 处.

**对比**:
- `WordDetail.tsx` 用了 `t('worddetail.ask_known')`, `t('worddetail.known')` 等
- `i18n.ts:11` 已建 zh 字典, 留有 293+ 行空间

**P2 但应修**: 项目有 i18n 基础设施, 此模块未接入 = 英文模式用户看到的还是中文.

**修复**: 加 8 个键 (`wordnetwork.tab.root`, `wordnetwork.tab.synonym`, ..., `wordnetwork.empty`, `wordnetwork.loading`).

### 4.2 'sleepy' 词组含重复项

**位置**: `src/data/synonyms.ts:638-642`
```ts
'sleepy': {
  word: 'sleepy',
  synonyms: ['drowsy', 'drowsy', 'somnolent'],   // ← 'drowsy' 重复
  note: '困倦的; drowsy 偏半睡半醒',
},
```

**用户表现**: 点击 sleepy → "近义" tab → 看到 ['drowsy', 'drowsy', 'somnolent'] (前两个 chip 一样). 视觉冗余, 不致命.

**测试盲点**: `tests/wordNetwork.test.ts:250-259` 只检查 `s.length > 0` 和 `s !== word`, **不检查去重**.

**修复**: 改为 `['drowsy', 'somnolent', 'dozy']` 或类似.

### 4.3 11 处多词同义 (动词短语混入单动词)

**位置**: `src/data/synonyms.ts` 全文 grep
```
'give up' (abandon)
'look up to' (admire)
'show up' (appear)
'opt for' (choose)
'think about' (consider)
'go in' (enter)
'come in' (enter)
'worn out' (exhausted)
'long for' (wish)
'be anxious' (worry)
'be concerned' (worry)
```

**问题**:
- UI 中 chip 宽度差异大 (单词 vs 短语)
- 多词短语点跳后, `encodeURIComponent` 生成 `give%20up` → `/words?q=give%20up` → 同样走 §3.2 失效路径
- findWordByName 找不到 `give up` (单 token 查)

**修复**: 二选一
1. 数据侧: 改用单动词 (e.g., 'give up' → 'quit', 'look up to' → 'respect')
2. UI 侧: 多词用 `flex-wrap` 长 chip + 不同样式区分

### 4.4 文件头注释与实际数据量不符 (文档/数据脱节)

| 文件 | 注释声称 | 实际 | 差距 |
|------|---------|------|------|
| `synonyms.ts:4-5` | "100 词 (50 组, 每组 1 个主词 + 2-4 个同义词)" | 146 主词 × 3 同义 | **+46%** |
| `antonyms.ts:4` | "60 组常见高频反义对" | 78 主词 | **+30%** |

**修复**: 注释改 "146 词" / "78 对".

### 4.5 切换词时旧数据闪现 (loadedTabs 不重置)

**位置**: `src/components/WordNetwork.tsx:85-105`

**问题**:
- `loadedTabs` state 不会在 word 变化时重置
- 用户从 `/words/w-happy` 跳到 `/words/w-big` (通过 `navigate('/words/${w.id}')`)
- WordNetwork 组件**未设置 key**, 不重 mount
- `useEffect([word])` 重跑 → `setLoading(true)` → 新数据到达前
- `loadedTabs` 仍是上次 4 个全 true
- `loadedTabs.has(tab.key)` → true → 显示上次的数据 + "暂无相关词" body 不出现
- 头部 ⏳ 加载中... 显示
- 体感: **旧词的相关词闪现 50-200ms, 体验不专业**

**修复**: `setLoadedTabs(new Set())` 在 `useEffect` 起始 (`if (!word) return` 之前).

### 4.6 polysemy 词未注明 (light/dark, hard/soft, answer/question)

**例子**:
- `light` 反义 `dark`: light 还有 "轻" 的反义是 heavy, "淡" 的反义是 dark
- `hard` 反义 `soft`: hard 还有 "困难" 的反义是 easy
- `answer` 反义 `question`: 应是 `ask`, 不是 `question` (它们是互补非反义)
- `famous` 同义 `notorious`: notorious 是 "臭名昭著", 标了 note 但仍属误导
- `strong` 同义 `powerful`: powerful 偏 "有权力/有影响", 物理力量上更对位是 sturdy/robust
- `cool` 同义 `crisp`: crisp 偏 "清新/爽脆", 冷凉 sense 只占小部分

**修复**: note 字段已部分处理, 但应**明确指出主 sense**, 如 "cold (凉) ↔ hot (热)".

---

## §5 9 维度静态扫描结果

| 维度 | 结果 | 证据 |
|------|------|------|
| 1. `catch (e: any)` | **0 处** ✓ | grep 0 命中 |
| 2. 空 catch | **0 处** ✓ | grep 0 命中 |
| 3. fire-and-forget (无 .catch promise) | **1 处** ⚠ | `WordNetwork.tsx:93-103` Promise.all 无 .catch (见 §3.1) |
| 4. setLoading 缺 finally | **1 处** ⚠ | `WordNetwork.tsx:92,102` (见 §3.1) |
| 5. `as any` / `@ts-ignore` | **0 处** ✓ | grep 0 命中 |
| 6. console 残留 | **0 处** ✓ | grep 0 命中 |
| 7. i18n 完整性 | **缺** ⚠ | WordNetwork 0 个 i18n 键 (见 §4.1) |
| 8. 死代码 | **0 处** ✓ | 4 get 函数全在 WordNetwork.tsx 用到, exports 全用 |
| 9. 历史修复回归 | **未触发** ✓ | 之前的 setLoading 11 处, 本组件是**新增**而不是回归 |

**附加检查**:
- `console.log/console.error` 残留: 0 ✓
- `void import()` fire-and-forget: 0 ✓
- `@ts-ignore/@ts-expect-error`: 0 ✓
- `as any` 业务: 0 ✓
- 死 import: 0 ✓

---

## §6 数据真实性深度验证 (核心要求)

### 6.1 synonyms.ts 抽样 20 词 — 14/20 PASS, 6/20 弱配对 (无明确错)

| # | 词 | 同义 | 评估 |
|---|----|------|------|
| 1 | necessary | essential / required / vital | ✓ |
| 2 | expensive | costly / pricey / dear | ✓ (dear 英式) |
| 3 | true | correct / accurate / genuine | ⚠ true 多义; 此组覆盖 correct 和 genuine 两 sense, 但与 right 组高度重合 |
| 4 | look | gaze / glance / stare | ✓ |
| 5 | laugh | chuckle / giggle / snicker | ✓ |
| 6 | clean | pure / spotless / immaculate | ⚠ **PURE 不是 clean 的同义**: pure 是 "纯净/无杂质/道德纯洁", clean 是 "无尘/干净". sense 不同. 牵强配对 |
| 7 | worry | fret / be anxious / be concerned | ⚠ **混合形式**: 单动词 + 动词短语. UI 表现不一 (§4.3) |
| 8 | decrease | reduce / diminish / lessen | ✓ |
| 9 | peaceful | calm / tranquil / serene | ✓ |
| 10 | hard | difficult / tough / arduous | ✓ |
| 11 | advise | recommend / suggest / counsel | ✓ |
| 12 | strong | powerful / sturdy / robust | ⚠ **POWERFUL 偏 "有权力/有影响"**: 与 strong 物理力量 sense 部分重叠但非纯同义. 牵强 |
| 13 | grow | develop / expand / increase | ✓ |
| 14 | intelligent | smart / clever / brilliant | ✓ |
| 15 | complete | finish / accomplish / conclude | ⚠ **COMPLETE 偏 "完成"**: accomplish 偏 "达成/实现", 不同 sense. 牵强 |
| 16 | tired | exhausted / weary / fatigued | ✓ |
| 17 | important | significant / crucial / vital | ✓ |
| 18 | enormous | huge / immense / colossal | ✓ |
| 19 | remember | recall / recollect / **reminisce** | ⚠ **REMINISCE 是 "追忆/缅怀"**, 偏享受性回忆, 与 remember 的中性 sense 不同. 牵强 |
| 20 | nice | pleasant / lovely / kind | ✓ |

**数据准确率**: 14/20 完全通过 (70%), 6/20 弱配对 (30%, sense 不完全对齐, 标了 note 但仍属误导)

**额外发现** (与抽样无关):
- 头注释声称 "100 词" 实际 146 (+46%)
- 'famous' 同义包含 'notorious' (臭名昭著), note 标了但属误导
- 'cool' 同义包含 'crisp' (清爽), 牵强
- 'large' 同义包含 'great' (古用法, 现代不常说)
- 'worry' 混合了动词 + 动词短语 (§4.3)

### 6.2 antonyms.ts 抽样 20 对 — 17/20 PASS, 3/20 多义未注 + 1/20 配对不一致

| # | 主词 | 反义 | 评估 |
|---|------|------|------|
| 1 | answer | question | ⚠ **配对不一致**: 同数据集中 'ask↔answer' 已存在; 'answer↔question' 是互补非反义. **INCONSISTENT** |
| 2 | strong | weak | ✓ |
| 3 | up | down | ✓ |
| 4 | old | young | ✓ |
| 5 | above | below | ✓ |
| 6 | fat | thin | ✓ |
| 7 | forget | remember | ✓ |
| 8 | right | wrong | ✓ |
| 9 | hate | love | ✓ |
| 10 | dry | wet | ✓ |
| 11 | before | after | ✓ |
| 12 | cold | hot | ✓ |
| 13 | always | never | ✓ |
| 14 | rich | poor | ✓ |
| 15 | light | dark | ⚠ **LIGHT 多义**: light 还有 "轻" (↔heavy), "淡" (↔dark) — 当前是亮度 sense, 但应在 note 注明 |
| 16 | arrive | depart | ✓ |
| 17 | alive | dead | ✓ |
| 18 | active | passive | ✓ |
| 19 | start | stop | ✓ |
| 20 | hard | soft | ⚠ **HARD 多义**: hard 还有 "困难" (↔easy) — 当前是物理 sense, 但应在 note 注明 |

**数据准确率**: 17/20 完全通过 (85%), 3/20 多义未注 (15%, light/hard/answer), 1/20 配对不一致 (answer/question vs ask/answer)

**额外发现**:
- 头注释声称 "60 组" 实际 78 (+30%)
- 双向配对中 32 个是双向定义 (hot↔cold), 46 个单向 — 单向的那 46 个全 BUG (§2.1)
- 1/124 反义词 (cowardice) 不在 words.json
- 13/123 (10.5%) 反义词主词在 words.json 没有 root 数据
- 0/123 反义词主词在 words.json 没有 phrase 数据 (配 tab 都能用)

### 6.3 words.json 数据 vs 设计的兼容性

| 维度 | 期望 | 实际 | 评估 |
|------|------|------|------|
| synonyms.ts 146 主词都在 words.json | 100% | 144/146 (98.6%) | acceptable (exhausted, scared 缺失) |
| 117/389 同义词值在 words.json | 高 | 272/389 (70%) | **P1 §3.4** (30% 跳词落空) |
| antonyms.ts 主词都在 words.json | 100% | 78/78 (100%) | ✓ |
| 123/124 反义值在 words.json | 高 | 123/124 (99.2%) | acceptable (cowardice 缺失) |
| 30/146 同义主词的 root tab 非空 | 高 | 116/146 (79%) | **P1 §3.3** (21% 空白) |
| words.json root 字段覆盖率 | 100% | 95.6% | ✓ |
| 共享 root 词的数量 | 合理 | 351 词共享 '-y' (假阳性多) | **P1 §3.3** 二次影响 |
| words.json phrase 字段覆盖率 | 100% | 94.6% | ✓ |
| Top phrase 共享数 | < 5 | 4 ('gross domestic product (gdp)') | ✓ 数据合理 |

---

## §7 算法 review: 4 个 get 函数

### 7.1 边界条件测试

| 场景 | root | synonym | antonym | collocation |
|------|------|---------|---------|-------------|
| 词在 words.json 且有数据 | ✓ | ✓ | ✓ (主词) | ✓ |
| 词在 words.json 无 root | ✓ 返 [] | n/a | n/a | n/a |
| 词在 words.json 无 phrase | n/a | n/a | n/a | ✓ 返 [] |
| 词不在 words.json | ✓ 返 [] | ✓ 返 [] | ✓ 返 [] | ✓ 返 [] |
| 空字符串 | ✓ 返 [] | ✓ 返 [] | ✓ 返 [] | ✓ 返 [] |
| 大小写混合 (Happy/happy) | ✓ 归一 | ✓ 归一 | ✓ 归一 | ✓ 归一 |
| 自身匹配 | ✓ 排除 | n/a (SYNONYM_GROUPS 主词不含自身) | n/a | ✓ 排除 |
| 短语字段 {en,zh} 格式 | n/a | n/a | n/a | ✓ 兼容 (`getPhraseText` L63) |
| 短语字段 {phrase,translation} 格式 | n/a | n/a | n/a | ✓ 兼容 |
| `phrases` 是空数组 `[]` | n/a | n/a | n/a | ✓ 返 [] |
| `roots` 是空数组 `[]` | ✓ 返 [] | n/a | n/a | n/a |
| 反向查 (输入反义值) | n/a | n/a | **✗ BUG** §2.1 | n/a |

**整体评估**: 边界 90% OK, 1 个 P0 漏 (反向查)

### 7.2 缓存命中率分析

**实现**:
```ts
const cache = new Map<string, string[]>()
function cacheKey(type: NetworkType, word: string): string {
  return `${type}::${word.trim().toLowerCase()}`  // 归一化大小写
}
```

**评估**:
- Key 归一化正确 (大小写不敏感)
- 缓存值是 immutable 数组 (未 mutate, 安全)
- 空结果 `[]` 也缓存 ✓ (避免重复查)
- 全局单例, 模块加载即存在
- 无 TTL / LRU 限制 — **但实际是有限数据** (4 type × 单词数), 不会爆

**潜在问题**:
- 测试用 `clearNetworkCache()` 重置, 真实场景**没有调用方**, 缓存可能跨单词污染
- 实际: 缓存 key 含 type+word, 不会污染
- 实际: 缓存值不变, 不会污染

**结论**: 缓存设计**正确且高效**, 无问题.

### 7.3 性能测试 (5000 词)

**独立基准** (Node v22, M3 sandbox):
```
findRelatedByRoot 5000 words × 100 calls: 52.74ms, avg: 0.53ms
findRelatedCollocation 5000 words × 100 calls: 31.69ms, avg: 0.32ms
```

**评估**:
- 单次 < 1ms, 极快
- words.json 实际 5,423 词, 略大于测试 (但 O(n) 复杂度, ~0.55ms)
- 配合缓存, 二次查询 < 0.01ms
- Promise.all 并行 4 查询 → 总耗时 ~ 0.55ms + 缓存查找 (map.get 是 O(1))

**结论**: 性能**优秀**, 无优化必要.

### 7.4 复杂度

| 函数 | 时间 | 空间 | 备注 |
|------|------|------|------|
| getRelatedByRoot | O(n) | O(k) | n=词数, k=相关词数 |
| getRelatedSynonym | O(1) | O(1) | 直接查 SYNONYM_GROUPS |
| getRelatedAntonym | O(1) | O(1) | 直接查 ANTONYM_PAIRS + REVERSE |
| getRelatedCollocation | O(n×p) | O(k) | p=平均短语数, 优化后 O(n) |

`getRelatedCollocation` 的 `break` 优化 (L129) 正确, 单词只扫一次短语.

---

## §8 UX review: 4 tab + 跳转 + 空态

### 8.1 4 tab 切换

- ✓ Tab 头部有颜色编码 (emerald/amber/rose/sky)
- ✓ 选中 tab 有下划线 + 颜色变化
- ✓ 每个 tab 显示**计数徽章** (count > 0 时) — 直观
- ✓ Tab 顺序合理 (root → synonym → antonym → collocation)
- ✓ tooltip + aria-label 已加
- ✓ 移动端 `overflow-x-auto` 防止溢出

**P2 问题**:
- 切换 tab 无键盘快捷键 (左右方向键不响应) — A11y 缺陷

### 8.2 点词跳转

- ✓ 词在 words.json → 跳 `/words/:id` 详情页
- ✗ 词不在 words.json → 跳 `/words?q=` (但 **WordList 不读 URL**, 实际走回首页) — §3.2 P1
- ✗ 多词同义 (give up 等) → 同样问题 + URL encode 后不可读
- ✗ 没有"该词不在词库"提示, 用户不知道发生了什么
- ✓ 跳转前不调用任何 LLM (纯本地)

### 8.3 空态

- ✓ "暂无相关词" (WordGrid:51) — 友好
- ✓ "加载中..." 文字 (WordNetwork:179)
- ✓ "⏳ 加载中..." 头部 (WordNetwork:157)
- ✓ "共 N 个" 调试信息 (WordNetwork:184, opacity-50) — 不错, 不喧宾夺主
- ✗ **stale data 闪现** (见 §4.5) — 切词瞬间仍显示旧数据
- ✗ 30/146 词 (21%) 同根 tab 永远空 (见 §3.3) — 用户体验差

### 8.4 其他 UX 细节

- ✓ 移动端可用
- ✓ dark mode 已支持 (text-stone-400 dark:text-stone-500)
- ✓ `font-mono` 用于词 chip — 词形清晰
- ✗ "调试信息 (data 字段) - 仅当有数据时显示" 注释 (L181) 暗示这是 debug 但**实际 UI 展示** — 应改名/去掉
- ✗ 4 个 tab 的颜色色号 `bg-${color}-50` 用了动态拼接, **依赖 Tailwind safelist 才能 purge 不掉** — colorMap 静态写法 (L119-124) 是对的, 但 WordGrid (L61-65) 用了**错误的**动态拼接. **P2 但需关注**: 需确认 tailwind.config 含完整 safelist
- ✗ 没有 retry 按钮 (加载失败时)

---

## §9 WordDetail 集成 (4 行)

```tsx
// src/pages/WordDetail.tsx:272
<WordNetwork word={word.word} />
```

- ✓ 单行集成, 无副作用
- ✓ 复用 WordDetail 的 word state, 不重复 fetch
- ✓ 位置在 AI 短语用法 (上) 和 AI 语法讲解 (下) 之间 — 位置合理
- ✗ 注释 `v1.85-A: 触类旁通 (同根/同义/反义/搭配)` 信息正确, 但**注释不应替代 CHANGELOG**

**集成评估**: 简洁, 无问题.

---

## §10 总结与裁决

### 10.1 严重度分布

| 严重度 | 数量 | 修复工作量 |
|--------|------|-----------|
| P0 | 1 | 5 行代码 + 1 回归测试 |
| P1 | 4 | 30 行代码 + 5 回归测试 |
| P2 | 6+ | 1-2h 数据校对 + i18n 补键 |

### 10.2 关键发现摘要

1. **P0 反查 bug**: 37% 反义词双向查返回错误 (返自身) — 静默错数据, 必修
2. **30% 同义词跳词落空**: 117/389 同义词值不在 words.json + WordList 不读 ?q= → 用户体验断
3. **21% 同根 tab 空白**: 30/146 主词无共享根, words.json 根数据过粗 (-y 等后缀覆盖 350 词)
4. **setLoading 缺 finally**: 历史 P1 模式在新增组件中重现
5. **i18n 完全未接**: 中文硬编码 8+ 处, 与项目其他模块不一致
6. **'sleepy' 重复 drowsy**: 1 行数据 bug
7. **多词同义 (11 处)**: 单动词 + 动词短语混合, UI 表现不一

### 10.3 测试覆盖率评估

- 47/47 PASS ✓
- 但 **P0 反查 bug 未被覆盖** (测试只查主词不查反义值)
- 30% 同义词跳词问题**无 UI 测试** (无 component test)
- stale data 闪现**无测试** (无 word 切换场景测试)

### 10.4 最终裁决

**FAIL** — 触类旁通模块**必须修复 P0 反查 bug** 才能发布. P1 中至少 §3.2 (跳词失效) 和 §3.4 (30% 跳词落空) 应一并修. P2 可分批修.

**不建议发布状态**: 1 个 P0 (用户可见的错数据) + 1 个 P1 (用户可见的 UX 断裂) 在新功能的核心路径上.

### 10.5 修复优先级建议

1. **必修 (P0 + 关键 P1)**: 0.5 day
   - 修反查 bug (5 行)
   - 补反向查回归测试 (1 test)
   - 修 WordList 读 URL ?q= (10 行)
   - 修 setLoading 加 finally (5 行)

2. **应修 (P1)**: 1 day
   - 数据补 117 同义词 或 UI 标 "外部词"
   - 数据补 root 字段 (happy/happiness/happen 共享 hap)
   - stale data 闪现 (reset loadedTabs)

3. **可延后 (P2)**: 0.5 day
   - i18n 8 键
   - 修 sleepy 重复
   - 11 处多词同义
   - 文件头注释数量
   - polysemy 注释
   - debug info 改 naming
   - A11y 键盘 tab 切换

---

## §11 附录: 验证证据

### A. 关键文件位置
- `src/lib/wordNetwork.ts:189-205` — P0 反查 BUG
- `src/components/WordNetwork.tsx:89-105` — setLoading 无 finally
- `src/components/WordNetwork.tsx:108-116` — ?q= 跳失效
- `src/data/synonyms.ts:638-642` — sleepy 重复 drowsy
- `src/data/antonyms.ts:23-453` — 78 对反义 (注释称 60)
- `src/pages/WordList.tsx:21,69-82` — 不读 URL ?q=

### B. 数据验证命令
```bash
# 反查 bug 实证
node -e "
import { ANTONYM_PAIRS, ANTONYM_REVERSE } from './src/data/antonyms.ts';
function getAnt(w) { let p=ANTONYM_PAIRS[w]; if(!p){const r=ANTONYM_REVERSE[w]; if(r) p=ANTONYM_PAIRS[r]; } return p?[p.antonym]:[]; }
['after','cheap','dangerous','sad','question'].forEach(w => console.log(w, '→', getAnt(w)));
"
# 期望: after→before, cheap→expensive, dangerous→safe, sad→happy, question→ask
# 实际: after→after (BUG), ...
```

### C. 性能基准
- 5000 词 findRelatedByRoot: 0.53ms/call
- 5000 词 findRelatedCollocation: 0.32ms/call
- 缓存命中: < 0.01ms

### D. 测试统计
- wordNetwork.test.ts: 47 tests, all PASS
- 盲点: 反查路径 + 真实 words.json 数据 + 词切换 stale 场景

---

**审查员签名**: verifier E
**审查时长**: ~35 分钟
**下一轮**: 等 producer 修 P0 + 关键 P1 后复审
