# 句刻 v0.23 - v0.26 4 周路线图

> **作者**: Mavis (产品决策) + 产品战略顾问(plan) + 独立 Verifier(review)
> **基线**: v0.22.9
> **窗口**: 2026-07-23 → 2026-08-20(4 周)
> **北极星**: 让英语在你想用的时候就能用上
> **核心约束**: 无后端 / 零付费 / local-first / solo dev

---

## 0. Verifier 反馈 + 调整

原始 `next-phase-plan.md` 4 周规划,经独立 verifier 审查(`plan-review.md`):
- **Verdict**: PASS-WITH-CONCERNS
- 调整采纳:
  1. **W1 加每日一句跟读**(verifier C1 关键洞察,日活杠杆)
  2. **W1 砍中译英 Tab**(scope creep,已有 /translate 页)
  3. **W2 改错本推 W3**(W2 排程 6.5d 偏紧,改错本在数据稀疏期价值低)
  4. **W3 满 5d**(词根 2.5d + 改错本 2.5d)
  5. **W4 加 PWA 缓存精细化**(v0.22.2 P2-6 漏项)
  6. **W4 缓冲 1d 升级为 1.5d**

---

## 1. 4 周总览

| 周 | 主功能 | 副功能 | 天数 | 关键交付 |
|----|--------|--------|------|----------|
| **W1**(v0.23) | 写作批改 `/write` | 每日一句跟读 + 对话中收藏 | 7d | 2 个 LLM 场景 + 1 个日活触发 |
| **W2**(v0.24) | AI 实时纠错 | (W1 写作批改验收) | 4.5d | AI 对话从"玩具"变"学具" |
| **W3**(v0.25) | 词根扩充 54%→75% | AI 改错本 `/errors` | 5d | 数据壁垒 + 错题聚合 |
| **W4**(v0.26) | 听力模式 MVP `/listen` | P2 收尾 + PWA 精细化 | 5d(1.5d 缓冲) | 新维度 + 缓存升级 |

---

## 2. W1 — v0.23 写作批改 + 每日一句跟读

### W1-A: 写作批改 `/write`(主,4.5d)
**目标**: 用户粘贴英文 → LLM 改错 → 标色 diff → 一键收藏错句

**scope IN**:
- 新页面 `/write`,单 Tab "改正错误"(砍中译英)
- textarea 限制 500 字符
- 调 LLM:`{corrected, errors: [{original, suggestion, type, explanation, severity}]}`
- UI: 原文 vs 改后并排 + 错误高亮 + 点击看 explanation
- IndexedDB `writing_errors` 表(user_id=本地、ts、错误列表、原文、改后)
- "我的作文"历史 Tab
- "加入生词本"按钮: errors 涉及的词加到 favorites(去重)
- **Mock 渠道扩 writing 分支**(0.5d 隐形成本)

**scope OUT**:
- ❌ 中译英 Tab(verifier C3)
- ❌ 多轮追问
- ❌ 评分/打分
- ❌ PDF 导出
- ❌ 分享

**成功标准**:
- 粘贴 "I go to school yesterday" → 5 秒返回改错
- 错误高亮可点看 explanation
- "我的作文"历史可重新打开
- 错词可一键加入生词本
- Mock 渠道可测

**风险 + 应对**:
- R1 LLM 改错质量参差 → prompt 加 3-5 个 one-shot + 难度选择(A1-C2)
- R2 diff 渲染复杂 → 简化为段落级,只标行级错误
- R3 500 字符超长 → 截断 + UI 提示

### W1-B: AI 对话中单词收藏(1d)
**目标**: AIChat 消息长按 500ms → 选单词 → 弹收藏 → 加生词本

**scope IN**:
- 消息内容长按 500ms → 选中单词 → tooltip 翻译 + ⭐ 收藏
- 调 `addFavorite(wordId)`(复用现有 favorites 表)
- 单词不在词库时降级:仅显示翻译,不加入生词本

**scope OUT**:
- 词性标注 / 多义词选择 / 上下文截图

**风险**:
- iOS 长按冲突 → 用 `click + window.getSelection()` 而非 `touchstart`

