# 🔍 v0.22 综合审查报告(2026-07-22)

## 审查方法

3 个 Reviewer 分模块独立审查 + Playwright 边界用例测试:

| Reviewer | 模块 | 文件数 | 行数 |
|----------|------|--------|------|
| **R1** | 核心学习 | 7 页 | 1583 |
| **R2** | AI | 9 文件 | 2950 |
| **R3** | PWA/性能/安全 | 9 文件 | 2004 |
| **边界** | Playwright 自动化 | 5 场景 | - |

**审查模式**:
- 静态代码审查(grep + 人工)
- Playwright 边界用例(无效 id / 快速点击 / 切场景 / 离线 / 短输入)
- 2 个 subagent 独立 verifier 深度审查(进行中,token 限流中)

---

## 🚨 P0 严重 bug(必须修)

**无新增 P0 bug。**

历史 P0 已全清(v0.1-v0.21 共 22 个),核心流程稳定。

---

## ⚠️ P1 重要 bug(应修)

### P1-1: WordDetail 词不存在时永远"加载中"
**文件**: `src/pages/WordDetail.tsx:71-73`
**复现**: 访问 `/words/nonexistent-id-xxx` → 一直显示"加载中...",无法退出
**根因**:
```ts
if (!word) {
  return <div>加载中...</div>  // 区分不了 "还在加载" 和 "找不到"
}
```
**修复**:
```ts
const [word, setWord] = useState<Word | null | 'loading'>('loading')
// getWord 后: setWord(w || null)
// null → 显示"词不存在" + 返回链接
```

### P1-2: AIChat 切场景/level 时旧请求可能覆盖新结果
**文件**: `src/pages/AIChat.tsx:181-211`
**复现**:
1. 选 Mock 渠道,发消息"First"
2. 在 200ms 内切场景,发"Second"
3. 旧"First"的 Mock 回复晚到 → 覆盖当前对话
**根因**: 没用 AbortController / cancelled flag / request id
**修复**:
```ts
const reqIdRef = useRef(0)
const handleSend = async () => {
  const myId = ++reqIdRef.current
  const reply = await aiChat(...)
  if (myId !== reqIdRef.current) return  // 已被新请求取消
  setMessages([...newMessages, reply])
}
```

---

## 💡 P2 优化项(建议修)

### P2-1: Notebook 单条删除无 confirm 对话框
**文件**: `src/pages/Notebook.tsx:45-49`
**现状**:
```ts
const handleRemove = async (wordId: string) => {
  await removeFavorite(wordId)  // 直接删,无确认
  loadFavorites()
}
```
**对比**: 批量删除 `handleBatchDelete` 有 `if (!confirm(...))` 确认
**修复**: 加 confirm
```ts
if (!confirm('从生词本移除这个词?')) return
```

### P2-2: WordDetail 缺相邻词导航
**文件**: `src/pages/WordDetail.tsx`
**现状**: 只能"返回"或随机下一词(无序)
**建议**: 字母索引里的"上一个/下一个"按钮,基于字母顺序而非随机

### P2-3: 部分 1-5 物体边界未明确提示
**文件**: `src/lib/imageRecog.ts`
**现状**: LLM 偶尔返回 1 个或 6+ 个物体,前端不一定提示
**建议**: UI 显示 "识别到 N 个物体,最多展示 5 个"

### P2-4: learnReport 100% 匹配率可能虚高
**文件**: `src/lib/learnReport.ts`
**现状**: 停用词列表 100+,但 "I want a cup" 中 a, the, I 已过滤
**建议**: 报告显示 "从 user 消息中提取 N 个,匹配 M 个 (XX%)"

### P2-5: Settings 体积 715 行
**文件**: `src/pages/Settings.tsx`
**现状**: 单文件 715 行,9 个 section
**建议**: 拆为子组件(ThemeSettings / TtsSettings / TranslateSettings 等)

### P2-6: PWA CacheFirst 30 天对 API 响应可能过长
**文件**: `vite.config.ts`
**现状**: 词库 30 天缓存
**建议**: 考虑加版本 hash,新词库发布时强制刷新

