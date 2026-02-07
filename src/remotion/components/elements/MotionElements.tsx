import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img } from "remotion";
import { springPresets } from "../../lib/animations";

// Stat Counter - Animated number counting
interface StatCounterProps {
  value: string;
  label: string;
  delay?: number;
  color?: string;
  brandColor?: string;
}

export const StatCounter: React.FC<StatCounterProps> = ({
  value,
  label,
  delay = 0,
  color = "white",
  brandColor = "#8B5CF6",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: springPresets.smooth,
  });

  // Extract numeric part and suffix
  const numericMatch = value.match(/^([\d,.]+)(.*)$/);
  const numericValue = numericMatch ? parseFloat(numericMatch[1].replace(/,/g, "")) : 0;
  const suffix = numericMatch ? numericMatch[2] : value;

  const displayValue = Math.floor(numericValue * progress);
  const formattedValue = displayValue.toLocaleString() + suffix;

  const scale = interpolate(progress, [0, 1], [0.8, 1]);
  const y = interpolate(progress, [0, 1], [30, 0]);

  return (
    <div
      style={{
        textAlign: "center",
        transform: `scale(${scale}) translateY(${y}px)`,
        opacity: progress,
        willChange: "transform, opacity",
      }}
    >
      <div
        style={{
          fontSize: 96,
          fontWeight: 900,
          color: brandColor,
          textShadow: `0 0 60px ${brandColor}60`,
          letterSpacing: "-0.02em",
        }}
      >
        {numericMatch ? formattedValue : value}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 500,
          color,
          opacity: 0.8,
          marginTop: 8,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {label}
      </div>
    </div>
  );
};

// Feature Card with icon placeholder
interface FeatureCardProps {
  title: string;
  description?: string;
  icon?: string;
  delay?: number;
  brandColor?: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon,
  delay = 0,
  brandColor = "#8B5CF6",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: springPresets.fast,
  });

  const scale = interpolate(progress, [0, 1], [0.9, 1]);
  const y = interpolate(progress, [0, 1], [40, 0]);

  return (
    <div
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderRadius: 24,
        padding: 40,
        border: `1px solid rgba(255, 255, 255, 0.1)`,
        transform: `scale(${scale}) translateY(${y}px)`,
        opacity: progress,
        backdropFilter: "blur(20px)",
        maxWidth: 400,
        willChange: "transform, opacity",
      }}
    >
      {/* Icon placeholder */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: `linear-gradient(135deg, ${brandColor}, ${brandColor}80)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          fontSize: 32,
        }}
      >
        {icon || "✨"}
      </div>
      <h3
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "white",
          marginBottom: 12,
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontSize: 18,
            color: "rgba(255, 255, 255, 0.7)",
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
};

// Testimonial Card
interface TestimonialCardProps {
  quote: string;
  author?: string;
  role?: string;
  company?: string;
  avatar?: string;
  delay?: number;
  brandColor?: string;
}

export const TestimonialCard: React.FC<TestimonialCardProps> = ({
  quote,
  author,
  role,
  company,
  avatar,
  delay = 0,
  brandColor = "#8B5CF6",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: springPresets.smooth,
  });

  const scale = interpolate(progress, [0, 1], [0.95, 1]);
  const y = interpolate(progress, [0, 1], [20, 0]);

  return (
    <div
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        borderRadius: 32,
        padding: 48,
        border: `1px solid rgba(255, 255, 255, 0.08)`,
        transform: `scale(${scale}) translateY(${y}px)`,
        opacity: progress,
        maxWidth: 700,
        willChange: "transform, opacity",
      }}
    >
      {/* Quote marks */}
      <div
        style={{
          fontSize: 72,
          color: brandColor,
          opacity: 0.3,
          lineHeight: 1,
          marginBottom: -20,
        }}
      >
        "
      </div>
      <p
        style={{
          fontSize: 28,
          color: "white",
          fontStyle: "italic",
          lineHeight: 1.6,
          marginBottom: 32,
        }}
      >
        {quote}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Avatar */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${brandColor}, ${brandColor}60)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {avatar ? (
            <Img src={avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 24, color: "white" }}>
              {author?.[0] || "?"}
            </span>
          )}
        </div>
        <div>
          {author && (
            <div style={{ fontSize: 20, fontWeight: 600, color: "white" }}>
              {author}
            </div>
          )}
          {(role || company) && (
            <div style={{ fontSize: 16, color: "rgba(255, 255, 255, 0.6)" }}>
              {role}{role && company ? " at " : ""}{company}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// CTA Button graphic
interface CTAButtonProps {
  text: string;
  delay?: number;
  brandColor?: string;
}

export const CTAButton: React.FC<CTAButtonProps> = ({
  text,
  delay = 0,
  brandColor = "#8B5CF6",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: springPresets.bounce,
  });

  // Pulsing glow effect
  const pulseIntensity = 0.3 + Math.sin((frame / 10) * Math.PI) * 0.2;

  const scale = interpolate(progress, [0, 1], [0.5, 1]);
  const y = interpolate(progress, [0, 1], [50, 0]);

  return (
    <div
      style={{
        transform: `scale(${scale}) translateY(${y}px)`,
        opacity: progress,
        willChange: "transform, opacity",
      }}
    >
      <div
        style={{
          background: `linear-gradient(135deg, ${brandColor}, #06B6D4)`,
          borderRadius: 16,
          padding: "24px 64px",
          fontSize: 32,
          fontWeight: 700,
          color: "white",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          boxShadow: `0 0 ${60 * pulseIntensity}px ${brandColor}80, 0 20px 60px rgba(0,0,0,0.5)`,
          border: "1px solid rgba(255, 255, 255, 0.2)",
        }}
      >
        {text}
      </div>
    </div>
  );
};

