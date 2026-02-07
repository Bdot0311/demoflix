import React, { memo, useMemo } from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  AbsoluteFill,
  spring,
} from "remotion";
import { AnimatedBackground } from "./backgrounds/AnimatedBackground";
import { KineticHeadline, WordByWord } from "./typography/KineticHeadline";
import {
  StatCounter,
  FeatureCard,
  TestimonialCard,
  CTAButton,
  StatsGrid,
  FeatureGrid,
} from "./elements/MotionElements";
import { Vignette } from "./MotionOverlays";

// Motion Graphics Scene Data Structure
export interface MotionGraphicsSceneData {
  id: string;
  type: "intro" | "pain-point" | "solution" | "feature" | "stats" | "testimonial" | "cta";
  headline: string;
  subtext?: string;
  voiceoverText?: string;
  durationInFrames: number;
  transition?: "fade" | "slide" | "zoom";
  
  // Visual elements based on scene type
  visualElements?: {
    features?: Array<{ title: string; description?: string; icon?: string }>;
    stats?: Array<{ value: string; label: string }>;
    testimonial?: {
      quote: string;
      author?: string;
      role?: string;
      company?: string;
      avatar?: string;
    };
    ctaText?: string;
  };
  
  // Background configuration
  background?: {
    type?: "gradient" | "particles" | "grid" | "orbs" | "full";
    colors?: string[];
  };
  
  // Animation style
  animationStyle?: "dramatic" | "smooth" | "punchy";
  brandColor?: string;
}

interface MotionGraphicsSceneProps {
  scene: MotionGraphicsSceneData;
  isFirst?: boolean;
  isLast?: boolean;
  brandColor?: string;
}

