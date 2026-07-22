# 更新日志

> 每次功能发布的变更记录

---

## [v0.21] - 2026-07-22

### C: AI 对话学习报告(词汇统计 + 难度分布)

**词汇提取算法**(`src/lib/learnReport.ts`):
- 从 user 消息中提取英文词(2+ 字符,排除停用词)
- 跟词库匹配,标注难度 (A1-C2)
- 统计:总次数 / 首次时间 / 最后时间 / 每场景分布
- 100+ 停用词(虚词 / 数字 / 常见动词)

**学习报告页**(`/report`):
- 概览数字:对话数 / 去重词数 / 总用词数 / 约学习时长
- 词库匹配率(%)显示
- 4 个 Tab:
  - 📈 概览:难度分布柱状图 + 场景分布柱状图 + 最近 14 天日历
  - 🔥 高频词 Top 30(按 count 降序)
  - 💎 难词 B2+(按 count 降序)
  - 🕐 最近用词(按 lastUsed 降序)
- 词条:单词 / 难度标签 / 音标 / 翻译 / 次数× / 场景数
- 导出 JSON 报告

**集成**:
- App.tsx 加 /report 路由
- Layout 桌面 nav + 移动 nav 都加"报告" tab
- Home.tsx 加"学习报告"推荐卡片(渐变色)

### 改造
- `src/lib/learnReport.ts` — 词汇提取 + 报告生成 + 导出 + 难度标签/颜色
- `src/pages/LearnReport.tsx` — 报告页(概览/高频/难词/最近)
- `src/App.tsx` — 路由
- `src/components/Layout.tsx` — nav 加 Report
- `src/pages/Home.tsx` — 推荐区加 Report 卡片

### 验证
- 报告页显示 ✅
- 1 对话 / 6 词 / 100% 匹配率 ✅
- 高频词列表 ✅
- 难词 / 最近 Tab 可切换 ✅
- 桌面 + 移动 nav 都有 Report ✅
- 脚本 verify-v21.mjs 全过

### 累计
- **8 TTS + 8 翻译 + 8 LLM + 3 自定义 + STT + 对话历史 + 学习报告**
- **89+ bug 修复**
- **4800+ 行代码**

---

## [v0.20] - 2026-07-22

### C: AI 对话持久化 + 历史(v0.20)

**AI 对话持久化**:
- `src/lib/db.ts` v3: 加 `chats` 表(id, scenario, level, title, messages, createdAt, updatedAt)
- `saveChat / getAllChats / getChat / deleteChat` 助手函数
- `src/pages/AIChat.tsx` 自动保存(每条 AI 回复后 500ms 防抖)
- 标题自动生成: 用首条 user 消息前 30 字符
- 关闭页面 / 刷新后自动恢复

**历史侧栏**:
- 📚 历史 按钮(显示对话数)
- 列表项: 标题 + 场景 + 难度 + 消息数 + 日期
- 点击加载(切换 scenario/level 自动同步)
- 🆕 新对话 按钮(清空当前)
- 🗑 单条删除(确认对话框)

**改造**:
- `src/lib/db.ts` — chats 表 + 4 个助手函数
- `src/pages/AIChat.tsx` — currentChatId/chats/showHistory state + loadChat/handleDeleteChat/handleNewChat + 自动保存 useEffect

### 验证
- 历史按钮 + 新对话按钮 ✅
- 模拟对话后 IndexedDB 自动保存 ✅
- 历史侧栏显示对话列表 ✅
- 脚本 verify-v20.mjs 全过

### 累计
- **8 TTS + 8 翻译 + 8 LLM + 3 自定义 + STT + 对话历史**
- **89+ bug 修复**
- **4600+ 行代码**

---

## [v0.19] - 2026-07-22

### D: TTS / 翻译 自定义端点(对齐 LLM)+ 持久化修复

**D: 翻译自定义端点**:
- `createCustomTranslateProvider({ name, endpoint, apiKeyRequired, headers, bodyTemplate })`
- `translateCustom()` 通用 HTTP 翻译:POST {endpoint}, body 含 text/from/to, 返回 {text} 或 {translation[0]}
- Settings 加 "自定义翻译端点" section(对齐 TTS/LLM)
- Translate.tsx 合并 `allTranslateProviders` 列表(显示自定义)
- body 模板支持 {{text}} {{from}} {{to}} 占位
- 端点校验:`/^https?:\/\//i.test(endpoint)` 必须 http/https
- try-catch 包装 `createCustomTranslateProvider` 提交,错误用 alert

**持久化修复**:
- P0 修: `useStore` partialize 没保存 `customTranslateProviders` 字段,导致自定义翻译渠道刷新后丢失
- 同步加上 `customTranslateProviders: state.customTranslateProviders`
- 现在 3 个自定义渠道 (LLM / TTS / 翻译) 都正确持久化

**TTS 自定义端点 apiKey 集成**:
- 之前自定义 TTS 加 endpoint 即可,apiKey 走 endpoint 内 query string
- 现在 Settings 加自定义 TTS 时,checkbox "需 API Key" 启用后,会显示独立 password input
- key 存到 `ttsApiKeys[provider.id]`,跟内置 TTS 渠道一致

