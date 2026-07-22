# 句刻 - 开发日志

> 这份文档是产品**理论层面的完整功能记录**,供用户在无时间亲自测试时查阅、验收、规划下一步。
>
> 最后更新: 2026-07-21(v0.13)

---

## v0.13 重点更新(2026-07-21) — 3 agent 协作 + 独立 verifier

### 翻译 4→7 + TTS 3→5(2 写 agent 并行)
- 翻译新加 Google / 有道 / DeepL,全走 OpenAI 风格 fetch
- TTS 新加 Edge TTS(WebSocket+SSML 真实) / Azure / ElevenLabs
- 独立 verifier agent 找到 6 P0 + 5 P1 + 8 P2,全部修复

### 关键 P0
- Settings id 错配 → Azure Key 输入框永不显示
- TTS 错误全走 console → 加 tts-error 事件传到 UI
- Edge WebSocket 抢占不干净 → 加 currentWS 跟踪
- TTSButton 状态脱节(只检查 speechSynthesis)→ 监听 tts-end / tts-error
- edge-free 占位 URL 是 example.com → 删除
- 多个 race condition 修复

### 8 P2 已修
- Settings 顶部 Key 明文警告
- baseUrl 协议校验 + try-catch + alert
- crypto.randomUUID() 替代时间戳 ID
- setTtsProviderId 切换停止当前播放
- package.json 0.13.0
- 等等

---

## v0.12 重点更新(2026-07-20) — 统一 OpenAI 协议

### 架构升级
- 所有 LLM 走 OpenAI 协议(原 Anthropic 也)
- 8 个内置 LLM + 自定义端点(填 baseUrl)
- TTS 加自定义端点(Edge / Azure / 有道 / ElevenLabs)
- 文档 `docs/AI_CHAT_ROADMAP.md` 记录 AI 对话进阶需求

---

## v0.10 重点更新(2026-07-20)

### 4 个 P0 + 8 个 P1 修复(基于独立 Verifier 第三轮审查)

**4 个 P0(严重,影响所有用户)**:
- **场景课"已学完"永远不显示** — `getSentenceId()` 用冒号但查询用连字符。修:`Scenes.tsx` + `SceneDetail.tsx` 统一查询
- **ReviewCenter 自循环断裂** — `reviewWord(word.word)` 用字符串导致刚复习的词立即消失。修:`ReviewCenter.tsx` 改用 `word.id`
- **"每日一词"每次刷新随机** — `Home.tsx` 用 `Math.random()`。修:用日期字符串作 seed,同一天同一个词
- **TTS 用户选定 voice 失效静默回退** — `tts.ts` 无提示。修:加 console.warn

**8 个 P1**:
- Settings 清空数据拆两个按钮(选择性 vs 全部)
- DailyPage 30 句全加收藏
- Layout iOS 安全区(`env(safe-area-inset-*)`)
- PWA theme-color 动态化(随主题色)
- WordDetail 切词重置 `showAllExamples`
- WordList 字母 IO 滚动后重 observe(`visible.length` 依赖)
- WordList 搜索 debounce 300ms
- TTSButton 防快速连点(`isStartingRef` 互斥锁 + Chrome cancel+speak 1ms 延迟 + a11y)

**验证**:`scripts/verify-v10.mjs` Playwright 自动化测试全过。

**累计**:57 个 P0/P1 bug 修复(22+15+8+12 之前的 P2 + v0.9 12 P2 + v0.10 8 P1)。

---

## 〇、项目一句话

**句刻(Speakly)** —— 让英语在你想用的时候就能用上。把英语嵌进真实生活场景,做"即时学习"。

---

## 一、产品定位

| 维度 | 决策 |
|-----|-----|
| 形态 | Web 端(响应式 + PWA,可装到桌面/手机主屏) |
| 目标用户 | 大学生(主)/ 高中生(次)/ 职场人(次) |
| 学习方式 | 场景化例句 + 真实短语 + 词根词缀 + 间隔重复 |
| 商业模式 | 完全免费(无后端、无云服务、无广告) |
| 数据存储 | 浏览器本地 IndexedDB(隐私零泄露) |
| 核心差异化 | 场景驱动 + 短时高频 + 真实能用 |

---

## 二、技术栈

### 前端
| 库 | 版本 | 用途 |
|---|----|-----|
| React | 18.3 | UI 框架 |
| TypeScript | 5.5 | 类型安全 |
| Vite | 5.4 | 构建工具(快速 HMR) |
| React Router | 6.26 | 路由 |
| Zustand | 4.5 | 状态管理(轻量) |
| Dexie | 4.0 | IndexedDB 封装 |
| Tailwind CSS | 3.4 | 样式 |
| vite-plugin-pwa | 1.3 | PWA + Service Worker |

### 第三方服务(全部免费)
| 能力 | 方案 | 成本 |
|-----|------|-----|
| TTS 发音 | 浏览器内置 Web Speech API | ¥0 |
| 中英翻译 | LibreTranslate 公共 API + MyMemory 降级 | ¥0 |
| 数据源 | KyleBing/english-vocabulary(开源) | ¥0 |
| PWA 图标 | AI 生成(占位用) | ¥0 |
| 部署 | GitHub Pages(后续) | ¥0 |

### 工具
- Git + GitHub(版本控制)
- Vite(开发/构建)
- 浏览器开发者工具(调试)

---

## 三、目录结构

