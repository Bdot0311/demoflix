

# Critical Motion Graphics Fix Plan

## Problem Summary
The videos aren't being generated like the example because **the entire motion graphics data pipeline is broken at multiple points**, causing the Remotion components to never receive the AI-generated animation data (cursors, zoom highlights, UI callouts).

---

## Root Cause Analysis

### Issue 1: Motion Config Type Mismatch in animations.ts
**File**: `src/remotion/lib/animations.ts` (lines 61-63)

The `motionConfigSchema` defines `cursor_path`, `zoom_targets`, and `ui_highlights` as **optional**, but the TypeScript type system and Zod schema have a structural mismatch with what the AI generates. The `cursorPathSchema` expects `clickFrame` (optional number) but the generate-storyboard function sends it as a required field.

### Issue 2: Camera Pan Values Too Small  
**File**: `src/remotion/lib/animations.ts` (line 156-158)

The `getKenBurnsTransform` function applies camera movement as:
```typescript
translateX: config.pan_x * eased,
translateY: config.pan_y * eased,
```

With `pan_x` values of `-5` to `5` from the database, the visual movement is **±5% at most** - far too subtle for cinematic effect. The example video uses **10-15% pan movement**.

### Issue 3: Scenes Query Missing motion_config in Editor
**File**: `src/pages/Editor.tsx` (line 386-390)

When loading scenes, the query is:
```typescript
.select("*, asset:assets(*)")
```

This does NOT explicitly fetch `motion_config`, `zoom_level`, `pan_x`, or `pan_y` from the database. While Supabase's `*` should include these, the **Scene interface** (lines 71-82) is missing these fields:

```typescript
interface Scene {
  id: string;
  order_index: number;
  headline: string;
  subtext: string;
  duration_ms: number;
  transition: string;
  asset?: {
    file_url: string;
    file_type: string;
  };
  // MISSING: motion_config, zoom_level, pan_x, pan_y
}
```

### Issue 4: RemotionPreview Not Passing motion_config Properly
**File**: `src/components/editor/RemotionPreview.tsx` (lines 82-127)

The `convertToRemotionScene` function attempts to use `scene.motion_config`, but since the Editor's `Scene` interface doesn't include it, TypeScript doesn't recognize the property and it may be stripped during data flow.

### Issue 5: Cursor Positions Are Pixel-Based But Scene Uses Percentages
**File**: `supabase/functions/generate-storyboard/index.ts` (lines 77-84)

The AI generates cursor paths like:
```typescript
startX: 100,
startY: 100,
endX: 500,
endY: 300,
```

These are **pixel coordinates**, but `DemoCursor` renders them as absolute `left: x` and `top: y` styles. On a 1920x1080 canvas, cursor starting at `(100, 100)` appears in top-left corner - not dynamic across the screen.

### Issue 6: No Default Demo Effects for All Scene Types
**File**: `supabase/functions/generate-storyboard/index.ts` (lines 72-111)

The `generateDemoEffects` function only adds cursor/zoom/highlights for specific scene types:
- Cursor: only `feature` and `reveal` scenes
- Zoom targets: only `tension` and `climax` scenes  
- UI highlights: only `benefit` and `feature` scenes

Result: **Hook scenes and CTA scenes have NO motion effects** - they're just static images with text.

---

## Implementation Plan

### Phase 1: Fix Interface Types in Editor (Critical)
**File**: `src/pages/Editor.tsx`

Expand the `Scene` interface to include all motion data:
```typescript
interface Scene {
  id: string;
  order_index: number;
  headline: string;
  subtext: string;
  duration_ms: number;
  transition: string;
  zoom_level?: number;
  pan_x?: number;
  pan_y?: number;
  motion_config?: {
    animation_style?: string;
    spring?: any;
    stagger_delay_frames?: number;
    entrance_delay_frames?: number;
    effects?: string[];
    cursor_path?: { startX: number; startY: number; endX: number; endY: number; clickFrame?: number };
    zoom_targets?: Array<{ x: number; y: number; scale: number; startFrame: number; endFrame: number }>;
    ui_highlights?: Array<{ x: number; y: number; width: number; height: number; label?: string; delay: number; duration: number }>;
  };
  asset?: { file_url: string; file_type: string };
}
```

### Phase 2: Dramatically Increase Camera Movement
**File**: `src/remotion/lib/animations.ts`