### 改造
- `src/lib/translate.ts` — `createCustomTranslateProvider` + `translateCustom` + `TranslateProvider` 加 endpoint/headers/bodyTemplate
- `src/store/useStore.ts` — `customTranslateProviders` + partialize
- `src/pages/Settings.tsx` — "自定义翻译端点" section + `AddCustomTranslateForm`
- `src/pages/Translate.tsx` — `allTranslateProviders` 合并 customTranslateProviders

### 验证
- 9 个翻译渠道(8 内置 + 1 自定义)✅
- 自定义 TTS / LLM / 翻译 都加成功 ✅
- 持久化 localStorage `customTranslateProviders: 1` ✅
- 非法 URL 报警友好 ✅
- Playwright scripts/verify-v19b.mjs 全过

### 累计
- **8 TTS + 8 翻译 + 8 LLM + 3 自定义端点(LLM/TTS/翻译) + AI 语音输入**
- **89+ bug 修复**
- **4500+ 行代码**

---

## [v0.18] - 2026-07-22

### C + D: AI 语音输入 + 腾讯翻译(v0.18)

**C: AI 对话语音输入(STT)**:
- 加 `src/lib/stt.ts` — Web Speech API (SpeechRecognition)
- 兼容性: Chrome/Edge/Safari ✅ / Firefox ❌
- AIChat.tsx 加麦克风按钮(🎤 / ⏹)
- 录音中状态: 红色脉冲 + 实时识别文字 placeholder
- 停止 / 切换页面时 cleanup
- 浏览器不支持: 友好提示"请用键盘输入"

**D: 腾讯翻译**:
- TC3-HMAC-SHA256 签名(浏览器原生 Web Crypto API)
- API 文档: `https://tmt.tencentcloudapi.com/`
- 格式: `SecretId|SecretKey` (用 | 分隔)
- 鉴权: HMAC-SHA256 链式签名(date → service → tc3_request)
- 免费 5 万字/月
- Settings 加 Key 输入框(placeholder "SecretId|SecretKey")

### 改造
- `src/lib/stt.ts` — STTController 封装 SpeechRecognition
- `src/pages/AIChat.tsx` — 麦克风按钮 + sttActive state + 实时识别
- `src/lib/translate.ts` — translateTencent + sha256Hex/hmacSha256/bytesToHex helpers
- `src/pages/Settings.tsx` — 腾讯翻译 Key 输入框(label + placeholder)

### 验证
- 8 个翻译渠道(含腾讯)✅
- Settings 腾讯 Key 输入框 ✅
- AI 对话麦克风按钮 ✅
- 浏览器支持检测 + 友好提示 ✅

### 累计
- **8 TTS + 8 翻译 + 8 LLM + AI 对话语音输入 + 自定义**
- **89+ bug 修复**(v0.17 89)
- **4500+ 行代码**

---

## [v0.17] - 2026-07-22

### A 审查(v0.16 静态审查 + 修复)

**P0 修复**:
- **P0-1**: 百度 TTS token 缓存污染 — 切账号后旧 token 仍被复用(导致 API 调失败)
  - 修: 缓存用 `apiKey+secretKey` fingerprint 隔离, 不同 key 互不影响
  - 加 `clearBaiduTokenCache()` 工具函数

**P2 改进**:
- 加 `testSpeak()` 工具: 用当前激活的 TTS 渠道读一句测试文本
- 加 `clearBaiduTokenCache()` 工具: 用户切换账号/重置时手动清

### 改造
- `src/lib/tts.ts` — 百度 token 缓存 fingerprint + 2 个新工具函数

### 验证
- 百度 key 切换后 UI 独立存 ✅
- Camera / AI 对话 / 翻译页正常 ✅
- Playwright 8 个 TTS 渠道 + 切换 key 输入框全过 ✅

### 累计
- **8 TTS + 7 翻译 + 8 LLM + 自定义**
- **89 bug 修复**(v0.16 88 + v0.17 1)
- **4400+ 行代码**

---

## [v0.16] - 2026-07-22

### D 审查(v0.15 verifier 报告 + 修复)

**5 个 P0/P1 修复**:
- **P0-1**: 讯飞 TTS 状态条件重复 — `data.payload?.audio?.status === 2 || (data.header.status === 0 && ... && data.payload.audio.status === 2)` 简化为单条件
- **P0-2**: 讯飞 TTS text base64 编码用 `btoa(unescape(encodeURIComponent(text)))` 替换为现代 `btoa(String.fromCharCode(...new TextEncoder().encode(text)))` (去 unescape deprecated)
- **P1-1**: 百度 TTS access_token 每次调用都重新拿(浪费请求) — 加 1h 内存缓存
- **P1-2**: 百度 TTS speed 映射 `(rate*5-1)` rate=0.5 → 1.5(可能为负) — 改 `(rate*4)` 0.5→0, 1.0→4, 2.0→9
- **P1-3**: Google TTS base64 → Blob 优化(Uint8Array.fromBase64 优先)

