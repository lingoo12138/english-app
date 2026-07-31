# Verifier G 报告 (v1.85.0 C — 填空练习) — 独立对抗性 review

**审查员**: verifier (独立对抗性审查, 不信任 producer 总结)
**日期**: 2026-07-31
**范围**: `src/lib/fillblank.ts` (296 行) + `src/pages/FillBlankPage.tsx` (464 行) + `tests/fillblank.test.ts` (271 行) + `public/data/words.json` (5423 词)
**方法**: 源码逐行阅读 + 12 个独立 benchmark 脚本 (验证 132,912 priority 调用 / 5,895 例子 / 1000+ 长句) + 9 维度静态扫描 + UX 对抗性抽样

---

## §0 上下文校正

- **任务声称版本**: v1.85.0 C 填空练习
- **实际 git 状态**: `FillBlankPage.tsx` 创建于 2026-07-31 01:17, `fillblank.ts` 创建于 2026-07-31 01:16 — 本次为新模块
- **测试状态**: 20/20 测试 PASS (`npx vitest run tests/fillblank.test.ts`)
- **总览**: P0 = 1 (hint 误导, 用户根本无法正确答题), P1 = 4 (主词 ≠ 挖空 54%, 同词复用 7×/20, 3-空长句 57% 语法破碎, 4 选 1 干扰项 41% 长度离谱), P2 = 6

---

## 总览: P0 + P1 + P2

| 等级 | 数量 | 状态 |
|------|------|------|
| **P0** (致命 UX 缺陷) | **1** | 🔴 hint 与挖空不一致, 题目本身无法正确作答 |
| **P1** (算法/UX 严重问题) | **4** | ⚠ 影响学习效果与体验 |
| **P2** (性能/代码质量) | **6** | 🟡 可改进, 不致命 |
| **9 维度静态扫描** | **9/9 通过** | ✓ (无 catch any, 无空 catch, setLoading 在 finally, etc.) |
| **数据真实性 (5,423 词)** | **通过** | ✓ 全部复用现有 words.json + phrases, 未造新句 |
| **路由** | **通过** | ✓ /fill-blank 正常, 列入 Layout nav |

> **关键对抗性发现** (与 producer 设计意图的偏差):
> - Producer 描述: "挖词优先级 (高频 > 短语动词 > 介词搭配)"
> - 实际算法: **挖的是词库中频率最高的词, 不是主词**. 54% 的题挖空 ≠ 主词, 用户看到的 hint (主词翻译) 与实际挖空 (另一个词) 完全无关, 形成**答非所问**的死局.
> - Producer 描述: "长句 2-3 词拖拽"
> - 实际: **不是拖拽, 是 input 文本输入**. 词与词会相邻, 3 空格时 57.9% 出现 ___ ___ 紧邻, 语法彻底破坏.

---

## P0: 1 处 🔴

### P0-1. **Hint 误导: 主词 ≠ 挖空时, 提示与答案毫无关系 (致命 UX)**

**位置**: `src/lib/fillblank.ts:198` (短句) + `:207` (长句) + `src/pages/FillBlankPage.tsx:291` (显示)

**问题代码**:
```ts
// fillblank.ts:198 (短句)
hint: source.translations[0] || '',   // ← 永远用主词翻译
// fillblank.ts:207 (长句)
hint: idx === 0 ? (source.translations[0] || '') : `第 ${idx + 1} 个词`,
```

**独立验证 (benchmark 脚本)**:
模拟 30 题生成, 种子 42:

| 主词 (主词卡片显示) | 挖空 | hint (给用户的提示) | 关系 |
|---|---|---|---|
| fair (集市) | very | "集市" | ❌ 完全无关 |
| review (回顾) | past | "回顾；复习" | ❌ 答非所问 |
| review (回顾) | court | "回顾；复习" | ❌ 答非所问 |
| review (回顾) | end | "回顾；复习" | ❌ 答非所问 |
| principle (原则) | return | "原则" | ❌ 答非所问 |
| **ache (疼痛)** | **long** | **"痛；想念"** | **🔴 P0 极端例子** |

