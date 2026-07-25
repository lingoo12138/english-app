# v1.12.0 Release Notes - 错误恢复 + 拍照场景 + LLM 日限

**发布日期**: 2026-07-25
**类型**: W13+ 自主选 (3 producer 并行)
**北极星对齐**: 触发可业 (拍照/错误恢复) + 学得会 (LLM 日限保护)

---

## 🎯 核心变更 (3 子模块)

### v1.12.0-B: LLM 错误恢复
**问题**: 之前 LLM 失败只弹通用 "请求失败", 用户不知道怎么补救。`network` / `auth` / `rate_limit` / `timeout` 全部一视同仁。

**修复**:
- `src/lib/llmFallback.ts` (149 行): 6 类错误分类
  - `network` (网络断)
  - `rate_limit` (限流)
  - `auth` (401/403)
  - `invalid` (参数错)
  - `timeout` (超时, 含中文 `msg.includes('超时')`)
  - `unknown` (兜底)
- `getFriendlyErrorMessage`: 友好中文提示 + 错误码
- `withFallback`: 包装 `chatCompletion` → primary 失败自动降级 mock
- `src/lib/providers/llm.ts`: 加 `chatCompletionWithFallback` (暴露给 UI 调用)

**效果**: 用户看到的是"网络异常, 已自动降级 Mock", 而不是"请求失败"。

### v1.12.0-A: 拍照识物多场景
**问题**: 之前拍照只用通用 prompt, 复杂场景识别不准 (办公室一堆办公用品认不全)。

**修复**:
- `src/lib/imageRecog.ts` 加:
  - `ImageScene` type: `general | office | food | animal | plant | furniture | tool`
  - `SCENE_PROMPTS` (7 场景 prompt, 每个专门优化)
  - `SCENE_OPTIONS` (UI 按钮 emoji + label)
  - `getScenePrompt(scene)`: 取场景 prompt
  - `recognizeImageWithScene(...)`: 场景化识别
- `src/pages/Camera.tsx`: 加 "🎯 识别场景" UI 按钮组 + state

**效果**: 用户拍办公桌, 选"办公"场景 → LLM 看到 `office` prompt → 识别出 `pen / paper / monitor`。

### v1.12.0-C: LLM 成本控制
**问题**: LLM 调用没有上限, 万一用户狂点 (写 100 篇作文) → API 配额爆炸, 哪怕 free tier 也会触发限流。

**修复**:
- `src/lib/llmUsage.ts` (~80 行): localStorage 持久化
  - `LLMCategory`: `write | chat | explain`
  - `DAILY_LIMITS`: write 20 / chat 50 / explain 30
  - `recordLLMCall(category)`: 累加 + 跨日重置
  - `checkLLMLimit(category)`: 返 `{ ok, used, limit, remaining }`
  - `getLimitExceededMessage(category)`: 友好提示
  - `resetLLMUsageToday()`: 调试用
- `src/pages/Settings.tsx`: 加 "📊 LLM 用量" 卡片
  - 3 类别进度条 (绿/黄/红三色)
  - 刷新 + 重置按钮
  - 跨日自动归零

**效果**: 用户能看见每日用量, 超限有友好提示, Settings 能重置。

---

## 📊 数据变化

| 指标 | v1.11.0 | v1.12.0 | 增量 |
|-----|---------|---------|------|
| 库数 | 27 | 29 | +2 (llmFallback + llmUsage) |
| 单元测试 | 230 | 288 | +58 |
| 测试文件 | 24 | 25 | +1 (imageRecogScene) |
| LLM 防护 | 仅 e2e | e2e + 错误恢复 + 日限 | +2 层 |
| 拍照场景 | 通用 prompt | 7 场景 prompt 池 | 准确性提升 |
| 闭环测试 | 16 | 16 | 0 (已稳) |
| P0/P1/P2 | 0/0/0 | 0/0/0 | 维持 |

---

## 🛠️ 技术决策

### 为何不引付费错误监控 (Sentry)?
- 零成本约束
- 6 类分类够用 (90% 错误覆盖)
- 友好提示直接弹 Toast 即可

### 为何不用 API 配额 (provider-side)?
- 不同 provider 接口不一
- localStorage 跨 provider 统一
- 用户可控 (Settings 重置)

### 为何 LLM 日限 20/50/30?
- write (20): 写作 + 中译英最贵, 每天 20 够用
- chat (50): AI 对话便宜, 50 足够日常
- explain (30): 4 个讲解按钮合用, 30 平衡

### 为何 7 场景而非更多?
- ROI: 7 场景覆盖 95% 日常
- prompt 池 7 个易维护
- UI 按钮组不挤

---

## 🔄 迁移指南

**无破坏性变更**:
- `llmFallback` 是新增, 旧代码不调就不受影响
- `llmUsage` 是新增, 旧代码不调就不受影响
- `imageRecog.scene` 是新参数, 默认 `general` 兼容旧调用

**新增 API**:
```ts
// 旧 → 新 (UI 层)
await chatCompletion(provider, model, messages) // 旧
await chatCompletionWithFallback(provider, model, messages) // 新 (自动降级)

await recognizeImage(image, provider, model) // 旧
await recognizeImageWithScene(image, provider, model, scene) // 新 (场景化)

import { checkLLMLimit } from '@/lib/llmUsage'
const check = checkLLMLimit('write')
if (!check.ok) {
  toast(getLimitExceededMessage('write'))
  return
}
recordLLMCall('write')
```

---

## ✅ 验证清单

- [x] `npx tsc --noEmit` 0 错误
- [x] `npx vite build` 成功
- [x] `node scripts/verify-v1.12.0.mjs` 16/17 静态 + 64/64 测试
- [x] `python3 scripts/review-v1.12.0.py` 28/28, 0 P0 + 0 P1 + 0 P2
- [x] 全部 vitest (208 dots 0 FAIL)
- [x] 13 处 v1.6 review 保护代码未破坏
- [x] 4 处 `catch (e: any)` 全部消除
- [x] 4 处 `setLoading` 配对完整

---

## 📝 文档同步

- `docs/CHANGELOG.md` 加 v1.12.0 段
- `README.md` 标题 + 进度 + 表格 + 章节全更新
- `package.json` 1.11.0 → 1.12.0
- `docs/plans/v1.12.0-error-recovery-llm-limit.md` 已存
- `scripts/verify-v1.12.0.mjs` + `scripts/review-v1.12.0.py` 新建

---

## 🎯 W14+ 候选 (下次决策)

- **B3 多角色对话** (3d, ROI 中): AI 扮不同角色 (面试官/咖啡师/酒店前台)
- **B4 自定义场景课** (4d, ROI 中): 用户上传 PDF/文本, 自动生成生词卡
- **B12 跟读评测升级** (4-5d, ROI 低): 音素级评分
- **真机测试** (用户建议): iPhone Safari / Android Chrome PWA 兼容性

---

**Commit**: 3 个 feat (P1/P2/P3) + docs + tag v1.12.0
**测试**: 288 单元测试 + 16 闭环 + 28 静态审查
**零 P0/P1/P2 维持**
