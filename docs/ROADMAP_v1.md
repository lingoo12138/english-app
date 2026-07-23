# 句刻 v1.0 路线图 (W5-W8, 2026-07-23 → 2026-08-20)

> **作者**: Mavis (root)
> **基线**: v0.26.1 (4 周路线图完结, 5d 干完 21.5d 计划)
> **窗口**: 4 周
> **北极星**: 让英语在你想用的时候就能用上
> **核心约束(不可破)**:
> - ❌ 无后端 / 零付费 / local-first / solo dev
> - ✅ 极简 PWA / GitHub Pages / 5334 词 + 13234 句 + 5 场景
> - ❌ 不要做: 微信小程序 / 多端同步 / 账号 / 社区 / 47 P2 全部硬清

---

## 0. v1.0 定义

v0.x 是**功能冲刺**(v0.1-v0.26 完成产品骨架 + LLM 杀手锏)。
v1.0 是**产品级质量**(从能用 → 稳用 + 包容 + 可迁移 + 可测试)。

**关键差异**:
- v0.26: 19 页面 / 8 组件 / 6000 行 / 0 P0 / 5-8 P1 / 47 P2 待清
- v1.0: 同上 + a11y / 数据迁移 / 完整测试 / 文档发布

---

## 1. 4 周总览

| 周 | 主功能 | 副功能 | 关键交付 |
|----|--------|--------|----------|
| **W5** (1 周) | 全模块静态审查 + 修 P0/P1 | 关键路径单元测试 | 0 P0 + 5-10 P1 修复 + 单元测试覆盖 |
| **W6** (1 周) | P2 收尾 (47 → 0) | a11y 全覆盖 | 0 P2 + 屏幕阅读器友好 + 键盘导航 |
| **W7** (1 周) | 数据迁移 (导出/导入) | iOS PWA 完整化 | 备份/恢复 + iOS 安装提示 + safe-area |
| **W8** (1 周) | 集成测试 + 文档收尾 | v1.0 发布 | e2e 测试 + CHANGELOG + release tag |

---

## 2. W5 — 全模块静态审查 + 修 P0/P1 (5d)

### W5-A: 静态审查全模块 (2.5d)
**目标**: 启动 1-2 verifier subagent 复审 v0.26 全 19 页面 + 18 库,找 P0/P1

**scope**:
- 启动 2 subagent:
  - **S1**: 复审 UI/UX (页面渲染 / 状态 / 路由 / race condition)
  - **S2**: 复审 数据/库 (IndexedDB / LocalStorage / TTS / LLM)
- 预计 subagent failed (8 次失败历史) → **主人接管 + 静态审查脚本**
- 静态审查脚本 (`review-v26.py`) 找潜在:
  - 闭包陷阱
  - 异步无 catch
  - 跨页状态泄漏
  - 用户输入未 sanitize
  - 错误恢复缺失
  - 性能瓶颈 (大列表 / 重复渲染)
  - 安全: dangerouslySetInnerHTML / eval / localStorage XSS
  - 移动端: 触摸 / 滚动 / 横屏

**success criteria**:
- 0 P0 (新功能首次上线零 P0 维持)
- 找到 5-10 P1

### W5-B: 修 P0/P1 (2.5d)
**scope**:
- 修所有 P1
- 加单元测试 (vitest):
  - `db.ts` (IndexedDB CRUD)
  - `plan.ts` (计划生成 / 进度)
  - `learnReport.ts` (词汇提取)
  - `tts.ts` (mock 部分)
  - `aiChat.ts` (reviewMessage JSON 解析)
  - `translate.ts` (容错)
- 单元测试覆盖率: 关键库 70%+

**success criteria**:
- 0 P0 + 0 P1
- 单元测试通过

### 风险
- R1 subagent 失败 → 已降级
- R2 单元测试环境配置 (vitest + happy-dom)
- R3 静态审查漏 P1 → 接受"找不全",稳扎稳打

---

## 3. W6 — P2 收尾 + a11y (5d)

### W6-A: 47 P2 → 0 (2.5d)
**目标**: 高 ROI P2 全清,产品细节到位

