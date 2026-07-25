# v1.25.0 大 review 摸底 — 5 维度静态审查

**日期**: 2026-07-26
**范围**: v1.23/24/25 累积 (3 个 release tag)
**目的**: 类似 v1.6 (13 bug 修复) + v1.22 (18 处 catch any) 机制
**结论**: **0 新 P0/P1, v1.22 review 维持** (无 bug 修复需求)

---

## 摸底脚本

`scripts/big-review-v1.25.py` (5 维度扫 src/)

## 结果

### 1. catch (e: any) 残留
- **0 处** ✓ (v1.22 review 维持)
- v1.23/24/25 新增代码全部用 `catch (e: unknown)` + `const err = e instanceof Error ? e : new Error(String(e))`

### 2. setLoading(true) 配对
- 23 处 setLoading(true), 全部有对应 setLoading(false) (finally 块)
- GrammarButton 误报: 注释字符串"setLoading(true) 修复" 被算, 实际 finally 配对正确

### 3. as any 残留
- 16 处, 全部豁免 (type literal + 老代码):
  - `navigator as any` (PWA standalone 检测)
  - `window as any` (浏览器 API 缺失兜底)
  - `e.target.value as any` (DOM 事件)
  - `e as any` (老 db.ts 224 行, v1.0 时代)
  - `matched?.level as any` (learnReport.ts 103, v1.0)
- 0 新增 as any (v1.23/24/25)

### 4. console.error / console.warn
- 72 处, 全部有对应 catch unknown 守卫
- 主流: ErrorBoundary (顶层) + 老代码 catch
- v1.23/24/25 新增: reminder.ts 2 处 (catch unknown 配对) + Notebook 1 处 (catch unknown)

### 5. useEffect([], []) 依赖
- 1 处: AIChat.tsx:755 (v1.6 bugfix 修过, setSttInterim 仅首次清空)
- v1.23/24/25 无新增 useEffect([], [])

---

## 结论

**v1.22 review 修 18 处 catch (e: any) 维持** ✓

v1.23 (PDF) / v1.24 (reminder) / v1.25 (tag merge) **3 个版本无新 P0/P1 引入**。

下次大 review 时机: 累积 5+ release tag (约 v1.30)。

---

**脚本**: `python3 scripts/big-review-v1.25.py`
**对比**: v1.22.0 review 修 18 处 → v1.25.0 review 0 处 (质量持续提升)
