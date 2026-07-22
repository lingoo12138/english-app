# 句刻 v0.22.8 现状盘点报告

> 盘点时间: 2026-07-22
> 版本: v0.22.8 (commit 99ddd8b)
> 代码: 10181 行 / 51 个 TS/TSX 文件

## 1. 页面(15 个)

| 路径 | 用途 | 行数 |
|------|------|------|
| `pages/Home.tsx` | 首页 + 今日学习计划卡片 | 328 |
| `pages/WordList.tsx` | 词库列表(字母索引 + 搜索 + 无限滚动) | 297 |
| `pages/WordDetail.tsx` | 词详情(音标/释义/例句/跟读) | 290 |
| `pages/WordDetail` 邻居 | 字母顺序前/后词 | - |
| `pages/DailyPage.tsx` | 每日一句场景卡 | 105 |
| `pages/Translate.tsx` | 中英翻译(8 渠道) | 159 |
| `pages/Notebook.tsx` | 生词本(按字母分组/批量管理) | 273 |
| `pages/ReviewCenter.tsx` | SM-2 间隔重复复习 | 241 |
| `pages/WeakWords.tsx` | 错题本(薄弱词标记掌握) | 233 |
| `pages/Scenes.tsx` | 5 场景专题课列表 | 65 |
| `pages/SceneDetail.tsx` | 场景对话演练 | 295 |
| `pages/Camera.tsx` | 拍照识物(LLM vision) | 306 |
| `pages/AIChat.tsx` | AI 对话陪练 + STT + 历史搜索 + 导出 | 500 |
| `pages/PlanPage.tsx` | 7 天学习曲线 + 连续天数 | 213 |
| `pages/LearnReport.tsx` | AI 对话词汇统计报告 | 265 |
| `pages/Settings.tsx` | 设置(8 子组件) | 35 |

## 2. 组件(5 + 8 Settings 子)

**核心组件(5)**:
- `Layout.tsx` — 侧栏 + 底部 tab + 暗色
- `TTSButton.tsx` — 语音朗读按钮(tts-end/tts-error 监听)
- `WordCard.tsx` — 词卡(收藏切换 + 跳转 + 自动 markPlanWord)
- `StudyCalendar.tsx` — 学习日历热力图
- `PronunciationPractice.tsx` — 跟读练习(3 维度评分 + 波形)

**Settings 子组件(8)**:
- `PreferencesSection` — 目标学段 + 每日目标
- `TTSSection` — 主 TTS + 5 内置 Key + 自定义 TTS
- `TranslateSection` — 翻译 + 自定义翻译
- `LLMSection` — LLM + 自定义 LLM
- `AppearanceSection` — 主题色 + 字号 + 暗色
- `DataManagementSection` — 清空生词/错题/所有
- `AIChatDataSection` — 导入/清空 AI 对话
- `CustomForms` — 3 个 AddCustom 表单

## 3. lib 模块(16 个)

| 模块 | 行数 | 核心导出 |
|------|------|----------|
| `lib/words.ts` | 89 | `loadWords` / `getWord` / `searchWords` / `LEVELS` |
| `lib/db.ts` | 226 | Dexie 7 表(favorites/records/reviews/pronunciationAttempts/chats...) |
| `lib/tts.ts` | 848 | 8 渠道 + 统一接口 + `createCustomTTSProvider` |
| `lib/translate.ts` | 527 | 8 渠道 + 统一接口 + `createCustomTranslateProvider` |
| `lib/providers/llm.ts` | 359 | 10 LLM 渠道 + `createCustomLLMProvider` |
| `lib/aiChat.ts` | 85 | `chat()` 走 LLM provider |
| `lib/recorder.ts` | 402 | 麦克风录音 + 音量/时长分析 |
| `lib/stt.ts` | 132 | Web Speech API(STT) |
| `lib/imageRecog.ts` | 182 | 图片 base64 + LLM vision |
| `lib/plan.ts` | 190 | 每日学习计划(智能选词 + 进度) |
| `lib/learnReport.ts` | 172 | 学习报告(词汇统计 + 难度分布) |
| `lib/streak.ts` | 88 | 学习 streak 计算 |
| `lib/themes.ts` | 152 | 主题色 + 字号 |
| `lib/daily.ts` | - | 每日一句 |
| `lib/export.ts` | 95 | CSV/JSON 导出 + `exportFullBackup` |
| `lib/exportChat.ts` | 100+ | AI 对话导出/导入(JSON) |
| `lib/utils.ts` | 27 | 时间格式化 + `getPageTitle` |
| `data/scenes.ts` | 398 | 5 场景对话数据 |