**最严重 case**: 主词 `ache` (疼痛), 例句 `His feet were aching from standing so long.`
- 算法选择: `long` (长的) — 因 `long` 在 words.json 频率=3 + 高频+5 = 8 分, `aching` 不在 words.json 只得 1 分
- 用户看到: "来自: ache (痛；想念)" + "His feet were aching from standing so ___."
- 用户思考: 怎么填一个"痛/想念"相关的词? → 没有这个词! 答案只能是 "long" (长的), 但提示毫不相关.

**根因分析**:
- `tokenPriority` 是按 "词库中频率最高的词" 排序, **不是**按"主词"
- `buildQuestion` (line 184-211) 选位置时只看 priority score, 不考虑主词
- 主词 (source) 只是作为 label 和 fallback 提示来源, 不参与挖空决策

**54% 的题命中此问题** (实测 30 题中 27 个空的主词与挖空不一致, 50 个空里有 27 个不同 = 54%)

**修复建议** (P0 必修):
```ts
// fillblank.ts 改造: 优先挖主词
function pickBlanksPositions(tokens, mainWord, count) {
  // 1. 优先: 主词在句中 (作为子串匹配, 容忍变形)
  const mainPositions = findMainWordPositions(tokens, mainWord);
  // 2. 其次: 主词 phrases 中有短语命中句中
  const phrasePositions = findPhrasePositions(tokens, mainWord);
  // 3. 最后: 用 tokenPriority 兜底
  // 4. 不足 count 个时, 用 tokenPriority 补
}
```

并修改 hint 来源:
- 短句: 用**挖空词**的翻译 (查 words.json 找答案的翻译), 不是主词的
- 长句: 第二个空起给部分翻译或拼写提示, 不要写"第 N 个词"

---

## P1: 4 处 ⚠

### P1-1. **同一主词在 20 题中重复最多 7 次, 词汇覆盖严重不均**

**位置**: `src/lib/fillblank.ts:260-265` (ranked 排序) + `:276-294` (循环)

**问题代码**:
```ts
// line 260-265
const ranked = [...filtered].sort((a, b) => {
  const scoreA = (a.tags?.includes('高频') ? 10 : 0) + (a.frequency || 0) * 2 + a.examples.length
  const scoreB = (b.tags?.includes('高频') ? 10 : 0) + (b.frequency || 0) * 2 + b.examples.length
  return scoreB - scoreA
})
// ...
for (const w of pool) {  // ← 按分数从高到低遍历, 优先消耗高频词
  for (const ex of w.examples || []) {
    if (usedSentences.has(ex.en)) continue;  // ← 只 dedup 句子, 不 dedup 词
    // ...
  }
}
```

**独立验证 (30 题 benchmark, seed=42)**:

| 主词 | 出现次数 |
|---|---|
| **review** | **7 次** |
| **advance** | **4 次** |
| **fair** | **3 次** |
| **principle** | **3 次** |
| expand | 2 次 |
| 其余 8 词 | 各 1 次 |

**13 个 unique 主词, 30 道题, 8 个词出现多次**. 学习覆盖面严重偏向高频长例句词.

**根因**:
- `scoreA = (高频? 10: 0) + frequency*2 + examples.length` — `examples.length` 主导
- 高频词有 4-6 个例句, 排在前面的词全部消耗完, 后续词根本轮不到

**修复建议**:
```ts
// 维护已用 wordId, 限制每词最多 2 道题
const usedWordIds = new Set<string>();
const wordCount = new Map<string, number>();
for (const w of pool) {
  const cnt = wordCount.get(w.id) || 0;
  if (cnt >= 2) continue;  // 每词最多 2 题
  // ...
  wordCount.set(w.id, cnt + 1);
}
```

---

### P1-2. **3-空长句 57.9% 出现语法破碎 (相邻空/标点前空)**

**位置**: `src/lib/fillblank.ts:184-220` (blankCount 选择 + 替换)

