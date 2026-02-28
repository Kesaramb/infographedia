'use client'

/**
 * Glass overlay watermark badge on every infographic.
 * Positioned at the bottom-right of the rendered infographic.
 */
export function WatermarkBadge() {
  return (
    <div className="absolute bottom-3 right-3 z-10 pointer-events-none">
      <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-1 flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-white/60" />
        <span className="text-[9px] font-semibold tracking-wider text-white/50 uppercase">
          Infographedia
        </span>
      </div>
    </div>
  )
}
