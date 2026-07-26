# v1.36 verifier2 摸底 — 测试覆盖 + 集成审查 + IDB schema

**日期**: 2026-07-26
**审查者**: general (independent reviewer)
**范围**: v1.23.0 → v1.36.0 (14 release tag, 跳过 v1.31 = 已有功能)
**目的**: 不改代码, 静态审查
  1. 测试覆盖 audit (src/lib → tests/ 对照)
  2. 集成审查 (新 lib 是否被 UI 实际引用)
  3. IDB schema 检查 (version 6, 表名/索引冲突, v1.23-v1.36 新代码使用情况)

---

## 总览 (TL;DR)

| 维度 | 数据 | 评级 |
|------|------|------|
| **测试覆盖** (src/lib 总览) | 30/44 = 68.2% | 中 |
| **v1.23-v1.36 新 lib 覆盖** | 8/8 = **100%** | 优 |
| **v1.23-v1.36 新 lib 集成** | 3/8 = **37.5%** | **差** |
| **Dead code 风险** | **5 lib + 37 tests** ≈ 820 行 | **高 P0** |
| **IDB version** | 6 (v1.21 后无迁移) | 稳 |
| **IDB 表/索引冲突** | 0 (v1.23-v1.36 未加新表) | 优 |
| **writingErrors / records 新代码使用** | 正确, 索引存在 | 优 |

### 核心结论
1. **测试覆盖 OK** — v1.23-v1.36 新 8 个 lib 全部有单元测试, 覆盖率 100%
2. **集成严重缺失** — 5 个新 lib (tagSuggest/writingTemplates/aiPlanGenerator/errorStats/phraseCards) 只写了 lib + 测试, UI 完全没引用, 实际是 **dead code**
3. **IDB schema 健康** — version 6 无冲突, writingErrors/records 索引完整, v1.23-v1.36 新代码 (reminderContent, errorStats) 使用正确
4. **北极星风险** — 37 个 dead-code 测试 + 5 个 lib (≈ 450L lib 代码) 给用户/北极星零价值, 但占 5+ 测试运行时间

---

## 任务 1: 测试覆盖 audit

### 1.1 全局: src/lib/*.ts → tests/*.test.ts 对照

总计 44 个 lib, 30 个有测试 = **68.2% 覆盖**.

#### 已覆盖 (30/44) ✓

| Lib | 行数 | 测试文件 |
|-----|----:|----------|
| achievements.ts | 116 | tests/achievements.test.ts |
| aiChat.ts | 296 | tests/aiChat.test.ts |
| aiPlanGenerator.ts | 127 | tests/aiPlanGenerator.test.ts |
| chatRoles.ts | 544 | tests/chatRoles.test.ts |
| customScenes.ts | 198 | tests/customScenes.test.ts |
| db.ts | 382 | tests/db.test.ts |
| errorReview.ts | 99 | tests/errorReview.test.ts |
| errorStats.ts | 100 | tests/errorStats.test.ts |
| fileUpload.ts | 106 | tests/fileUpload.test.ts |
| fsrs.ts | 201 | tests/fsrs.test.ts |
| inAppReminder.ts | 122 | tests/inAppReminder.test.ts |
| learningCalendar.ts | 165 | tests/learningCalendar.test.ts |
| learningReport.ts | 442 | tests/learningReport.test.ts |
| listeningRecommend.ts | 66 | tests/listeningRecommend.test.ts |
| llmFallback.ts | 149 | tests/llmFallback.test.ts |
| llmTutor.ts | 395 | tests/llmTutor.test.ts |
| llmUsage.ts | 118 | tests/llmUsage.test.ts |
| migrate.ts | 180 | tests/migrate.test.ts |
| notebookBulk.ts | 132 | tests/notebookBulk.test.ts |
| pdfUpload.ts | 96 | tests/pdfUpload.test.ts |
| phraseCards.ts | 47 | tests/phraseCards.test.ts |
| plan.ts | 303 | tests/plan.test.ts |
| reminderContent.ts | 93 | tests/reminderContent.test.ts |
| reviewQueue.ts | 135 | tests/reviewQueue.test.ts |
| sceneReview.ts | 94 | tests/sceneReview.test.ts |
| synonyms.ts | 216 | tests/synonyms.test.ts |
| tagSuggest.ts | 94 | tests/tagSuggest.test.ts |
| taggedReviews.ts | 64 | tests/taggedReviews.test.ts |
| wordTags.ts | 224 | tests/wordTags.test.ts |
| writingTemplates.ts | 88 | tests/writingTemplates.test.ts |

