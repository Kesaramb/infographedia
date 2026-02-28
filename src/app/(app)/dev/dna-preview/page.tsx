'use client'

import { useState } from 'react'
import { DNARenderer } from '@/components/dna-renderer'
import { SEED_DNA } from '@/lib/dna/seed-data'
import { Sparkles, ChevronDown } from 'lucide-react'

export default function DNAPreviewPage() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selected = SEED_DNA[selectedIndex]

  return (
    <div className="py-6 px-4 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white/60" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">DNA Preview</h1>
          <p className="text-xs text-neutral-500">
            Dev tool — renders seed DNA through the DNARenderer engine
          </p>
        </div>
      </div>

      {/* Selector */}
      <div className="relative">
        <select
          value={selectedIndex}
          onChange={(e) => setSelectedIndex(Number(e.target.value))}
          className="w-full appearance-none bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 cursor-pointer"
        >
          {SEED_DNA.map((item, i) => (
            <option key={i} value={i} className="bg-neutral-900">
              {i + 1}. {item.title} — {item.dna.presentation.chartType} ({item.dna.presentation.theme})
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
      </div>

      {/* DNA Info */}
      <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex flex-wrap gap-3 text-xs">
        <span className="px-2 py-1 rounded-md bg-white/10 text-white font-medium">
          {selected.dna.presentation.chartType}
        </span>
        <span className="px-2 py-1 rounded-md bg-white/10 text-neutral-300">
          {selected.dna.presentation.theme}
        </span>
        <span className="px-2 py-1 rounded-md bg-white/10 text-neutral-300">
          {selected.dna.content.data.length} data points
        </span>
        <span className="px-2 py-1 rounded-md bg-white/10 text-neutral-300">
          {selected.dna.content.sources.length} source(s)
        </span>
      </div>

      {/* Rendered Infographic */}
      <div className="border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <DNARenderer dna={selected.dna} />
      </div>

      {/* Raw JSON (collapsible) */}
      <details className="group">
        <summary className="text-xs text-neutral-500 cursor-pointer hover:text-neutral-300 transition-colors">
          Show raw DNA JSON
        </summary>
        <pre className="mt-2 bg-black/30 border border-white/10 rounded-xl p-4 text-[10px] text-neutral-400 overflow-x-auto max-h-96 overflow-y-auto">
          {JSON.stringify(selected.dna, null, 2)}
        </pre>
      </details>

      {/* All infographics gallery */}
      <div className="mt-6 border-t border-white/5 pt-6">
        <h2 className="text-sm font-semibold text-neutral-400 mb-4">
          All {SEED_DNA.length} Seed Infographics
        </h2>
        <div className="flex flex-col gap-6">
          {SEED_DNA.map((item, i) => (
            <div key={i}>
              <p className="text-xs text-neutral-500 mb-2">
                {i + 1}. {item.title}{' '}
                <span className="text-neutral-600">
                  ({item.dna.presentation.chartType}, {item.dna.presentation.theme})
                </span>
              </p>
              <div className="border border-white/10 rounded-2xl overflow-hidden">
                <DNARenderer dna={item.dna} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
