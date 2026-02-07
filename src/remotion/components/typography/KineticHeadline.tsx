import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill } from "remotion";
import { springPresets } from "../../lib/animations";

interface WordByWordProps {
  text: string;
  fontSize?: number;
  color?: string;
  delay?: number;
  staggerDelay?: number;
  style?: "fade-up" | "scale-pop" | "slide-in" | "blur-in";
  fontWeight?: number;
  textAlign?: "left" | "center" | "right";
  brandColor?: string;
}

export const WordByWord: React.FC<WordByWordProps> = ({
  text,
  fontSize = 72,
  color = "white",
  delay = 0,
  staggerDelay = 4,
  style = "fade-up",
  fontWeight = 800,
  textAlign = "center",
  brandColor = "#8B5CF6",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const words = useMemo(() => text.split(" "), [text]);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: textAlign === "center" ? "center" : textAlign === "right" ? "flex-end" : "flex-start",
        gap: fontSize * 0.25,
        perspective: "1000px",
      }}
    >
      {words.map((word, index) => {
        const wordDelay = delay + index * staggerDelay;
        const progress = spring({
          frame: Math.max(0, frame - wordDelay),
          fps,
          config: springPresets.fast,
        });

        let transform = "";
        let opacity = progress;
        let filter = "";

        switch (style) {
          case "fade-up":
            transform = `translateY(${interpolate(progress, [0, 1], [30, 0])}px)`;
            break;
          case "scale-pop":
            transform = `scale(${interpolate(progress, [0, 1], [0.5, 1])})`;
            break;
          case "slide-in":
            transform = `translateX(${interpolate(progress, [0, 1], [-50, 0])}px)`;
            break;
          case "blur-in":
            filter = `blur(${interpolate(progress, [0, 1], [10, 0])}px)`;
            break;
        }

        // Highlight key words (first and last)
        const isKeyWord = index === 0 || index === words.length - 1;

        return (
          <span
            key={index}
            style={{
              fontSize,
              fontWeight,
              color: isKeyWord ? brandColor : color,
              opacity,
              transform,
              filter,
              display: "inline-block",
              textShadow: isKeyWord ? `0 0 40px ${brandColor}80` : "none",
              willChange: "transform, opacity",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

interface CharacterSplitProps {
  text: string;
  fontSize?: number;
  color?: string;
  delay?: number;
  staggerDelay?: number;
  fontWeight?: number;
}

export const CharacterSplit: React.FC<CharacterSplitProps> = ({
  text,
  fontSize = 96,
  color = "white",
  delay = 0,
  staggerDelay = 1,
  fontWeight = 900,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const characters = useMemo(() => text.split(""), [text]);

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      {characters.map((char, index) => {
        const charDelay = delay + index * staggerDelay;
        const progress = spring({
          frame: Math.max(0, frame - charDelay),
          fps,
          config: springPresets.bounce,
        });

        const y = interpolate(progress, [0, 1], [-100, 0]);
        const rotateX = interpolate(progress, [0, 1], [90, 0]);

        return (
          <span
            key={index}
            style={{
              fontSize,
              fontWeight,
              color,
              opacity: progress,
              transform: `translateY(${y}px) rotateX(${rotateX}deg)`,
              display: "inline-block",
              transformStyle: "preserve-3d",
              willChange: "transform, opacity",
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        );
      })}
    </div>
  );
};

interface LineRevealProps {
  text: string;
  fontSize?: number;
  color?: string;
  delay?: number;
  fontWeight?: number;
}

export const LineReveal: React.FC<LineRevealProps> = ({
  text,
  fontSize = 64,
  color = "white",
  delay = 0,
  fontWeight = 700,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const progress = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: springPresets.smooth,
  });

  const clipPath = `inset(0 ${interpolate(progress, [0, 1], [100, 0])}% 0 0)`;
  const y = interpolate(progress, [0, 1], [20, 0]);

  return (
    <div
      style={{
        fontSize,
        fontWeight,
        color,
        clipPath,
        transform: `translateY(${y}px)`,
        willChange: "transform, clip-path",
      }}
    >
      {text}
    </div>
  );
};

interface TypewriterEffectProps {
  text: string;
  fontSize?: number;
  color?: string;
  delay?: number;
  speed?: number;
  cursorColor?: string;
}

export const TypewriterEffect: React.FC<TypewriterEffectProps> = ({
  text,
  fontSize = 48,
  color = "white",
  delay = 0,
  speed = 2,
  cursorColor = "#8B5CF6",
}) => {
  const frame = useCurrentFrame();
  
  const charIndex = Math.min(
    Math.floor(Math.max(0, frame - delay) / speed),
    text.length
  );
  
  const displayText = text.slice(0, charIndex);
  const showCursor = Math.floor(frame / 15) % 2 === 0;

  return (
    <div
      style={{
        fontSize,
        fontWeight: 500,
        color,
        fontFamily: "monospace",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span>{displayText}</span>
      <span
        style={{
          width: 3,
          height: fontSize * 0.8,
          backgroundColor: cursorColor,
          marginLeft: 4,
          opacity: showCursor ? 1 : 0,
        }}
      />
    </div>
  );
};

// Main KineticHeadline component that selects the right animation
interface KineticHeadlineProps {
  text: string;
  style?: "word-by-word" | "character-split" | "line-reveal" | "typewriter";
  fontSize?: number;
  color?: string;
  delay?: number;
  brandColor?: string;
}

export const KineticHeadline: React.FC<KineticHeadlineProps> = ({
  text,
  style = "word-by-word",
  fontSize = 72,
  color = "white",
  delay = 5,
  brandColor = "#8B5CF6",
}) => {
  switch (style) {
    case "character-split":
      return <CharacterSplit text={text} fontSize={fontSize} color={color} delay={delay} />;
    case "line-reveal":
      return <LineReveal text={text} fontSize={fontSize} color={color} delay={delay} />;
    case "typewriter":
      return <TypewriterEffect text={text} fontSize={fontSize} color={color} delay={delay} cursorColor={brandColor} />;
    case "word-by-word":
    default:
      return <WordByWord text={text} fontSize={fontSize} color={color} delay={delay} brandColor={brandColor} />;
  }
};
