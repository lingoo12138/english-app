# v0.23 静态审查报告

扫描: 56 个 TS/TSX 文件

## P0 (必修)

未发现自动可检 P0

## P1 (应该修)

### [src/pages/AIChat.tsx:56]
.map 可能缺 key: setMessages(chat.messages.map(m => ({ id: m.id, role: m.role as 'user' | 'assist

### [src/pages/AIChat.tsx:110]
.map 可能缺 key: messages: messages.map(m => ({ id: m.id, role: m.role as any, content: m.content

### [src/pages/CardReview.tsx:56]
.map 可能缺 key: .map(f => f.wordId)

### [src/pages/CardReview.tsx:59]
.map 可能缺 key: const dueSet = new Set(due.map((r: ReviewItem) => r.wordId))

### [src/pages/Home.tsx:133]
.map 可能缺 key: {plan.words.map(w => {

### [src/pages/LearnReport.tsx:196]
.map 可能缺 key: {Array.from({ length: 14 }).map((_, i) => {

### [src/pages/Notebook.tsx:25]
.map 可能缺 key: .map(f => f.wordId)

### [src/pages/PlanPage.tsx:94]
.map 可能缺 key: const maxCount = Math.max(...history.map(d => d.count), dailyGoal, 1)

### [src/pages/WordDetail.tsx:186]
.map 可能缺 key: {word.roots.map((r, i) => {

### [src/pages/WordList.tsx:38]
.map 可能缺 key: setFavSet(new Set(favs.map(f => f.wordId)))

### [src/pages/WritePage.tsx:131]
.map 可能缺 key: errors: parsed.errors.map(e => ({ ...e, type: e.type as any })),

### [src/pages/WritePage.tsx:163]
.map 可能缺 key: const wordMap = new Map(allWords.map(w => [w.word.toLowerCase(), w.id]))

### [src/pages/WritePage.tsx:398]
.map 可能缺 key: errors: Array.isArray(obj.errors) ? obj.errors.map((e: any) => {


## P2 (可选)

共 7 个,详见上面输出
