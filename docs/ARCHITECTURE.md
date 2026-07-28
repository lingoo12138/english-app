# 🏗️ 技术架构

> v1.23.0 快照 · 详情见 [CHANGELOG.md](./CHANGELOG.md)

## 技术栈

```
Vite 5 + React 18 + TypeScript 5 + Tailwind 3 + Zustand 4 + Dexie 3
├─ PWA 离线 (vite-plugin-pwa, 30 天 CacheFirst)
├─ 主题: CSS 变量驱动, 8 主题 0 延迟切换
├─ 数据: IndexedDB 本地存储 (零云)
└─ 多 LLM/TTS/翻译渠道: 统一抽象 + 独立 verifier 保障质量
```

### 测试栈
- **Vitest 4** 单元测试 (54 文件 / 702 测试)
- **自定义 verify-v*.mjs** 静态检查 (16 闭环)
- **自定义 review-v*.py** P0/P1/P2 审查 (14 版本)
- **大 review 机制**: 类似 v1.6 13 bug 修复 / v1.22 18 处 catch (e: any) → unknown

## 数据模型 (IndexedDB v6)

```ts
db.version(6).stores({
  favorites:        'wordId,addedAt',                        // 生词本
  records:          '++id,wordId,ts',                        // 学习记录
  reviews:          'wordId,easeFactor,nextReview',          // 复习队列 (FSRS)
  pronunciationAttempts: '++id,wordId,ts',                   // 跟读评测
  chats:            '++id,ts',                              // AI 对话
  writingErrors:    '++id,wordId,ts',                        // 写作错题
  errorExplanations:'wordId',                                // 错题解释缓存
  customScenes:     'id,createdAt',                          // 自定义场景 (v1.14)
  wordTags:         '[wordId+tag],wordId,tag',               // 生词标签 (v1.21)
})
```

## 模块清单 (v1.23.0)

**42 库** (`src/lib/`):

| 分类 | 模块 | 版本 |
|-----|------|------|
| 基础 | `db.ts` `store/useStore.ts` `themes.ts` `utils.ts` `words.ts` `migrate.ts` | v1.0 |
| 内容 | `daily.ts` `plan.ts` `achievements.ts` `streak.ts` | v1.0-1.3 |
| 学习 | `errorReview.ts` `reviewQueue.ts` `fsrs.ts` `learningReport.ts` `learnReport.ts` `recorder.ts` | v1.0-1.11 |
| 标签 | `wordTags.ts` `taggedReviews.ts` `notebookBulk.ts` | v1.20-1.22 |
| i18n | `i18n.ts` `useTranslate.ts` | v1.41 (W41) / v1.49-1.55 全 25 页面覆盖 |
| difficultyAdapter | `difficultyAdapter.ts` | v1.43 (W43) |
| xpSystem | `xpSystem.ts` | v1.43 (W43) |
| 场景 | `customScenes.ts` `sceneReview.ts` `fileUpload.ts` `pdfUpload.ts` `learningCalendar.ts` | v1.14-1.23 |
| AI | `aiChat.ts` `llmTutor.ts` `llmFallback.ts` `llmUsage.ts` `imageRecog.ts` `chatRoles.ts` `stt.ts` | v1.0-1.13 |
| 渠道 | `providers/llm.ts` `tts.ts` `translate.ts` `synonyms.ts` | v1.0-1.10 |
| 工具 | `export.ts` `exportChat.ts` `reminder.ts` `listeningRecommend.ts` | v0-1.7 |

**26 页面** (`src/pages/`): Home/WordList/WordDetail/AIChat/ListenPage/WritePage/Translate/Notebook/WeakWords/ReviewCenter/ErrorsPage/CardReview/PronounceCustom/Scenes/SceneDetail/Camera/PlanPage/LearnReport/ReportsPage/Settings/Achievements/CustomScenes/CustomSceneDetail/CustomSceneLearn/CalendarPage/DailyPage

**32 组件** (`src/components/`): Layout/Modal/Toast/ShareCard/ShareModal/Onboarding/ErrorBoundary/Skeleton/InstallPrompt/ErrorExplainButton/UsageButton/GrammarButton/SynonymsButton/RoleSelector/TTSButton/WordCard/StudyCalendar/PronunciationPractice + home/(3) + settings/(9) + ReviewCenter/(1)

## 目录结构

```
english-app/
├─ src/
│  ├─ lib/                       # 38 业务库
│  ├─ pages/                     # 26 路由页面
│  ├─ components/                # 32 组件 (含 home/settings/ReviewCenter 子目录)
│  ├─ store/                     # Zustand 全局状态
│  ├─ types/                     # TS 类型
│  ├─ data/                      # 静态数据
│  ├─ App.tsx                    # 25 路由 (React.lazy 按需加载)
│  └─ main.tsx
├─ tests/                        # 29 测试文件 / 526 单元测试
├─ scripts/                      # verify-v*.mjs (16) + review-v*.py (14)
├─ docs/                         # DEV_LOG / ROADMAP / CHANGELOG / FEATURES / ARCHITECTURE / AI_CHAT_ROADMAP / REVIEW / RELEASE
├─ public/data/                  # words.json 80.4% 词根 / daily.json 100 句
├─ .mavis/plans/                 # Mavis 任务 plan
└─ vite.config.ts + vitest.config.ts
```

## 关键设计决策

### 1. 零后端 / 零云 / 零账号
- 所有数据 IndexedDB 本地
- LLM 走浏览器直连 (OpenRouter free 默认, 零成本)
- PWA 离线 30 天

### 2. OpenAI 协议统一
- LLM 全部走 `chat/completions` 风格
- 自定义端点填 baseUrl 接 vLLM/ollama/LM Studio
- 1 个 verifier 测试所有渠道

### 3. 错误恢复
- `llmFallback.ts` 6 类错误分类 (network/rate_limit/auth/invalid/timeout/unknown)
- 自动重试 + 友好提示

### 4. LLM 日限
- write 20 / chat 50 / explain 30
- Settings 卡片显示用量

### 5. 间隔重复 FSRS 简化版
- 自实现 (WONTFIX 引入 fsrs npm, 怕依赖)
- 4 档评级: Again / Hard / Good / Easy

### 6. PDF 懒加载
- `pdfjs-dist@^6.1.200` (open source, 0 成本)
- 动态 import, 不增初始 bundle (~470KB 懒)
- `disableFontFace: true` 提速 3-5x

### 7. 静态审查 + 大 review
- 每次新版本: `verify-v*.mjs` (静态) + `review-v*.py` (P0/P1/P2)
- 每 N 版本累积: 大 review 修 5 维度遗留 (v1.6 修 13 bug / v1.22 修 18 处 catch any)

### 8. 单 producer 1d 干完 1-4d 计划
- 17 轮 (v1.7-v1.23) 稳定
- subagent 失败降级: 静态审查 + 单元测试 + 主人接管

## 数据规模

- **5334 高频词** + **465 词根** (80.4% 词根覆盖, Top 2k 86.3%)
- **13234 真实例句** + 5 场景 + 5 听力 + 100 每日一句
- **10 LLM** + **8 TTS** (含 4 口音) + **8 翻译** + **3 自定义端点**
- **11 单角色** + **3 多人场景** = 17 角色模式
- **8 主题** + **4 字号** + **2 语言** (中/英)
- **IDB v6** (9 表)

---

**最后更新**: 2026-07-27 (v1.58.0)
