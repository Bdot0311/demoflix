import { z } from "zod";
import { SpringConfig, spring } from "remotion";

// SIMPLIFIED Spring presets - only 3 core presets for performance
export const springPresets: Record<string, SpringConfig> = {
  // Core presets (primary use)
  fast: { damping: 30, mass: 0.5, stiffness: 300, overshootClamping: true },
  smooth: { damping: 25, mass: 0.8, stiffness: 150, overshootClamping: true },
  bounce: { damping: 15, mass: 1, stiffness: 200, overshootClamping: false },
  
  // Legacy aliases (for backwards compatibility)
  instant: { damping: 30, mass: 0.5, stiffness: 300, overshootClamping: true },
  crisp: { damping: 30, mass: 0.5, stiffness: 300, overshootClamping: true },
  cinematic: { damping: 25, mass: 0.8, stiffness: 150, overshootClamping: true },
  punch: { damping: 15, mass: 1, stiffness: 200, overshootClamping: false },
  bouncy: { damping: 15, mass: 1, stiffness: 200, overshootClamping: false },
  snappy: { damping: 30, mass: 0.5, stiffness: 300, overshootClamping: true },
  gentle: { damping: 25, mass: 0.8, stiffness: 150, overshootClamping: true },
  elastic: { damping: 15, mass: 1, stiffness: 200, overshootClamping: false },
};

// Zod schemas for Remotion props validation
export const springConfigSchema = z.object({
  damping: z.number(),
  mass: z.number(),
  stiffness: z.number(),
  overshootClamping: z.boolean(),
});

export const cameraConfigSchema = z.object({
  zoom_start: z.number(),
  zoom_end: z.number(),
  pan_x: z.number(),
  pan_y: z.number(),
});

export const cursorPathSchema = z.object({
  startX: z.number(),
  startY: z.number(),
  endX: z.number(),
  endY: z.number(),
  clickFrame: z.number().optional(),
});

export const zoomTargetSchema = z.object({
  x: z.number(),
  y: z.number(),
  scale: z.number(),
  startFrame: z.number(),
  endFrame: z.number(),
});

export const uiHighlightSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  label: z.string().optional(),
  delay: z.number(),
  duration: z.number(),
});

// CINEMATIC: Animation styles with cursor, highlights, and zoom targets
export const motionConfigSchema = z.object({
  animation_style: z.enum(["fade-scale", "slide", "zoom"]),
  spring: springConfigSchema,
  stagger_delay_frames: z.number(),
  entrance_delay_frames: z.number(),
  effects: z.array(z.enum(["vignette"])),
  camera: cameraConfigSchema,
  // CINEMATIC features
  cursor_path: cursorPathSchema.optional(),
  zoom_targets: z.array(zoomTargetSchema).optional(),
  ui_highlights: z.array(uiHighlightSchema).optional(),
});

export const sceneDataSchema = z.object({
  id: z.string(),
  headline: z.string(),
  subtext: z.string(),
  imageUrl: z.string(),
  durationInFrames: z.number(),
  motionConfig: motionConfigSchema,
  transition: z.enum(["fade", "slide", "zoom"]),
});

export const trailerPropsSchema = z.object({
  scenes: z.array(sceneDataSchema),
  width: z.number(),
  height: z.number(),
  fps: z.number(),
  brandColor: z.string().optional(),
  logoUrl: z.string().optional(),
});

export const trailerWithIntroPropsSchema = trailerPropsSchema.extend({
  introText: z.string().optional(),
  outroText: z.string().optional(),
  introDuration: z.number().optional(),
  outroDuration: z.number().optional(),
});

// TypeScript types inferred from schemas
export type MotionConfig = z.infer<typeof motionConfigSchema>;
export type SceneData = z.infer<typeof sceneDataSchema>;
export type TrailerProps = z.infer<typeof trailerPropsSchema>;
export type TrailerWithIntroProps = z.infer<typeof trailerWithIntroPropsSchema>;

// SIMPLIFIED default motion config - minimal effects for performance
export const defaultMotionConfig: MotionConfig = {
  animation_style: "fade-scale",
  spring: springPresets.fast,
  stagger_delay_frames: 0,
  entrance_delay_frames: 3,
  effects: ["vignette"],
  camera: {
    zoom_start: 1.0,
    zoom_end: 1.15,
    pan_x: 0,
    pan_y: 0,
  },
};

// Helper to calculate spring value at a given frame
export const getSpringValue = (
  frame: number,
  fps: number,
  config: SpringConfig = springPresets.fast,
  delay: number = 0
): number => {
  if (frame < delay) return 0;
  return spring({
    frame: frame - delay,
    fps,
    config,
  });
};

// Helper for staggered animations (simplified - words only, no characters)
export const getStaggeredSpring = (
  frame: number,
  fps: number,
  index: number,
  staggerDelay: number = 2,
  config: SpringConfig = springPresets.fast
): number => {
  const delay = index * staggerDelay;
  if (frame < delay) return 0;
  return spring({
    frame: frame - delay,
    fps,
    config,
  });
};

// SIMPLIFIED Ken Burns - subtle movement only, no rotation
export const getKenBurnsTransform = (
  frame: number,
  durationInFrames: number,
  config: MotionConfig["camera"]
): { scale: number; translateX: number; translateY: number } => {
  const progress = frame / durationInFrames;
  const eased = easeOutQuad(progress);

  return {
    scale: config.zoom_start + (config.zoom_end - config.zoom_start) * eased,
    translateX: config.pan_x * 2 * eased,
    translateY: config.pan_y * 2 * eased,
  };
};

// SIMPLIFIED easing - just one smooth easing function
export const easeOutQuad = (t: number): number => {
  return 1 - (1 - t) * (1 - t);
};

// Legacy easing functions (for compatibility)
export const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const easeOutExpo = (t: number): number => {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
};

export const easeInOutQuart = (t: number): number => {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
};

// Color utilities
export const hexToRgba = (hex: string, alpha: number = 1): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(0, 0, 0, ${alpha})`;
  return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
};

// Random seeded generator for consistent particles
export const seededRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};
