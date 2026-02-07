import React, { memo, useMemo } from "react";
import { AbsoluteFill, Sequence, useVideoConfig, Img } from "remotion";
import { Scene } from "../components/Scene";
import { Vignette, GradientOverlay, FilmGrain } from "../components/MotionOverlays";
import { TrailerProps } from "../lib/animations";

// Memoize Scene to prevent unnecessary re-renders
const MemoizedScene = memo(Scene);

export const DemoTrailer: React.FC<TrailerProps> = memo(({
  scenes,
  brandColor = "#8B5CF6",
  logoUrl,
}) => {
  // Calculate frame offsets for each scene - memoized
  const sceneOffsets = useMemo(() => {
    return scenes.reduce<number[]>((acc, scene, index) => {
      if (index === 0) return [0];
      const prevOffset = acc[index - 1];
      const prevDuration = scenes[index - 1].durationInFrames;
      return [...acc, prevOffset + prevDuration];
    }, []);
  }, [scenes]);

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

      {/* Minimal global overlays for performance */}
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
  introDuration = 30, // 1 second intro
  outroDuration = 45, // 1.5 second outro
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
          <Vignette intensity={0.6} />
        </AbsoluteFill>
      </Sequence>

      {/* Main content */}
      <Sequence
        from={introDuration}
        durationInFrames={contentDuration}
        name="Main Content"
      >
        <DemoTrailer 
          scenes={scenes} 
          brandColor={brandColor} 
          logoUrl={logoUrl} 
          width={width} 
          height={height} 
          fps={30} 
        />
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
          <Vignette intensity={0.6} />
          <GradientOverlay colors={[brandColor, "#06B6D4"]} opacity={0.1} />
        </AbsoluteFill>
      </Sequence>

      {/* Minimal global grain */}
      <FilmGrain intensity={0.02} />
    </AbsoluteFill>
  );
};
