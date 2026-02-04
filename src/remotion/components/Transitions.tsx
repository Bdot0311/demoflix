import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, AbsoluteFill } from "remotion";
import { springPresets, getSpringValue } from "../lib/animations";

// Fade transition wrapper
interface FadeProps {
  children: React.ReactNode;
  durationInFrames?: number;
  fadeIn?: boolean;
  fadeOut?: boolean;
}

export const Fade: React.FC<FadeProps> = ({
  children,
  durationInFrames = 15,
  fadeIn = true,
  fadeOut = true,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames: totalDuration } = useVideoConfig();

  let opacity = 1;

  if (fadeIn && frame < durationInFrames) {
    opacity = interpolate(frame, [0, durationInFrames], [0, 1]);
  } else if (fadeOut && frame > totalDuration - durationInFrames) {
    opacity = interpolate(
      frame,
      [totalDuration - durationInFrames, totalDuration],
      [1, 0]
    );
  }

  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

// Slide transition
interface SlideProps {
  children: React.ReactNode;
  direction?: "left" | "right" | "up" | "down";
  durationInFrames?: number;
}

export const Slide: React.FC<SlideProps> = ({
  children,
  direction = "left",
  durationInFrames = 20,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: totalDuration } = useVideoConfig();

  const progress = getSpringValue(frame, fps, springPresets.snappy);
  const exitProgress = getSpringValue(
    Math.max(0, frame - (totalDuration - durationInFrames)),
    fps,
    springPresets.snappy
  );

  const getTransform = () => {
    const enterOffset = 100 * (1 - progress);
    const exitOffset = 100 * exitProgress;

    if (frame > totalDuration - durationInFrames) {
      switch (direction) {
        case "left":
          return `translateX(${-exitOffset}%)`;
        case "right":
          return `translateX(${exitOffset}%)`;
        case "up":
          return `translateY(${-exitOffset}%)`;
        case "down":
          return `translateY(${exitOffset}%)`;
      }
    }

    switch (direction) {
      case "left":
        return `translateX(${enterOffset}%)`;
      case "right":
        return `translateX(${-enterOffset}%)`;
      case "up":
        return `translateY(${enterOffset}%)`;
      case "down":
        return `translateY(${-enterOffset}%)`;
    }
  };

  return (
    <AbsoluteFill style={{ transform: getTransform() }}>{children}</AbsoluteFill>
  );
};

// Zoom transition
interface ZoomProps {
  children: React.ReactNode;
  durationInFrames?: number;
  startScale?: number;
  endScale?: number;
}

export const Zoom: React.FC<ZoomProps> = ({
  children,
  durationInFrames = 20,
  startScale = 0.8,
  endScale = 1.2,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: totalDuration } = useVideoConfig();

  const enterProgress = getSpringValue(frame, fps, springPresets.bouncy);
  const exitProgress = getSpringValue(
    Math.max(0, frame - (totalDuration - durationInFrames)),
    fps,
    springPresets.snappy
  );

  let scale = 1;
  let opacity = 1;

  if (frame < durationInFrames) {
    scale = interpolate(enterProgress, [0, 1], [startScale, 1]);
    opacity = enterProgress;
  } else if (frame > totalDuration - durationInFrames) {
    scale = interpolate(exitProgress, [0, 1], [1, endScale]);
    opacity = 1 - exitProgress;
  }

  return (
    <AbsoluteFill style={{ transform: `scale(${scale})`, opacity }}>
      {children}
    </AbsoluteFill>
  );
};

// Wipe transition
interface WipeProps {
  children: React.ReactNode;
  direction?: "left" | "right" | "up" | "down";
  durationInFrames?: number;
  color?: string;
}

export const Wipe: React.FC<WipeProps> = ({
  children,
  direction = "left",
  durationInFrames = 20,
  color = "#8B5CF6",
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateRight: "clamp",
  });

  const getWipeStyle = () => {
    const position = 100 * progress;

    switch (direction) {
      case "left":
        return {
          clipPath: `inset(0 ${100 - position}% 0 0)`,
        };
      case "right":
        return {
          clipPath: `inset(0 0 0 ${100 - position}%)`,
        };
      case "up":
        return {
          clipPath: `inset(0 0 ${100 - position}% 0)`,
        };
      case "down":
        return {
          clipPath: `inset(${100 - position}% 0 0 0)`,
        };
    }
  };

  return (
    <>
      {/* Wipe overlay */}
      {frame < durationInFrames && (
        <AbsoluteFill
          style={{
            backgroundColor: color,
            ...getWipeStyle(),
            zIndex: 100,
          }}
        />
      )}
      <AbsoluteFill style={getWipeStyle()}>{children}</AbsoluteFill>
    </>
  );
};

// Cross-dissolve between two elements
interface CrossDissolveProps {
  from: React.ReactNode;
  to: React.ReactNode;
  transitionFrame: number;
  durationInFrames?: number;
}

export const CrossDissolve: React.FC<CrossDissolveProps> = ({
  from,
  to,
  transitionFrame,
  durationInFrames = 15,
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(
    frame,
    [transitionFrame, transitionFrame + durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <>
      <AbsoluteFill style={{ opacity: 1 - progress }}>{from}</AbsoluteFill>
      <AbsoluteFill style={{ opacity: progress }}>{to}</AbsoluteFill>
    </>
  );
};