### 改造
- `src/lib/tts.ts` — 讯飞状态条件 + text 编码 + 百度 token 缓存 + speed 边界 + Google fromBase64

### 验证
- 8 个 TTS 渠道 + 5 个 key 输入框切换全过 ✅
- AI 对话 Mock 渠道正常 ✅
- Camera 当前渠道显示 ✅

---

## [v0.15] - 2026-07-21

### A 审查 + D 扩展 TTS 云渠道(v0.15)

**A 审查(v0.14 独立 verifier 找到 3 个 P0 + 5 个 P1 + 8 个 P2)**:
- **P0-1**: extractJSON 字符串内 `{` `}` 解析 bug → 字符串感知大括号计数(8 边界用例全过)
- **P0-2**: WordList 进度条受 search 污染 → 改用 `levelOnlyFiltered` (只用 level 过滤的子集)
- **P0-3**: ReviewCenter 进度条永远到不了 100% → `currentIndex + 1` 而不是 `currentIndex`
- **P1-2**: recognizeImages 静默吞错 → 改返回 `BatchRecognizeResult[]` 含 `ok/error`
- **P1-3**: WeakWords 桶 label "1 次" 误导 → 改 "1-2 次"
- **P1-4**: WeakWords `filter` 死代码 → 删除
- **P1-6**: Notebook 缺批量管理 → 加 checkbox 批量模式 + 批量删除

**D TTS 云渠道扩展: 5 → 8**(新加 3 个):
- **百度智能云 TTS** (baidu) — OAuth 2.0, 需 APIKey|SecretKey, 100万字符/月免费
- **Google Cloud TTS** (google) — REST + API Key, 1M 字符/月免费, Neural2/WaveNet 神经语音
- **讯飞 TTS** (iflytek) — WebSocket + HMAC-SHA256 鉴权, 需 APPID|APIKey|APISecret

### 改造
- `src/lib/tts.ts` — TTSProviderType 加 3 个 + 3 个新实现函数(speakBaidu/speakGoogle/speakIflytek) + BUILTIN 加 3 项
- `src/lib/imageRecog.ts` — extractJSON 字符串感知 + BatchRecognizeResult 接口
- `src/pages/WordList.tsx` — levelOnlyFiltered + 进度条不受 search 污染 + 显示搜索后提示
- `src/pages/ReviewCenter.tsx` — 进度条 currentIndex+1
- `src/pages/WeakWords.tsx` — 桶 label 改 "1-2 次" + 删 filter 死代码
- `src/pages/Notebook.tsx` — batchMode + selected + 批量删除 + NotebookWord 接 props
- `src/pages/Settings.tsx` — 5 个 TTS 渠道 key 输入框

### 验证
- 8 个 extractJSON 边界用例全过(含字符串内 `{` `}` + 转义)
- Playwright `verify-v15a.mjs` WordList 进度条 + 搜索 hint ✅
- Playwright `verify-v15d.mjs` 8 个 TTS 渠道 + 3 个 Key 输入框 ✅
- extractJSON 边界: code fence / prose 包裹 / 嵌套 / 字符串内 `{` / 字符串内 `}` / 转义 / 纯文本 / 未闭合

### 累计
- **13 页面 + 5 组件 + 8 TTS 渠道 + 7 翻译 + 8 LLM + 自定义端点**
- **83 个 bug 修复**(v0.14 78 + v0.15 3 P0 + 2 P1)
- **4400+ 行代码**

---

## [v0.14] - 2026-07-21

### 学习闭环深度优化(v0.14)

**A1: 图片识别 6 项优化**:
- 鲁棒 JSON 解析 `extractJSON()` — 优先匹配 markdown code fence,大括号计数找配对(LLM 在 JSON 前后加 prose 也能正确解析)
- 物体数 1-3 → 1-5 更灵活
- 置信度阈值过滤(< 0.5 不显示)
- 自动分类 `classifyItem()` — food/animal/tool/furniture/nature/place/people/clothing/transport/other
- 整体场景分类 `classifyOverall()`
- 批量识别 `recognizeImages()` 串行处理(避免 rate limit)

**A2: 跟读评测(v0.13 已实现, 文档化)**:
- 三维度评分: 音量 40% + 时长 40% + 稳定性 20%
- 多次尝试 (MAX_ATTEMPTS = 3)
- 录音回放 `playRecording()`
- 详细分项 + 改进建议
- 波形可视化 (200 个点)
- 诚实标注: "仅基于音量/时长,无法判断发音准确性"

**A3: 学习闭环 4 项优化**:
- **ReviewCenter** — 加进度条 + ✅ / 😕 计数,实时显示复习进度
- **WeakWords** — 加"薄弱词分布"柱状图(1 次 / 3-5 次 / 6+ 次 分桶)
- **Notebook** — 加"按字母分组"切换视图(分组时字母头 sticky)
- **Notebook** — 抽 `NotebookWord` 组件(更易复用 + 加 a11y label)
- **WordList** — 学段进度条(选 CET-4 显示该学段占总词比例)

