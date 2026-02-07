
# Plan: Connect Anthropic Claude API for Storyboard Generation

## Overview

Replace the Lovable AI gateway (Gemini) with direct Anthropic Claude API integration for the `generate-storyboard` edge function. This matches the industry-standard "Claude + Remotion" approach used by other demo video tools.

---

## Why Claude for Demo Generation?

| Feature | Current (Gemini) | Claude |
|---------|------------------|--------|
| Vision analysis | Good | Excellent - better at describing UI elements |
| Copywriting | Generic | More creative, punchy headlines |
| JSON reliability | Sometimes broken | Consistent structured output |
| Context understanding | Basic | Better narrative construction |

---

## Implementation Steps

### Step 1: Add Anthropic API Key Secret

I'll request your Anthropic API key using the secure secrets tool. The key will be stored as `ANTHROPIC_API_KEY` and accessible only in edge functions.

**Where to get your key:**
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Navigate to API Keys
3. Create a new key or copy an existing one

---

### Step 2: Update generate-storyboard Edge Function

**Changes to `supabase/functions/generate-storyboard/index.ts`:**

1. **Replace API endpoint**: Switch from Lovable AI gateway to Anthropic's Messages API
2. **Update authentication**: Use `ANTHROPIC_API_KEY` instead of `LOVABLE_API_KEY`
3. **Adapt message format**: Convert from OpenAI-style to Claude's message format
4. **Handle vision differently**: Claude uses base64 images in a specific format

**New API call structure:**
```text
Endpoint: https://api.anthropic.com/v1/messages
Headers:
  - x-api-key: ANTHROPIC_API_KEY
  - anthropic-version: 2023-06-01
  - content-type: application/json

Body format:
  - model: claude-sonnet-4-20250514 (best balance of speed + quality)
  - max_tokens: 1024
  - system: [system prompt]
  - messages: [{ role: "user", content: [...] }]
```

---

### Step 3: Vision Message Format for Claude

Claude requires a different format for images:

```text
Current (OpenAI/Gemini style):
{
  "type": "image_url",
  "image_url": { "url": "https://..." }
}

Claude style:
{
  "type": "image",
  "source": {
    "type": "url",
    "url": "https://..."
  }
}
```

---

### Step 4: Optimize Prompts for Claude

Claude responds better to structured prompts. I'll update the system prompt to be more Claude-friendly:

```text
You are a Netflix trailer director creating punchy product demo videos.

<narrative_structure>
1. PAIN-POINT: Hook with frustration (2-4 words)
2. SOLUTION: "Meet [Product]" pivot
3. WORKFLOW: Feature demonstrations
4. RESULT: Transformation proof
5. CTA: Compelling call to action
</narrative_structure>

<rules>
- Headlines: 2-5 words MAX
- Power verbs: Launch, Build, Create, Transform
- Match brand tone from provided website content
</rules>

<output_format>
Return ONLY a valid JSON array with no explanation.
</output_format>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-storyboard/index.ts` | Replace Lovable AI with Anthropic Claude API |

---

## Technical Details

### Model Selection

**Recommended: `claude-sonnet-4-20250514`**
- Best balance of quality, speed, and cost
- Excellent at creative copywriting
- Strong vision capabilities for UI analysis

Alternative: `claude-3-5-sonnet-20241022` if you want the previous stable version

### Error Handling

Will add proper handling for:
- Invalid API key (401)
- Rate limiting (429)
- Overloaded (529)
- Input too large (400)

---

## Expected Outcome

After implementation:
- Claude analyzes uploaded screenshots for better context
- More creative, punchy headlines that match brand voice
- Reliable JSON output without parsing failures
- Better narrative flow in generated storyboards

