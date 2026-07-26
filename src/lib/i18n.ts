// i18n.ts - v1.41.0 W41 国际化
// 中英双语, 默认 zh, 切换无刷新
// 简化: 静态 key 字典 + useTranslate hook

export type Locale = 'zh' | 'en'

const STORAGE_KEY = 'app-locale'

/** 翻译字典 (核心 UI 字符串) */
const DICT: Record<Locale, Record<string, string>> = {
  zh: {
    'app.name': '句刻',
    'app.tagline': '即时英语学习',
    'home.greeting': '你好',
    'home.dailyGoal': '今日目标',
    'home.start': '开始',
    'nav.home': '首页',
    'nav.words': '词库',
    'nav.daily': '每日',
    'nav.translate': '翻译',
    'nav.notebook': '生词本',
    'nav.review': '复习',
    'nav.settings': '设置',
    'nav.scores': '成绩',
    'review.due': '待复习',
    'review.today': '今天',
    'review.streak': '连续',
    'review.days': '天',
    'review.startSession': '开始复习',
    'notebook.empty': '生词本为空',
    'notebook.addWords': '去词库加几个词吧',
    'settings.appearance': '外观',
    'settings.darkMode': '暗色模式',
    'settings.fontSize': '字号',
    'settings.llm': 'AI 渠道',
    'settings.tts': '语音',
    'settings.data': '数据管理',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.delete': '删除',
    'common.confirm': '确认',
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.success': '成功',
    'common.empty': '暂无数据',
  },
  en: {
    'app.name': 'Jùkè',
    'app.tagline': 'Instant English',
    'home.greeting': 'Hello',
    'home.dailyGoal': "Today's Goal",
    'home.start': 'Start',
    'nav.home': 'Home',
    'nav.words': 'Words',
    'nav.daily': 'Daily',
    'nav.translate': 'Translate',
    'nav.notebook': 'Notebook',
    'nav.review': 'Review',
    'nav.settings': 'Settings',
    'nav.scores': 'Scores',
    'review.due': 'Due',
    'review.today': 'Today',
    'review.streak': 'Streak',
    'review.days': 'days',
    'review.startSession': 'Start Review',
    'notebook.empty': 'Notebook is empty',
    'notebook.addWords': 'Add some words first',
    'settings.appearance': 'Appearance',
    'settings.darkMode': 'Dark Mode',
    'settings.fontSize': 'Font Size',
    'settings.llm': 'AI Providers',
    'settings.tts': 'Voice',
    'settings.data': 'Data',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.confirm': 'Confirm',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.empty': 'No data',
  },
}

/** 当前语言 (默认 zh) */
let currentLocale: Locale = 'zh'

/** 检测/读 locale (localStorage > 浏览器 > zh) */
export function getLocale(): Locale {
  if (typeof window === 'undefined') return 'zh'
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'zh' || saved === 'en') return saved
  } catch {}
  return 'zh'
}

/** 设置 locale (持久化 + 触发事件) */
export function setLocale(locale: Locale): void {
  currentLocale = locale
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {}
  // 触发 React 组件 rerender
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('locale-change', { detail: locale }))
  }
}

/** 翻译函数 (单 key 查找) */
export function t(key: string, locale: Locale = currentLocale): string {
  return DICT[locale]?.[key] || DICT.zh[key] || key
}

/** 批量翻译 (key 数组) */
export function tMany(keys: string[], locale: Locale = currentLocale): Record<string, string> {
  const r: Record<string, string> = {}
  for (const k of keys) r[k] = t(k, locale)
  return r
}

/** 初始化 (启动时调) */
export function initLocale(): Locale {
  currentLocale = getLocale()
  return currentLocale
}
