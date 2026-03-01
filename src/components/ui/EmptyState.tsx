import { cn } from '@/lib/utils'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: React.ReactNode
  emoji?: string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }
  className?: string
}

export function EmptyState({ icon, emoji, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-20 px-6', className)}>
      {(icon || emoji) && (
        <div className="w-18 h-18 rounded-3xl gradient-hero flex items-center justify-center mb-5 shadow-soft animate-float" style={{ width: '4.5rem', height: '4.5rem' }}>
          {emoji ? <span className="text-3xl">{emoji}</span> : <span className="text-white">{icon}</span>}
        </div>
      )}
      <h3 className="font-display text-xl font-bold text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-400 max-w-sm leading-relaxed mb-7">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} leftIcon={action.icon} size="md">
          {action.label}
        </Button>
      )}
    </div>
  )
}
