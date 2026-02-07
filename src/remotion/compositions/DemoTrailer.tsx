import React, { memo, useMemo } from "react";
import { AbsoluteFill, Sequence, useVideoConfig, useCurrentFrame, Img, interpolate, spring } from "remotion";
import { Scene } from "../components/Scene";
import { Vignette, GradientOverlay, FilmGrain } from "../components/MotionOverlays";
import { SceneData, TrailerProps, springPresets } from "../lib/animations";

// Memoize Scene to prevent unnecessary re-renders
const MemoizedScene = memo(Scene);

// Cross-dissolve transition overlay
const CrossDissolveTransition: React.FC<{
  progress: number;
  direction: "in" | "out";
}> = ({ progress, direction }) => {
  const opacity = direction === "in" 
    ? interpolate(progress, [0, 1], [0, 1])
    : interpolate(progress, [0, 1], [1, 0]);
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "black",
        opacity: 1 - opacity,
        pointerEvents: "none",
      }}
    />
  );
};

// Wipe transition overlay
const WipeTransition: React.FC<{
  progress: number;
  brandColor: string;
}> = ({ progress, brandColor }) => {
  const wipePosition = interpolate(progress, [0, 1], [-100, 100]);
  
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(90deg, ${brandColor}00 0%, ${brandColor} 45%, ${brandColor} 55%, ${brandColor}00 100%)`,
        transform: `translateX(${wipePosition}%)`,
        pointerEvents: "none",
      }}
    />
  );
};

export const DemoTrailer: React.FC<TrailerProps> = memo(({
  scenes,
  brandColor = "#8B5CF6",
  logoUrl,
}) => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();

  // Calculate frame offsets for each scene - memoized
  const sceneOffsets = useMemo(() => {
    return scenes.reduce<number[]>((acc, scene, index) => {
      if (index === 0) {
        return [0];
      }
      const prevOffset = acc[index - 1];
      const prevDuration = scenes[index - 1].durationInFrames;
      return [...acc, prevOffset + prevDuration];
    }, []);
  }, [scenes]);

  // Determine current scene index for transition effects
  const currentSceneIndex = useMemo(() => {
    let cumulative = 0;
    for (let i = 0; i < scenes.length; i++) {
      if (frame >= cumulative && frame < cumulative + scenes[i].durationInFrames) {
        return i;
      }
      cumulative += scenes[i].durationInFrames;
    }
    return scenes.length - 1;
  }, [frame, scenes]);

  // Calculate transition progress for current scene
  const transitionFrames = 12; // Faster transitions
  const currentScene = scenes[currentSceneIndex];
  const sceneStart = sceneOffsets[currentSceneIndex] || 0;
  const localFrame = frame - sceneStart;
  const sceneDuration = currentScene?.durationInFrames || 90;
  
  const isEntering = localFrame < transitionFrames;
  const isExiting = localFrame > sceneDuration - transitionFrames;
  
  const enterProgress = spring({
    frame: Math.min(localFrame, transitionFrames),
    fps: 30,
    config: springPresets.instant,
  });
  
  const exitProgress = spring({
    frame: Math.max(0, localFrame - (sceneDuration - transitionFrames)),
    fps: 30,
    config: springPresets.instant,
  });

  // Render transition overlays based on scene transition type
  const renderTransitionOverlay = () => {
    if (!currentScene) return null;
    
    const transition = currentScene.transition;
    
    if (transition === "cross-dissolve" && (isEntering || isExiting)) {
      return (
        <CrossDissolveTransition 
          progress={isEntering ? enterProgress : exitProgress} 
          direction={isEntering ? "in" : "out"}
        />
      );
    }
    
    if (transition === "wipe" && (isEntering || isExiting)) {
      return (
        <WipeTransition 
          progress={isEntering ? enterProgress : exitProgress} 
          brandColor={brandColor}
        />
      );
    }
    
    return null;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Render each scene as a Sequence */}
      {scenes.map((scene, index) => (
        <Sequence
          key={scene.id}
          from={sceneOffsets[index]}
          durationInFrames={scene.durationInFrames}
          name={`Scene ${index + 1}: ${scene.headline}`}
        >
          <MemoizedScene
            scene={scene}
            isFirst={index === 0}
            isLast={index === scenes.length - 1}
          />
        </Sequence>
      ))}

      {/* Transition overlays */}
      {renderTransitionOverlay()}

      {/* Global overlays (always visible) - Minimal for performance */}
      <GradientOverlay colors={[brandColor, "#06B6D4"]} opacity={0.05} />
      <FilmGrain intensity={0.015} />

      {/* Logo watermark (optional) */}
      {logoUrl && (
        <div
          style={{
            position: "absolute",
            bottom: 40,
            right: 40,
            opacity: 0.8,
          }}
        >
          <Img
            src={logoUrl}
            style={{
              height: 40,
              width: "auto",
              objectFit: "contain",
            }}
          />
        </div>
      )}
    </AbsoluteFill>
  );
});

// Composition with intro/outro
export const DemoTrailerWithIntro: React.FC<
  TrailerProps & {
    introText?: string;
    outroText?: string;
    introDuration?: number;
    outroDuration?: number;
  }
> = ({
  scenes,
  brandColor = "#8B5CF6",
  logoUrl,
  introText = "Introducing",
  outroText = "Get Started",
  introDuration = 45, // Faster intro (1.5 seconds)
  outroDuration = 60, // Faster outro (2 seconds)
}) => {
  const { width, height } = useVideoConfig();

  // Calculate total content duration
  const contentDuration = scenes.reduce((sum, s) => sum + s.durationInFrames, 0);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Intro sequence */}
      <Sequence from={0} durationInFrames={introDuration} name="Intro">
        <AbsoluteFill className="flex items-center justify-center">
          <div className="text-center">
            {logoUrl && (
              <Img
                src={logoUrl}
                style={{
                  height: 80,
                  width: "auto",
                  objectFit: "contain",
                  marginBottom: 24,
                }}
              />
            )}
            <h1
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: "white",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {introText}
            </h1>
          </div>
          <Vignette intensity={0.7} />
        </AbsoluteFill>
      </Sequence>

      {/* Main content */}
      <Sequence
        from={introDuration}
        durationInFrames={contentDuration}
        name="Main Content"
      >
        <DemoTrailer scenes={scenes} brandColor={brandColor} logoUrl={logoUrl} width={width} height={height} fps={30} />
      </Sequence>

      {/* Outro sequence */}
      <Sequence
        from={introDuration + contentDuration}
        durationInFrames={outroDuration}
        name="Outro"
      >
        <AbsoluteFill className="flex items-center justify-center">
          <div className="text-center">
            <h1
              style={{
                fontSize: 64,
                fontWeight: 800,
                color: "white",
                textShadow: `0 0 60px ${brandColor}`,
              }}
            >
              {outroText}
            </h1>
            {logoUrl && (
              <Img
                src={logoUrl}
                style={{
                  height: 60,
                  width: "auto",
                  objectFit: "contain",
                  marginTop: 32,
                }}
              />
            )}
          </div>
          <Vignette intensity={0.7} />
          <GradientOverlay colors={[brandColor, "#06B6D4"]} opacity={0.15} />
        </AbsoluteFill>
      </Sequence>

      {/* Global film grain - minimal */}
      <FilmGrain intensity={0.02} />
    </AbsoluteFill>
  );
};