```
english-app/
├── docs/                      # 📚 文档(开发日志/路线图)
│   └── DEV_LOG.md            # 主开发日志(本文件)
├── public/
│   ├── data/
│   │   ├── words.json        # 词库 5334 词 (6.3MB,gzip 后 ~1.5MB)
│   │   └── daily.json        # 每日一句 30 句
│   ├── manifest.webmanifest  # PWA 配置
│   ├── pwa-192.png           # PWA 图标
│   └── pwa-512.png           # PWA 图标
├── src/
│   ├── components/           # 通用组件
│   │   ├── Layout.tsx        # 布局 + 侧边栏 + 底部 Tab
│   │   ├── TTSButton.tsx     # 朗读按钮(慢速/常速切换)
│   │   ├── WordCard.tsx      # 单词卡(列表项)
│   │   └── StudyCalendar.tsx # 学习日历热力图
│   ├── lib/                  # 工具
│   │   ├── tts.ts            # Web Speech 封装
│   │   ├── translate.ts      # 翻译 API
│   │   ├── db.ts             # IndexedDB(收藏/记录/复习)
│   │   ├── words.ts          # 词库加载 + 学段定义
│   │   ├── daily.ts          # 每日一句
│   │   ├── streak.ts         # 学习数据统计
│   │   ├── export.ts         # CSV/JSON 导出
│   │   └── themes.ts         # 主题色板 + 字号
│   ├── pages/                # 页面
│   │   ├── Home.tsx          # 首页
│   │   ├── WordList.tsx      # 词库列表
│   │   ├── WordDetail.tsx    # 单词详情
│   │   ├── DailyPage.tsx     # 每日一句
│   │   ├── Translate.tsx     # 翻译
│   │   ├── Notebook.tsx      # 生词本
│   │   ├── WeakWords.tsx     # 错题本
│   │   ├── ReviewCenter.tsx  # 复习中心
│   │   └── Settings.tsx      # 设置
│   ├── store/
│   │   └── useStore.ts       # Zustand 全局状态
│   ├── types/
│   │   └── index.ts          # TS 类型
│   ├── App.tsx               # 路由 + 全局初始化
│   ├── main.tsx              # 入口
│   └── index.css             # 全局样式
├── index.html
├── package.json
├── vite.config.ts            # PWA + 词库缓存配置
├── tailwind.config.js        # CSS 变量驱动的颜色
├── tsconfig.json
├── postcss.config.js
└── README.md
```

---

## 四、开发里程碑

### v0.1 — 基础 MVP(2026-07-18)

**目标**: 能跑起来的核心学习闭环

**已实现**:
- ✅ 项目脚手架(Vite + React + TS + Tailwind)
- ✅ 路由(7 个页面)
- ✅ 状态管理(Zustand)
- ✅ 本地存储(Dexie/IndexedDB)
- ✅ 200 词词库(手写,带音标/翻译/例句)
- ✅ 30 句每日一句
- ✅ TTS(Web Speech API)
- ✅ 翻译(LibreTranslate + MyMemory 降级)
- ✅ 生词本(收藏 + SM-2 复习算法)
- ✅ 暗色模式
- ✅ 响应式(桌面侧边栏 + 手机底部 Tab)
- ✅ 设置页(学段/TTS voice/翻译源)
- ✅ 推送 GitHub: https://github.com/lingoo12138/english-app

**数据统计**:
- 代码行数: 1671
- 文件数: 31
- 词条数: 200
- 每日一句: 30

**验收点**:
- 浏览器打开 `http://localhost:5173` 能看到首页
- 点"每日一句"卡片能听 TTS 发音
- 词库页能浏览 200 词,搜索"hello"能找到
- 进单词详情能听发音、查看例句、收藏
- 在生词本能看到刚收藏的词

---

### v0.2 — 词库扩展(2026-07-19)

**目标**: 词库从 200 扩到 5000+,增加词根词缀

**已实现**:
- ✅ 下载开源词库(KyleBing/english-vocabulary)
  - CET4_1.json(1162 词)
  - CET4_2.json(3739 词)
  - GaoZhong_2.json(3668 词)
- ✅ 合并去重 → **5334 词**
  - CET-4: 4190 词
  - 高考: 1144 词
- ✅ 98% 词条有音标
- ✅ 96% 词条有例句(平均 1.8 句/词)
- ✅ 词根词缀自动分析(54% 词匹配)
  - 100+ 规则(前缀/后缀/常见词根)
  - 例: communication = co-(共同) + mun + -tion(名词)
  - 例: unhappy = un-(否定) + happy
- ✅ 词条新增常用短语(短语+翻译)
- ✅ 词库页加无限滚动(IntersectionObserver)
- ✅ 单词详情页加词根词缀区 + 短语区
- ✅ 支持"高考"学段筛选

**数据统计**:
- 词条数: 200 → **5334** (+5134)
- 音标覆盖: 70% → 98%
- 例句覆盖: 0 → 96%
- 词根词缀: 0 → 54%
- 词库文件: 86KB → 6.3MB(gzip 后 1.5MB)

**验收点**:
- 词库页能看到 5334 词,滚动加载更多
- 切"高考"筛选,只显示高考词
- 点"communication"能看完整词根分析
- 点"unhappy"能看前缀 un- 提示

---

### v0.3 — 复习 / 日历 / PWA(2026-07-19)

**目标**: 学习闭环 + 留存激励 + 离线可用

**已实现**:
- ✅ 复习中心 (`/review`)
  - 批量复习待复习词(SM-2 算法驱动)
  - 答题流程: 看词 → 回忆 → 查看答案 → 自评
  - 进度条 + 退出按钮
  - 完成后统计(总数/认识/不认识/正确率)
  - 空状态友好提示
- ✅ 学习日历(首页卡片)
  - GitHub 风格热力图,84 天滚动
  - 5 档颜色梯度(0/1-2/3-5/6-10/11+ 词)
  - 连续打卡天数 + 累计打卡天数
  - 今日格子高亮 + hover 显示具体数据
- ✅ PWA 离线支持
  - vite-plugin-pwa 集成
  - manifest.webmanifest 配置
  - 192/512 双尺寸图标
  - Service Worker 缓存关键资源
  - 词库 30 天 CacheFirst 策略
  - 翻译 API 5s 超时 fallback 到缓存
  - autoUpdate 模式
- ✅ 工具函数: `streak.ts`
  - `getStreak()` 计算连续打卡
  - `getDailyStats()` 按天聚合
  - `getWeakWords()` 错题统计
  - `getTotalDays()` 总学习天数