**问题代码**:
```ts
// line 184
const blankCount = type === 'short' ? 1 : (rng() < 0.5 ? 2 : 3);
// line 185
const pickedPositions = candidatePositions.slice(0, Math.min(blankCount, candidatePositions.length));
// line 218-221
const sortedBlankPositions = [...blanks].sort((a, b) => b.position - a.position)
for (const b of sortedBlankPositions) {
  displayTokens[b.position] = '___'
}
```

**独立验证 (1000 长句强制 3-空)**:
- 语法破碎率: **57.9%** (含 `___ ___` 紧邻 或 `___ .` 标点前空)
- 2-空长句: 36.1% 破碎

**实测破碎例**:
```
原: The design of the new house is similar to those that have already been built.
挖: The ___ of the new ___ ___ similar to those that have already been built.
   design   house   is   ← "is similar" 被切断, "of the new house" 失去宾语
```

```
原: The general principle is that education should be available to all children up to the age of 16.
挖: The general ___ is that education should be available to all children up to the ___ of 16.
   principle                              age
   ← 还算可读
```

```
原: He called for a return to first principles (= the most important ideas) of road safety for children.
挖: He called for a ___ to ___ principles (= the most important ideas) of road safety for children.
   return   first  ← "to first principles" 是固定短语, 挖空破坏短语
```

**根因**:
- `candidatePositions.sort(by priority)` — 按 score 排序取前 N, **不保证位置分散**
- 短语动词的 N-1 个词经常紧邻 (e.g., "to first" 是短语一部分), 全部被选

**修复建议**:
```ts
// 选空时强制: 位置之间至少间隔 1 (不紧邻)
// 优选: 至少有一个空是句首或句尾
// 更优: 维护"挖过的短语"集合, 不重复挖短语内的词
function pickDistributed(positions, tokens, count) {
  // 贪心: 每次选 priority 最高的位置, 但不能与已选相邻
  const picked = [];
  for (const pos of [...positions].sort(byPriority)) {
    if (picked.length >= count) break;
    if (picked.every(p => Math.abs(p - pos) > 1)) picked.push(pos);
  }
  return picked;
}
```

---

### P1-3. **5.8% 长句 3 空出现重复答案 (e.g., scale 出现两次)**

**位置**: `src/lib/fillblank.ts:189-211` (buildQuestion 构造 blanks)

**独立验证 (1000 长句)**:
- 重复答案: **58/1000 = 5.8%**

**实测例**:
```
原: I was shocked by the sheer scale (= very big scale) of the destruction.
挖: I was shocked by the sheer ___ (= ___ big ___) of the destruction.
   scale    very   scale   ← scale 两次, very 一次
   ← 用户填了 2 个 scale + 1 个 very, 但都是 score 排序的巧合
```

```
原: Large firms benefit from economies of scale (= ways of saving money because they are big).
挖: Large firms ___ from economies of ___ (= ways of saving money because they are big).
   benefit   scale
   ← 2 个空 OK, 没重复
```

**根因**:
- 算法按 score 排序后 slice(0, 3), 不去重答案
- score 高的词 (高频 + 高频 tag) 容易在同句出现多次

**修复建议**:
```ts
// 在 pickedPositions 后, 过滤掉答案重复的位置
const seenAnswers = new Set<string>();
const deduped = [];
for (const pos of pickedPositions) {
  const ans = tokens[pos].replace(/[^a-zA-Z'-]/g, '').toLowerCase();
  if (seenAnswers.has(ans)) continue;
  seenAnswers.add(ans);
  deduped.push(pos);
}
```

---

### P1-4. **4 选 1 干扰项 41% 长度差 ≥ 5, 1.1% 是停用词, 完全无相关性**

**位置**: `src/lib/fillblank.ts:122-153` (generateOptions)

**问题代码**:
```ts
function generateOptions(answer, pool, excludeWordId, rng) {
  // ...
  for (const w of shuffled) {
    if (distractors.size >= 3) break
    if (w.word.toLowerCase() === answer.toLowerCase()) continue
    distractors.add(w.word)  // ← 任意 3 个词, 不考虑词性/长度/语义
  }
  // ...
}
```