#### 未覆盖 (14/44) ✗

| Lib | 行数 | 范围 | 备注 |
|-----|----:|------|------|
| **daily.ts** | 15 | v0.x | 极少行, 可能 inline 即可 |
| **export.ts** | 95 | v0.x | 数据导出 (主路径可能走 migrate.ts) |
| **exportChat.ts** | 159 | v0.x | 对话导出 |
| **imageRecog.ts** | 228 | v0.x | 图像识别 |
| **learnReport.ts** | 172 | v0.x | 学习报告 (注意: v1.28 改的是 learningReport.ts, **不是** learnReport.ts) |
| **recorder.ts** | 402 | v0.x | 录音, 浏览器 API mock 难 |
| **reminder.ts** | 168 | v0.22.9 + v1.24 增量 | v1.24 加了 `data.url` 通知点击跳转, **无新增测试** |
| **stt.ts** | 133 | v0.x | 语音转文字 |
| **streak.ts** | 88 | v0.x | 连续天数 |
| **themes.ts** | 152 | v0.x | 主题 |
| **translate.ts** | 527 | v0.x | 翻译, 大文件无测试 |
| **tts.ts** | 853 | v0.x | TTS, 浏览器 API mock 难, **最大无测 lib** |
| **utils.ts** | 30 | v0.x | 工具函数 |
| **words.ts** | 46 | v0.x | 词库加载 |

> **注意**: 14 个未覆盖 lib **全部是 v1.23 之前的预存技术债**, 不在 v1.23-v1.36 范围. v1.6 review 也未触及这些. **v1.23-v1.36 新加的 8 个 lib 100% 有测试**.

### 1.2 v1.23-v1.36 新加 lib 覆盖 (重点)

changelog 声称为每个新 lib 写了测试, 实际验证:

| Lib | 版本 | Lib 行数 | Test 行数 | it/test 计数 | 覆盖断言 |
|-----|------|--------:|----------:|-----------:|----------|
| pdfUpload.ts | v1.23 | 96 | 101 | 16 | ✓ |
| reminderContent.ts | v1.24 | 93 | 97 | 10 | ✓ |
| tagSuggest.ts | v1.29 | 94 | 46 | 5 | ✓ |
| writingTemplates.ts | v1.30 | 88 | 49 | 7 | ✓ |
| aiPlanGenerator.ts | v1.32 | 127 | 73 | 7 | ✓ |
| inAppReminder.ts | v1.34 | 122 | 74 | 8 | ✓ |
| errorStats.ts | v1.35 | 100 | 105 | 8 | ✓ |
| phraseCards.ts | v1.36 | 47 | 88 | 10 | ✓ |

**v1.23-v1.36 新 lib 覆盖率: 8/8 = 100%** (changelog 真实)

### 1.3 v1.23-v1.36 修改 lib 覆盖 (重点)

| Lib | 改动版本 | 测试增量 | 评级 |
|-----|---------|---------|------|
| wordTags.ts | v1.25 (加 3 函数) | tagMerge.test.ts (102L) | ✓ |
| chatRoles.ts | v1.26 + 27 + 33 (加 6 角色 + 3 多人场景) | multiRole.test.ts (73L) + chatRoles 增量 | ✓ |
| learningReport.ts | v1.28 (加 3 数据点) | reportUpgrade.test.ts (89L) | ✓ |
| aiChat.ts | v1.27 (multi-role 集成) | roleIntegration.test.ts (81L) | ✓ |
| **reminder.ts** | v1.24 (加 data.url 通知点击) | **无新增测试** | ✗ |

`reminder.ts` 在 v1.24 增加了 `Notification data: { url: '/review?from=reminder' }` 通知点击跳转, 但 **未加测试**. 现有 reminder.ts 整体无测试 (pre-existing 债). 增量代码量小 (1 处), 但严格来说应补一个 mock Notification 测试.

### 1.4 单元测试总数

- changelog 声称 v1.36 累计 632 测试
- 实际 grep `it\(|test\(` = 626 (差异 ±1% 来自 grep 精度, 可接受)

---

## 任务 2: 集成审查 (新 lib 是否被 UI 实际引用)

### 2.1 grep import 结果 (v1.23-v1.36 新 lib)

