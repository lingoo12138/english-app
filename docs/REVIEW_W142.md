# W142 抗审查报告 — Lighthouse CI 集成 + 批量 IDB 写 Worker 化

> 验证时间: 2026-08-12
> 验证基础: main 分支 4905563 (v2.1.22) + W142 改
> 验证人: 主人 owner-self-verify (2 agent 并行: Lighthouse / IDB Worker)

## 总览

| 维度 | W141 | W142 | 变化 |
| --- | --- | --- | --- |
| 单元测试 | 1633/1633 | **1659/1659** | +26 (W142 IDB Worker 测试) |
| e2e 关键路径 | 全过 | 全过 (w129 + w135) | ✓ |
| Lighthouse perf | 0.71 | **0.71 baseline** | 记录基线, LCP 6.9s 待优化 |
| LCP (error) | 未监控 | **6.9s (fail, ≤4s)** | 已知问题, 列入 W143 |
| 批量 IDB 写 | 0 Worker 池 | **1 Worker + 1 改写点 (addFavorite)** | 起手, 1 入口示范 |
| 累计 release tag | v2.1.22 | v2.1.23 | +1 |

## 1. Lighthouse CI 集成 (Agent A)

### 改动
- `.lighthouserc.json` (新建, 951 bytes): desktop preset + 4 类目 + 4 指标断言
- `.github/workflows/lighthouse.yml` (新建, 573 bytes): push/main 触发 + autorun
- `package.json` (+2 devDeps): `lighthouse@^12.8.2` + `@lhci/cli@^0.15.1`
- `docs/LIGHTHOUSE_BASELINE.md` (新建, 6116 bytes): 实测 baseline 报告
- `.gitignore`: 加 `.lighthouseci/`

### Baseline (W142 实测)
| Category | Score | Threshold | Verdict |
| --- | ---: | ---: | --- |
| Performance | 0.71 | 0.80 (warn) | warn |
| Accessibility | 0.91 | 0.90 (error) | pass |
| Best Practices | 1.00 | 0.85 (warn) | pass |
| SEO | 0.91 | 0.80 (warn) | pass |

| 指标 | 值 | 阈值 | 状态 |
| --- | ---: | ---: | --- |
| FCP | 1.127s | ≤2s (warn) | pass |
| **LCP** | **6.899s** | **≤4s (error)** | **fail** |
| TBT | 80ms | ≤300ms (warn) | pass |
| CLS | 0.083 | ≤0.10 (warn) | pass |
| Speed Index | 1.127s | ≤3s (warn) | pass |

### LCP 6.9s 根因 (97% Render Delay)
- LCP 元素: `<p>` Home 卡 (课文摘要)
- TTFB 197ms (3%) + Render Delay **6.7s (97%)**
- 主线程 bootup: react-vendor 183ms + db-vendor 91ms + Unattributable 48ms
- 渲染阻塞: `index-wPm-FH9b.css` 113KB / 517ms

### W143+ 优化建议 (W142 报告已写, 不在 W142 范围)
1. LCP 6.9s → 4s: words.json 延后取 / 内联 critical CSS / Home 卡 skeleton
2. SEO 0.91: 修 robots.txt (57 errors)
3. a11y 0.91 → 0.95+: 避免 1 个 contrast tweak 触发硬 fail

## 2. 批量 IDB 写 Worker 化 (Agent B)

### 改动
- `src/workers/idb.worker.ts` (新建, 3059 bytes): 接收 IdbWriteRequest 走 Dexie, 回 ok/result/duration
- `src/lib/idbWorkerClient.ts` (新建, 7438 bytes): 单 Worker 实例 + 队列 + fallback 主线程
- `src/lib/db.ts` (改 1 函数): `addFavorite` 改用 `writePut('favorites', ...)` 走 Worker
- `tests/w142-idb-worker.test.ts` (新建, 16905 bytes): 26 测试覆盖 5 个写 API + fallback + queue 顺序

### idbWorkerClient API
```typescript
writePut(store, data)        // 替换 db[store].put(data)
writeAdd(store, data)        // 替换 db[store].add(data)
writeBulkPut(store, data[])  // 替换 db[store].bulkPut(data)
writeBulkAdd(store, data[])  // 替换 db[store].bulkAdd(data)
writeDelete(store, id)       // 替换 db[store].delete(id)
writeUpdate(store, id, data) // 替换 db[store].update(id, data)
```

### Fallback 机制
- Worker 不可用 (创建失败 / onerror / 浏览器不支持) → 自动 fallback 主线程
- 队列保序 (1 Worker 实例, 严格 FIFO)
- 测过 Worker 错误时 queue 自动消化 + 主线程接管

### 当前改写覆盖
- **1/62 高频写入口**: addFavorite (1 处)
- 剩余 61 处: 留 W143+W144 干 (按写频次排序)

## 测试结果 (W142)

```
单元: 1659/1659 全过 (W142 +26 IDB Worker 测试)
e2e:  w129 (10) + w135 (6) = 16/16 PASS (验证 addFavorite 走 Worker 路径)
tsc:  0 错
```

## 累计 (v2.1.23)

- **132+ release tag** (v0.1.0 ~ v2.1.23)
- **1659 单元测试 / 116 文件** / 0 fail
- **23 e2e spec / 128+ 测试** / 0 fail
- 5,423 词 / 100% / 8 大激活 / 0 业务 P0 维持
- **Lighthouse 4 类目 baseline 0.71/0.91/1.00/0.91** (LCP 6.9s 待 W143 修)
- **批量 IDB 写 Worker 化起手** (1/62 入口示范, Worker 池基础设施 ready)

## 关键经验

- **Lighthouse 集成低成本高价值**: 1 config + 1 workflow + 1 docs, CI 自动捕性能回归
- **Lighthouse 真实 LCP 6.9s 暴露**: 之前不知道 LCP 这么高, baseline 才有数字
- **IDB Worker 池无需大改**: 1 入口示范即可, 后续渐进迁移 (按写频次)
- **W142 +26 测试 0 业务改**: Worker 池是纯架构改进, 不动业务

## 后续 backlog (W143+)

1. **LCP 优化 (W143 重点)**: words.json 延后 / Home skeleton / critical CSS
2. **批量 IDB 写渐进迁移 (W143-W144)**: 写频次排序, 一批 10-20 个入口/批
3. **a11y + SEO 修 (W143)**: contrast / target-size / label-content-name / robots.txt
4. **Lighthouse CI 跑满 (W144)**: 全套 23 e2e 集成 lighthouse, 拿真实 perf 数据
5. **W135 抗审查 17 P2 残留 (W145+)** : 杂项
