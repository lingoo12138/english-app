# 句刻 - 开发日志

> 这份文档是产品**理论层面的完整功能记录**,供用户在无时间亲自测试时查阅、验收、规划下一步。
>
> 最后更新: 2026-08-01 (v1.93.0)

---

## 📊 累计交付 (v0.1.0 ~ v1.93.0)

**17 周 / 93 release tag / 22 次大 review (含 2 verifier 抗审查)**

### 7 阶段演进

1. **基础 (v0.1-v0.20)**: 5334 词 / 多 AI 渠道 / FSRS / 跟读评测
2. **触类旁通 (v1.1-v1.5)**: 同义词 146 / 反义词 / 词根 / 填空 / 释义
3. **大 review (v1.6-v1.13)**: 13 P0/P1 修 / 听力自适应 / LLM Tutor 2.0
4. **自定义场景 (v1.14-v1.28)**: 自定义课 / 文件 / PDF / 多人对话
5. **内容扩充 (v1.29-v1.79)**: 短语 9 轮 (W42-W57) / 触类旁通 / 课文 / 填空
6. **收官 (v1.80-v1.85)**: 3 verifier 找 11 P1 / 60 闭环 PASS / 3 大新功能
7. **持续修 (v1.86-v1.93)**: 11 P1 / 内容 99.37% / 释义收藏 / 错题合并 / 跟读评分 / 错题复习 (verifier 抗审查)

### 最近 10 版本重点 (v1.84-v1.93)

- **v1.84.0** 🔧 大 review 修 11 P1 (触类旁通/课文/填空 4 算法)
- **v1.85.0** 🎧 听写 + 🃏 单词卡 + 8 闭环 (60/60 PASS)
- **v1.86.0** 🐛 修 v1.85 11 P1
- **v1.87.0** 📚 内容 99.37% (1-4 字符 100%) + 📖 课文 12 + 🎧 听写 22 测试
- **v1.88.0** 📖 课文 20 + 📝 同义词 244 + 🎧 听写增强
- **v1.89.0** 🌱 词根 100% (1-9 字符) + 听写 UI + 跟读
- **v1.90.0** 🃏 单词卡 (Spelling Card) + 字符级 diff
- **v1.91.0** ⭐ 释义收藏 (IDB v8) + 错题合并 (5 tab)
- **v1.92.0** 🎤 跟读评分 (W83 跟读 + STT) + 📥 错题导出 CSV
- **v1.93.0** 🔁 错题复习模式 (Flashcard) — **2 verifier 抗审查 + 主人修 v1 全修 4 P0 + 12 P1**

---

## 🔁 最近 3 大新功能详解 (W85-W87)

### 1. 错题复习模式 (v1.93.0 W87-A) 🔁

**业务承诺**: 错题变 Flashcard, 答对移出, 答错留, 偷看 0 分.

**核心算法** (队列模型):
```
answerInSession(session, userAnswer, peeked):
  card = session.remaining[0]
  session.remaining.shift()  // 弹出当前
  if (!correct || peeked):
    session.remaining.push(card)  // 错题留, 下次再出
  correct = (grade in [perfect, good])
```

**Verifier 抗审查** (W87 关键价值):
- **Verifier A** (算法/状态): 3 P1
- **Verifier B** (业务/UX): 4 P0
- **主人修 v1 全修**: 字符权重 0.6/0.4 + multiset + 队列 + 偷看 0 + useEffect focus

**路由**: `/errors/review` · 数据: `getAllWritingErrors` + `getAllDictationErrors` 合并

### 2. 释义收藏 + 错题合并 (v1.91.0 W85) ⭐

- **释义收藏**: IDB v8 `translationFavs` 表 ([wordId+index] 复合 key), 每条释义独立 ⭐/☆
- **错题合并**: DictationError 加 `source` 字段 ('dictation' | 'spelling' | 'follow-read'), ErrorsPage 5 tab filter

### 3. 跟读评分 (v1.92.0 W86-A) 🎤

W83 跟读模式 (TTS 逐句朗读) + STT 录音 + 字符/词级评分. 错入 dictationErrors (source='follow-read').

---

## 📊 累计数据 (v1.93.0)

- **93 release tag** (v0.1.0 ~ v1.93.0) / 17 周
- **22 次大 review** (含 2 verifier 抗审查)
- **939 单元测试 / 68 文件**
- **5,423 词 / 100% 词根** (1-9 字符子集) / 5,129 词含短语 (94.6%)
- **20 篇课文** (跨课复用 36 词) / **244 同义词组**
- **6 大激活功能**: 触类旁通 / 听写 / 拼写 / 跟读评分 / 释义收藏 / 错题复习
- **27 页面 / 32 组件 / 50 库 / 450+ commit**
- **17 角色模式 / 10 LLM / 8 TTS / 8 翻译 / 8 主题 / 4 字号**
- **10 XP 等级 + 7 streak 里程碑**
- **130+ bug 修复** (含 verifier 抗审查 4 P0 + 12 P1 在 v1.93 已修)
- **0 P0 + 0 P1 业务** 维持 (200+ 轮)
- **零付费依赖**