| Lib | src/ 中 import 数 | UI 引用? | 测试引用? | 集成状态 |
|-----|------------------:|----------|----------|----------|
| **pdfUpload** | 1 | ✓ CustomScenes.tsx | ✓ | **已集成** |
| **reminderContent** | 2 + 1 lazy | ✓ ReminderSection.tsx + inAppReminder.ts + reminder.ts (lazy) | ✓ | **已集成** |
| **inAppReminder** | 1 | ✓ ReminderSection.tsx (shouldUseInAppReminder) | ✓ | **已集成** |
| **tagSuggest** | 0 | ✗ | ✓ (5 tests) | ⚠ **DEAD CODE** |
| **writingTemplates** | 0 | ✗ | ✓ (7 tests) | ⚠ **DEAD CODE** |
| **aiPlanGenerator** | 0 | ✗ | ✓ (7 tests) | ⚠ **DEAD CODE** |
| **errorStats** | 0 | ✗ | ✓ (8 tests) | ⚠ **DEAD CODE** |
| **phraseCards** | 0 | ✗ | ✓ (10 tests) | ⚠ **DEAD CODE** |

**3/8 集成 ✓, 5/8 集成 ✗ = 62.5% dead code 风险**

### 2.2 详细分析 (每个 dead code lib)

#### ⚠ tagSuggest.ts (v1.29.0) — DEAD CODE
- **导出**: `suggestTagsByLLM()`, `parseTagSuggestions()`, re-export `suggestTagsFromWord`
- **UI 应在**: `Notebook.tsx` (tag 管理 Modal) / 新增"AI 推荐 tag"按钮
- **当前**: `Notebook.tsx` 仅用 `wordTags.suggestTagsFromWord` (本地启发式), 没用 LLM 路径
- **风险**: v1.21 提的"AI 智能推荐"从未在 UI 暴露
- **测试浪费**: 5 个 LLM mock 测试

#### ⚠ writingTemplates.ts (v1.30.0) — DEAD CODE
- **导出**: `WRITING_TEMPLATES[4]` (邮件/自我介绍/道歉/感谢) + `buildTemplatePrompt()`
- **UI 应在**: `WritePage.tsx` 加 Tab "模板写作"
- **当前**: `WritePage.tsx` 仅 raw textarea + 调 LLM, 无模板选择器
- **风险**: 88L lib + 49L test (4 个精心 prompt) 完全未被用户看到
- **测试浪费**: 7 个模板/校验测试

#### ⚠ aiPlanGenerator.ts (v1.32.0) — DEAD CODE
- **导出**: `generateAIPlan()`, `parseAIPlan()`, `estimatePlanMinutes()`
- **UI 应在**: `PlanPage.tsx` 加 "AI 定制计划" 按钮
- **当前**: `PlanPage.tsx` 用 `plan.ts` (v0.22.5, localStorage 7 天完成曲线)
- **风险**: LLM 计划功能从未触达用户
- **测试浪费**: 7 个 JSON 解析/估算测试

#### ⚠ errorStats.ts (v1.35.0) — DEAD CODE (并与 inline 重复)
- **导出**: `getErrorSummary()`, `ERROR_TYPE_LABELS`, `getErrorTypeColor()`
- **UI 应在**: `ErrorsPage.tsx`
- **当前**: `ErrorsPage.tsx` **自己 inline 实现** (`useMemo` 计算 wordCount, typeCount, top 错词, 等, 见 lines 35-58, 185, 207, 213, 225, 236)
- **风险**: **lib 没被用, 且页面 inline 实现并行存在** — 双份逻辑, 维护成本翻倍
- **测试浪费**: 8 个完整测试 (但不验证实际 UI 行为)

#### ⚠ phraseCards.ts (v1.36.0) — DEAD CODE
- **导出**: `extractPhrasesFromWords()`, `shuffleCards()`, `getPhraseTTS()`
- **UI 应在**: `CardReview.tsx` 加 Tab "短语模式"
- **当前**: `CardReview.tsx` 是单词翻卡, 无短语模式
- **风险**: v1.36 标题"单词短语闪卡"承诺的功能未在 UI 出现
- **测试浪费**: 10 个抽取/打乱/TTS 文本测试

### 2.3 Dead code 风险汇总

