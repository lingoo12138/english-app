# 更新日志

> 每次功能发布的变更记录

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