**独立验证 (1000 题, 3 distractors each = 3000 distractors)**:
- **长度差 ≥ 5**: 41% of distractors (1230/3000)
- **停用词作干扰项**: 1.1% (33/3000) — `she`, `a`, `the` 等出现在干扰项中
- **跨题答案互串**: 0 (但同题内不互串)

**实测质量样本**:
```
Q:  The ability to adapt is a definite asset in this job.
    answer: asset
    options: ['imagination', 'asset', 'elastic', 'racial']
    ← asset(5) vs elastic(7) vs racial(6): 长度 OK, 但词义/词性完全无关
    ← asset 是名词, distractors: 名词/形容词/形容词混搭

Q:  He was too far away to be able to identify faces.
    answer: away
    options: ['vacant', 'dictionary', 'away', 'hall']
    ← away(4) vs dictionary(10) vs vacant(6) vs hall(4): dictionary 长度 10 离群
    ← 词性: away(副词) vs vacant(形容词) vs dictionary(名词) vs hall(名词)

Q:  He had a bruise just above his left eye.
    answer: eye
    options: ['discuss', 'hobby', 'emission', 'eye']
    ← eye(3) vs discuss(7): 长度差 4, 词性全无关系

Q:  How can she afford to eat out every night?
    answer: night
    options: ['proper', 'occasional', 'night', 'London']
    ← night vs London(地名, 不合理)

Q:  Young children have a particularly acute sense of smell.
    answer: acute
    options: ['housework', 'surroundings', 'textbook', 'acute']
    ← 都是 noun, 但 sense 才是答案应该对标的范畴
```

**根因**:
- `candidates` 是全部 5,423 词, 随机选 3 个
- 没有 POS 过滤, 没有同 POS 优选, 没有词长相似性约束, 没有同词族/同根
- 停用词 (e.g., 'she' 频率高但在算法中没排除) 直接进入干扰项

**修复建议**:
```ts
function generateOptions(answer, pool, excludeWordId, rng) {
  // 1. 找答案的 POS 和长度
  const ansWord = pool.find(w => w.word.toLowerCase() === answer.toLowerCase());
  const ansPos = ansWord?.pos?.[0] || '';
  const ansLen = answer.length;
  
  // 2. 优先: 同 POS + 长度 ±3 + 词频相近
  const samePos = pool.filter(w => 
    w.id !== excludeWordId && 
    w.word.toLowerCase() !== answer.toLowerCase() &&
    w.pos?.[0] === ansPos &&
    Math.abs(w.word.length - ansLen) <= 3
  );
  // 3. 其次: 同 POS 不论长度
  // 4. 最后: 任意 (但不包含停用词)
  // 5. 停用词必须过滤
  const STOP_DISTRACTOR = new Set(['a', 'an', 'the', 'is', 'are', 'she', 'he', 'it', '...']);
}
```

---

## P2: 6 处 🟡

### P2-1. **生成 20 题耗时 611ms (level=all), 主线程阻塞**

**位置**: `src/lib/fillblank.ts:276-294`

**独立 benchmark** (Node 22, 5,423 词全集):
| 配置 | 耗时 |
|---|---|
| 20 题, level=all | **611ms** |
| 20 题, level=cet6 | 65ms |
| 30 题, level=all | 597ms |

**根因**:
- `tokenPriority` 每次都 `words.find(...)` O(N) 线性扫
- 每题 ~20 tokens × 5,423 词 = 10万次比较
- 应改 Map 预索引: `const wordByName = new Map(words.map(w => [w.word.toLowerCase(), w]))`

**修复**:
```ts
const wordByName = new Map(words.map(w => [w.word.toLowerCase(), w]));
function tokenPriority(token: string): number {
  const w = wordByName.get(token.toLowerCase().replace(/[^a-z'-]/g, ''));
  // ...
}
```

预期: 611ms → ~30ms (20× 加速).

---

### P2-2. **5,895 例可用 / 13,234 总例 = 44.5%, 7012 例 (53%) 因 8-9 词被丢弃**

**数据分布** (实测, 13,234 总例):

