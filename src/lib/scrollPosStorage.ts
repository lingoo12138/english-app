// src/lib/scrollPosStorage.ts - 侧边栏 滚 动 位置 持久 化 (W109, verifier B P2-4 修)
const STORAGE_KEY = 'nav-scroll-pos-v1'
const MAX_ENTRIES = 30  // 限制 条目 (避 免 无限 增 长)

/** 读 */
export function loadScrollPosMap(): Map<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Map()
    const obj = JSON.parse(raw) as Record<string, number>
    return new Map(Object.entries(obj))
  } catch (e) {
    console.warn('[scrollPosStorage] load failed:', e)
    return new Map()
  }
}

/** 写 (限 30 条) */
export function saveScrollPosMap(map: Map<string, number>): void {
  try {
    // 限 制 条目 数
    if (map.size > MAX_ENTRIES) {
      // 业务 简化: 保留 最近 MAX_ENTRIES 条 (Map 保 持 插 入 顺序)
      const entries = Array.from(map.entries())
      const trimmed = entries.slice(-MAX_ENTRIES)
      map = new Map(trimmed)
    }
    const obj = Object.fromEntries(map)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
  } catch (e) {
    console.warn('[scrollPosStorage] save failed:', e)
  }
}

/** 清 */
export function clearScrollPosMap(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (e) {
    console.warn('[scrollPosStorage] clear failed:', e)
  }
}
