# ✨ 句刻 · 核心特性

> 详细版本变更请看 [CHANGELOG.md](./CHANGELOG.md) · 本页只描述"产品功能全貌"

## 📚 内容

- **5334 高频词** —— 涵盖 CET-4 / 高考 / CET-6 / 考研 / 初中 / 高中 / 日常 7 个学段
- **13234 个真实场景例句** —— 旅行/工作/生活/学习,平均 3 句/词,不是"how do you do"那种老掉牙
- **80.4% 词有词根词缀 (Top 2k 86.3%)分析** —— 看到词根,猜出意思
- **每词 3-5 个常用短语** —— 学单词更要学搭配
- **98% 词有音标** —— 英音/美音任选
- **30 天每日一句** —— 每天一句能直接用上的英语
- **5 个真实场景专题课** —— 餐厅点餐 / 问路 / 购物 / 办公职场 / 自我介绍
- **5 个听力专题** —— 数字 / 机场 / 酒店 / 餐厅 / 商务
- **465 词根专题** —— 词根树 + 同源词

## 🛠️ 学习闭环

- 🔊 **真人发音 (多渠道 8 个)** —— 浏览器内置 TTS / Edge TTS / Azure Speech / ElevenLabs / 百度智能云 / Google Cloud / 讯飞 WebSocket / 自定义端点
- 🎤 **跟读评测** —— 麦克风录音 + 音量/时长分析 (诚实标注:仅基于音量时长,无法判断发音准确性)
- 🔤 **中英互译 (多渠道 8 个)** —— MyMemory / 百度 / Google / 有道 / DeepL / 腾讯 / LLM 智能 / 自定义
- ⭐ **生词本** —— FSRS (简化版) 间隔重复算法,科学复习
- 🏷️ **生词本标签** —— 7 类启发式 + 自定义 tag + 复习按 tag 过滤
- 📕 **错题本** —— 自动识别反复记不住的词,一键掌握
- 📊 **学习日历** —— 月历热力图 + 月份切换 + 统计卡片
- 💬 **AI 对话陪练** —— 5 场景 × 6 难度 (A1-C2) + **8 角色** (面试官/咖啡师/前台/导游/服务员/医生/银行柜员/警察)
- 🎤 **STT 语音输入** + 难度自适应 + 自由话题 + 错误恢复
- 📅 **每日学习计划** —— 7 天曲线 + 连续天数 + 智能选词
- 📈 **学习报告** —— AI 对话词汇统计 + 难度分布 + 14 天日历
- 🎴 **Anki 卡片复习** —— 翻卡 + 4 档评级 (Again/Hard/Good/Easy)
- 📝 **自定义场景课** —— 粘贴文本 / 上传 .txt / .md / **PDF** → AI 提取生词 → 卡片流 → 加入复习队列
- 📤 **生词本批量操作** —— 一键入复习 / 导出 CSV / 全选/反选

## 🤖 AI 多渠道 (10 个内置 + 自定义)

- **OpenRouter** —— 通用聚合, gemini-2.5-flash:free
- **OpenAI** —— gpt-4o-mini 等
- **硅基流动** —— Qwen2-VL 国产免费
- **DeepSeek** —— deepseek-chat/reasoner
- **智谱 GLM** —— glm-4-flash/vision
- **阿里云百炼** —— qwen-turbo/vl-plus
- **Google AI Studio** —— Gemini 2.0 Flash 免费
- **Mistral AI** —— mistral-large-latest
- **自定义端点 (LLM/TTS/翻译)** —— 对齐 OpenAI 协议,支持任意内网/自部署服务
- **Anthropic Claude** —— via OpenRouter 中转
- **🧪 Mock 模拟** —— 零成本测试,适合流程跑通

所有 LLM 走统一 OpenAI 协议 (chat/completions 风格), **支持自定义端点**填 baseUrl 接 vLLM/ollama/LM Studio/各类代理。

## 💬 AI 对话陪练

- 🏪 咖啡店 / ✈️ 机场 / 🛍️ 购物 / 🏨 酒店 / 💼 会议
- 入门 A1 → 母语级 C2 共 6 个难度,自动调词语法
- 8 个角色 (interviewer/barista/receptionist/tour_guide/waiter/doctor/banker/police)
- 错误恢复 (6 类错误分类: network/rate_limit/auth/invalid/timeout/unknown)
- LLM 日限 (write 20 / chat 50 / explain 30)
- 进阶需求池见 [AI_CHAT_ROADMAP.md](./AI_CHAT_ROADMAP.md)

## 📷 拍照识物

- 拍照或上传图片 → LLM 识别英文单词
- **7 场景 prompt 池**: general / office / food / animal / plant / furniture / tool
- 自动匹配本地 5334 词库完整词条 + 3 句例句
- 一键收藏到生词本
- 支持提示词 (找食物 / 找动物 / 找办公用品等)

## 🎨 个性化

- 🌈 8 套主题色 (清新绿 / 海洋蓝 / 神秘紫 / 热情红 / 温暖橙 / 薄荷青 / 樱花粉 / 商务灰)
- 📏 4 档字号 (小 14px / 中 16px / 大 18px / 特大 20px) — 改 root font-size,所有 rem 元素跟随
- 🌙 暗色模式 (独立 UI,系统对比度合规 WCAG AA, v1.39 加 stone 500/600 增强)
- 🌐 **中英双语 (v1.41)** — Settings 一键切换中文/English
- 🎯 7 学段筛选 (小学 / 初中 / 高中 / 高考 / CET-4 / CET-6 / 考研 / 日常)
- 📱 移动端适配 (iOS 安全区 + 底部 Tab + 灵动岛适配)
- 🏆 20 个成就徽章 (3 阶段:学习打卡/词汇量/连续天数)
- 📦 PWA 离线 (30 天 CacheFirst 缓存)

## 🏆 streak 里程碑 (v1.41 升级)

- 🌱 3 天起步
- 🔥 7 天周坚持
- ⚡ 14 天两周
- 🏆 30 天月度
- 💎 60 天双月
- 👑 100 天百日
- 🎉 365 天年度

## 📊 学习数据

- 今日学词 / 累计学词 / 生词数 / 错题数
- 连续打卡 / 累计打卡
- 每日一句 30 天循环
- 7 学段数据统计
- AI 对话词汇统计 + 难度分布
- 14 天学习日历 + 月历热力图

## 🔒 隐私

- **零后端 / 零云 / 零账号** —— 所有数据在你本地的 IndexedDB
- **导出/导入** —— JSON 格式,跨设备迁移
- **LLM 零成本优先** —— OpenRouter free 默认

---

**最后更新**: 2026-07-27 (v1.41.0)
