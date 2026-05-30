---
name: antv-infographic-engine
description: AntV-first infographic planning and documentV2 authoring for Infographedia. Use when generating or validating AntV posts, selecting template categories, deriving compatibility DNA, or building AntV syntax.
---

# AntV-First Infographic Engine

Use this skill when a task touches the AntV v2 pipeline.

## Rules

1. `documentV2` is canonical for AntV posts.
2. `dna` is derived compatibility output, never the authoring source.
3. Keep `content` and `presentation` separate.
4. Grounding rules do not relax for AntV. Sources remain mandatory.
5. Template choice is a planning decision, not a cosmetic afterthought.

## Planning flow

1. Normalize grounded findings into `content.dataGroups`.
2. Choose a single dominant AntV template category:
   - `chart`
   - `list`
   - `sequence`
   - `compare`
   - `hierarchy`
   - `relation`
3. Pick a concrete template family that fits the structure.
4. Generate canonical AntV syntax from the normalized document.
5. Derive compatibility DNA and validate both paths before publish.

## Infographedia constraints

- Prefer concise narratives over overloaded layouts.
- Do not add uncited decorative media.
- Claims in title/subtitle/hook must match the normalized content graph.
- If compatibility DNA cannot be derived cleanly, publish must fail rather than silently falling back.
