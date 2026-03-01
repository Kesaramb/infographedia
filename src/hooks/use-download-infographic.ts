'use client'

import { useState, useCallback } from 'react'
import { toPng } from 'html-to-image'
import { useToast } from '@/components/ui/toast'

const FOOTER_HEIGHT = 40
const FOOTER_BG = '#0a0a0a'
const FOOTER_TEXT_COLOR = 'rgba(255, 255, 255, 0.5)'
const FOOTER_FONT = '600 11px system-ui, -apple-system, sans-serif'
const BRAND_DOT_RADIUS = 4
const BRAND_DOT_COLOR = 'rgba(255, 255, 255, 0.6)'

/** Shared toPng options */
const CAPTURE_OPTIONS = {
  pixelRatio: 2,
  cacheBust: true,
  skipFonts: false,
}

export function useDownloadInfographic(
  ref: React.RefObject<HTMLDivElement | null>,
  postId: number | string,
  title: string,
) {
  const [isDownloading, setIsDownloading] = useState(false)
  const { toast } = useToast()

  const download = useCallback(async () => {
    const node = ref.current
    if (!node || isDownloading) return

    setIsDownloading(true)

    try {
      // Move the offscreen renderer into the viewport so Recharts
      // ResponsiveContainer can measure dimensions properly.
      const savedCss = node.style.cssText
      const savedClass = node.className
      node.className = ''
      node.style.cssText =
        'position:fixed;left:0;top:0;width:600px;z-index:-9999;pointer-events:none;'

      // Wait for ResizeObserver + Recharts re-render
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 200))),
      )

      // html-to-image known issue: first call may produce a blank image
      // because external resources (fonts, images) haven't been cached yet.
      // Calling twice ensures all resources are resolved.
      await toPng(node, CAPTURE_OPTIONS)
      const dataUrl = await toPng(node, CAPTURE_OPTIONS)

      // Restore original offscreen positioning
      node.className = savedClass
      node.style.cssText = savedCss

      // Load captured image onto a canvas to add branded footer
      const img = new Image()
      img.crossOrigin = 'anonymous'

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Failed to load captured image'))
        img.src = dataUrl
      })

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas context unavailable')

      const footerPx = FOOTER_HEIGHT * 2 // 2x for retina
      canvas.width = img.width
      canvas.height = img.height + footerPx

      // Draw the captured infographic
      ctx.drawImage(img, 0, 0)

      // Draw branded footer strip
      ctx.fillStyle = FOOTER_BG
      ctx.fillRect(0, img.height, canvas.width, footerPx)

      // Brand dot (matches WatermarkBadge circle)
      const dotY = img.height + footerPx / 2
      const dotX = 24
      ctx.beginPath()
      ctx.arc(dotX, dotY, BRAND_DOT_RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = BRAND_DOT_COLOR
      ctx.fill()

      // Brand text + post URL
      ctx.fillStyle = FOOTER_TEXT_COLOR
      ctx.font = FOOTER_FONT
      ctx.textBaseline = 'middle'
      ctx.fillText(
        `INFOGRAPHEDIA  ·  infographedia.com/post/${postId}`,
        dotX + 12,
        dotY,
      )

      // Trigger download
      const finalDataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      const safeTitle = title
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase()
        .slice(0, 50)
      link.download = `infographedia-${safeTitle}.png`
      link.href = finalDataUrl
      link.click()

      toast('Infographic downloaded', 'success')
    } catch (err) {
      console.error('[download-infographic]', err)
      toast('Download failed. Try again.', 'error')
      // Restore offscreen positioning on error
      const n = ref.current
      if (n) {
        n.className = 'absolute -left-[9999px] top-0'
        n.style.cssText = 'width: 600px;'
      }
    } finally {
      setIsDownloading(false)
    }
  }, [ref, postId, title, toast, isDownloading])

  return { download, isDownloading }
}