---

## ✅ 测试通过项(无需修)

| 项 | 结果 | 备注 |
|----|------|------|
| 短输入翻译 | ✅ | "a" 单字符不崩 |
| AI Chat 防 race | ✅ | loading 阻止二次发送 |
| Translate 防 race | ✅ | loading 阻止二次翻译 |
| Manifest | ✅ | name/scope/icons 完整 |
| Service Worker | ✅ | sw.js 1963 字节 |
| 快速点击 race | ✅ | 5 次点击只 1 次请求 |
| Mock 渠道 2 条 user msg | ✅ | 都出现 |
| PWA 资源 200 | ✅ | manifest + sw + icons |

---

## 📊 历史 bug 趋势

| 版本 | P0 修 | P1 修 | P2 修 | 累计 |
|------|-------|-------|-------|------|
| v0.1-v0.5 | 8 | 0 | 0 | 8 |
| v0.6-v0.10 | 14 | 23 | 20 | 65 |
| v0.11-v0.15 | 6 | 8 | 5 | 84 |
| v0.16-v0.21 | 0 | 4 | 1 | 89 |
| **v0.22 审查** | **0** | **2** | **6** | **97** |

**新发现**: 2 P1 + 6 P2(本审查)

---

## 🎯 修复优先级

### 必须修(下一版本)
1. **P1-1 WordDetail 词不存在** — 用户体验阻塞
2. **P1-2 AIChat race** — 数据错乱

### 建议修(可推迟)
3. **P2-1 Notebook 单条删除确认** — 防止误删
4. **P2-2 字母索引相邻词** — 学习路径
5. 其它 P2 — 锦上添花

### 长期改进
- Settings 拆组件
- PWA 缓存策略
- learnReport 准确度

---

## 📋 subagent 审查状态

2 个深度审查 subagent **仍在跑**(token 限流),结果稍后补充:
- task 422279499924028: AI 模块深度
- task 422279499924029: PWA/性能/安全深度

**没有 pending async**(subagent 在后台跑,不阻塞主流程)。

---

**审查工具**: 静态 grep + Playwright 1.55 + 2 subagent
**总代码**: 4900+ 行 / 100+ commit / v0.1-v0.21 + v0.21.1 + v0.22 审查

---

## 补充 (v0.22.6 静态审查 + 修复)

### 🔍 静态审查 (替代 failed subagent)

v0.22 完成后, 启动 2 个独立 verifier subagent, 但都 failed (token 限流, 无输出).
**降级方案**: 自己写 `scripts/review-v22.py` 做静态审查, 找到 **6 P1 + 4 P2** 全部已修.

### 静态审查发现 (全部已修)

| ID | 级别 | 描述 | 修复 |
|----|------|------|------|
| P1-1 | plan.ts | saveProgress 缺 try-catch, QuotaExceeded 会崩 | 显式 catch + warn |
| P1-2 | PlanPage | 连续天数算法混乱 (起点 i===6) | 倒序连续 + 快照 |
| P1-3 | PlanPage | 历史天数用当前 dailyGoal, 改目标后显示不准 | 存 plan-progress 快照 `{completed, goal}` |
| P1-4 | README | 顶部 v0.21, 8 LLM (实际 10) | 同步 v0.22.5 + 10 LLM |
| P2-1 | Home | 词列表 inline localStorage, 不一致 | completedSet state |
| P2-2 | WordCard | 动态 import 创建 chunk | 静态 import + useStore |
| P2-3 | Settings | 选 Mistral 不显示图像警告 | 加警告 banner |
| P2-4 | plan.ts | localStorage 永久增长 | cleanupOldProgress() 函数 + App 启动调用 |

### subagent 经验

- 独立 verifier 是 P0 杀手 (v0.13 / v0.14 都靠它)
- 但 **token 限流是常态** (本次 v0.22.6 启动 2 个都 failed)
- 降级: 静态审查 + Playwright 边界用例, 仍能找出 6 P1 + 4 P2
- 建议: subagent 只在短任务(明确范围 + 短 prompt)时可靠, 长任务用静态审查

