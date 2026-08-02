# v1.97 收官总结 (W89-C 完结)

## 时间线
- **W89-C** (v1.97.0) — 释义收藏增强 (统计/时间/词性/JSON 导出)
- 主人全做 (W83+ 模式)
- 主人 3 维 review 0 P0, 0 P1

## v1.97 W89-C 新功能 (5 大块)
- **📊 统计卡片** (顶部)
  - 总数 / 单词数 / 本周 / 今日
  - ⭐ 最常收藏 (count > 1)
- **⏰ 时间过滤** (chip 多选)
  - 今天 / 本周 / 本月 / 更早
- **🏷️ 词性过滤** (chip 多选)
  - 名词 (noun) / 动词 (verb) / 形容词 (adj) / 副词 (adv)
  - 精确正则 /^(n\.?|noun|n)$/i
- **📥 JSON 导出** (浏览器下载)
  - UTF-8, version=1, exportedAt ISO, 含 word/pos/text/index/addedAt
- **👀 视图切换** (按单词 / 按时间)
  - 按时间: 今天/本周/本月/更早 4 组

- src/lib/translationFavFilter.ts: groupByTime/groupByPos/filterFavs/computeFavStats/exportFavsAsJson
- src/pages/TranslationFavsPage.tsx: 加 5 大功能
- tests/translationFavFilter.test.ts: 12 个测试

## 累计数据 (v1.97.0)
- **97 release tag** (v0.1.0 ~ v1.97.0) / 17 周 / **24 次大 review**
- **998 单元测试** (986 + 12) / 74 文件
- **5,423 词 / 100% 词根 / 5,129 词含短语 (94.9%)**
- **20 篇课文 / 244 同义词组**
- **7 大激活功能**
- 0 P0 + 0 P1 业务 维持

## 关键经验 (W89-C)
- **多维度过滤**: search × time × pos 组合, 3 维 chip 多选, UI 清晰
- **JSON vs CSV**: 释义收藏用 JSON 更合适 (层级: word+pos+text+index), CSV 适合错题平铺
- **词性正则**: `/^(n\.?|noun|n)$/i.test(p.trim())` 精确匹配, 避免 'n.' 和 'noun' 重复
- **viewMode toggle**: 按单词/按时间 切换, 用户视角更灵活
- **FavWithWord**: 缓存关联 word, 避免每渲染重查 wordMap

## 下一阶段 (W90 候选)
1. **真机测试 5 步** (15 min, 验收 v1.89-v1.97 部署)
2. **第 25 次大 review** (拉 1-2 verifier)
3. **W88-D 继续补 246 词短语** (5-9 字符)
4. **跟读评分增强 v2** (按句统计图)
5. **课文评分** (跨课复用 36 词掌握度)
