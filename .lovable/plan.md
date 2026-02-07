
# Plan: Rebuild Demo Video Engine Using Remotion + Claude Best Practices

## Current Problems Identified

After analyzing the codebase and comparing to industry best practices:

| Issue | Current Implementation | Industry Standard (Remotion + Claude) |
|-------|----------------------|--------------------------------------|
| **Slow preview playback** | Heavy per-frame calculations, complex overlays | Memoization, simpler components, CSS-based effects |
| **AI generates poor content** | Generic prompts, no visual analysis | Multi-modal vision AI analyzing actual screenshots |
| **No skills/context** | AI doesn't know Remotion patterns | Claude uses structured "skills" with animation rules |
| **Rendering pipeline issues** | Complex AWS Lambda setup, stuck renders | Simpler render job management with proper status tracking |
| **Animations don't match example** | Overly complex spring physics | Industry-proven timing presets, simpler effects |

---

## Solution Architecture

### Core Strategy: Simplify Everything

The example Gojiberry video succeeds because it's **simple and fast**:
- Clean text reveals (not bouncy character-by-character)
- Smooth camera movements (gentle Ken Burns)
- Minimal overlays (subtle vignette only)
- Strong narrative (Pain → Solution → Proof → CTA)

We need to strip back complexity and focus on what works.

---

## Phase 1: Performance-First Animation Redesign

### 1.1 Simplify KineticText Component

Replace complex animation calculations with CSS-based reveals:

**Changes to `src/remotion/components/KineticText.tsx`:**
- Make `fade-scale` the default (simplest, fastest)
- Remove per-character `bounce-in` as default
- Use CSS `will-change` and `transform` only
- Pre-calculate animation values outside render

**New approach:**
```text
BEFORE: 20+ spring calculations per frame per character
AFTER: 1 spring calculation per frame per line
```

### 1.2 Minimal Overlay System

**Changes to `src/remotion/components/MotionOverlays.tsx`:**
- Reduce `FloatingParticles` from 30 to 8
- Remove `ScanLines` (causes frame drops)
- Make `FilmGrain` static (no per-frame seed changes)
- Simplify `Vignette` to pure CSS gradient

### 1.3 Optimized Scene Component

**Changes to `src/remotion/components/Scene.tsx`:**
- Remove ZoomSpotlight (too complex for browser preview)
- Simplify cursor animation timing
- Use `useMemo` for ALL expensive calculations
- Reduce Ken Burns rotation (0.3° → 0.1°)

---

## Phase 2: AI Storyboard Overhaul

### 2.1 Vision-First Scene Generation

The AI should ANALYZE the uploaded screenshots, not just generate generic text.

**Changes to `supabase/functions/generate-storyboard/index.ts`:**

New system prompt structure:
```text
1. VISUAL ANALYSIS
   - What product is shown in the screenshot?
   - What UI elements are visible?
   - What action is being demonstrated?

2. NARRATIVE MAPPING
   - Scene 1: Hook (identify pain point from product context)
   - Scene 2: Solution (the product solves this)
   - Scene 3-N: Features (describe what's visible)
   - Final: CTA

3. MOTION DESIGN
   - Simple animations only (fade-scale, line-reveal)
   - Ken Burns zoom 1.0 → 1.15 max
   - No complex cursor paths for now
```

### 2.2 Website Content Integration

When website data is available, use it directly:
- Use actual taglines as headlines
- Use real stats as proof points
- Use extracted CTAs for final scene
- Match brand voice from scraped copy

---

## Phase 3: Rendering Pipeline Fix

### 3.1 Development Mode Improvements

**Changes to `supabase/functions/check-remotion-status/index.ts`:**
- Faster progress simulation (complete in 30 seconds not 120)
- Generate actual placeholder video URLs
- Clear error messages when Lambda isn't configured

### 3.2 Render State Management

**Changes to `supabase/functions/render-remotion/index.ts`:**
- Add timeout handling (fail after 5 minutes)
- Better error propagation to frontend
- Log actual Lambda responses for debugging

---

## Phase 4: Simplified Component Library

Create a minimal set of proven animation patterns:

### 4.1 New Animation Presets

```text
FAST_FADE: { damping: 30, stiffness: 300 } - 10 frame reveal
SMOOTH_SCALE: { damping: 25, stiffness: 200 } - 15 frame scale
SUBTLE_SLIDE: { damping: 20, stiffness: 250 } - 12 frame slide
```

### 4.2 Transition Simplification

Remove complex transitions, keep only:
- `fade` - Cross-fade (default)
- `slide` - Horizontal slide
- `zoom` - Scale transition

Remove: cross-dissolve, wipe (too complex for browser preview)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/remotion/components/KineticText.tsx` | Simplify to 3 core styles, remove per-character animations |
| `src/remotion/components/Scene.tsx` | Remove ZoomSpotlight, simplify overlays, optimize Ken Burns |
| `src/remotion/components/MotionOverlays.tsx` | Reduce particle count, static grain, CSS-only vignette |
| `src/remotion/compositions/DemoTrailer.tsx` | Remove complex transitions, simpler memoization |
| `src/remotion/lib/animations.ts` | New fast presets, simpler Ken Burns |
| `supabase/functions/generate-storyboard/index.ts` | Vision-first AI prompts, use website content |
| `supabase/functions/check-remotion-status/index.ts` | Faster dev mode, better error handling |

---

## Expected Outcomes

After implementation:

| Metric | Before | After |
|--------|--------|-------|
| Preview FPS | 15-20 | 45-60 |
| Text reveal time | 2-3 seconds | 0.3-0.5 seconds |
| Scene transitions | Janky | Smooth |
| AI headline quality | Generic | Context-aware |
| Render reliability | Often stuck | Completes or fails cleanly |

---

## Technical Details

### Simplified Spring Config
```typescript
// Only 3 presets needed
export const springPresets = {
  fast: { damping: 30, mass: 0.5, stiffness: 300, overshootClamping: true },
  smooth: { damping: 25, mass: 0.8, stiffness: 150, overshootClamping: true },
  bounce: { damping: 15, mass: 1, stiffness: 200, overshootClamping: false },
};
```

### CSS-Based Text Reveal
```typescript
// Simple opacity + transform (no per-character)
const progress = spring({ frame, fps, config: springPresets.fast });
return (
  <h1 style={{
    opacity: progress,
    transform: `translateY(${(1 - progress) * 20}px)`,
    willChange: 'opacity, transform',
  }}>
    {text}
  </h1>
);
```

### AI Prompt Structure
```text
ROLE: Video motion designer

ANALYZE these product screenshots and create a 5-scene trailer:

SCENE STRUCTURE:
1. HOOK: What problem does this product solve? (2-4 words)
2. SOLUTION: "Meet [Product Name]" or "Introducing..."
3-4. FEATURES: What's shown in the screenshots?
5. CTA: Strong call to action

RULES:
- Headlines: 2-5 words MAX
- Use action verbs: Launch, Build, Create, Transform
- Match the brand's tone from website copy
```

---

## Implementation Order

1. **Performance fixes first** - Get preview running at 45+ FPS
2. **Simplify animations** - Remove complex effects
3. **Fix AI prompts** - Use website content properly
4. **Render pipeline** - Better error handling
5. **Polish** - Fine-tune timing and transitions

This approach prioritizes getting a working, fast preview before adding complexity back in.