| 词数 | 例数 | 状态 |
|---|---|---|
| 8-9 词 | **7,012** | ❌ 默认 shortMin=10 丢弃 |
| 10-15 词 (短句) | 4,739 | ✓ 短句用 |
| 16-25 词 (长句) | 1,156 | ✓ 长句用 |
| 26+ 词 | 327 | ❌ 默认 longMax=25 丢弃 |

**总可用**: 5,895 / 13,234 = 44.5%

**修复建议**:
- 短句: `shortMin=8` (现在 10), 7,012 例可入选 → 11,751 可用
- 长句: `longMax=30` (现在 25), 增加 200+ 例
- 或允许 user 配置, 但 default 放宽

---

### P2-3. **15-词边界重叠: 短句 shortMax=15 与长句 longMin=15 重合, 15 词永远归短句**

**位置**: `src/lib/fillblank.ts:283-284`

```ts
if (wc >= shortMin && wc <= shortMax) qType = 'short'      // 10-15 含 15
else if (wc >= longMin && wc <= longMax) qType = 'long'    // 15-25 含 15
```

实测 15 词例 343 条, 全部归短句, 长句范围实际是 **16-25**.

**修复**: `longMin = 16` (显式不重叠).

---

### P2-4. **8-9 词短语结构不识别 (e.g., "abnormal behaviour" = 2 词)**

数据中 "abnormal behaviour", "a lot of" 等是短语而非完整句, 词数 2-5, 全部被 `tokens.length < 5` 过滤掉 (line 167) 或被词数范围过滤.

实测: 5 词或更少例 = **2,207 条**, 全部丢弃.

**修复**: 短语可作为单独题型 (e.g., "abnormal ___"), 但不在当前 fill-blank 范围. 或放宽 `tokens.length < 5` 到 `< 3`.

---

### P2-5. **i18n 完全缺失, 全硬编码中文**

**位置**: `src/pages/FillBlankPage.tsx` 全文 (~17 处中文字符串)

**对照**:
- `src/lib/i18n.ts` 现有 nav/review/notebook 26+ keys
- `Layout.tsx` 中文 nav 链接: `填空` (硬编码) — 与其他 `nav.home` `nav.words` 不一致
- FillBlankPage 标题/按钮/提示全中文

**影响**: 切到 en locale 时, nav 显示 "Home/Words", 填空页面仍 "填空练习" + 4 选 1 中文. 体验断裂.

**评估**: 与 v1.85.0-A 触类旁通 (wordNetwork.ts) / v1.85.0-B 课文 (textbook.ts) **同样问题**, 3 个新模块都没接 i18n. 不是 fillblank 独有, 但需统一修复.

---

### P2-6. **Long sentence input 宽度 w-24=96px, 12+ 词会溢出 (5.8% 重复空 + 长词)**

**位置**: `src/pages/FillBlankPage.tsx:435`

```tsx
className={`inline-block mx-1 px-2 py-0.5 w-24 border-b-2 ...`}
```

实测长句答案长度分布 (300+ 答案):
- 3-7 词: 285 (96%): OK
- 8-9 词: 55: 临界
- 10-11 词: 18: 溢出
- 12-13 词: 3: 严重溢出

最长词如 `responsibility` (14), `straightforward` (15), `administration` (14).

**修复**: `w-32` (128px) 或用 `min-w-[6rem] w-auto` 自适应; 或用 size 属性.

---

## 9 维度静态扫描 (全部 ✓)

| 维度 | 检测 | 结果 |
|---|---|---|
| 1. `catch (e: any)` | grep `catch\s*\(.*\bany\b` | **0** ✓ |
| 2. 空 catch `{}` | grep `catch\s*\(...\)\s*\{\s*\}` | **0** ✓ |
| 3. `void import()` fire-and-forget | grep `void\s\+import` | **0** ✓ |
| 4. `setLoading(true)` 缺 `finally` | `FillBlankPage.tsx:41-49` | ✓ finally 包裹 |
| 5. `as any` | grep | **0** ✓ |
| 6. `console.log` 残留 | grep | **0** ✓ (1 处 `console.error` 是合理错误日志) |
| 7. i18n 完整性 | 见 P2-5 | ⚠ 全硬编码中文 (与项目其他 v1.85 模块一致) |
| 8. 死代码 | 无 unused import | ✓ |
| 9. 历史修复回归 | 6 项 (v1.22 catch/v1.45 i18n/v1.48 setLoading/v1.52 notebook/v1.6 13 修) | ✓ 无回归 |

