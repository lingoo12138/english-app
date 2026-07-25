// RoleSelector.tsx - v1.13.0 B3 多角色对话
// 角色卡片横向 scroll, 选中高亮
import { ALL_ROLES, type ChatRole } from '../lib/chatRoles'

interface RoleSelectorProps {
  selectedRoleId: string
  onChange: (roleId: string) => void
}

export default function RoleSelector({ selectedRoleId, onChange }: RoleSelectorProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1"
      role="radiogroup"
      aria-label="选择对话角色"
    >
      {ALL_ROLES.map((role) => (
        <RoleCard
          key={role.id}
          role={role}
          selected={role.id === selectedRoleId}
          onClick={() => onChange(role.id)}
        />
      ))}
    </div>
  )
}

function RoleCard({
  role,
  selected,
  onClick,
}: {
  role: ChatRole
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      role="radio"
      aria-checked={selected}
      aria-label={`切换到${role.name}角色: ${role.description}`}
      className={`flex-shrink-0 px-3 py-2 rounded-lg text-left transition-all min-w-[120px] ${
        selected
          ? 'bg-emerald-500 text-white shadow-md ring-2 ring-emerald-600'
          : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl" aria-hidden="true">{role.emoji}</span>
        <span className="font-semibold text-sm">{role.name}</span>
      </div>
      <div className={`text-xs leading-tight ${selected ? 'text-emerald-50' : 'text-stone-500 dark:text-stone-400'}`}>
        {role.description}
      </div>
    </button>
  )
}
