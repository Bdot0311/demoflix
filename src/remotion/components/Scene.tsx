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
import { DemoCursor } from "./CursorAnimation";
import { UIHighlight, ZoomHighlight, ZoomTarget } from "./ZoomHighlight";
import { getKenBurnsTransform, SceneData, springPresets } from "../lib/animations";

interface SceneProps {
  scene: SceneData;
  isFirst?: boolean;
  isLast?: boolean;
}

// CINEMATIC Scene component - with cursor, highlights, and zoom targets
export const Scene: React.FC<SceneProps> = memo(({ scene, isFirst, isLast }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const {
    headline,
    subtext,
    imageUrl,
    durationInFrames: sceneDuration,
    motionConfig,
    transition,
  } = scene;

  // Extract cursor, highlights, and zoom targets from motion config
  const cursorPath = motionConfig.cursor_path;
  const uiHighlights = motionConfig.ui_highlights || [];
  const zoomTargets = motionConfig.zoom_targets || [];

  // Memoize Ken Burns camera movement
  const kenBurns = useMemo(() => 
    getKenBurnsTransform(frame, sceneDuration, motionConfig.camera),
  [frame, sceneDuration, motionConfig.camera]);

  // Calculate zoom target effect (if active)
  const activeZoomTarget = useMemo(() => {
    return zoomTargets.find(
      (t) => frame >= t.startFrame && frame <= t.endFrame
    );
  }, [frame, zoomTargets]);

  // Calculate dynamic zoom from zoom targets
  const dynamicZoom = useMemo(() => {
    if (!activeZoomTarget) return { scale: 1, translateX: 0, translateY: 0 };
    
    const { x, y, scale, startFrame, endFrame } = activeZoomTarget;
    const duration = endFrame - startFrame;
    const enterDuration = Math.min(15, duration / 3);
    const exitDuration = Math.min(15, duration / 3);
    
    let currentScale = 1;
    let tx = 0;
    let ty = 0;
    
    if (frame < startFrame + enterDuration) {
      // Enter animation
      const progress = spring({
        frame: frame - startFrame,
        fps,
        config: { damping: 20, mass: 1, stiffness: 100 },
      });
      currentScale = interpolate(progress, [0, 1], [1, scale]);
      tx = interpolate(progress, [0, 1], [0, 50 - x]);
      ty = interpolate(progress, [0, 1], [0, 50 - y]);
    } else if (frame > endFrame - exitDuration) {
      // Exit animation
      const exitFrame = frame - (endFrame - exitDuration);
      const progress = spring({
        frame: exitFrame,
        fps,
        config: { damping: 20, mass: 1, stiffness: 100 },
      });
      currentScale = interpolate(progress, [0, 1], [scale, 1]);
      tx = interpolate(progress, [0, 1], [50 - x, 0]);
      ty = interpolate(progress, [0, 1], [50 - y, 0]);
    } else {
      // Hold
      currentScale = scale;
      tx = 50 - x;
      ty = 50 - y;
    }
    
    return { scale: currentScale, translateX: tx, translateY: ty };
  }, [frame, fps, activeZoomTarget]);

  // Transition styles
  const transitionDuration = 10;
  
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

  // Convert percentage coordinates to pixels for cursor
  const cursorStartX = cursorPath ? (cursorPath.startX / 100) * width : 0;
  const cursorStartY = cursorPath ? (cursorPath.startY / 100) * height : 0;
  const cursorEndX = cursorPath ? (cursorPath.endX / 100) * width : 0;
  const cursorEndY = cursorPath ? (cursorPath.endY / 100) * height : 0;

  // Combined Ken Burns + Zoom Target transform
  const combinedScale = kenBurns.scale * dynamicZoom.scale;
  const combinedTx = kenBurns.translateX + dynamicZoom.translateX;
  const combinedTy = kenBurns.translateY + dynamicZoom.translateY;

  return (
    <AbsoluteFill style={transitionStyle}>
      {/* Background Image with Ken Burns + Zoom Targets */}
      <AbsoluteFill>
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: `scale(${combinedScale}) translate(${combinedTx}%, ${combinedTy}%)`,
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

      {/* Vignette effect */}
      <Vignette intensity={0.5} />

      {/* Spotlight effect when zooming */}
      {activeZoomTarget && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle at ${activeZoomTarget.x}% ${activeZoomTarget.y}%, transparent 20%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.7) 100%)`,
            opacity: interpolate(dynamicZoom.scale, [1, 2], [0, 0.6], {
              extrapolateRight: "clamp",
            }),
            pointerEvents: "none",
          }}
        />
      )}

      {/* UI Highlights - render each one */}
      {uiHighlights.map((highlight, index) => {
        // Convert percentage to pixels
        const highlightX = (highlight.x / 100) * width;
        const highlightY = (highlight.y / 100) * height;
        // Scale width/height based on video dimensions
        const scaledWidth = (highlight.width / 1920) * width;
        const scaledHeight = (highlight.height / 1080) * height;
        
        return (
          <UIHighlight
            key={`highlight-${index}`}
            x={highlightX}
            y={highlightY}
            width={scaledWidth}
            height={scaledHeight}
            delay={highlight.delay}
            duration={highlight.duration}
            label={highlight.label}
            color="#8B5CF6"
          />
        );
      })}

      {/* Animated Cursor */}
      {cursorPath && (
        <DemoCursor
          startX={cursorStartX}
          startY={cursorStartY}
          endX={cursorEndX}
          endY={cursorEndY}
          clickFrame={cursorPath.clickFrame}
          delay={10}
        />
      )}

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
