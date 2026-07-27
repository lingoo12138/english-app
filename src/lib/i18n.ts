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
    // v1.45.0 W45: CardReview 页面 26 key (verifier1 P1-1)
    'review.preparing': '准备中...',
    'review.empty_title': '生词本为空',
    'review.empty_desc': '先去词库加几个词吧',
    'review.empty_browse': '去词库浏览',
    'review.empty_notebook': '去生词本',
    'review.done_title': '🎉 复习完成',
    'review.done_subtitle': '本次复习 N 张, 共 M 张',
    'review.again': '重来',
    'review.hard': '困难',
    'review.good': '良好',
    'review.easy': '简单',
    'review.again_hint': '< 1 min',
    'review.hard_hint': '吃力',
    'review.good_hint': '正常',
    'review.easy_hint': '完美',
    'review.back_notebook': '返回生词本',
    'review.back_home': '回首页',
    'review.exit': '退出',
    'review.switch_phrase': '短语模式',
    'review.switch_word': '单词模式',
    'review.from_word': '来自',
    'review.flipping': '点击翻回正面',
    'review.flip_hint': '点击翻到背面',
    'review.flip_btn': '翻到背面',
    'review.session_count': '本次已复习 N 张',
    'review.due_count': '待复习 N 张',
    // v1.45.0 W45: ReportsPage 3 key (verifier1 P2-1)
    'reports.page_title': '学习报告',
    'reports.daily_title': '今日日报',
    'reports.weekly_title': '本周周报',
    // v1.46.0 W45: Home 4 key
    'home.today_summary': '今日数据 · 7 天汇总 · 同周对比',
    'home.streak_title': '连续学习',
    'home.review_center': '复习中心',
    'home.plan_summary': '7 天曲线 · 连续天数 · 今日详情',
    // v1.47.0 W45: Settings 1 key
    'settings.page_title': '设置',
    // v1.49.0 W46: Notebook 10 key
    'notebook.remove_title': '从生词本移除',
    'notebook.batch_remove_title': '批量移除',
    'notebook.title': '生词本',
    'notebook.count_summary': '共 N 个词 · M 个待复习',
    'notebook.batch_mode': '☑ 批量管理',
    'notebook.batch_exit': '✓ 批量 (N)',
    'notebook.card_review': '🎴 卡片复习',
    'notebook.review_prompt': '有 N 个词该复习了',
    'notebook.review_cta': '开始复习',
    'notebook.export_menu': '导出 ▾',
    // v1.49.0 W46: WordList 6 key
    'wordlist.title': '词库',
    'wordlist.search_placeholder': '搜索单词或中文...',
    'wordlist.count_summary': '共 N 个词 · 已显示 M · 收藏 K',
    'wordlist.load_more': '加载更多 ↓',
    'wordlist.all_loaded': '已显示全部 N 个词',
    'wordlist.empty': '没有匹配的词',
    // v1.49.0 W46: WordDetail 5 key
    'worddetail.not_found': '找不到这个词',
    'worddetail.not_found_back': '返回词库',
    'worddetail.known': '✓ 认识',
    'worddetail.unknown': '✗ 不认识',
    'worddetail.ask_known': '认识这个单词吗?',
    // v1.49.0 W46: ErrorsPage 7 key
    'errors.title': '📕 改错本',
    'errors.empty_title': '还没有错误记录',
    'errors.empty_desc': '去写一段英文,或在 AI 对话中让 AI 帮你纠错',
    'errors.tab_overview': '📈 总览',
    'errors.tab_types': '🏷 类型',
    'errors.tab_top': '🔥 高频错词',
    'errors.tab_timeline': '🕐 时间',
    // v1.50.0 W46: DailyPage + CalendarPage 3 key
    'daily.title': '每日一句',
    'daily.history': '历史精选',
    'calendar.title': '学习日历',
    // v1.52.0 W47: AIChat/WritePage/Translate 7 key
    'aichat.title': 'AI 对话陪练',
    'aichat.history': '历史对话 (N)',
    'write.title': '写作批改',
    'write.corrected': '改正后',
    'write.errors': '错误清单 (N)',
    'translate.title': '翻译',
    'custom.title': '自定义场景',
    // v1.53.0 W48: CustomScenes/ReviewCenter/Achievements/CustomSceneLearn 7 key
    'customscenes.title': '📝 自定义场景',
    'customscenes.extracted': '提取结果 (N 词)',
    'review.empty': '没有待复习的词',
    'review.done': '复习完成!',
    'achievements.title': '成就墙',
    'customlearn.done': '学完啦!',
    'worddetail.back': '返回',
    // v1.54.0 W49: LearnReport/Scenes 5 key
    'learnreport.title': 'AI 对话学习报告',
    'learnreport.difficulty': '词汇难度分布',
    'learnreport.scenes': '场景分布',
    'scenes.title': '场景专题课',
    'pronounce.back': '返回',
    // v1.49.0 W46: ListenPage 7 key
    'listen.title': '🎧 听力模式',
    'listen.subtitle': '5 篇真实场景短文 · TTS 播放 · 挖空听写 · 错词入生词本',
    'listen.recommend_title': '🎯 为你推荐',
    'listen.recommend_subtitle': '根据你的错题',
    'listen.next_dictation': '下一关:挖空听写 →',
    'listen.complete_title': '完成!',
    'listen.result_subtitle': 'N 已加入已完成列表',
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
    // v1.45.0 W45: CardReview 26 key
    'review.preparing': 'Preparing...',
    'review.empty_title': 'Notebook is empty',
    'review.empty_desc': 'Add some words first',
    'review.empty_browse': 'Browse words',
    'review.empty_notebook': 'Go to notebook',
    'review.done_title': '🎉 Review complete',
    'review.done_subtitle': 'Reviewed N of M cards',
    'review.again': 'Again',
    'review.hard': 'Hard',
    'review.good': 'Good',
    'review.easy': 'Easy',
    'review.again_hint': '< 1 min',
    'review.hard_hint': 'Difficult',
    'review.good_hint': 'Normal',
    'review.easy_hint': 'Perfect',
    'review.back_notebook': 'Back to notebook',
    'review.back_home': 'Home',
    'review.exit': 'Exit',
    'review.switch_phrase': 'Phrase mode',
    'review.switch_word': 'Word mode',
    'review.from_word': 'From',
    'review.flipping': 'Click to flip back',
    'review.flip_hint': 'Click to flip',
    'review.flip_btn': 'Flip',
    'review.session_count': 'Reviewed N cards',
    'review.due_count': 'N due',
    // v1.45.0 W45: ReportsPage 3 key
    'reports.page_title': 'Reports',
    'reports.daily_title': 'Today',
    'reports.weekly_title': 'This Week',
    // v1.46.0 W45: Home 4 key
    'home.today_summary': 'Today · 7-day summary',
    'home.streak_title': 'Streak',
    'home.review_center': 'Review Center',
    'home.plan_summary': '7-day curve · streak · today',
    // v1.47.0 W45: Settings 1 key
    'settings.page_title': 'Settings',
    // v1.49.0 W46: Notebook 10 key
    'notebook.remove_title': 'Remove from Notebook',
    'notebook.batch_remove_title': 'Batch Remove',
    'notebook.title': 'Notebook',
    'notebook.count_summary': 'N words · M due',
    'notebook.batch_mode': '☑ Batch',
    'notebook.batch_exit': '✓ Batch (N)',
    'notebook.card_review': '🎴 Card Review',
    'notebook.review_prompt': 'N words due for review',
    'notebook.review_cta': 'Start Review',
    'notebook.export_menu': 'Export ▾',
    // v1.49.0 W46: WordList 6 key
    'wordlist.title': 'Words',
    'wordlist.search_placeholder': 'Search word or Chinese...',
    'wordlist.count_summary': 'N words · M shown · K fav',
    'wordlist.load_more': 'Load more ↓',
    'wordlist.all_loaded': 'All N words shown',
    'wordlist.empty': 'No matches',
    // v1.49.0 W46: WordDetail 5 key
    'worddetail.not_found': 'Word not found',
    'worddetail.not_found_back': 'Back to words',
    'worddetail.known': '✓ Known',
    'worddetail.unknown': '✗ Unknown',
    'worddetail.ask_known': 'Do you know this word?',
    // v1.49.0 W46: ErrorsPage 7 key
    'errors.title': '📕 Error Book',
    'errors.empty_title': 'No errors yet',
    'errors.empty_desc': 'Write something or chat with AI to collect errors',
    'errors.tab_overview': '📈 Overview',
    'errors.tab_types': '🏷 Types',
    'errors.tab_top': '🔥 Top',
    'errors.tab_timeline': '🕐 Timeline',
    // v1.50.0 W46: DailyPage + CalendarPage 3 key
    'daily.title': 'Daily',
    'daily.history': 'History',
    'calendar.title': 'Calendar',
    // v1.52.0 W47: AIChat/WritePage/Translate 7 key
    'aichat.title': 'AI Chat',
    'aichat.history': 'History (N)',
    'write.title': 'Writing',
    'write.corrected': 'Corrected',
    'write.errors': 'Errors (N)',
    'translate.title': 'Translate',
    'custom.title': 'Custom scenes',
    // v1.53.0 W48: CustomScenes/ReviewCenter/Achievements/CustomSceneLearn 7 key
    'customscenes.title': '📝 Custom Scenes',
    'customscenes.extracted': 'Extracted (N words)',
    'review.empty': 'No due reviews',
    'review.done': 'Review complete!',
    'achievements.title': 'Achievements',
    'customlearn.done': 'Done!',
    'worddetail.back': 'Back',
    // v1.54.0 W49: LearnReport/Scenes 5 key
    'learnreport.title': 'AI Chat Report',
    'learnreport.difficulty': 'Difficulty',
    'learnreport.scenes': 'Scenes',
    'scenes.title': 'Scenes',
    'pronounce.back': 'Back',
    // v1.49.0 W46: ListenPage 7 key
    'listen.title': '🎧 Listening',
    'listen.subtitle': '5 real scenes · TTS · dictation · error-to-fav',
    'listen.recommend_title': '🎯 For You',
    'listen.recommend_subtitle': 'Based on your errors',
    'listen.next_dictation': 'Next: Dictation →',
    'listen.complete_title': 'Done!',
    'listen.result_subtitle': 'N added to completed',
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