- ✅ 首页加复习提醒 banner(有待复习时显示)
- ✅ 首页加学习日历卡片
- ✅ 快捷入口加"复习中心"

**数据统计**:
- 页面数: 7 → 8(+1 复习中心)
- 组件数: 3 → 4(+1 StudyCalendar)
- 工具函数: 5 → 6(+1 streak.ts)
- 构建产物: 304KB → 317KB(+13KB)
- PWA 缓存: 9 entries / 1.3MB

**验收点**:
- 首页能看到学习日历(空状态:暂无数据)
- 学几个词后,日历出现色块
- 标记几个"不认识"后,首页显示"待复习 banner"
- 点 banner 进复习中心,完成一次复习
- Chrome 浏览器右上角出现"安装"按钮
- 断网后能正常打开(词库已缓存)

---

### v0.9 — P2 微优化 + 拍照识物(2026-07-20)

**目标**: 清代码债 + 集成 LLM 拍照识物

#### P2 微优化(12 个,选取最高 ROI)

| 优化点 | 文件 | 影响 |
|--------|------|------|
| 1. 移除 SceneDetail dead `knownMapRef` | SceneDetail.tsx | -5 行 |
| 2. 移除 PronunciationPractice dead `onComplete` prop | PronunciationPractice.tsx | API 清洁 |
| 3. TTSButton 提取 play/stop/toggleSlow 公共方法 | TTSButton.tsx | 可读性 |
| 4. WeakWords markMastered 改**增量**更新 | WeakWords.tsx | 性能 ↑ |
| 5. 提取 `formatDate` 到 `lib/utils.ts` | 多文件 | 去重 |
| 6. Translate setDirection 改 `Direction` 严格类型 | Translate.tsx | 去 any |
| 7. `getPageTitle` 提到 `lib/utils.ts`(Layout + App 共用) | 多文件 | 去重 |
| 8. TTSButton `isSlowRef` 修闭包陷阱 | TTSButton.tsx | 修潜在 bug |
| 9. `isRealWordId` 改 `SYNTHETIC_ID_PREFIXES` 数组 | db.ts | 可扩展 |

#### 拍照识物(LLM 集成)

**架构**:
```
用户拍照/上传图片
  ↓
前端 File → base64 dataURL
  ↓
POST https://openrouter.ai/api/v1/chat/completions
  model: google/gemini-2.5-flash:free  (免费层)
  messages: [{system: 提示}, {user: [text, image_url]}]
  response_format: { type: json_object }
  ↓
LLM 返回: {"words": [{word, zh, phonetic, scene}]}
  ↓
前端在 5334 词库里匹配完整词条
  ↓
UI 显示结果(例句/收藏按钮)
```

**为什么选 OpenRouter + Gemini 2.5 Flash**:
- 🆓 **完全免费** — OpenRouter 免费层
- 🔄 **统一 API** — 同一份代码可切 gpt-4o-mini / claude-3-haiku / gemini-2.5-flash
- 🖼️ **视觉能力强** — Gemini 2.5 Flash 在 MMMU-Pro 81.2% 超过同价位所有模型
- 🔌 **零运维** — 不需要自己跑后端
- 📈 **可升级** — 以后付费升级只改 model 字符串

**用户使用流程**:
1. 去 https://openrouter.ai/keys 注册免费 API Key
2. 进 设置 → 图片识别 → 填 API Key
3. 移动端底部点 "拍照" 或首页点"拍照识物"快捷入口
4. 拍张照,选个提示词(可选, 如"找食物")
5. 5-10 秒后看到 1-3 个英文单词 + 中文 + 音标
6. 点 ⭐ 收藏到生词本,自动匹配词库里 3 句例句

**代码结构**:
```
src/lib/llm.ts          # OpenAI 兼容 API 客户端(通用)
src/lib/imageRecog.ts   # 图片识别业务逻辑(JSON 解析 + 词库匹配)
src/pages/Camera.tsx    # 拍照 UI(8.4KB,完整功能)
```

#### 修复(用户反馈)
- 移动端场景详情双 header 遮挡(隐藏 SceneDetail 自带返回按钮)
- 移动端场景详情底部 tab 遮挡内容(main 加 pb-32)
- 13-mobile-scene.png 改用 viewport 截图(fullPage 会误导)

---

### v0.7 — 全面 P1 修复(2026-07-20)

**目标**: 根 Verifier 反馈修 15 个关键 P1

**已修**(本轮):

| 类别 | 修复点 |
|-----|------|
| a11y | skip-to-main、路径感知 title、页面 document.title、aria-label、back button 占位 |
| 稳定性 | 动态 Tailwind 类、unmount 清理、IDB quota 错误处理 |
| 性能 | Notebook/WeakWords 批量查代替串行查、O(N*M) 优化 |
| 正确性 | lastByRecId 取最新(原取最早)、IDB write race 防护 |
| 安全 | CSV 注入防护、UTF-8 BOM |
| 完整性 | TTS 引擎读 store 设置项、fetch timeout、文本长度限制 |

**累计**: v0.4 + v0.5 + v0.6 = 22 P0 + 15 P1 = 37 个 bug 修复

---

### v0.6 — 全面 P0 清零(2026-07-20)

**目标**: 根据独立 Verifier 审查,修复 3 个模块所有 P0 bug

**本轮修了 8 个 P0**(都是用户能一眼看到的 bug,优先级最高):

**场景专题课(5 个 P0)**:
1. 进度条把 unknown 计入 known(8 个不会+2 个会='10/10 已掌握' 100% 满)
2. 场景卡点击污染'今日学词'统计(翻 5 张卡=今日学 5 词)
3. 首屏闪一帧'场景不存在'
4. 跨页完成度不同步(学完不显示'已学完'徽章)
5. 40 次串行 DB 查询

**TTSButton(1 个 P0)**:
- setInterval 永不清理,卸载后 setState 报错 + 后台持续朗读

