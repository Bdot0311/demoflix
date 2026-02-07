
# Plan: Switch AI Model to OpenAI GPT-5.2

## Overview

Update the AI storyboard generation to use OpenAI's latest GPT-5.2 model instead of Google Gemini 3 Flash. This model offers enhanced reasoning capabilities which should improve the quality of headlines, scene structures, and dramatic pacing.

## Changes Required

### File: `supabase/functions/generate-storyboard/index.ts`

**Current:**
```typescript
model: "google/gemini-3-flash-preview",
```

**Updated:**
```typescript
model: "openai/gpt-5.2",
```

This is a single-line change in the edge function where the AI gateway is called.

---

## Technical Notes

- The Lovable AI Gateway uses an OpenAI-compatible API format, so no other code changes are needed
- GPT-5.2 supports the same message format (system + user with image URLs)
- The same vision/multimodal capabilities are available for analyzing screenshots
- Response format (JSON array of scenes) remains unchanged

---

## Expected Benefits

- Enhanced reasoning for more cohesive narrative arcs
- Potentially more creative and punchy headlines
- Better understanding of product context from screenshots
