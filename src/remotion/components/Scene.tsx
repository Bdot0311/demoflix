import React, { memo, useMemo } from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Img,
  AbsoluteFill,
  spring,
} from "remotion";
import { KineticText, SubText, AnimationStyle } from "./KineticText";
import {
  FloatingParticles,
  Vignette,
  GlowEffect,
  ScanLines,
  AccentLine,
} from "./MotionOverlays";
import { DemoCursor } from "./CursorAnimation";
import { UIHighlight, CalloutBox } from "./ZoomHighlight";
import { getKenBurnsTransform, SceneData, springPresets } from "../lib/animations";

interface SceneProps {
  scene: SceneData;
  isFirst?: boolean;
  isLast?: boolean;
}

// Zoom Spotlight overlay component - shows focus area during zoom targets
const ZoomSpotlight: React.FC<{
  x: number;
  y: number;
  scale: number;
  startFrame: number;
  endFrame: number;
  highlightColor?: string;
}> = ({ x, y, scale, startFrame, endFrame, highlightColor = "#8B5CF6" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < startFrame || frame > endFrame) return null;

  const localFrame = frame - startFrame;
  const duration = endFrame - startFrame;
  const enterDuration = Math.min(15, duration / 3);
  const exitDuration = Math.min(15, duration / 3);

  let opacity = 1;
  let ringScale = 1;

  if (localFrame < enterDuration) {
    const progress = spring({
      frame: localFrame,
      fps,
      config: { damping: 15, mass: 0.8, stiffness: 150 },
    });
    opacity = progress;
    ringScale = interpolate(progress, [0, 1], [0.5, 1]);
  } else if (localFrame > duration - exitDuration) {
    const exitFrame = localFrame - (duration - exitDuration);
    const progress = spring({
      frame: exitFrame,
      fps,
      config: { damping: 15, mass: 0.8, stiffness: 150 },
    });
    opacity = 1 - progress;
    ringScale = interpolate(progress, [0, 1], [1, 1.2]);
  }

  // Pulsing glow effect
  const pulsePhase = (localFrame / 15) % 1;
  const glowIntensity = 0.6 + Math.sin(pulsePhase * Math.PI * 2) * 0.3;

  return (
    <>
      {/* Radial spotlight vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at ${x}% ${y}%, transparent 15%, rgba(0,0,0,${0.4 * opacity}) 50%, rgba(0,0,0,${0.7 * opacity}) 100%)`,
          pointerEvents: "none",
          zIndex: 40,
        }}
      />

      {/* Focus ring */}
      <div
        style={{
          position: "absolute",
          left: `${x}%`,
          top: `${y}%`,
          transform: `translate(-50%, -50%) scale(${ringScale})`,
          opacity,
          zIndex: 45,
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            border: `3px solid ${highlightColor}`,
            boxShadow: `0 0 ${30 * glowIntensity}px ${highlightColor}, inset 0 0 ${20 * glowIntensity}px ${highlightColor}30`,
          }}
        />
        
        {/* Corner brackets */}
        {[0, 90, 180, 270].map((rotation) => (
          <div
            key={rotation}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 20,
              height: 3,
              background: highlightColor,
              transform: `translate(-50%, -50%) rotate(${rotation}deg) translateX(70px)`,
              boxShadow: `0 0 10px ${highlightColor}`,
            }}
          />
        ))}
      </div>
    </>
  );
};

