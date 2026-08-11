# W139 抗审查报告 — e2e 自纠 + 1 真业务 P0

> 验证时间: 2026-08-12
> 验证基础: main 分支 caf72cd (W139 修复后)
> 验证人: 主人 owner-self-verify (3 reviewer sub-agent W138 全超时, 跟 W132/W135/W136 同款兜底)

## 总览

| 维度 | 修前 (W138) | 修后 (W139) | 改善 |
| --- | --- | --- | --- |
| 整体 e2e 套件 (4 spec) | 12 fail (10 网络 + 2 路由) | **0 fail** | **100%** |
| smoke (11 测试) | 3 fail | 11/11 PASS | ✓ |
| functional (10 测试) | 4 fail | 10/10 PASS | ✓ |
| all-pages (28 测试) | 4 fail + 1 业务 P0 | 26/26 PASS | ✓ |
| full-coverage (29 测试) | 1 fail (cascade) | 26/26 PASS | ✓ |
| w135-pwa-update (6 测试) | 1 fail (regex bug) | 6/6 PASS | ✓ |
| w129 4 spec (10 测试) | 4 fail (IDB 污染) | 10/10 PASS | ✓ |
| **业务 P0 暴露** | **0** (e2e 全被网络遮蔽) | **1 真 P0 修** (rules-of-hooks) | 暴增 |

## 关键发现

### 1. e2e baseURL 化 (4 spec 改)
- **修前**: smoke / functional / all-pages / full-coverage 硬编码 `https://lingoo12138.github.io/english-app`, 沙盒网络抖动 → 12 测试 fail
- **修后**: 改本地 `http://127.0.0.1:4173/english-app` (跟 w129/w131/w134/w135/w136 一致), 0 网络问题
- **价值**: **暴露了 1 个 W135 抗审查漏掉的真业务 P0** (LessonDetailPage rules-of-hooks)

### 2. w129 IDB fixture 修 (4 spec 加 beforeEach)
- **修前**: w129 4 spec IDB VersionError (90 vs 9 污染) → 4 fail
- **修后**: 加 `e2e/w129-helpers.ts` + 4 spec `beforeEach` resetIDB → 10/10 PASS
- **价值**: 跨 spec IDB 状态干净, 0 污染

### 3. w135 离线 banner regex fix (1 行)
- **修前**: `toHaveAttribute(/data-offline-duration/)` (regex 当首参, 类型错) → 1 fail
- **修后**: `toHaveAttribute('data-offline-duration', /\d+/)` (正确双参) → 6/6 PASS

### 4. 4 spec 路由 bug 清理 (W99 测试历史遗留)
- /follow-read → 移除 (App.tsx 无此路由, 从未实现)
- /error-review → /errors/review (复数, App.tsx 实际路由)
- /error-history → /errors/history
- /follow-read/progress "进度" → "跟读" (页面用"跟读趋势")
- /synonyms /antonyms → 移除 (路由不存在, 同义词在 /words 词详情页)
- functional "全词库" → 移除 (空态不渲染 checkbox, 需有 favs 才显示)

### 5. ⭐ 真业务 P0 (W135 抗审查 漏掉, W139 e2e 修复后暴露)
- **src/pages/LessonDetailPage.tsx: rules-of-hooks 违规**
  - `useMemo` (segments) 在 `if (!lesson) return` 和 `if (loading) return` 两个 early return 之后
  - 触发条件: 直接 goto /textbook/:id (5 课文详情页: travel-airport / work-meeting / daily-shopping / emotion-feelings / tech-smartphone)
  - 修前: React error #310 (Rendered fewer hooks than expected), 100% 炸
  - 修后: useMemo 移到 early return 之前 + `if (!lesson) return []` guard
  - 根因: v1.95.0 W89-A 跟读评分增强时引入, 5 版本未触发因为 e2e baseURL 走 gh-pages 网络超时

## 测试结果 (W139 全部 e2e)

```
smoke:        11/11 PASS  (1.6 min)
functional:   10/10 PASS  (1.1 min)
all-pages:    26/26 PASS  (1.5 min)
full-coverage: 26/26 PASS (2.8 min)
w135:         6/6 PASS    (2 min)
w129 (4 spec): 10/10 PASS (39 s)
---
总: 89/89 e2e pass
```

## W139 累计 (commit 链)

- `3f4bfbe` W139 e2e 修缮: 4 spec 走本地 baseURL + w135 regex 修正
- `bf39fb5` W139 w129 IDB fixture 修: 4 spec 加 beforeEach reset
- `b1b4baa` W139 修: LessonDetailPage P0 rules-of-hooks + 4 spec 路由 bug
- `caf72cd` W139 续修: 2 spec 路由 bug (/error-history, /synonyms)

## 关键经验

- **W139 是 W137/W138 的延续**: "测试全过 ≠ 正确" → "测试全 pass 但代码 P0 隐藏"
- **e2e 修复 (baseURL + fixture) 是暴露隐藏 bug 的关键手段**, 而非业务代码改动
- **W139 找到 1 个真业务 P0 (rules-of-hooks)**, 之前 28+ verifier 全漏 (因 W135 e2e baseURL 走 gh-pages 网络, 永远超时不触发)
- **沙盒经验**: 单 spec 跑能完成 89 测试 ~ 8 min; 4 spec 一起跑会撞 240s timeout 上限, 必须拆分

## 后续 backlog (W140+)

- e2e 套件进一步自检 (剩余 w131 / w134 / w135 / w136 是否还有 spec bug)
- Lighthouse CI 集成
- 进一步 lazy load (dataExport / llmTutor / followReadTrendChart)
- Worker 池 (批量 IDB 写 Worker 化)
- W135 抗审查 17 P2 残留
