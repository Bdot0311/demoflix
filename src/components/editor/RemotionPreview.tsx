import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { DemoTrailer } from "@/remotion/compositions/DemoTrailer";
import { SceneData, defaultMotionConfig, springPresets } from "@/remotion/lib/animations";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

// Database scene format (from Supabase)
interface DBScene {
  id: string;
  headline: string;
  subtext: string;
  duration_ms: number;
  transition?: string;
  zoom_level?: number;
  pan_x?: number;
  pan_y?: number;
  motion_config?: {
    animation_style?: string;
    spring?: {
      damping: number;
      mass: number;
      stiffness: number;
      overshootClamping: boolean;
    };
    stagger_delay_frames?: number;
    entrance_delay_frames?: number;
    effects?: string[];
    cursor_path?: {
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      clickFrame?: number;
    };
    zoom_targets?: Array<{
      x: number;
      y: number;
      scale: number;
      startFrame: number;
      endFrame: number;
    }>;
    ui_highlights?: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      label?: string;
      delay: number;
      duration: number;
    }>;
  };
  asset?: {
    file_url: string;
    file_type: string;
  };
}

interface RemotionPreviewProps {
  scenes: DBScene[];
  currentSceneIndex: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onTimeUpdate?: (time: number) => void;
  onSceneChange?: (index: number) => void;
  fallbackAsset?: {
    file_url: string;
    file_type: string;
  };
  musicUrl?: string;
  musicVolume?: number;
  isMuted?: boolean;
  onToggleMute?: () => void;
  brandColor?: string;
  logoUrl?: string;
}

const FPS = 30;

// Convert database scene format to Remotion scene format
const convertToRemotionScene = (
  scene: DBScene, 
  fallbackAsset?: { file_url: string; file_type: string }
): SceneData => {
  const asset = scene.asset || fallbackAsset;
  const storedConfig = scene.motion_config;
  
  // Build motion config from stored data or use optimized defaults
  const motionConfig = storedConfig ? {
    animation_style: (storedConfig.animation_style || "line-reveal") as any,
    spring: storedConfig.spring || springPresets.crisp,
    stagger_delay_frames: storedConfig.stagger_delay_frames || 1,
    entrance_delay_frames: storedConfig.entrance_delay_frames || 4,
    effects: (storedConfig.effects || ["vignette"]) as any,
    camera: {
      zoom_start: 1.0,
      zoom_end: scene.zoom_level || 1.2,
      pan_x: scene.pan_x || 0,
      pan_y: scene.pan_y || 0,
    },
    // Include demo-style effects from stored config
    cursor_path: storedConfig.cursor_path,
    zoom_targets: storedConfig.zoom_targets,
    ui_highlights: storedConfig.ui_highlights,
  } : {
    ...defaultMotionConfig,
    animation_style: "line-reveal" as const,
    spring: springPresets.crisp,
    effects: ["vignette"] as any,
    camera: {
      zoom_start: 1.0,
      zoom_end: scene.zoom_level || 1.2,
      pan_x: scene.pan_x || 0,
      pan_y: scene.pan_y || 0,
    },
  };
  
  return {
    id: scene.id,
    headline: scene.headline || "",
    subtext: scene.subtext || "",
    imageUrl: asset?.file_url || "",
    durationInFrames: Math.round((scene.duration_ms / 1000) * FPS),
    motionConfig,
    transition: mapTransition(scene.transition),
  };
};

const mapTransition = (transition?: string): SceneData["transition"] => {
  switch (transition) {
    case "slide-left":
    case "slide-right":
    case "zoom":
    case "fade":
    case "cross-dissolve":
    case "wipe":
      return transition;
    case "slide-up":
    case "slide-down":
    case "dissolve":
      return "cross-dissolve"; // Map to new cross-dissolve
    case "zoom-in":
    case "zoom-out":
    case "cross-zoom":
      return "zoom";
    default:
      return "fade";
  }
};

