# DemoFlix: Migrate to Remotion + Claude for Motion-Style Demos

## Status: Phases 1-5 Complete ✅

### Completed ✅

**Phase 1: Remotion Project Setup**
- Added `remotion`, `@remotion/player`, and `zod` dependencies
- Created `src/remotion/` directory with full composition structure
- Built `Root.tsx` with 4 compositions (horizontal, vertical, square, with intro)
- Created `DemoTrailer.tsx` composition with scene sequencing
  
**Phase 2: Port Effects to Remotion**
- `KineticText.tsx` - 5 animation styles: bounce-in, typewriter, slide-mask, fade-scale, word-stagger
- `MotionOverlays.tsx` - Particles, Vignette, Glow, ScanLines, GradientOverlay, AccentLine, ProgressRing, FilmGrain
- `Transitions.tsx` - Fade, Slide, Zoom, Wipe, CrossDissolve
- `Scene.tsx` - Complete scene component with Ken Burns and effects
- `animations.ts` - Spring presets, Zod schemas, easing functions

**Phase 3: Claude Motion Direction**
- Enhanced `generate-storyboard` edge function with full motion config
- Each scene now includes: animation_style, spring physics, effects, transitions
- Motion config auto-selected based on scene_type (hook, tension, reveal, feature, benefit, climax, cta)
- Deployed updated edge function

**Phase 4: Remotion Lambda Integration**
- Created `render-remotion` edge function - triggers Lambda or falls back to Shotstack
- Created `remotion-webhook` edge function - handles completion callbacks
- Created `check-remotion-status` edge function - polls render progress
- Supports dev mode with simulated progress when AWS not configured

**Phase 5: Unified Preview & Render**
- Created `RemotionPreview.tsx` wrapper component with full playback controls
- Integrated RemotionPreview into Editor with toggle switch
- Updated RenderPage to use Remotion renderer (with Shotstack fallback)
- WYSIWYG: Preview now matches rendered output

---

## AWS Setup Required

To enable production video rendering, you need to provide these secrets:

| Secret | Purpose |
|--------|---------|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
| `REMOTION_AWS_REGION` | Lambda region (default: us-east-1) |
| `REMOTION_FUNCTION_NAME` | Your deployed Lambda function name |
| `REMOTION_SERVE_URL` | S3 URL where Remotion bundle is hosted |

Without these, the system falls back to Shotstack or development simulation mode.

---

## File Structure

```
src/remotion/
├── Root.tsx                         ✅ Remotion entry point
├── compositions/
│   └── DemoTrailer.tsx              ✅ Main trailer composition
├── components/
│   ├── Scene.tsx                    ✅ Individual scene renderer
│   ├── KineticText.tsx              ✅ Text animations (5 styles)
│   ├── MotionOverlays.tsx           ✅ Visual effects (8 types)
│   └── Transitions.tsx              ✅ Scene transitions (5 types)
└── lib/
    └── animations.ts                ✅ Spring configs, types, helpers

src/components/editor/
├── PreviewPlayer.tsx                ✅ Legacy CSS preview (kept as fallback)
└── RemotionPreview.tsx              ✅ New Remotion-based preview

src/pages/
├── Editor.tsx                       ✅ Toggle between CSS and Remotion preview
└── RenderPage.tsx                   ✅ Uses Remotion renderer

supabase/functions/
├── generate-storyboard/             ✅ Enhanced with motion config
├── render-remotion/                 ✅ Remotion Lambda trigger
├── check-remotion-status/           ✅ Polls Remotion progress
├── remotion-webhook/                ✅ Handles Lambda callbacks
├── render-video/                    (Legacy - Shotstack fallback)
└── check-render-status/             (Legacy - Shotstack fallback)
```

---

## Technical Notes

### Motion Config Schema (from Claude-enhanced storyboard)

```typescript
interface MotionConfig {
  animation_style: "bounce-in" | "typewriter" | "slide-mask" | "fade-scale" | "word-stagger";
  spring: {
    damping: number;
    mass: number;
    stiffness: number;
    overshootClamping: boolean;
  };
  stagger_delay_frames: number;
  entrance_delay_frames: number;
  effects: ("particles" | "vignette" | "glow" | "scanlines")[];
}
```

### Scene Type → Motion Mapping

| Scene Type | Animation Style | Effects | Transition |
|------------|-----------------|---------|------------|
| hook | bounce-in | vignette, glow, particles | zoom |
| tension | slide-mask | vignette, scanlines | slide-left |
| reveal | word-stagger | glow, particles | fade |
| feature | fade-scale | vignette, glow | slide-right |
| benefit | bounce-in | particles, vignette | slide-left |
| climax | word-stagger | all effects | zoom |
| cta | fade-scale | glow, vignette | fade |

### Renderer Fallback Logic

```
render-remotion called
├── AWS configured? → Trigger Remotion Lambda
│   └── Status via check-remotion-status
│   └── Completion via remotion-webhook
└── AWS not configured? → Fall back to render-video (Shotstack)
    └── Status via check-render-status
```
