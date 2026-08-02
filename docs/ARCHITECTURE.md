# 🏗️ 技术架构

> v1.93.0 快照 · 详情见 [CHANGELOG.md](./CHANGELOG.md)

## 技术栈

```
Vite 5 + React 18 + TypeScript 5 + Tailwind 3 + Zustand 4 + Dexie 3
├─ PWA 离线 (vite-plugin-pwa, 30 天 CacheFirst)
├─ 主题: CSS 变量驱动, 8 主题 0 延迟切换
├─ 数据: IndexedDB v8 本地存储 (11 张表, 零云)
├─ AI 抽象层: 10 LLM / 8 TTS / 8 翻译 (统一接口 + 自动降级)
├─ 学习算法: FSRS 间隔重复 + 字符相似度 (multiset) + LCS diff
└─ 跟读 STT: Web Speech API (浏览器原生) + 评分算法
```

### IDB v8 表结构 (11 张)

```typescript
words           // 5,423 词主表
favorites       // 生词本
translationFavs // 释义收藏 (W85 新, [wordId+index] 复合 key)
writingErrors   // 写作错题 (write/chat/chinese)
dictationErrors // 听写/拼写/跟读错题 (v1.92 source: 'dictation'|'spelling'|'follow-read')
reviewQueue     // 复习队列 (FSRS)
vocabCache      // 词汇缓存
settings        // 用户设置
streak          // 连续学习
xp              // 经验值
notes           // 笔记
```

### 测试栈

- **Vitest 4** 单元测试 (**68 文件 / 939 测试**)
- **自定义 verify-v*.mjs** 静态检查 (60 闭环, 8 个已修)
- **自定义 review-v*.py** P0/P1/P2 审查 (14 版本历史)
- **大 review 机制** (类似 v1.6 13 bug / v1.22 18 处 catch any / v1.36 3 处 / v1.40.1 2 处 / v1.45-1.58 verifier 找 12 处)
- **verifier 抗审查 (W87+)** — 2-3 独立 verifier sub-agent 并行, 找对抗性 bug (W87 找 4 P0 + 12 P1)
- **0 P0 + 0 P1 业务** 维持 (200+ 轮)

## 目录结构

```
src/
├── lib/                  # 50 库 (核心算法 + 抽象层)
│   ├── wordNetwork.ts    # 同义词/反义词/词根网络 (W71-W82)
│   ├── textbook.ts       # 课文核心 (W78-W82)
│   ├── dictation.ts      # 听写核心 (W81-W83)
│   ├── spelling.ts       # 拼写 LCS (W84)
│   ├── followRead.ts     # 跟读评分 (W86)
│   ├── errorReview.ts    # 错题复习 (W87, 队列模型)
│   ├── exportErrors.ts   # 错题导出 CSV (W86)
│   ├── db.ts             # IDB v8 schema
│   ├── tts.ts / stt.ts   # TTS/STT 抽象
│   ├── llm.ts            # LLM 抽象 (10 渠道)
│   ├── md.ts             # Markdown 解析
│   └── ...
├── pages/                # 27 页面
│   ├── WordList.tsx / WordDetail.tsx  # 单词
│   ├── TextbookPage.tsx / LessonDetailPage.tsx  # 课文 (跟读评分集成)
│   ├── DictationPage.tsx / SpellingPage.tsx  # 听写/拼写
│   ├── ErrorReviewPage.tsx  # 错题复习 (W87 新)
│   ├── ErrorsPage.tsx       # 改错本 (5 tab filter)
│   ├── WritePage.tsx / AIChat.tsx  # 写作/AI
│   └── ...
├── components/           # 32 组件
│   ├── TTSButton.tsx / PronunciationPractice.tsx
│   ├── Toast.tsx / ...
│   └── ...
├── data/                 # 数据文件
│   ├── synonyms.ts (146) / synonyms-p3.ts (98)  # W71+W82 合并 244
│   ├── textbook.ts / textbook-p2.ts / textbook-p3.ts  # 20 篇
│   └── ...
├── store/                # Zustand store
└── types/                # TypeScript 类型

tests/                    # 68 文件, 939 测试
docs/                     # 文档
scripts/                  # 17+ 脚本 (内容补全 / 大 review)
public/data/words.json    # 5,423 词主数据
```

## 关键算法

### 听写 / 拼写 / 跟读评分 (统一)

```
scoreAnswer(answer, user):
  charScore (multiset 去空格)  = matched_chars / total_chars × 100
  wordScore (按词匹配)        = matched_words / total_words × 100
  final                     = charScore × 0.6 + wordScore × 0.4

grade: 95+ perfect / 70-94 good / 40-69 ok / 1-39 bad / 0 wrong
```

### 错题复习 (W87 队列模型)

```
answerInSession(session, userAnswer, peeked):
  card = session.remaining[0]
  session.remaining.shift()  // 弹出当前
  if (!correct || peeked):
    session.remaining.push(card)  // 错题留, 下次再出
  correct = (grade in [perfect, good])
```

### FSRS 间隔重复

```
next_review = now + stability × difficulty_factor
difficulty_factor = 0.8 if hard / 1.0 if ok / 1.3 if easy
```

## 部署架构

```
main 分支        ← 代码 (450+ commit)
gh-pages 分支   ← dist/ 静态文件 (69 entries, ~2.4MB)

GitHub Pages CDN → https://lingoo12138.github.io/english-app/

PWA CacheFirst (30 天):
  └─ index.html / assets/* / data/words.json
  └─ 离线完整可用
```
