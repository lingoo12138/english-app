# 句刻 · 即时英语学习 v0.7

> 让你在"想用英语的瞬间就能用上"——把英语嵌进真实生活场景里。
>
> **极简本地版** —— 无后端、无云服务、无账号,所有数据存在你本地的浏览器里。

[🌐 在线预览](https://lingoo12138.github.io/english-app/) ·
[📖 开发日志](./docs/DEV_LOG.md) ·
[🗺️ 路线图](./docs/ROADMAP.md) ·
[📝 更新日志](./docs/CHANGELOG.md)

---

## ✨ 核心特性

### 📚 内容
- **5334 高频词** —— 涵盖 CET-4 / 高考 / CET-6 / 考研 / 初中 / 高中 / 日常 7 个学段
- **96% 词配真实场景例句** —— 旅行/工作/生活/学习,不是"how do you do"那种老掉牙
- **54% 词有词根词缀分析** —— 看到词根,猜出意思
- **每词 3-5 个常用短语** —— 学单词更要学搭配
- **98% 词有音标** —— 英音/美音任选
- **30 天每日一句** —— 每天一句能直接用上的英语
- **5 个真实场景专题课** —— 餐厅点餐 / 问路 / 购物 / 办公职场 / 自我介绍

### 🛠️ 学习闭环
- 🔊 **真人发音** —— 浏览器内置 TTS,常速/慢速切换
- 🎤 **跟读评测** —— 麦克风录音 + 音量/时长分析(诚实标注:仅基于音量时长,无法判断发音准确性)
- 🔤 **中英互译** —— 接入免费公共翻译 API(LibreTranslate + MyMemory)
- ⭐ **生词本** —— SM-2 间隔重复算法,科学复习
- 📕 **错题本** —— 自动识别反复记不住的词,一键掌握
- 🔍 **字母索引** —— 26 字母快速跳转词库(全键盘可用)

### 💅 个性化
- 🎨 **6 个主题色** —— 清新绿 / 海洋蓝 / 神秘紫 / 热情红 / 温暖橙 / 薄荷青
- 🔤 **4 档字号** —— 小 14px / 中 16px / 大 18px / 特大 20px
- 🌗 **暗色模式** —— 跟随系统或手动切换
- 🎙️ **TTS 自定义** —— 选择 voice、调节语速
- 📤 **数据导出** —— CSV / JSON / 完整备份

### 💻 跨端
- 📱 **响应式设计** —— PC + 手机浏览器均可
- 📲 **PWA 离线** —— 可装到桌面/手机主屏,完全离线可用
- 🚀 **零依赖云服务** —— 不花一分钱,数据全本地 IndexedDB

---

## 🚀 快速开始

### 前置要求
- Node.js >= 18
- 一个现代浏览器(Chrome / Edge / Safari / Firefox)

### 启动步骤

```bash
# 1. 克隆
git clone https://github.com/lingoo12138/english-app.git
cd english-app

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 浏览器打开
# http://localhost:5173
```

就这么简单。

### 构建生产版本

```bash
npm run build
npm run preview  # 本地预览构建结果
```

构建产物在 `dist/` 目录,可直接用任何静态服务器托管(GitHub Pages / Vercel / Netlify / Nginx)。

---

## 📖 功能使用指南

### 学习单词
1. 打开首页,看"每日一词"
2. 点击进入单词详情,看音标、例句、词根
3. 点击 🔊 听发音,可调速
4. 自评"认识/不认识",系统安排复习时间
5. 🎤 点"开始跟读"录音评测发音

### 场景专题课
1. 进入"场景课"页,选一个场景(餐厅 / 问路 / 购物 / 办公 / 自我介绍)
2. 逐句学习:看英文 → 听发音 → 标记"认识/不认识"
3. 全部标"认识"后,该场景会显示"已学完"徽章

### 复习
1. 系统按 SM-2 算法自动安排复习时间
2. 进入"复习中心"批量复习待复习的词
3. 反复记不住的词会自动进入"错题本"
4. 错题本按错次排序,前 3 名高亮

### 翻译
1. 进入"翻译"页
2. 输入中文或英文
3. 选择方向(自动检测 / 英→中 / 中→英)
4. 点击翻译,结果可复制

### 数据导出
1. 进入"生词本"
2. 点右上角"导出"
3. 选 CSV(Excel 兼容) / JSON(完整数据) / 完整备份(含学习记录+复习计划+设置)

---

## 🗂️ 项目结构

```
english-app/
├── public/data/                # 静态数据
│   ├── words.json              # 词库(5334 词,6.3MB)
│   └── daily.json              # 每日一句(30 句)
├── src/
│   ├── components/             # 通用组件
│   │   ├── Layout.tsx          # 整体布局 + 导航
│   │   ├── TTSButton.tsx       # 朗读按钮
│   │   ├── WordCard.tsx        # 单词卡
│   │   ├── StudyCalendar.tsx   # 学习日历
│   │   └── PronunciationPractice.tsx # 跟读评测
│   ├── lib/                    # 工具库
│   │   ├── tts.ts              # Web Speech API 封装
│   │   ├── translate.ts        # 翻译 API 封装
│   │   ├── db.ts               # IndexedDB 存储
│   │   ├── words.ts            # 词库加载
│   │   ├── daily.ts            # 每日一句
│   │   ├── streak.ts           # 学习连续天数
│   │   ├── export.ts           # CSV/JSON 导出
│   │   ├── themes.ts           # 主题色/字号
│   │   └── recorder.ts         # 录音 + 评分
│   ├── pages/                  # 页面(11 个)
│   │   ├── Home.tsx            # 首页
│   │   ├── WordList.tsx        # 词库列表
│   │   ├── WordDetail.tsx      # 单词详情
│   │   ├── DailyPage.tsx       # 每日一句
│   │   ├── Translate.tsx       # 翻译
│   │   ├── Notebook.tsx        # 生词本
│   │   ├── WeakWords.tsx       # 错题本
│   │   ├── ReviewCenter.tsx    # 复习中心
│   │   ├── Scenes.tsx          # 场景课列表
│   │   ├── SceneDetail.tsx     # 场景课详情
│   │   └── Settings.tsx        # 设置
│   ├── data/
│   │   └── scenes.ts           # 5 个场景数据
│   ├── store/                  # 全局状态(Zustand)
│   ├── types/                  # TypeScript 类型
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── docs/                       # 项目文档
│   ├── DEV_LOG.md              # 开发日志
│   ├── ROADMAP.md              # 路线图
│   └── CHANGELOG.md            # 更新日志
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 💡 技术选型

| 模块 | 选择 | 原因 |
|-----|-----|-----|
| 前端 | React 18 + TypeScript | 现代主流,类型安全 |
| 构建 | Vite | 启动快,HMR 流畅 |
| UI | Tailwind CSS | 快速开发,无样式冲突 |
| 状态 | Zustand + persist | 轻量,无 boilerplate |
| 存储 | IndexedDB (Dexie) | 浏览器原生,容量大 |
| TTS | Web Speech API | 浏览器内置,免费 |
| 录音 | MediaRecorder + Web Audio | 浏览器内置,免费 |
| 翻译 | LibreTranslate + MyMemory | 公共免费 API,无需 key |
| 路由 | React Router 6 | 主流方案 |
| PWA | vite-plugin-pwa | 一行配置搞定离线 |
| 主题 | CSS 变量 + Tailwind | 6 主题实时切换 |

**零付费依赖** —— 所有用到的库都是 MIT/Apache 开源。

---

## 📊 数据规模(截至 v0.7)

```
词库:        5334 词(7 学段)
词根覆盖:    2897 词(54%)
例句覆盖:    5173 词(96%)
音标覆盖:    5266 词(98%)
短语覆盖:    4000+ 词
每日一句:    30 句(可循环)
场景课:      5 个(40 句 + 50 关键词)
代码行数:    3500+ 行
页面:        11 个
组件:        5 个
第三方依赖:  0 付费
P0/P1 bug:   37 个全清
```

---

## 🔧 故障排查

### TTS 没声音
- 首次使用需联网,浏览器会下载语音包
- 检查浏览器是否禁用了 TTS(Chrome 默认开启)
- 在设置页选择不同的 voice 试试

### 跟读评测无法使用
- 检查浏览器是否授予了麦克风权限
- iOS Safari 16.4+ 才支持 MediaRecorder
- Firefox 部分版本支持的 MIME type 不同

### 翻译失败
- 公共 API 偶尔不稳定,可多试几次
- 在设置页切换翻译源
- 单次翻译文本超过 1000 字符会失败,请分段

### 数据丢失
- 数据存在浏览器 IndexedDB
- 换浏览器、清缓存、卸载浏览器都会清空
- 建议定期在"生词本"导出完整备份

---

## 🗺️ 路线图

### ✅ v0.1 - v0.7(已完成)
详见 [CHANGELOG.md](./docs/CHANGELOG.md)

### 🎯 下一步
- **P3 微信小程序** —— uni-app 编译,跨端覆盖
- **例句扩充** —— 每个高频词从 1.8 句提到 3-5 句
- **图片识别** —— 拍照识物,返回英文 + 发音
- **AI 对话陪练** —— LLM API 接入

详见 [ROADMAP.md](./docs/ROADMAP.md)

---

## 📚 文档

- **[docs/DEV_LOG.md](./docs/DEV_LOG.md)** —— 主开发日志,详细的功能清单、技术决策、验收点
- **[docs/ROADMAP.md](./docs/ROADMAP.md)** —— 路线图,一页纸看完全部计划
- **[docs/CHANGELOG.md](./docs/CHANGELOG.md)** —— 每次发布的变更记录

---

## 📜 许可

代码 MIT 协议,数据(词库/例句)来源网络开源,仅供学习使用。

---

**享受学习。Make English part of your life.**
