# 句刻 · 即时英语学习 v1.8.0

> 让你在"想用英语的瞬间就能用上"——把英语嵌进真实生活场景里。
>
> **极简本地版** —— 无后端、无云服务、无账号,所有数据存在你本地的浏览器里。

[🌐 在线预览](https://lingoo12138.github.io/english-app/) ·
[📖 开发日志](./docs/DEV_LOG.md) ·
[🗺️ 路线图](./docs/ROADMAP.md) ·
[📝 更新日志](./docs/CHANGELOG.md) ·
[📦 v1.6.0 Release Notes](./docs/RELEASE_v1.6.0.md) ·
[📦 v1.8.0 Release Notes](./docs/RELEASE_v1.8.0.md) ·
[🔍 v1.6 Review Report](./docs/REVIEW_v1.6.md) ·
[💬 AI 对话进阶需求](./docs/AI_CHAT_ROADMAP.md)

---

## 🎯 当前进度 (v1.8.0)

✅ **11 个版本量产** (v1.1.0 ~ v1.8.0, 3 producer 并行 1d 干完 3d 计划)
✅ **164 单元测试 + 16 闭环集成测试** 全过 (104 → 164, +60)
✅ **0 关闭率** (0 P0/P1/P2) — v1.6/v1.7/v1.8 连续 3 个版本维持
✅ **性能优化** (Bundle 538KB → 64KB 入口, -54%, FCP 220→204ms)
✅ **词根 80.4% / Top 2k 86.3%** (134→465 已知词根)
✅ **LLM 杀手锏** (错题讲解 D2 + 短语用法 D3 + 语法讲解 v1.8-A, 复用 D1 错词入复习)
✅ **留存钩子** (成就墙 20 成就 + 学习卡分享 + 错词自动入复习 + **首启 onboarding** v1.8-A + **难度自适应 + 自由话题** v1.9.0)
✅ **真实 LLM e2e** (v1.8-B e2eTest + chatCompletionWithTimeout + OpenRouter 0 成本)
✅ **B 听力自适应** (v1.7.0 错题推课 + Daily 100 句)

### 已完成路线图

| 版本 | 主题 | 状态 |
|------|------|------|
| v1.1.0 | 0 关闭率 + 性能 + 闭环 + 单元 | ✅ |
| v1.1.1 | D1 错题个性化复习 | ✅ |
| v1.1.2 | F1 学习卡分享 | ✅ |
| v1.2.0 | D2 LLM 错题讲解 (杀手锏) | ✅ |
| v1.3.0 | F2 成就墙 (20 成就) | ✅ |
| v1.4.0 | A2 词根 80% | ✅ |
| v1.5.0 | D3 单词短语用法 | ✅ |
| v1.6.0 | 4 核心功能深 review bugfix (7 P1 + 6 P2) | ✅ |
| v1.7.0 | B 听力自适应 + LLM Tutor 2.0 + e2e (3 producer 并行) | ✅ |
| v1.8.0 | **🎓 首启 onboarding + ✨ 难度自适应 + 💬 自由话题** | ✅ |
| v1.9.0 | (含在 v1.8.0) 难度自适应 + 自由话题 | ✅ |


## ✨ v1.0.0 核心特性

### 📚 内容
- **5334 高频词** —— 涵盖 CET-4 / 高考 / CET-6 / 考研 / 初中 / 高中 / 日常 7 个学段
- **13234 个真实场景例句** —— 旅行/工作/生活/学习,平均 3 句/词,不是"how do you do"那种老掉牙
- **65% 词有词根词缀 (Top 2k 77%)分析** —— 看到词根,猜出意思
- **每词 3-5 个常用短语** —— 学单词更要学搭配
- **98% 词有音标** —— 英音/美音任选
- **30 天每日一句** —— 每天一句能直接用上的英语
- **5 个真实场景专题课** —— 餐厅点餐 / 问路 / 购物 / 办公职场 / 自我介绍

### 🛠️ 学习闭环
- 🔊 **真人发音(多渠道 8 个)** —— 浏览器内置 TTS / Edge TTS / Azure Speech / ElevenLabs / 百度智能云 / Google Cloud / 讯飞 WebSocket / 自定义端点
- 🎤 **跟读评测** —— 麦克风录音 + 音量/时长分析(诚实标注:仅基于音量时长,无法判断发音准确性)
- 🔤 **中英互译(多渠道 8 个)** —— MyMemory / 百度 / Google / 有道 / DeepL / 腾讯 / LLM 智能 / 自定义
- ⭐ **生词本** —— SM-2 间隔重复算法,科学复习
- 📕 **错题本** —— 自动识别反复记不住的词,一键掌握
- 📊 **学习日历** —— 直观看到自己坚持了多久
- 💬 **AI 对话陪练** —— 5 场景 × 6 难度(A1-C2),语音输入 + 历史搜索 + 导出/导入
- 📅 **每日学习计划** —— 7 天曲线 + 连续天数 + 智能选词(复习/收藏/新词)
- 📈 **学习报告** —— AI 对话词汇统计 + 难度分布 + 14 天日历
- 🎴 **Anki 卡片复习** —— 翻卡 + 4 档 SM-2 评级(Again/Hard/Good/Easy)

### 🤖 AI 多渠道(10 个内置 + 自定义)
- **OpenRouter** —— 通用聚合,gemini-2.5-flash:free
- **OpenAI** —— gpt-4o-mini 等
- **硅基流动** —— Qwen2-VL 国产免费
- **DeepSeek** —— deepseek-chat/reasoner
- **智谱 GLM** —— glm-4-flash/vision
- **阿里云百炼** —— qwen-turbo/vl-plus
- **Google AI Studio** —— Gemini 2.0 Flash 免费
- **Mistral AI** —— mistral-large-latest
- **自定义端点(LLM/TTS/翻译)** —— 对齐 OpenAI 协议,支持任意内网/自部署服务
- **Anthropic Claude** —— via OpenRouter 中转
- **🧪 Mock 模拟** —— 零成本测试,适合流程跑通

所有 LLM 走统一 OpenAI 协议(chat/completions 风格),**支持自定义端点**填 baseUrl 接 vLLM/ollama/LM Studio/各类代理。

### 💬 AI 对话陪练(5 场景 × 6 难度)
- 🏪 咖啡店 / ✈️ 机场 / 🛍️ 购物 / 🏨 酒店 / 💼 会议
- 入门 A1 → 母语级 C2 共 6 个难度,自动调词语法
- 走 LLM 多渠道,Mock 渠道零成本测试
- 5 个进阶功能已记录在 [AI_CHAT_ROADMAP.md](./docs/AI_CHAT_ROADMAP.md)

### 📷 拍照识物
- 拍照或上传图片 → LLM 识别英文单词
- 自动匹配本地 5334 词库完整词条 + 3 句例句
- 一键收藏到生词本
- 支持提示词(找食物 / 找动物 / 找办公用品等)

### 🎨 个性化
- 🌈 6 套主题色(清新绿 / 海洋蓝 / 神秘紫 / 热情红 / 温暖橙 / 薄荷青)
- 📏 4 档字号(小 14px / 中 16px / 大 18px / 特大 20px) — 改 root font-size,所有 rem 元素跟随
- 🌙 暗色模式(独立 UI,系统对比度合规 WCAG AA)
- 🎯 7 学段筛选(小学 / 初中 / 高中 / 高考 / CET-4 / CET-6 / 考研 / 日常)
- 📱 移动端适配(iOS 安全区 + 底部 Tab + 灵动岛适配)

### 📊 学习数据
- 今日学词 / 累计学词 / 生词数
- 连续打卡 / 累计打卡
- 每日一句 30 天循环
- 7 学段数据统计

---

## 🏗️ 技术架构

```
Vite + React 18 + TypeScript + Tailwind + Zustand + Dexie
├─ PWA 离线(vite-plugin-pwa,30 天 CacheFirst)
├─ 主题:CSS 变量驱动,6 主题 0 延迟切换
├─ 数据:IndexedDB 本地存储(零云)
└─ 多 LLM/TTS/翻译渠道:统一抽象 + 独立 verifier 保障质量
```

### 关键模块

```
src/
├─ lib/
│  ├─ providers/llm.ts      8 个 LLM 渠道 + 统一 OpenAI 协议
│  ├─ tts.ts                5 个 TTS 渠道(浏览器/Edge/Azure/ElevenLabs/自定义)
│  ├─ translate.ts          7 个翻译渠道
│  ├─ aiChat.ts             AI 对话陪练
│  ├─ imageRecog.ts         拍照识物
│  ├─ recorder.ts           跟读录音
│  ├─ db.ts                 IndexedDB + 离线数据
│  ├─ themes.ts             6 主题 + 4 字号
│  └─ words.ts              词库加载
├─ pages/ (14 个)
│  ├─ Home / WordList / WordDetail
│  ├─ DailyPage / Translate / Notebook / WeakWords
│  ├─ ReviewCenter / Settings
│  ├─ Scenes / SceneDetail
│  └─ Camera / AIChat [v0.9+]
└─ components/ (5 个)
   ├─ Layout / TTSButton
   ├─ WordCard / StudyCalendar
   └─ PronunciationPractice
```

---

## 📊 当前进度(2026-07-22)

**版本**: v1.0.0
**代码量**: 4800+ 行 / 90+ commit
**新增 (v1.0.0)**: 全模块静态审查 + 5 P1 修复 + 单元测试 18 个 + P2 收尾 + a11y + 数据迁移 (导出/导入) + iOS PWA 完整化 + 集成测试 5 闭环
**新增 (v0.22.5-v0.22.8)**:
- 每日学习计划(7天曲线 + 连续天数)
- AIChat 历史搜索 + 场景过滤
- AI 对话导出/导入 + 单条导出
- 静态审查 6 P1 修复

**功能模块**:
- ✅ 14 页面 + 5 组件
- ✅ 8 LLM / 8 TTS / 8 翻译 + 3 类自定义端点
- ✅ AI 对话(5 场景 × 6 难度 + 语音输入 + 历史搜索 + 导出/导入 + 学习报告)
- ✅ 跟读评测(3 维度评分) + 拍照识物
- ✅ SM-2 间隔重复 + 主题/字号 + PWA 离线

**累计修复**: 89+ P0/P1/P2 bug

[更新日志](./docs/CHANGELOG.md) · [开发日志](./docs/DEV_LOG.md) · [路线图](./docs/ROADMAP.md)

---



## 📊 v1.1.0 - 0 关闭率 (2026-07-23)

✅ **0 P0 + 0 P1 + 0 P2** 全清
✅ **15 闭环** (5→15) + **30 单元测试** (18→30)
✅ **性能优化** Bundle 538KB → 入口 64KB (-54%), FCP 220→204ms
✅ 共享 `Modal` + `Toast` 组件 (替代 alert/confirm 28 处)
✅ 19 路由 `React.lazy()` 按需加载



## 🎯 v1.1.1 - 错题个性化复习 (2026-07-23)

✅ **错过的词自动入 Anki 复习** (零摩擦)
✅ 写错/AI 错 → 自动加生词本
✅ ErrorsPage 一键全部加复习
✅ 单元测试 30→**42** (+12)
✅ 闭环 15/31 + 回归全过



## 📤 v1.1.2 - 学习卡分享 (2026-07-23)

✅ **学习海报分享** (3 风格: 简洁/渐变/复古)
✅ Home 顶部 "📤 分享" 按钮
✅ ShareModal 3 步: 选风格 → 预览 → 复制
✅ 📱 长按/💻 右键保存 + 📋 复制分享文本
✅ 单元测试 42→**47** (+5)
✅ 闭环 15/31 + 回归全过



## 📚 v1.2.0 - LLM 错题讲解 (2026-07-23) - 杀手锏

✅ **错题一键讲解** (LLM 让你真懂)
✅ WritePage/AIChat/ErrorsPage 3 处 "📚 解释" 按钮
✅ 协议: rule (规则) + examples (例句) + mnemonic (口诀)
✅ IndexedDB 缓存 (errorExplanations 表) — 省 LLM 成本 + 离线可用
✅ Mock 渠道 fallback (无 API 也能用)
✅ 单元测试 47→**57** (+10)
✅ 闭环 15/31 + 回归全过



## 🏆 v1.3.0 - 成就墙 (2026-07-24) - 留存

✅ **20 成就 × 4 类** (连续/词量/错题/收藏)
✅ /achievements 页面 (渐变进度 + 解锁动画)
✅ Home 顶部 "🏆 成就 N/20" 入口
✅ ShareCard 海报加 "已解锁 N 个成就"
✅ 解锁动画 (bounce + glow)
✅ 单元测试 57→**72** (+15)
✅ 闭环 6/6 新增 (verify-v1.3-f2.mjs)



## 🌱 v1.4.0 - 词根 80% (2026-07-24) - 数据扩展

✅ **词根覆盖率 80%+** (5334 词 80.4% 有词根)
✅ Top 2k **86.3%** (1726/2000)
✅ 已知词根 **134 → 465** (+331)
✅ 30 suffix 变体 + 25 短 suffix + 15 prefix
✅ 单元测试 72→**78** (+6)
✅ 闭环 16/37 回归全过



## 💡 v1.5.0 - 单词短语用法 (2026-07-24) - LLM Tutor 2.0

✅ **单词 AI 推荐短语** (3-5 个常用搭配)
✅ WordDetail "💡 AI 短语用法" 按钮
✅ 复用 IndexedDB 缓存 (`usage::${word}`)
✅ Mock fallback (无 API 也能用)
✅ 单元测试 78→**82** (+4)
✅ 闭环 16/37 回归全过

详情见 [CHANGELOG](./docs/CHANGELOG.md#v150---2026-07-24)



## 🐛 v1.6.0 - 4 核心功能深 review (2026-07-24) - Bugfix

✅ **4 核心功能 2044 行 code review**: WritePage 写作批改 / AIChat 对话 / ListenPage 听力 / ErrorExplainButton 错题讲解 / UsageButton 短语用法
✅ **修复 13 个真 bug** (7 P1 + 6 P2)
✅ **0 P0 + 0 P1 + 0 P2 静态审查** (含 as any 豁免规则)
✅ 单元测试 82→**104** (+9: getOrCreateExplanation 缓存 / 解析失败 tip / lesson 切重置 / 截断变量 / 500 字符限制 / STT 累积 / parseResult JSON/fence 解析)
✅ typecheck 0 错误 + build pass

### 修复的 P1 (7 个,必修)

| # | 模块 | Bug | 影响 |
|---|------|-----|------|
| 1 | 写作批改 | 切回 '批改' tab 重置 input/result | **用户输入文本丢失** |
| 2 | 写作批改 | handleHistoryItem 设置 input/result 被 useEffect 覆盖 | **加载历史无效** |
| 3 | 听力 DictationMode | 切 lesson 听写答案残留 | 旧课答案污染新课 |
| 4 | 听力 QuestionsMode | 切 lesson 答案残留 | 同上 |
| 5 | 错题讲解 | setLoading(true) 缺失 | 按钮不显示加载状态 |
| 6 | 短语用法 | setLoading(true) 缺失 | 同上 |
| 7 | AI 对话 | STT 累积 input 无 MAX_LEN | 说话久了 input 超 token |

### 修复的 P2 (6 个,选修)

- 写作批改: 截断 500 字符时旧 input 仍发 LLM (用 text 变量修复)
- 听力: handlePlay 重复点击 (加 if playing return)
- 短语用法: 缓存解析失败 tip 显示 JSON 字符串 (改 "暂无数据")
- 写作批改 + AI 对话: 3 处 `catch (e: any)` 改 `unknown + Error 守卫`
- 写作批改 parseResult: `(e: any)` 参数 + 类型断言改 `unknown + WritingErrorType` 类型

详情见 [v1.6 Release Notes](./docs/RELEASE_v1.6.0.md) · [v1.6 Review Report](./docs/REVIEW_v1.6.md)

详情见 [CHANGELOG v1.4.0](./docs/CHANGELOG.md#v140---2026-07-24)

详情见 [CHANGELOG v1.3.0](./docs/CHANGELOG.md#v130---2026-07-24)

详情见 [CHANGELOG v1.2.0](./docs/CHANGELOG.md#v120---2026-07-23)

详情见 [CHANGELOG v1.1.2](./docs/CHANGELOG.md#v112---2026-07-23)

详情见 [CHANGELOG v1.1.1](./docs/CHANGELOG.md#v111---2026-07-23)

详情见 [CHANGELOG v1.1.0](./docs/CHANGELOG.md#v110---2026-07-23)



## 🎓 v1.7.0 - B 听力自适应 + LLM Tutor 2.0 + e2e (2026-07-24) - 3 producer 并行

✅ **🎧 听力自适应**: ListenPage 顶部 "🎯 为你推荐" 卡片, 错词命中排序
- `listeningRecommend.ts`: extractLessonKeywords + calculateLessonScore + recommendLessons
- 已完成课降权 score * 0.3, score > 0 才返回, Top 3 截断
- visibilitychange 监听 (回前台重算)

✅ **📖 D3 LLM Tutor 2.0 完整版 (语法讲解)**: WordDetail "AI 语法讲解" 卡片
- `explainGrammar`: 定义 + 用法 + 3 例句 + 易错点对比
- 8 词性 mock fallback (noun/verb/adj/adv/prep/conj/article/pronoun)
- `GrammarButton` 组件 (复用 UsageButton 模式 + setLoading(true) 修复)

✅ **🔌 LLM 端到端测试**: `e2eTest` + `chatCompletionWithTimeout` (10s AbortController)
- mock LLM 探测消息快速返回 "OK" (e2e 优化)
- 不抛错, 永远返回 {ok, latencyMs, content?, error?}

📊 **104 → 126 单元测试** (+22)
✅ **0 P0 + 0 P1 + 0 P2** 维持

详情见 [CHANGELOG v1.7.0](./docs/CHANGELOG.md#v170---2026-07-24)



## 🎓 v1.8.0 - 首启 onboarding + 难度自适应 + 3 小优化 (2026-07-24) - 3 producer 并行

✅ **🎓 首启 onboarding** (留存修复, W9 团队推荐):
- `Onboarding.tsx` (513 行): 3 步引导 (选学段 / 跟读 / 加生词本)
- localStorage.onboarded 标记, 只显示一次
- Home CTA "👋 第一次来? 跟我 5 分钟了解"
- Settings "🔄 重新看引导" 按钮
- 17 单元测试

✅ **✨ v1.9.0 难度自适应 + 💬 自由话题** (AI 对话扩展, W10 团队推荐):
- `assessUserLevel(messages)`: 词数 + 从属连词加 1 档
- `truncateCustomTopic(topic, maxLen=200)`: 截断 + Unicode 省略号
- `buildSystemPrompt` 用 effectiveLevel = dynamicLevel || level
- "✨ 自动" 切换 + "💬 自由话题" 按钮 + 200 字符 modal
- 10 单元测试

✅ **🆓 OpenRouter 0 成本** (3 个小优化):
- OpenRouter defaultModel: `google/gemini-2.5-flash:free`
- Settings 渠道卡片 "🆓 0 成本" 标签

✅ **📅 C4 Daily 100 句**: 30 → 100 句 (10 场景: 旅行/工作/生活/学校/购物/健康/餐厅/酒店/机场/日常)
- 旧 30 句保留 (向后兼容)
- id 1-100 唯一

✅ **🎤 C8 WordDetail 跟读**: "🎤 跟读" 按钮 + 复用 PronunciationPractice 弹窗

🐛 修 3 处历史遗留 `: any` (v1.5 review 漏修): aiChat.ts + llm.ts 改 unknown + Record

📊 **126 → 164 单元测试** (+38)
✅ **0 P0 + 0 P1 + 0 P2** 维持
✅ 25 闭环验证 + 13 修复点

详情见 [CHANGELOG v1.8.0](./docs/CHANGELOG.md#v180--v190---2026-07-24)

## 🚀 快速开始

```bash
npm install
npm run dev      # 开发模式
npm run build    # 生产构建 → dist/
npm run preview  # 预览 dist
```

### 添加新词
编辑 `scripts/expand-examples.mjs`,运行后 `public/data/words.json` 自动更新。

### 部署到 GitHub Pages
1. push 到 main
2. GitHub Actions 自动 build + deploy(workflow `.github/workflows/main.yml`)

---

## 📊 累计数据(截至 v1.8.0)

- **20 页面 + 22 组件 + 25 库 + 8500+ 行代码**
- **5334 词 + 13234 例句 + 5 场景 + 5 听力 + 100 每日一句**
- **465 词根 (全量 80.4% / Top 2k 86.3%)**
- **10 LLM (含 OpenRouter free) + 8 TTS + 8 翻译 + 3 自定义端点**
- **20 成就 (连续/词量/错题/收藏) + 8 主题/字号 + 7 学段筛选 + 3 步 onboarding**
- **164 单元测试 + 16 闭环 (37 测试点) + 0 P0/P1**
- **首启 onboarding + 难度自适应 + 自由话题 + LLM e2e + B 听力自适应**
- **102+ bug 修复**(22+ P0 + 23+ P1 + 28+ P2 + 13+ v1.6 review + 3+ v1.8 遗留 : any)
- **210+ commit / 10 release tag (v1.0.0 ~ v1.8.0)**
- **零付费依赖**(完全本地 + 公共 API + 免费层 LLM)

---

## 🤝 贡献

这是一个个人项目,但欢迎:
- 提 Issue 报 bug 或建议
- Fork 后改造成自己的版本
- 学习代码结构(架构清晰可读)

---

## 📄 License

MIT
