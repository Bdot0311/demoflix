import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mic, Loader2, Play, Pause, Volume2, Trash2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Scene {
  id: string;
  headline: string;
  subtext: string;
  duration_ms: number;
}

interface VoiceoverPanelProps {
  projectId: string;
  projectStyle: string;
  scenes: Scene[];
  voiceoverUrl: string | null;
  voiceoverEnabled: boolean;
  onVoiceoverGenerated: (url: string) => void;
  onVoiceoverRemoved: () => void;
  onVoiceoverToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

const VOICE_TONES = [
  { value: "professional", label: "Professional", description: "Clear, authoritative" },
  { value: "conversational", label: "Conversational", description: "Friendly, approachable" },
  { value: "energetic", label: "Energetic", description: "Exciting, high-energy" },
];

export const VoiceoverPanel = ({
  projectId,
  projectStyle,
  scenes,
  voiceoverUrl,
  voiceoverEnabled,
  onVoiceoverGenerated,
  onVoiceoverRemoved,
  onVoiceoverToggle,
  disabled = false,
}: VoiceoverPanelProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTone, setSelectedTone] = useState("professional");
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [volume, setVolume] = useState(80);
  const { toast } = useToast();

  const handleGenerateVoiceover = async () => {
    if (scenes.length === 0) {
      toast({
        variant: "destructive",
        title: "No scenes",
        description: "Create some scenes first to generate voiceover.",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const totalDuration = scenes.reduce((sum, s) => sum + s.duration_ms, 0);

      const { data, error } = await supabase.functions.invoke("generate-voiceover", {
        body: {
          scenes: scenes.map((s) => ({
            headline: s.headline,
            subtext: s.subtext,
            duration_ms: s.duration_ms,
          })),
          style: projectStyle,
          totalDuration,
          tone: selectedTone,
        },
      });

      if (error) throw error;

      if (data?.audioUrl) {
        onVoiceoverGenerated(data.audioUrl);
        toast({
          title: "Voiceover Generated!",
          description: "AI narration is ready to preview.",
        });
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Voiceover generation error:", error);
      toast({
        variant: "destructive",
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate voiceover",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayPause = () => {
    if (!voiceoverUrl) return;

    if (audioElement) {
      if (isPlaying) {
        audioElement.pause();
        setIsPlaying(false);
      } else {
        audioElement.play();
        setIsPlaying(true);
      }
    } else {
      const audio = new Audio(voiceoverUrl);
      audio.volume = volume / 100;
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setAudioElement(audio);
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioElement) {
      audioElement.volume = newVolume / 100;
    }
  };

  const handleRemoveVoiceover = () => {
    if (audioElement) {
      audioElement.pause();
      setAudioElement(null);
    }
    setIsPlaying(false);
    onVoiceoverRemoved();
    toast({
      title: "Voiceover removed",
      description: "The AI voiceover has been removed from your project.",
    });
  };

  return (
    <div className="space-y-4">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            AI Voiceover
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="voiceover-toggle" className="text-xs text-muted-foreground">
            {voiceoverEnabled ? "On" : "Off"}
          </Label>
          <Switch
            id="voiceover-toggle"
            checked={voiceoverEnabled}
            onCheckedChange={onVoiceoverToggle}
            disabled={disabled}
          />
        </div>
      </div>

      {!voiceoverEnabled ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Enable voiceover to add AI narration to your demo
        </p>
      ) : voiceoverUrl ? (
        // Voiceover exists - show controls
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-foreground">AI Narration Ready</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleRemoveVoiceover}
                disabled={disabled}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Playback controls */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={handlePlayPause}
                disabled={disabled}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
              </Button>

              <div className="flex-1 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <Slider
                  value={[volume]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="flex-1"
                  disabled={disabled}
                />
                <span className="text-xs text-muted-foreground w-8">{volume}%</span>
              </div>
            </div>
          </div>

          {/* Regenerate button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGenerateVoiceover}
            disabled={disabled || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Regenerate Voiceover
              </>
            )}
          </Button>
        </div>
      ) : (
        // No voiceover - show generation UI
        <div className="space-y-4">
          {/* Tone selection */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Voice Tone</Label>
            <Select
              value={selectedTone}
              onValueChange={setSelectedTone}
              disabled={disabled || isGenerating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent>
                {VOICE_TONES.map((tone) => (
                  <SelectItem key={tone.value} value={tone.value}>
                    <div className="flex flex-col">
                      <span>{tone.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {tone.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Generate button */}
          <Button
            className="w-full bg-primary hover:bg-primary/90"
            onClick={handleGenerateVoiceover}
            disabled={disabled || isGenerating || scenes.length === 0}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Voiceover...
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                Generate AI Voiceover
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            AI will write a script from your scenes and generate professional narration
          </p>
        </div>
      )}
    </div>
  );
};
