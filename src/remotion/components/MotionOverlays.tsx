import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { hexToRgba } from "../lib/animations";

// SIMPLIFIED Vignette - CSS only, no props recalculation
interface VignetteProps {
  intensity?: number;
}

export const Vignette: React.FC<VignetteProps> = ({ intensity = 0.6 }) => {
  const style = useMemo(() => ({
    position: "absolute" as const,
    inset: 0,
    pointerEvents: "none" as const,
    background: `radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0,0,0,${intensity}) 100%)`,
  }), [intensity]);

  return <div style={style} />;
};

// SIMPLIFIED Gradient overlay - static, no per-frame updates
interface GradientOverlayProps {
  colors?: string[];
  direction?: string;
  opacity?: number;
}

export const GradientOverlay: React.FC<GradientOverlayProps> = ({
  colors = ["#8B5CF6", "#06B6D4"],
  direction = "135deg",
  opacity = 0.1,
}) => {
  const style = useMemo(() => ({
    position: "absolute" as const,
    inset: 0,
    pointerEvents: "none" as const,
    mixBlendMode: "overlay" as const,
    background: `linear-gradient(${direction}, ${colors.join(", ")})`,
    opacity,
  }), [colors, direction, opacity]);

  return <div style={style} />;
};

// SIMPLIFIED Film grain - STATIC seed, no per-frame updates
interface FilmGrainProps {
  intensity?: number;
}

export const FilmGrain: React.FC<FilmGrainProps> = ({ intensity = 0.03 }) => {
  // Static grain - no frame-based updates for performance
  const style = useMemo(() => ({
    position: "absolute" as const,
    inset: 0,
    pointerEvents: "none" as const,
    mixBlendMode: "overlay" as const,
    opacity: intensity,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' seed='42' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
  }), [intensity]);

  return <div style={style} />;
};

// SIMPLIFIED Accent line - faster animation
interface AccentLineProps {
  delay?: number;
  color?: string;
  width?: string;
  height?: number;
}

export const AccentLine: React.FC<AccentLineProps> = ({
  delay = 20,
  color = "#8B5CF6",
  width = "60%",
  height = 3,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);

  const progress = interpolate(adjustedFrame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });

  const style = useMemo(() => ({
    width,
    height,
    background: color,
    borderRadius: height / 2,
    transform: `scaleX(${progress})`,
    transformOrigin: "center",
    opacity: progress,
    boxShadow: `0 0 15px ${color}`,
  }), [width, height, color, progress]);

  return <div style={style} />;
};

// REMOVED: FloatingParticles, ScanLines, GlowEffect, ProgressRing
// These caused performance issues and are not needed for clean trailers

// Legacy exports for backwards compatibility (render as nothing)
export const FloatingParticles: React.FC<{ count?: number; color?: string; seed?: number }> = () => null;
export const ScanLines: React.FC<{ opacity?: number; lineHeight?: number }> = () => null;
export const GlowEffect: React.FC<{ color?: string; intensity?: number; animated?: boolean }> = () => null;
export const ProgressRing: React.FC<{
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
}> = () => null;