// Format time as MM:SS
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const RemotionPreview: React.FC<RemotionPreviewProps> = ({
  scenes,
  currentSceneIndex,
  isPlaying,
  onTogglePlay,
  onTimeUpdate,
  onSceneChange,
  fallbackAsset,
  musicUrl,
  musicVolume = 80,
  isMuted = false,
  onToggleMute,
  brandColor = "#8B5CF6",
  logoUrl,
}) => {
  const playerRef = useRef<PlayerRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Convert scenes to Remotion format
  const remotionScenes = useMemo(() => {
    return scenes.map((scene) => convertToRemotionScene(scene, fallbackAsset));
  }, [scenes, fallbackAsset]);

  // Calculate total duration in frames
  const totalDurationInFrames = useMemo(() => {
    return remotionScenes.reduce((sum, scene) => sum + scene.durationInFrames, 0);
  }, [remotionScenes]);

  // Calculate scene start frames
  const sceneStartFrames = useMemo(() => {
    let cumulative = 0;
    return remotionScenes.map((scene) => {
      const start = cumulative;
      cumulative += scene.durationInFrames;
      return start;
    });
  }, [remotionScenes]);

  // Sync player with isPlaying prop
  useEffect(() => {
    if (!playerRef.current) return;
    
    if (isPlaying) {
      playerRef.current.play();
    } else {
      playerRef.current.pause();
    }
  }, [isPlaying]);

  // Seek to scene when currentSceneIndex changes externally
  useEffect(() => {
    if (!playerRef.current) return;
    
    const targetFrame = sceneStartFrames[currentSceneIndex] || 0;
    playerRef.current.seekTo(targetFrame);
  }, [currentSceneIndex, sceneStartFrames]);

  // Handle frame updates
  const handleFrameUpdate = useCallback((frame: number) => {
    setCurrentFrame(frame);
    
    // Calculate current time in seconds
    const currentTime = (frame / FPS) * 1000; // in milliseconds
    onTimeUpdate?.(currentTime);

    // Determine which scene we're in
    let sceneIdx = 0;
    let cumulative = 0;
    for (let i = 0; i < remotionScenes.length; i++) {
      if (frame >= cumulative && frame < cumulative + remotionScenes[i].durationInFrames) {
        sceneIdx = i;
        break;
      }
      cumulative += remotionScenes[i].durationInFrames;
      if (i === remotionScenes.length - 1) {
        sceneIdx = i;
      }
    }
    
    if (sceneIdx !== currentSceneIndex) {
      onSceneChange?.(sceneIdx);
    }
  }, [remotionScenes, currentSceneIndex, onTimeUpdate, onSceneChange]);

  // Subscribe to player frame updates via timeupdate event
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const onTimeUpdate = (e: { detail: { frame: number } }) => {
      handleFrameUpdate(e.detail.frame);
    };

    player.addEventListener("timeupdate", onTimeUpdate as any);

    return () => {
      player.removeEventListener("timeupdate", onTimeUpdate as any);
    };
  }, [handleFrameUpdate]);

  // Sync music with playback
  useEffect(() => {
    if (!musicUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(musicUrl);
      audioRef.current.loop = true;
    }

    const audio = audioRef.current;
    audio.volume = isMuted ? 0 : musicVolume / 100;

    if (isPlaying) {
      const targetTime = currentFrame / FPS;
      const drift = Math.abs(audio.currentTime - targetTime);
      if (drift > 0.5) {
        audio.currentTime = targetTime;
      }
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }

    return () => {};
  }, [musicUrl, isPlaying, currentFrame, musicVolume, isMuted]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [musicUrl]);

  // Fullscreen handling with cross-browser support (Safari/iOS, Firefox, Chrome)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFS = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFS);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    
    const elem = containerRef.current as any;
    const doc = document as any;
    
    try {
      const isFS = !!(
        document.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      
      if (!isFS) {
        // Enter fullscreen with cross-browser support
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
          await elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
        } else {
          // Fallback for unsupported browsers - use CSS fullscreen
          elem.style.position = 'fixed';
          elem.style.top = '0';
          elem.style.left = '0';
          elem.style.width = '100vw';
          elem.style.height = '100vh';
          elem.style.zIndex = '9999';
          setIsFullscreen(true);
        }
      } else {
        // Exit fullscreen with cross-browser support
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        } else {
          // Fallback - reset CSS
          elem.style.position = '';
          elem.style.top = '';
          elem.style.left = '';
          elem.style.width = '';
          elem.style.height = '';
          elem.style.zIndex = '';
          setIsFullscreen(false);
        }
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
      // Try CSS fallback on error
      if (!isFullscreen) {
        elem.style.position = 'fixed';
        elem.style.top = '0';
        elem.style.left = '0';
        elem.style.width = '100vw';
        elem.style.height = '100vh';
        elem.style.zIndex = '9999';
        setIsFullscreen(true);
      } else {
        elem.style.position = '';
        elem.style.top = '';
        elem.style.left = '';
        elem.style.width = '';
        elem.style.height = '';
        elem.style.zIndex = '';
        setIsFullscreen(false);
      }
    }
  }, [isFullscreen]);

  // Auto-hide controls
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  // Navigation helpers
  const goToPrevScene = useCallback(() => {
    const prevIdx = Math.max(0, currentSceneIndex - 1);
    const frame = sceneStartFrames[prevIdx] || 0;
    playerRef.current?.seekTo(frame);
    onSceneChange?.(prevIdx);
  }, [currentSceneIndex, sceneStartFrames, onSceneChange]);

  const goToNextScene = useCallback(() => {
    const nextIdx = Math.min(scenes.length - 1, currentSceneIndex + 1);
    const frame = sceneStartFrames[nextIdx] || 0;
    playerRef.current?.seekTo(frame);
    onSceneChange?.(nextIdx);
  }, [currentSceneIndex, scenes.length, sceneStartFrames, onSceneChange]);

  const handleSeek = useCallback((value: number[]) => {
    const frame = Math.round((value[0] / 100) * totalDurationInFrames);
    playerRef.current?.seekTo(frame);
  }, [totalDurationInFrames]);

  const currentTimeSeconds = currentFrame / FPS;
  const totalTimeSeconds = totalDurationInFrames / FPS;
  const progressPercent = totalDurationInFrames > 0 
    ? (currentFrame / totalDurationInFrames) * 100 
    : 0;

  if (scenes.length === 0) {
    return (
      <div className="relative w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">No scenes to preview</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full max-w-full bg-black rounded-lg overflow-hidden group",
        isFullscreen ? "fixed inset-0 z-50" : "aspect-video"
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Remotion Player */}
      <Player
        ref={playerRef}
        component={DemoTrailer}
        inputProps={{
          scenes: remotionScenes,
          width: 1920,
          height: 1080,
          fps: FPS,
          brandColor,
          logoUrl,
        }}
        durationInFrames={Math.max(1, totalDurationInFrames)}
        fps={FPS}
        compositionWidth={1920}
        compositionHeight={1080}
        style={{
          width: "100%",
          height: "100%",
        }}
        controls={false}
        loop
        autoPlay={false}
      />

      {/* Custom Controls Overlay */}
      <div
        className={cn(
          "absolute inset-0 flex flex-col justify-end transition-opacity duration-300",
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Click to play/pause */}
        <div 
          className="flex-1 cursor-pointer" 
          onClick={onTogglePlay}
        />

        {/* Control bar */}
        <div className="bg-gradient-to-t from-black/80 to-transparent p-4 space-y-3">
          {/* Progress bar */}
          <div className="px-2">
            <Slider
              value={[progressPercent]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="w-full cursor-pointer"
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              {/* Prev scene */}
              <button
                onClick={goToPrevScene}
                className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
                title="Previous scene"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              {/* Play/Pause */}
              <button
                onClick={onTogglePlay}
                className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </button>

              {/* Next scene */}
              <button
                onClick={goToNextScene}
                className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
                title="Next scene"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              {/* Time display */}
              <span className="text-white text-sm font-mono ml-3">
                {formatTime(currentTimeSeconds)} / {formatTime(totalTimeSeconds)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Volume */}
              {onToggleMute && (
                <button
                  onClick={onToggleMute}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
              )}

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize className="w-4 h-4" />
                ) : (
                  <Maximize className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Scene indicator */}
          <div className="flex justify-center gap-1 pb-1">
            {scenes.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  const frame = sceneStartFrames[idx] || 0;
                  playerRef.current?.seekTo(frame);
                  onSceneChange?.(idx);
                }}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  idx === currentSceneIndex
                    ? "bg-primary w-6"
                    : "bg-white/40 hover:bg-white/60"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
