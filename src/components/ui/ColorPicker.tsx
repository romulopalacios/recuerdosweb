import { cn } from '@/lib/utils'
import { CATEGORY_COLORS } from '@/lib/categoryData'
import type { CategoryColor } from '@/types'

interface ColorPickerProps {
  value: CategoryColor
  onChange: (color: CategoryColor) => void
  label?: string
}

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
      <div className="flex flex-wrap gap-2.5">
        {CATEGORY_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            title={c.label}
            onClick={() => onChange(c.value)}
            className={cn(
              'w-7 h-7 rounded-full transition-all duration-150 cursor-pointer',
              c.bg,
              value === c.value ? `ring-2 ring-offset-2 scale-110 ${c.ring}` : 'hover:scale-110',
            )}
          />
        ))}
      </div>
    </div>
  )
}
