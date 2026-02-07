import React from "react";
import { Composition } from "remotion";
import { DemoTrailer, DemoTrailerWithIntro } from "./compositions/DemoTrailer";
import { 
  SceneData, 
  defaultMotionConfig, 
  trailerPropsSchema,
  trailerWithIntroPropsSchema 
} from "./lib/animations";

// Default props for preview/development - SIMPLIFIED
const defaultScenes: SceneData[] = [
  {
    id: "scene-1",
    headline: "THE FUTURE IS HERE",
    subtext: "",
    imageUrl: "",
    durationInFrames: 90,
    motionConfig: {
      ...defaultMotionConfig,
      animation_style: "fade-scale",
      camera: { zoom_start: 1.0, zoom_end: 1.15, pan_x: 0, pan_y: 0 },
    },
    transition: "fade",
  },
  {
    id: "scene-2",
    headline: "POWER UNLEASHED",
    subtext: "Built for those who demand more",
    imageUrl: "",
    durationInFrames: 90,
    motionConfig: {
      ...defaultMotionConfig,
      animation_style: "slide",
      camera: { zoom_start: 1.1, zoom_end: 1.0, pan_x: 2, pan_y: -1 },
    },
    transition: "slide",
  },
  {
    id: "scene-3",
    headline: "START NOW",
    subtext: "Join the revolution today",
    imageUrl: "",
    durationInFrames: 120,
    motionConfig: {
      ...defaultMotionConfig,
      animation_style: "zoom",
      effects: ["vignette"],
      camera: { zoom_start: 1.0, zoom_end: 1.15, pan_x: 0, pan_y: 0 },
    },
    transition: "zoom",
  },
];

// Calculate total duration from scenes
const getTotalDuration = (scenes: SceneData[]): number => {
  return scenes.reduce((sum, scene) => sum + scene.durationInFrames, 0);
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Main trailer composition - Horizontal (16:9) */}
      <Composition
        id="DemoTrailer"
        component={DemoTrailer}
        durationInFrames={getTotalDuration(defaultScenes)}
        fps={30}
        width={1920}
        height={1080}
        schema={trailerPropsSchema}
        defaultProps={{
          scenes: defaultScenes,
          width: 1920,
          height: 1080,
          fps: 30,
          brandColor: "#8B5CF6",
          logoUrl: undefined,
        }}
      />

      {/* Vertical format (9:16) for Stories/Reels */}
      <Composition
        id="DemoTrailerVertical"
        component={DemoTrailer}
        durationInFrames={getTotalDuration(defaultScenes)}
        fps={30}
        width={1080}
        height={1920}
        schema={trailerPropsSchema}
        defaultProps={{
          scenes: defaultScenes,
          width: 1080,
          height: 1920,
          fps: 30,
          brandColor: "#8B5CF6",
          logoUrl: undefined,
        }}
      />

      {/* Square format (1:1) for Instagram/LinkedIn */}
      <Composition
        id="DemoTrailerSquare"
        component={DemoTrailer}
        durationInFrames={getTotalDuration(defaultScenes)}
        fps={30}
        width={1080}
        height={1080}
        schema={trailerPropsSchema}
        defaultProps={{
          scenes: defaultScenes,
          width: 1080,
          height: 1080,
          fps: 30,
          brandColor: "#8B5CF6",
          logoUrl: undefined,
        }}
      />

      {/* Extended version with intro/outro */}
      <Composition
        id="DemoTrailerWithIntro"
        component={DemoTrailerWithIntro}
        durationInFrames={getTotalDuration(defaultScenes) + 75}
        fps={30}
        width={1920}
        height={1080}
        schema={trailerWithIntroPropsSchema}
        defaultProps={{
          scenes: defaultScenes,
          width: 1920,
          height: 1080,
          fps: 30,
          brandColor: "#8B5CF6",
          logoUrl: undefined,
          introText: "Introducing",
          outroText: "Get Started",
          introDuration: 30,
          outroDuration: 45,
        }}
      />
    </>
  );
};
