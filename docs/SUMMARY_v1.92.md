# v1.92 收官总结 (W86 完结)

## 时间线
- **W86** (v1.92.0) — 2 模块: 跟读评分 + 错题导出 CSV
- 主人全做 (W83/W84/W85/W86 模式延续)
- 主人 3 维 review 0 P0, 0 P1

## v1.92 新功能
- **跟读评分 (Follow Read Score)**:
  - src/lib/followRead.ts: normalizeFR / scoreFollowRead / diffFollowRead / evaluateFollowRead / splitSentences
  - 复用 W83 跟读模式 + STT 录音 (src/lib/stt 已有)
  - 字符相似度 60% + 词命中率 40% 综合 5 档 (100/80/50/20/0)
  - 错入 dictationErrors (source='follow-read') 复用
  - 12 个测试
  - DictationError.source 加 'follow-read'

- **错题导出 CSV (Export Errors CSV)**:
  - src/lib/exportErrors.ts: escapeCSV / writingErrorToCSV / dictationErrorToCSV / allErrorsToCSV / downloadCSV
  - 写作 + 听写 + 拼写 + 跟读 全部错题合并导出
  - ErrorsPage 标题区 '📥 导出 CSV' 按钮
  - BOM UTF-8 (Excel 中文不乱码)
  - 11 个测试

## 累计数据 (v1.92.0)
- **92 release tag** (v0.1.0 ~ v1.92.0) / 17 周 / **21 次大 review**
- **917 单元测试** (894 + 23) / 68 文件
- **450+ commit** / 27 页面 / 32 组件 / 50 库
- **5,423 词 / 100% 词根**
- **20 篇课文** / **244 同义词**
- **跟读 + 听写 + 拼写 + 触类旁通 + 释义收藏** 6 大激活功能
- **跟读评分 (W86 新)** + **错题导出 CSV (W86 新)**
- 0 P0 + 0 P1 业务 维持

## W86 关键经验
- **STT 复用**: src/lib/stt 已存在 STTController, 跟读直接复用
- **跟读评分 复用听写 4 档**: 字符 60% + 词 40% 综合, 与 DictationPage 算法一致
- **CSV BOM**: \uFEFF 前缀让 Excel 中文不乱码
- **错题合并 export**: 复用 dictationErrors 表 + writingErrors 全部, 1 按钮导出
- **复合 source**: DictationError.source = 'dictation' | 'spelling' | 'follow-read' 复用 1 张表
- **Cleanup useEffect**: 组件卸载时 sttRef.stop(), 避免内存泄漏

## 下一阶段 (W87 候选)
1. **真机测试 5 步** (15 min, 验收 v1.89-v1.92 部署)
2. **第 22 次大 review** (拉 1-2 verifier sub-agent)
3. **跟读评分 UI 增强** (评分历史 / 高亮错词)
4. **错题导入** (CSV 导回, 多设备同步)
5. **10+ 字符专业词根补全** (5 词, ROI 低)
6. **释义收藏列表页** (复用 Notebook 模式)