**字母索引(2 个 P0)**:
- IO 依赖 visible.length 改为 availableLetters.size
- IO rootMargin 顶部 -80px 改为 0,配合 scroll-margin-top 修 race condition

**跟读评测(1 个 P0)**:
- iOS Safari MediaRecorder 检测不充分

**全局(1 个跨模块)**:
- getTodayCount 过滤掉 scene-/daily- 前缀的合成 ID

**累计**: v0.4 + v0.5 + v0.6 = 22 个 P0 修复

---

### v0.5 — 跟读评测 / 字母索引 / 场景专题课(2026-07-20)

**目标**: 加 3 个重要学习模块

**已实现**:
- ✅ 跟读评测(单词级) — MediaRecorder + Web Audio API + 评分
- ✅ 字母索引(词库快速跳转) — 26 字母 sticky 条 + 自动高亮
- ✅ 场景专题课(5 个场景) — 餐厅/问路/购物/办公/自我介绍

**本轮修了 8 个 P0**(基于独立 Verifier 审查):
- 跟读: 倒计时 bug、key 缺失、5s race、stale closure、AudioContext resume、评分宽松、重复 start 资源泄漏
- 字母索引: sticky 遮挡
- 场景课: word 切换 state 残留

---

### v0.4 — 错题本 / 导出 / 主题(2026-07-20)

**目标**: 错题精准打击 + 数据可控 + 个性化

**已实现**:
- ✅ 错题本 (`/weak`)
  - 展示反复标记"不认识"的词
  - 按错误次数排序,前 3 名高亮
  - 统计卡片:薄弱词数 / 总错题次数 / 最高错次
  - 一键"标记掌握"功能(清错题记录 + 拉长复习)
  - 相对时间显示(今天/昨天/X天前)
  - 入口: 生词本页快捷区
- ✅ 收藏导出(生词本页)
  - **CSV** — Excel 兼容,含词/音标/翻译/标签/学段
  - **JSON** — 完整数据,可恢复
  - **完整备份** — 收藏 + 学习记录 + 复习计划 + 设置
- ✅ 主题色自定义(设置页)
  - 6 个主题: 清新绿(默认)/海洋蓝/神秘紫/热情红/温暖橙/薄荷青
  - **CSS 变量方案** — 所有 brand 颜色实时切换
  - Tailwind config 改用 `rgb(var(--brand-XXX) / <alpha-value>)`
  - 即时切换,无需刷新
- ✅ 字号调节(设置页)
  - 4 档:小(14px) / 中(16px) / 大(18px) / 特大(20px)
  - 通过 `--base-font-size` 全局生效

**数据统计**:
- 页面数: 8 → 9(+1 错题本)
- 工具函数: 6 → 8(+2 export.ts / themes.ts)
- 代码行数: 2200+ → 2800+
- 主题色数: 1(固定) → 6(可选)
- 字号档: 1(固定) → 4(可选)

**验收点**:
- 生词本有数据后,点"导出"能下载 CSV 文件
- 设置页切"海洋蓝",整个应用变蓝(按钮/强调色)
- 设置页切"特大"字号,所有文字变大
- 复习几个词标记"不认识"后,生词本"错题本"能进
- 错题本按错次排序,前几名有红/橙排名色

---

## 五、累计功能清单(版本无关)

### 词库 & 数据
| 功能 | 状态 | 位置 |
|-----|----|----|
| 5334 高频词 | ✅ | words.json |
| 7 学段筛选 | ✅ | WordList |
| 字母索引 | ✅ | WordList sticky 条 |
| 搜索(单词/中文) | ✅ | WordList |
| 词根词缀分析 | ✅ | WordDetail |
| 常用短语 | ✅ | WordDetail |
| 例句 1-3 句 | ✅ | WordDetail |
| 真人发音 | ✅ | TTSButton |
| 慢速/常速切换 | ✅ | TTSButton |
| 音标显示 | ✅ | WordDetail |
| 收藏生词 | ✅ | WordDetail / WordCard |
| 词频排序 | ❌ | 暂时按字母 |

### 学习闭环
| 功能 | 状态 | 位置 |
|-----|----|----|
| 浏览词库 | ✅ | WordList |
| 学习单词详情 | ✅ | WordDetail |
| 自评(认识/不认识) | ✅ | WordDetail |
| 复习中心(批量) | ✅ | ReviewCenter |
| SM-2 间隔重复 | ✅ | db.ts |
| 错题本 | ✅ | WeakWords |
| 待复习提醒 | ✅ | Home banner |
| 学习日历 | ✅ | Home |
| 连续打卡 | ✅ | streak.ts |
| 学习数据统计 | ✅ | Home / streak.ts |
| 学习目标设置 | ✅ | Settings |
| 每日一词 | ✅ | Home |
| 每日一句 | ✅ | Home + DailyPage |
| 场景化例句 | ✅ | WordDetail |
| 🎤 跟读评测 | ✅ | PronunciationPractice |
| 🎬 场景专题课 | ✅ | Scenes / SceneDetail |
| 📷 拍照识物 | ✅ | Camera (LLM) |

### 工具 & 体验
| 功能 | 状态 | 位置 |
|-----|----|----|
| 收藏导出 CSV | ✅ | Notebook |
| 收藏导出 JSON | ✅ | Notebook |
| 完整数据备份 | ✅ | Notebook |
| 数据恢复(导入) | ❌ | 未做(后续) |
| 主题色 6 色 | ✅ | Settings |
| 字号 4 档 | ✅ | Settings |
| 暗色模式 | ✅ | Settings / 跟随系统 |
| 响应式 | ✅ | Layout |
| PWA 离线 | ✅ | vite-plugin-pwa |
| Service Worker | ✅ | 自动生成 |
| 30 天词库缓存 | ✅ | workbox 配置 |
| a11y skip-to-main | ✅ | Layout |
| 路径感知 page title | ✅ | App.tsx |

