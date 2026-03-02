import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  glass?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6 lg:p-7',
}

export function Card({ className, hover, glass, padding = 'md', children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-100',
        'shadow-card',
        glass ? 'glass' : 'bg-white',
        hover && [
          'transition-all duration-250 cursor-pointer',
          'hover:shadow-card-hover hover:-translate-y-0.5 hover:border-gray-200',
        ],
        paddingMap[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>
export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)} {...props}>
      {children}
    </div>
  )
}

type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>
export function CardTitle({ className, children, ...props }: CardTitleProps) {
  return (
    <h3 className={cn('font-display text-lg font-semibold text-gray-900', className)} {...props}>
      {children}
    </h3>
  )
}