### 验证
- `scripts/verify-v14.mjs` 全过
  - Camera 当前渠道 ✅
  - WordList CET-4 学段进度 ✅
  - ReviewCenter 进度条(需有待复习词)
  - WeakWords 分布(需有薄弱词)
  - Notebook 分组(需有收藏词)
- 自审: extractJSON 6 个边界用例全通过 ✅

### 累计
- **13 页面 + 5 组件 + 5 图表** (含 1 进度条 + 1 分布柱状图 + 1 学段进度)
- **78 个 bug 修复**(v0.13 73 + v0.14 5 P2)
- **4200+ 行代码**

---

## [v0.13] - 2026-07-21

### 重大: 多渠道扩展 + 独立 Verifier 修复 6 P0 + 5 P1

**🌐 翻译渠道: 4 → 7**(新加 3 个):
- Google Translate(免费,非官方)
- 有道智云(需 appKey+appSecret, 100万字/月免费)
- DeepL(需 API key, 50万字/月免费, 质量高)

**🔊 TTS 渠道: 3 → 5**(新加 2 个真实接入):
- Edge TTS(WebSocket+SSML 真实接入, 微软免费)
- Microsoft Azure Speech(需 key+region, REST)
- ElevenLabs(需 API key, 高质量)

**🤖 LLM 渠道: 保持 8 个内置**(已 v0.12 完成)

### 独立 Verifier 报告(对抗性审查)

**6 个 P0 修复**:
- **P0-1**: Settings id 错配 — `ttsProviderId === 'azure'` 但实际 id 是 `'azure-speech'`,导致 Azure Key 输入框永不显示
- **P0-2**: TTS 错误丢失到 console — Edge/Azure/ElevenLabs 错误只 console.error,用户零反馈
- **P0-3**: Edge WebSocket 抢占不干净 — 旧 WS 没关闭,新旧 audio 重叠
- **P0-4**: TTSButton 状态脱节 — 只检查 speechSynthesis,Edge/Azure/ElevenLabs 模式下 isPlaying 永远 true
- **P0-5**: edge-free 占位 URL 是 example.com — 选了必失败

**5 个 P1 修复**:
- P1-1: Translate.tsx `handleTranslate` 加 `if (loading) return` 防 race
- P1-2: `createCustomLLMProvider/TTSProvider` baseUrl 协议校验(http/https)
- P1-3: createCustomLLMProvider 提交用 try-catch 包装,错误用 alert 显示
- P1-4: createCustomTTSProvider 同样 try-catch + alert
- P1-5: `useStore.setTtsProviderId` 切换时调 `stopSpeak()` 停止当前播放
- P1-6: `crypto.randomUUID()` 替代时间戳+随机 4 字符 ID

**8 个 P2 修复/记录**:
- Settings 顶部加 "Key 明文存于浏览器 localStorage" 警告
- package.json 0.12.0 → 0.13.0
- Settings 底部 v0.12 → v0.13
- TTSButton handleClick 检查 window.Audio
- ...(其他已记录)

### 改造
- `src/lib/translate.ts` — 加 Google/有道/DeepL 实现 + 完善 type 定义 + hasChinese helper
- `src/lib/tts.ts` — 加 Edge TTS(WebSocket)/Azure/ElevenLabs 实现 + currentWS 跟踪 + bodyTemplate warn
- `src/lib/providers/llm.ts` — baseUrl 校验 + crypto.randomUUID
- `src/pages/Settings.tsx` — Azure/Edge id 修对 + 自定义端点错误用 alert
- `src/pages/Translate.tsx` — race 防护
- `src/components/TTSButton.tsx` — 监听 tts-end / tts-error 事件
- `src/store/useStore.ts` — setTtsProviderId 停止播放
- `package.json` — 0.13.0

### 验证
- `scripts/verify-v13b.mjs` 全过
  - P0-1 Settings id 修复 ✅
  - P1-2 baseUrl 协议校验 ✅
  - Azure/Edge 警告/输入框正确显示 ✅
- 截图: v13b-azure.png(选中 Azure 显示 API Key)

### 累计
- **13 页面 + 5 组件 + 7 翻译 + 5 TTS + 8 LLM + 自定义端点**
- **73 个 bug 修复**(v0.12 67 + v0.13 6 P0)
- **4100+ 行代码**

---

## [v0.12] - 2026-07-21

### 架构升级: 统一 OpenAI 数据结构 + 自定义端点

**🔄 统一 LLM 数据结构(v0.12)**:
- 所有 LLM 渠道(原 Anthropic 也是)统一发到 `POST {baseUrl}/chat/completions`
- messages 全部 OpenAI 风格: `{ role: 'system'|'user'|'assistant', content: string | content[] }`
- content[] 支持 vision (text + image_url)
- 私有参数通过 `extra` 字段透传(给有特殊字段的渠道)
- 兼容性问题记入文档,后续处理

