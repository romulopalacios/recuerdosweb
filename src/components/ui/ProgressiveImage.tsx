import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ProgressiveImageProps {
  src: string
  /** Optional low-res thumbnail URL shown immediately as blurred placeholder
   *  while the full-res `src` downloads. Falls back to a shimmer if absent. */
  thumbSrc?: string
  alt: string
  className?: string
  containerClassName?: string
  onClick?: () => void
  /** Tailwind background colour shown as placeholder while loading. Defaults to pink-50. */
  placeholderColor?: string
}

/**
 * Drop-in replacement for <img> that:
 * 1. Shows a thumb (blurred) or shimmer skeleton while the real image downloads.
 * 2. Fades the full-res image in smoothly once loaded (no pop-in).
 * 3. Always uses lazy + async decoding for off-screen images.
 *
 * Usage:
 *   <ProgressiveImage
 *     src={photo.public_url}
 *     thumbSrc={photo.thumb_url}
 *     alt="foto"
 *   />
 */
export function ProgressiveImage({
  src,
  thumbSrc,
  alt,
  className,
  containerClassName,
  onClick,
  placeholderColor = 'bg-rose-50',
}: ProgressiveImageProps) {
  const [loaded,   setLoaded]   = useState(false)
  const [errored,  setErrored]  = useState(false)

  return (
    <div className={cn('relative overflow-hidden w-full h-full', containerClassName)}>
      {/* ── Placeholder layer ─── */}
      {!loaded && !errored && (
        thumbSrc ? (
          /* Blurred thumbnail shown immediately as a low-fi preview */
          <img
            src={thumbSrc}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover scale-105 blur-sm"
          />
        ) : (
          /* Shimmer skeleton fallback */
          <div
            className={cn('absolute inset-0 animate-pulse', placeholderColor)}
            aria-hidden
          />
        )
      )}

      {/* ── Error state ─── */}
      {errored && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <span className="text-2xl opacity-30">💔</span>
        </div>
      )}

      {/* ── Full-res image ─── */}
      {!errored && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          onClick={onClick}
          role={onClick ? 'button' : undefined}
          tabIndex={onClick ? 0 : undefined}
          onKeyDown={onClick ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onClick()
            }
          } : undefined}
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

