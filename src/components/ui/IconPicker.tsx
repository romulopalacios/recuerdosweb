import { cn } from '@/lib/utils'
import { CATEGORY_ICONS } from '@/lib/categoryData'
import type { CategoryIcon } from '@/types'

interface IconPickerProps {
  value: CategoryIcon
  onChange: (icon: CategoryIcon) => void
  label?: string
}

export function IconPicker({ value, onChange, label }: IconPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_ICONS.map((ic) => (
          <button
            key={ic.value}
            type="button"
            title={ic.label}
            onClick={() => onChange(ic.value)}
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all duration-150 cursor-pointer',
              value === ic.value
                ? 'bg-rose-100 ring-2 ring-rose-400 scale-110'
                : 'bg-gray-50 hover:bg-rose-50 hover:scale-110',
            )}
          >
            {ic.emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

// Re-exported for convenience — source of truth is @/lib/categoryData
// eslint-disable-next-line react-refresh/only-export-components
export { getIconEmoji } from '@/lib/categoryData'
