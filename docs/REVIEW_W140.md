# W140 抗审查报告 — 整体 e2e 回归 + 单测自纠

> 验证时间: 2026-08-12
> 验证基础: main caf72cd (W139) + W140 5 单元测试自纠
> 验证人: 主人 owner-self-verify

## 总览

| 维度 | 修前 (W139) | 修后 (W140) | 状态 |
| --- | --- | --- | --- |
| 单元测试 | 1626/1633 (7 fail) | **1633/1633 (0 fail)** | ✓ |
| e2e 整体 | 89/89 (W139) | **128/128 (W139 + W140 11 spec)** | ✓ |
| tsc 错 | 0 | 0 | ✓ |
| build | 108 precache / 1.45MB | 108 precache / 1.45MB | ✓ |
| 业务 P0 | 0 | 0 | ✓ |

## 1. 单元测试自纠 (7 fail 修)

W138 → W139 → W140 文档大更新 (v2.1.19 / v2.1.20) 让 2 个 v2.1.12 时代的测试期望过期:

### tests/w130-docs.test.ts (5 fail)
- "顶部版本号升级到 v2.1.12" → 升级到 v2.1.19/20 (regex `(19|20)`)
- "当前进度 (v2.1.12) 段落" → v2.1.19/20 + 128+ release tag + 28+ verifier
- "v2.1.x 19 周 + 123 release tag" → 21+ 周 + 128+ release tag
- "35+ 次大 review + 18 verifier" → 35+ reviews + 28+ verifier
- "v2.1.12 关键数据 (1478 测试)" → v2.1.19/20 关键数据 (1633 测试)
- "pdfjs vendor chunk 图" → pdfjs + llm-vendor chunk 图 (W127 + W135, regex `pdfjs.*chunk.*图`)

### tests/w132-review-fixes.test.ts (2 fail)
- "w129-aichat-flow 监听器 BEFORE navigation" → W139 后监听器在 beforeEach, 改测 beforeEach 模式
- "P1-3: e2e 计数 17 → 60+ (19 spec)" → W140: 23 spec, 128+ 测试 (regex `(12[0-9]\\+|2[0-9]\\+)`)

## 2. e2e 整体回归 (W140 续 W139)

W139 验证 89 e2e (4 W99 spec + 6 W12x spec + 10 W129 spec) 后,W140 把剩下 11 spec 全跑通:

| spec | pass | 备注 |
| --- | --- | --- |
| w131-dark-pwa | 9/9 | 暗色 + PWA + 9 测试 |
| w134-pdfjs-lazy | 5/5 | pdfjs 拆 vendor + 5 测试 |
| w129-lesson-score | 2/2 | 课文评分跨页 |
| w126-screenshots | 3/3 | Dictation + Spelling + ErrorHistory |
| w112-screenshots | 1/1 | 移动 Tab UI |
| w115-home-screenshots | 1/1 | Home 改版 |
| w116-w117-screenshots | 1/1 | 字母索引 + 字体 |
| w123-aichat-screenshots | 1/1 | AIChat UI |
| w124-w125-screenshots | 5/5 | AIChat v2 + LessonScore + High contrast + Dark |
| w124-w125-localhost | 3/3 | 本地 mobile/desktop 截图 |
| v215-full-screenshots | 1/1 | desktop + tablet + mobile |
| v217-final-screenshots | 1/1 | 4 大折叠 + Skeleton |
| **W140 小计** | **33/33** | 1.5-2.8 min/spec |

**e2e 累计 (W139 + W140)**: 89 + 33 + 6 (w135 + w136 × 2) = **128 e2e 100% pass**

## 3. ARCHITECTURE.md 文档同步

W140 更新 1 处 ARCHITECTURE 数值 (业务同步):
- "Playwright 12+ spec, 60+ 测试" → "Playwright 23 spec, 128+ 测试" (W140 实测)
- "Playwright 12+ spec" → "Playwright 23 spec / 128+ 测试" (顶部一行)

## W140 commit 链

- `19c6413` W139 抗审查报告 (4 文档): e2e 89/89 + 1 真 P0 闭环 (W139, 已 push)
- W140 (本报告) + 单测自纠 + ARCHITECTURE 同步

## 关键经验

- **W140 是 W137/W138/W139 的延续**: 测试期望过期 (W138 大改 README/CHANGELOG 后, v2.1.12 时代的测试期望 7 处 fail), 不是业务 bug
- **W140 0 业务 P0 暴露** — W139 已闭环真业务 P0 (LessonDetailPage rules-of-hooks), W140 只补测试期望
- **沙盒经验**: 单 spec 跑能完成 ~30 测试; 23 spec 一起跑会撞 240s timeout, 必须拆 4-5 spec/批

## 累计 (v2.1.20+)

- **129+ release tag** / 21+ 周 / 28+ verifier 抗审查
- **1633 单元测试 / 115 文件 / 全过** (W140 修 7 期望)
- **23 e2e spec / 128+ 测试 / 全过** (W140 跑全 11 spec)
- 5,423 词 / 100% / 8 大激活 / 0 业务 P0
- 108 precache / 1.45MB / index 34KB gzip

## 后续 backlog (W141+)

- Lighthouse CI 集成 (性能回归自动捕获)
- 进一步 lazy load (dataExport / llmTutor / followReadTrendChart)
- Worker 池 (批量 IDB 写 Worker 化)
- W135 抗审查 17 P2 残留 (3-4 sprint)
- W140+ 后端 mvp (可选, 长期)
