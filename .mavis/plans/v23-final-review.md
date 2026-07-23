# v0.23 综合审查报告 - Mavis (主人接管)

> **审查者**: Mavis (root session 421087658755222)
> **审查方式**: 双轨
> 1. 独立 verifier subagent 启动 (failed: token rate limit 卡死 4+ 分钟 0 输出)
> 2. 主人接管: 静态审查脚本 (`scripts/review-v23.py`) + 深度代码读
> **审查时间**: 2026-07-23
> **基线**: 877fe5b (v0.23.0 + v0.23.1+0.23.2)
> **最终修复后状态**: ✅ 17/17 Playwright 验证全过

---

## 总评

**PASS-WITH-CONCERNS** — 5 个 P1 已全部修复,2 个 P2 留待后续。

---

## P1 (5 个,已修)

### P1-1: AIChat 选词 useEffect 闭包陷阱 ✅ 修复
- **位置**: `src/pages/AIChat.tsx:497-510` (旧)
- **问题**: `useEffect(() => { ... }, [])` 依赖空,但 handler 闭包内调用的 `handleMouseUpSel` 捕获了**第一次渲染**的 `activeTranslateProvider`。用户切换翻译渠道后,新渠道不生效,选词 tooltip 仍用旧渠道翻译。
- **重现**: 1) 进入 /chat 2) 设置里切换翻译渠道 (mymemory → baidu) 3) AI 消息中选词 4) 翻译仍走 mymemory
- **影响**: 用户感知到"切换翻译渠道无效",配置不被尊重
- **修复**:
  ```ts
  const providerRef = useRef(activeTranslateProvider)
  const apiKeysRef = useRef(translateApiKeys)
  providerRef.current = activeTranslateProvider  // 每次渲染同步
  apiKeysRef.current = translateApiKeys
  // handler 通过 providerRef.current 读取最新值
  ```

### P1-2: AIChat 选词 selTimer 组件 unmount 没清理 ✅ 修复
- **位置**: `src/pages/AIChat.tsx:485-512` (旧)
- **问题**: 选词后 400ms setTimeout 触发,在等待时切换 chat → MessageBubble 组件 unmount → setTimeout 仍然在跑 → setSel(null) 在已 unmount 组件上调用 → React warning (虽然不会崩,但污染日志)
- **影响**: 内存泄漏 + React warning 噪音
- **修复**:
  ```ts
  const mountedRef = useRef(true)
  useEffect(() => () => { mountedRef.current = false }, [])
  // setTimeout 内每个 await 后 + setSel 前检查 mountedRef.current
  // useEffect cleanup 显式 clearTimeout(selTimer.current)
  ```

### P1-3: WritePage 切 tab 不重置 state ✅ 修复
- **位置**: `src/pages/WritePage.tsx:70-72` (旧)
- **问题**: 切到 history Tab → 切回 write Tab,旧的 input/result/addedWords 还在显示,可能与用户预期不一致
- **重现**: 1) 写"hello" 2) 批改出 5 个错误 3) 切 history Tab 4) 切回 write Tab → 仍显示 "hello" 和旧结果
- **影响**: 用户体验困惑,以为 input/result 还在
- **修复**:
  ```ts
  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory()
    } else {
      // 切回 write tab: 重置 input/result/addedWords/error
      setInput('')
      setResult(null)
      setError('')
      setAddedWords(new Set())
    }
  }, [activeTab])
  ```

### P1-4: AIChat 选词 tooltip 滚动错位 ✅ 修复
- **位置**: `src/pages/AIChat.tsx:528` (旧)
- **问题**: tooltip 用 `fixed` 定位,但 `y: rect.top + window.scrollY - 8` 加了 page 滚动距离。fixed 定位**不**应该加 `window.scrollY`。
- **重现**: 1) 长对话滚动到中段 2) 选词 3) tooltip 出现在滚动后错位位置(可能屏幕外)
- **影响**: 长对话中 tooltip 看不见
- **修复**:
  ```ts
  y: rect.top - 8,  // P1 修复: fixed 定位不用 + window.scrollY
  ```

### P1-5: AIChat 跨 message 选词 tooltip 不消失 ✅ 修复
- **位置**: `src/pages/AIChat.tsx` (旧)
- **问题**: 每个 MessageBubble 独立的 sel state。Message1 选词 → tooltip1 出现 → 点击 Message2 区域(未选词)→ Message1 的 tooltip 不会消失(只有 4s 自动消失)
- **重现**: 1) AI 消息中选 "hello" → tooltip1 出现 2) click 另一条消息(不要选词)→ tooltip1 仍存在直到 4s 后
- **影响**: 多 tooltip 可能共存,体验混乱
- **修复**:
  ```ts
  // 新增 mousedown 监听,click outside paragraph 关闭
  const clickOutside = (e: MouseEvent) => {
    if (!paragraphRef.current) return
    if (paragraphRef.current.contains(e.target as Node)) return
    const target = e.target as HTMLElement
    if (target.closest('[data-word-tooltip]')) return  // tooltip 内不关闭
    setSel(null)
  }
  // tooltip 加 data-word-tooltip 属性
  ```

---

## P2 (2 个,未修)

### P2-1: AIChat 选词 tooltip 鼠标颜色在 user 消息上对比度低
- user 消息背景是 `bg-brand-600`(深绿),tooltip 背景是 `bg-stone-900`(近黑),对比度还可以但视觉融合
- **建议**: tooltip 加 border-white/20 加强区分

### P2-2: WritePage textarea 无 Ctrl+Enter 快捷键触发
- 写完一段长文,用户期望 Ctrl+Enter 直接批改
- **建议**: 加 `onKeyDown` 处理 Ctrl+Enter

---

## 已验证的 OK 项(防止误报)

1. **WritePage race condition**: `disabled={loading || !input.trim() || !provider}` 防住了双击
2. **WritePage maxLength={MAX_LEN}**: 浏览器拦截超长粘贴,save 截断是冗余但无害
3. **WritePage history delete confirm**: 已用 `confirm()`
4. **AIChat reqIdRef race**: v0.22 P1-2 已修,本轮验证 reqIdRef.current 自增
5. **AIChat 选词 selTimer 400ms 防抖**: clearTimeout 防止竞态
6. **PronounceCustom text 解析**: useMemo + try-catch
7. **PronounceCustom 空 text 引导**: 已实现"返回每日一句"

---

## 验证

- ✅ `npm run build` pass
- ✅ `scripts/verify-v23.mjs`: 11/11 check pass
- ✅ `scripts/verify-v23b.mjs`: 6/6 check pass
- ✅ 5 个 P1 修复全部通过验证

---

## Subagent 失败原因

- 启动 verifier subagent 1 个,8 分钟 0 输出
- 典型 token rate limit 卡死模式
- 应对: **主人接管** — 静态审查脚本 + 深度代码读
- 这是 subagent 失败的第 6 次,继续降级模式

---

## 累计

- v0.23 总共: 0 P0 + 5 P1 (已修) + 2 P2 (未修) = 7 个新发现
- 修复后: 0 P0 + 0 P1 + 2 P2
- 写代码 + 审查 + 修复总计 1.5d,符合 v0.22 末"v0.23 新功能 1.5d 验收" 计划
