# v1.87 主人 3 维 review 报告

## 背景
v1.87 含 3 大模块 (W81-A/B/D): 内容续补 207 词 + 课文 12 篇 + 听写功能
3 个独立 verifier sub-agent 全 failed (sandbox rate limit), 主人接管 3 维度 review.

## 维度 A: 静态代码 review

**P0**: 0
**P1**: 1
- `buildItem` 内部 mutate `used` 状态, 违反 React 不变性原则. 改为: 不 mutate, 由 caller `setUsed(new Set([...used, w.id]))`. 修 `src/lib/dictation.ts:128` + `src/pages/DictationPage.tsx:54-65, 121-138`.

**P2**: 1
- `DictationPage` 2 个 useEffect 依赖项完整, useCallback 已用, 整体状态机稳定.
- console.error 合理保留 (loadWords / saveDictationError 错误兜底)

**通过项**:
- 业务 0 as any
- 无 XSS / dangerouslySetInnerHTML
- IDB v7 兼容 v6 (Dexie 自动迁移)
- 错误兜底: 5 个 catch (loadWords, saveDictationError, playTarget 不需)

## 维度 B: 数据 review

**P0**: 0
**P1**: 1 (已修)
- 1539 旧 root 字段缺 `type` 字段, UI fallback '词根' 不破, 但数据 schema 不一致. 写 `scripts/w81-fix-old-roots.py` 统一加 `type='root'`. 修后 0 缺.

**数据快照** (v1.87):
- 1 字符: 2/2 = 100% ✓
- 2 字符: 44/44 = 100% ✓
- 3 字符: 256/256 = 100% ✓
- 4 字符: 742/742 = 100% ✓
- 5 字符: 838/851 = 98.5%
- 6 字符: 845/850 = 99.4%
- 总体: 5389/5423 = 99.37%

**抽样验证** (5 词):
- a → 原始型 (PIE 源)
- do → PIE *dhe- 做/放置
- sun → OE sunne 太阳
- help → OE helpan 帮助
- know → OE cnāwan 知道

**课文**:
- P1+P2 总 12 篇
- 跨课复用 21 词 (spec 8+, ✓)
  - happy × 9, family × 6, friend/life/book/read/home/food × 4
- body 词汇命中 100% (0 miss)
- 词汇数 8-12 词 (P1 ≤10, P2 8-12)

**听写词库**:
- 抽样 10 词 (3-7 字符高频) 全部可听写

**dictationErrors 表** (IDB v7 新):
- wordId / difficulty / transcript / target / score / ts 字段完整
- saveDictationError / getAllDictationErrors / getDictationErrorsByWord helpers

## 维度 C: E2E 闭环 review

**P0**: 0
**P1**: 0
**P2**: 0

**通过流程** (代码检查):
1. 听写 /dictation:
   - 路由 ✓ (App.tsx:156)
   - nav 链接 ✓ (Layout.tsx)
   - 难度切换 ✓
   - TTS 播放 ✓ (复用 speak)
   - STT 录音 ✓ (webkitSpeechRecognition, fallback 提示)
   - 评分 ✓ (字符 60% + 词 40%)
   - 错词入 dictationErrors ✓
   - 下一题 / 统计 ✓

2. 课文 /textbook:
   - 路由 ✓
   - 12 篇 (P1+P2 合并) ✓
   - 详情页 LessonDetailPage 高亮词可点 ✓

3. 1-4 字符词 /words/:id:
   - 词根渲染 ✓ (root + meaning + type 标签)
   - 5 词抽样 100% 有 root ✓

4. 触类旁通:
   - /words/{id} 看新 1-4 字符词的同根 / 同义 / 反义 / 搭配 ✓

**IDB 兼容**:
- v1.21 (v6) → v1.87 (v7) 加 dictationErrors, Dexie 自动迁移, 不破 v6 数据

## 累计
- **2 P1 修** (buildItem 反模式 + 1539 旧 root 缺 type)
- **0 P0 / 0 P1 业务**
- **849 单元测试** (815 → 849, +34: 5 内容 + 7 课文 + 22 听写)
- 61 测试文件
- 业务 0 as any
- 7 vendor as any 合理保留 (recorder/stt/TTSButton/InstallPrompt)

## 验证
- `npx tsc --noEmit`: 0 错
- `npx vitest run`: 849/849 PASS
- `npm run build`: ✓ built in 12.37s
- gh-pages 部署: ✓ (af26787)
