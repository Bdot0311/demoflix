
# Plan: Fix Remotion Preview + Cinematic Cursor/UI Highlight Demo Pipeline

## Overview
This plan addresses three interconnected issues preventing cinematic demo creation:
1. Cursor and UI highlight animations exist but are never rendered
2. AI storyboard generation doesn't create the motion data needed for cursor/highlights
3. Website scraping misses demo videos and interactive element coordinates

---

## Phase 1: Fix Remotion Scene Rendering (High Priority)

### Problem
The `Scene.tsx` component ignores `cursor_path`, `zoom_targets`, and `ui_highlights` from `motion_config` - these components exist (`CursorAnimation.tsx`, `ZoomHighlight.tsx`) but are never used.

### Solution
Update `Scene.tsx` to conditionally render:
- `DemoCursor` when `motion_config.cursor_path` exists
- `UIHighlight` components when `motion_config.ui_highlights` array exists  
- `ZoomHighlight` when `motion_config.zoom_targets` array exists

```text
┌─────────────────────────────────────────────────────┐
│                     Scene.tsx                        │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────┐  ┌─────────────────┐           │
│ │  Background     │  │  KineticText    │           │
│ │  (Ken Burns)    │  │  (Headlines)    │           │
│ └─────────────────┘  └─────────────────┘           │
│                                                      │
│ ┌─────────────────┐  ┌─────────────────┐  NEW!    │
│ │  DemoCursor     │  │  UIHighlight    │  ◄────   │
│ │  (cursor_path)  │  │  (ui_highlights)│           │
│ └─────────────────┘  └─────────────────┘           │
│                                                      │
│ ┌─────────────────┐                                 │
│ │  ZoomHighlight  │  NEW!                          │
│ │  (zoom_targets) │                                 │
│ └─────────────────┘                                 │
└─────────────────────────────────────────────────────┘
```

### Files to Modify
- `src/remotion/components/Scene.tsx` - Add imports and render cursor/highlight components

---

## Phase 2: Upgrade AI Storyboard Generation (Critical)

### Problem
Claude prompt only asks for headlines/zoom/pan. It never generates:
- `cursor_path` (startX, startY, endX, endY, clickFrame)
- `ui_highlights` (x, y, width, height, label, delay, duration)
- `zoom_targets` (x, y, scale, startFrame, endFrame)

### Solution
Rewrite the Claude prompt to act as a **motion designer** that:
1. Analyzes screenshots to identify interactive UI elements (buttons, forms, nav)
2. Generates cursor paths that demonstrate product workflow
3. Creates UI highlight boxes around key features
4. Adds zoom targets for "hero" moments

### New Prompt Structure
```text
You are a cinematic motion designer creating Figma/Cursor-style product demos.

For EACH scene, analyze the screenshot and generate:
1. headline + subtext (2-5 words max)
2. cursor_path: { startX, startY, endX, endY, clickFrame }
   - Simulate a user navigating the product
   - Move to buttons, inputs, key UI elements
   - Include a click at the moment of action

3. ui_highlights: Array of UI elements to highlight
   - Identify buttons, features, inputs in the screenshot
   - Provide x, y (percentage), width, height (pixels)
   - Add label text like "Click here" or feature name

4. zoom_targets: Zoom into specific UI regions
   - Hero moments get 1.8x-2.0x zoom
   - Provide x, y (percentage of screen), scale, timing
```

### Files to Modify
- `supabase/functions/generate-storyboard/index.ts` - Enhanced Claude prompt + motion config generation

### MotionConfig Schema Update
```typescript
interface MotionConfig {
  animation_style: "fade-scale" | "slide" | "zoom";
  spring: {...};
  effects: ["vignette"];
  camera: { zoom_start, zoom_end, pan_x, pan_y };
  
  // NEW - cursor simulation
  cursor_path?: {
    startX: number;    // percentage 0-100
    startY: number;
    endX: number;
    endY: number;
    clickFrame?: number;
  };
  
  // NEW - UI element highlights
  ui_highlights?: Array<{
    x: number;         // percentage
    y: number;
    width: number;     // pixels (scaled)
    height: number;
    label?: string;
    delay: number;     // frames
    duration: number;  // frames
  }>;
  
  // NEW - zoom spotlights
  zoom_targets?: Array<{
    x: number;
    y: number;
    scale: number;
    startFrame: number;
    endFrame: number;
  }>;
}
```

---

## Phase 3: Improve Website Scraping (Important)

### Problem
Scrape logs show `Videos: 0` - demo videos (YouTube, Loom, Vimeo iframes) are not being captured.

### Solution
1. Expand video regex patterns to catch more embed formats
2. Use Firecrawl's `html` format and parse for `<video>`, `<iframe>` with video sources
3. Store video URLs in project metadata for use in CTA scenes

### Video Pattern Improvements
```typescript
const videoPatterns = [
  // YouTube (all formats)
  /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/gi,
  
  // Vimeo
  /(?:player\.vimeo\.com\/video\/|vimeo\.com\/)(\d+)/gi,
  
  // Loom (extended)
  /(?:loom\.com\/share\/|loom\.com\/embed\/|useloom\.com\/share\/)([a-zA-Z0-9]+)/gi,
  
  // Wistia
  /(?:wistia\.com\/medias\/|wistia\.net\/embed\/|fast\.wistia\.net\/embed\/iframe\/)([a-zA-Z0-9]+)/gi,
  
  // Vidyard
  /(?:vidyard\.com\/watch\/|video\.vidyard\.com\/watch\/)([a-zA-Z0-9]+)/gi,
  
  // iframe src with video providers
  /src=["']([^"']*(?:youtube|vimeo|loom|wistia|vidyard)[^"']*)["']/gi,
];
```

### Files to Modify
- `supabase/functions/scrape-website/index.ts` - Enhanced video extraction patterns

---

## Phase 4: RemotionPreview Performance Fix

### Problem
You mentioned "quality/animations wrong" - the preview may be lagging or not showing the new cursor/highlight effects smoothly.

### Solution
1. Memoize cursor path calculations to prevent re-renders
2. Use `useMemo` for highlight positions
3. Ensure the Player component receives updated scenes when motion_config changes

### Files to Modify
- `src/components/editor/RemotionPreview.tsx` - Pass cursor/highlights to Scene component

---

## Technical Implementation Summary

| File | Changes |
|------|---------|
| `src/remotion/components/Scene.tsx` | Render DemoCursor, UIHighlight, ZoomHighlight based on motion_config |
| `supabase/functions/generate-storyboard/index.ts` | New Claude prompt for cursor paths + UI highlights + zoom targets |
| `supabase/functions/scrape-website/index.ts` | Enhanced video regex patterns, iframe parsing |
| `src/remotion/lib/animations.ts` | Update MotionConfig type to require cursor_path/ui_highlights fields |

---

## Expected Outcome

After implementation:
1. **Remotion Preview** will show animated cursor moving to UI elements with click ripples
2. **UI Highlights** will pulse around buttons/features with labels
3. **Zoom Spotlights** will dramatically zoom into hero UI moments
4. **Scraping** will capture demo videos from YouTube/Loom/Vimeo embeds
5. **AI Generation** will intelligently place cursor/highlights based on screenshot analysis

This transforms the output from "text over screenshot" to "cinematic product walkthrough" matching Cursor/Verbal-style demos.

---

## Testing Checklist
- [ ] Create demo from URL and verify cursor animations appear
- [ ] Verify UI highlights pulse around detected buttons
- [ ] Confirm demo videos are captured in scrape results
- [ ] Test preview playback at 60fps without stuttering
- [ ] Verify rendered video matches preview fidelity
