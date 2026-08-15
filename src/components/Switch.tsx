// W149 反馈 18: Switch toggle 滑块 component
// 业务: 替代原生 checkbox, 平滑滑入 (200ms + spring)
// 用法: <Switch checked={darkMode} onChange={toggleDark} label="深色" />

interface SwitchProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  disabled?: boolean
  testId?: string
}

export function Switch({ checked, onChange, label, disabled, testId }: SwitchProps) {
  return (
    <label
      className={`inline-flex items-center gap-2 cursor-pointer select-none ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      <span
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        data-testid={testId}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            onChange(!checked)
          }
        }}
        className={`switch-track ${checked ? 'switch-on' : ''}`}
      >
        <span className="switch-thumb" />
      </span>
      {label && <span className="text-sm">{label}</span>}
    </label>
  )
}
