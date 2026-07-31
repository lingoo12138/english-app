# 部署说明 — v1.84.0 收官交付

**日期**: 2026-07-31
**状态**: ✅ 主线收官, 待真机测试

---

## 🚀 在线访问

| 渠道 | 链接 |
|------|------|
| **PWA 预览** | https://lingoo12138.github.io/english-app/ |
| **GitHub 仓库** | https://github.com/lingoo12138/english-app |
| **文档浏览** | https://lingoo12138.github.io/english-app/docs |
| **CHANGELOG** | https://raw.githubusercontent.com/lingoo12138/english-app/main/docs/CHANGELOG.md |
| **收官总结** | https://raw.githubusercontent.com/lingoo12138/english-app/main/docs/SUMMARY_v1.83.md |

---

## 📱 真机测试清单 (15 min, 5 步)

> 目标: 验证主流程在真实设备上跑得起来, 找体感问题

### Step 1: 首页 (2 min)
- [ ] 打开 PWA 链接
- [ ] 验证每日一句加载
- [ ] 验证底部 nav / 桌面侧栏 切换
- [ ] 验证 dark mode 切换 (设置)

### Step 2: 词库 (3 min)
- [ ] 字母分组滚动
- [ ] 搜索单词 (例如 `apple`)
- [ ] 收藏 (☆ → ⭐)
- [ ] 取消收藏
- [ ] 切换学段 (primary / cet4 / kaoyan / daily)

### Step 3: 复习 (3 min)
- [ ] /notebook 看收藏列表
- [ ] /review 看 SM-2 复习计划
- [ ] /cards 翻卡 (Again / Hard / Good / Easy 4 档)
- [ ] 完成后 XP 涨

### Step 4: AI 对话 (3 min)
- [ ] /chat 进聊天页
- [ ] 选角色 (8 个)
- [ ] 发消息, 看 Mock 回复
- [ ] 听 TTS (点击 🔊)
- [ ] 标错词 (如果识别到错)

### Step 5: 写作 (3 min)
- [ ] /write 写一句话
- [ ] 看 Mock 批改结果
- [ ] 错词自动入复习

### 反馈模板
如果发现问题, 在 issue 描述:
- 设备 (iPhone 15 / 小米 14 / Chrome 桌面 ...)
- 步骤 (在第 X 步)
- 期望 vs 实际
- 截图 (如果可以)

---

## 🐛 反馈渠道

| 类型 | 渠道 |
|------|------|
| Bug | https://github.com/lingoo12138/english-app/issues |
| 内容 (词根/短语错) | issue + 标签 `wrong-content` |
| 新功能建议 | issue + 标签 `enhancement` |
| 直接给我 | Mavis (我一直在) |

---

## 📊 收官数据 (v1.84.0)

| 维度 | 数字 |
|------|------|
| Release | 84 (v0.1 ~ v1.84) |
| Commit | 440+ |
| 单元测试 | 718 ✓ (55 files) |
| E2E 闭环 | 60/60 ✓ |
| 词根 | 95.6% (5,182/5,423) |
| 短语 | 94.6% (5,129/5,423) |
| 0 P0 维持 | 200+ 轮 |
| 6 历史修复 | 全健在 |
| Vendor as any | 7 处合理保留 |
| 业务 as any | 0 |

---

## 🗺️ 下一阶段 (v1.85+ 候选)

### A. 真机测试 + 用户反馈 (立刻)
- 跑上面 5 步清单
- 收真实使用数据
- 找新 bug (浏览器兼容 / 移动手势 / 网络异常)

### B. 内容续补 (低 ROI, 可选)
- 241 词无词根/短语 (1-4 字符 + 字母缩写)
- 配 ROI 极低, 但 100% 覆盖

### C. 新功能 (v1.85+ 路线)
**北极星导向: 触发可业 + 内容能用 + 学得会**

按"激活已学" 思路, 5 个新功能方向:

#### C1. 触类旁通 (Word Network)
- 同根词 / 同义词 / 反义词 / 搭配词 网状图
- 1 个词 → 联想 5-10 个相关词
- 帮助建立词汇网络, 不孤立背单词

#### C2. 造句练习 (Make Sentence)
- 给目标词, 用户造句
- Mock LLM 评分 (语法 / 用法 / 创新)
- 优秀句子入 "我的句子本"

#### C3. 填空练习 (Fill in Blank, 1-N 词)
- 短句 1 词填空 (选词)
- 长句 2-5 词填空 (拖拽)
- 选错时显示提示, 不直接判错

#### C4. 听写 (Dictation)
- 听句子, 写多个单词
- 已有 PronunciationPractice (单单词跟读), 扩展为听写

#### C5. 课文 (Textbook)
- 主题短文 (旅行 / 工作 / 情感 / 生活 / 科技)
- 每篇 100-200 词, 复用 8-15 个学过的单词
- 点单词看释义, 加复习
- 读完后做 1 个简答题

**建议优先级**: C1 > C3 > C2 > C5 > C4
- C1 触类旁通最直接激活 (北极星"触发可业"+"学得会")
- C3 填空最有效巩固 (学得会)
- C2 造句需要 LLM, 成本高
- C5 课文需要内容生产, 工作量大
- C4 听写技术上跟读类似, 但少用

### D. 技术债
- 7 处 vendor as any 提取标准 vendor types
- React.memo 性能优化
- bundle size 优化 (PDF 库 476KB 是大头)

---

## 🙏 写在最后

17 周 84 release, 0 P0, 60 闭环, 北极星对齐.

接下来不是写代码, 是 **用起来, 看数据**.

打开 https://lingoo12138.github.io/english-app/ 跑一遍主流程, 你会发现"英语在你想用的时候就能用上" 这句话, 真的可以实现.
