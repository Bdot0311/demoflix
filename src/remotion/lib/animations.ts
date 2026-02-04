import { z } from "zod";
import { SpringConfig, spring } from "remotion";

// Spring presets for different animation styles
export const springPresets: Record<string, SpringConfig> = {
  bouncy: { damping: 12, mass: 1, stiffness: 100, overshootClamping: false },
  snappy: { damping: 20, mass: 0.5, stiffness: 200, overshootClamping: false },
  smooth: { damping: 30, mass: 1, stiffness: 80, overshootClamping: true },
  gentle: { damping: 25, mass: 1.5, stiffness: 60, overshootClamping: false },
  elastic: { damping: 8, mass: 0.8, stiffness: 150, overshootClamping: false },
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

export const motionConfigSchema = z.object({
  animation_style: z.enum(["bounce-in", "typewriter", "slide-mask", "fade-scale", "word-stagger"]),
  spring: springConfigSchema,
  stagger_delay_frames: z.number(),
  entrance_delay_frames: z.number(),
  effects: z.array(z.enum(["particles", "vignette", "glow", "scanlines"])),
  camera: cameraConfigSchema,
});

export const sceneDataSchema = z.object({
  id: z.string(),
  headline: z.string(),
  subtext: z.string(),
  imageUrl: z.string(),
  durationInFrames: z.number(),
  motionConfig: motionConfigSchema,
  transition: z.enum(["fade", "slide-left", "slide-right", "zoom", "none"]),
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

// Default motion config
export const defaultMotionConfig: MotionConfig = {
  animation_style: "bounce-in",
  spring: springPresets.bouncy,
  stagger_delay_frames: 2,
  entrance_delay_frames: 10,
  effects: ["vignette", "glow"],
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
  config: SpringConfig = springPresets.bouncy,
  delay: number = 0
): number => {
  if (frame < delay) return 0;
  return spring({
    frame: frame - delay,
    fps,
    config,
  });
};

// Helper for staggered animations (characters/words)
export const getStaggeredSpring = (
  frame: number,
  fps: number,
  index: number,
  staggerDelay: number = 2,
  config: SpringConfig = springPresets.bouncy
): number => {
  const delay = index * staggerDelay;
  if (frame < delay) return 0;
  return spring({
    frame: frame - delay,
    fps,
    config,
  });
};

// Ken Burns effect calculator
export const getKenBurnsTransform = (
  frame: number,
  durationInFrames: number,
  config: MotionConfig["camera"]
): { scale: number; translateX: number; translateY: number } => {
  const progress = frame / durationInFrames;
  const eased = easeInOutCubic(progress);

  return {
    scale: config.zoom_start + (config.zoom_end - config.zoom_start) * eased,
    translateX: config.pan_x * eased,
    translateY: config.pan_y * eased,
  };
};

// Easing functions
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
