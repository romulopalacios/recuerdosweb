import { useRef, useState, useCallback } from 'react'
import { Upload, ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// SEC: Both MIME type AND file extension are validated together to prevent
// type-confusion attacks (e.g. a renamed .html or .php file with a spoofed MIME).
const ACCEPT_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'])
const ACCEPT_EXT  = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'])
/** Keep the legacy `ACCEPT` export so the <input accept="…"> attribute still works */
const ACCEPT = [...ACCEPT_MIME]
const MAX_SIZE_MB = 20

interface DropZoneProps {
  onFiles: (files: File[]) => void
  disabled?: boolean
  className?: string
}

export function DropZone({ onFiles, disabled, className }: DropZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function filterFiles(raw: FileList | null): File[] {
    if (!raw) return []
    const all = Array.from(raw)
    const valid: File[] = []
    const rejected: string[] = []

    for (const f of all) {
      // SEC: cross-validate MIME type AND file extension — either alone can be spoofed
      const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
      const mimeOk = ACCEPT_MIME.has(f.type)
      const extOk  = ACCEPT_EXT.has(ext)

      if (!mimeOk || !extOk) {
        rejected.push(`«${f.name}»: tipo no soportado`)
      } else if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        rejected.push(`«${f.name}»: supera ${MAX_SIZE_MB} MB`)
      } else {
        valid.push(f)
      }
    }

    // BUG-11 fix: notify user about rejected files instead of silently dropping them
    if (rejected.length > 0) {
      toast.warning(
        `${rejected.length} archivo${rejected.length > 1 ? 's' : ''} no se puede${rejected.length > 1 ? 'n' : ''} subir:\n${rejected.join(', ')}`,
      )
    }
    return valid
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      if (disabled) return
      onFiles(filterFiles(e.dataTransfer.files))
    },
    [disabled, onFiles],
  )

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (disabled) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-all duration-200 p-8 cursor-pointer select-none',
        dragging
          ? 'border-rose-400 bg-rose-50/80 scale-[1.01]'
          : disabled
          ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
          : 'border-rose-200 bg-rose-50/30 hover:border-rose-300 hover:bg-rose-50/60',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT.join(',')}
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(e) => onFiles(filterFiles(e.target.files))}
        // Reset value so same files can be re-selected
        onClick={(e) => { (e.target as HTMLInputElement).value = '' }}
      />

      <div className={cn(
        'w-14 h-14 rounded-2xl flex items-center justify-center transition-all',
        dragging ? 'bg-rose-200 scale-110' : 'bg-rose-100',
      )}>
        {dragging ? (
          <Upload size={26} className="text-rose-500 animate-bounce" />
        ) : (
          <ImagePlus size={26} className="text-rose-400" />
        )}
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold text-gray-700">
          {dragging ? '¡Suelta las fotos aquí!' : 'Arrastra fotos o haz clic para seleccionar'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          JPG, PNG, WEBP, GIF • Máx. {MAX_SIZE_MB} MB por foto
        </p>
      </div>
    </div>
  )
}