// Icon with animation
interface AnimatedIconProps {
  emoji: string;
  delay?: number;
  size?: number;
}

export const AnimatedIcon: React.FC<AnimatedIconProps> = ({
  emoji,
  delay = 0,
  size = 64,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: springPresets.bounce,
  });

  const scale = interpolate(progress, [0, 1], [0, 1]);
  const rotate = interpolate(progress, [0, 1], [-180, 0]);

  return (
    <div
      style={{
        fontSize: size,
        transform: `scale(${scale}) rotate(${rotate}deg)`,
        opacity: progress,
        willChange: "transform, opacity",
      }}
    >
      {emoji}
    </div>
  );
};

// Stats Grid - Multiple stats in a row
interface StatsGridProps {
  stats: Array<{ value: string; label: string }>;
  delay?: number;
  brandColor?: string;
}

export const StatsGrid: React.FC<StatsGridProps> = ({
  stats,
  delay = 0,
  brandColor = "#8B5CF6",
}) => {
  return (
    <div
      style={{
        display: "flex",
        gap: 80,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {stats.slice(0, 3).map((stat, index) => (
        <StatCounter
          key={index}
          value={stat.value}
          label={stat.label}
          delay={delay + index * 8}
          brandColor={brandColor}
        />
      ))}
    </div>
  );
};

// Feature Grid - Multiple features
interface FeatureGridProps {
  features: Array<{ title: string; description?: string; icon?: string }>;
  delay?: number;
  brandColor?: string;
}

// Remotion may attach refs to children in some layouts; forwardRef prevents dev-mode
// ref warnings that can spam the console during playback and cause jank.
export const FeatureGrid = React.forwardRef<HTMLDivElement, FeatureGridProps>((
  { features, delay = 0, brandColor = "#8B5CF6" },
  ref
) => {
  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        gap: 32,
        justifyContent: "center",
        flexWrap: "wrap",
        maxWidth: 1400,
      }}
    >
      {features.slice(0, 3).map((feature, index) => (
        <FeatureCard
          key={index}
          title={feature.title}
          description={feature.description}
          icon={feature.icon}
          delay={delay + index * 6}
          brandColor={brandColor}
        />
      ))}
    </div>
  );
});
FeatureGrid.displayName = "FeatureGrid";

