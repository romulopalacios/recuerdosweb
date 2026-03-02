import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ProgressiveImageProps {
  src: string
  alt: string
  className?: string
  containerClassName?: string
  onClick?: () => void
  /** Tailwind background colour shown as placeholder while loading. Defaults to pink-50. */
  placeholderColor?: string
}

/**
 * Drop-in replacement for <img> that:
 * 1. Shows a shimmer skeleton while the real image downloads.
 * 2. Fades the image in smoothly once loaded (no pop-in).
 * 3. Always uses lazy + async decoding for off-screen images.
 *
 * Usage:
 *   <ProgressiveImage src={photo.public_url} alt="foto" className="w-full h-full object-cover" />
 */
export function ProgressiveImage({
  src,
  alt,
  className,
  containerClassName,
  onClick,
  placeholderColor = 'bg-rose-50',
}: ProgressiveImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  return (
    <div className={cn('relative overflow-hidden w-full h-full', containerClassName)}>
      {/* Shimmer skeleton — hidden once image is ready */}
      {!loaded && !errored && (
        <div
          className={cn(
            'absolute inset-0 animate-pulse',
            placeholderColor,
          )}
          aria-hidden
        />
      )}

      {/* Error state */}
      {errored && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <span className="text-2xl opacity-30">💔</span>
        </div>
      )}

      {/* The actual image */}
      {!errored && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          onClick={onClick}
          className={cn(
            'transition-opacity duration-500',
            loaded ? 'opacity-100' : 'opacity-0',
            className,
          )}
        />
      )}
    </div>
  )
}
