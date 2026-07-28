# 句刻 · 即时英语学习 v1.23.0

> 让你在"想用英语的瞬间就能用上"——把英语嵌进真实生活场景里。
>
> **极简本地版** —— 无后端、无云服务、无账号,所有数据存在你本地的浏览器里。

[🌐 在线预览](https://lingoo12138.github.io/english-app/) ·
[📖 开发日志](./docs/DEV_LOG.md) ·
[🗺️ 路线图](./docs/ROADMAP.md) ·
[📝 更新日志](./docs/CHANGELOG.md) ·
[✨ 核心特性](./docs/FEATURES.md) ·
[🏗️ 技术架构](./docs/ARCHITECTURE.md) ·
[💬 AI 对话进阶需求](./docs/AI_CHAT_ROADMAP.md) ·
[🔍 v1.6 Review Report](./docs/REVIEW_v1.6.md) ·
[🔍 v1.22.0 Review Report](./docs/REVIEW_v1.22.0.md)

---

## 🎯 当前进度 (v1.23.0)

✅ **24 个版本量产** (v1.1.0 ~ v1.23.0, 3 producer 并行 1d 干完 3-6d 计划 × 17 轮)

| 版本 | 重点 | 状态 |
|------|------|------|
| v1.6.0 | 🐛 4 核心功能深 review + **修 13 个 P0/P1** | ✅ |
| v1.7.0 | 🎧 B 听力自适应 + LLM Tutor 2.0 | ✅ |
| v1.8.0 | 🚀 首启 onboarding + 难度自适应 + 3 小优化 | ✅ |
| v1.9.0 | 💬 自由话题 + 难度自适应增强 | ✅ |
| v1.10.0 | 🌐 中译英 + 同义词 + 例句跟读 | ✅ |
| v1.11.0 | 📅 FSRS + 复习智能队列 + 日报/周报 | ✅ |
| v1.12.0 | 🛠️ 错误恢复 + 拍照场景 + LLM 日限 | ✅ |
| v1.13.0 | 🎭 多角色对话 (5 角色) | ✅ |
| v1.14.0 | 📝 自定义场景课 (粘贴文本) | ✅ |
| v1.15.0 | 📚 自定义场景学习流 (卡片) | ✅ |
| v1.16.0 | 🔗 多场景关联 (入复习队列) | ✅ |
| v1.17.0 | 🎭 多角色扩展 (5→8 角色) | ✅ |
| v1.18.0 | 📁 文件上传 (.txt / .md) | ✅ |
| v1.19.0 | 📅 学习日历 (月历热力图) | ✅ |
| v1.20.0 | 📚 生词本批量操作 (入复习/导出/全选) | ✅ |
| v1.21.0 | 🏷️ 生词本标签 (7 类启发式) | ✅ |
| v1.22.0 | 🔍 复习按 tag 过滤 | ✅ |
| v1.22.0 review | 🛠️ 大 review 修 18 处 catch (e: any) | ✅ |
| v1.23.0 | 📄 **PDF 上传** (懒加载 pdfjs) | ✅ |

详细变更请看 [CHANGELOG.md](./docs/CHANGELOG.md) · 各版本详情见 `docs/RELEASE_v*.md`

---

## ✨ 一句话总结

句刻把英语嵌进真实生活场景里:

- 🍽️ **场景对话** — 5 个真实场景 (咖啡店/机场/购物/酒店/会议) + 6 个难度 (A1-C2) + **8 个角色** (面试官/咖啡师/前台/导游/服务员/医生/银行柜员/警察)
- 📝 **自定义场景** — 粘贴文本 / 上传 .txt / .md / **PDF** → AI 提取生词 → 卡片流 → 入复习队列
- 📷 **拍照识物** — 7 场景 prompt 池 (general/office/food/animal/plant/furniture/tool)
- ⭐ **生词本 + 标签** — 7 类启发式 + 自定义 tag + 复习按 tag 过滤 + 一键入复习/导出 CSV
- 📊 **学习日历 + 报告** — 月历热力图 + 日报/周报 + 错题分析
- 🤖 **10 个 AI 渠道** (LLM/TTS/翻译) + 自定义端点

**完整功能列表** → [FEATURES.md](./docs/FEATURES.md)

---

## 🏗️ 技术栈

```
Vite 5 + React 18 + TypeScript 5 + Tailwind 3 + Zustand 4 + Dexie 3
├─ PWA 离线 (vite-plugin-pwa, 30 天 CacheFirst)
├─ 数据: IndexedDB 本地 (零云)
├─ 测试: Vitest 4 (526 单元测试 + 16 闭环)
└─ 静态审查: verify-v*.mjs + review-v*.py (0 P0/P1 维持)
```

**完整架构** → [ARCHITECTURE.md](./docs/ARCHITECTURE.md)

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
2. GitHub Actions 自动 build + deploy (workflow `.github/workflows/main.yml`)

---

## 📊 累计数据 (截至 v1.59.0)

- **25 页面 + 32 组件 + 44 库 + 13000+ 行代码**
- **5334 词 + 465 词根 (全量 80.4% / Top 2k 86.3%) + 13234 例句 + 5 场景 + 5 听力 + 100 每日一句**
- **10 LLM (含 OpenRouter free) + 8 TTS (4 口音) + 8 翻译 + 3 自定义端点**
- **17 角色模式 (11 单 + 3 多人) + 20 成就 + 8 主题 + 4 字号 + 2 语言 + 7 学段 + 3 步 onboarding + 10 XP 等级**
- **702 单元测试 + 16 闭环 (37 测试点) + 0 P0/P1**
- **130+ bug 修复** (含 v1.6 review 13 + v1.22 18 处 catch any + v1.36 3 处 + v1.40.1 2 处 + v1.45-1.58 verifier 找 12 处)
- **400+ commit / 62 release tag (v1.0.0 ~ v1.62.0)**
- **148 DICT i18n key (zh + en) / 全 25 页面覆盖**
- **零付费依赖** (完全本地 + 公共 API + 免费层 LLM)

---

## 🤝 贡献

这是一个个人项目,但欢迎:
- 提 Issue 报 bug 或建议
- Fork 后改造成自己的版本
- 学习代码结构 (架构清晰可读)

---

## 📄 License

MIT