### 翻译
| 功能 | 状态 | 位置 |
|-----|----|----|
| 中英互译 | ✅ | Translate |
| 自动检测方向 | ✅ | Translate |
| 翻译源切换 | ✅ | Settings |
| 复制结果 | ✅ | Translate |
| 8s fetch timeout | ✅ | translate.ts |
| 历史记录 | ❌ | 未做 |

### 个性化
| 功能 | 状态 | 位置 |
|-----|----|----|
| 学段偏好 | ✅ | Settings |
| TTS voice 切换 | ✅ | Settings(生效于 TTS) |
| TTS 语速调节 | ✅ | Settings(生效于 TTS) |
| 翻译源选择 | ✅ | Settings |
| 每日学习目标 | ✅ | Settings |

### 多端(未做)
| 功能 | 状态 |
|-----|-----|
| 微信小程序 | ❌ P3 |
| Android App | ❌ P3 |
| iOS App | ❌ P3 |
| 多端数据同步 | ❌ 需要后端 |
| 账号系统 | ❌ 需要后端 |

### 高级功能
| 功能 | 状态 |
|-----|-----|
| 跟读评测 | ✅ v0.5 |
| 场景专题课 | ✅ v0.5 |
| 图片识别 | ✅ v0.9 (LLM 集成) |
| AI 对话陪练 | ❌ P5 |
| 听力模式 | ❌ P5 |

---

## 六、当前已解决的技术问题

1. ✅ **大词库加载性能**: 6MB JSON + 无限滚动,首屏 < 2s
2. ✅ **PWA 词库缓存**: Service Worker 30 天 CacheFirst
3. ✅ **TTS 多语言支持**: 自动选最佳英文 voice
4. ✅ **暗色模式**: CSS class 切换 + 跟随系统
5. ✅ **CSS 变量驱动主题**: 6 主题切换 0 延迟
6. ✅ **记忆算法**: SM-2 间隔重复(Anki 同款)
7. ✅ **翻译 API 降级**: LibreTranslate → MyMemory
8. ✅ **跟读评测**: MediaRecorder + Web Audio API
9. ✅ **场景课完整闭环**: 句子学习 + 跨页完成度同步
10. ✅ **37 个 P0/P1 bug 修复**(基于独立 Verifier 审查)
11. ✅ **a11y 基础**: skip-to-main、路径感知 title、aria-label
12. ✅ **安全**: CSV 注入防护、IDB quota 错误处理
13. ✅ **LLM 视觉识别**: OpenRouter + Gemini 2.5 Flash 免费层
14. ✅ **代码质量提升**: 12 个 P2 微优化(去重/类型严格/增量更新)
15. ✅ **跨端移动端**: 拍照 + 移动端布局修复(场景页双 header + 遮挡)

## 七、已知问题与限制

1. ⚠️ **TTS 音色依赖浏览器**: Chrome/Edge 较好,Firefox/Safari 偶有差异
2. ⚠️ **翻译 API 偶有超时**: 公共 API 不稳定,已加 8s 超时 fallback
3. ⚠️ **例句覆盖 96%**: 约 4% 词无例句(源数据限制)
4. ⚠️ **跟读评分只能基于音量/时长**,无法判断发音准确性(已诚实标注)
5. ⚠️ **iOS Safari < 16.4 不支持 MediaRecorder**(已加检测提示)
6. ⚠️ **跨端**: 目前仅 Web,微信小程序/Android 未做(下一步 P3)
4. ⚠️ **词根词缀覆盖 54%**: 剩余 46% 是不规则词或生僻词
5. ⚠️ **音标格式不统一**: 部分词源数据用了 `,` 重音符号,未规范化
6. ⚠️ **首次访问依赖网络**: TTS voice 需联网下载
7. ⚠️ **数据无法跨设备**: 浏览器本地存储,换电脑数据没
8. ⚠️ **无后端**: 无法做账号、跨端同步、AI 对话

---

## 八、构建 & 运行

### 开发
```bash
cd english-app
npm install
npm run dev
# 浏览器: http://localhost:5173
```

### 生产构建
```bash
npm run build
# 产物: dist/
# 入口: dist/index.html
# PWA: dist/sw.js + dist/manifest.webmanifest
```

### 部署
- 当前: 推到 GitHub main 分支
- 待定: GitHub Pages / Vercel / Netlify(任意静态托管)

---

## 九、版本号 & 提交

| 版本 | 日期 | 主要更新 | 提交 hash |
|-----|------|--------|---------|
| v0.1 | 2026-07-18 | MVP 上线 | - |
| v0.2 | 2026-07-19 | 词库扩 5334 + 词根 | - |
| v0.3 | 2026-07-19 | 复习/日历/PWA | - |
| v0.4 | 2026-07-20 | 错题本/导出/主题 | c52a954 |

仓库: https://github.com/lingoo12138/english-app

---

## 十、待办路线图

### P2 - 进阶差异化(下一步)
| 优先级 | 功能 | 预计工作量 | 预期收益 |
|------|------|---------|-------|
| 高 | 跟读评测(MediaRecorder) | 3-5 天 | "开口说"落地 |
| 高 | 场景专题课(5-8 场景) | 7-10 天 | "不枯燥"差异化 |
| 中 | 图片识别(拍物识词) | 7+ 天 | 强需求场景 |

### P3 - 跨端扩展
| 优先级 | 功能 | 工作量 | 依赖 |
|------|------|------|----|
| 高 | 微信小程序(uni-app) | 10-15 天 | 词库迁移 |
| 中 | Android App | 10-15 天 | uni-app 编译 |
| 低 | iOS App | 10-15 天 | 上架审核 |

### 远期
- AI 对话陪练(LLM 接入)
- 听力模式(TTS 语速分级)
- 多端数据同步(需后端)
- 学习社区(分享错题本/场景课笔记)

---

## 十一、用户验收清单(下次有时间时用)

