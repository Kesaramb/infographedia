# AntV Learning Spike

This spike exists to answer one practical question:

How does AntV create infographics that feel more editorial, more structured, and less generic than our current fallback summaries?

## What We Built

Run:

```bash
node --import tsx scripts/antv-learning-spike.ts
```

It renders three real AntV SSR examples:

- `ranked-hubs`
- `missions-to-mars`
- `ai-video-share`

Each one is intentionally chosen to stress a different part of AntV's design system:

- list/grid ranking
- timeline sequencing
- binary comparison

## What AntV Taught Us

### 1. Templates matter more than chart type

AntV feels strongest when the template family does the storytelling work.

Good infographics in AntV are not:

- title
- generic chart
- footnote

They are:

- structure
- item grammar
- title treatment
- palette
- data binding

That means Infographedia should choose AntV templates from `scene family + panel role + tension`, not just from `chartType`.

### 2. AntV is strongest for editorial shape, not just plotting

The strongest results came from:

- `list-grid-badge-card`
- `sequence-timeline-rounded-rect-node`
- `compare-binary-horizontal-badge-card-vs`

Those templates feel more like designed infographics and less like chart screenshots.

### 3. Our current integration still underuses AntV

Today we mostly map:

- `bar -> chart-bar-plain-text`
- `list -> list-grid-badge-card`
- `timeline -> sequence-timeline-rounded-rect-node`

That is too shallow.

We still treat AntV like a nicer output target for a mostly chart-centric scene model.

### 4. Multi-panel richness is still not truly native

Our current AntV path still projects to the primary scene before building syntax.

That means we preserve:

- one dominant panel

but we lose:

- richer template-native layout opportunities
- true multi-panel editorial composition
- stronger structure-level storytelling

### 5. Native AntV SSR has a rasterization trap

The raw AntV SSR SVGs looked stronger than our summary fallback, but they rely heavily on `foreignObject` text blocks.

That matters because our current image artifact path uses SVG -> `sharp` -> WebP/PNG.

In the spike, the structural shapes survived, but a lot of the `foreignObject` text disappeared in the rasterized PNG output.

So native AntV SSR is not production-safe for feed artifacts until we switch to a browser-based snapshot or another text-safe raster path.

## System Improvements This Spike Suggests

### Immediate

- Resolve template family from `scene.family`, not just `viewType`
- Prefer richer AntV families for ranked comparisons, timelines, and compare scenes
- Stop defaulting to plain text chart shells when the story is editorial by nature

### Next

- Make `StoryDocumentV3.scene` more template-native
- Add explicit `structureIntent` and `itemGrammar`
- Let AntV own more of the final scene semantics instead of flattening them too early

### Later

- Promote native AntV SSR back into the stable path once reliability is proven
- Do not rasterize native AntV SSR SVG with `sharp` while `foreignObject` text is still in the output
- Explore true multi-panel AntV compositions rather than summary SVG fallback

## Core Takeaway

AntV is not just a rendering library for us.

It is a design grammar.

If Infographedia wants more "epic" infographics, the pipeline has to plan in terms of:

- structure
- data-item design
- narrative tension
- template family

not just:

- chart type
- labels
- colors