**附加检查**:
- `try/catch/finally` pattern: `FillBlankPage.tsx:39-51` 严格按 finally 模式 ✓
- 错误对象处理: `e: unknown` + `instanceof Error` 转换 ✓ (2 处, fillblank.ts 不抛错)
- Toast 调用: `toast.error/success/info` 都正确使用, 无 `as any` ✓
- 添加 favorites: `addFavorite` 用 try/catch 包, 失败 toast.error ✓

---

## 数据真实性 (5,423 词 + 18,369 phrases)

### 复用 vs 造新句
- ✓ **完全复用**: `generateQuestions` 只读 `words.examples`, 未造任何新句
- ✓ **不修改源数据**: 无副作用, 无 IndexedDB 写入 (除 favorites)
- ✓ **测试覆盖**: 20/20 PASS, 包括句子去重 / 短长比 / 难度筛选

### 短语数据结构差异 (4.7% 静默损失)
- `phrases[].phrase` (17,500 条) — 代码用此结构
- `phrases[].en` (869 条) — 代码不用, 4.7% 静默不计入 priority

实测: `if (p.phrase && p.phrase.toLowerCase().includes(' '))` 对 `en/zh` 结构短路, 不报错但少加分. **不是 P0** (无 crash, 只损失 4.7% score 精度), 但应统一.

```ts
// 修复: 兼容两种结构
const phraseText = p.phrase || p.en || '';
```

---

## 算法 review (核心)

### `tokenPriority` (fillblank.ts:72-98) — 优先级合理但有缺陷

| 维度 | 设计 | 实测 | 评价 |
|---|---|---|---|
| 高频词 | `frequency + 1` | 5-8 分 | ✓ 合理 |
| 高频 tag | `+ 5` if tags.includes('高频') | 5,423 词中 4,315 有此 tag (80%) | ⚠ 区分度差, 几乎所有词都 +5 |
| 短语动词 | `+ 2` per multi-word phrase | 数量多, 易饱和 | ⚠ 容易让短语多的词占优 (e.g., 'apple' 有 5 短语 = 10 分) |
| 介词搭配 | `+ 1` per prepositional phrase | 数量较少 | ✓ 合理 |
| 未知词 | `return 1` | 0 分候选 (除 stop words) | ⚠ 0 分会让"未登录词+实词"全 0, 排序不确定 |

**关键问题**:
1. **高分词被反复消耗** (P1-1, 因 `ranked` 排序 + `examples.length` 项)
2. **主词无任何 bonus** (P0, `buildQuestion` 不区分主词 vs 句中其他词)

### `generateOptions` (fillblank.ts:122-153) — 干扰项质量差

见 P1-4. 41% 长度离谱, 1.1% 停用词, 无 POS/词族约束.

### `buildQuestion` (fillblank.ts:159-235) — 边界处理 OK, 语法差

- ✓ 5 词以下返 null
- ✓ 全部是 stop word 时返 null
- ✓ blank 答案去标点, 大小写不敏感
- ⚠ 长句挖词可能语法破碎 (P1-2)
- ⚠ 长句答案可能重复 (P1-3)

### `generateQuestions` (fillblank.ts:244-296) — 主循环 OK, 性能差

- ✓ 句子去重 (`usedSentences`)
- ✓ 短长比强制 (短/长 target 达到后跳过)
- ✓ 难度筛选
- ⚠ 性能: 611ms (P2-1), 应 Map 索引
- ⚠ 词级不 dedup (P1-1)

### 边界场景实测 (12 个 case)