---

## 🎯 关键经验 (跨 93 版本)

### 流程类
- **大 review 机制**: 类似 v1.6 13 bug 修 / v1.22 18 处 catch any / v1.36 3 处 / v1.40.1 2 处 / v1.45-1.58 verifier 12 处
- **verifier 抗审查 (W87+)**: 2-3 独立 verifier sub-agent 并行, 找对抗性 bug. W87 找 4 P0 + 12 P1, 主人单独 review 漏 90%.
- **0 P0 + 0 P1 业务** 维持 200+ 轮

### 算法类
- **字符 multiset 替代 Set**: 重复字符 (mississippi) 永远吃亏, 改 frequency map
- **字符权重 0.6/0.4 跟听写对齐**: 听写 / 拼写 / 跟读评分 算法统一
- **LCS 字符级 diff**: 区分 missing (目标有用户无) / wrong (位置对齐但字符错) / extra (用户多)
- **FSRS 间隔重复**: 间隔 = stability × difficulty_factor

### 架构类
- **IDB schema 兼容**: 只能加 version (7 → 8), 不能破坏 v6
- **复合主键 [wordId+index]**: 释义收藏复用 1 word 多释义
- **复合 source 复用 1 表**: DictationError.source = 'dictation' | 'spelling' | 'follow-read'
- **verifier 抗审查 (W87 关键价值)**: 业务级 bug 算法测试都过, UI/状态机漏

### 业务类
- **"答对移出 / 答错留"**: 队列模型 (shift + push 末尾)
- **"偷看 0 分 + 标 peeked"**: 审计友好
- **CSV BOM**: \uFEFF 前缀让 Excel 中文不乱码
- **错题合并 5 tab filter**: 写作 / 对话 / 听写 / 拼写 / 跟读

---

## 🚀 未来计划 (W88+ 候选)

1. **真机测试 5 步** (15 min, 验收 v1.89-v1.93 部署)
2. **第 23 次大 review** (拉 1-2 verifier 跑 W87-A 修 v1, 验证修对了)
3. **错题复习增强** (session 持久化 IDB / 难度自适应)
4. **跟读评分趋势图** (得分曲线)
5. **释义收藏列表页** (复用 Notebook 模式)
6. **错题导入 CSV** (多设备同步)
7. **10+ 字符专业词根补全** (5 词, ROI 低)
8. **触类旁通 UI 增强** (推荐路径图)

## v2.0.8 W100 (2026-08-05) 侧边栏 滚动 修复

### 业务 bug
- 桌面 22 项 nav 在屏幕 < 1100px 时 末 3 项 (跟读趋势/成就/文档) 不可访问
- 实际 阈值 (verifier 校准): header 102px + nav padding 32px + 22 项 * 44px = 1102px
- 1080p 显示器 (可用 ~960px) 也 滚, 不只小屏

### CSS 修复 关键
- `md:overflow-hidden` (aside 整 不滚, 内部 滚)
- `flex-shrink-0` (header 不 被 压缩)
- `min-h-0` + `flex-1` + `overflow-y-auto` (nav 内部 滚)
- **关键 教训**: flex item 默认 `min-height: auto` → overflow-y-auto 失效
  - 必须 `min-h-0` 才能 让 flex item 滚 动

### verifier 抗审查 找 5 P1 + 5 P2, 修 P1 全修
- P1-1: 测 试 1 正则 不 强制 md: 前缀 → 改 锚定 md:overflow-hidden
- P1-2: 漏 关键 类 min-h-0 (业务 关键) → 加 min-h-0 + flex-1 断言
- P1-3: 22 项 全 渲染 漏 → 加 RTL render 测
- P1-4: 跨 设备 不 变 漏 → 加 桌面 hidden md:flex + 移动 md:hidden
- P1-5: 标 错 W99 → 改 W100

### 测试 覆盖
- 2 → 8 测试 (业务 关键 22 项 全 渲染 验证)
- @testing-library/react (新 装, RTL render 测)
- 1105 测试 / 85 文件 全过

### 累计 (v2.0.8 W100)
- 108 release tag / 18+ 周 / 32 次大 review (含 11 verifier 抗审查)
- 24 P0 + 49 P1 累计修
- 0 P0 + 0 P1 业务 维持
