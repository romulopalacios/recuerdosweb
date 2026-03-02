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
import jsPDF from 'jspdf'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Photo } from '@/types'

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

const PAGE_W    = 297   // A4 landscape width mm
const PAGE_H    = 210   // A4 landscape height mm
const MARGIN    = 12
const HEADER_H  = 16    // top colour band

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
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      // ── Helper: draw a page header band ─────────────────────────────────
      function drawHeader(label: string) {
        pdf.setFillColor(accentColor)
        pdf.rect(0, 0, PAGE_W, HEADER_H, 'F')
        pdf.setTextColor('#ffffff')
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'bold')
        pdf.text(label, MARGIN, HEADER_H - 4)
        pdf.setTextColor('#1f2937')
      }

      // ── Helper: draw a photo cell (image + border + caption + date) ─────
      function drawPhotoCell(
        b64: string,
        format: 'JPEG' | 'PNG' | 'WEBP',
        caption: string | undefined,
        date: string,
        x: number, y: number, w: number, h: number,
      ) {
        // Rounded white card background
        pdf.setFillColor('#ffffff')
        pdf.setDrawColor(accentColor)
        pdf.setLineWidth(0.4)
        pdf.roundedRect(x - 2, y - 2, w + 4, h + 18, 3, 3, 'FD')

        // Photo
        if (b64) {
          try {
            pdf.addImage(b64, format, x, y, w, h, undefined, 'FAST')
          } catch {
            // Image failed to render — draw placeholder
            pdf.setFillColor('#fce7f3')
            pdf.rect(x, y, w, h, 'F')
            pdf.setFontSize(20)
            pdf.text('💕', x + w / 2, y + h / 2 + 5, { align: 'center' })
          }
        } else {
          pdf.setFillColor('#fce7f3')
          pdf.rect(x, y, w, h, 'F')
        }

        // Caption
        const captionY = y + h + 5
        pdf.setFontSize(7.5)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor('#6b7280')
        if (caption) {
          const truncated = caption.length > 55 ? caption.slice(0, 52) + '…' : caption
          pdf.text(truncated, x + w / 2, captionY, { align: 'center' })
        }
        // Date
        pdf.setFontSize(6.5)
        pdf.setTextColor(accentColor)
        pdf.text(date, x + w / 2, captionY + 5, { align: 'center' })
      }

      // ── 3. Cover page ───────────────────────────────────────────────────
      pdf.setFillColor('#fff1f2')                              // rose-50
      pdf.rect(0, 0, PAGE_W, PAGE_H, 'F')

      // Big heart watermark
      pdf.setFontSize(120)
      pdf.setTextColor('#fecdd3')                              // rose-200
      pdf.text('♥', PAGE_W / 2, PAGE_H / 2 + 30, { align: 'center' })

      pdf.setTextColor('#1f2937')
      pdf.setFontSize(36)
      pdf.setFont('helvetica', 'bold')
      pdf.text(title, PAGE_W / 2, PAGE_H / 2 - 10, { align: 'center' })

      if (subtitle) {
        pdf.setFontSize(14)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor('#6b7280')
        pdf.text(subtitle, PAGE_W / 2, PAGE_H / 2 + 14, { align: 'center' })
      }

      pdf.setFontSize(9)
      pdf.setTextColor('#9ca3af')
      pdf.text(
        `${photos.length} foto${photos.length !== 1 ? 's' : ''} · ${format(new Date(), "d MMMM yyyy", { locale: es })}`,
        PAGE_W / 2,
        PAGE_H - MARGIN,
        { align: 'center' },
      )

      // ── 4. Photo pages ───────────────────────────────────────────────────
      const photosPerRow = photosPerPage
      const usableW      = PAGE_W - MARGIN * 2
      const usableH      = PAGE_H - HEADER_H - MARGIN * 2 - 20  // room for caption
      const cellW        = photosPerRow === 2 ? (usableW - MARGIN) / 2 : usableW
      const cellH        = usableH
      const topY         = HEADER_H + MARGIN

      for (let i = 0; i < photos.length; i += photosPerRow) {
        pdf.addPage()

        const pageLabel = `${title} · ${i + 1}–${Math.min(i + photosPerRow, photos.length)} de ${photos.length}`
        drawHeader(pageLabel)

        for (let col = 0; col < photosPerRow; col++) {
          const idx = i + col
          if (idx >= photos.length) break

          const photo = photos[idx]
          const b64   = base64Images[idx]
          const fmt   = b64 ? detectFormat(b64) : 'JPEG'
          const x     = MARGIN + col * (cellW + MARGIN)

          drawPhotoCell(
            b64, fmt,
            photo.caption,
            formatPhotoDate(photo.taken_at ?? photo.created_at),
            x, topY, cellW, cellH,
          )
        }
      }

      // ── 5. Save ──────────────────────────────────────────────────────────
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
