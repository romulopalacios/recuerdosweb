import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  /** Show character counter */
  maxChars?: number
  currentLength?: number
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, label, error, hint, maxChars, currentLength, id, ...props }, ref) {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <div className="flex items-center justify-between">
            <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
              {label}
            </label>
            {maxChars !== undefined && currentLength !== undefined && (
              <span className={cn('text-xs', currentLength > maxChars ? 'text-red-500' : 'text-gray-400')}>
                {currentLength}/{maxChars}
              </span>
            )}
          </div>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-xl border bg-white/80 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400',
            'transition-all duration-200 outline-none resize-none',
            'border-pink-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-red-400 focus:border-red-400 focus:ring-red-200',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
    )
  },
)
