import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Img,
  AbsoluteFill,
} from "remotion";
import { KineticText, SubText } from "./KineticText";
import {
  FloatingParticles,
  Vignette,
  GlowEffect,
  ScanLines,
  AccentLine,
} from "./MotionOverlays";
import { getKenBurnsTransform, SceneData, springPresets } from "../lib/animations";

interface SceneProps {
  scene: SceneData;
  isFirst?: boolean;
  isLast?: boolean;
}

export const Scene: React.FC<SceneProps> = ({ scene, isFirst, isLast }) => {
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

  // Ken Burns camera movement
  const kenBurns = getKenBurnsTransform(frame, sceneDuration, motionConfig.camera);

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

  // Check which effects are enabled
  const hasParticles = motionConfig.effects.includes("particles");
  const hasVignette = motionConfig.effects.includes("vignette");
  const hasGlow = motionConfig.effects.includes("glow");
  const hasScanlines = motionConfig.effects.includes("scanlines");

  return (
    <AbsoluteFill style={transitionStyle}>
      {/* Background Image with Ken Burns */}
      <AbsoluteFill>
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: `scale(${kenBurns.scale}) translate(${kenBurns.translateX}%, ${kenBurns.translateY}%)`,
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
      </AbsoluteFill>

      {/* Dark overlay for text readability */}
      <AbsoluteFill
        style={{
          background: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      {/* Effects layers */}
      {hasParticles && <FloatingParticles count={25} />}
      {hasGlow && <GlowEffect color="#8B5CF6" intensity={0.3} />}
      {hasVignette && <Vignette intensity={0.6} />}
      {hasScanlines && <ScanLines opacity={0.02} />}

      {/* Text content */}
      <AbsoluteFill className="flex flex-col items-center justify-center px-16">
        <div className="text-center max-w-4xl">
          {/* Headline */}
          <KineticText
            text={headline}
            style={motionConfig.animation_style}
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
};
