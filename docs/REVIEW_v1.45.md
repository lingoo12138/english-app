# v1.45.0 W45 P1 Hotfix — verifier1 找到的 2 bug 修复

**日期**: 2026-07-27 (W45, 30min)
**版本**: v1.45.0
**触发**: W44 verifier1 找到 P1-1 + P2-1

---

## P1-1 修: CardReview 26 t() key 补全 (verifier1 真 bug)

### 现象
`src/pages/CardReview.tsx` 调 26 个 `t('review.*')`, 但 `src/lib/i18n.ts` DICT 只 5 个 review.* key. 用户看到原始 key 字符串如 `review.preparing`.

### 修法
`src/lib/i18n.ts` 加 26×2 = 52 个 key:
- review.preparing / empty_title / empty_desc / empty_browse / empty_notebook
- review.done_title / done_subtitle
- review.again/hard/good/easy + 4 hint
- review.back_notebook/back_home/exit
- review.switch_phrase/switch_word/from_word
- review.flipping/flip_hint/flip_btn
- review.session_count/due_count

### 配套
`tests/i18nKeyCoverage.test.ts` (4 测试) - 静态扫 `src/pages/**/*.tsx` 所有 t() 调用, 验证 DICT 全覆盖. 防止 v1.43 漏修复现.

---

## P2-1 修: ReportsPage 3+ t() 调用 (verifier1 死代码)

### 现象
ReportsPage 之前 import useTranslate + 解构 t, 但 0 处 t() 调用. 死代码.

### 修法
ReportsPage 加 3 处 t():
- 顶部 `<h1>📊 学习报告</h1>` → `📊 {t('reports.page_title')}`
- tab "📅 今日日报" → `📅 {t('reports.daily_title')}`
- tab "📆 本周周报" → `📆 {t('reports.weekly_title')}`

DICT 加 6 个 reports.* key (zh+en).

---

## 累计

| 维度 | v1.44 | v1.45 | 增量 |
|------|-------|-------|------|
| 测试 | 702 | **706** | +4 (i18nKeyCoverage) |
| 修 P1+P2 | - | 2 处 | verifier1 找到 |
| 主审查 6 维度漏判 | - | 0 P0 | 真 P1 在 i18n 完整性盲区 |

### 大 review verifier 价值
- v1.36 verifier 找到 3 处
- v1.39 verifier3 找到 2 处
- **v1.45 verifier1 找到 2 处 (P1+P2)**
- 累计: 7 处真 bug 由 verifier 找到 (主审查漏判)

### 6 维度盲区
主审查的 catch any / setLoading / as any / console / 空 catch / 历史修复没覆盖:
- i18n 完整性 (P1)
- lib 函数 0 调用 (P2)
- 跨文件集成 bug

v1.45 后, 加 i18nKeyCoverage 静态扫测试, 扩展维度 7 (i18n 完整性).

---

**最后更新**: 2026-07-27
