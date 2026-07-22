// 外观设置 - v0.22.2
import { useStore } from '../../store/useStore'
import { THEMES, FONT_SIZES, applyTheme, applyFontSize, getTheme } from '../../lib/themes'

export default function AppearanceSection() {
  const darkMode = useStore(s => s.darkMode)
  const toggleDark = useStore(s => s.toggleDark)
  const themeColor = useStore(s => s.themeColor)
  const setThemeColor = useStore(s => s.setThemeColor)
  const fontSize = useStore(s => s.fontSize)
  const setFontSize = useStore(s => s.setFontSize)

  return (
    <section className="card space-y-3">
      <h3 className="font-semibold">🎨 外观</h3>
      <div>
        <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">主题色</label>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map(theme => (
            <button
              key={theme.id}
              onClick={() => {
                setThemeColor(theme.id)
                applyTheme(getTheme(theme.id))
              }}
              className={`p-3 rounded-lg border-2 transition-all ${
                themeColor === theme.id
                  ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-stone-200 dark:border-stone-700'
              }`}
            >
              <div className="w-6 h-6 rounded-full mx-auto mb-1" style={{ background: `rgb(${theme.colors['500']})` }} />
              <div className="text-xs">{theme.name}</div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-sm text-stone-500 dark:text-stone-400 mb-1.5 block">字号</label>
        <div className="grid grid-cols-4 gap-2">
          {FONT_SIZES.map(fs => (
            <button
              key={fs.id}
              onClick={() => {
                setFontSize(fs.id)
                applyFontSize(fs.id)
              }}
              className={`p-2 rounded-lg border-2 ${
                fontSize === fs.id
                  ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-stone-200 dark:border-stone-700'
              }`}
            >
              <div className="text-sm font-medium">{fs.name}</div>
              <div className="text-xs text-stone-500 dark:text-stone-400">{fs.base}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-700">
        <div>
          <div className="font-medium">暗色模式</div>
          <div className="text-sm text-stone-500 dark:text-stone-400">晚上学习更护眼</div>
        </div>
        <button
          onClick={toggleDark}
          className={`w-12 h-7 rounded-full transition-colors ${
            darkMode ? 'bg-brand-600' : 'bg-stone-300 dark:bg-stone-700'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
              darkMode ? 'translate-x-6' : 'translate-x-1'
            }`}
            style={{ marginTop: '4px' }}
          />
        </button>
      </div>
    </section>
  )
}