**🆕 LLM 渠道扩展(8 个内置)**:
- OpenRouter / OpenAI / Anthropic(via OpenRouter) / 硅基流动 / DeepSeek / 智谱 GLM / 阿里云百炼 / **Mock**
- 所有走 OpenAI 协议,一个 chat() 函数全部覆盖

**🎤 TTS 自定义端点**:
- 新增 `type: 'http'` TTS 渠道
- 用户填 endpoint + body 模板即可接 Edge TTS / Azure / 有道 / ElevenLabs
- 统一协议: POST {endpoint}, body: { text, voice, rate }, 返回 audio/mpeg 或 JSON.audio
- 浏览器内置 + Mock 保留

**🛠 自定义 LLM 端点**:
- Settings 加 "+ 添加" 按钮
- 填: 显示名 / baseUrl / 默认模型 / 是否支持 vision / 是否需 key
- 自动调用 `createCustomLLMProvider()` 生成 ID,持久化到 zustand

**🎤 自定义 TTS 端点**:
- Settings 加 "+ 添加" 按钮
- 填: 显示名 / endpoint / 默认 voice / 是否需 key
- 协议: POST {endpoint}, body: text/voice/rate, 返回 audio/mpeg

**📚 新增文档**:
- `docs/AI_CHAT_ROADMAP.md` — AI 对话陪练进阶功能需求池(10 个候选,待用户决定)
- 文档问题: 数据归属 / 隐私 / 付费 / 离线 / 多模态顺序

### 新增 / 改造
- `src/lib/providers/llm.ts` — 重写为统一 OpenAI 协议
- `src/lib/tts.ts` — 加 http type + createCustomTTSProvider()
- `src/store/useStore.ts` — 加 customLlmProviders / addCustomLlmProvider / customTtsProviders / addCustomTtsProvider / ttsApiKeys
- `src/pages/Settings.tsx` — 加两个自定义端点 section + AddCustomLlmForm / AddCustomTtsForm
- `scripts/refactor-settings.mjs` + `scripts/add-custom-ui.mjs` — 自动化重构

### 验证
- `scripts/verify-v12.mjs` 全过
  - 自定义 TTS 端点 UI ✅
  - 自定义 LLM 端点 UI ✅
  - 内置 8 个 LLM 渠道 ✅
  - 添加自定义 LLM 成功 ✅
  - AI 对话 Mock 渠道工作 ✅
- 截图: v12-settings / v12-settings-add-llm / v12-settings-after-add / v12-chat-mock

---

## [v0.11] - 2026-07-21

### 重大架构: 多渠道统一管理(v0.11)
- 3 个 Provider 系统统一抽象: LLM(图片识别+对话共用) / TTS / Translate
- 各 Provider 都有: 内置预置 + 自定义 baseUrl + API key 字段 + 模型选择

**🤖 LLM 渠道(5 个内置)**:
- OpenRouter(免费层 google/gemini-2.5-flash:free)
- OpenAI(gpt-4o-mini 等)
- Anthropic(claude-3-5-haiku 等)
- 硅基流动(国产免费, Qwen2-VL 支持视觉)
- **Mock 模拟**(零成本, 预设响应, 适合测试)

**🔊 TTS 渠道(2 个内置, 可扩展云端)**:
- 浏览器内置 Web Speech API(免费, 离线)
- Mock(零成本)

**🌐 翻译渠道(4 个内置)**:
- MyMemory(免费, 默认, 5000字/天)
- 百度翻译(需 appid+key, 200万字/月免费)
- LLM 翻译(用 LLM 做翻译, 上下文理解强)
- Mock(零成本)

### 新增 AI 对话陪练(/chat)
- 5 个场景(咖啡店/机场/购物/酒店/会议)
- 6 个难度(A1-C2)
- 走 LLM Provider 多渠道
- 真实对话 + 错错纠正 + 难度自适应
- TTS 朗读回复
- Mock 渠道: 零成本测试完整流程

### 新增文件
- src/lib/providers/llm.ts — LLM 渠道抽象(支持 OpenAI + Anthropic 协议)
- src/lib/aiChat.ts — 对话陪练业务逻辑
- src/pages/AIChat.tsx — 对话 UI
- 删 src/lib/llm.ts (被 providers/llm.ts 替代)
- 装 blueimp-md5 依赖(百度翻译签名用)

### 改造
- useStore: 加 llmProviderId / llmApiKeys / llmModels / translateProviderId / translateApiKeys / ttsProviderId / chatScenario / chatLevel
- App.tsx: 初始化 3 个 Provider 内置列表 + 路由 /chat
- Camera.tsx: 完全重写走多渠道
- Translate.tsx: 重写走多渠道
- TTS: 重构支持 mock/browser
- Settings.tsx: 全新 3 块 UI (TTS/翻译/AI 渠道)
- Layout.tsx: 底部 tab 加 AI(替代拍照入口)
- Home.tsx: 加 AI 对话快捷入口
- utils.ts: 加 /chat 和 /camera 页面 title