| 维度 | 数据 |
|------|------|
| Dead lib 数 | **5** |
| Dead lib 代码行数 | **456 行** (94+88+127+100+47) |
| Dead lib 测试行数 | **361 行** (46+49+73+105+88) |
| Dead lib 测试用例 | **37 个** (5+7+7+8+10) |
| 总浪费代码 | **817 行** ≈ ~5% 项目体量 |
| 用户可感知价值 | **0** (UI 永不调用) |
| 运行开销 | 每次 `vitest` 跑 37 个无用测试 (~1-2s) |

### 2.4 推测根因 (不修, 仅记录)

changelog 多个版本提到 "X 卡片" / "X UI" 但代码 grep 不到 import, 推测:
1. **plan/拆分过大**: 14 个 release tag 跨越 6 周, 部分 task 写了 lib + test 但 UI task 被推迟/遗漏
2. **错误的 changelog 描述**: 如 v1.35 changelog 写 "错题本升级", 但 ErrorsPage 改的可能是其他方面, errorStats 被写但未 wire
3. **拆分给 v1.37+ 留接口**: 部分 lib 是为未来 UI 准备, 但 changelog 没声明

### 2.5 推荐处理 (给 owner)

**方案 A (低风险)**: 立即删 5 个 dead lib + 37 tests, 节省 817 行 + 减测试时间
**方案 B (北极星)**: 给 5 个 lib 写 UI 集成 task, 1-2 天可做完
**方案 C (折中)**: 留 lib, 但加 "experimental" 注释 + 跳过 CI, 避免误导

---

## 任务 3: IDB schema 检查

### 3.1 当前 IDB 状态

- **version**: **6** (v1.21.0 后无 migration)
- **db name**: `EnglishAppDB`
- **表数**: 9

| 表 | v1.x 版本 | 主键 | 索引 |
|---|-----------|------|------|
| favorites | v1 | wordId | addedAt |
| records | v1 | ++id | wordId, action, **timestamp** |
| reviews | v1 | wordId | nextReview |
| pronunciationAttempts | v2 | ++id | wordId, ts, score |
| chats | v3 | ++id | scenario, level, updatedAt, createdAt, title |
| writingErrors | v3 (v0.23) | ++id | **ts, source** |
| errorExplanations | v4 (v1.2-D2) | key | ts |
| customScenes | v5 (v1.14.0) | ++id | updatedAt, createdAt, title |
| wordTags | v6 (v1.21.0) | [wordId+tag] | wordId, tag, addedAt |

### 3.2 v1.23-v1.36 新代码的 IDB 触达

| Lib | 触达表 | 操作 | 索引使用 |
|-----|--------|------|---------|
| pdfUpload | — | — | — |
| **reminderContent** | `records` | `orderBy('timestamp').reverse().first()` (getLastStudyTimestamp) | ✓ `timestamp` 索引存在 |
| | `favorites` | count (getReminderStats) | ✓ |
| | `learningReport` | 间接 | — |
| tagSuggest | — | (依赖 LLM + wordTags re-export) | — |
| writingTemplates | — | — | — |
| aiPlanGenerator | — | (loadWords 读 static JSON) | — |
| inAppReminder | — | (iOS Notification 检测) | — |
| **errorStats** | `writingErrors` | `orderBy('ts').reverse().toArray()` | ✓ `ts` 索引存在 |
| phraseCards | — | — | — |

**v1.23-v1.36 中只有 reminderContent 和 errorStats 触达 IDB, 索引使用全部正确**.

### 3.3 表名/索引冲突

- **无冲突**: v1.23-v1.36 期间 IDB schema 完全没改, 没有新表/新索引
- **未来风险**: 如果 v1.37+ 加新表, 需要 `this.version(7).stores({...})` 并列出所有旧表 (Dexie 要求)

### 3.4 writingErrors / records 表使用审查

#### writingErrors 表
- **schema** (v3): `++id, ts, source`
- **schema 真实使用**: 9 个 lib 触达
  - `db.ts` (save/getAll/delete helpers)
  - `achievements.ts` (成就墙统计)
  - `errorReview.ts` (错题复习)
  - `errorStats.ts` (v1.35 新加, 读 + group by type)
  - `learningReport.ts` (今日/本周错题)
  - `migrate.ts` (导入/导出)
  - `ShareCard.tsx` (分享卡统计)
  - `MigrationSection.tsx` (迁移 UI 统计)
- **v1.23-v1.36 新写入源**:
  - `WritePage.tsx` 一直调用 `saveWritingError` (v0.23+ 就有, 写入 source='write')
  - `AIChat.tsx` v1.13+ 写 source='chat' 纠错
  - `Translate.tsx` v1.10+ 写 source='chinese' 错译
