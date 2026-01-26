import { useEffect, useState, useMemo, useRef } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displaySceneIndex, setDisplaySceneIndex] = useState(currentSceneIndex);
  const [prevSceneIndex, setPrevSceneIndex] = useState<number | null>(null);

  const currentScene = scenes[currentSceneIndex];
  const displayScene = scenes[displaySceneIndex];
  const previousScene = prevSceneIndex !== null ? scenes[prevSceneIndex] : null;

  // Determine if we're in the transition phase
  const inTransitionPhase = currentSceneProgress < TRANSITION_THRESHOLD;
  const transitionProgress = inTransitionPhase 
    ? currentSceneProgress / TRANSITION_THRESHOLD 
    : 1;

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
  const scale = 1 + currentSceneProgress * 0.05;
  const translateX = currentSceneProgress * 2 - 1;
  const translateY = currentSceneProgress * 1 - 0.5;

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
    <div className="relative w-full max-w-4xl aspect-video rounded-xl overflow-hidden border border-border shadow-cinema bg-card">
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

      {/* Text Overlay with Animation */}
      {displayScene && (
        <div
          className={cn(
            "absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-t from-background/80 via-background/20 to-transparent transition-all",
            isTransitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
          )}
          style={{ transitionDuration: `${TRANSITION_DURATION}ms` }}
        >
          <div className="text-center p-8">
            <h2
              className={cn(
                "text-4xl font-bold text-foreground mb-2 drop-shadow-lg transition-all duration-500",
                isPlaying ? "animate-fade-in" : ""
              )}
              style={{
                textShadow: "0 2px 10px rgba(0,0,0,0.5)",
              }}
            >
              {displayScene.headline}
            </h2>
            {displayScene.subtext && (
              <p
                className={cn(
                  "text-xl text-foreground/80 drop-shadow transition-all duration-500 delay-100",
                  isPlaying ? "animate-fade-in" : ""
                )}
                style={{
                  textShadow: "0 1px 5px rgba(0,0,0,0.5)",
                }}
              >
                {displayScene.subtext}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Transition Indicator */}
      {inTransitionPhase && isPlaying && (
        <div className="absolute top-4 left-4 z-30 px-2 py-1 rounded bg-background/70 backdrop-blur-sm text-xs text-muted-foreground capitalize">
          {transitionType.replace("-", " ")}
        </div>
      )}

      {/* Scene Progress Indicator */}
      {isPlaying && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-background/50 z-30">
          <div
            className="h-full bg-primary transition-all duration-100"
            style={{ width: `${currentSceneProgress * 100}%` }}
          />
        </div>
      )}

      {/* Play/Pause Overlay */}
      <button
        onClick={onTogglePlay}
        className="absolute inset-0 z-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group"
      >
        <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center transform group-hover:scale-110 transition-transform shadow-lg">
          {isPlaying ? (
            <Pause className="w-8 h-8 text-primary-foreground" />
          ) : (
            <Play className="w-8 h-8 text-primary-foreground ml-1" />
          )}
        </div>
      </button>

      {/* Scene Counter and Mute Button */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        {musicUrl && onToggleMute && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            className="p-2 rounded-full bg-background/70 backdrop-blur-sm hover:bg-background/90 transition-colors"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Volume2 className="w-4 h-4 text-foreground" />
            )}
          </button>
        )}
        <div className="px-3 py-1 rounded-full bg-background/70 backdrop-blur-sm text-xs text-foreground">
          Scene {currentSceneIndex + 1} / {scenes.length}
        </div>
      </div>
    </div>
  );
};