Modify `getKenBurnsTransform` to multiply pan values:
```typescript
export const getKenBurnsTransform = (
  frame: number,
  durationInFrames: number,
  config: MotionConfig["camera"]
): { scale: number; translateX: number; translateY: number } => {
  const progress = frame / durationInFrames;
  const eased = easeInOutCubic(progress);

  // Amplify pan values for more dramatic camera movement (2x multiplier)
  const panMultiplier = 2;

  return {
    scale: config.zoom_start + (config.zoom_end - config.zoom_start) * eased,
    translateX: config.pan_x * panMultiplier * eased,
    translateY: config.pan_y * panMultiplier * eased,
  };
};
```

### Phase 3: Fix Cursor Position to Use Percentages
**File**: `supabase/functions/generate-storyboard/index.ts`

Change cursor path generation to use percentage-based coordinates:
```typescript
const generateDemoEffects = (sceneType: string, sceneIndex: number, durationFrames: number): Partial<MotionConfig> => {
  const effects: Partial<MotionConfig> = {};
  
  // Generate cursor for ALL scenes (except first/last which are intro/CTA)
  if (["feature", "reveal", "benefit", "tension"].includes(sceneType)) {
    // Use percentage values (10-90% of screen) instead of pixels
    const baseX = 15 + (sceneIndex * 15) % 50;
    const baseY = 20 + (sceneIndex * 10) % 40;
    effects.cursor_path = {
      startX: baseX * 10,        // 150-650px range on 1920 width
      startY: baseY * 10,        // 200-600px range on 1080 height
      endX: (baseX + 30) * 10,   // 450-950px range
      endY: (baseY + 20) * 10,   // 400-800px range
      clickFrame: Math.floor(durationFrames * 0.65),
    };
  }
  
  // Add zoom targets to MORE scenes
  if (["tension", "climax", "feature", "reveal"].includes(sceneType)) {
    effects.zoom_targets = [{
      x: 40 + (sceneIndex * 10) % 30,  // 40-70% from left
      y: 35 + (sceneIndex * 8) % 25,   // 35-60% from top
      scale: 1.6 + (sceneIndex * 0.1) % 0.4, // 1.6-2.0x zoom
      startFrame: Math.floor(durationFrames * 0.15),
      endFrame: Math.floor(durationFrames * 0.75),
    }];
  }
  
  // Add UI highlights to benefit, feature, AND reveal scenes
  if (["benefit", "feature", "reveal"].includes(sceneType)) {
    effects.ui_highlights = [{
      x: 250 + (sceneIndex * 120) % 500, // Spread across screen
      y: 180 + (sceneIndex * 80) % 300,
      width: 220,
      height: 70,
      label: sceneIndex % 2 === 0 ? "Key Feature" : undefined,
      delay: 20,
      duration: durationFrames - 40,
    }];
  }
  
  return effects;
};
```

### Phase 4: Add Demo Effects to Hook Scenes
**File**: `supabase/functions/generate-storyboard/index.ts`

Update the motion config mapping to include hook scene effects:
```typescript
case "hook":
  return {
    animation_style: "bounce-in",
    spring: springPresets.elastic,
    stagger_delay_frames: 2,
    entrance_delay_frames: 5,
    effects: ["vignette", "glow", "particles"],
    // Add subtle zoom target for hook
    zoom_targets: [{
      x: 50, y: 45, scale: 1.4,
      startFrame: 10,
      endFrame: Math.floor(durationFrames * 0.8),
    }],
  };
```

### Phase 5: Ensure motion_config Persists Through Full Pipeline
**File**: `src/pages/NewDemo.tsx`

Verify the scene insertion properly maps the motion_config:
```typescript
const scenesToInsert = data.scenes.map((scene: any, index: number) => ({
  project_id: projectId,
  asset_id: isSingleAsset ? (assets?.[0]?.id || null) : (assets?.[index]?.id || null),
  order_index: scene.order_index || index,
  headline: scene.headline || `Scene ${index + 1}`,
  subtext: scene.subtext || "",
  duration_ms: scene.duration_ms || Math.floor((selectedDuration * 1000) / data.scenes.length),
  transition: scene.transition || "fade",
  zoom_level: scene.zoom_level || 1.2,
  pan_x: scene.pan_direction === "left" ? -8 : scene.pan_direction === "right" ? 8 : 0,
  pan_y: scene.pan_direction === "up" ? -5 : scene.pan_direction === "down" ? 5 : 0,
  // Explicitly convert and store full motion config
  motion_config: scene.motion_config ? JSON.parse(JSON.stringify(scene.motion_config)) : null,
}));
```

