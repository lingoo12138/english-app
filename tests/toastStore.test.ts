// tests/toastStore.test.ts - v1.5-Review 共享组件 (Toast zustand store)
import { describe, it, expect, beforeEach } from 'vitest'
import { useToastStore, toast } from '../src/components/Toast'

describe('Toast zustand store (v1.5 review)', () => {
  beforeEach(() => {
    // 清空
    useToastStore.setState({ toasts: [] })
  })

  describe('useToastStore.show', () => {
    it('应添加 toast', () => {
      const id = useToastStore.getState().show('test message', 'info', 0)  // duration 0 = 不自动消失
      const toasts = useToastStore.getState().toasts
      expect(toasts.length).toBe(1)
      expect(toasts[0].id).toBe(id)
      expect(toasts[0].message).toBe('test message')
      expect(toasts[0].type).toBe('info')
    })

    it('应返回递增的 id', () => {
      const id1 = useToastStore.getState().show('a')
      const id2 = useToastStore.getState().show('b')
      expect(id2).toBeGreaterThan(id1)
    })

    it('应自动消失当 duration > 0', async () => {
      useToastStore.getState().show('auto', 'info', 50)  // 50ms
      expect(useToastStore.getState().toasts.length).toBe(1)
      await new Promise(r => setTimeout(r, 100))
      expect(useToastStore.getState().toasts.length).toBe(0)
    })
  })

  describe('useToastStore.dismiss', () => {
    it('应移除指定 id 的 toast', () => {
      const id = useToastStore.getState().show('test', 'info', 0)
      useToastStore.getState().dismiss(id)
      expect(useToastStore.getState().toasts.length).toBe(0)
    })

    it('应忽略不存在的 id', () => {
      useToastStore.getState().show('test', 'info', 0)
      useToastStore.getState().dismiss(999)
      expect(useToastStore.getState().toasts.length).toBe(1)
    })
  })

  describe('toast 便捷函数', () => {
    it('toast.success 应创建 success toast', () => {
      toast.success('操作成功')
      const t = useToastStore.getState().toasts[0]
      expect(t.type).toBe('success')
    })

    it('toast.error 应创建 error toast', () => {
      toast.error('出错了')
      const t = useToastStore.getState().toasts[0]
      expect(t.type).toBe('error')
    })

    it('toast.info 应创建 info toast', () => {
      toast.info('提示')
      const t = useToastStore.getState().toasts[0]
      expect(t.type).toBe('info')
    })

    it('toast.warning 应创建 warning toast', () => {
      toast.warning('警告')
      const t = useToastStore.getState().toasts[0]
      expect(t.type).toBe('warning')
    })
  })
})
