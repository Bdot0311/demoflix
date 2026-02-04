

# DemoFlix: Migrate to Remotion + Claude for Motion-Style Demos

## Overview

This plan replaces the current Shotstack-based video generation with **Remotion** (React-based programmatic video) + **Claude** (Lovable AI) to create true Framer-style motion graphics demos. This combination enables:

- **Real React components** rendered as video (same quality as web preview)
- **Claude-powered** motion design decisions (animations, timing, effects)
- **Full control** over every animation, transition, and effect
- **Serverless rendering** via Remotion Lambda (AWS)

---

## Current Architecture vs New Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     CURRENT (Shotstack)                             │
├─────────────────────────────────────────────────────────────────────┤
│  Editor Preview    →    Shotstack API    →    MP4 Output           │
│  (React/CSS)             (JSON Timeline)       (Different look)     │
│                                                                     │
│  Problem: Preview ≠ Final output. Limited animations.              │
└─────────────────────────────────────────────────────────────────────┘

                              ↓ MIGRATION ↓

┌─────────────────────────────────────────────────────────────────────┐
│                     NEW (Remotion + Claude)                         │
├─────────────────────────────────────────────────────────────────────┤
│  Remotion Composition  →  Remotion Lambda  →  MP4 Output           │
│  (React/Motion)             (AWS Render)       (WYSIWYG)            │
│                                                                     │
│  + Claude AI → Motion direction, animation params, timing          │
│  Benefit: Preview === Final output. Unlimited animations.          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Remotion Project Setup

**Create Remotion video composition package:**

1. **New directory**: `remotion/` at project root containing:
   - `src/Root.tsx` - Remotion root component
   - `src/compositions/DemoTrailer.tsx` - Main trailer composition
   - `src/components/Scene.tsx` - Individual scene component
   - `src/components/KineticText.tsx` - Port existing kinetic typography
   - `src/components/MotionOverlays.tsx` - Particles, vignette, glow
   - `src/styles/` - Shared styles
   - `remotion.config.ts` - Remotion configuration

2. **Key compositions to create:**
   - `DemoTrailer` - Main composition accepting scene data as props
   - Scene-level components with spring animations
   - Text reveal effects using `spring()` and `interpolate()`
   - Ken Burns zoom/pan using frame-based transforms

### Phase 2: Port Preview Effects to Remotion

**Migrate existing Framer-style effects:**

| Current (PreviewPlayer.tsx) | Remotion Equivalent |
|----------------------------|---------------------|
| `KineticText` CSS animation | `spring()` + `interpolate()` per-character |
| `FloatingParticles` CSS keyframes | Frame-based position + `random()` seeds |
| `VignetteEffect` static | Radial gradient with optional animation |
| `ScanLineEffect` overlay | Same approach, frame-synced |
| Ken Burns `scale`/`translate` | `interpolate(frame, ...)` transforms |
| Transitions (fade, slide, etc.) | `Sequence` + `interpolate` opacity/position |

**New motion capabilities:**

- **Spring physics**: Natural bouncy animations with configurable damping
- **Staggered reveals**: Word/character reveals with precise timing
- **3D transforms**: Depth effects and perspective rotations
- **Morphing shapes**: SVG path animations for callouts/highlights
- **Synchronized audio**: Frame-perfect music sync

### Phase 3: Claude-Powered Motion Direction

**Enhance the generate-storyboard edge function:**

Replace the current headline-only generation with full motion direction:

```text
Claude receives:
  - Uploaded images (visual context)
  - Selected style (Netflix, Apple, etc.)
  - Duration constraints

Claude returns:
  - Scene headlines/subtext (existing)
  - Animation style per scene ("bounce-in", "typewriter", "mask-reveal")
  - Spring config (damping, mass, stiffness)
  - Transition type and timing
  - Overlay effects to enable
  - Camera motion direction (Ken Burns params)
  - Music sync cues ("beat-sync", "fade-in")
```

**New `generate-motion-config` edge function:**

This function calls Claude (via Lovable AI) to generate detailed motion parameters for each scene, producing a JSON schema that Remotion consumes directly.

### Phase 4: Remotion Lambda Integration

**Backend rendering architecture:**

1. **New edge function**: `render-remotion/index.ts`
   - Receives: `projectId`, `renderId`, scene data
   - Calls: `renderMediaOnLambda()` via Remotion Lambda client
   - Outputs: Video to Supabase Storage

2. **AWS Setup required** (user must configure):
   - AWS credentials (access key + secret)
   - Remotion Lambda function deployed
   - S3 bucket for render outputs
   - Webhook endpoint for completion notifications

3. **New edge function**: `remotion-webhook/index.ts`
   - Receives completion callbacks from Remotion Lambda
   - Updates `renders` table with video URLs
   - Notifies frontend via realtime subscription

### Phase 5: Unified Preview & Render

**Make preview use Remotion Player:**

Replace `PreviewPlayer.tsx` with `@remotion/player` component:

```text
Benefits:
  - WYSIWYG: What you see = what you render
  - Scrubbing, frame-accurate preview
  - Same React components for preview + render
  - Hot-reload during editing
```