### Phase 6: Fix render-remotion to Include motion_config
**File**: `supabase/functions/render-remotion/index.ts`

The render function currently IGNORES `scene.motion_config` from the database (lines 112-131). Fix:
```typescript
const inputProps = {
  scenes: scenes.map((scene: any) => ({
    id: scene.id,
    headline: scene.headline || "",
    subtext: scene.subtext || "",
    imageUrl: scene.asset?.file_url || "",
    durationInFrames: Math.round((scene.duration_ms / 1000) * 30),
    motionConfig: scene.motion_config ? {
      ...scene.motion_config,
      camera: {
        zoom_start: 1.0,
        zoom_end: scene.zoom_level || 1.15,
        pan_x: scene.pan_x || 0,
        pan_y: scene.pan_y || 0,
      },
    } : {
      animation_style: "bounce-in",
      spring: { damping: 10, mass: 1, stiffness: 100, overshootClamping: false },
      stagger_delay_frames: 2,
      entrance_delay_frames: 5,
      effects: ["vignette", "glow", "particles"],
      camera: {
        zoom_start: 1.0,
        zoom_end: scene.zoom_level || 1.15,
        pan_x: scene.pan_x || 0,
        pan_y: scene.pan_y || 0,
      },
    },
    transition: mapTransition(scene.transition),
  })),
  brandColor: project.brand_color || "#8B5CF6",
  logoUrl: project.logo_url || undefined,
  fps: 30,
};
```

---

## Technical Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CURRENT BROKEN DATA FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

generate-storyboard    NewDemo.tsx         Database         RemotionPreview
       │                    │                  │                   │
       │  motion_config     │                  │                   │
       ├───────────────────►│  SAVES IT ✓     │                   │
       │  (cursor, zooms)   │────────────────►│                   │
       │                    │                  │   motion_config   │
       │                    │                  │       LOST ✗      │
       │                    │                  │◄──────────────────┤
       │                    │                  │  (Scene interface │
       │                    │                  │   missing fields) │
                                                                   │
                                               Scene.tsx receives  │
                                               empty motion data   │
                                                       │           │
                                               ┌───────▼───────┐   │
                                               │  No cursors   │   │
                                               │  No zooms     │   │
                                               │  No highlights│   │
                                               └───────────────┘   │

┌─────────────────────────────────────────────────────────────────────────────┐
│                         FIXED DATA FLOW                                     │
└─────────────────────────────────────────────────────────────────────────────┘

generate-storyboard    NewDemo.tsx         Database        Editor.tsx
       │                    │                  │                │
       │  motion_config     │                  │                │
       ├───────────────────►│  SAVES IT ✓     │                │
       │  (full effects)    │────────────────►│                │
       │                    │                  │                │
       │                    │                  │  Scene interface
       │                    │                  │  INCLUDES all   
       │                    │                  │  motion fields ✓
       │                    │                  │◄───────────────┤
                                               │                │
                                    RemotionPreview             │
                                          │                     │
                                          │ motion_config       │
                                          │ properly mapped ✓   │
                                          ▼                     │
                                    Scene.tsx                   │
                                          │                     │
                           ┌──────────────┼──────────────┐      │
                           ▼              ▼              ▼      │
                      DemoCursor   ZoomSpotlight   UIHighlight  │
                           ✓              ✓              ✓      │
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Editor.tsx` | Update Scene interface to include motion_config, zoom_level, pan_x, pan_y |
| `src/remotion/lib/animations.ts` | Increase camera pan multiplier from 1x to 2x |
| `supabase/functions/generate-storyboard/index.ts` | Add demo effects to ALL scene types, use wider position ranges |
| `supabase/functions/render-remotion/index.ts` | Include scene.motion_config from database in render props |
| `src/pages/NewDemo.tsx` | Increase pan_x/pan_y values from ±5 to ±8 |

---

## Expected Result After Implementation

1. **Cursor animations** appear on feature/reveal/benefit/tension scenes
2. **Zoom spotlight effects** highlight key UI areas
3. **UI callout boxes** pop up to call attention to features  
4. **Camera movement** is 2x more dramatic (Ken Burns effect visible)
5. **All scene types** have some motion effect (not just text on static image)
6. **Rendered videos** match the preview exactly (WYSIWYG)

This will transform the output from "screenshot slideshow with text" to "cinematic product demo with motion graphics" matching the example video.

