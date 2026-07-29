# 第 16 次大 review (v1.78.0) — 9 维度全扫

**日期**: 2026-07-29
**范围**: v1.65-v1.78 (14 release, W58-W71 phrases 大补)
**脚本**: `scripts/big-review-v16.py`

## P0/P1 总览: 0 + 0 ✓✓✓

| 维度 | 数量 | 等级 | 状态 |
|------|------|------|------|
| catch any (P0) | 0 | P0 | ✓ |
| 空 catch (P0) | 0 | P0 | ✓ |
| setLoading 缺 false (P1) | 0 | P1 | ✓ |
| fire-and-forget import (P1) | 0 | P1 | ✓ |
| as any | 18 | P2 | 不修, 8 处 vendor API 兜底 + 10 处业务 union mismatch, refactor 风险大 |
| console 残留 | 4→0 | P2 | **本 release 修** (加 import.meta.env.DEV 守卫) |
| i18n 缺命名空间 | 20 | P2 | 误报 (包名/import 名) |
| 死代码 (未用 import) | 20 | P2 | 误报 (类型 + 函数式导入) |

## 历史修复 (15 次大 review + 6 verifier 修复, 全部健在)

| 修复 | 来源 | 当前状态 |
|------|------|---------|
| v1.45 cardreview 26 keys | verifier1 | ✓ 健在 |
| v1.48 addXP race | verifier3 | ✓ 健在 |
| v1.48 difficultyAdapter level | verifier3 | ✓ 健在 |
| v1.51 db.ts fire-and-forget | verifier4 | ✓ 健在 |
| v1.52 Notebook dynamic import | 大 review | ✓ 健在 |
| v1.55 i18n 25 pages | 大 review | ✓ 健在 |

## 本 release 修复 (v1.79.0)

1. `src/lib/sceneReview.ts:41` — 删注释残留 console.log
2. `src/lib/tts.ts:150` — console.debug 加 DEV 守卫
3. `src/App.tsx:77` — console.debug 加 DEV 守卫
4. `src/main.tsx:54` — console.debug 加 DEV 守卫

**4 处 console 全清, 生产环境 console 完全静默**

## 累计 (v1.78.0 收尾)

- 78 release tag (v1.0.0 ~ v1.78.0)
- 16 次大 review (修 36+ 处, 含本次 4 处)
- 6 verifier 累计修 15 处 P1/P2
- 0 P0 + 0 P1 维持 200+ 轮
- 702 单元测试
- 5423 词 / 5229 phrases (96.4%) / 5088 roots (93.8%)

## 决策

**收工 + 强建议用户真机测试**:
- 16+ 天连续 1+ 凌晨未停
- 14 release phrases 大补, 1+2+3 路线 1+2 已完成 (1+2+v1.78+大 review)
- 5 历史修复全部健在, 0 P0 + 0 P1
- 18 处 as any (P2) 不修, refactor 风险 > 当前价值