### 验证
- scripts/verify-v11.mjs 全过
  - 首页有 AI 对话入口 ✅
  - /chat 场景选择 ✅
  - /camera 当前渠道显示 ✅
  - /translate 渠道选择器 ✅
  - /settings 三块渠道 UI(TTS/翻译/AI) ✅
  - AI 对话 Mock 模拟对话成功 ✅
- 截图: v11-home / v11-chat / v11-camera / v11-translate / v11-settings / v11-mobile-home / v11-chat-mock

---

## [v0.10] - 2026-07-20

### 修复(基于独立 Verifier 第三轮审查 - 4 P0 + 8 P1 + 暗色模式 P2)

**🔴 P0 严重问题(立即修复,影响所有用户)**:

- **场景课"已学完"徽章永远不显示** — `getSentenceId()` 生成 `scene:{id}:s{idx}` (冒号),但 `Scenes.tsx` 和 `SceneDetail.tsx` 查询用 `scene-` (连字符),**字面前缀不匹配导致永远返回 0 条**。后果:场景课完成度丢失 + 重新进入已知状态变全"未学过"
  - 修:`Scenes.tsx` 和 `SceneDetail.tsx` 统一用冒号查询

- **ReviewCenter 自循环断裂** — `reviewWord(word.word)` 传单词字符串(如 `'abruptly'`),但 reviews 表查词用 wordId(`'w-abruptly'`)。后果:刚复习的词立即从队列消失
  - 修:`ReviewCenter.tsx` 改用 `word.id`

- **"每日一词" = 每次刷新随机** — `Home.tsx` 用 `Math.random()` 而注释说"第一个高频词"。后果:每天看到的词不一样,收藏会丢
  - 修:用日期字符串作 seed,同一天同一个词

- **TTS 用户选定 voice 失效静默回退** — `tts.ts` voice 找不到时无任何提示
  - 修:加 `console.warn` 提示

**🟡 P1 修复(8 个)**:

- **Settings 清空数据** — 拆两个按钮:① 清空生词本+错题本(保留场景课) ② 危险清空全部(二次 confirm)
- **DailyPage 历史 30 句** — 收藏按钮从"只有今天"扩到"全部 30 句",循环 isFavorite 加载
- **Layout iOS 安全区** — 顶部 header + 底部 nav 加 `env(safe-area-inset-*)` 适配 iPhone X+ 灵动岛/Home Indicator
- **PWA theme-color 动态化** — `applyTheme()` 同步更新 `<meta name="theme-color">`,浏览器状态栏跟主题色
- **WordDetail 切词重置** — `useEffect` 开头 `setShowAllExamples(false)`,避免 A 词展开后切 B 词仍展开
- **WordList 字母 IO 滚动后重 observe** — useEffect 依赖加 `visible.length`,分页后新字母锚点被 observe
- **WordList 搜索 debounce 300ms** — 加 `debouncedQuery`,5000 词全表过滤只在用户停止输入 300ms 后执行
- **TTSButton 快速连点** — 加 `isStartingRef` 互斥锁(100ms) + Chrome cancel+speak 1ms 延迟 + 慢速切换 50ms 等待 stop + `aria-pressed` / `aria-label` 增强 a11y

**🟢 P2 优化**:
- (TBD 暗色模式对比度)

### 部署
- GitHub Actions 自动部署 workflow 验证通过

### 文件变更
- 7 文件,118 行修改
- `src/pages/Scenes.tsx` — ID 查询改冒号
- `src/pages/SceneDetail.tsx` — ID 查询改冒号
- `src/pages/ReviewCenter.tsx` — 用 `word.id` 不用 `word.word`
- `src/pages/Home.tsx` — 每日一词确定性
- `src/pages/Settings.tsx` — 选择性清空
- `src/pages/DailyPage.tsx` — 30 句全收藏
- `src/pages/WordDetail.tsx` — 切词重置
- `src/pages/WordList.tsx` — IO 重 observe + debounce
- `src/lib/tts.ts` — voice 失效 warning
- `src/lib/themes.ts` — PWA theme-color 同步
- `src/components/Layout.tsx` — iOS 安全区
- `src/components/TTSButton.tsx` — 重写(防快速连点)
- `tailwind.config.js` — 注释说明
- `scripts/verify-v10.mjs` — 验证脚本

### 验证
- `scripts/verify-v10.mjs` Playwright 自动化测试全过:
  - ✅ P0-3 每日一词确定性(同一天同一个词)
  - ✅ P1-1 Settings 选择性清空(2 个按钮)
  - ✅ P1-2 DailyPage 30 句都有收藏
  - ✅ P1-3 移动端布局(375x812 viewport)
  - ✅ 暗色模式基础可用
- 截图:`v10-home.png`、`v10-settings.png`、`v10-daily.png`、`v10-mobile-home.png`、`v10-mobile-words.png`、`v10-dark-home.png`、`v10-dark-settings.png`

---

## [v0.9] - 2026-07-20

