/**
 * usePhotoAlbumExport
 * ─────────────────────────────────────────────────────────────────────────────
 * Exports a selection of photos as a scrapbook-style PDF using jsPDF.
 *
 * Layout per page:
 *   A4 landscape — 2 photos per page, each with a rounded border, caption
 *   and date label. A title page is prepended automatically.
 *
 * Why pure jsPDF (not html2canvas)?
 *   html2canvas struggles with cross-origin image CORS headers from Supabase
 *   CDN. Instead, we fetch each image as a Blob → convert to base64 → embed
 *   directly into the PDF. This approach works offline too.
 *
 * Usage:
 *   const { exportAlbum, isExporting, progress } = usePhotoAlbumExport()
 *   await exportAlbum(selectedPhotos, { title: 'Nuestro Verano 2025' })
 */

import { useState, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Photo } from '@/types'

// jsPDF is loaded lazily — only when the user clicks "Exportar PDF".
// This keeps it out of the Gallery page initial bundle (~300 kB saved).
type JsPDFCtor = typeof import('jspdf').default
let _jsPDF: JsPDFCtor | null = null
async function getJsPDF(): Promise<JsPDFCtor> {
  if (!_jsPDF) {
    const mod = await import('jspdf')
    _jsPDF = mod.default
  }
  return _jsPDF
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AlbumExportOptions {
  /** Album / PDF title shown on the cover page */
  title?: string
  /** Subtitle shown below the title (e.g. couple name) */
  subtitle?: string
  /** Accent colour in hex used for borders and header bar */
  accentColor?: string
  /** Number of photos per page (1 or 2) */
  photosPerPage?: 1 | 2
}

export interface UsePhotoAlbumExportReturn {
  exportAlbum: (photos: Photo[], opts?: AlbumExportOptions) => Promise<void>
  isExporting: boolean
  /** 0-100 – how many photos have been fetched so far */
  progress: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Fetch an image URL and return a base64 data-URI */
async function toBase64(url: string): Promise<string> {
  const response = await fetch(url, { mode: 'cors' })
  if (!response.ok) throw new Error(`Failed to fetch image: ${url}`)
  const blob   = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/** Detect image format from base64 data-URI */
function detectFormat(dataUri: string): 'JPEG' | 'PNG' | 'WEBP' {
  if (dataUri.startsWith('data:image/png'))  return 'PNG'
  if (dataUri.startsWith('data:image/webp')) return 'WEBP'
  return 'JPEG'
}

/** Format a date string for the caption */
function formatPhotoDate(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    return format(parseISO(dateStr), "d 'de' MMMM 'de' yyyy", { locale: es })
  } catch {
    return dateStr
  }
}

// ─── Page layout constants (mm) ───────────────────────────────────────────────

const PAGE_W  = 297   // A4 landscape width mm
const PAGE_H  = 210   // A4 landscape height mm
const MARGIN  = 14

// ─── Colour helpers ────────────────────────────────────────────────────────────

/** Parse a #rrggbb hex string into [r, g, b] 0-255 */
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Lighten an rgb triple toward white by `amount` 0-1 */
function lighten([r, g, b]: [number,number,number], amount: number): [number,number,number] {
  return [
    Math.round(r + (255 - r) * amount),
    Math.round(g + (255 - g) * amount),
    Math.round(b + (255 - b) * amount),
  ]
}

/** Darken an rgb triple toward black by `amount` 0-1 */
function darken([r, g, b]: [number,number,number], amount: number): [number,number,number] {
  return [Math.round(r * (1 - amount)), Math.round(g * (1 - amount)), Math.round(b * (1 - amount))]
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePhotoAlbumExport(): UsePhotoAlbumExportReturn {
  const [isExporting, setIsExporting] = useState(false)
  const [progress,    setProgress]    = useState(0)

  const exportAlbum = useCallback(async (
    photos: Photo[],
    opts: AlbumExportOptions = {},
  ) => {
    if (photos.length === 0 || isExporting) return

    const {
      title         = 'Nuestros Recuerdos 💕',
      subtitle      = '',
      accentColor   = '#e11d48',    // rose-600
      photosPerPage = 2,
    } = opts

    // Pre-compute colour variants
    const accentRgb   = hexToRgb(accentColor)
    const accentLight = lighten(accentRgb, 0.88)  // near-white tint
    const accentDark  = darken(accentRgb,  0.50)  // deep dark tone for cover
    const accentMid   = darken(accentRgb,  0.22)  // mid tone for decorations

    setIsExporting(true)
    setProgress(0)

    try {
      // ── 1. Pre-fetch all images (with progress) ─────────────────────────
      const base64Images: string[] = []
      for (let i = 0; i < photos.length; i++) {
        try {
          const b64 = await toBase64(photos[i].public_url)
          base64Images.push(b64)
        } catch {
          // Fallback: push a placeholder so the index stays aligned
          base64Images.push('')
        }
        setProgress(Math.round(((i + 1) / photos.length) * 80))
      }

      // ── 2. Create PDF ───────────────────────────────────────────────────
      const JsPDF = await getJsPDF()
      const pdf = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      // ── Helper: apply screen-clockwise rotation (degrees) around (cx,cy mm)─
      // Injects a PDF CTM `cm` operator inside a q/Q graphics state scope.
      // jsPDF's internal y-axis is flipped (y goes down in API, up in PDF),
      // so a clockwise screen rotation equals a counterclockwise PDF rotation.
      // Formula derived from rotation-around-point in PDF coordinate space.
      function withRotation(
        angleDeg: number,
        cx: number, cy: number,
        drawFn: () => void,
      ) {
        if (angleDeg === 0) { drawFn(); return }
        const K   = 72 / 25.4                    // mm → pt
        const θ   = angleDeg * Math.PI / 180     // clockwise in screen
        const cos = Math.cos(θ)
        const sin = Math.sin(θ)
        // PDF coordinate of centre point (y is flipped)
        const px = cx * K
        const py = (PAGE_H - cy) * K
        // Homogeneous rotation matrix around (px, py) for PDF y-up space
        const e = px * (1 - cos) - py * sin
        const f = py * (1 - cos) + px * sin
        const n = (v: number) => v.toFixed(6)
        pdf.saveGraphicsState()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(pdf as any).internal.out(
          `${n(cos)} ${n(-sin)} ${n(sin)} ${n(cos)} ${n(e)} ${n(f)} cm`
        )
        drawFn()
        pdf.restoreGraphicsState()
      }

      // ── Helper: draw album corner holders (triangles) ─────────────────────
      function drawCorners(x: number, y: number, w: number, h: number, sz = 6) {
        const [r, g, b] = accentRgb
        pdf.setFillColor(r, g, b)
        // Top-left
        pdf.triangle(x, y, x + sz, y, x, y + sz, 'F')
        // Top-right
        pdf.triangle(x + w, y, x + w - sz, y, x + w, y + sz, 'F')
        // Bottom-left
        pdf.triangle(x, y + h, x + sz, y + h, x, y + h - sz, 'F')
        // Bottom-right
        pdf.triangle(x + w, y + h, x + w - sz, y + h, x + w, y + h - sz, 'F')
      }

      // ── Helper: draw a washi-tape strip across a corner ───────────────────
      function drawTape(x: number, y: number, tapeW = 24) {
        // Soft diagonal band — no GState/opacity needed, just a pale tint
        const tapeColor = lighten(accentRgb, 0.55)
        pdf.setFillColor(...tapeColor)
        pdf.setLineWidth(0)
        // Parallelogram: top-left to top-right, then offset down
        pdf.lines(
          [[tapeW, 0], [0, 5], [-tapeW, 0], [0, -5]],
          x + 2, y + 6,
          [1, 1], 'F', true,
        )
      }

      // ── Helper: draw a tilted photo card ─────────────────────────────────
      function drawPhotoCell(
        b64: string,
        fmt: 'JPEG' | 'PNG' | 'WEBP',
        caption: string | undefined,
        date: string,
        x: number, y: number, w: number, h: number,
        angleDeg = 0,
      ) {
        const cx = x + w / 2
        const cy = y + h / 2

        withRotation(angleDeg, cx, cy, () => {
          // Drop shadow
          pdf.setFillColor(175, 175, 175)
          pdf.roundedRect(x + 2, y + 2, w, h, 3, 3, 'F')

          // White polaroid-style frame (extra thick bottom for caption)
          pdf.setFillColor(255, 255, 255)
          pdf.setDrawColor(...lighten(accentRgb, 0.6))
          pdf.setLineWidth(0.3)
          pdf.roundedRect(x, y, w, h, 3, 3, 'FD')

          // Photo area — 3 mm sides/top, 18 mm base (polaroid look)
          const padSide = 3
          const padTop  = 3
          const capH    = 18
          const imgX = x + padSide
          const imgY = y + padTop
          const imgW = w - padSide * 2
          const imgH = h - padTop - capH

          if (b64) {
            try {
              pdf.addImage(b64, fmt, imgX, imgY, imgW, imgH, undefined, 'FAST')
            } catch {
              pdf.setFillColor(...accentLight)
              pdf.rect(imgX, imgY, imgW, imgH, 'F')
              pdf.setFontSize(22)
              pdf.setTextColor(...accentRgb)
              pdf.text('♥', imgX + imgW / 2, imgY + imgH / 2 + 5, { align: 'center' })
            }
          } else {
            pdf.setFillColor(...accentLight)
            pdf.rect(imgX, imgY, imgW, imgH, 'F')
          }

          // Thin accent line separating photo from caption strip
          pdf.setDrawColor(...accentRgb)
          pdf.setLineWidth(0.5)
          pdf.line(imgX + 2, imgY + imgH + 3, imgX + imgW - 2, imgY + imgH + 3)

          // Caption – italic grey
          pdf.setFontSize(6.5)
          pdf.setFont('helvetica', 'italic')
          pdf.setTextColor(90, 90, 90)
          if (caption) {
            const t = caption.length > 50 ? caption.slice(0, 47) + '...' : caption
            pdf.text(t, x + w / 2, imgY + imgH + 8, { align: 'center' })
          }

          // Date – accent colour
          pdf.setFontSize(5.5)
          pdf.setFont('helvetica', 'normal')
          pdf.setTextColor(...accentRgb)
          pdf.text(date, x + w / 2, imgY + imgH + 13.5, { align: 'center' })

          // Corner holders
          drawCorners(x + 1, y + 1, w - 2, h - 2, 5)
        })

        // Washi tape (drawn AFTER rotation so it sits "on top" unrotated)
        drawTape(x, y)
      }

      // ── 3. Cover page ────────────────────────────────────────────────────
      // Dark romantic background
      pdf.setFillColor(...accentDark)
      pdf.rect(0, 0, PAGE_W, PAGE_H, 'F')

      // Decorative circles for depth
      pdf.setFillColor(...accentMid)
      pdf.circle(PAGE_W - 28, 28, 52, 'F')
      pdf.circle(28, PAGE_H, 38, 'F')
      pdf.setFillColor(...darken(accentRgb, 0.35))
      pdf.circle(PAGE_W - 48, 8, 28, 'F')

      // Right accent strip
      pdf.setFillColor(...accentRgb)
      pdf.rect(PAGE_W - 22, 0, 22, PAGE_H, 'F')

      // Year text rotated on accent strip
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(7)
      pdf.setFont('helvetica', 'normal')
      pdf.text(
        format(new Date(), 'yyyy', { locale: es }),
        PAGE_W - 11, PAGE_H / 2,
        { align: 'center', angle: 90 },
      )

      // Title
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(36)
      pdf.setTextColor(255, 255, 255)
      pdf.text(title, MARGIN, PAGE_H / 2 - 10, { maxWidth: PAGE_W - 22 - MARGIN * 2 })

      // Subtitle
      if (subtitle) {
        pdf.setFontSize(13)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(...lighten(accentRgb, 0.55))
        pdf.text(subtitle, MARGIN, PAGE_H / 2 + 7)
      }

      // Horizontal rule
      const ruleOffset = subtitle ? 15 : 5
      pdf.setDrawColor(...lighten(accentRgb, 0.4))
      pdf.setLineWidth(0.4)
      pdf.line(MARGIN, PAGE_H / 2 + ruleOffset, PAGE_W - 38, PAGE_H / 2 + ruleOffset)

      // Photo count + date
      pdf.setFontSize(8.5)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(...lighten(accentRgb, 0.5))
      pdf.text(
        `${photos.length} foto${photos.length !== 1 ? 's' : ''}  ·  ${format(new Date(), "d 'de' MMMM yyyy", { locale: es })}`,
        MARGIN,
        PAGE_H / 2 + ruleOffset + 8,
      )

      // ── 4. Photo pages (collage layout) ─────────────────────────────────
      // Tilt angles cycle through this list per card (screen-clockwise degrees)
      const TILTS = [-2.2, 1.8, -1.5, 2.5]

      const photosPerRow = photosPerPage
      const sideBar      = 8     // left accent bar width mm
      const footerH      = 10    // bottom footer strip mm
      // Extra padding so rotated cards don't poke outside the page
      const collPad      = 12
      const usableX      = sideBar + collPad
      const usableW      = PAGE_W - usableX - collPad
      const usableH      = PAGE_H - collPad - footerH - collPad / 2
      const totalPages   = Math.ceil(photos.length / photosPerRow)

      for (let i = 0; i < photos.length; i += photosPerRow) {
        pdf.addPage()
        const pageNum  = Math.floor(i / photosPerRow) + 1

        // ---- Background: light tint with subtle dot grid ----
        pdf.setFillColor(...accentLight)
        pdf.rect(0, 0, PAGE_W, PAGE_H, 'F')

        // Subtle dot pattern (every 8 mm)
        pdf.setFillColor(...lighten(accentRgb, 0.74))
        for (let gx = 16; gx < PAGE_W - 8; gx += 8) {
          for (let gy = 8; gy < PAGE_H - footerH; gy += 8) {
            pdf.circle(gx, gy, 0.35, 'F')
          }
        }

        // ---- Left accent sidebar ----
        pdf.setFillColor(...accentRgb)
        pdf.rect(0, 0, sideBar, PAGE_H, 'F')
        pdf.setFontSize(7.5)
        pdf.setTextColor(255, 255, 255)
        pdf.text('♥', sideBar / 2, PAGE_H / 2, { align: 'center' })

        // ---- Footer strip ----
        const footerY = PAGE_H - footerH
        pdf.setFillColor(255, 255, 255)
        pdf.rect(sideBar, footerY, PAGE_W - sideBar, footerH, 'F')

        pdf.setFontSize(6.5)
        pdf.setFont('helvetica', 'italic')
        pdf.setTextColor(160, 160, 160)
        pdf.text(title, sideBar + 8, footerY + 6.5)

        // Page-indicator dots (right of footer)
        const dotR      = 1.0
        const dotSpacing = 4.5
        const dotsW     = totalPages * (dotR * 2 + dotSpacing) - dotSpacing
        const dotStartX = PAGE_W - MARGIN - dotsW
        const dotCY     = footerY + footerH / 2
        for (let p = 0; p < totalPages; p++) {
          pdf.setFillColor(...(p === pageNum - 1
            ? accentRgb
            : ([210, 210, 210] as [number, number, number])))
          pdf.circle(dotStartX + p * (dotR * 2 + dotSpacing), dotCY, dotR, 'F')
        }

        // ---- Collage photo cells ----
        if (photosPerRow === 1) {
          // Single photo: centered, slight tilt
          const cw = usableW * 0.72
          const ch = usableH
          const cx = usableX + (usableW - cw) / 2
          const cy = collPad

          const idx   = i
          const photo = photos[idx]
          const b64   = base64Images[idx]
          const fmt   = b64 ? detectFormat(b64) : 'JPEG'
          const tilt  = TILTS[idx % TILTS.length]
          drawPhotoCell(b64, fmt, photo.caption, formatPhotoDate(photo.taken_at ?? photo.created_at), cx, cy, cw, ch, tilt)

        } else {
          // Two photos: asymmetric vertical stagger + opposite tilts
          const gap    = 10
          const cw     = (usableW - gap) / 2
          const chLeft = usableH             // taller left card
          const chRight = usableH - 12       // slightly shorter right card
          const yLeft  = collPad             // left card starts higher
          const yRight = collPad + 10        // right card pushed down

          for (let col = 0; col < 2; col++) {
            const idx = i + col
            if (idx >= photos.length) break

            const photo = photos[idx]
            const b64   = base64Images[idx]
            const fmt   = b64 ? detectFormat(b64) : 'JPEG'
            const x     = usableX + col * (cw + gap)
            const y     = col === 0 ? yLeft : yRight
            const ch    = col === 0 ? chLeft : chRight
            // Global tilt index based on photo index for variety across pages
            const tilt  = TILTS[idx % TILTS.length]
            drawPhotoCell(b64, fmt, photo.caption, formatPhotoDate(photo.taken_at ?? photo.created_at), x, y, cw, ch, tilt)
          }
        }
      }

      // ── 5. Closing page ──────────────────────────────────────────────────
      pdf.addPage()
      pdf.setFillColor(...accentDark)
      pdf.rect(0, 0, PAGE_W, PAGE_H, 'F')

      // Decorative circles (mirror of cover)
      pdf.setFillColor(...accentMid)
      pdf.circle(28, 28, 44, 'F')
      pdf.circle(PAGE_W - 28, PAGE_H, 34, 'F')

      // Left accent strip
      pdf.setFillColor(...accentRgb)
      pdf.rect(0, 0, 22, PAGE_H, 'F')

      // Big heart
      pdf.setFontSize(62)
      pdf.setTextColor(...lighten(accentRgb, 0.22))
      pdf.text('♥', PAGE_W / 2 + 11, PAGE_H / 2 + 14, { align: 'center' })

      // "Fin" text
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(22)
      pdf.setTextColor(255, 255, 255)
      pdf.text('Fin del álbum', PAGE_W / 2 + 11, PAGE_H / 2 - 8, { align: 'center' })

      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(...lighten(accentRgb, 0.5))
      pdf.text(
        `${photos.length} momento${photos.length !== 1 ? 's' : ''} especial${photos.length !== 1 ? 'es' : ''} preservado${photos.length !== 1 ? 's' : ''}`,
        PAGE_W / 2 + 11,
        PAGE_H / 2 + 5,
        { align: 'center' },
      )

      // ── 6. Save ──────────────────────────────────────────────────────────
      setProgress(100)
      const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.pdf`
      pdf.save(filename)
    } finally {
      setIsExporting(false)
      setProgress(0)
    }
  }, [isExporting])

  return { exportAlbum, isExporting, progress }
}
