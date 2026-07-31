# v1.86 收官总结 (W78-W80 完结)

## 时间线
- **W78-W79** (v1.85.0) — 3 大新功能 (触类旁通 + 课文 + 填空, 87 测试, 3 producer timeout 主人接管)
- **W80** (v1.86.0) — 3 个独立 verifier review v1.85, 找 2 P0 + 11 P1, 主人接管全修 (commit 5d6ec79)

## v1.85 → v1.86 修了 13 处真 bug (3 verifier 各 1 个, 找对抗性 bug)

### 触类旁通 (Word Network) - 5 处
- **P0 修**: `getRelatedAntonym` 反向查返自身 (46/124 词) — `pair = ANTONYM_PAIRS[reverseWord]` → `[reverseWord]`
- **P1 修**: useEffect 加载链加 `.catch + .finally` (setLoading 兜底)
- **P1 修**: 跳词 URL `/words?q=` 不被 WordList 接收 — WordList 加 `useSearchParams` 读初始 query
- **P1 修**: 117/389 同义词不在词库, UI 不可点 — `isInWordList` + 灰色"🆕 未学" + `disabled`
- **P1**: 同根 tab 30/146 空白 (留 P2, 待扩同根库)

### 课文 (Textbook) - 3 处
- **P1 修**: 跨课复用率 2/5-10 — 改 body, 6 词 (family×3, happy×3, friend/life/book/read)
- **P1 修**: 6 词高亮失效 (复数/派生) — body 改单数 (report/document/task/message/photo)
- **P1 修**: L3 family 凭空 — L3 body 加 "I see my family in the evening"

### 填空 (Fill in Blank) - 5 处
- **P0 修**: hint 误导 54% — hint 改为挖空词的翻译 (从 pool 查)
- **P1 修**: 同词复用 7×/20 — `seenAnswers` 答案去重
- **P1 修**: 长句 57.9% 语法破碎 — 跳过短语动词前半 (call→up)
- **P1 修**: 4 选 1 41% 长度离谱 — `generateOptions` 按长度差排序, ≤60% 浮动
- **P1 修**: 5.8% 答案重复 (同去重)

## 累计数据 (v1.86.0)
- **86 release tag** (v0.1.0 ~ v1.86.0) / 17 周 / **18 次大 review**
- **815 单元测试** (805 + 10 P0/P1 回归) / 58 文件 / 全过
- **450+ commit** / 25 页面 / 32 组件 / 44 库
- **5,423 词** / **5,182 词有 roots (95.6%)** / **5,129 词有 phrases (94.6%)**
- **60/60 闭环 PASS** (v1.83 修后)
- **130+ bug 修复** + **v1.81-v1.86 累计 73+ 处 (P0/P1/P2)**
- 17 角色模式 / 10 LLM / 8 TTS / 8 翻译 / 8 主题 / 4 字号
- 10 XP 等级 / 7 streak 里程碑
- **0 P0 + 0 P1 业务** (主线收官)
- 业务 0 as any / 7 vendor as any 合理保留
- 6 历史修复全健在 (v1.45/48/51/52/55 + 13 v1.6)
- 8 档 phrases 覆盖率: primary 95% / junior 88% / senior 96% / gaozhong 96% / cet4 96% / cet6 95% / kaoyan 95% / daily 91%

## v1.85 新功能 (W78-W79)
- **触类旁通** (Word Network): 1 词 → 4 维联想 (同根/近义/反义/搭配), 146 同义词 + 78 反义词 + 47 测试
- **课文** (Textbook): 5 篇主题 (旅行/工作/生活/情感/科技), 80-150 词, 20 测试
- **填空** (Fill in Blank): 1-N 词挖空, 短句 4 选 1 + 长句 input, 20 测试

## Verifier 累计 23 处真 bug (v1.36 ~ v1.85, 主审查漏判)
- v1.36: 3 / v1.39: 2 / v1.45: 5 / v1.48: 1
- **v1.80 verifier A**: 11 P1 setLoading finally (漏判 producer file-level grep)
- **v1.80 verifier C**: 100 "X so" 无意义短语 (W64/W65 模板错)
- **v1.85 verifier E 触类旁通**: 1 P0 + 4 P1
- **v1.85 verifier F 课文**: 0 P0 + 3 P1
- **v1.85 verifier G 填空**: 1 P0 + 4 P1
- **总 13 P0 + 25 P1 + 14 P2 = 52 处** (其中 2 P0 + 11 P1 在 v1.86 已修)

## GitHub 状态
- main 分支: `5d6ec79` v1.86.0
- gh-pages 分支: `fd19306` v1.86.0 部署 ✓
- 预览: https://lingoo12138.github.io/english-app/
- /docs: https://lingoo12138.github.io/english-app/docs
- README "86 release tag" / ROADMAP "56 轮"

## 北极星
> 让英语在你想用的时候就能用上 = 触发可业 + 内容能用 + 学得会
- **触发可业** ✓ (17 角色/7 场景/2 入口/连击/IPC 复习)
- **内容能用** ✓ (95.6% 词根 / 94.6% 短语 / 触类旁通 4 维)
- **学得会** ✓ (FSRS/课/听/填/可点/未学标 + 实时反馈)

## 下一阶段 (W87 候选)
1. **内容续补 241 词** (1-4 字符, ROI 低, 估计 1-2 周)
2. **内容生产更多课文** (5 → 10-15 篇, 日常/职场/校园/食物)
3. **真机测试 5 步** (15 min, 验证部署)
4. **听写功能** (技术最简, 复用 PronunciationPractice)
5. **第 19 次大 review** (累积 3-5 release 后防回归)

## 协作上下文
- 17+ 天连续工作 1+ 凌晨未停
- "测试全过 ≠ 正确" 教训: 47+20+20=87 测试 PASS 但漏 2 P0
- **3 个独立 verifier** 是找对抗性 bug 的唯一方法
- **北极星更新**: 不再是堆词, 而是**激活已学** — 触类旁通 + 课文是真方向
- **大 review 时机**: 累积 3-5 release 后做防回归

## 关键代码位置 (v1.86 修复)
- 触类旁通 P0: `src/lib/wordNetwork.ts:189-205` (`getRelatedAntonym` reverse 路径)
- 触类旁通 P1: `src/components/WordNetwork.tsx:108-128` (useEffect finally + isInWordList)
- 触类旁通 P1: `src/pages/WordList.tsx:18-25` (useSearchParams)
- 课文 P1: `src/data/textbook.ts` (5 篇 body, 6 词跨课复用)
- 填空 P0: `src/lib/fillblank.ts:194-221` (hint 改为挖空词翻译)
- 填空 P1: `src/lib/fillblank.ts:122-145, 178-198` (去重 + 长度匹配 + 跳过短语动词)