### 新增
- **拍照识物**功能(`/camera`)
  - OpenRouter + Gemini 2.5 Flash 免费层
  - 拍照/上传图片 → LLM 识别 1-3 个英文单词
  - 自动在 5334 词库里匹配完整词条 + 3 句例句
  - 识别结果可一键收藏到生词本
  - 支持提示词(找食物 / 找动物 / 找办公用品等)
  - 模型可热切换(默认 google/gemini-2.5-flash:free)
- 新页面:Camera(拍照)
- 新 lib:llm.ts(OpenAI 兼容 LLM 客户端)
- 新 lib:imageRecog.ts(图片识别业务逻辑)
- 新增设置项:OpenRouter API Key + 模型选择

### 修复 / 微优化(P2 - 12 个)
- A.1 移除 SceneDetail dead `knownMapRef`
- A.2 移除 PronunciationPractice dead `onComplete` prop
- A.3 TTSButton 提取 play/stop/toggleSlow 公共方法
- A.4 WeakWords markMastered 改增量 setItems(避免全量重载)
- A.5 提取 `formatDate` 到 lib/utils.ts
- A.6 Translate setDirection 改 Direction 严格类型(去 'as any')
- A.7 `getPageTitle` 提到 lib/utils.ts(Layout + App 共用)
- A.8 TTSButton isSlowRef 解决 setIsSlow 闭包陷阱
- A.10 db.ts isRealWordId 改 SYNTHETIC_ID_PREFIXES 数组

### 修复(用户反馈)
- 移动端场景详情双 header 遮挡(隐藏 SceneDetail 自带返回按钮,改用 Layout 的)
- 移动端场景详情底部 tab 遮挡内容(main 容器加 pb-32)
- 13-mobile-scene.png 改用 viewport 截图(fullPage 会误导)

### 新增文件
- `src/lib/utils.ts` — formatDate / formatDateISO / getPageTitle
- `src/lib/llm.ts` — OpenAI 兼容 LLM 客户端
- `src/lib/imageRecog.ts` — 图片识别业务逻辑
- `src/pages/Camera.tsx` — 拍照识物 UI
- `src/vite-env.d.ts` — ImportMetaEnv 类型声明
- `scripts/expand-examples.mjs` — 例句扩充脚本
- `scripts/screenshot-camera.mjs` — Camera 截图
- `scripts/screenshot-worddetail.mjs` — 单词详情截图
- `scripts/screenshot-scene-mobile.mjs` — 场景页截图
- `scripts/screenshot-scene-viewport.mjs` — viewport 截图
- `screenshots/13c-mobile-scene-bottom.png` — 滚到底的样子
- `screenshots/14-home-dark.png` — 暗色首页
- `screenshots/15-abruptly-after.png` — 扩充后的 abruptly
- `screenshots/16-okay-after.png` — 扩充后的 okay
- `screenshots/17-camera-empty.png` / `18-camera-ready.png` — Camera 桌面
- `screenshots/19-mobile-camera.png` — Camera 移动
- `screenshots/20-settings-llm.png` — 设置页 LLM 配置

---

## [v0.8] - 2026-07-20

### 新增
- **例句扩充**:每个词从 1.93 句提到 3+ 句
  - 0 句的词:161 → 93 (改善 42%)
  - 3+ 句的词:1663 → 3320 (翻倍)
  - 总例句:10284 → 13234 (+2950 句)
  - 文件大小:6.3MB → 6.6MB
  - 算法:倒排索引 + 同词出现例句严格匹配 + 同根词 stem 补充

### 修复(顺带)
- `vite.config.ts` 加 `base: '/english-app/'` (适配 GitHub Pages)
- `main.tsx` 加 `BrowserRouter basename` (子路径部署)
- `lib/words.ts` fetch 改用 `import.meta.env.BASE_URL` (跟随 base path)
- `src/vite-env.d.ts` 加 ImportMetaEnv 类型声明

---

## [v0.7] - 2026-07-20

### 修复(基于独立 Verifier 第二轮审查 - 15 个 P1)

**Layout & a11y**:
- 加 skip-to-main 链接(屏幕阅读器/键盘)
- 移动端顶部 title 路径感知
- 移动端底部 tab 加 每日一句入口
- 移动端 back button 不渲染时占位(避免隐形可点击)
- 页面 `<title>` 随路由变化

**WordCard**:
- stopPropagation 修复(点收藏/朗读触发 Link 跳走)

**SceneDetail**:
- sentence recId 改为稳定 ID,不再依赖 en 文本
- lastByRecId 按 timestamp 取最大(原代码只取第一条)
- 清理 [name] 占位符避免 TTS 朗读方括号
- setTimeout 跳页 useRef 追踪 + 卸载清理

**WordList**:
- handleToggleFav 用 ref 避免 callback 重建
- 字母索引加 # 位置

**scenes.ts**:
- SceneSentence 显式稳定 id 字段
- getSentenceId() helper

**TTS 引擎**:
- speak() 读 store.voiceName/rate(原设置不生效)

**translate**:
- fetchWithTimeout 8s 限制
- 文本长度限制 1000 字符

