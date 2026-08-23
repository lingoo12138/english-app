# W152 真实用户反馈 + 决定

**日期**: 2026-08-24
**目标**: v2.2.0 公开发布版 → 真实用户反馈 → 决定 v3.0 / 收尾 / 开源
**周期**: 1-2 周 (W152-W153)

---

## 1. 招募贴文已发 (主人待办)

W149 准备了 3 份草稿, W152 主人发出去:

| 平台 | 草稿 | 状态 | 期望 |
|---|---|---|---|
| **V2EX** | `docs/W149_V2EX_POST.md` (2.9KB) | ⏳ 待发 | 创造者节点, 中文技术社区 |
| **即刻** | `docs/W149_JIKE_POST.md` (2.0KB) | ⏳ 待发 | 短贴, 中文产品/学习社区 |
| **Reddit** | `docs/W149_REDDIT_POST.md` (3.3KB) | ⏳ 待发 | r/SideProject + r/InternetIsBeautiful |
| **朋友** | `docs/W149_FRIEND_INVITE.md` (4.8KB) | ⏳ 待发 | 5-10 人微信群, 1 周内测 |

**复制粘贴发**:
- V2EX: https://www.v2ex.com/new?node=create
- 即刻: https://web.okjike.com/
- Reddit: https://www.reddit.com/r/SideProject/submit + https://www.reddit.com/r/InternetIsBeautiful/submit

---

## 2. 反馈数据流 (W152 启动)

### 5 个 IDB 表 (W146+ 硬约束, 0 网络上传)

| 表 | 来源 | 数据 | W152 期望 |
|---|---|---|---|
| `telemetry` | `lib/telemetry.ts` (W146) | 7 事件, 1s 批量, 30 天 retention | 真实用户行为流 |
| `feedback` | `components/FeedbackButton.tsx` (W146) | 文本 + category + 5 星 | 真实用户文字反馈 |
| `nps` | `components/NpsPrompt.tsx` (W146) | 0-10 滑块 + 文本 | NPS 评分 |
| `usage` | `pages/UsagePage.tsx` (W146) | 30 天折线 + Top 10 | 真实使用数据 |
| `errorReport` | ErrorBoundary (W147) | JS 错误堆栈 | 真实崩溃 |

### W152 反馈汇总方式

**App 内** (用户视角, 0 网络上传):
- `UsagePage` (W146) → 30 天数据
- `weeklyReport` (W147) → 7 天 Markdown/HTML 导出
- `ShareCard` (W147) → 5 风格
- `FeedbackButton` (W146) → 浮动右下角, 任何页唤起
- `NpsPrompt` (W146) → 7 天触发, 0-10 滑块

**主人端** (反馈汇总, 0 网络上传):
- `scripts/w151-feedback-report.mjs` (W151) → IDB 导出 JSON, 主人本地汇总
- `docs/W149_FRIEND_TRACKER.md` → 5-10 朋友每日跟踪
- `docs/REPORT_W152_FEEDBACK_<date>.md` → 汇总报告

**平台端** (W152 启动):
- V2EX 贴 → 评论/收藏 关注
- 即刻 → 点赞/评论
- Reddit → upvote/comment
- GitHub Issues → 真实用户 bug/feature

---

## 3. W152 决定 (基于真实数据)

### 决定 1: v3.0 方向
- **触发条件**: 真实用户 ≥ 10 + 反馈 ≥ 30 + NPS ≥ 7
- **候选方向**:
  - 多人协作 (云端同步, 朋友间共享错题本)
  - 教师端 (班级管理, 进度查看)
  - 公开 API (开发者可基于词库做扩展)
  - 移动端 PWA 优化 (iOS Safari PWA 限制)
- **不候选** (v3 plan 拒绝):
  - ❌ A 多语言主体
  - ❌ B 主动营销
  - ❌ C 微信小程序+Android
  - ❌ D 再改 UI

### 决定 2: 收尾
- **触发条件**: 真实用户 < 10 OR 反馈 < 10
- **动作**:
  - 写完整 README (给未来 contributor)
  - 录 5 分钟演示视频
  - 投 IndieHackers / ProductHunt
  - 接受 PR, 不主动推广

### 决定 3: 开源
- **触发条件**: 真实用户 ≥ 5 + GitHub stars ≥ 10
- **动作**:
  - 加 LICENSE (MIT)
  - 写 ROADMAP.md
  - 找 1-2 个社区 (IndieHackers / V2EX / Reddit)
  - 接受 PR, 主人兜底 1-3 月

