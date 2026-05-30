---
name: dna-engine
description: DNA schema patterns and rendering engine. Use when creating infographic components, defining DNA schemas, building the renderer, validating JSON structures, or working with Zod schemas for infographic data.
---

# DNA Engine — Schema & Rendering Patterns

## The Two-Layer DNA Schema

Every infographic DNA has exactly two top-level keys. Never mix them.

```typescript
import { z } from 'zod';

// --- CONTENT LAYER (What the data says) ---
const SourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  accessedAt: z.string().date(),
});

const DataPointSchema = z.object({
  label: z.string(),
  value: z.number(),
  unit: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

const ContentSchema = z.object({
  title: z.string().min(1).max(120),
  subtitle: z.string().max(200).optional(),
  data: z.array(DataPointSchema).min(1),
  sources: z.array(SourceSchema).min(1),
  footnotes: z.string().max(500).optional(),
});

// --- PRESENTATION LAYER (How it looks) ---
const ChartType = z.enum([
  'bar-chart',
  'pie-chart',
  'line-chart',
  'area-chart',
  'timeline',
  'stat-card',
  'grouped-bar-chart',
  'donut-chart',
]);

const ThemeName = z.enum([
  'glass-dark',
  'glass-light',
  'neon-cyberpunk',
  'minimalist',
  'editorial',
  'warm-earth',
  'ocean-depth',
]);

const ColorsSchema = z.object({
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  text: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

const ComponentSlot = z.object({
  type: z.enum(['title', 'subtitle', 'footnote', 'source-badge', ...ChartType.options]),
  dataKey: z.string().optional(),
  labelKey: z.string().optional(),
});

const PresentationSchema = z.object({
  theme: ThemeName,
  chartType: ChartType,
  layout: z.enum(['centered', 'left-aligned', 'split', 'stacked']),
  colors: ColorsSchema,
  components: z.array(ComponentSlot).min(1),
});

// --- FULL DNA ---
export const DNASchema = z.object({
  content: ContentSchema,
  presentation: PresentationSchema,
});

export type InfographicDNA = z.infer<typeof DNASchema>;
```

## The Component Mapping System (DNARenderer)

The renderer maps `presentation.components[]` entries to React components:

```typescript
// Component registry — maps DNA type strings to React components
const COMPONENT_MAP: Record<string, React.ComponentType<DNAComponentProps>> = {
  'title':             TitleBlock,
  'subtitle':          SubtitleBlock,
  'bar-chart':         BarChartBlock,
  'pie-chart':         PieChartBlock,
  'line-chart':        LineChartBlock,
  'area-chart':        AreaChartBlock,
  'timeline':          TimelineBlock,
  'stat-card':         StatCardBlock,
  'grouped-bar-chart': GroupedBarChartBlock,
  'donut-chart':       DonutChartBlock,
  'footnote':          FootnoteBlock,
  'source-badge':      SourceBadge,
};
```

### Theming via CSS Custom Properties

DNA colors are injected as CSS variables on the infographic container. Chart components reference these variables — never hardcode colors.

```tsx
function DNARenderer({ dna }: { dna: InfographicDNA }) {
  const cssVars = {
    '--dna-primary': dna.presentation.colors.primary,
    '--dna-secondary': dna.presentation.colors.secondary ?? dna.presentation.colors.primary,
    '--dna-bg': dna.presentation.colors.background,
    '--dna-text': dna.presentation.colors.text,
    '--dna-accent': dna.presentation.colors.accent ?? dna.presentation.colors.primary,
  } as React.CSSProperties;

  return (
    <div className="dna-infographic" style={cssVars}>
      {dna.presentation.components.map((slot, i) => {
        const Component = COMPONENT_MAP[slot.type];
        if (!Component) return null;
        return <Component key={i} slot={slot} dna={dna} />;
      })}
    </div>
  );
}
```

## Rules

1. **Always validate DNA with Zod before saving or rendering**. Use `DNASchema.safeParse()`.
2. **Never hardcode colors in chart components**. Always read from CSS custom properties.
3. **Every chart component must accept the standard `DNAComponentProps` interface**.
4. **The renderer must gracefully skip unknown component types** (return null, not throw).
5. **Content and presentation are separate concerns**. A chart component reads `dna.content.data` for values and `dna.presentation.colors` for styling. Never the reverse.
