import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";
import { cn } from "@/lib/utils";
import { TransitionType } from "./TransitionSelector";

interface Scene {
  id: string;
  headline: string;
  subtext: string;
  duration_ms: number;
  transition?: string;
  asset?: {
    file_url: string;
    file_type: string;
  };
}

interface PreviewPlayerProps {
  scenes: Scene[];
  currentSceneIndex: number;
  currentSceneProgress: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  fallbackAsset?: {
    file_url: string;
    file_type: string;
  };
  musicUrl?: string;
  musicVolume?: number;
  isMuted?: boolean;
  onToggleMute?: () => void;
  currentTime?: number;
  totalDuration?: number;
}

// Transition duration in ms (for animation timing)
const TRANSITION_DURATION = 400;
const TRANSITION_THRESHOLD = 0.1; // First 10% of scene is transition-in

// Kinetic Typography Component - Framer-style character animation
const KineticText = ({ 
  text, 
  isVisible, 
  className,
  delay = 0,
  stagger = 30,
  isFullscreen = false,
}: { 
  text: string; 
  isVisible: boolean; 
  className?: string;
  delay?: number;
  stagger?: number;
  isFullscreen?: boolean;
}) => {
  const words = text.split(' ');
  
  return (
    <span className={cn("inline-flex flex-wrap justify-center gap-x-2", className)}>
      {words.map((word, wordIdx) => (
        <span key={wordIdx} className="inline-flex overflow-hidden">
          {word.split('').map((char, charIdx) => {
            const totalDelay = delay + (wordIdx * word.length + charIdx) * stagger;
            return (
              <span
                key={`${wordIdx}-${charIdx}`}
                className={cn(
                  "inline-block transform transition-all duration-500 ease-out",
                  isVisible 
                    ? "translate-y-0 opacity-100" 
                    : "translate-y-[120%] opacity-0"
                )}
                style={{
                  transitionDelay: isVisible ? `${totalDelay}ms` : '0ms',
                }}
              >
                {char}
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
};

// Animated Underline/Accent
const AnimatedAccent = ({ isVisible, delay = 500 }: { isVisible: boolean; delay?: number }) => (
  <div 
    className={cn(
      "h-1 bg-gradient-to-r from-primary via-primary to-transparent rounded-full transition-all duration-700 ease-out mx-auto mt-4",
      isVisible ? "w-32 opacity-100" : "w-0 opacity-0"
    )}
    style={{ transitionDelay: isVisible ? `${delay}ms` : '0ms' }}
  />
);

// Floating Particles Effect
const FloatingParticles = ({ isPlaying }: { isPlaying: boolean }) => {
  const particles = useMemo(() => 
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      x: Math.random() * 100,
      delay: Math.random() * 8,
      duration: Math.random() * 8 + 12,
      opacity: Math.random() * 0.2 + 0.1,
    })), []
  );

  if (!isPlaying) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[15]">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-primary/40"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            bottom: '-5%',
            opacity: p.opacity,
            animation: `float-up ${p.duration}s linear infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

// Scan Line Effect (Netflix/Retro style)
const ScanLineEffect = ({ intensity = 0.03 }: { intensity?: number }) => (
  <div 
    className="absolute inset-0 pointer-events-none z-[25] mix-blend-overlay"
    style={{
      background: `repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0, 0, 0, ${intensity}) 2px,
        rgba(0, 0, 0, ${intensity}) 4px
      )`,
    }}
  />
);

// Vignette Effect
const VignetteEffect = () => (
  <div 
    className="absolute inset-0 pointer-events-none z-[24]"
    style={{
      background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)',
    }}
  />
);

// Glow Effect behind text
const GlowEffect = ({ isVisible }: { isVisible: boolean }) => (
  <div 
    className={cn(
      "absolute inset-0 z-[18] transition-opacity duration-1000",
      isVisible ? "opacity-100" : "opacity-0"
    )}
    style={{
      background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.15) 0%, transparent 60%)',
    }}
  />
);

// Progress Ring (scene progress visualization)
const ProgressRing = ({ progress, size = 60 }: { progress: number; size?: number }) => {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - progress * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={strokeWidth}
        opacity={0.3}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-100"
      />
    </svg>
  );
};

export const PreviewPlayer = ({
  scenes,
  currentSceneIndex,
  currentSceneProgress,
  isPlaying,
  onTogglePlay,
  fallbackAsset,
  musicUrl,
  musicVolume = 80,
  isMuted = false,
  onToggleMute,
  currentTime = 0,
  totalDuration = 0,
}: PreviewPlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displaySceneIndex, setDisplaySceneIndex] = useState(currentSceneIndex);
  const [prevSceneIndex, setPrevSceneIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [textVisible, setTextVisible] = useState(false);

  const currentScene = scenes[currentSceneIndex];
  const displayScene = scenes[displaySceneIndex];
  const previousScene = prevSceneIndex !== null ? scenes[prevSceneIndex] : null;

  // Determine if we're in the transition phase
  const inTransitionPhase = currentSceneProgress < TRANSITION_THRESHOLD;
  const transitionProgress = inTransitionPhase 
    ? currentSceneProgress / TRANSITION_THRESHOLD 
    : 1;

  // Trigger text animation after scene transition
  useEffect(() => {
    if (!isTransitioning && isPlaying) {
      const timeout = setTimeout(() => setTextVisible(true), 100);
      return () => clearTimeout(timeout);
    } else if (isTransitioning) {
      setTextVisible(false);
    }
  }, [isTransitioning, currentSceneIndex, isPlaying]);

  // Reset text visibility on scene change
  useEffect(() => {
    setTextVisible(false);
    const timeout = setTimeout(() => {
      if (isPlaying) setTextVisible(true);
    }, TRANSITION_DURATION + 100);
    return () => clearTimeout(timeout);
  }, [currentSceneIndex]);

  // Show text when not playing (for preview)
  useEffect(() => {
    if (!isPlaying) {
      setTextVisible(true);
    }
  }, [isPlaying]);

  // Sync music with playback
  useEffect(() => {
    if (!musicUrl) return;

    // Create audio element if needed
    if (!audioRef.current) {
      audioRef.current = new Audio(musicUrl);
      audioRef.current.loop = true;
    }

    const audio = audioRef.current;
    
    // Update volume
    audio.volume = isMuted ? 0 : musicVolume / 100;

    if (isPlaying) {
      // Sync position if drifted more than 500ms
      const audioTime = audio.currentTime * 1000;
      const drift = Math.abs(audioTime - currentTime);
      if (drift > 500 || Math.abs(currentTime - lastSyncTimeRef.current) > 1000) {
        audio.currentTime = currentTime / 1000;
        lastSyncTimeRef.current = currentTime;
      }
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }

    return () => {
      // Cleanup on unmount
    };
  }, [musicUrl, isPlaying, currentTime, musicVolume, isMuted]);

  // Cleanup audio on unmount or music change
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [musicUrl]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Keyboard controls for fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFullscreen) {
        if (e.key === "Escape") {
          // Escape is handled by browser for fullscreen exit
        } else if (e.key === " " || e.key === "k") {
          e.preventDefault();
          onTogglePlay();
        } else if (e.key === "m") {
          e.preventDefault();
          onToggleMute?.();
        } else if (e.key === "f") {
          e.preventDefault();
          toggleFullscreen();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, onTogglePlay, onToggleMute]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  }, []);

  // Handle scene transitions
  useEffect(() => {
    if (currentSceneIndex !== displaySceneIndex) {
      setPrevSceneIndex(displaySceneIndex);
      setIsTransitioning(true);
      
      const timeout = setTimeout(() => {
        setDisplaySceneIndex(currentSceneIndex);
        setIsTransitioning(false);
        setPrevSceneIndex(null);
      }, TRANSITION_DURATION);
      
      return () => clearTimeout(timeout);
    }
  }, [currentSceneIndex, displaySceneIndex]);

  const asset = displayScene?.asset || fallbackAsset;
  const prevAsset = previousScene?.asset || fallbackAsset;

  // Get the current scene's transition type
  const transitionType = (currentScene?.transition || "fade") as TransitionType;

  // Calculate Ken Burns effect based on scene progress
  const scale = 1 + currentSceneProgress * 0.08;
  const translateX = currentSceneProgress * 3 - 1.5;
  const translateY = currentSceneProgress * 2 - 1;

  // Get transition styles for outgoing (previous) scene
  const getOutgoingStyles = useMemo(() => {
    const progress = isTransitioning ? 0 : transitionProgress;
    
    switch (transitionType) {
      case "fade":
      case "dissolve":
        return {
          opacity: 1 - progress,
          transform: "scale(1)",
        };
      case "slide-left":
        return {
          opacity: 1,
          transform: `translateX(${-progress * 100}%)`,
        };
      case "slide-right":
        return {
          opacity: 1,
          transform: `translateX(${progress * 100}%)`,
        };
      case "slide-up":
        return {
          opacity: 1,
          transform: `translateY(${-progress * 100}%)`,
        };
      case "slide-down":
        return {
          opacity: 1,
          transform: `translateY(${progress * 100}%)`,
        };
      case "zoom-in":
        return {
          opacity: 1 - progress,
          transform: `scale(${1 + progress * 0.5})`,
        };
      case "zoom-out":
        return {
          opacity: 1 - progress,
          transform: `scale(${1 - progress * 0.3})`,
        };
      case "cross-zoom":
        return {
          opacity: 1 - progress,
          transform: `scale(${1 - progress * 0.2})`,
        };
      case "wipe-left":
        return {
          clipPath: `inset(0 ${progress * 100}% 0 0)`,
          opacity: 1,
        };
      case "wipe-right":
        return {
          clipPath: `inset(0 0 0 ${progress * 100}%)`,
          opacity: 1,
        };
      case "flash":
        return {
          opacity: progress < 0.5 ? 1 : 0,
          filter: progress < 0.5 ? `brightness(${1 + progress * 4})` : "none",
        };
      case "glitch":
        const glitchOffset = Math.sin(progress * Math.PI * 8) * 5;
        return {
          opacity: 1 - progress,
          transform: `translateX(${glitchOffset}px)`,
          filter: `hue-rotate(${progress * 180}deg)`,
        };
      case "blur":
        return {
          opacity: 1 - progress,
          filter: `blur(${progress * 20}px)`,
        };
      case "spin":
        return {
          opacity: 1 - progress,
          transform: `rotate(${progress * 90}deg) scale(${1 - progress * 0.3})`,
        };
      default:
        return {
          opacity: 1 - progress,
        };
    }
  }, [transitionType, transitionProgress, isTransitioning]);

  // Get transition styles for incoming (current) scene
  const getIncomingStyles = useMemo(() => {
    const progress = isTransitioning ? 0 : transitionProgress;
    
    switch (transitionType) {
      case "fade":
      case "dissolve":
        return {
          opacity: progress,
          transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
        };
      case "slide-left":
        return {
          opacity: 1,
          transform: `translateX(${(1 - progress) * 100}%) scale(${scale})`,
        };
      case "slide-right":
        return {
          opacity: 1,
          transform: `translateX(${-(1 - progress) * 100}%) scale(${scale})`,
        };
      case "slide-up":
        return {
          opacity: 1,
          transform: `translateY(${(1 - progress) * 100}%) scale(${scale})`,
        };
      case "slide-down":
        return {
          opacity: 1,
          transform: `translateY(${-(1 - progress) * 100}%) scale(${scale})`,
        };
      case "zoom-in":
        return {
          opacity: progress,
          transform: `scale(${0.5 + progress * 0.5 + (scale - 1)})`,
        };
      case "zoom-out":
        return {
          opacity: progress,
          transform: `scale(${1.3 - progress * 0.3 + (scale - 1)})`,
        };
      case "cross-zoom":
        return {
          opacity: progress,
          transform: `scale(${1.2 - progress * 0.2 + (scale - 1)})`,
        };
      case "wipe-left":
      case "wipe-right":
        return {
          opacity: 1,
          transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
        };
      case "flash":
        return {
          opacity: progress < 0.5 ? 0 : 1,
          filter: progress > 0.5 ? `brightness(${3 - progress * 4})` : "none",
          transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
        };
      case "glitch":
        const glitchOffset = Math.sin(progress * Math.PI * 8) * 5;
        return {
          opacity: progress,
          transform: `translateX(${-glitchOffset}px) scale(${scale})`,
          filter: `hue-rotate(${(1 - progress) * 180}deg)`,
        };
      case "blur":
        return {
          opacity: progress,
          filter: `blur(${(1 - progress) * 20}px)`,
          transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
        };
      case "spin":
        return {
          opacity: progress,
          transform: `rotate(${(1 - progress) * -90}deg) scale(${0.7 + progress * 0.3 + (scale - 1)})`,
        };
      default:
        return {
          opacity: progress,
          transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
        };
    }
  }, [transitionType, transitionProgress, isTransitioning, scale, translateX, translateY]);

  const renderMedia = (
    mediaAsset: typeof asset,
    styles: React.CSSProperties,
    isBackground = false
  ) => {
    if (!mediaAsset) {
      return (
        <div 
          className="w-full h-full flex items-center justify-center bg-muted"
          style={styles}
        >
          <p className="text-muted-foreground">No preview available</p>
        </div>
      );
    }

    if (mediaAsset.file_type === "video") {
      return (
        <video
          src={mediaAsset.file_url}
          className="w-full h-full object-cover"
          style={styles}
          muted
          loop
          autoPlay={isPlaying}
        />
      );
    }

    return (
      <img
        src={mediaAsset.file_url}
        alt="Preview"
        className="w-full h-full object-cover"
        style={styles}
      />
    );
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full aspect-video rounded-xl overflow-hidden border border-border shadow-cinema bg-card",
        isFullscreen ? "max-w-none rounded-none border-0" : "max-w-4xl"
      )}
    >
      {/* Background/Media Layer - Previous Scene (during transition) */}
      {(isTransitioning || (inTransitionPhase && prevSceneIndex !== null)) && prevAsset && (
        <div className="absolute inset-0 z-0">
          {renderMedia(prevAsset, getOutgoingStyles as React.CSSProperties, true)}
        </div>
      )}

      {/* Current Scene */}
      <div
        className={cn(
          "absolute inset-0 z-10 transition-none"
        )}
      >
        {renderMedia(
          asset,
          inTransitionPhase ? (getIncomingStyles as React.CSSProperties) : {
            opacity: 1,
            transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
          }
        )}
      </div>

      {/* Floating Particles */}
      <FloatingParticles isPlaying={isPlaying} />

      {/* Glow Effect */}
      <GlowEffect isVisible={textVisible && isPlaying} />

      {/* Vignette Effect */}
      <VignetteEffect />

      {/* Scan Lines (subtle) */}
      <ScanLineEffect intensity={0.02} />

      {/* Text Overlay with Kinetic Animation */}
      {displayScene && (
        <div
          className={cn(
            "absolute inset-0 z-20 flex items-center justify-center",
            "bg-gradient-to-t from-background/90 via-background/30 to-transparent"
          )}
        >
          <div className="text-center p-8 max-w-4xl">
            {/* Main Headline with Kinetic Typography */}
            <h2
              className={cn(
                "font-bold text-foreground mb-4",
                isFullscreen ? "text-7xl" : "text-5xl"
              )}
              style={{
                textShadow: "0 4px 20px rgba(0,0,0,0.5), 0 0 40px hsl(var(--primary) / 0.3)",
                letterSpacing: "-0.02em",
              }}
            >
              <KineticText 
                text={displayScene.headline || ""}
                isVisible={textVisible}
                delay={0}
                stagger={25}
                isFullscreen={isFullscreen}
              />
            </h2>

            {/* Animated Accent Line */}
            <AnimatedAccent isVisible={textVisible} delay={400} />

            {/* Subtext with delayed animation */}
            {displayScene.subtext && (
              <p
                className={cn(
                  "text-foreground/90 mt-6 transition-all duration-700 ease-out",
                  isFullscreen ? "text-2xl" : "text-lg",
                  textVisible 
                    ? "opacity-100 translate-y-0" 
                    : "opacity-0 translate-y-4"
                )}
                style={{
                  textShadow: "0 2px 10px rgba(0,0,0,0.5)",
                  transitionDelay: textVisible ? "600ms" : "0ms",
                }}
              >
                {displayScene.subtext}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Transition Indicator with Progress Ring */}
      {isPlaying && (
        <div className="absolute top-4 left-4 z-30 flex items-center gap-3">
          <ProgressRing progress={currentSceneProgress} size={40} />
          <div className="px-3 py-1.5 rounded-lg bg-background/70 backdrop-blur-sm">
            <span className="text-xs font-medium text-foreground capitalize">
              {transitionType.replace("-", " ")}
            </span>
          </div>
        </div>
      )}

      {/* Scene Progress Bar (bottom) */}
      {isPlaying && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-background/50 z-30">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-100"
            style={{ width: `${currentSceneProgress * 100}%` }}
          />
        </div>
      )}

      {/* Play/Pause Overlay */}
      <button
        onClick={onTogglePlay}
        className="absolute inset-0 z-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group"
      >
        <div className={cn(
          "rounded-full bg-primary/90 flex items-center justify-center transform group-hover:scale-110 transition-transform shadow-lg backdrop-blur-sm",
          isFullscreen ? "w-24 h-24" : "w-16 h-16"
        )}>
          {isPlaying ? (
            <Pause className={cn("text-primary-foreground", isFullscreen ? "w-12 h-12" : "w-8 h-8")} />
          ) : (
            <Play className={cn("text-primary-foreground ml-1", isFullscreen ? "w-12 h-12" : "w-8 h-8")} />
          )}
        </div>
      </button>

      {/* Controls Row - Top Right */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        {musicUrl && onToggleMute && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            className="p-2 rounded-full bg-background/70 backdrop-blur-sm hover:bg-background/90 transition-colors"
            title={isMuted ? "Unmute (M)" : "Mute (M)"}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Volume2 className="w-4 h-4 text-foreground" />
            )}
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFullscreen();
          }}
          className="p-2 rounded-full bg-background/70 backdrop-blur-sm hover:bg-background/90 transition-colors"
          title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
        >
          {isFullscreen ? (
            <Minimize className="w-4 h-4 text-foreground" />
          ) : (
            <Maximize className="w-4 h-4 text-foreground" />
          )}
        </button>
        <div className="px-3 py-1 rounded-full bg-background/70 backdrop-blur-sm text-xs text-foreground font-medium">
          Scene {currentSceneIndex + 1} / {scenes.length}
        </div>
      </div>

      {/* Fullscreen Keyboard Shortcuts Hint */}
      {isFullscreen && !isPlaying && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-background/70 backdrop-blur-sm text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Space</span> Play/Pause • 
          <span className="font-medium text-foreground ml-2">M</span> Mute • 
          <span className="font-medium text-foreground ml-2">F</span> Exit Fullscreen • 
          <span className="font-medium text-foreground ml-2">Esc</span> Exit
        </div>
      )}
    </div>
  );
};