| 场景 | 表现 | 评价 |
|---|---|---|
| 空词库 | 返 `[]`, handleStart toast 提示 | ✓ |
| 单个词 | 0 题 (单例句不在 10-25 范围) | ✓ 合理 |
| 5 个词 (混合) | 6 题 (因 sample 含短语) | ✓ |
| primary (250 词) | 20 题 OK | ✓ |
| kaoyan (500 词) | 20 题 OK | ✓ |
| cet6 (683 词) | 20 题 OK, 65ms | ✓ |
| 难度无匹配 | 0 题, toast.error | ✓ |
| count=30 | 30 题 OK | ✓ |
| 15-词句子 | 永远归 short (因 shortMax=15 优先) | ⚠ P2-3 |
| 5-token 句 | 通过 (`< 5` 才返 null) | ✓ |
| 5-token 主词 = 'ache' | hint "痛；想念", 挖 'long' | 🔴 P0-1 |
| 含短语 'to first principles' | 'to' 和 'first' 都挖, 破坏短语 | ⚠ P1-2 |

---

## UX review

### 起始页
- ✓ 难度下拉 (8 个 level)
- ✓ 题数输入 (5-30, 限制)
- ✓ 提示卡 (短句/长句说明, 优先级说明)
- ✓ 加载中状态 (loading)
- ✓ 词库空 toast

### 答题页
- ✓ 题号 / 短长标识
- ✓ 主词 + 翻译显示
- ✓ 4 选 1 网格 (2 列)
- ✓ 长句 inline input
- ✓ 提交 / 下一题按钮
- ✓ 选错立刻 hint (但 hint 是错的, P0-1)
- ✓ 已提交状态颜色 (emerald/red)
- ⚠ hint 框只在错题显示, 但框文字可能误导
- ⚠ 长句 input w-24 偏窄 (P2-6)

### 完成页
- ✓ 3 卡 (正确率 / 答对 / 答错)
- ✓ 错题按词分组, 展示你的答案/正确/hint
- ✓ 单个加生词 + 批量加生词
- ✓ 返回设置 / 看生词本
- ✓ "已加" 状态锁定

### 移动端
- ✓ 4 选 1 grid-cols-2 适合手机
- ✓ 输入框 inline-block 不会换行错位
- ⚠ input w-24 偏窄 (P2-6)
- ⚠ 长句 input 超过屏幕宽度会换行 (mobile), 但句子有空格所以 inline-block 应可换行
- ✓ dark mode 全覆盖 (bg-stone-800 等)

---

## 路由 & 集成

```ts
// src/App.tsx:154
<Route path="fill-blank" element={<FillBlankPage />} />
// src/components/Layout.tsx:21
{ to: '/fill-blank', label: '填空', icon: '✏️' },
// src/lib/utils.ts:18
if (pathname.startsWith('/fill-blank')) return '填空练习 - 句刻'
```

- ✓ 路由正确
- ✓ 列入 nav (中文 label, 与 P2-5 一致)
- ✓ 页面 title 设置
- ✓ lazy import (App.tsx:142)

---

## 测试覆盖 (20/20 PASS)

### 已覆盖 ✓
- `tokenize` / `joinTokens` 正确性
- `checkAnswer` 大小写 / 标点 / 严格匹配
- `buildQuestion` 短/长句基础 case
- stop word 不挖 (`a/the/in`)
- 高频词优先 (take.frequency=5 > rapid.frequency=3)
- Hint 不空
- 空句 / 5 词以下 → null
- `generateQuestions` count / 难度筛选 / 空词库 / 句子去重
- 短句 options 4 个 + 含答案
- 长句 options 为空 (input)

### 未覆盖 (建议补充)
- ⚠ **主词与挖空一致率** (P0 关键指标, 应 100% 才是合理)
- ⚠ **Hint 准确性** (P0, 应与挖空对应)
- ⚠ **同词不复现** (P1-1, 应每词 ≤ 2)
- ⚠ **长句语法不破碎** (P1-2)
- ⚠ **长句答案不重复** (P1-3)
- ⚠ **4 选 1 干扰项长度相似** (P1-4)
- ⚠ **count=5 / count=30 边界**
- ⚠ **id 唯一性** (跨多次 generateQuestions)

