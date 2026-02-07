# Plan: Motion Graphics Video Engine (Gojiberry-Style)

## Overview

Complete rebuild of the video generation approach to match the Gojiberry example:
- **Dark cinematic backgrounds** with animated gradients/particles
- **Kinetic typography** - scraped content animates as the visual focus
- **AI-generated imagery** - unique visuals for each concept
- **2D illustrations & 3D elements** - abstract shapes, icons
- **Voiceover-driven narrative** - ElevenLabs synced with visuals

**Key Insight**: Website screenshots are NOT backgrounds. The scraped content (pain points, features, stats, CTAs) BECOMES the motion graphics.

---

## Phase 1: New Scene Architecture

### Current (Wrong)
```
┌─────────────────────────────────────┐
│  Screenshot Background              │
│  ┌─────────────────────────────┐   │
│  │  Text Overlay                │   │
│  │  "Headline"                  │   │
│  │  "Subtext"                   │   │
│  └─────────────────────────────┘   │
│  + Cursor animation                 │
└─────────────────────────────────────┘
```

### New (Motion Graphics)
```
┌─────────────────────────────────────┐
│  Animated Dark Gradient Background  │
│  + Floating particles/shapes        │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  KINETIC HEADLINE            │   │ ← Primary visual
│  │  (word-by-word animation)    │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Icon] [Icon] [Icon]               │ ← Feature icons
│   3D shapes floating                │
│                                     │
│  AI-Generated Illustration          │ ← Contextual imagery
└─────────────────────────────────────┘
```

### Scene Types (Matching Example)

| Scene Type | Visual Style | Content Source |
|------------|--------------|----------------|
| `intro` | Dark + particles, dramatic text | Pain point hook |
| `pain-point` | Red accents, frustrated icons | scraped painPoints |
| `solution-intro` | Brand color gradient, logo | "Meet [Product]" |
| `feature-demo` | Icons + kinetic text, zoom | scraped features |
| `social-proof` | Testimonial cards, avatars | scraped testimonials |
| `stats` | Large animated numbers | scraped stats |
| `cta` | Gradient, pulsing button graphic | scraped CTAs |

---

## Phase 2: New Remotion Components

### 2.1 Background System
```typescript
// src/remotion/components/AnimatedBackground.tsx
- GradientBackground: Animated color gradient
- ParticleField: Floating dots/shapes
- GridLines: Subtle tech grid
- GlowOrbs: Soft light orbs
```

### 2.2 Typography System
```typescript
// src/remotion/components/KineticHeadline.tsx
- WordByWord: Words animate in sequence
- CharacterSplit: Letters fly in
- LineReveal: Lines slide up with mask
- TypewriterEffect: Character-by-character with cursor
```

### 2.3 Visual Elements
```typescript
// src/remotion/components/MotionElements.tsx
- IconGrid: Animated feature icons
- StatCounter: Animated number counting
- TestimonialCard: Quote with avatar
- CTAButton: Pulsing action button graphic
- FeatureCard: Icon + title + description
```

### 2.4 AI-Generated Imagery
```typescript
// src/remotion/components/AIImage.tsx
- Uses Lovable AI (Nano banana) to generate scene-specific images
- Cached in Supabase storage
- Transitions: fade, slide, zoom
```

---

## Phase 3: Voiceover Integration

### Script Generation
```typescript
// supabase/functions/generate-script/index.ts
- Takes scraped content
- Generates voiceover script matching video flow
- Returns timed segments for each scene
```

### Audio Generation
```typescript
// supabase/functions/generate-voiceover/index.ts (existing)
- ElevenLabs TTS
- Returns audio URL + word timings
- Sync with kinetic text
```

### Timing System
```typescript
// src/remotion/lib/voiceoverSync.ts
- Map word timestamps to frame numbers
- Trigger animations on specific words
- Auto-adjust scene durations
```

---

## Phase 4: AI Storyboard Update

### New Claude Prompt Focus
```
You are a motion graphics director creating a Gojiberry-style product video.

Given scraped website content, generate scenes where:
1. Headlines ARE the visual content (kinetic typography)
2. No screenshots - pure motion graphics
3. Each scene has: headline, visual_type, animations, AI_image_prompt
4. Voiceover script synchronized with visuals

Visual types:
- "kinetic-headline": Large animated text
- "feature-grid": Icons + labels
- "stat-counter": Animated number
- "testimonial": Quote card
- "cta": Action button graphic
```

### Scene Data Structure
```typescript
interface MotionGraphicsScene {
  id: string;
  type: "intro" | "pain-point" | "solution" | "feature" | "stat" | "testimonial" | "cta";
  headline: string;
  voiceover_text: string;
  visual_elements: {
    type: "kinetic-text" | "icon-grid" | "stat" | "testimonial" | "cta-button";
    data: any;
  }[];
  ai_image_prompt?: string;
  background: {
    type: "gradient" | "particles" | "grid";
    colors: string[];
  };
  animation_style: "dramatic" | "smooth" | "punchy";
  duration_ms: number;
}
```

---

## Phase 5: Implementation Order

### Week 1: Core Engine
1. [ ] Create `AnimatedBackground.tsx` with gradient/particles
2. [ ] Create `KineticHeadline.tsx` with word-by-word animation
3. [ ] Update `Scene.tsx` to use new components
4. [ ] Remove screenshot dependency

### Week 2: Visual Elements
5. [ ] Create `StatCounter.tsx` for animated numbers
6. [ ] Create `FeatureCard.tsx` with icon system
7. [ ] Create `TestimonialCard.tsx` 
8. [ ] Add Lucide icons for feature visualization

### Week 3: AI Integration
9. [ ] Update `generate-storyboard` for motion graphics format
10. [ ] Create `generate-ai-images` edge function using Nano banana
11. [ ] Cache generated images in Supabase storage

### Week 4: Voiceover Sync
12. [ ] Update script generation for timed segments
13. [ ] Create word timing sync system
14. [ ] Connect voiceover to kinetic text timing

---

## Files to Create/Modify

### New Files
- `src/remotion/components/backgrounds/GradientBackground.tsx`
- `src/remotion/components/backgrounds/ParticleField.tsx`
- `src/remotion/components/typography/KineticHeadline.tsx`
- `src/remotion/components/typography/WordByWord.tsx`
- `src/remotion/components/elements/StatCounter.tsx`
- `src/remotion/components/elements/FeatureCard.tsx`
- `src/remotion/components/elements/TestimonialCard.tsx`
- `src/remotion/components/elements/CTAButton.tsx`
- `supabase/functions/generate-ai-images/index.ts`

### Modify
- `src/remotion/components/Scene.tsx` - Complete rewrite
- `src/remotion/compositions/DemoTrailer.tsx` - New scene routing
- `supabase/functions/generate-storyboard/index.ts` - New prompt
- `src/remotion/lib/animations.ts` - New scene data types

---

## Expected Result

After implementation, the flow becomes:

1. User enters website URL
2. Scraper extracts: pain points, features, stats, testimonials, CTAs
3. AI generates motion graphics storyboard (not screenshot overlays)
4. For each scene:
   - Animated dark background
   - Kinetic headline with word-by-word animation
   - Feature icons / stat counters / testimonial cards
   - Optional AI-generated illustration
5. Voiceover narrates synced with text animations
6. Result: Professional motion graphics video like Gojiberry example
