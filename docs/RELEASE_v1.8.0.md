# v1.8.0 + v1.9.0 Release Notes

**发布日期**: 2026-07-24
**类型**: Feature + Optimization (3 producer 并行 1d 干完 6d 计划)
**重要性**: ⭐⭐⭐⭐ (留存修复 + AI 对话扩展)

## 一句话总结

3 个 producer 并行 1d 干完 6d 计划:**首启 onboarding** (留存修复) + **难度自适应 + 自由话题** (AI 对话扩展) + **OpenRouter 0 成本 / Daily 100 句 / WordDetail 跟读** (3 个顺手小优化)。**164 单元测试 + 0 P0/P1**。

## 🆕 新增功能

### v1.8.0-A 首启 onboarding (W9 团队推荐)
- `Onboarding.tsx` (513 行): 3 步引导
  - 1️⃣ 选学段 (A1 入门 / B1 中级 / C1 高级)
  - 2️⃣ 体验跟读 (复用 PronunciationPractice)
  - 3️⃣ 加生词本 + 跳转首页
- localStorage.onboarded 标记, **只显示一次**
- 可跳过 (右上角 ✕)
- Home CTA "👋 第一次来? 跟我 5 分钟了解" (未引导用户)
- Settings "🔄 重新看引导" 按钮
- a11y: focus trap + Esc 退出 + ARIA label

### v1.9.0 难度自适应 + 自由话题 (W10 团队推荐)
- **`assessUserLevel(messages)`**: 基于最近 5 轮 user 消息词数 + 从属连词
  - A1: ≤3 词, A2: 4-6, B1: 7-12, B2: 13-18, C1: 19-25, C2: >25
  - 含从属连词 (if/because/although) +1 档
  - 至少 3 轮才评估, 不够返 undefined
- **`truncateCustomTopic(topic, maxLen=200)`**: 截断 + Unicode 省略号
- `buildSystemPrompt` 用 `effectiveLevel = dynamicLevel || level`
- UI: "✨ 自动" 切换 + "💬 自由话题" 按钮 + 200 字符 modal

### v1.8.0-C 3 个小优化
- **🆓 OpenRouter 0 成本**: defaultModel `google/gemini-2.5-flash:free` + Settings 标签
- **📅 C4 Daily 100 句**: 30 → 100 句 (10 场景: 旅行/工作/生活/学校/购物/健康/餐厅/酒店/机场/日常)
- **🎤 C8 WordDetail 跟读**: "🎤 跟读" 按钮 + 复用 PronunciationPractice 弹窗

## 🐛 修复

- 3 处历史遗留 `: any` (v1.5 review 漏修):
  - `aiChat.ts:251` `(e: any)` → `(e: unknown)` + `Record<string, unknown>`
  - `providers/llm.ts:59` `raw?: any` → `raw?: unknown`
  - `providers/llm.ts:230` `const body: any` → `const body: Record<string, unknown>`

## 📊 数据对比

| 指标 | v1.7.0 | v1.8.0 | 变化 |
|-----|--------|--------|------|
| 单元测试 | 126 | **164** | +38 |
| 组件 | 21 | **22** | +1 (Onboarding) |
| 库 | 25 | **25** | 维持 |
| 页面 | 20 | **20** | 维持 |
| Daily 句数 | 30 | **100** | +70 |
| P0/P1 bug | 0 | **0** | 维持 |
| commit | 200+ | **210+** | +10 |
| release tag | 9 | **10** | +1 |

## 🧪 验证

```
✓ 164/164 单元测试全过 (16 个测试文件)
✓ 25/25 闭环脚本 (verify-v1.8.0.mjs)
✓ 静态审查 0 P0 + 0 P1 + 0 P2 (review-v1.8.0.py)
✓ 13/13 修复点验证
✓ typecheck 0 错误
✓ vite build pass
```

## 🔗 相关

- 详细 plan: [docs/plans/v1.8.0-onboarding-ai-expansion.md](./plans/v1.8.0-onboarding-ai-expansion.md)
- 团队推荐: 内部 `next-phase-plan-v2.md` (4 周 v1.8-v1.11)
- 代码 diff: https://github.com/lingoo12138/english-app/compare/v1.7.0...v1.8.0
- 4 commits:
  - `2bbb214` docs(plan)
  - `c3867d4` feat(v1.8.0-A): onboarding
  - `38416d5` feat(v1.9.0): 难度自适应+自由话题
  - `aed9f99` feat(v1.8.0-C): OpenRouter+Daily+跟读
  - `26b5bc9` docs: CHANGELOG

## 📦 升级

无需额外操作,直接 `git pull` 即可。OpenRouter 用户可配 API key 走真实 LLM (0 成本 gemini-2.5-flash:free)。

## 🛣 下一步 (W11/W12 团队推荐)

- **W11 (v1.10.0)**: 中译英 Tab (重新提) + 同义词辨析 + 例句 TTS 跟读 (3d)
- **W12 (v1.11.0)**: FSRS 间隔重复 + 复习智能队列 + 学习日报/周报 (3d)

按 1d 干完 3-6d 节奏,预计 2-3d 干完 2 周计划。