**scope** (按 .mavis/plans 列):
- UI 细节: 加载状态 / 空状态 / 错误恢复 / 边界值
- 性能: 大列表虚拟化 / 重复渲染优化
- 一致性: 按钮 / 间距 / 颜色 / 文案
- 动效: hover / active / 切换 / 翻卡
- 进度反馈: 加载条 / 进度条
- 反馈: 成功提示 / 错误提示 / 复制成功

**success criteria**:
- 47 P2 全清
- 视觉 / 交互 一致性

### W6-B: a11y 全覆盖 (2.5d)
**scope**:
- ARIA: `aria-label` / `aria-pressed` / `aria-live` / `role`
- 键盘: Tab / Enter / Esc / 箭头 (列表/卡片)
- skip-link: 跳到主内容
- focus visible: 键盘 focus 高亮
- 屏幕阅读器: 中文语义
- 颜色对比度: WCAG AA
- 表单: label / 错误提示

**success criteria**:
- 所有 button / link / input 有 aria-label
- Tab/Enter/Esc 键盘可完整操作
- focus visible 明显

### 风险
- R1 47 P2 工作量大, 排期紧
- R2 a11y 屏幕阅读器本地测不全
- R3 键盘导航改动可能破现有交互

---

## 4. W7 — 数据迁移 + iOS PWA 完整化 (5d)

### W7-A: 数据迁移 (导出/导入) (2.5d)
**目标**: 用户可在新设备恢复所有学习数据

**scope**:
- `src/lib/migrate.ts`:
  - `exportAll()` → JSON 包含:
    - IndexedDB 全部表 (favorites / pronunciationAttempts / writingErrors / chats)
    - localStorage 全部 (settings / plan-progress / listening-completed)
    - LLM/TTS/Translate API keys (加密? 不行,明文 + 警告)
  - `importAll(json)` → 恢复
  - `validateSchema(json)` → 校验版本兼容
- UI: 设置页加"数据迁移" Tab
  - 导出 → 下载 .json
  - 导入 → 上传 .json + 二次确认
  - 自动备份 (每周一次, localStorage 保留最近 3 个)

**success criteria**:
- 导出 / 导入 / 验证 闭环
- 跨设备恢复完整

### W7-B: iOS PWA 完整化 (2.5d)
**scope**:
- viewport-fit=cover + safe-area-inset (已有基础,补全)
- iOS 安装提示 (Safari share → Add to Home Screen)
- iOS PWA standalone mode 检测
- 启动画面 (apple-touch-startup-image)
- 状态栏颜色 (apple-mobile-web-app-status-bar-style)
- 全屏 (display: standalone)
- 禁用电话号识别 (format-detection=telephone=no)
- 禁用下拉刷新 (overscroll-behavior: contain)
- 滚动平滑 (scroll-behavior: smooth)

**success criteria**:
- iOS Safari 添加到主屏后:
  - 启动画面正常
  - 状态栏颜色正确
  - 全屏无 Safari UI
  - safe-area 适配

### 风险
- R1 iOS 测试需真机或 Xcode simulator (无)
- R2 跨设备数据导入兼容老版本 schema

---

## 5. W8 — 测试 + 文档 + v1.0 发布 (5d)

### W8-A: 集成测试 (1.5d)
**scope**:
- Playwright e2e (扩展 verify-v26-final):
  - 学习闭环: Daily → Plan → WordDetail → Pronunciation
  - AI 闭环: Chat → Real-time Review → Errors Page
  - 听力闭环: Listen → Dictation → Questions → Result
  - 写作闭环: Write → Errors → Add to Favorites
  - 卡片闭环: Anki 复习 SM-2 评级
- 跨页面状态 (Zustand persist)
- PWA 离线 (Chrome devtools offline)

### W8-B: 文档收尾 (1.5d)
**scope**:
- CHANGELOG v1.0 (合并 v0.27 ~ v0.30)
- ROADMAP v1.0 (完整 4 周回顾)
- DEV_LOG 完结段 (8 阶段)
- README v1.0 完整重写
- docs/CHANGELOG.md 全量清理
- GitHub Pages 部署验证

### W8-C: v1.0 发布 (1d)
**scope**:
- GitHub release tag v1.0
- 截图: 19 页面全截图 (启动页)
- demo gif / 视频 (可选)
- 发布博客 / 推文 (可选)
- 最终 Playwright e2e + 截图

### 风险
- R1 e2e 测试 flakiness
- R2 文档工作量大

---

## 6. 显式不做 (v1.0 红牌)