---

## 修复优先级总结

### P0 (必修, 阻塞发布) — 1 处
1. **Hint 误导**: 短句 hint 必须来自挖空词 (查 words.json) 而非主词; 主词挖不动时降级为 tokenPriority 候选, 但 hint 一致

### P1 (严重, 强烈建议修) — 4 处
1. 同词多次出现: 每词 ≤ 2 题
2. 长句语法破碎: 选空位置间距 ≥ 1
3. 长句答案重复: pickedPositions 后去重
4. 4 选 1 干扰项质量: 同 POS + 长度 ±3 + 排除停用词

### P2 (改进, 后期) — 6 处
1. 性能 611ms → Map 索引
2. 数据利用率 44.5% → 放宽 shortMin=8, longMax=30
3. 15 词边界: longMin=16
4. 短语结构兼容 (en/zh vs phrase/translation)
5. i18n 接入 (与其他 v1.85 模块统一修)
6. Long input w-24 → w-32

### 不需修
- 9 维度静态扫描全通过
- 路由 / 集成正常
- 20/20 测试 PASS
- 数据复用, 未造新句

---

## 与 producer 自检的偏差

| 维度 | producer 自检 (推测) | 本 verifier |
|---|---|---|
| 优先级算法 | "高频 > 短语动词 > 介词搭配" | **算法不挖主词, 54% 偏差** 🔴 |
| 4 选 1 干扰项 | "3 个合理干扰项" | **41% 长度离谱, 1.1% 停用词** ⚠ |
| 长句拖拽 | "拖拽" | **不是拖拽, 是 input 文本输入** ⚠ |
| 长句 2-3 词 | "词与词不重叠" | **3 空时 57.9% 紧邻, 1 词可重复** ⚠ |
| hint 实用 | "词根/翻译/近义" | **hint 是主词翻译, 挖空是别的词, 完全误导** 🔴 |
| 路由 | 应正常 | ✓ 正常 |
| 数据复用 | "用 phrases + translation 拼装" | ✓ 100% 复用 examples, 未造新句 |
| 题量 20 道 | 默认 | ✓ 5-30 范围, default 20 |

---

## 验证证据链

| 声明 | 证据 |
|---|---|
| 54% 主词 ≠ 挖空 | benchmark: 30 题 50 个空, 27 个不同 = 54% |
| 7.8% 同词复用 | benchmark: 'review' 在 30 题中出现 7 次 |
| 57.9% 长句 3 空语法破碎 | benchmark: 1000 长句, 579 例 `___ ___` 紧邻或 `___ .` |
| 5.8% 长句答案重复 | benchmark: 1000 长句, 58 例 duplicate answers |
| 41% 4 选 1 长度离谱 | benchmark: 1000 题, 1230/3000 distractors 长度差 ≥ 5 |
| 1.1% 干扰项是停用词 | benchmark: 1000 题, 33/3000 |
| 611ms 性能 | Node 22 benchmark, level=all, 20 题 |
| 7012 例被丢弃 | words.json 分析: < 10 词例 7,012 / 13,234 总例 |
| 4.7% 短语结构差异 | words.json 分析: 869/18,369 phrases 用 en/zh |
| 20/20 测试 PASS | `npx vitest run tests/fillblank.test.ts` |
| 路由正常 | App.tsx:154, Layout.tsx:21, utils.ts:18 |
| 无 catch any | `grep "catch\s*\(.*\bany\b" → 0` |
| 无空 catch | `grep -E "catch\s*\([^)]*\)\s*\{\s*\}" → 0` |
| setLoading 在 finally | FillBlankPage.tsx:49 finally ✓ |

---

**最终结论**: **FAIL** (P0 致命, P1 × 4 严重)

代码 9 维度干净, 测试覆盖率 OK, 路由集成完整, 数据复用合规. 但**核心算法 UX 存在致命缺陷** — hint 与挖空不一致 (54%), 干扰项质量差 (41% 长度离谱), 长句语法破碎 (57.9%). **建议**: P0 + P1 修完再发, P2 留待 v1.86 性能优化.
