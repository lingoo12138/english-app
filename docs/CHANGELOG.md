# 更新日志

> 每次功能发布的变更记录

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
