# v1.1-W1 P2 审计报告 (v2, 误报豁免版)

> **生成时间**: 2026-07-23
> **脚本**: `scripts/audit-p2.py` (v1) + `/tmp/audit-fix.py` (v2 误报豁免)
> **状态**: 📋 待 review + 修复

## 统计

- 扫描文件: 64 个
- 真 P1/P2 命中: 34 处

| 严重度 | 数量 |
|--------|------|
| P1 | 0 |
| P2 | 34 |

## 命中最多文件 (Top 10)

| 数量 | 文件 |
|------|------|
| 7 | `src/components/settings/AIChatDataSection.tsx` |
| 5 | `src/components/settings/DataManagementSection.tsx` |
| 3 | `src/components/settings/CustomForms.tsx` |
| 2 | `src/App.tsx` |
| 2 | `src/main.tsx` |
| 2 | `src/components/TTSButton.tsx` |
| 2 | `src/pages/AIChat.tsx` |
| 2 | `src/pages/Notebook.tsx` |
| 1 | `src/components/settings/LLMSection.tsx` |
| 1 | `src/components/settings/MigrationSection.tsx` |

---

## 详细清单


### `src/App.tsx` (2 处)

| 行 | 严重度 | 说明 | 代码 |
|----|--------|------|------|
| 62 | P2 | console.log 调试残留 | `if (removed > 0) console.log(\`[plan] 清理了 ${removed} 个过期 plan-progress\`)` |
| 95 | P2 | setInterval 需确认 cleanup | `const id = setInterval(loadStats, 30000)` |

### `src/components/TTSButton.tsx` (2 处)

| 行 | 严重度 | 说明 | 代码 |
|----|--------|------|------|
| 57 | P2 | setInterval 需确认 cleanup | `const interval = window.setInterval(() => {` |
| 73 | P2 | alert() 阻塞 UI | `alert('当前浏览器不支持语音朗读,请换 Chrome/Edge/Safari')` |

### `src/components/settings/AIChatDataSection.tsx` (7 处)

| 行 | 严重度 | 说明 | 代码 |
|----|--------|------|------|
| 19 | P2 | alert() 阻塞 UI | `alert(\`❌ 解析失败\n\n${result.errors.slice(0, 3).join('\n')}\`)` |
| 23 | P2 | alert() 阻塞 UI | `alert('文件中没有有效的对话记录')` |
| 26 | P2 | confirm() 阻塞 UI | `if (!confirm(\`导入 ${result.chats.length} 个对话?\n\n已存在的同 ID 对话会被覆盖。\`)) return` |
| 28 | P2 | alert() 阻塞 UI | `alert(\`✅ 成功导入 ${imported} 个对话\`)` |
| 40 | P2 | alert() 阻塞 UI | `alert('没有对话可清空')` |
| 43 | P2 | confirm() 阻塞 UI | `if (!confirm(\`⚠️ 危险:此操作会清空所有 ${count} 个 AI 对话记录,不可恢复。\n\n确定要清空吗?\`)) return` |
| 45 | P2 | alert() 阻塞 UI | `alert('所有 AI 对话已清空')` |

### `src/components/settings/CustomForms.tsx` (3 处)

| 行 | 严重度 | 说明 | 代码 |
|----|--------|------|------|
| 37 | P2 | alert() 阻塞 UI | `alert(e?.message \|\| '配置错误')` |
| 71 | P2 | alert() 阻塞 UI | `alert(e?.message \|\| '配置错误')` |
| 108 | P2 | alert() 阻塞 UI | `alert(e?.message \|\| '配置错误')` |

### `src/components/settings/DataManagementSection.tsx` (5 处)

| 行 | 严重度 | 说明 | 代码 |
|----|--------|------|------|
| 13 | P2 | confirm() 阻塞 UI | `if (confirm('确定清空生词本/错题本?场景课进度会保留。')) {` |
| 16 | P2 | alert() 阻塞 UI | `alert('生词本和错题本已清空,场景课进度保留。')` |
| 25 | P2 | confirm() 阻塞 UI | `if (!confirm('⚠️ 危险:此操作会清空所有数据,包括生词本、错题本、跟读记录、场景课进度。\n\n确定要清空所有数据吗?')) return` |
| 26 | P2 | confirm() 阻塞 UI | `if (!confirm('请再次确认:此操作不可恢复。\n\n真的要清空所有数据吗?')) return` |
| 30 | P2 | alert() 阻塞 UI | `alert('所有数据已清空')` |

