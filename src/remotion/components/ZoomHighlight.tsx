import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  AbsoluteFill,
  Img,
} from "remotion";
import { spring } from "remotion";

export interface ZoomTarget {
  x: number; // Percentage (0-100) from left
  y: number; // Percentage (0-100) from top
  scale: number; // Zoom scale (e.g., 2 = 200%)
  startFrame: number;
  endFrame: number;
}

interface ZoomHighlightProps {
  imageUrl: string;
  targets: ZoomTarget[];
  highlightColor?: string;
  showSpotlight?: boolean;
}

export const ZoomHighlight: React.FC<ZoomHighlightProps> = ({
  imageUrl,
  targets,
  highlightColor = "#8B5CF6",
  showSpotlight = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Find active zoom target
  const activeTarget = targets.find(
    (t) => frame >= t.startFrame && frame <= t.endFrame
  );

  // Calculate transition values
  let scale = 1;
  let translateX = 0;
  let translateY = 0;

  if (activeTarget) {
    const { x, y, scale: targetScale, startFrame, endFrame } = activeTarget;
    const duration = endFrame - startFrame;
    const enterDuration = Math.min(20, duration / 3);
    const exitDuration = Math.min(20, duration / 3);

    // Enter animation
    if (frame < startFrame + enterDuration) {
      const progress = spring({
        frame: frame - startFrame,
        fps,
        config: { damping: 20, mass: 1, stiffness: 100 },
      });
      scale = interpolate(progress, [0, 1], [1, targetScale]);
      translateX = interpolate(progress, [0, 1], [0, 50 - x]);
      translateY = interpolate(progress, [0, 1], [0, 50 - y]);
    }
    // Exit animation
    else if (frame > endFrame - exitDuration) {
      const exitFrame = frame - (endFrame - exitDuration);
      const progress = spring({
        frame: exitFrame,
        fps,
        config: { damping: 20, mass: 1, stiffness: 100 },
      });
      scale = interpolate(progress, [0, 1], [targetScale, 1]);
      translateX = interpolate(progress, [0, 1], [50 - x, 0]);
      translateY = interpolate(progress, [0, 1], [50 - y, 0]);
    }
    // Hold
    else {
      scale = targetScale;
      translateX = 50 - x;
      translateY = 50 - y;
    }
  }

  return (
    <AbsoluteFill>
      {/* Zoomed image */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
          transformOrigin: "center center",
        }}
      >
        {imageUrl && (
          <Img
            src={imageUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}
      </div>

      {/* Spotlight/vignette effect during zoom */}
      {showSpotlight && activeTarget && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle at ${activeTarget.x}% ${activeTarget.y}%, transparent 20%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.7) 100%)`,
            opacity: interpolate(scale, [1, 2], [0, 0.6], {
              extrapolateRight: "clamp",
            }),
            pointerEvents: "none",
          }}
        />
      )}

      {/* Highlight ring during zoom */}
      {activeTarget && scale > 1.2 && (
        <div
          style={{
            position: "absolute",
            left: `${activeTarget.x}%`,
            top: `${activeTarget.y}%`,
            transform: "translate(-50%, -50%)",
            width: 150 / scale,
            height: 150 / scale,
            borderRadius: "50%",
            border: `3px solid ${highlightColor}`,
            boxShadow: `0 0 40px ${highlightColor}50`,
            opacity: interpolate(scale, [1.2, 1.8], [0, 0.8], {
              extrapolateRight: "clamp",
            }),
            pointerEvents: "none",
          }}
        />
      )}
    </AbsoluteFill>
  );
};

// Feature callout box
interface CalloutBoxProps {
  x: number; // Percentage
  y: number; // Percentage
  text: string;
  delay?: number;
  color?: string;
}

export const CalloutBox: React.FC<CalloutBoxProps> = ({
  x,
  y,
  text,
  delay = 0,
  color = "#8B5CF6",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < delay) return null;

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, mass: 0.8, stiffness: 150 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const scale = interpolate(progress, [0, 1], [0.5, 1]);
  const translateY = interpolate(progress, [0, 1], [20, 0]);

  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%) scale(${scale}) translateY(${translateY}px)`,
        opacity,
        zIndex: 100,
      }}
    >
      {/* Connector line */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: "100%",
          width: 2,
          height: 30,
          background: `linear-gradient(to top, ${color}, transparent)`,
          marginBottom: 8,
        }}
      />
      
      {/* Callout box */}
      <div
        style={{
          background: "rgba(0,0,0,0.85)",
          border: `2px solid ${color}`,
          borderRadius: 12,
          padding: "12px 20px",
          boxShadow: `0 0 30px ${color}40, 0 8px 32px rgba(0,0,0,0.3)`,
          backdropFilter: "blur(10px)",
        }}
      >
        <p
          style={{
            color: "white",
            fontSize: 18,
            fontWeight: 600,
            margin: 0,
            whiteSpace: "nowrap",
            textShadow: `0 0 10px ${color}`,
          }}
        >
          {text}
        </p>
      </div>

      {/* Pulsing dot at the point */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: "calc(100% + 38px)",
          transform: "translateX(-50%)",
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 20px ${color}`,
        }}
      >
        {/* Pulse ring */}
        <div
          style={{
            position: "absolute",
            inset: -8,
            borderRadius: "50%",
            border: `2px solid ${color}`,
            opacity: 0.5,
            animation: "pulse 1.5s infinite",
          }}
        />
      </div>
    </div>
  );
};

// UI Highlight overlay (for highlighting buttons, inputs, etc.)
interface UIHighlightProps {
  x: number;
  y: number;
  width: number;
  height: number;
  delay?: number;
  duration?: number;
  color?: string;
  label?: string;
}

export const UIHighlight: React.FC<UIHighlightProps> = ({
  x,
  y,
  width,
  height,
  delay = 0,
  duration = 60,
  color = "#8B5CF6",
  label,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < delay || frame > delay + duration) return null;

  const localFrame = frame - delay;
  const enterDuration = 15;
  const exitDuration = 15;

  let opacity = 1;
  let scale = 1;

  if (localFrame < enterDuration) {
    const progress = spring({
      frame: localFrame,
      fps,
      config: { damping: 15, mass: 0.5, stiffness: 200 },
    });
    opacity = progress;
    scale = interpolate(progress, [0, 1], [1.1, 1]);
  } else if (localFrame > duration - exitDuration) {
    const exitFrame = localFrame - (duration - exitDuration);
    const progress = spring({
      frame: exitFrame,
      fps,
      config: { damping: 15, mass: 0.5, stiffness: 200 },
    });
    opacity = 1 - progress;
    scale = interpolate(progress, [0, 1], [1, 0.95]);
  }

  // Pulsing glow effect
  const pulsePhase = (localFrame / 20) % 1;
  const glowIntensity = 0.4 + Math.sin(pulsePhase * Math.PI * 2) * 0.2;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: "center center",
        zIndex: 50,
      }}
    >
      {/* Highlight border */}
      <div
        style={{
          position: "absolute",
          inset: -4,
          border: `3px solid ${color}`,
          borderRadius: 8,
          boxShadow: `0 0 ${20 * glowIntensity}px ${color}, inset 0 0 ${10 * glowIntensity}px ${color}20`,
        }}
      />

      {/* Corner accents */}
      {[
        { top: -4, left: -4 },
        { top: -4, right: -4 },
        { bottom: -4, left: -4 },
        { bottom: -4, right: -4 },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            ...pos,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 10px ${color}`,
          }}
        />
      ))}

      {/* Label */}
      {label && (
        <div
          style={{
            position: "absolute",
            top: -35,
            left: "50%",
            transform: "translateX(-50%)",
            background: color,
            color: "white",
            padding: "4px 12px",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 700,
            whiteSpace: "nowrap",
            boxShadow: `0 4px 12px ${color}60`,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};