### W1-C: 每日一句跟读(1.5d) ⭐ verifier C1
**目标**: `/daily` 页加"跟读"按钮 → 调 PronunciationPractice 组件 → 评分

**scope IN**:
- DailyPage.tsx 加"🎤 跟读"按钮(每日一句卡片)
- 跳 PronunciationPractice,句子 = `sentence.en`
- 跟读后回 DailyPage 显示分数 + 鼓励

**scope OUT**:
- 跟读排行榜(无后端)
- 录音分享

**成功标准**:
- 每日一句卡片有"跟读"按钮
- 点击调 PronunciationPractice 跟读 sentence.en
- 完成显示分数

**为什么 W1-C 关键**:
- 直接命中"每日价值感"+"习惯触发"双杠杆
- W1-A 写作批改是低频(学生/职场)
- W1-C 是字面意义上"日活触发"
- 复用现有 PronunciationPractice 组件,1.5d 交付

---

## 3. W2 — v0.24 AI 实时纠错

### W2-A: AI 对话实时纠错(主,4.5d)
**目标**: 用户发消息 → 后台并行 LLM call 纠错 → 用户气泡下"✏️ 纠错 (N)"

**scope IN**:
- aiChat.ts 加 `reviewMessage(text, level)`
- prompt: `{hasError, errors: [{original, fixed, why, severity}]}`
- 发送后**并行**起纠错 call(不阻塞主对话)
- 用户气泡下 "✏️ 纠错 (N)" 按钮,点开看 errors
- "加入生词本": errors 涉及的词加 favorites
- Mock 渠道跳过纠错

**scope OUT**:
- 流式纠错(太慢)
- 自动改写用户消息
- 错题统计(推 W3)

**成功标准**:
- "I go to school yesterday" → "✏️ 纠错 (1)" → "yesterday → went + 原因: 不规则过去式"
- Mock 渠道跳过

**风险**:
- R1 双 LLM 成本翻倍 → 用 `extra.lowPriority` + 推荐轻量模型(gemini-2.0-flash-exp)
- R2 纠错噪音 → severity < 0.3 不显示 + "本次不纠错"开关
- R3 race condition → reqIdRef 跟踪(v0.22 P1-2 已用) + chatId+msgId 关联

### W2 不做:AI 改错本(推 W3)

---

## 4. W3 — v0.25 词根扩充 + 改错本

### W3-A: 词根词缀扩充 54% → 75%(2.5d)
**目标**: Top 2000 词补词根,覆盖率 75%

**scope IN**:
- 脚本 `scripts/expand-roots.mjs`(类比 v0.2 expand-examples)
- 选频次 Top 2000 词(覆盖 75% 用户场景)
- LLM 批量(每批 20 词)
- 输出: 更新 words.json `roots: [{prefix/root/suffix, meaning}]`
- 跑批 + spot-check 50 词
- 数据版本号 +1 触发 PWA 缓存失效

**scope OUT**:
- 不规则词
- 派生关系图谱

**风险**:
- R1 LLM 幻觉 → 规则过滤(只接受 pref/root/suf 三段 + known prefix 表)
- R2 rate limit → retry + 5s 退避
- R3 数据膨胀 → 精简表达

### W3-B: AI 改错本 `/errors`(2.5d)
**目标**: 聚合 W1-A 写作批改 + W2-A 实时纠错的错误

**scope IN**:
- IndexedDB `writing_errors` + `chat_errors`(source: 'write' | 'chat')
- 新页面 `/errors`: 按错误类型分组 + Top 10 易错词 + 时间列表
- 详情: 点错词 → 原始消息(写/对话)

**scope OUT**:
- 错题测试(后续)
- 错题 PDF 导出(后续)

**为什么 W3 而不是 W2**:
- W2 末数据稀疏(5-7 天)
- 词根扩充 + 改错本都依赖 LLM 批处理,适合一起跑
- W3 满 5d(2.5+2.5)

---

## 5. W4 — v0.26 听力 MVP + P2 收尾

### W4-A: 听力模式 MVP `/listen`(2.5d)
**目标**: 5 篇精选短文(80-120 词),TTS 播放,挖空听写

