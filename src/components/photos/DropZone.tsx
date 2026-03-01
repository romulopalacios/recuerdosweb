import { useRef, useState, useCallback } from 'react'
import { Upload, ImagePlus } from 'lucide-react'
import { cn } from '@/lib/utils'

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
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
    return Array.from(raw).filter((f) => {
      if (!ACCEPT.includes(f.type)) return false
      if (f.size > MAX_SIZE_MB * 1024 * 1024) return false
      return true
    })
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
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-all duration-200 p-8 cursor-pointer select-none',
        dragging
          ? 'border-rose-400 bg-rose-50/80 scale-[1.01]'
          : disabled
          ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
          : 'border-pink-200 bg-pink-50/30 hover:border-rose-300 hover:bg-pink-50/60',
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
        dragging ? 'bg-rose-200 scale-110' : 'bg-pink-100',
      )}>
        {dragging ? (
          <Upload size={26} className="text-rose-500 animate-bounce" />
        ) : (
          <ImagePlus size={26} className="text-pink-400" />
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
