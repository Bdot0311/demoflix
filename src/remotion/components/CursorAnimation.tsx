import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { spring, SpringConfig } from "remotion";

export interface CursorPath {
  x: number;
  y: number;
  clickAt?: number; // Frame at which to show click effect
  hoverAt?: number; // Frame at which to show hover effect
}

interface CursorAnimationProps {
  path: CursorPath[];
  color?: string;
  size?: number;
  showTrail?: boolean;
  clickRippleColor?: string;
}

export const CursorAnimation: React.FC<CursorAnimationProps> = ({
  path,
  color = "#FFFFFF",
  size = 24,
  showTrail = true,
  clickRippleColor = "#8B5CF6",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  if (path.length === 0) return null;

  // Calculate frames per path segment
  const framesPerSegment = durationInFrames / Math.max(path.length - 1, 1);

  // Find current segment and progress
  const currentSegmentIndex = Math.min(
    Math.floor(frame / framesPerSegment),
    path.length - 2
  );
  const segmentProgress = (frame % framesPerSegment) / framesPerSegment;

  // Get current and next point
  const currentPoint = path[currentSegmentIndex] || path[0];
  const nextPoint = path[currentSegmentIndex + 1] || currentPoint;

  // Smooth easing for cursor movement
  const easedProgress = Easing.bezier(0.25, 0.1, 0.25, 1)(segmentProgress);

  // Calculate current position
  const x = interpolate(easedProgress, [0, 1], [currentPoint.x, nextPoint.x]);
  const y = interpolate(easedProgress, [0, 1], [currentPoint.y, nextPoint.y]);

  // Check for click animation
  const isClicking = path.some(
    (p) => p.clickAt !== undefined && Math.abs(frame - p.clickAt) < 10
  );
  const clickPoint = path.find(
    (p) => p.clickAt !== undefined && Math.abs(frame - p.clickAt) < 20
  );

  // Click ripple animation
  const clickProgress = clickPoint?.clickAt
    ? Math.max(0, frame - clickPoint.clickAt) / 20
    : 0;

  return (
    <>
      {/* Trail effect */}
      {showTrail && (
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 998,
          }}
        >
          <defs>
            <linearGradient id="trailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity="0" />
              <stop offset="100%" stopColor={color} stopOpacity="0.5" />
            </linearGradient>
          </defs>
          {currentSegmentIndex > 0 && (
            <path
              d={`M ${path
                .slice(Math.max(0, currentSegmentIndex - 3), currentSegmentIndex + 1)
                .map((p) => `${p.x} ${p.y}`)
                .join(" L ")}`}
              fill="none"
              stroke="url(#trailGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              opacity={0.6}
            />
          )}
        </svg>
      )}

      {/* Click ripple effect */}
      {clickPoint && clickProgress < 1 && (
        <div
          style={{
            position: "absolute",
            left: clickPoint.x,
            top: clickPoint.y,
            transform: "translate(-50%, -50%)",
            zIndex: 999,
          }}
        >
          <div
            style={{
              width: interpolate(clickProgress, [0, 1], [20, 100]),
              height: interpolate(clickProgress, [0, 1], [20, 100]),
              borderRadius: "50%",
              border: `3px solid ${clickRippleColor}`,
              opacity: interpolate(clickProgress, [0, 0.5, 1], [0.8, 0.5, 0]),
              boxShadow: `0 0 20px ${clickRippleColor}`,
            }}
          />
        </div>
      )}

      {/* Cursor */}
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          transform: `translate(-20%, -10%) scale(${isClicking ? 0.9 : 1})`,
          transition: isClicking ? "transform 0.05s" : undefined,
          zIndex: 1000,
          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.4))",
        }}
      >
        {/* macOS-style cursor */}
        <svg
          width={size}
          height={size * 1.4}
          viewBox="0 0 24 34"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1 1L1 23.5L6.5 18L12 28L16 26L10.5 16L18 16L1 1Z"
            fill={color}
            stroke="#000"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </>
  );
};

// Animated cursor that follows a predefined "demo" path
export const DemoCursor: React.FC<{
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  clickFrame?: number;
  delay?: number;
}> = ({ startX, startY, endX, endY, clickFrame, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  if (frame < delay) return null;

  const adjustedFrame = frame - delay;
  const moveDuration = durationInFrames - delay - 20;

  // Spring-based movement for natural feel
  const progress = spring({
    frame: adjustedFrame,
    fps,
    config: {
      damping: 20,
      mass: 1,
      stiffness: 80,
    },
    durationInFrames: moveDuration,
  });

  const x = interpolate(progress, [0, 1], [startX, endX]);
  const y = interpolate(progress, [0, 1], [startY, endY]);

  const isClicking =
    clickFrame !== undefined && Math.abs(adjustedFrame - clickFrame) < 8;
  const clickRippleProgress =
    clickFrame !== undefined && adjustedFrame > clickFrame
      ? Math.min((adjustedFrame - clickFrame) / 15, 1)
      : 0;

  return (
    <>
      {/* Click ripple */}
      {clickFrame !== undefined && clickRippleProgress > 0 && clickRippleProgress < 1 && (
        <div
          style={{
            position: "absolute",
            left: endX,
            top: endY,
            transform: "translate(-50%, -50%)",
            zIndex: 999,
          }}
        >
          <div
            style={{
              width: interpolate(clickRippleProgress, [0, 1], [10, 80]),
              height: interpolate(clickRippleProgress, [0, 1], [10, 80]),
              borderRadius: "50%",
              border: "3px solid #8B5CF6",
              opacity: interpolate(clickRippleProgress, [0, 0.5, 1], [1, 0.5, 0]),
              boxShadow: "0 0 30px #8B5CF6",
            }}
          />
        </div>
      )}

      {/* Cursor */}
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          transform: `translate(-20%, -10%) scale(${isClicking ? 0.85 : 1})`,
          zIndex: 1000,
          filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))",
        }}
      >
        <svg
          width={28}
          height={40}
          viewBox="0 0 24 34"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1 1L1 23.5L6.5 18L12 28L16 26L10.5 16L18 16L1 1Z"
            fill="white"
            stroke="#000"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </>
  );
};