## 4. AI 渠道

| 类别 | 内置数 | 自定义 | 协议 |
|------|--------|--------|------|
| **LLM** | 10 | ✅ | OpenAI 兼容 |
| **TTS** | 8 | ✅ | HTTP POST(text/voice/rate) |
| **翻译** | 8 | ✅ | HTTP POST(text/from/to) |
| **STT** | 1(Web Speech API) | ❌ | 浏览器原生 |

**10 LLM**: OpenRouter / OpenAI / Anthropic / 硅基流动 / DeepSeek / 智谱 GLM / 阿里云百炼 / **Google AI Studio (Gemini)** / **Mistral AI** / Mock
**8 TTS**: 浏览器 / Mock / Edge (WebSocket+SSML) / Azure Speech / ElevenLabs / 百度智能云 / Google Cloud / 讯飞 (WebSocket+HMAC)
**8 翻译**: MyMemory / 百度 / LLM / Google / 有道 / DeepL / **腾讯云** / Mock

## 5. 数据存储

**IndexedDB** (Dexie, 7 表):
- `favorites` — 收藏 wordId + addedAt
- `records` — 学习行为(view/favorite/unfavorite/known/unknown)
- `reviews` — SM-2 复习计划(wordId, nextReview, ease, interval)
- `pronunciationAttempts` — 跟读尝试
- `chats` — AI 对话场景
- (其他元表)

**localStorage** (Zustand persist):
- `english-app-settings-v2` — 所有设置
- `english-app-stats` — 学习统计
- `plan-progress-YYYY-MM-DD` — 每日学习计划进度
- `chats` 自动 IndexedDB 持久

## 6. PWA 能力

- vite-plugin-pwa
- registerType: autoUpdate
- CacheFirst 词库(30 天 → 7 天,v0.22.2 改)
- 词库版本化:`word-data-cache-v1`(升时改 v1→v2 自动作废)
- Service Worker 自动更新
- 离线浏览已学内容

## 7. 代码量统计

- **总代码行**: 10,181
- **总 TS/TSX 文件**: 51
- **平均文件行**: 200
- **最大文件**: tts.ts (848) / PronunciationPractice.tsx (665) / translate.ts (527)
- **零付费依赖**: React 18 / TypeScript / Tailwind / Zustand / Dexie / vite-plugin-pwa / blueimp-md5

## 8. 已知功能限制

1. **离线时 AI 对话** — 没 AI key 就只能 Mock
2. **拍照识物** — 必须有 vision LLM key(Gemini 2.0 Flash 实验版免费)
3. **腾讯翻译** — 走 Web Crypto TC3-HMAC-SHA256(浏览器)
4. **GitHub Pages 偶发 CDN 限流** — 之前测试发现 ssl reset
5. **subagent 审查** — token 限流时常发生,降级为静态审查
6. **iOS Safari 跟读** — MediaRecorder 兼容性问题
7. **Mistral 不支持 vision** — 选时已有警告
8. **无后端** — 数据全本地,跨设备需手动导出/导入
9. **依赖 Google Fonts CDN 离线时无字体**

## 核心发现

这个项目实际复杂度远超"个人背单词 App":
- **多模态**: 文本 + 语音(STT/TTS) + 图像(拍照)
- **多渠道架构**: 26 个 AI 渠道(10 LLM + 8 TTS + 8 翻译),走统一 OpenAI 协议
- **完整学习闭环**: 学 → 测(跟读) → 复习(SM-2) → 错题 → 报告 → 计划
- **数据本地优先**: IndexedDB + localStorage,无后端,零付费
- **工程化成熟**: PWA + 缓存版本化 + GitHub Actions + SPA fallback + i18n 就绪

**真正的亮点**: 用户能从"看到/听到"一个英语,到"说出来/记住/用起来"形成完整闭环,而且**一分钱不花**(全部免费层 + 零付费依赖)。
