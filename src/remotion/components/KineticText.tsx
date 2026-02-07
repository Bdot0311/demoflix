import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { springPresets } from "../lib/animations";

// SIMPLIFIED: Only 3 core animation styles for performance
export type AnimationStyle = "fade-scale" | "slide" | "zoom";

// Legacy style mapping for backwards compatibility
const mapLegacyStyle = (style: string): AnimationStyle => {
  switch (style) {
    case "line-reveal":
    case "slide-mask":
    case "word-stagger":
      return "slide";
    case "blur-in":
    case "scale-pop":
    case "zoom":
      return "zoom";
    case "fade-scale":
    case "bounce-in":
    case "typewriter":
    default:
      return "fade-scale";
  }
};

interface KineticTextProps {
  text: string;
  style?: AnimationStyle | string;
  className?: string;
  fontSize?: number;
  color?: string;
  springConfig?: typeof springPresets.fast;
  staggerDelay?: number;
  entranceDelay?: number;
}

export const KineticText: React.FC<KineticTextProps> = ({
  text,
  style = "fade-scale",
  className = "",
  fontSize = 72,
  color = "white",
  springConfig = springPresets.fast,
  staggerDelay = 0,
  entranceDelay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - entranceDelay);
  
  // Map legacy styles to new simplified styles
  const resolvedStyle = mapLegacyStyle(style);

  // Pre-calculate spring value once per frame (memoized)
  const progress = useMemo(() => {
    return spring({
      frame: adjustedFrame,
      fps,
      config: springPresets.fast,
    });
  }, [adjustedFrame, fps]);

  // Common text styles
  const textStyle = useMemo(() => ({
    fontSize,
    color,
    fontWeight: 800 as const,
    textShadow: "0 4px 30px rgba(0,0,0,0.5)",
    willChange: "transform, opacity" as const,
  }), [fontSize, color]);

  // FADE-SCALE: Simple opacity + scale (default, fastest)
  if (resolvedStyle === "fade-scale") {
    const opacity = interpolate(progress, [0, 1], [0, 1]);
    const scale = interpolate(progress, [0, 1], [0.9, 1]);
    const translateY = interpolate(progress, [0, 1], [20, 0]);

    return (
      <div className={className}>
        <h1
          style={{
            ...textStyle,
            opacity,
            transform: `translateY(${translateY}px) scale(${scale})`,
          }}
        >
          {text}
        </h1>
      </div>
    );
  }

  // SLIDE: Horizontal slide reveal
  if (resolvedStyle === "slide") {
    const translateX = interpolate(progress, [0, 1], [50, 0]);
    const opacity = interpolate(progress, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });

    return (
      <div className={className} style={{ overflow: "hidden" }}>
        <h1
          style={{
            ...textStyle,
            opacity,
            transform: `translateX(${translateX}px)`,
          }}
        >
          {text}
        </h1>
      </div>
    );
  }

  // ZOOM: Scale from small with fade
  if (resolvedStyle === "zoom") {
    const scale = interpolate(progress, [0, 1], [0.5, 1]);
    const opacity = interpolate(progress, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });

    return (
      <div className={className}>
        <h1
          style={{
            ...textStyle,
            opacity,
            transform: `scale(${scale})`,
          }}
        >
          {text}
        </h1>
      </div>
    );
  }

  // Fallback to fade-scale
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  return (
    <div className={className}>
      <h1 style={{ ...textStyle, opacity }}>
        {text}
      </h1>
    </div>
  );
};

// SIMPLIFIED SubText component
export const SubText: React.FC<{
  text: string;
  delay?: number;
  fontSize?: number;
  color?: string;
}> = ({ text, delay = 15, fontSize = 28, color = "rgba(255,255,255,0.8)" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  const progress = useMemo(() => {
    if (frame < delay) return 0;
    return spring({
      frame: adjustedFrame,
      fps,
      config: springPresets.fast,
    });
  }, [frame, delay, adjustedFrame, fps]);

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const translateY = interpolate(progress, [0, 1], [15, 0]);

  return (
    <p
      style={{
        fontSize,
        color,
        opacity,
        transform: `translateY(${translateY}px)`,
        fontWeight: 500,
        letterSpacing: "0.05em",
        textShadow: "0 2px 20px rgba(0,0,0,0.3)",
        willChange: "transform, opacity",
      }}
    >
      {text}
    </p>
  );
};