// Memoize the Scene component to prevent unnecessary re-renders
export const Scene: React.FC<SceneProps> = memo(({ scene, isFirst, isLast }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  const {
    headline,
    subtext,
    imageUrl,
    durationInFrames: sceneDuration,
    motionConfig,
    transition,
  } = scene;

  // Memoize Ken Burns camera movement calculation (now includes rotation)
  const kenBurns = useMemo(() => 
    getKenBurnsTransform(frame, sceneDuration, motionConfig.camera),
  [frame, sceneDuration, motionConfig.camera]);

  // Map animation style to valid KineticText type
  const animationStyle = motionConfig.animation_style as AnimationStyle;

  // Transition effects
  const transitionDuration = 15; // frames
  const enterProgress = interpolate(frame, [0, transitionDuration], [0, 1], {
    extrapolateRight: "clamp",
  });
  const exitProgress = interpolate(
    frame,
    [sceneDuration - transitionDuration, sceneDuration],
    [1, 0],
    { extrapolateLeft: "clamp" }
  );

  const getTransitionStyle = () => {
    let enterStyle = {};
    let exitStyle = {};

    switch (transition) {
      case "fade":
        enterStyle = { opacity: enterProgress };
        exitStyle = { opacity: exitProgress };
        break;
      case "slide-left":
        enterStyle = { transform: `translateX(${(1 - enterProgress) * 100}%)` };
        exitStyle = { transform: `translateX(${(1 - exitProgress) * -100}%)` };
        break;
      case "slide-right":
        enterStyle = { transform: `translateX(${(1 - enterProgress) * -100}%)` };
        exitStyle = { transform: `translateX(${(1 - exitProgress) * 100}%)` };
        break;
      case "zoom":
        enterStyle = {
          opacity: enterProgress,
          transform: `scale(${0.8 + enterProgress * 0.2})`,
        };
        exitStyle = {
          opacity: exitProgress,
          transform: `scale(${1 + (1 - exitProgress) * 0.2})`,
        };
        break;
      default:
        enterStyle = { opacity: 1 };
        exitStyle = { opacity: 1 };
    }

    // Combine enter and exit based on frame position
    if (frame < transitionDuration && !isFirst) {
      return enterStyle;
    } else if (frame > sceneDuration - transitionDuration && !isLast) {
      return exitStyle;
    }
    return { opacity: 1 };
  };

  const transitionStyle = getTransitionStyle();

  // Memoize effect flags to avoid recalculation
  const effectFlags = useMemo(() => ({
    hasParticles: motionConfig.effects.includes("particles"),
    hasVignette: motionConfig.effects.includes("vignette"),
    hasGlow: motionConfig.effects.includes("glow"),
    hasScanlines: motionConfig.effects.includes("scanlines"),
  }), [motionConfig.effects]);

  const { hasParticles, hasVignette, hasGlow, hasScanlines } = effectFlags;

  return (
    <AbsoluteFill style={transitionStyle}>
      {/* Background Image with Ken Burns (now includes rotation) */}
      <AbsoluteFill>
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: `scale(${kenBurns.scale}) translate(${kenBurns.translateX}%, ${kenBurns.translateY}%) rotate(${kenBurns.rotate}deg)`,
            transformOrigin: "center center",
            willChange: "transform",
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
      </AbsoluteFill>

      {/* Dark overlay for text readability */}
      <AbsoluteFill
        style={{
          background: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      {/* Effects layers - Simplified for performance */}
      {hasParticles && <FloatingParticles count={15} />}
      {hasGlow && <GlowEffect color="#8B5CF6" intensity={0.2} />}
      {hasVignette && <Vignette intensity={0.5} />}
      {hasScanlines && <ScanLines opacity={0.015} />}

      {/* Zoom target spotlights */}
      {motionConfig.zoom_targets?.map((target, idx) => (
        <ZoomSpotlight
          key={`zoom-${idx}`}
          x={target.x}
          y={target.y}
          scale={target.scale}
          startFrame={target.startFrame}
          endFrame={target.endFrame}
        />
      ))}

      {/* Demo-style cursor animation */}
      {motionConfig.cursor_path && (
        <DemoCursor
          startX={motionConfig.cursor_path.startX}
          startY={motionConfig.cursor_path.startY}
          endX={motionConfig.cursor_path.endX}
          endY={motionConfig.cursor_path.endY}
          clickFrame={motionConfig.cursor_path.clickFrame}
          delay={20}
        />
      )}

      {/* UI Highlights */}
      {motionConfig.ui_highlights?.map((highlight, idx) => (
        <UIHighlight
          key={`highlight-${idx}`}
          x={highlight.x}
          y={highlight.y}
          width={highlight.width}
          height={highlight.height}
          label={highlight.label}
          delay={highlight.delay}
          duration={highlight.duration}
        />
      ))}

      {/* Text content */}
      <AbsoluteFill className="flex flex-col items-center justify-center px-16">
        <div className="text-center max-w-4xl">
          {/* Headline - Now uses typed AnimationStyle */}
          <KineticText
            text={headline}
            style={animationStyle}
            fontSize={Math.min(width / 12, 80)}
            color="white"
            springConfig={motionConfig.spring}
            staggerDelay={motionConfig.stagger_delay_frames}
            entranceDelay={motionConfig.entrance_delay_frames}
          />

          {/* Accent line */}
          <div className="flex justify-center mt-6">
            <AccentLine delay={30} width="40%" />
          </div>

          {/* Subtext */}
          {subtext && (
            <div className="mt-6">
              <SubText
                text={subtext}
                delay={40}
                fontSize={Math.min(width / 30, 28)}
              />
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
});