---

## 4. W152 主任务

### 主人动作 (今日 2026-08-24)
- [ ] 发 V2EX 贴 (复制 `W149_V2EX_POST.md` → v2ex.com/new)
- [ ] 发即刻贴 (复制 `W149_JIKE_POST.md` → okjike.com)
- [ ] 发 Reddit 贴 (复制 `W149_REDDIT_POST.md` → reddit.com/submit)
- [ ] 微信群发邀请 (5-10 朋友, 复制 `W149_FRIEND_INVITE.md`)

### 主人每日 (D1-D7, 2026-08-24 ~ 2026-08-30)
- [ ] 检查 GitHub Issues (每日 1 次)
- [ ] 检查平台评论 (V2EX/即刻/Reddit, 每日 1 次)
- [ ] 朋友 1v1 跟踪 (微信群消息)
- [ ] 填写 `docs/W149_FRIEND_TRACKER.md` (朋友表)

### W153 决定 (2026-08-31)
- [ ] 汇总 1 周真实用户数据
- [ ] 运行 `scripts/w151-feedback-report.mjs` (需 IDB 导出)
- [ ] 决定 v3.0 / 收尾 / 开源
- [ ] 写 `docs/PLAN_W153.md` (W153 计划)

---

## 5. W152 不做的事

- ❌ v2.2.1 应急 patch (W151 已 0 业务 P0, 没必要)
- ❌ 大功能 (v3 plan E-方向已收口, 不开新战略)
- ❌ 性能优化 (1.7s LCP + 0.89 perf, 沙盒极限)
- ❌ 主动营销 (招募贴文已发, 等用户来)
- ❌ 邮件营销 / 推送通知 (0 网络上传硬约束)

---

## 6. 关键文件

| 文件 | 大小 | 状态 |
|---|---|---|
| `docs/RELEASE_v2.2.0.md` | 9.1KB | ✅ W151 已推 |
| `docs/BLOG_W151.md` | 10.8KB | ✅ W151 已推 |
| `docs/PLAN_W151.md` | 6.9KB | ✅ W151 已推 (招募计划) |
| `docs/PLAN_W152.md` | 本文件 | ✅ W152 启动 |
| `docs/W149_FRIEND_TRACKER.md` | 3.0KB | 📝 主人待填 |
| `docs/W149_V2EX_POST.md` | 2.9KB | ⏳ 待发 |
| `docs/W149_JIKE_POST.md` | 2.0KB | ⏳ 待发 |
| `docs/W149_REDDIT_POST.md` | 3.3KB | ⏳ 待发 |
| `docs/W149_FRIEND_INVITE.md` | 4.8KB | ⏳ 待发 |
| `scripts/w151-feedback-report.mjs` | 5.1KB | ✅ W151 已推 |
| `tests/w151-public-release.test.ts` | 15 测试 | ✅ 全过 |
| `tests/w151-emoji-cleanup.test.ts` | 9 测试 | ✅ 全过 |

---

## 7. 关键决策

1. **W152 不开发新功能** — v3 plan E-方向已收口
2. **W152 等真实数据** — 1 周内测 + 3 平台
3. **W153 决定** — v3.0 / 收尾 / 开源 (基于真实数据, 不再脑补)
4. **W152 0 业务 P0 维持** — 2222 测试 + 0 emoji + 0 网络上传
5. **Lighthouse workflow yml** — 仍需 user 自己推 (沙盒 token 缺 scope)

---

## 8. 风险 + 兜底

| 风险 | 概率 | 兜底 |
|---|---|---|
| 0 朋友响应 | 中 | 主动找 (W153 决定前) |
| 0 平台回复 | 中 | 找其他社区 (IndieHackers / Twitter / HN) |
| 0 反馈 | 中 | 主人自我测试 + UsagePage 数据 (1 周内自己跑 30 天) |
| 0 网络上传假阳性 | 低 | W146 硬约束 0 网络 + IDB 验证 |
| 招募期 P0 | 低 | 2222 测试 + 3 verifier 抗审查 |

---

**北极星**: 让英语在你想用的时候就能用上。

**W152 = v2.2.0 公开发布版 → 真实用户反馈 → 决定 W153 方向**。

**下一步**: 主人发 3 平台贴文 + 微信群邀请 → D1-D7 跟踪 → W153 决定 v3.0 / 收尾 / 开源。
