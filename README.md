# 句刻 · 即时英语学习 v0.1

> 让你在"想用英语的瞬间就能用上"——把英语嵌进真实生活场景里。

## ✨ 特性

- 📚 **200 高频词** —— 涵盖 CET-4 / 日常高频(后续扩展到 6 学段)
- 🔊 **真人发音** —— 浏览器内置 TTS,完全免费,无需联网(首次需联网加载 voice)
- 💬 **场景化例句** —— 每个词配真实场景例句(旅行/工作/生活/学习)
- ✨ **每日一句** —— 每天一句能直接用上的英语
- 🔤 **中英互译** —— 接入免费公共翻译 API
- ⭐ **生词本** —— SM-2 间隔重复算法,科学复习
- 📱 **响应式** —— PC + 手机浏览器均可
- 🌗 **暗色模式** —— 跟随系统或手动切换
- 🆓 **完全免费** —— 无后端、无云服务、无账号

## 🚀 快速开始

### 前置要求
- Node.js >= 18
- 一个现代浏览器(Chrome / Edge / Safari / Firefox)

### 启动步骤

```bash
# 1. 进入项目目录
cd english-app

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 浏览器打开
# http://localhost:5173
```

就这么简单。

## 📦 构建生产版本

```bash
npm run build
npm run preview  # 本地预览构建结果
```

构建产物在 `dist/` 目录,可直接用任何静态服务器托管。

## 🗂️ 项目结构

```
english-app/
├── public/data/         # 静态数据
│   ├── words.json       # 词库(200 词)
│   └── daily.json       # 每日一句(30 句)
├── src/
│   ├── components/      # 通用组件
│   │   ├── Layout.tsx   # 整体布局 + 导航
│   │   ├── TTSButton.tsx# 朗读按钮
│   │   └── WordCard.tsx # 单词卡
│   ├── lib/             # 工具库
│   │   ├── tts.ts       # Web Speech API 封装
│   │   ├── translate.ts # 翻译 API 封装
│   │   ├── db.ts        # IndexedDB 存储
│   │   ├── words.ts     # 词库加载
│   │   └── daily.ts     # 每日一句
│   ├── pages/           # 页面
│   │   ├── Home.tsx     # 首页
│   │   ├── WordList.tsx # 词库列表
│   │   ├── WordDetail.tsx # 单词详情
│   │   ├── DailyPage.tsx# 每日一句
│   │   ├── Translate.tsx# 翻译
│   │   ├── Notebook.tsx # 生词本
│   │   └── Settings.tsx # 设置
│   ├── store/           # 全局状态(Zustand)
│   ├── types/           # TypeScript 类型
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## 🎯 核心功能使用

### 学习单词
1. 打开首页,看"每日一词"
2. 点击进入单词详情,看音标、例句
3. 点击 🔊 听发音,可调速(详情页可点"慢速")
4. 自评"认识/不认识",系统安排复习时间

### 翻译
1. 进入"翻译"页
2. 输入中文或英文
3. 选择方向(自动 / 英→中 / 中→英)
4. 点击翻译

### 生词本
1. 在任意单词详情页点 ☆ 加收藏
2. 进入"生词本"查看
3. 待复习的词会有提示,基于 SM-2 算法

## 💡 关于技术选型

| 模块 | 选择 | 原因 |
|-----|-----|-----|
| 前端 | React 18 + TypeScript | 现代主流,类型安全 |
| 构建 | Vite | 启动快,HMR 流畅 |
| UI | Tailwind CSS | 快速开发,无样式冲突 |
| 状态 | Zustand | 轻量,无 boilerplate |
| 存储 | IndexedDB (Dexie) | 浏览器原生,容量大 |
| TTS | Web Speech API | 浏览器内置,免费 |
| 翻译 | LibreTranslate + MyMemory | 公共免费 API,无需 key |
| 路由 | React Router 6 | 主流方案 |

## 🔧 故障排查

### TTS 没声音
- 首次使用需联网,浏览器会下载语音包
- 检查浏览器是否禁用了 TTS(Chrome 默认开启)
- 在设置页选择不同的 voice 试试

### 翻译失败
- 公共 API 偶尔不稳定,可多试几次
- 在设置页切换翻译源(LibreTranslate / MyMemory)
- 检查浏览器控制台错误信息

### 数据丢失
- 数据存在浏览器 IndexedDB
- 换浏览器、清缓存、卸载浏览器都会清空
- 如需持久化,后续会接入云端(暂不)

## 📈 后续路线

- [ ] 词库扩展到 6000+(CET-4/6 + 高中 + 考研)
- [ ] 词根词缀关联学习
- [ ] 跟读评测(浏览器录音 + 简单评分)
- [ ] 场景专题课(点餐/问路/会议...)
- [ ] 图片识别(拍照识物)
- [ ] PWA 离线可用
- [ ] 微信小程序 / Android App

## 📝 反馈

有任何想法或建议,直接改源码就行 —— 代码就是文档。

---

**享受学习。Make English part of your life.**
