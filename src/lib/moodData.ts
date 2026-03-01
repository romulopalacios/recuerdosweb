import type { Memory } from '@/types'

export type Mood = NonNullable<Memory['mood']>

export const MOODS: { value: Mood; emoji: string; label: string; color: string }[] = [
  { value: 'happy',     emoji: '😊', label: 'Feliz',      color: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
  { value: 'romantic',  emoji: '🥰', label: 'Romántico',  color: 'bg-rose-100   border-rose-300   text-rose-700'   },
  { value: 'nostalgic', emoji: '🌅', label: 'Nostálgico', color: 'bg-amber-100  border-amber-300  text-amber-700'  },
  { value: 'excited',   emoji: '🎉', label: 'Emocionado', color: 'bg-purple-100 border-purple-300 text-purple-700' },
  { value: 'peaceful',  emoji: '🌸', label: 'Tranquilo',  color: 'bg-teal-100   border-teal-300   text-teal-700'   },
]

export function getMoodEmoji(mood?: Mood | null): string {
  return MOODS.find((m) => m.value === mood)?.emoji ?? ''
}
