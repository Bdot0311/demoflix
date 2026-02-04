# DemoFlix: Migrate to Remotion + Claude for Motion-Style Demos

## Status: Phases 1-3 Complete ✅

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

**Phase 5 (Partial): Remotion Preview Component**
- Created `RemotionPreview.tsx` wrapper component
- Bridges database scene format with Remotion's format
- Full playback controls (play, pause, seek, fullscreen)
- Music synchronization
- Scene navigation dots

### In Progress 🔄

**Phase 4: Remotion Lambda Integration** (Requires AWS Setup)
- [ ] Create `render-remotion` edge function
- [ ] Create `remotion-webhook` edge function  
- [ ] User must provide AWS credentials

### Remaining ⏳

**Phase 5: Unified Preview & Render**
- [ ] Integrate RemotionPreview into Editor (replace PreviewPlayer)
- [ ] Add toggle to switch between legacy and Remotion preview
- [ ] Update RenderPage to use Remotion Lambda

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
├── PreviewPlayer.tsx                 (Legacy - CSS animations)
└── RemotionPreview.tsx              ✅ New Remotion-based preview

supabase/functions/
├── generate-storyboard/             ✅ Enhanced with motion config
├── render-video/                    (Legacy - Shotstack)
└── check-render-status/             (Legacy - Shotstack)
```

---

## Next Steps

1. **Test RemotionPreview** - Import into Editor and verify animations work
2. **Set up AWS Lambda** (Phase 4) - User must:
   - Deploy Remotion Lambda to AWS
   - Provide AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
   - Provide REMOTION_AWS_REGION, REMOTION_FUNCTION_NAME
3. **Create render-remotion edge function** - Trigger Lambda renders
4. **Replace PreviewPlayer** - Switch Editor to use RemotionPreview

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
