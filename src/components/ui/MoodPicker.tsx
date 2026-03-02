import { cn } from '@/lib/utils'
import { MOODS } from '@/lib/moodData'
import type { Mood } from '@/lib/moodData'

interface MoodPickerProps {
  value?: Mood
  onChange: (mood: Mood | undefined) => void
  label?: string
}

export function MoodPicker({ value, onChange, label }: MoodPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
      <div className="flex flex-wrap gap-2">
        {MOODS.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(value === m.value ? undefined : m.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-150 cursor-pointer',
              value === m.value ? m.color + ' scale-105 shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-rose-50',
            )}
          >
            <span>{m.emoji}</span>
            {m.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// Re-exported for convenience — source of truth is @/lib/moodData
export { getMoodEmoji } from '@/lib/moodData'
