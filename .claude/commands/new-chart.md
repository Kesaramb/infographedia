---
description: Scaffold a new chart component for the DNA renderer. Provide the chart type name (e.g., "radar-chart", "scatter-plot").
arguments:
  - name: chart_type
    description: The kebab-case name of the chart type (e.g., "radar-chart")
    required: true
---

# New Chart Component

Create a new chart component for the DNA rendering engine.

## Steps

1. **Create the component file** at `src/components/charts/{{ chart_type }}.tsx`
2. The component MUST:
   - Accept `DNAComponentProps` as props
   - Read data from `dna.content.data` (label/value pairs)
   - Read colors from CSS custom properties (`var(--dna-primary)`, `var(--dna-bg)`, etc.)
   - Use Recharts for the chart rendering
   - Be fully responsive
   - Handle empty data gracefully (show placeholder, not crash)
3. **Register the component** in the `COMPONENT_MAP` in `src/components/dna-renderer/component-map.ts`
4. **Add the chart type** to the `ChartType` Zod enum in `src/lib/dna/schema.ts`
5. **Update the AI system prompt** in `src/lib/ai/prompts.ts` to include the new chart type in the schema documentation
6. **Write a unit test** at `src/components/charts/__tests__/{{ chart_type }}.test.tsx` that:
   - Renders with valid DNA data
   - Handles empty data array
   - Applies CSS custom properties correctly

Follow the existing chart components as reference. Use the `dna-engine` skill for schema patterns.
