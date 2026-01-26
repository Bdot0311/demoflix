import { useEffect, useState } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface Scene {
  id: string;
  headline: string;
  subtext: string;
  duration_ms: number;
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
}

export const PreviewPlayer = ({
  scenes,
  currentSceneIndex,
  currentSceneProgress,
  isPlaying,
  onTogglePlay,
  fallbackAsset,
}: PreviewPlayerProps) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displaySceneIndex, setDisplaySceneIndex] = useState(currentSceneIndex);

  const currentScene = scenes[currentSceneIndex];
  const displayScene = scenes[displaySceneIndex];

  // Handle scene transitions with fade effect
  useEffect(() => {
    if (currentSceneIndex !== displaySceneIndex) {
      setIsTransitioning(true);
      const timeout = setTimeout(() => {
        setDisplaySceneIndex(currentSceneIndex);
        setIsTransitioning(false);
      }, 150); // Half of the transition duration
      return () => clearTimeout(timeout);
    }
  }, [currentSceneIndex, displaySceneIndex]);

  const asset = displayScene?.asset || fallbackAsset;

  // Calculate Ken Burns effect based on scene progress
  const scale = 1 + currentSceneProgress * 0.05; // Subtle zoom
  const translateX = currentSceneProgress * 2 - 1; // -1 to 1
  const translateY = currentSceneProgress * 1 - 0.5; // -0.5 to 0.5

  return (
    <div className="relative w-full max-w-4xl aspect-video rounded-xl overflow-hidden border border-border shadow-cinema bg-card">
      {/* Background/Media Layer */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-300",
          isTransitioning ? "opacity-0" : "opacity-100"
        )}
      >
        {asset ? (
          asset.file_type === "video" ? (
            <video
              src={asset.file_url}
              className="w-full h-full object-cover transition-transform duration-100"
              style={{
                transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
              }}
              muted
              loop
              autoPlay={isPlaying}
            />
          ) : (
            <img
              src={asset.file_url}
              alt="Preview"
              className="w-full h-full object-cover transition-transform duration-100"
              style={{
                transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
              }}
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <p className="text-muted-foreground">No preview available</p>
          </div>
        )}
      </div>

      {/* Text Overlay with Animation */}
      {displayScene && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-gradient-to-t from-background/80 via-background/20 to-transparent transition-all duration-300",
            isTransitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
          )}
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

      {/* Scene Progress Indicator */}
      {isPlaying && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-background/50">
          <div
            className="h-full bg-primary transition-all duration-100"
            style={{ width: `${currentSceneProgress * 100}%` }}
          />
        </div>
      )}

      {/* Play/Pause Overlay */}
      <button
        onClick={onTogglePlay}
        className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group"
      >
        <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center transform group-hover:scale-110 transition-transform shadow-lg">
          {isPlaying ? (
            <Pause className="w-8 h-8 text-primary-foreground" />
          ) : (
            <Play className="w-8 h-8 text-primary-foreground ml-1" />
          )}
        </div>
      </button>

      {/* Scene Counter */}
      <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-background/70 backdrop-blur-sm text-xs text-foreground">
        Scene {currentSceneIndex + 1} / {scenes.length}
      </div>
    </div>
  );
};
