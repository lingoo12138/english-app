# v1.87 收官总结 (W81 完结)

## 时间线
- **W81** (v1.87.0) — 3 模块并行: 内容续补 + 课文扩展 + 听写功能
- 3 producer 启动 (sub-agent) → 全 timeout → **主人接管** (跟 v1.85 W78-W79 一样)
- 主人 3 维 review (静态/数据/E2E) → 找 2 P1 → 全修

## v1.87 修了 2 P1 (主人 review)
- **P1**: `buildItem` mutate `used` state 反模式 → 不 mutate, 由 caller `setUsed(new Set([...used, w.id]))`
- **P1**: 1539 旧 root 缺 `type` 字段 → `scripts/w81-fix-old-roots.py` 统一加 `type='root'`

## 累计数据 (v1.87.0)
- **87 release tag** (v0.1.0 ~ v1.87.0) / 17 周 / **18 次大 review**
- **849 单元测试** (815 + 34) / 61 文件 / 全过
- **450+ commit** / 26 页面 / 32 组件 / 45 库
- **5,423 词** / **5,389 词有 roots (99.37%)** / **5,129 词有 phrases (94.6%)**
- **1-4 字符子集 100% 词根覆盖** (新)
- **12 篇课文** (P1+P2, 跨课复用 21 词, 100% 词汇命中)
- **听写功能** (IDB v7, TTS + STT, 4 档评分)
- **60/60 闭环 PASS** (v1.83 修后)
- **130+ bug 修复** + **v1.81-v1.87 累计 75+ 处 (P0/P1/P2)**
- 17 角色模式 / 10 LLM / 8 TTS / 8 翻译 / 8 主题 / 4 字号
- 10 XP 等级 / 7 streak 里程碑
- **0 P0 + 0 P1 业务** 维持
- 业务 0 as any / 7 vendor as any 合理保留
- 6 历史修复全健在
- 8 档 phrases 覆盖率: primary 95% / junior 88% / senior 96% / gaozhong 96% / cet4 96% / cet6 95% / kaoyan 95% / daily 91%

## v1.87 新功能 (W81)
- **A 内容续补**: 207 词 1-4 字符 root (从 PIE/OE/ON/Latin 词源, 1-4 字符 100% 覆盖)
- **B 课文扩展**: 5 → 12 篇 (7 新主题: 校园/食物/健康/购物/交通/家庭/节日)
- **D 听写功能**: TTS 朗读 + STT 录音 + 4 档评分 + 错题入 dictationErrors

## Verifier 累计 25 处真 bug (v1.36 ~ v1.87, 主审查漏判)
- v1.36: 3 / v1.39: 2 / v1.45: 5 / v1.48: 1
- **v1.80 verifier A**: 11 P1 setLoading finally
- **v1.80 verifier C**: 100 "X so" 无意义短语
- **v1.85 verifier E/F/G**: 2 P0 + 11 P1 (v1.86 全修)
- **v1.87 主人 review**: 2 P1 (buildItem + 1539 root type)
- **总 13 P0 + 27 P1 + 14 P2 = 54 处**

## GitHub 状态
- main 分支: 待 push (含 v1.87.1 主人修 P1)
- gh-pages 分支: 已部署 v1.87.0 (af26787)
- 预览: https://lingoo12138.github.io/english-app/
- /docs: https://lingoo12138.github.io/english-app/docs
- README "87 release tag" / ROADMAP "57 轮"

## 下一阶段 (W82 候选)
1. **真机测试 5 步** (15 min, 验证 v1.87 部署)
2. **更多课文** (12 → 20+ 篇)
3. **听写增强** (完整词库 5,423 词, 难度细分)
4. **第 19 次大 review** (累积 3-5 release 后)
5. **内容续补 5-6+ 字符** (1-4 已 100%, 5/6 字符还有些)

## 协作上下文
- 17+ 天连续工作 1+ 凌晨未停
- "测试全过 ≠ 正确" 教训: 主人 review 才能拦 2 P1 (sub-agent 静态/数据 review 都漏)
- **3 个独立 verifier (or 主人 3 维度) 是找对抗性 bug 的唯一方法**
- sub-agent sandbox rate limit 是持续痛点, 3 producer 全 timeout (跟 v1.85 一样) → 主人接管是常态
- **北极星更新**: 不再是堆词, 而是**激活已学** — 内容续补 + 课文 + 听写都是为激活已学