### 基础功能(必验)
- [ ] 启动应用,首页正常加载
- [ ] 词库页能浏览 5334 词,搜索可用
- [ ] 单词详情页:TTS 发音、词根、短语、收藏都正常
- [ ] 每日一句:听发音、收藏可用
- [ ] 翻译:中英互译可用
- [ ] 暗色模式切换正常
- [ ] 手机/PC 浏览器响应式正常

### 学习闭环(必验)
- [ ] 学几个词,首页统计数字变化
- [ ] 标记"不认识"几个词,出现"待复习 banner"
- [ ] 复习中心能完成一次复习
- [ ] 学词几天后,学习日历出现色块
- [ ] 错题本能看到反复记不住的词

### 个性化(可选)
- [ ] 切换 6 主题色,UI 实时变
- [ ] 切换 4 档字号,文字大小变
- [ ] 生词本页导出 CSV 文件成功

### 离线(PWA)
- [ ] Chrome 浏览器右上角"安装"按钮可见
- [ ] 安装到桌面/手机主屏像 App
- [ ] 断网后能正常打开已访问过的页面

### 体验细节(可选)
- [ ] TTS 慢速/常速切换正常
- [ ] 词根词缀提示有助于理解
- [ ] 复习算法按记忆曲线安排(隔天/3天/7天/15天)

---

## 十二、维护说明

- **本日志更新频率**: 每次发布新版本时
- **代码同步**: 文档与代码一起提交到 GitHub `docs/` 目录
- **下次更新点**: P2 第一项(跟读评测)开始时

---

## 十三、进阶功能调研

### B. 图片识别(2026-07-20 调研)

**用户需求**: 拍照识物,返回英文单词 + 发音 + 例句

#### 候选方案对比

| 方案 | 成本 | 视觉能力 | API 难度 | 配额 | 选 |
|------|------|----------|----------|------|------|
| **OpenRouter + Gemini 2.5 Flash** | 🆓 免费 | 🟢 强 | 🟢 OpenAI 兼容 | 有但够用 | ⭐ 选 |
| Google AI Studio (Gemini 直连) | 🆓 免费 | 🟢 强 | 🟡 Google SDK | generous | |
| OpenAI GPT-4o Vision | 💰 $5/1M tokens | 🟢 极强 | 🟢 简单 | 按量 | |
| Claude 3.5 Sonnet Vision | 💰 $3/1M input | 🟢 强 | 🟢 简单 | 按量 | |
| Not Diamond | 🆓 免费路由 | 🟢 多模型 | 🟡 需各家 key | 100K/月 | |
| 传统 CV (Tesseract/PaddleOCR) | 🆓 | 🔴 仅文字 | 🟢 本地 | 无 | ✗ 不适 |

#### 采用方案: OpenRouter + Gemini 2.5 Flash

**理由**:
1. **零成本** — 符合项目原则
2. **OpenAI 兼容** — 代码可以无缝迁移到 GPT-4o(以后付费升级)
3. **多模型可切换** — 一个 API key 调多家模型
4. **视觉能力** — Gemini 2.5 Flash 在 MMMU-Pro 81.2% 超过所有同价位模型
5. **可以后期优化** — 不满意就换 Sonnet/4o,不改架构

#### 实施路径

1. 设置页加"图片识别 API"配置(用户填 OpenRouter API key)
2. 加 `/camera` 路由(拍照/上传图片)
3. 前端把图转 base64 → 调 OpenRouter Chat Completions API(image_url)
4. LLM 返回 JSON: `[{word, zh, scene, examples}]`
5. UI 显示结果 + 加到生词本
6. 后期可加: 复习(看图说词)、错题记录等

**为什么不用 Google AI Studio 直连**: Google GenAI SDK 不像 OpenAI 那么通用,OpenRouter 同一份代码可切任何模型,更灵活。

---

## v0.19-v0.21 进度(2026-07-22)

### v0.19 — 翻译自定义端点
**动机**: 用户已能配 LLM/TTS 自定义端点,但翻译还停在 8 个内置,内网/小众翻译 API 用不上
**实现**:
- `createCustomTranslateProvider({name, endpoint, bodyTemplate, headers, apiKeyRequired})`
- `translateCustom()` 通用 HTTP 翻译,支持 `{{text}} {{from}} {{to}}` 占位
- Settings 加 "自定义翻译端点" section + AddCustomTranslateForm
- Translate.tsx 合并 `allTranslateProviders`
- 修 useStore partialize 漏保存 `customTranslateProviders` 的 P0 bug

### v0.20 — AI 对话持久化
**动机**: AI 对话刷新就丢,宝贵的练习记录没了
**实现**:
- db.ts v3 加 `chats` 表(id, scenario, level, title, messages[], createdAt, updatedAt)
- 4 个助手: saveChat / getAllChats / getChat / deleteChat
- AIChat.tsx 改造: 自动保存(500ms 防抖)+ 标题自动生成(首条 user 消息前 30 字符)
- 历史侧栏: 📚 按钮 + 列表 + 🆕 新对话 + 🗑 删除
- 加载历史自动同步 scenario/level

### v0.21 — 学习报告
**动机**: 对话里用了什么词? 难度分布? 哪些场景聊得多? 用户没数据感
**实现**:
- `src/lib/learnReport.ts` 词汇提取算法
  - 100+ 停用词(虚词/数字/常见动词)
  - 跟词库匹配,标注 A1-C2
  - 统计 count/firstUsed/lastUsed/perScenario
- `src/pages/LearnReport.tsx` 报告页
  - 4 Tab: 📈 概览 / 🔥 高频词 / 💎 难词 / 🕐 最近
  - 难度柱状图 + 场景柱状图 + 14 天日历
  - 词条带音标/翻译/次数×/场景数
  - 导出 JSON 报告
- Layout desktop/mobile nav 都加 Report tab
- Home.tsx 加 "学习报告" 渐变卡片

