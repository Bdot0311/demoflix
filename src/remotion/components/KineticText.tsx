import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { getStaggeredSpring, springPresets, MotionConfig } from "../lib/animations";

// All supported animation styles
export type AnimationStyle = 
  | "bounce-in" 
  | "typewriter" 
  | "slide-mask" 
  | "fade-scale" 
  | "word-stagger"
  | "line-reveal"
  | "blur-in"
  | "scale-pop";

interface KineticTextProps {
  text: string;
  style?: AnimationStyle;
  className?: string;
  fontSize?: number;
  color?: string;
  springConfig?: typeof springPresets.bouncy;
  staggerDelay?: number;
  entranceDelay?: number;
}

export const KineticText: React.FC<KineticTextProps> = ({
  text,
  style = "line-reveal", // Default to fast line-reveal
  className = "",
  fontSize = 72,
  color = "white",
  springConfig = springPresets.crisp, // Use fast crisp preset
  staggerDelay = 1, // Faster stagger
  entranceDelay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - entranceDelay);

  // NEW: Line Reveal - Fast horizontal mask wipe (Netflix-style)
  if (style === "line-reveal") {
    const progress = spring({
      frame: adjustedFrame,
      fps,
      config: springPresets.crisp,
    });
    const clipAmount = interpolate(progress, [0, 1], [100, 0]);
    
    return (
      <div 
        className={className}
        style={{ 
          willChange: "clip-path",
        }}
      >
        <h1
          style={{
            fontSize,
            color,
            fontWeight: 800,
            clipPath: `inset(0 ${clipAmount}% 0 0)`,
            textShadow: "0 4px 30px rgba(0,0,0,0.5)",
          }}
        >
          {text}
        </h1>
      </div>
    );
  }

  // NEW: Blur In - Start blurred, sharpen on reveal
  if (style === "blur-in") {
    const progress = spring({
      frame: adjustedFrame,
      fps,
      config: springPresets.cinematic,
    });
    const blur = interpolate(progress, [0, 1], [20, 0]);
    const opacity = interpolate(progress, [0, 1], [0, 1]);
    const scale = interpolate(progress, [0, 1], [1.1, 1]);
    
    return (
      <div 
        className={className}
        style={{ 
          willChange: "filter, opacity, transform",
        }}
      >
        <h1
          style={{
            fontSize,
            color,
            fontWeight: 800,
            filter: `blur(${blur}px)`,
            opacity,
            transform: `scale(${scale})`,
            textShadow: "0 4px 30px rgba(0,0,0,0.5)",
          }}
        >
          {text}
        </h1>
      </div>
    );
  }

  // NEW: Scale Pop - Quick pop with subtle bounce
  if (style === "scale-pop") {
    const progress = spring({
      frame: adjustedFrame,
      fps,
      config: springPresets.punch,
    });
    const scale = interpolate(progress, [0, 1], [0.3, 1]);
    const opacity = interpolate(progress, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
    
    return (
      <div 
        className={className}
        style={{ 
          willChange: "transform, opacity",
        }}
      >
        <h1
          style={{
            fontSize,
            color,
            fontWeight: 800,
            transform: `scale(${scale})`,
            opacity,
            textShadow: "0 4px 30px rgba(0,0,0,0.5)",
          }}
        >
          {text}
        </h1>
      </div>
    );
  }

  // Word Stagger - Optimized with fewer calculations
  if (style === "word-stagger") {
    const words = text.split(" ");
    return (
      <div className={`flex flex-wrap justify-center gap-4 ${className}`}>
        {words.map((word, wordIndex) => {
          const progress = getStaggeredSpring(
            adjustedFrame,
            fps,
            wordIndex,
            staggerDelay * 2, // Faster stagger
            springPresets.crisp
          );
          const opacity = interpolate(progress, [0, 1], [0, 1]);
          const translateY = interpolate(progress, [0, 1], [30, 0]); // Smaller movement
          const scale = interpolate(progress, [0, 1], [0.9, 1]);

          return (
            <span
              key={wordIndex}
              style={{
                fontSize,
                color,
                fontWeight: 800,
                opacity,
                transform: `translateY(${translateY}px) scale(${scale})`,
                display: "inline-block",
                textShadow: "0 4px 30px rgba(0,0,0,0.5)",
                willChange: "transform, opacity",
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    );
  }

  if (style === "typewriter") {
    const characters = text.split("");
    const visibleCount = Math.floor(
      interpolate(adjustedFrame, [0, characters.length * 2], [0, characters.length], {
        extrapolateRight: "clamp",
      })
    );

    return (
      <div className={className}>
        <span
          style={{
            fontSize,
            color,
            fontWeight: 800,
            textShadow: "0 4px 30px rgba(0,0,0,0.5)",
          }}
        >
          {characters.slice(0, visibleCount).join("")}
          <span
            style={{
              opacity: adjustedFrame % 20 < 10 ? 1 : 0,
              marginLeft: 2,
            }}
          >
            |
          </span>
        </span>
      </div>
    );
  }

  if (style === "slide-mask") {
    const progress = getStaggeredSpring(adjustedFrame, fps, 0, 0, springPresets.snappy);
    const maskPosition = interpolate(progress, [0, 1], [100, 0]);

    return (
      <div className={className} style={{ overflow: "hidden" }}>
        <div
          style={{
            fontSize,
            color,
            fontWeight: 800,
            transform: `translateX(${-maskPosition}%)`,
            textShadow: "0 4px 30px rgba(0,0,0,0.5)",
          }}
        >
          {text}
        </div>
      </div>
    );
  }

  if (style === "fade-scale") {
    const progress = getStaggeredSpring(adjustedFrame, fps, 0, 0, springPresets.smooth);
    const opacity = interpolate(progress, [0, 1], [0, 1]);
    const scale = interpolate(progress, [0, 1], [0.5, 1]);

    return (
      <div
        className={className}
        style={{
          fontSize,
          color,
          fontWeight: 800,
          opacity,
          transform: `scale(${scale})`,
          textShadow: "0 4px 30px rgba(0,0,0,0.5)",
        }}
      >
        {text}
      </div>
    );
  }

  // Default: bounce-in (character by character)
  const characters = text.split("");

  return (
    <div className={`flex justify-center ${className}`}>
      {characters.map((char, index) => {
        const progress = getStaggeredSpring(
          adjustedFrame,
          fps,
          index,
          staggerDelay,
          springConfig
        );
        const opacity = interpolate(progress, [0, 1], [0, 1]);
        const translateY = interpolate(progress, [0, 1], [50, 0]);
        const scale = interpolate(progress, [0, 1], [0.3, 1]);
        const rotate = interpolate(progress, [0, 1], [-15, 0]);

        return (
          <span
            key={index}
            style={{
              fontSize,
              color,
              fontWeight: 800,
              opacity,
              transform: `translateY(${translateY}px) scale(${scale}) rotate(${rotate}deg)`,
              display: "inline-block",
              textShadow: "0 4px 30px rgba(0,0,0,0.5)",
              whiteSpace: char === " " ? "pre" : "normal",
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        );
      })}
    </div>
  );
};

// Subtext component with simpler animation
export const SubText: React.FC<{
  text: string;
  delay?: number;
  fontSize?: number;
  color?: string;
}> = ({ text, delay = 20, fontSize = 28, color = "rgba(255,255,255,0.8)" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = getStaggeredSpring(frame, fps, 0, 0, springPresets.gentle);
  const adjustedProgress = frame >= delay ? progress : 0;

  const opacity = interpolate(adjustedProgress, [0, 1], [0, 1]);
  const translateY = interpolate(adjustedProgress, [0, 1], [20, 0]);

  return (
    <p
      style={{
        fontSize,
        color,
        opacity: frame >= delay ? opacity : 0,
        transform: `translateY(${translateY}px)`,
        fontWeight: 500,
        letterSpacing: "0.05em",
        textShadow: "0 2px 20px rgba(0,0,0,0.3)",
      }}
    >
      {text}
    </p>
  );
};
