import { cn } from '@/lib/utils'
import type { CategoryColor } from '@/types'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: CategoryColor | 'gray'
  size?: 'sm' | 'md'
  dot?: boolean
}

const colorMap: Record<NonNullable<BadgeProps['color']>, string> = {
  rose:   'bg-rose-100 text-rose-700 border-rose-200',
  pink:   'bg-pink-100 text-pink-700 border-pink-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  blue:   'bg-blue-100 text-blue-700 border-blue-200',
  green:  'bg-green-100 text-green-700 border-green-200',
  amber:  'bg-amber-100 text-amber-700 border-amber-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  teal:   'bg-teal-100 text-teal-700 border-teal-200',
  gray:   'bg-gray-100 text-gray-600 border-gray-200',
}

const dotColorMap: Record<NonNullable<BadgeProps['color']>, string> = {
  rose:   'bg-rose-500',
  pink:   'bg-pink-500',
  purple: 'bg-purple-500',
  blue:   'bg-blue-500',
  green:  'bg-green-500',
  amber:  'bg-amber-500',
  orange: 'bg-orange-500',
  teal:   'bg-teal-500',
  gray:   'bg-gray-400',
}

export function Badge({ className, color = 'gray', size = 'sm', dot, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        colorMap[color],
        className,
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColorMap[color])} />}
      {children}
    </span>
  )
}
