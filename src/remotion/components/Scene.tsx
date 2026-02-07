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
import { Vignette, AccentLine } from "./MotionOverlays";
import { getKenBurnsTransform, SceneData, springPresets } from "../lib/animations";

interface SceneProps {
  scene: SceneData;
  isFirst?: boolean;
  isLast?: boolean;
}

// SIMPLIFIED Scene component - optimized for 45+ FPS
export const Scene: React.FC<SceneProps> = memo(({ scene, isFirst, isLast }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const {
    headline,
    subtext,
    imageUrl,
    durationInFrames: sceneDuration,
    motionConfig,
    transition,
  } = scene;

  // Memoize Ken Burns camera movement (no rotation for performance)
  const kenBurns = useMemo(() => 
    getKenBurnsTransform(frame, sceneDuration, motionConfig.camera),
  [frame, sceneDuration, motionConfig.camera]);

  // SIMPLIFIED transition - only fade, slide, zoom
  const transitionDuration = 10; // Faster transitions
  
  const transitionStyle = useMemo(() => {
    const enterProgress = interpolate(frame, [0, transitionDuration], [0, 1], {
      extrapolateRight: "clamp",
    });
    const exitProgress = interpolate(
      frame,
      [sceneDuration - transitionDuration, sceneDuration],
      [1, 0],
      { extrapolateLeft: "clamp" }
    );

    const isEntering = frame < transitionDuration && !isFirst;
    const isExiting = frame > sceneDuration - transitionDuration && !isLast;
    const progress = isEntering ? enterProgress : isExiting ? exitProgress : 1;

    switch (transition) {
      case "slide":
        const slideX = isEntering 
          ? (1 - enterProgress) * 100 
          : isExiting ? (1 - exitProgress) * -100 : 0;
        return { 
          opacity: Math.min(progress * 2, 1), 
          transform: `translateX(${slideX}%)` 
        };
      case "zoom":
        const scale = 0.9 + progress * 0.1;
        return { opacity: progress, transform: `scale(${scale})` };
      case "fade":
      default:
        return { opacity: progress };
    }
  }, [frame, sceneDuration, transition, isFirst, isLast, transitionDuration]);

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
          background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      {/* Only vignette effect for performance */}
      <Vignette intensity={0.5} />

      {/* Text content */}
      <AbsoluteFill className="flex flex-col items-center justify-center px-16">
        <div className="text-center max-w-4xl">
          {/* Headline */}
          <KineticText
            text={headline}
            style={motionConfig.animation_style as AnimationStyle}
            fontSize={Math.min(width / 12, 80)}
            color="white"
            entranceDelay={motionConfig.entrance_delay_frames}
          />

          {/* Accent line */}
          <div className="flex justify-center mt-6">
            <AccentLine delay={20} width="40%" />
          </div>

          {/* Subtext */}
          {subtext && (
            <div className="mt-6">
              <SubText
                text={subtext}
                delay={25}
                fontSize={Math.min(width / 30, 28)}
              />
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
});
