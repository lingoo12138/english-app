// MultiRoleSelector.tsx - v1.27.0 W28 多人对话
// 选 3 套预设场景, 1 套 = 3 角色
import { MULTI_ROLE_SCENARIOS, type MultiRoleScenario } from '../lib/chatRoles'

interface MultiRoleSelectorProps {
  selectedScenarioId: string | null
  onChange: (scenarioId: string | null) => void
}

export default function MultiRoleSelector({ selectedScenarioId, onChange }: MultiRoleSelectorProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1"
      role="radiogroup"
      aria-label="选择多人场景"
    >
      {/* 关闭按钮 */}
      <button
        onClick={() => onChange(null)}
        className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
          selectedScenarioId === null
            ? 'bg-stone-200 dark:bg-stone-700'
            : 'bg-stone-50 dark:bg-stone-800 hover:bg-stone-100'
        }`}
        aria-pressed={selectedScenarioId === null}
      >
        ✕ 关闭
      </button>
      {MULTI_ROLE_SCENARIOS.map((s) => (
        <ScenarioCard
          key={s.id}
          scenario={s}
          selected={s.id === selectedScenarioId}
          onClick={() => onChange(s.id)}
        />
      ))}
    </div>
  )
}

function ScenarioCard({
  scenario,
  selected,
  onClick,
}: {
  scenario: MultiRoleScenario
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors text-left ${
        selected
          ? 'bg-brand-500 text-white'
          : 'bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700'
      }`}
      role="radio"
      aria-checked={selected}
      title={scenario.description}
    >
      <div className="font-semibold">
        {scenario.emoji} {scenario.name}
      </div>
      <div className={`text-xs mt-0.5 ${selected ? 'text-white/80' : 'text-stone-500'}`}>
        {scenario.roleIds.length} 角色 · {scenario.description}
      </div>
    </button>
  )
}