### `src/components/settings/LLMSection.tsx` (1 处)

| 行 | 严重度 | 说明 | 代码 |
|----|--------|------|------|
| 141 | P2 | confirm() 阻塞 UI | `onClick={() => { if (confirm(\`删除自定义 LLM 渠道 "${p.name}"?\`)) removeCustomLlmProv` |

### `src/components/settings/MigrationSection.tsx` (1 处)

| 行 | 严重度 | 说明 | 代码 |
|----|--------|------|------|
| 48 | P2 | confirm() 阻塞 UI | `if (!confirm('⚠️ 导入会覆盖当前所有数据!\n\n确定要继续吗?')) return` |

### `src/components/settings/TTSSection.tsx` (1 处)

| 行 | 严重度 | 说明 | 代码 |
|----|--------|------|------|
| 161 | P2 | confirm() 阻塞 UI | `onClick={() => { if (confirm(\`删除自定义 TTS 渠道 "${p.name}"?\`)) removeCustomTtsProv` |

### `src/components/settings/TranslateSection.tsx` (1 处)

| 行 | 严重度 | 说明 | 代码 |
|----|--------|------|------|
| 107 | P2 | confirm() 阻塞 UI | `onClick={() => { if (confirm(\`删除自定义翻译渠道 "${p.name}"?\`)) removeCustomTranslateP` |

### `src/lib/reminder.ts` (1 处)

| 行 | 严重度 | 说明 | 代码 |
|----|--------|------|------|
| 71 | P2 | setInterval 需确认 cleanup | `schedulerInterval = window.setInterval(checkAndFire, 60_000)` |

### `src/lib/tts.ts` (1 处)

| 行 | 严重度 | 说明 | 代码 |
|----|--------|------|------|
| 150 | P2 | console.log 调试残留 | `console.log(\`[TTS Mock] ${opts.text}\`)` |

### `src/main.tsx` (2 处)

| 行 | 严重度 | 说明 | 代码 |
|----|--------|------|------|
| 48 | P2 | confirm() 阻塞 UI | `if (confirm('🚀 新版本可用,是否立即更新?\n(将清空当前页面缓存)')) {` |
| 53 | P2 | console.log 调试残留 | `console.log('[PWA] 离线就绪,无网络也能用')` |

### `src/pages/AIChat.tsx` (2 处)

| 行 | 严重度 | 说明 | 代码 |
|----|--------|------|------|
| 102 | P2 | confirm() 阻塞 UI | `if (!confirm('确定删除这条对话?')) return` |
| 301 | P2 | confirm() 阻塞 UI | `if (messages.length > 0 && !confirm('清空当前对话?')) return` |

### `src/pages/ErrorsPage.tsx` (1 处)

| 行 | 严重度 | 说明 | 代码 |
|----|--------|------|------|
| 80 | P2 | confirm() 阻塞 UI | `if (!confirm('确定删除这条记录?')) return` |

### `src/pages/Notebook.tsx` (2 处)

| 行 | 严重度 | 说明 | 代码 |
|----|--------|------|------|
| 47 | P2 | confirm() 阻塞 UI | `if (!confirm('从生词本移除这个词?')) return` |
| 55 | P2 | confirm() 阻塞 UI | `if (!confirm(\`确定从生词本移除 ${selected.size} 个词?\`)) return` |

### `src/pages/WeakWords.tsx` (1 处)

| 行 | 严重度 | 说明 | 代码 |
|----|--------|------|------|
| 62 | P2 | confirm() 阻塞 UI | `if (!confirm('从生词本移除?')) return` |

### `src/pages/WritePage.tsx` (1 处)

| 行 | 严重度 | 说明 | 代码 |
|----|--------|------|------|
| 195 | P2 | confirm() 阻塞 UI | `if (!confirm('确定删除这条记录?')) return` |