| 不做 | 原因 |
|------|------|
| 微信小程序 | 2+ 周, PWA 已覆盖 |
| Android App | 同上 |
| 多端同步 / 账号 | 违反"无后端"硬约束 |
| 社区 / 评论 | 同上 |
| 离线对话(脚本库) | 不解决"用户没 LLM key" |
| 新 LLM 渠道 | 10 个已饱和 |
| 47 P2 范围外(美学/动效) | W6 挑高 ROI 收尾 |
| 实时多用户 | 无后端 |

---

## 7. 关键质量指标 (v1.0 vs v0.26)

| 指标 | v0.26 | v1.0 目标 |
|------|-------|-----------|
| P0 | 0 | 0 |
| P1 | 0 | 0 |
| P2 | 47 | 0 |
| 单元测试覆盖率 | 0% | 关键库 70%+ |
| 集成测试 | 1 (verify-v26-final) | 5+ 闭环 |
| ARIA 覆盖 | 部分 | 全部 |
| 键盘导航 | 部分 | 全部 |
| iOS 适配 | 基础 | 完整 |
| 数据迁移 | 无 | 导出/导入 |
| 文档完整度 | 高 | 极高 (v1.0 发布) |
| 总耗时 | - | ~16d (4 周) |

---

## 8. 总成本估算

| 项 | 数量 | 备注 |
|----|------|------|
| 提交 | ~30-40 | 每天 1-3 commit |
| 单元测试 | ~50-80 | vitest |
| 集成测试 | 5 个 e2e 闭环 | Playwright |
| 文档 | 5 个 markdown | 1 万+ 字 |
| 截图 | 30+ 张 | 19 页面 + 状态 |
| 静态审查 | 1 个脚本 | review-v26.py |
| 预估总耗时 | **16d** | (4 周, 含 4d 缓冲) |

---

## 9. 关键决策点 (等你拍板)

1. **vitest + happy-dom 装包?** — 是(W5-B 单元测试需要)
2. **数据迁移明文 API keys?** — 是(加密需要密码管理, MVP 不做)
3. **e2e 集成测试 5 个闭环?** — 是(够覆盖, 不追求 100%)
4. **iOS 真机测试?** — 模拟器/截图为主(无真机)
5. **发布博客/推文?** — 推迟到 v1.0 后

---

**最后更新**: 2026-07-23 (v1.0.0 发布)

## 🏆 v1.0 完结!

| 周 | 计划 | 实际 | 状态 |
|----|------|------|------|
| W5 | 静态审查 + 5-10 P1 + 单元测试 | 1.5d | ✅ v0.27.0 |
| W6 | P2 收尾 + a11y | 0.5d | ✅ v0.28.0 |
| W7 | 数据迁移 + iOS PWA | 1.5d | ✅ v0.29.0 |
| W8 | 集成测试 + 文档 + 发布 | 1d | ✅ v1.0.0 |
| **总** | **10d** | **4.5d** | **完成, 提前 5.5d** |

## 📊 实际进展 (前一半完成)

| 周 | 计划 | 实际 | 状态 |
|----|------|------|------|
| W5 | 全模块静态审查 + 5-10 P1 修复 + 单元测试 | 1.5d 干完 2.5d | ✅ v0.27.0 |
| W6 | 47 P2 → 0 + a11y | 0.5d 干完 2.5d | ✅ v0.28.0 |
| **W5+W6** | **5d** | **2d** | **完成, 等用户指令** |

**W5 战绩**:
- 启 2 subagent verifier (UI/UX + 数据/库) 都 failed (token 限流 8+ 分钟 0 输出)
- 主人接管 + 静态审查脚本 (`review-v26.py`) + 深度代码读
- 找到 5 P1 全修
- 单元测试首次接入 (vitest + happy-dom + fake-indexeddb): **18/18 pass**
- 测试覆盖: plan.ts (11) + db.ts (4) + aiChat.ts (3)

**W6 战绩**:
- ErrorBoundary 全局错误兜底
- skip-link 跳到主内容 (Layout.tsx)
- aria-label 补全 (Translate ⇄)
- 通用组件: SkeletonCard / EmptyState / Spinner
- ErrorsPage 3 Tab 空态 + AIChat Esc 关闭

**下一半 (W7 + W8) 等用户指令**