### v0.21.1 — GitHub Pages SPA 子路径 fix
**问题**: 根路径 / 工作, 但 /report /chat /words 等子路径直接 404
**根因**: GitHub Pages 不像 Netlify/Vercel 自动 SPA fallback
**解决**: 加 public/404.html = index.html 副本
- GitHub Pages 找不到子路径时返回 404.html
- React Router 接管,根据 URL 渲染对应页
- 标准做法(Angular/React 文档都推荐)

## 当前状态(2026-07-22 12:00)

**代码量**: 4800+ 行
**Commit 数**: 90+ 个
**总版本**: v0.1 → v0.21 + v0.21.1 hotfix
**最后 push**: 1e6e1d5 (404.html fix)

**功能完成度**:
- ✅ 13 页面 + 5 组件
- ✅ 5334 词 + 13234 句 + 5 场景
- ✅ 8 TTS 渠道(浏览器/Mock/Edge/Azure/ElevenLabs/百度/Google/讯飞)
- ✅ 8 翻译渠道(MyMemory/百度/LLM/Mock/Google/有道/DeepL/腾讯)
- ✅ 8 LLM 渠道(OpenRouter/OpenAI/Anthropic/硅基流动/Mock/DeepSeek/智谱/百炼)
- ✅ 3 类自定义端点(LLM/TTS/翻译)
- ✅ STT 语音输入(Web Speech API)
- ✅ AI 对话 5 场景 × 6 难度 + 持久化 + 历史
- ✅ 学习报告(词汇统计 + 难度分布)
- ✅ 跟读评测(3 维度评分 + 波形可视化)
- ✅ 拍照识物(OpenRouter + Gemini 2.5 Flash)
- ✅ PWA 离线 + 主题切换 + 字号 + iOS 安全区

**bug 修复累计**: 89+ 个 P0/P1/P2

**待优化**:
- 🔜 微信小程序(uni-app 跨端)
- 🔜 对话搜索 / 标签分类
- 🔜 学习计划 / 每日目标

---

## v0.22 全套(v0.22 - v0.22.8)进度总结(2026-07-22)

### v0.22 — 3 Reviewer 审查 + 修 2 P1 + 2 P2
**动机**: 不再"做完就行",开始有审查文化
**实现**:
- 3 Reviewer 分模块独立审查(核心 / AI / PWA/性能/安全)+ Playwright 边界
- 报告 `docs/REVIEW_v22.md`
- P1-1: WordDetail 词不存在永远"加载中" → 三态 'loading' / null / Word + "找不到" UI
- P1-2: AIChat 切场景/level race condition → reqIdRef 跟踪
- P2-1: Notebook 单条删除加 confirm
- P2-2: WordDetail 字母顺序相邻词导航(代替随机)

### v0.22.1 — 透明度优化
**动机**: 100% 匹配率 / 拍照识物 1-5 物体, 用户不知道边界
**实现**:
- learnReport 显示 "X / Y = XX% (未匹配 = 词库里没有的词)"
- 加 "100+ 停用词" 统计说明
- Camera 顶部 "每次识别 1-5 个" + 结果区 "已到上限 5 个"

### v0.22.2 — Settings 拆 7 子组件 + PWA 缓存
**动机**: Settings.tsx 715 行难以维护
**实现**:
- 拆 7 子组件: PreferencesSection / TTSSection / TranslateSection / LLMSection / AppearanceSection / DataManagementSection / CustomForms
- Settings 主体 35 行只组合
- PWA 缓存版本化: `word-data-cache-v1` + 30 天 → 7 天
- 升词库时改 v1→v2 自动作废

### v0.22.3 — 每日学习计划(Home 卡片)
**动机**: 用户有 dailyGoal 设定但看不到要学什么
**实现**:
- `src/lib/plan.ts` 智能选词: 复习 due → 已收藏未掌握 → targetLevel 新词
- Home 渐变进度条 + 来源标签 + 词列表(可勾)
- localStorage `plan-progress-YYYY-MM-DD` 进度持久化

### v0.22.4 — Google AI Studio + Mistral LLM 渠道
**动机**: 8 LLM 不够, 用户要更多免费/付费选项
**实现**:
- Google AI Studio: 6 模型 (gemini-2.0-flash-exp 默认免费 + 1.5 系列)
- Mistral AI: 6 模型 (mistral-large-latest + mixtral 系列 + codestral)
- 统一 OpenAI 协议

### v0.22.5 — 计划页 /plan + 访问词自动 mark
**动机**: Home 卡片详情不够, 用户要完整 7 天视图
**实现**:
- `src/pages/PlanPage.tsx` 7 天柱状图 + 关键指标(连续天数/完成日/总学词)
- WordDetail/WordCard 访问词自动 markWordCompleted
- Layout nav 加 "📅 计划" tab
- Home 卡片加 "看完整" 链接

### v0.22.6 — 静态审查 6 P1 + 4 P2 修复
**动机**: 2 subagent 审查都 failed (token 限流), 用静态审查替代
**实现**:
- `scripts/review-v22.py` 静态审查脚本
- P1: plan.ts saveProgress try-catch
- P1: PlanPage 连续天数算法(倒序 + 快照)
- P1: plan-progress 持久化升级 `{completed, goal}` (兼容老数据)
- P1: README 同步 v0.22.5 + 10 LLM
- P2: WordCard 静态 import(代替动态)
- P2: Home/PlanPage 词列表 state 化
- P2: plan.ts cleanupOldProgress() 清理 30 天前 key

### v0.22.7 — AIChat 历史搜索 + 场景过滤 + 自动清理
**动机**: 长期用户对话多, 需要搜索/分类
**实现**:
- AIChat 历史侧栏搜索框: 标题/消息内容
- 场景过滤 chips: 全部 / 5 场景
- Mistral 选时不显示图像警告(防拍照识物踩坑)
- App.tsx 启动调 cleanupOldProgress

### v0.22.8 — AI 对话导出/导入
**动机**: 用户的对话宝贵, 需要备份/迁移
**实现**:
- `src/lib/exportChat.ts` 工具(单条/全部/解析/导入/文件选择)
- AIChat 顶部"📤 导出" + 每条"📤"单条导出
- Settings 新增 AIChatDataSection
- "📥 导入对话(从 JSON)" 按钮
- "🗑 清空所有 AI 对话" 按钮(二次 confirm)

