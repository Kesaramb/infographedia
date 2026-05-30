'use client'

import { useEffect, useRef, useState } from 'react'
import type { InfographicDocumentV2 } from '@/lib/antv/schema'
import { ensureAntVDocumentPanels } from '@/lib/antv/panels'
import { AntVPanelScene } from './antv-panel-scene'

interface AntVInfographicRendererProps {
  document: InfographicDocumentV2
  className?: string
}

export function AntVInfographicRenderer({
  document,
  className,
}: AntVInfographicRendererProps) {
  const normalizedPanelsDocument = ensureAntVDocumentPanels({
    content: document.content,
    presentation: document.presentation,
  })
  const hasMultiPanelScene = normalizedPanelsDocument.presentation.panels.length > 1
  const shellRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (hasMultiPanelScene) {
      setError(null)
      return
    }

    let mounted = true
    let instance: {
      destroy?: () => void
      render?: (syntax: string) => Promise<void> | void
    } | null = null

    async function render() {
      if (!containerRef.current) return

      try {
        const { Infographic } = await import('@antv/infographic')
        if (!mounted || !containerRef.current) return

        containerRef.current.innerHTML = ''
        instance = new Infographic({
          container: containerRef.current,
          width: '100%',
          height: '100%',
          editable: false,
          padding: 24,
        })
        setError(null)
        await instance.render?.(document.antv.syntax)
      } catch (renderError) {
        if (!mounted) return
        setError(renderError instanceof Error ? renderError.message : 'Failed to render AntV infographic.')
      }
    }

    render()

    return () => {
      mounted = false
      instance?.destroy?.()
    }
  }, [document, hasMultiPanelScene])

  if (hasMultiPanelScene) {
    return <AntVPanelScene document={document} className={className} />
  }

  const aspectRatio = document.antv.renderMeta.aspectRatio
    ?? document.antv.renderMeta.width / document.antv.renderMeta.height

  return (
    <div
      ref={shellRef}
      className={className}
      style={{ aspectRatio }}
    >
      <div className="relative w-full h-full overflow-hidden rounded-[inherit] bg-black/10">
        <div ref={containerRef} className="absolute inset-0" />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-950/80 p-4 text-center text-xs text-red-200">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