**Frontend changes:**

1. **Editor.tsx** → Import `Player` from `@remotion/player`
2. **PreviewPlayer.tsx** → Replaced by Remotion Player wrapper
3. **RenderPage.tsx** → Call `render-remotion` instead of `render-video`
4. **PreviewPage.tsx** → Show rendered videos (unchanged)

---

## Database Changes

No schema changes required. The existing `scenes` table structure supports the new workflow:
- `zoom_level`, `pan_x`, `pan_y` → Ken Burns config
- `transition` → Transition type
- `duration_ms` → Scene timing

**Optional enhancement**: Add columns for advanced motion config:
- `animation_style` (text) - e.g., "bounce-in", "typewriter"
- `spring_config` (jsonb) - damping, mass, stiffness
- `effects_enabled` (text[]) - particles, vignette, etc.

---

## Edge Functions

| Function | Purpose | Status |
|----------|---------|--------|
| `render-video` | Shotstack rendering | **Replace** |
| `check-render-status` | Poll Shotstack | **Replace** |
| `generate-storyboard` | AI headlines | **Enhance** with motion params |
| `render-remotion` | Remotion Lambda trigger | **New** |
| `generate-motion-config` | Claude motion direction | **New** |
| `remotion-webhook` | Render completion handler | **New** |

---

## Required Secrets

| Secret | Purpose | Provider |
|--------|---------|----------|
| `LOVABLE_API_KEY` | Claude via Lovable AI | Pre-configured |
| `AWS_ACCESS_KEY_ID` | Remotion Lambda auth | User provides |
| `AWS_SECRET_ACCESS_KEY` | Remotion Lambda auth | User provides |
| `REMOTION_AWS_REGION` | Lambda region | User provides |
| `REMOTION_FUNCTION_NAME` | Lambda function name | User provides |

---

## Dependencies to Add

```json
{
  "remotion": "^4.0.0",
  "@remotion/player": "^4.0.0",
  "@remotion/cli": "^4.0.0"
}
```

For edge functions (Deno):
```
@remotion/lambda-client@4.0.265
```

---

## Technical Details

### Remotion Composition Structure

```text
remotion/
├── src/
│   ├── Root.tsx                 # Registers all compositions
│   ├── compositions/
│   │   └── DemoTrailer.tsx      # Main trailer (accepts inputProps)
│   ├── components/
│   │   ├── Scene.tsx            # Single scene wrapper
│   │   ├── KineticText.tsx      # Character-by-character reveals
│   │   ├── MotionOverlays.tsx   # Particles, vignette, glow
│   │   └── Transitions.tsx      # Fade, slide, zoom transitions
│   └── lib/
│       └── animations.ts        # Spring configs, interpolation helpers
├── remotion.config.ts
└── package.json
```

### Motion Config Schema (from Claude)

```typescript
interface MotionConfig {
  animation_style: "bounce-in" | "typewriter" | "slide-mask" | "fade-scale";
  spring: {
    damping: number;    // 10-300
    mass: number;       // 0.1-10
    stiffness: number;  // 50-1000
  };
  stagger_delay_ms: number;  // 20-100 per character
  entrance_delay_ms: number; // Delay before text appears
  effects: ("particles" | "vignette" | "glow" | "scanlines")[];
  camera: {
    zoom_start: number;
    zoom_end: number;
    pan_x: number;
    pan_y: number;
  };
}
```

---

## Migration Path

1. **Keep Shotstack as fallback** during development
2. **Feature flag** to toggle between renderers
3. **Gradual rollout**: Test Remotion on new projects first
4. **Full migration** once stable

---

## Files to Create

- `remotion/src/Root.tsx`
- `remotion/src/compositions/DemoTrailer.tsx`
- `remotion/src/components/Scene.tsx`
- `remotion/src/components/KineticText.tsx`
- `remotion/src/components/MotionOverlays.tsx`
- `remotion/remotion.config.ts`
- `remotion/package.json`
- `supabase/functions/render-remotion/index.ts`
- `supabase/functions/generate-motion-config/index.ts`
- `supabase/functions/remotion-webhook/index.ts`
- `src/components/editor/RemotionPreview.tsx`

## Files to Modify

- `src/pages/Editor.tsx` - Use Remotion Player
- `src/pages/RenderPage.tsx` - Call render-remotion
- `supabase/functions/generate-storyboard/index.ts` - Add motion params
- `package.json` - Add Remotion dependencies
- `supabase/config.toml` - Register new edge functions

## Files to Remove/Deprecate

- `supabase/functions/render-video/index.ts` (after migration)
- `supabase/functions/check-render-status/index.ts` (after migration)
- `src/components/editor/PreviewPlayer.tsx` (replaced by RemotionPreview)

---

## Timeline Estimate

- **Phase 1** (Remotion Setup): 2-3 hours
- **Phase 2** (Port Effects): 3-4 hours
- **Phase 3** (Claude Integration): 2 hours
- **Phase 4** (Lambda Integration): 3-4 hours
- **Phase 5** (Unified Preview): 2-3 hours
- **Testing & Polish**: 2-3 hours

**Total: ~15-20 hours of implementation**