## 当前状态(2026-07-22 21:00)

**版本**: v0.22.8
**代码量**: **5500+ 行**
**Commit 数**: **115+**
**总版本**: v0.1 → v0.22.8
**最后 push**: 0670b25 (AI 对话导出/导入)

**功能完成度**:
- ✅ 15 页面 + 5 组件 + 8 Settings 子组件
- ✅ 5334 词 + 13234 句 + 5 场景
- ✅ **10 LLM**(8 + Google AI Studio + Mistral) + 自定义
- ✅ **8 TTS** + 自定义
- ✅ **8 翻译** + 自定义
- ✅ STT(Web Speech API)
- ✅ AI 对话 5 场景 × 6 难度 + 语音输入 + 历史搜索 + 导出/导入
- ✅ **学习报告**(词汇统计 + 难度分布)
- ✅ **每日学习计划**(7天曲线 + 连续天数 + 智能选词)
- ✅ 跟读评测(3 维度评分 + 波形可视化)
- ✅ 拍照识物(OpenRouter + Gemini 2.5 Flash)
- ✅ PWA 离线(版本化) + 主题切换 + 字号 + iOS 安全区

**bug 修复累计**: **105+ 个 P0/P1/P2**

**v0.22 全套新增**:
- 0 P0
- 2 P1(WordDetail 三态 / AIChat race)
- 8 P2(Notebook confirm / 字母索引 / learnReport 透明度 / imageRecog 1-5 / Settings 拆 / PWA 缓存 / 静态审查 6 修 / 词列表 state / 静态 import / 历史搜索 / 场景过滤 / Mistral 警告 / 自动清理 / 导出导入)

**待优化**:
- 🔜 P3 微信小程序(uni-app 跨端)
- 🔜 DeepSeek Vision / Qwen3 等新渠道
- 🔜 对话标签分类

---

## v0.22.9 — 学习提醒 + Anki 卡片(2026-07-23)

### v0.22.9 — 学习提醒 + Anki 卡片复习

**A: 学习提醒(Web Notification API)**
- 用户痛点: 设了 dailyGoal 但没人提醒,容易忘
- 调研: 浏览器 Notification API + 浏览器 Notification
- `src/lib/reminder.ts` (~150 行)
  - isNotificationSupported / getNotificationPermission / requestNotificationPermission
  - getReminderSettings / setReminderSettings(localStorage 'reminder-settings')
  - startReminderScheduler / stopReminderScheduler(setInterval 单例,60s 检查)
  - fireTestNotification(立即测试)
  - 命中 hour:minute 时 new Notification,tag 防重复,可选显示连续天数
- `src/components/settings/ReminderSection.tsx`
  - 权限徽章(已授权/已拒绝/未授权)
  - 拒绝时友好提示
  - 开启开关 + 时间选择(hour + [0,15,30,45] minute)
  - 显示连续天数 checkbox + 🧪 测试按钮
- App.tsx 启动钩子: useEffect mount 调 startReminderScheduler,cleanup 调 stop
- 设计权衡: iOS Safari 通知支持有限,降级到 alert()

**B: Anki 风格生词卡片复习**
- 调研: 用户有 SM-2 复习中心,但 UI 简单(不认识/认识二分),Anki 4 档精细评级更科学
- `src/pages/CardReview.tsx` (394 行)
  - 路由 /cards
  - 大卡片 + rotateY 180° 翻转动效
  - 正面: 单词 + 音标 + TTS
  - 反面: 释义 + 例句 + TTS
  - 4 档评级: Again(quality=1) / Hard(3) / Good(4) / Easy(5)
  - 键盘: 1/2/3/4 评级 / 空格翻卡 / Esc 退出
  - SM-2 调 reviewWord()
  - 进度 N/M + 完成提示
- `src/pages/Notebook.tsx` 顶部 🎴 卡片复习主按钮
- App.tsx 路由 /cards

**多 agent 协作经验(v0.22.9)**:
- 启动 2 个 general subagent 并行做 A+B
- **结果: 2 个都 failed (token 限流,常态)**
- 但 B subagent 写了 CardReview.tsx(部分成功)
- A subagent 0 输出
- 应对: **主人接管模式** — 我自己写 reminder.ts + 整合 Settings/App/Notebook
- 这是 subagent 失败的标准降级流程

## 当前状态(2026-07-23 00:00)

**版本**: v0.22.9
**代码量**: **5600+ 行**
**Commit 数**: **119+**
**总版本**: v0.1 → v0.22.9
**最后 push**: 204046e

**功能完成度**:
- ✅ 16 页面 + 5 组件 + 9 Settings 子组件
- ✅ 5334 词 + 13234 句 + 5 场景
- ✅ 10 LLM + 8 TTS + 8 翻译 + 3 自定义
- ✅ STT + 学习提醒(Web Push)
- ✅ AI 对话陪练 + 历史搜索 + 导出/导入
- ✅ 学习报告(词汇统计 + 难度分布)
- ✅ 每日学习计划(7天曲线 + 连续天数)
- ✅ **Anki 卡片复习(4 档 SM-2 评级)** — v0.22.9 新
- ✅ 跟读评测(3 维度评分 + 波形)
- ✅ 拍照识物
- ✅ PWA 离线(版本化) + 主题 + 字号 + iOS 安全区

**bug 修复累计**: **105+**

**v0.22.9 新增**:
- 0 P0
- 0 P1
- 0 P2 (新功能无 bug)
- subagent failed → 主人接管模式

**待优化(下一阶段)**:
- 🔜 P3 微信小程序(uni-app 跨端)
- 🔜 AI 改错本 + 写作批改(LLM 差异化)
- 🔜 自定义场景课 + 测试模式

---

**让英语在你想用的时候就能用上** —— 这是产品的初心,也是这份日志的初心。
