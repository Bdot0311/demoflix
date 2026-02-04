import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { seededRandom, hexToRgba } from "../lib/animations";

// Floating particles effect
interface ParticlesProps {
  count?: number;
  color?: string;
  seed?: number;
}

export const FloatingParticles: React.FC<ParticlesProps> = ({
  count = 30,
  color = "rgba(255, 255, 255, 0.15)",
  seed = 42,
}) => {
  const frame = useCurrentFrame();
  const { height, durationInFrames } = useVideoConfig();

  const particles = React.useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: seededRandom(seed + i * 100) * 100,
      size: 2 + seededRandom(seed + i * 200) * 6,
      speed: 0.5 + seededRandom(seed + i * 300) * 1.5,
      delay: seededRandom(seed + i * 400) * 60,
      opacity: 0.1 + seededRandom(seed + i * 500) * 0.3,
    }));
  }, [count, seed]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => {
        const adjustedFrame = Math.max(0, frame - particle.delay);
        const yProgress = (adjustedFrame * particle.speed) % (height + 50);
        const y = height - yProgress;
        const fadeIn = interpolate(adjustedFrame, [0, 20], [0, 1], {
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={particle.id}
            style={{
              position: "absolute",
              left: `${particle.x}%`,
              top: y,
              width: particle.size,
              height: particle.size,
              borderRadius: "50%",
              backgroundColor: color,
              opacity: particle.opacity * fadeIn,
              boxShadow: `0 0 ${particle.size * 2}px ${color}`,
            }}
          />
        );
      })}
    </div>
  );
};

// Vignette effect
interface VignetteProps {
  intensity?: number;
  color?: string;
}

export const Vignette: React.FC<VignetteProps> = ({
  intensity = 0.7,
  color = "black",
}) => {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `radial-gradient(ellipse at center, transparent 0%, transparent 40%, ${hexToRgba(color === "black" ? "#000000" : color, intensity)} 100%)`,
      }}
    />
  );
};

// Glow effect behind text
interface GlowEffectProps {
  color?: string;
  intensity?: number;
  animated?: boolean;
}

export const GlowEffect: React.FC<GlowEffectProps> = ({
  color = "#8B5CF6",
  intensity = 0.4,
  animated = true,
}) => {
  const frame = useCurrentFrame();
  const pulseIntensity = animated
    ? intensity * (0.8 + 0.2 * Math.sin(frame * 0.1))
    : intensity;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `radial-gradient(ellipse at center, ${hexToRgba(color, pulseIntensity)} 0%, transparent 60%)`,
      }}
    />
  );
};

// Scan lines overlay (retro/Netflix effect)
interface ScanLinesProps {
  opacity?: number;
  lineHeight?: number;
}

export const ScanLines: React.FC<ScanLinesProps> = ({
  opacity = 0.03,
  lineHeight = 2,
}) => {
  const frame = useCurrentFrame();
  const offset = (frame * 0.5) % lineHeight;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `repeating-linear-gradient(
          0deg,
          rgba(0, 0, 0, ${opacity}),
          rgba(0, 0, 0, ${opacity}) 1px,
          transparent 1px,
          transparent ${lineHeight}px
        )`,
        backgroundPosition: `0 ${offset}px`,
      }}
    />
  );
};

// Gradient overlay (cinematic color grading)
interface GradientOverlayProps {
  colors?: string[];
  direction?: string;
  opacity?: number;
}

export const GradientOverlay: React.FC<GradientOverlayProps> = ({
  colors = ["#8B5CF6", "#06B6D4"],
  direction = "135deg",
  opacity = 0.15,
}) => {
  return (
    <div
      className="absolute inset-0 pointer-events-none mix-blend-overlay"
      style={{
        background: `linear-gradient(${direction}, ${colors.join(", ")})`,
        opacity,
      }}
    />
  );
};

// Animated accent line (underline for headlines)
interface AccentLineProps {
  delay?: number;
  color?: string;
  width?: string;
  height?: number;
}

export const AccentLine: React.FC<AccentLineProps> = ({
  delay = 30,
  color = "linear-gradient(90deg, #8B5CF6, #06B6D4)",
  width = "60%",
  height = 4,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = interpolate(frame - delay, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scaleX = progress;
  const opacity = progress;

  return (
    <div
      style={{
        width,
        height,
        background: color,
        borderRadius: height / 2,
        transform: `scaleX(${scaleX})`,
        transformOrigin: "center",
        opacity,
        boxShadow: `0 0 20px ${color.includes("gradient") ? "#8B5CF6" : color}`,
      }}
    />
  );
};

// Progress ring (scene timer)
interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 48,
  strokeWidth = 3,
  color = "#8B5CF6",
  backgroundColor = "rgba(255,255,255,0.2)",
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        stroke={backgroundColor}
        fill="transparent"
        strokeWidth={strokeWidth}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        stroke={color}
        fill="transparent"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        r={radius}
        cx={size / 2}
        cy={size / 2}
        style={{
          transition: "stroke-dashoffset 0.1s ease",
        }}
      />
    </svg>
  );
};

// Film grain overlay
interface FilmGrainProps {
  intensity?: number;
}

export const FilmGrain: React.FC<FilmGrainProps> = ({ intensity = 0.05 }) => {
  const frame = useCurrentFrame();
  // Use frame to create pseudo-random noise effect
  const seed = frame * 12345;

  return (
    <div
      className="absolute inset-0 pointer-events-none mix-blend-overlay"
      style={{
        opacity: intensity,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' seed='${seed % 100}' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }}
    />
  );
};