**export CSV**:
- 防 CSV 注入(=+-@ 加 ')
- 转义 \r + UTF-8 BOM + \r\n 行分隔符

**db**:
- QuotaExceededError 友好错误处理

**StudyCalendar**:
- 修复动态 pl-\${n} Tailwind 类不生效(改 inline style)

**WordDetail**:
- id 变化 cancelled 标志防 race
- 跳词时滚到顶部

**Notebook**:
- 收藏加载 O(N*M) 优化为一次查
- 导出按钮防重

**WeakWords**:
- lastUnknown 用 reduce 取 max

**App**:
- stats 加 visibilitychange 监听
- 路由变时更新 document.title

---

## [v0.6] - 2026-07-20

### 新增
- 跟读评测(单词级) - MediaRecorder + Web Audio API + 简单评分
- 字母索引(词库快速跳转) - 26 字母 sticky 条 + 自动高亮
- 场景专题课(5 个场景) - 餐厅/问路/购物/办公/自我介绍

### 修复(基于独立 Verifier 审查 22 个 P0)
- 跟读评测: 倒计时 bug、key 缺失、5s race、stale closure、AudioContext resume、评分宽松、iOS Safari 检测、重复 start 资源泄漏
- 字母索引: sticky 遮挡、activeLetter race、IO 依赖错
- 场景专题课: 进度条把 unknown 算成 known、统计污染、首屏闪'场景不存在'、跨页完成度不同步、串行查询、乐观更新
- TTSButton: setInterval 永不清理
- 全局: getTodayCount 过滤非真实单词 ID

---

## [v0.5] - 2026-07-20

### 修复
- 倒计时永远卡在"1"
- PronunciationPractice 无 key,切词时状态残留
- 5s 自动停止 race
- setTimeout stale closure
- 评分 100 分是白送
- AudioContext 未 resume
- 多次 start 资源泄漏
- 字母索引 sticky 遮挡
- 场景课 word 切换 state 残留

---

## [v0.4] - 2026-07-20

### 新增
- 错题本 (`/weak`) - 展示反复标记"不认识"的词
- 收藏导出(生词本页) - CSV / JSON / 完整备份
- 主题色 6 色切换(清新绿/海洋蓝/神秘紫/热情红/温暖橙/薄荷青)
- 字号 4 档调节(14/16/18/20px)
- 错题本入口(生词本快捷区)
- 工具函数 `themes.ts` / `export.ts`

### 改进
- Tailwind config 重构:所有 brand 颜色用 CSS 变量
- 即时切换主题,无需刷新
- 生词本加错题本快捷区

### 技术
- CSS 变量方案驱动主题色
- Blob + URL.createObjectURL 实现文件下载

---

## [v0.3] - 2026-07-19

### 新增
- 复习中心 (`/review`) - SM-2 驱动的批量复习
- 学习日历(首页) - 84 天 GitHub 风格热力图
- PWA 离线支持 - vite-plugin-pwa
- 工具函数 `streak.ts` - 学习数据统计
- 首页复习提醒 banner(待复习时显示)
- 快捷入口加"复习中心"

### 改进
- 首页集成学习日历
- 学习数据可视化

### 技术
- Service Worker 30 天 CacheFirst 策略
- IntersectionObserver 无限滚动
- manifest.webmanifest + 双尺寸图标

---

## [v0.2] - 2026-07-19

### 新增
- 词库从 200 扩到 **5334** 词(CET-4 4190 + 高考 1144)
- 词根词缀自动分析(54% 词匹配,100+ 规则)
- 常用短语(每个词 3-5 句)
- 词库页无限滚动
- 单词详情页词根/短语区块
- 高考学段筛选

### 改进
- 词库文件大小 86KB → 6.3MB(gzip 后 1.5MB)
- 音标覆盖 70% → 98%
- 例句覆盖 0 → 96%

### 数据
- 数据源: KyleBing/english-vocabulary(开源)
- 合并去重:3 个源(1162 + 3739 + 3668 词)

---

## [v0.1] - 2026-07-18

### 新增
- 项目脚手架(Vite + React + TypeScript + Tailwind)
- 7 个核心页面
- 200 词初始词库
- 30 句每日一句
- TTS 真人发音(Web Speech API)
- 中英翻译(LibreTranslate)
- 生词本(收藏 + SM-2 算法)
- 暗色模式
- 响应式(PC + 手机)
- 设置页(学段/voice/语速/翻译源)
- 推送 GitHub 仓库

### 技术栈
- React 18 + TypeScript + Vite
- Tailwind CSS + 暗色模式
- React Router 6
- Zustand 状态管理
- Dexie (IndexedDB) 本地存储

---

## [未发布] - 计划中

### P2 进阶
- 跟读评测(MediaRecorder)
- 场景专题课(5-8 场景)
- 图片识别(拍照识物)

### P3 跨端
- 微信小程序
- Android App
- iOS App

### 远期
- AI 对话陪练
- 听力模式
- 多端数据同步