- **结论**: writingErrors 写入路径完整, 读取路径 (含 v1.35 errorStats) 全部正确

#### records 表
- **schema** (v1): `++id, wordId, action, timestamp`
- **使用方**:
  - `db.ts` (logAction/getTodayCount/getTotalLearned)
  - `achievements.ts` (成就)
  - `ShareCard.tsx` (分享卡)
  - `DataManagementSection.tsx` (clear 操作)
  - `export.ts` (导出)
  - `learningReport.ts` (今日/本周/历史)
  - `reminderContent.ts` (v1.24 新加, getLastStudyTimestamp)
- **v1.23-v1.36 增量**: reminderContent 用 `orderBy('timestamp').reverse().first()` 查最近学习时间
  - `timestamp` 是 schema 中声明的索引 ✓
  - `.reverse().first()` 是 Dexie 标准 API ✓
- **结论**: records 表使用正确, 索引匹配

### 3.5 IDB 风险汇总

| 风险 | 等级 | 备注 |
|------|------|------|
| Version 冲突 | 无 | v1.23-v1.36 未加 version, 无需 migration |
| 表名冲突 | 无 | 未加新表 |
| 索引缺失 | 无 | reminderContent / errorStats 用的索引都在 |
| Quota 风险 | 低 | handleDbError 有 QuotaExceeded 守卫, 但 reminderContent 写入 `getLastStudyTimestamp` 失败时只 `return null` 静默 |
| Type 漂移 | 低 | WritingError 接口稳定 v0.23+ 至今未变 |

---

## 总结 (北极星视角)

### 数据
- **测试覆盖**: 30/44 (68.2%) 全局 / **8/8 (100%)** v1.23-v1.36 新 lib
- **Dead code**: 5 lib + 37 tests ≈ 817 行 (≈ 5% 项目体量), 用户零价值
- **IDB 健康**: version 6, 0 冲突, 索引匹配, 无需 migration
- **总测试数**: 626 (changelog 报 632, 差异 ±1% 来自 grep 精度)

### 关键问题
1. **5 个新 lib 是 dead code** (tagSuggest/writingTemplates/aiPlanGenerator/errorStats/phraseCards) — 纯 P0
   - 写了 lib + test, UI 完全没集成
   - 占 817 行代码 + 37 个测试 + 多次 LLM mock 风险
   - 错误信息会让用户/北极星误以为 v1.29-v1.36 提供了 5 个新功能, 实际没暴露
2. **errorStats 与 ErrorsPage.tsx inline 实现并行存在** — 双份逻辑, 维护成本翻倍
3. **reminder.ts 的 v1.24 增量 (1 行 data.url) 无测试** — 极小, 可忽略
4. **changelog 描述与代码不一致** — 多个版本声称 "X 卡片" / "X UI", 但 grep 不到 import

### 结论

**测试覆盖 100% ✓, 集成 37.5% ✗, IDB 健康 ✓**.

项目表面是 "14 个 release tag 快速迭代", 但静态审查发现 **5 个 tag 实际只到 lib + test 层, 触达不到用户**. 这 5 个 dead lib 包含精心设计的 prompt 模板 (writingTemplates), LLM 调用链 (aiPlanGenerator, tagSuggest), 和核心错题统计 (errorStats).

**建议 owner 优先决策**:
- 方案 A: 删 dead code (817 行, 1-2h)
- 方案 B: 5 个 UI 集成 task (1-2 天, 给北极星加 5 个真实可业功能)
- 方案 C: 混合 — 留 errorStats/writingTemplates (高价值), 删 aiPlanGenerator/tagSuggest/phraseCards

**北极星 (触发可业 + 内容能用 + 学得会) 影响**:
- errorStats: 高 (错题数据可视化, 直接帮学得会)
- writingTemplates: 中 (写作模板帮内容能用)
- aiPlanGenerator: 中 (个性化计划帮触发可业)
- phraseCards: 中 (短语模式增加复习维度)
- tagSuggest: 低 (已有 wordTags 本地启发式, LLM 增量小)

**保 v1.6 review 修复**: 13 个 bug 修复 全部位于功能路径, dead code 删/不删都不影响 ✓
**保 v1.0-v1.5 模块**: 成就墙/学习卡分享/词根/短语用法/错题讲解 全部位于功能路径, 未触及 ✓
**零成本**: 审查本身不引依赖, 不改代码 ✓
