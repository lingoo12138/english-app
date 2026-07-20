// 通用工具函数

/** 格式化日期为 YYYYMMDD,用于文件名后缀 */
export function formatDate(date = new Date()): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
}

/** 格式化日期为人类可读 YYYY-MM-DD */
export function formatDateISO(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

/** 根据 pathname 返回页面 title */
export function getPageTitle(pathname: string): string {
  if (pathname === '/') return '句刻 - 即时英语学习'
  if (pathname.startsWith('/words/')) return '单词详情 - 句刻'
  if (pathname.startsWith('/words')) return '词库 - 句刻'
  if (pathname.startsWith('/scenes/')) return '场景详情 - 句刻'
  if (pathname.startsWith('/scenes')) return '场景专题课 - 句刻'
  if (pathname.startsWith('/daily')) return '每日一句 - 句刻'
  if (pathname.startsWith('/translate')) return '中英翻译 - 句刻'
  if (pathname.startsWith('/notebook')) return '生词本 - 句刻'
  if (pathname.startsWith('/weak')) return '错题本 - 句刻'
  if (pathname.startsWith('/review')) return '复习中心 - 句刻'
  if (pathname.startsWith('/settings')) return '设置 - 句刻'
  return '句刻'
}
