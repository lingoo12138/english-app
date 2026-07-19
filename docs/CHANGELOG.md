# 更新日志

> 每次功能发布的变更记录

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
