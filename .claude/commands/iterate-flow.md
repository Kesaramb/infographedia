---
description: Debug or build the iteration flow end-to-end. Use when working on the iterate modal, AI mutation pipeline, or parent-child post logic.
---

# Iterate Flow — End-to-End Checklist

Walk through the full iteration pipeline and verify or build each step.

## The Flow

1. **Frontend: Iterate Button** (`src/components/feed/post-card.tsx`)
   - User clicks "Iterate" on a post
   - Opens the Iterate modal with the parent post's data loaded

2. **Frontend: Iterate Modal** (`src/components/modals/iterate-modal.tsx`)
   - Displays parent infographic preview (blurred, with "AI Context Loaded" indicator)
   - Text input for the iteration prompt
   - Optional CSV data upload
   - "Generate" button triggers the AI pipeline

3. **API Route** (`src/app/api/generate/route.ts`)
   - Receives: `{ parentPostId: string, prompt: string }`
   - Fetches parent post DNA from Payload
   - Calls the AI generation pipeline with parent DNA + prompt
   - Returns the new DNA to the client

4. **AI Pipeline** (`src/lib/ai/generate.ts`)
   - Builds system prompt with DNA schema
   - Includes parent DNA as context
   - AI decides: search needed? (data change vs style change)
   - If search: calls web_search tool, gets real data
   - Generates mutated DNA JSON
   - Validates with Zod

5. **Frontend: Live Preview** (`src/components/dna-renderer/index.tsx`)
   - Renders the new DNA in real-time in the modal preview area

6. **Publish** (`src/app/api/posts/route.ts`)
   - Creates new Post in Payload with `parentPost` set to original ID
   - beforeChange hook validates DNA and generates renderedImage
   - afterChange hook increments parent's `iterationCount`

## Verify each step works. Build what's missing.
