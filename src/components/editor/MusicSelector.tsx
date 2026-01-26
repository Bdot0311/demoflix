import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Music,
  Play,
  Pause,
  Brain,
  Loader2,
  Volume2,
  VolumeX,
  Check,
} from "lucide-react";

interface MusicTrack {
  id: string;
  name: string;
  artist: string | null;
  category: string;
  duration_seconds: number;
  file_url: string;
  preview_url: string | null;
}

interface MusicRecommendation {
  track_id: string;
  track_name: string;
  match_score: number;
  reason: string;
}

interface MusicSelectorProps {
  tracks: MusicTrack[];
  selectedTrackId: string | null;
  onSelectTrack: (trackId: string) => void;
  recommendations: MusicRecommendation[];
  storyboardMood: string | null;
  isRecommending: boolean;
  onRecommend: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  disabled?: boolean;
}

export const MusicSelector = ({
  tracks,
  selectedTrackId,
  onSelectTrack,
  recommendations,
  storyboardMood,
  isRecommending,
  onRecommend,
  volume,
  onVolumeChange,
  disabled = false,
}: MusicSelectorProps) => {
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlayPreview = (track: MusicTrack) => {
    const previewUrl = track.preview_url || track.file_url;
    
    if (playingTrackId === track.id) {
      // Stop playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingTrackId(null);
      setCurrentTime(0);
      return;
    }

    // Stop any current playback
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // Start new playback
    const audio = new Audio(previewUrl);
    audio.volume = volume / 100;
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
    });

    audio.addEventListener("timeupdate", () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener("ended", () => {
      setPlayingTrackId(null);
      setCurrentTime(0);
    });

    audio.play().catch((err) => {
      console.error("Audio playback failed:", err);
      setPlayingTrackId(null);
    });

    setPlayingTrackId(track.id);
  };

  // Update volume on playing audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getRecommendation = (trackId: string) =>
    recommendations.find((r) => r.track_id === trackId || r.track_name === tracks.find(t => t.id === trackId)?.name);

  // Sort tracks: recommended first, then by category
  const sortedTracks = [...tracks].sort((a, b) => {
    const aRec = getRecommendation(a.id);
    const bRec = getRecommendation(b.id);
    if (aRec && !bRec) return -1;
    if (!aRec && bRec) return 1;
    if (aRec && bRec) return (bRec.match_score || 0) - (aRec.match_score || 0);
    return a.category.localeCompare(b.category);
  });

  return (
    <div className="space-y-4">
      {/* Header with AI button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Music className="w-4 h-4" />
          Background Music
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRecommend}
          disabled={isRecommending || disabled}
          className="text-xs h-7"
          title="Get AI music recommendations based on your storyboard"
        >
          {isRecommending ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Brain className="w-3 h-3 mr-1" />
          )}
          {isRecommending ? "Analyzing..." : "AI Match"}
        </Button>
      </div>

      {/* Mood indicator */}
      {storyboardMood && (
        <div className="px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
          <div className="text-xs text-muted-foreground">Detected Mood</div>
          <div className="text-sm font-medium text-accent capitalize">{storyboardMood}</div>
        </div>
      )}

      {/* Volume control */}
      <div className="flex items-center gap-3 px-2">
        {volume === 0 ? (
          <VolumeX className="w-4 h-4 text-muted-foreground" />
        ) : (
          <Volume2 className="w-4 h-4 text-muted-foreground" />
        )}
        <Slider
          value={[volume]}
          onValueChange={([v]) => onVolumeChange(v)}
          max={100}
          step={5}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground w-8 text-right">{volume}%</span>
      </div>

      {/* Track list */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {sortedTracks.map((track) => {
          const recommendation = getRecommendation(track.id);
          const isRecommended = !!recommendation;
          const isSelected = selectedTrackId === track.id;
          const isPlaying = playingTrackId === track.id;

          return (
            <div
              key={track.id}
              className={`relative rounded-lg border transition-all ${
                isSelected
                  ? "bg-primary/20 border-primary/50"
                  : isRecommended
                  ? "bg-accent/10 border-accent/30 hover:bg-accent/20"
                  : "bg-muted/20 border-border/50 hover:bg-muted/30"
              }`}
            >
              {/* Recommendation badge */}
              {isRecommended && (
                <div className="absolute -top-1.5 -right-1.5 bg-accent text-accent-foreground text-[10px] px-1.5 py-0.5 rounded-full font-semibold shadow-sm">
                  {recommendation.match_score}%
                </div>
              )}

              <div className="p-3">
                <div className="flex items-start gap-3">
                  {/* Play/Pause button */}
                  <button
                    onClick={() => handlePlayPreview(track)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                      isPlaying
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-foreground"
                    }`}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5" />
                    )}
                  </button>

                  {/* Track info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground truncate">
                        {track.name}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{track.artist || "Unknown"}</span>
                      <span>•</span>
                      <span className="capitalize">{track.category}</span>
                      <span>•</span>
                      <span>{formatTime(track.duration_seconds)}</span>
                    </div>

                    {/* Progress bar when playing */}
                    {isPlaying && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{
                              width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(currentTime)}
                        </span>
                      </div>
                    )}

                    {/* AI recommendation reason */}
                    {recommendation?.reason && (
                      <p className="text-xs text-muted-foreground mt-1.5 italic line-clamp-2">
                        "{recommendation.reason}"
                      </p>
                    )}
                  </div>

                  {/* Select button */}
                  <Button
                    size="sm"
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => onSelectTrack(track.id)}
                    className="shrink-0 h-8"
                    disabled={disabled}
                  >
                    {isSelected ? "Selected" : "Use"}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {tracks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No music tracks available</p>
          </div>
        )}
      </div>
    </div>
  );
};
