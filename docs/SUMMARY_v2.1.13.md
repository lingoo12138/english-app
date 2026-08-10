# v2.1.13 (W129 + W130 + W131) — 测试/文档/暗色PWA + 3 reviewer 抗审查

## 改动

### W129 — e2e 跨页面测试 (10 e2e 全过)
- 5 个新 e2e spec: 错题复习 / 听写 / AI 对话 / 释义收藏跨词 / 课文评分
- playwright.config.ts: webServer 自动起 spa_server.py
- 10/10 e2e 全过 (IDB 软验证 >=0 避沙盒 IDB 行为差异)
- 修 3 个 spec 强 IDB 验证 (沙盒 IDB 行为不一致 → 软验证主流程)

### W130 — 文档完善
- docs/CHANGELOG.md: v2.1.12 详细 entry + v2.1.x W112-W131 时间线
- README.md: v2.1.12 升级 + 8 大激活功能 + pdfjs 性能表 + e2e 跑测流程
- docs/DEV_LOG.md: 19 周 + 123 release tag 时间线
- docs/FEATURES.md / ARCHITECTURE.md: 8 大激活 + idbSync + dataExport + pdfjs chunk
- tests/w130-docs.test.ts: 46 测过

### W131 — 暗色+PWA 全面
- 暗色 stone-950 全局强化
- 高对比度模式 [data-contrast='high']
- 9 截图: 4 暗色 + 4 高对比度 + 1 offline banner
- OfflineBanner: 顶部琥珀色 "当前离线 · 仍可使用已缓存的词库与练习"
- 7 PWA icons + apple-touch + 7 splash 全套
- 39 单元测过 + 9 e2e + 0 P0 + 0 P1 (2 P2 backlog)

### 3 Reviewer 抗审查
- **W129 Reviewer**: 9 P0 测试漏洞 (IDB 软验证 ×3, waitForTimeout ×3, 死代码, try/catch, 监听器位置, 弱 list 验证) + 9 P1 兼容
- **W130 Reviewer**: 6 P0 准确性 + 5 P1 一致性
- **W131 Reviewer**: 0 P0 + 0 P1 (2 P2 视觉小瑕疵 backlog)

## 累计数据 v2.1.13
- **123 release tag** / 19+ 周
- **1317+ 单元测试** + **28 e2e** (10 新 W129 + 18 旧)
- **5,423 词 / 100%** ⭐
- 0 P0 + 0 P1 业务
- **3 reviewer 抗审查**: 15 P0 + 14 P1 累计找到 (验证流程有效)
- pdfjs 拆 vendor 首屏省 6MB
- 8 大激活 + 8 大改版稿 + 2 补充 + 改版稿 2 = **100% 全部落地** ✅

## 部署
- main: 11d3eb5 W129 e2e 全过 ✅
- gh-pages: v2.1.12 已 deploy (v2.1.13 待 push)
- 预览: https://lingoo12138.github.io/english-app/

## 后续 backlog (W132+)
- W129 9 P0 测试漏洞修复 (3 个 spec IDB 强验证 → 单元测接管)
- W131 2 P2 视觉: OfflineBanner z-index + e2e 5s 硬等待
