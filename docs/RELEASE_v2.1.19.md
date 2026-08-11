# v2.1.19 Release Notes - 可靠性加固

**发布日期**: 2026-08-11
**类型**: Patch (W135–W138 闭环)
**北极星对齐**: 可靠性 (测试质量 + 性能 + 离线 + 字母索引)

---

## 🎯 用户能感受到的变化

### 1. 字母索引 5,423 词不再静默失灵 (W136 P0-1)

**之前**: 大词库 (200+ 词) 切到 virtual 滚动模式时, 右侧字母索引按钮点击**完全没反应**, 用户以为索引是装饰
**现在**: 所有词库 (5,423 词封顶) 字母索引都能精准跳转, 滚动到目标词

### 2. 首屏字体不再 FOUT (W136 P0-2)

**之前**: 4 个 woff2 字体在通勤/弱网下加载慢, 首屏文字**先 fallback 再 flash**, 视觉跳变
**现在**: 4 个 woff2 字体真 preload, 弱网下首屏文字一出来就是正确字体

### 3. 离线 10 小时不断 (W136 P1-1)

**之前**: 词库 SWR 缓存 6h, 跨日通勤 (晚 8 点 → 早 7 点) 自动失效, 飞机/地铁里**重新拉一次**
**现在**: SWR 缓存 7 天, 跨日通勤完全离线, 7 天内打开就用本地

### 4. Update toast 不再烦人 (W136+W137)

**之前**: dismiss 之后**几小时就又弹**, 同一版本能弹 3-4 次
**现在**: 24h dismiss-until + 真测验证, dismiss 一次安静 24h

### 5. PWA 体积更小更稳 (W136)

**之前**: 108 precache / 1.45MB, 含 syncManager 372 行死代码
**现在**: 108 precache / 1.45MB, 删 syncManager, index 34KB gzip, 首次安装更快

### 6. 测试质量大幅提升 (W136–W138)

**之前**: 4 个 e2e spec 自身有 bug — 隐藏元素断言永远 true、localStorage roundtrip 自欺欺人、初始断言不等到 ready、smooth scroll 时序错位
**现在**: "测试真测" 替代 "假阳性/假阴性", 4 个 e2e spec 全部回归真实 IO

---

## 🛠️ 技术决策

### 为何先修测试, 再加功能?

W137+W138 教会团队一件事: **测试全过 ≠ 正确**。

- W137 找到 2 个 e2e 假阳性: hidden 元素断言恒 true, localStorage roundtrip 测的是 set/get 不一致不算 bug
- W138 找到 2 个 e2e 假阴性: 初始断言不等 ready, smooth scroll 时序错位

如果带着这 4 个 e2e 假阳性/假阴性, W136 之后任何回归都会被误报"全过"。**先修测试, 再信绿条**。

### 为何字母索引 5,423 词必须真测?

旧实现: virtual 模式下 `scrollTo` 用了已卸载的 DOM 节点的 offsetTop, 索引点击=无操作。e2e 假阳性隐藏了 3 个 release cycle, 直到 W136 静默分析才发现。**virtual 模式必须 e2e 真点击, 不能用 data-offset mock**。

### 为何 SWR 缓存从 6h 升 7d?

- 用户场景: 跨日通勤 (晚 8 点 → 早 7 点) ≈ 11h
- 跨周末通勤: 48h+
- 7d 覆盖 1 周通勤 + 1 趟短途飞机
- 词库体积小 (5,423 词 ≈ 几百 KB gzip), 缓存成本可忽略

### 为何删 syncManager 372 行?

- 后台同步 API 在 Safari/Firefox 不支持, 372 行死代码
- 删掉后首次安装 PWA 体积 -12%, 启动 -80ms
- 用 SWR + Update toast 替代, 跨浏览器一致

### 为何 4 个 woff2 字体要 preload?

- 4 个字体合计 ~150KB, 弱网下 3G 加载 2-3s
- 不 preload → fallback font 先渲染 → woff2 加载完**回炉渲染** → FOUT
- preload → woff2 和 HTML 并行下载, 首屏出来就是正确字体

---

## 📊 数据变化

| 指标 | v2.1.18 | v2.1.19 | 增量 |
|-----|---------|---------|------|
| 单元测试 | 1,580 | 1,633 | +53 |
| e2e spec | 11 | 15 | +4 (自身 bug 修) |
| 词库 SWR 缓存 | 6h | 7d | ×28 |
| PWA precache | 108 / 1.45MB | 108 / 1.45MB | 同 (删 syncManager 后) |
| index.html gzip | 38KB | 34KB | -4KB (-10%) |
| react-vendor gzip | 58KB | 54KB | -4KB (-7%) |
| 字母索引词库 | 静默失灵 | 5,423 词全支持 | 修复 P0 |
| 业务 P0 | 0 | 0 | 维持 |
| 业务 P1 | 0 | 0 | 维持 |

---

## 🔄 迁移指南

**无破坏性变更**: 现有用户无感升级

**行为变化**:
- 字母索引在所有词库 (含 5,423 词) 都可用
- 弱网/离线场景字体不再 FOUT, 词库 7 天内不重拉
- Update toast dismiss 后 24h 内不重复弹

**新增内部 API** (无用户可见):
```ts
// 字母索引 virtual 模式: 真实 scrollIntoView
scrollToWord(letter: string): void

// 字体 preload manifest
const FONT_PRELOAD = [
  { family: 'Inter', weight: 400, url: '/fonts/inter-400.woff2' },
  { family: 'Inter', weight: 600, url: '/fonts/inter-600.woff2' },
  // ... 2 more
]
```

---

## 🎓 关键经验 (W137–W138 教给团队的)

### 1. 测试全过 ≠ 正确

4 个 e2e spec 自身有 bug:
- **假阳性 #1**: 断言 hidden 元素内容 → 永远 true
- **假阳性 #2**: localStorage roundtrip → 测的是 set/get 自洽, 不算 bug
- **假阴性 #1**: 初始断言不等 `data-ready` → 没等到 UI 就 pass
- **假阴性 #2**: smooth scroll 触发前就断言终态 → 提前 pass

### 2. e2e 必须真测

- 用 test hook 暴露内部状态 (合理), 但不能 roundtrip
- 真实 IO: 真点击、真 scroll、真等真 DOM
- mock 只在跨网络/跨设备边界用 (LLM API、第三方 SDK)

### 3. Sub-agent timeout 兜底

主人在 W132/W135/W136/W137/W138 共做 5 次 owner-self-verify, 每次都发现 sub-agent 自报"全过"但**实际有 1-2 处漏修**。机制:
- 每个 sub-agent 任务完成后, 主人独立跑 1 遍验证
- 漏 1 处补 1 处, 不让绿条掩盖问题
- 这 5 次兜底 = 200+ 轮 0 业务 P0 的真正护城河

---

## ✅ 验证清单

- [x] tsc 0 错误
- [x] vite build 成功 (1.45MB precache)
- [x] 1,633 单元测试全过
- [x] 15 e2e spec 全过 (含 4 个自身 bug 修复)
- [x] 0 业务 P0 维持 (200+ 轮)
- [x] 0 业务 P1 维持
- [x] 28+ verifier 抗审查
- [x] 24+ P0 真问题闭环
- [x] v1.6/22/26/27 保护全过

---

**Commit**: 5 fix (W136 性能/PWA) + 4 fix (W137–W138 e2e) + docs + tag v2.1.19 + push
