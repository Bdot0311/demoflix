import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig, interpolate, AbsoluteFill } from "remotion";
import { seededRandom } from "../../lib/animations";

interface GradientBackgroundProps {
  colors?: string[];
  angle?: number;
  animate?: boolean;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  colors = ["#0a0a0f", "#1a1a2e", "#0a0a0f"],
  angle = 135,
  animate = true,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const animatedAngle = animate
    ? angle + interpolate(frame, [0, durationInFrames], [0, 30], { extrapolateRight: "clamp" })
    : angle;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${animatedAngle}deg, ${colors.join(", ")})`,
      }}
    />
  );
};

// Lightweight particle field — reduced count, no willChange
interface ParticleFieldProps {
  count?: number;
  color?: string;
  minSize?: number;
  maxSize?: number;
  speed?: number;
}

export const ParticleField: React.FC<ParticleFieldProps> = ({
  count = 20,
  color = "rgba(139, 92, 246, 0.3)",
  minSize = 2,
  maxSize = 5,
  speed = 0.5,
}) => {
  const frame = useCurrentFrame();

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: seededRandom(i * 1) * 100,
      y: seededRandom(i * 2) * 100,
      size: minSize + seededRandom(i * 3) * (maxSize - minSize),
      speedMultiplier: 0.5 + seededRandom(i * 4) * 1,
      opacity: 0.3 + seededRandom(i * 5) * 0.5,
    }));
  }, [count, minSize, maxSize]);

  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      {particles.map((particle) => {
        const yOffset = (frame * speed * particle.speedMultiplier) % 120;
        const y = particle.y - yOffset + (yOffset > particle.y ? 120 : 0);

        return (
          <div
            key={particle.id}
            style={{
              position: "absolute",
              left: `${particle.x}%`,
              top: `${y}%`,
              width: particle.size,
              height: particle.size,
              borderRadius: "50%",
              backgroundColor: color,
              opacity: particle.opacity,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// Simplified glow orbs — uses opacity instead of blur filter
interface GlowOrbsProps {
  count?: number;
  colors?: string[];
  minSize?: number;
  maxSize?: number;
}

export const GlowOrbs: React.FC<GlowOrbsProps> = ({
  count = 3,
  colors = ["#8B5CF6", "#06B6D4", "#F59E0B"],
  minSize = 200,
  maxSize = 400,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const orbs = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 20 + seededRandom(i * 10) * 60,
      y: 20 + seededRandom(i * 11) * 60,
      size: minSize + seededRandom(i * 12) * (maxSize - minSize),
      color: colors[i % colors.length],
      speed: 0.5 + seededRandom(i * 13) * 0.5,
    }));
  }, [count, colors, minSize, maxSize]);

  return (
    <AbsoluteFill style={{ overflow: "hidden", pointerEvents: "none" }}>
      {orbs.map((orb) => {
        const progress = (frame / durationInFrames) * orb.speed;
        const xOffset = Math.sin(progress * Math.PI * 2) * 5;
        const yOffset = Math.cos(progress * Math.PI * 2) * 5;

        return (
          <div
            key={orb.id}
            style={{
              position: "absolute",
              left: `${orb.x + xOffset}%`,
              top: `${orb.y + yOffset}%`,
              width: orb.size,
              height: orb.size,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${orb.color}30 0%, transparent 70%)`,
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

interface GridLinesProps {
  spacing?: number;
  color?: string;
  opacity?: number;
}

export const GridLines: React.FC<GridLinesProps> = ({
  spacing = 60,
  color = "#8B5CF6",
  opacity = 0.05,
}) => {
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `
          linear-gradient(${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 1px, transparent 1px),
          linear-gradient(90deg, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 1px, transparent 1px)
        `,
        backgroundSize: `${spacing}px ${spacing}px`,
        pointerEvents: "none",
      }}
    />
  );
};

// Combined animated background — "full" mode now skips particles for Lambda perf
interface AnimatedBackgroundProps {
  type?: "gradient" | "particles" | "grid" | "orbs" | "full";
  colors?: string[];
  brandColor?: string;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  type = "full",
  colors,
  brandColor = "#8B5CF6",
}) => {
  const gradientColors = colors || ["#0a0a0f", "#1a1a2e", "#0a0a0f"];
  
  return (
    <AbsoluteFill>
      {(type === "gradient" || type === "full") && (
        <GradientBackground colors={gradientColors} />
      )}
      {(type === "orbs" || type === "full") && (
        <GlowOrbs colors={[brandColor, "#06B6D4", "#F59E0B"]} count={2} />
      )}
      {type === "particles" && (
        <ParticleField color={`${brandColor}40`} count={15} />
      )}
      {(type === "grid" || type === "full") && (
        <GridLines color={brandColor} opacity={0.03} />
      )}
    </AbsoluteFill>
  );
};
