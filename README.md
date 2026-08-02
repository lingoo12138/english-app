# 句刻 · 即时英语学习 v1.93.0

> 让你在"想用英语的瞬间就能用上"——把英语嵌进真实生活场景里。
>
> **极简本地版** —— 无后端、无云服务、无账号,所有数据存在你本地的浏览器里。

[🌐 在线预览](https://lingoo12138.github.io/english-app/) ·
[📝 更新日志](./docs/CHANGELOG.md) ·
[🗺️ 路线图](./docs/ROADMAP.md) ·
[✨ 核心特性](./docs/FEATURES.md) ·
[🏗️ 技术架构](./docs/ARCHITECTURE.md) ·
[💬 AI 对话进阶需求](./docs/AI_CHAT_ROADMAP.md)

---

## 🎯 当前进度 (v1.93.0)

✅ **93 release tag** (v0.1.0 ~ v1.93.0) / 17 周 / **22 次大 review** (含 2 verifier 抗审查)

### 最近 10 版本速览

| 版本 | 重点 | 状态 |
|------|------|------|
| v1.84.0 | 🔧 大 review 修 11 P1 (触类旁通/课文/填空 4 算法) | ✅ |
| v1.85.0 | 🎧 听写 + 🃏 单词卡 + 8 闭环 (60/60 PASS) | ✅ |
| v1.86.0 | 🐛 修 v1.85 11 P1 + 触类旁通/课文/填空 | ✅ |
| v1.87.0 | 📚 内容 99.37% + 📖 课文 12 + 🎧 听写 22 测试 | ✅ |
| v1.88.0 | 📖 课文 20 篇 + 📝 同义词 244 + 🎧 听写增强 | ✅ |
| v1.89.0 | 🌱 词根 100% (1-9 字符) + 听写 UI + 跟读 | ✅ |
| v1.90.0 | 🃏 单词卡 (Spelling Card) + 字符级 diff | ✅ |
| v1.91.0 | ⭐ 释义收藏 + 错题合并 (5 tab) | ✅ |
| v1.92.0 | 🎤 跟读评分 + 📥 错题导出 CSV | ✅ |
| **v1.93.0** | 🔁 **错题复习模式 (Flashcard, verifier 抗审查)** | ✅ |

详细变更请看 [CHANGELOG.md](./docs/CHANGELOG.md) · 各版本详情见 `docs/RELEASE_v*.md` · `docs/SUMMARY_v*.md`

---

## ✨ 一句话总结

句刻把英语嵌进真实生活场景里:

- 📚 **5,423 高频词 / 100% 词根** (1-9 字符子集) / 5,129 词含短语 (94.6%)
- 🗣️ **20 篇课文** (P1 5 + P2 7 + P3 8) + 244 同义词组
- 🎧 **听写 + 🃏 拼写 + 🎤 跟读评分 + 🔁 错题复习 + ⭐ 释义收藏** 6 大激活功能
- 🍽️ **场景对话** (5 场景 / 6 难度 / 8 角色) + 📝 自定义场景 + 📷 拍照识物
- ⭐ **生词本 + 标签** (7 类启发式) + 🔁 复习按 tag 过滤 + 📥 错题导出 CSV
- 📊 **学习日历 + 报告** (月历热力图 + 日报/周报) + 🤖 **10 LLM + 8 TTS + 8 翻译**

**完整功能列表** → [FEATURES.md](./docs/FEATURES.md)

---

## 🏗️ 技术栈

```
Vite 5 + React 18 + TypeScript 5 + Tailwind 3 + Zustand 4 + Dexie 3
├─ PWA 离线 (vite-plugin-pwa, 30 天 CacheFirst)
├─ 主题: CSS 变量驱动, 8 主题 0 延迟切换
├─ 数据: IndexedDB 本地 (零云) — IDB v8 (translationFavs 表)
├─ 测试: Vitest 4 (939 单元测试 / 68 文件 / +10 W87)
└─ 静态审查: verify-v*.mjs + review-v*.py + **2 verifier 抗审查 (W87+)**
```

**完整架构** → [ARCHITECTURE.md](./docs/ARCHITECTURE.md)

---

## 🚀 快速开始

```bash
npm install
npm run dev      # 开发模式 (http://localhost:5173)
npm run build    # 生产构建 → dist/
npm run preview  # 预览 dist
npm test         # 跑全套测试 (vitest)
```

### 部署到 GitHub Pages

```bash
git push origin main                    # 推代码
npm run build                            # 打包
git worktree add /tmp/gh-pages gh-pages  # 切换 gh-pages 分支
cp -r dist/. /tmp/gh-pages/
git push origin gh-pages --force         # 强制推 gh-pages
```

---

## 📊 累计数据 (截至 v1.93.0)

- **93 release tag** (v0.1.0 ~ v1.93.0) / 17 周 / **22 次大 review** (含 2 verifier 抗审查)
- **939 单元测试 / 68 文件** (v1.85 805 → v1.86 815 → v1.87 871 → v1.88 872 → v1.89 872 → v1.90 886 → v1.91 894 → v1.92 917 → v1.93 939)
- **5,423 词 / 100% 词根** (1-9 字符) / 5,129 词含短语 (94.6%)
- **20 篇课文** (跨课复用 36 词) / **244 同义词组** (P1 146 + P3 98)
- **6 大激活功能**: 触类旁通 / 听写 / 拼写 / 跟读评分 / 释义收藏 / 错题复习
- **27 页面 + 32 组件 + 50 库 + 450+ commit**
- **17 角色模式** (11 单 + 3 多人 + 3 复盘) / **10 LLM** / **8 TTS** / **8 翻译** / **8 主题** / **4 字号**
- **10 XP 等级 + 7 streak 里程碑**
- **130+ bug 修复** (含 verifier 抗审查 4 P0 + 12 P1 在 v1.93 已修)
- **0 P0 + 0 P1 业务** 维持 (200+ 轮)
- **零付费依赖** (完全本地 + 公共 API + 免费层 LLM)

---

## 🔁 最近 3 大关键功能 (W85-W87)

### 1. 错题复习模式 (v1.93.0 W87-A) 🔁

错题变 Flashcard, 队列模型:
- 答对: 移出复习池
- 答错: 推回末尾, 下次再出 (Anki 风格)
- 偷看: 0 分 + 标 peeked (审计友好)
- 字符 60% + 词 40% 综合评分 (multiset, 跟听写算法对齐)

路由: `/errors/review` · 数据: `getAllWritingErrors` + `getAllDictationErrors` 合并

### 2. 释义收藏 + 错题合并 (v1.91.0 W85) ⭐

- **释义收藏**: IDB v8 `translationFavs` 表 ([wordId+index] 复合 key), 每条释义独立收藏
- **错题合并**: DictationError 加 `source` 字段 ('dictation' | 'spelling' | 'follow-read'), ErrorsPage 5 tab filter

### 3. 跟读评分 (v1.92.0 W86-A) 🎤

W83 跟读模式 (TTS 逐句朗读) + STT 录音 + 字符/词级评分. 错入 dictationErrors (source='follow-read').

---

## 🤝 贡献

这是一个个人项目,但欢迎:
- 提 Issue 报 bug 或建议
- Fork 后改造成自己的版本
- 学习代码结构 (架构清晰可读)

---

## 📄 License

MIT