export const MotionGraphicsScene: React.FC<MotionGraphicsSceneProps> = memo(({
  scene,
  isFirst,
  isLast,
  brandColor = "#8B5CF6",
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const sceneDuration = scene.durationInFrames;
  const color = scene.brandColor || brandColor;

  // Transition effects
  const transitionDuration = 12;
  
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

    switch (scene.transition) {
      case "slide":
        const slideX = isEntering 
          ? (1 - enterProgress) * 100 
          : isExiting ? (1 - exitProgress) * -100 : 0;
        return { 
          opacity: Math.min(progress * 1.5, 1), 
          transform: `translateX(${slideX}%)` 
        };
      case "zoom":
        const scale = 0.9 + progress * 0.1;
        return { opacity: progress, transform: `scale(${scale})` };
      case "fade":
      default:
        return { opacity: progress };
    }
  }, [frame, sceneDuration, scene.transition, isFirst, isLast]);

  // Get headline font size based on scene type
  const getHeadlineFontSize = () => {
    switch (scene.type) {
      case "intro":
      case "pain-point":
        return Math.min(width / 10, 96);
      case "solution":
        return Math.min(width / 12, 80);
      case "cta":
        return Math.min(width / 14, 72);
      default:
        return Math.min(width / 16, 64);
    }
  };

  // Get headline animation style based on scene type
  const getHeadlineStyle = (): "word-by-word" | "character-split" | "line-reveal" => {
    switch (scene.type) {
      case "intro":
      case "pain-point":
        return "character-split";
      case "cta":
        return "line-reveal";
      default:
        return "word-by-word";
    }
  };

  // Render scene content based on type
  const renderSceneContent = () => {
    switch (scene.type) {
      case "intro":
      case "pain-point":
        return (
          <AbsoluteFill className="flex flex-col items-center justify-center px-16">
            <KineticHeadline
              text={scene.headline}
              style={getHeadlineStyle()}
              fontSize={getHeadlineFontSize()}
              color="white"
              brandColor={color}
              delay={8}
            />
            {scene.subtext && (
              <div style={{ marginTop: 40 }}>
                <WordByWord
                  text={scene.subtext}
                  fontSize={28}
                  color="rgba(255,255,255,0.7)"
                  delay={25}
                  brandColor={color}
                />
              </div>
            )}
          </AbsoluteFill>
        );

      case "solution":
        return (
          <AbsoluteFill className="flex flex-col items-center justify-center px-16">
            <KineticHeadline
              text={scene.headline}
              style="word-by-word"
              fontSize={getHeadlineFontSize()}
              color="white"
              brandColor={color}
              delay={5}
            />
            {scene.subtext && (
              <div style={{ marginTop: 32 }}>
                <WordByWord
                  text={scene.subtext}
                  fontSize={32}
                  color="white"
                  delay={20}
                  style="fade-up"
                  brandColor={color}
                />
              </div>
            )}
          </AbsoluteFill>
        );

      case "feature":
        return (
          <AbsoluteFill className="flex flex-col items-center justify-center px-16 gap-12">
            {scene.headline && (
              <KineticHeadline
                text={scene.headline}
                style="word-by-word"
                fontSize={getHeadlineFontSize()}
                color="white"
                brandColor={color}
                delay={5}
              />
            )}
            {scene.visualElements?.features && scene.visualElements.features.length > 0 && (
              <div style={{ marginTop: 48 }}>
                <FeatureGrid
                  features={scene.visualElements.features}
                  delay={15}
                  brandColor={color}
                />
              </div>
            )}
          </AbsoluteFill>
        );

      case "stats":
        return (
          <AbsoluteFill className="flex flex-col items-center justify-center px-16 gap-12">
            {scene.headline && (
              <KineticHeadline
                text={scene.headline}
                style="word-by-word"
                fontSize={getHeadlineFontSize()}
                color="white"
                brandColor={color}
                delay={5}
              />
            )}
            {scene.visualElements?.stats && scene.visualElements.stats.length > 0 && (
              <div style={{ marginTop: 64 }}>
                <StatsGrid
                  stats={scene.visualElements.stats}
                  delay={15}
                  brandColor={color}
                />
              </div>
            )}
          </AbsoluteFill>
        );

      case "testimonial":
        return (
          <AbsoluteFill className="flex flex-col items-center justify-center px-16">
            {scene.visualElements?.testimonial && (
              <TestimonialCard
                quote={scene.visualElements.testimonial.quote}
                author={scene.visualElements.testimonial.author}
                role={scene.visualElements.testimonial.role}
                company={scene.visualElements.testimonial.company}
                avatar={scene.visualElements.testimonial.avatar}
                delay={8}
                brandColor={color}
              />
            )}
            {!scene.visualElements?.testimonial && scene.headline && (
              <KineticHeadline
                text={scene.headline}
                style="word-by-word"
                fontSize={getHeadlineFontSize()}
                color="white"
                brandColor={color}
                delay={5}
              />
            )}
          </AbsoluteFill>
        );

      case "cta":
        return (
          <AbsoluteFill className="flex flex-col items-center justify-center px-16 gap-12">
            <KineticHeadline
              text={scene.headline}
              style="line-reveal"
              fontSize={getHeadlineFontSize()}
              color="white"
              brandColor={color}
              delay={5}
            />
            {scene.visualElements?.ctaText && (
              <div style={{ marginTop: 48 }}>
                <CTAButton
                  text={scene.visualElements.ctaText}
                  delay={20}
                  brandColor={color}
                />
              </div>
            )}
          </AbsoluteFill>
        );

      default:
        return (
          <AbsoluteFill className="flex flex-col items-center justify-center px-16">
            <KineticHeadline
              text={scene.headline}
              style="word-by-word"
              fontSize={getHeadlineFontSize()}
              color="white"
              brandColor={color}
              delay={5}
            />
          </AbsoluteFill>
        );
    }
  };

  return (
    <AbsoluteFill style={transitionStyle}>
      {/* Animated Background */}
      <AnimatedBackground
        type={scene.background?.type || "full"}
        colors={scene.background?.colors}
        brandColor={color}
      />

      {/* Vignette for depth */}
      <Vignette intensity={0.4} />

      {/* Scene Content */}
      {renderSceneContent()}
    </AbsoluteFill>
  );
});
