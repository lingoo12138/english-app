# 句刻 · 即时英语学习 v1.0.0

> 让你在"想用英语的瞬间就能用上"——把英语嵌进真实生活场景里。
>
> **极简本地版** —— 无后端、无云服务、无账号,所有数据存在你本地的浏览器里。

[🌐 在线预览](https://lingoo12138.github.io/english-app/) ·
[📖 开发日志](./docs/DEV_LOG.md) ·
[🗺️ 路线图](./docs/ROADMAP.md) ·
[📝 更新日志](./docs/CHANGELOG.md) ·
[💬 AI 对话进阶需求](./docs/AI_CHAT_ROADMAP.md)

---

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

## 📊 累计数据(截至 v0.13)

- **13 页面 + 5 组件 + 4100+ 行代码**
- **5334 词 + 13234 例句 + 5 场景 + 30 每日一句**
- **7 翻译渠道 + 5 TTS 渠道 + 8 LLM 渠道 + 自定义端点**
- **73 个 bug 修复**(22 P0 + 23 P1 + 28 P2)
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
