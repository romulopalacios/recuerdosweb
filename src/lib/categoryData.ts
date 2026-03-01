import type { CategoryColor, CategoryIcon } from '@/types'

export const CATEGORY_COLORS: { value: CategoryColor; label: string; bg: string; ring: string }[] = [
  { value: 'rose',   label: 'Rosa',    bg: 'bg-rose-500',   ring: 'ring-rose-400'   },
  { value: 'pink',   label: 'Rosado',  bg: 'bg-pink-500',   ring: 'ring-pink-400'   },
  { value: 'purple', label: 'Morado',  bg: 'bg-purple-500', ring: 'ring-purple-400' },
  { value: 'blue',   label: 'Azul',    bg: 'bg-blue-500',   ring: 'ring-blue-400'   },
  { value: 'green',  label: 'Verde',   bg: 'bg-green-500',  ring: 'ring-green-400'  },
  { value: 'amber',  label: 'Ámbar',   bg: 'bg-amber-500',  ring: 'ring-amber-400'  },
  { value: 'orange', label: 'Naranja', bg: 'bg-orange-500', ring: 'ring-orange-400' },
  { value: 'teal',   label: 'Teal',    bg: 'bg-teal-500',   ring: 'ring-teal-400'   },
]

export const CATEGORY_ICONS: { value: CategoryIcon; emoji: string; label: string }[] = [
  { value: 'heart',    emoji: '❤️', label: 'Corazón'  },
  { value: 'star',     emoji: '⭐', label: 'Estrella' },
  { value: 'camera',   emoji: '📷', label: 'Cámara'   },
  { value: 'map-pin',  emoji: '📍', label: 'Lugar'    },
  { value: 'music',    emoji: '🎵', label: 'Música'   },
  { value: 'coffee',   emoji: '☕', label: 'Café'     },
  { value: 'gift',     emoji: '🎁', label: 'Regalo'   },
  { value: 'sun',      emoji: '☀️', label: 'Sol'      },
  { value: 'moon',     emoji: '🌙', label: 'Luna'     },
  { value: 'plane',    emoji: '✈️', label: 'Viaje'    },
  { value: 'home',     emoji: '🏠', label: 'Hogar'    },
  { value: 'sparkles', emoji: '✨', label: 'Magia'    },
]

export function getIconEmoji(icon: CategoryIcon): string {
  return CATEGORY_ICONS.find((i) => i.value === icon)?.emoji ?? '❤️'
}