**scope IN**:
- 新页面 `/listen`,5 篇短文(LLM 生成 + 人工 spot-check)
- 整篇 TTS 播放 + 慢速切换(新 `TTSPlayer` 组件,0.5d 隐形成本)
- 听写模式: 挖空 5-10 关键词,用户输入 → 提交 → 标红错
- 错词加入生词本

**scope OUT**:
- 字幕显示
- 跟读评分(已有 PronunciationPractice)
- 用户上传 / LLM 自动生成(数据质量)

**风险**:
- 短文内容质量 → LLM 生成 + 人工 spot-check
- TTS 长文不稳 → Edge/Azure TTS(已支持)

### W4-B: P2 收尾 + PWA 精细化(1.5d)
**目标**: 不做 47 P2 全清,挑 5-8 个高 ROI

**清单**(挑):
- [ ] Home.tsx 拆分(今日一句/计划/提醒卡片拆组件)
- [ ] AIChat.tsx 401 行 → 拆 `<ChatHistoryPanel />` 等
- [ ] aiChat.ts 加 retry / timeout
- [ ] WordList 搜索加拼写容错(fuzzy)
- [ ] **PWA 缓存精细化**(`vite.config.ts` 加 hash 命名 + Home "新版本可用" 提示)
- [ ] 静态审查脚本 `scripts/review-v23.py`

### W4 缓冲(1d)
- W1-W3 任何延期吸收
- 写文档 / 录 demo

---

## 6. 显式不做(本 4 周)

| 不做 | 原因 |
|------|------|
| 微信小程序(uni-app) | 2+ 周,无 native 经验,PWA 已覆盖 80% |
| Android App | 同上 |
| 多端同步/账号/社区 | 违反"无后端"硬约束 |
| 47 P2 全清 | 挑高 ROI 5-8 个 |
| 离线对话(脚本库) | 不解决"用户没 LLM key" |
| 多角色对话 | 留存数据未知,W4 后看 |
| 中译英 Tab | W1 砍,scope creep |
| 新 LLM 渠道 | 已 10 个,饱和 |
| 错题 PDF 导出 | W2-B 已砍,后续 |

---

## 7. 7 大待决问题(用户拍板)

1. **微信小程序是否进 H2?** — 当前不,Web 端 PWA 优先
2. **写作批改/纠错日限量?** — W1 上线时"日 20 次"看反馈
3. **听力内容 LLM 生成?** — 建议 LLM + 人工 spot-check
4. **错题本 PDF 导出?** — 后续,不在 4 周内
5. **学习提醒 onboarding?** — W1-C 跟读时顺便加"邀请坚持 7 天"
6. **subagent 经常 fail 换架构?** — 已降级,继续
7. **是否开 v1.0?** — 8 周版(W4 末)做 v1.0 发布

---

## 8. 5 大风险监控

| 风险 | 监控点 | 应对 |
|------|--------|------|
| LLM 限流/挂掉 | /learn 报告页加"错误率" | 多渠道 fallback |
| subagent 失败 | 2 个内 1 fail 降级 | 主人接管 + 静态审查 |
| PWA 缓存 | Home "新版本可用" 提示 | v0.22.2 已版本化 |
| IndexedDB quota | 80% 提醒用户 | navigator.storage.estimate() |
| 7 天连续率 | streak 指标 | W4 后看数据,北极星风险 |

---

## 9. 成本-收益总表

```
W1: 写作批改 (4.5d) + 每日一句跟读 (1.5d) + 对话中收藏 (1d) = 7d
W2: AI 实时纠错 (4.5d) = 4.5d  ← 改错本推 W3
W3: 词根扩充 (2.5d) + AI 改错本 (2.5d) = 5d
W4: 听力 MVP (2.5d) + P2 收尾 (1.5d) + 缓冲 (1d) = 5d
─────────────────────────────────
总计: 21.5d (略超,但 W4 缓冲 1d 吸收)
```

**4 个核心交付**:
- v0.23: 写作批改 + 每日一句跟读 + 对话中收藏
- v0.24: AI 实时纠错
- v0.25: 词根扩充 75% + 改错本
- v0.26: 听力 MVP + P2

---

**最后更新**: 2026-07-23
**下个 checkpoint**: W1 结束(v0.23 发布)复盘 + 调整 W2
