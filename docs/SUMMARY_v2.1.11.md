# v2.1.11 (W123d + W124 + W125) — AIChat 改版稿 2 + LessonScore Bento + 暗色/高对比度

## 背景
W123a+b+c 改版稿后续 AIChat + ErrorReview UI 优化后, 用户反馈 AIChat 排版不太好看.
重做 v2 (W123d) + 课文评分 UI 改造 (W124) + 改版稿 2 (W125 暗色/高对比度/PWA).

## 改动

### W123d AIChat UI v2 — 标题居中 + 3 圆按钮 + 3 大折叠
- 之前: 标题 + 副标题 + 4 emoji 操作 (新对话/导出/历史) 挤一行 + 角色+多人场景+场景+难度 全部展开
- 修后:
  - 顶部: 标题居左 + 3 圆形 Icon 按钮 (新对话/导出/历史 w-9 h-9 rounded-full) + 历史角标 badge
  - 角色: 折叠卡片, 默认展开 (主功能), 折叠箭头 ease-spring
  - 场景+多人场景+难度+自由话题: 折叠卡片, 默认收起 (高级), 展示当前值
  - 跟 W121 4 大组 风格一致 (border + 折叠箭头 + aria-expanded)
- 文件: `src/pages/AIChat.tsx` + `src/components/Icon.tsx` (IconSettings 复用)

### W124 LessonScorePage UI 改造 — Bento 4 卡 + 大圆环
- 之前: 4 单行 + 1 大文字百分比 + 4 emoji filter + emoji 状态标签
- 修后:
  - 顶部: 圆形返回 + 标题居中 (BarChart icon)
  - Bento 4 卡 (md:grid-cols-4): 课文/已掌握/学习中/未开始, 数字 + 标签 (Trophy/Sparkles/BookOpen)
  - 总词汇掌握度: 大圆环 SVG (20x20 + strokeDasharray) + 数字 + 跨课复用词
  - filter: 4 圆角按钮 (无 emoji)
  - 课文卡: card-interactive + 进度条 + 状态标签 (已掌握/学习中/未开始, 圆角 + 边框)
- 文件: `src/pages/LessonScorePage.tsx`

### W125 改版稿 2 — 暗色强化 + 高对比度 + PWA slide-up
1. **高对比度模式** (data-contrast=high):
   - `[data-contrast='high']` 强化 shadow + 边框 + 输入框 2px
   - 系统级 `prefers-contrast: more` 自动增强
   - Settings 加 toggle, localStorage 持久化
2. **暗色模式强化** (W125 改版稿 2):
   - bg-stone-950 (从 stone-900)
   - 卡片阴影加深
3. **PWA install banner** (W125 优化):
   - slide-up 动效 (animate-slide-up + spring)
   - 圆角 2xl + 阴影 24px
   - IconShare 圆形 (替 📲 emoji)
   - IconClose 圆按钮 (替 ✕ 文本)
- 文件: `src/index.css` + `src/components/InstallPrompt.tsx` + `src/components/settings/AppearanceSection.tsx` + `src/components/Icon.tsx` (IconClose)

## 累计数据 v2.1.11
- **122 release tag** / 19+ 周
- **1269 单元测试** (1252 → +17 测试 = W123d 6 + W124 7 + W125 7 实际新 20 - 3 个跨文件)
- **5,423 词 / 100%** ⭐
- 0 P0 + 0 P1 业务
- 18 verifier 抗审查 (24 P0 + 49 P1 累计修)
- 8 大激活功能 + 2 补充 = 10/10 改版稿 全部落地 ✅
- 改版稿 2 (暗色/高对比度) 落地 ✅

## 部署
- main: 42cd462 ✅ pushed
- gh-pages: 9811135 ✅ pushed
- 预览: https://lingoo12138.github.io/english-app/

## 视觉验证
- `screenshots/w123d-desktop-aichat.png` — AIChat v2 居中标题 + 3 圆按钮 + 角色/场景·难度 折叠
- `screenshots/w124-desktop-lesson-score.png` — LessonScore Bento + 大圆环 100%
- `screenshots/w125-high-contrast.png` — 高对比度 边框强化
- `screenshots/w125-dark-mode.png` — 暗色 stone-950 强化
