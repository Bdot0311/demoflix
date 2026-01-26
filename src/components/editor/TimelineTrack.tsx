import { useRef, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimelineScene } from "./TimelineScene";

interface Scene {
  id: string;
  headline: string;
  duration_ms: number;
}

interface TimelineTrackProps {
  scenes: Scene[];
  selectedSceneId: string | null;
  currentTime: number;
  totalDuration: number;
  currentSceneIndex: number;
  isPlaying: boolean;
  isMuted: boolean;
  activeId: string | null;
  onSelectScene: (id: string) => void;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onSeek: (timeMs: number) => void;
  onSeekToScene: (index: number) => void;
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  sensors: ReturnType<typeof useSensors>;
}

export const TimelineTrack = ({
  scenes,
  selectedSceneId,
  currentTime,
  totalDuration,
  currentSceneIndex,
  isPlaying,
  isMuted,
  activeId,
  onSelectScene,
  onTogglePlay,
  onToggleMute,
  onSeek,
  onSeekToScene,
  onDragStart,
  onDragEnd,
  sensors,
}: TimelineTrackProps) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const activeScene = activeId ? scenes.find((s) => s.id === activeId) : null;

  // Handle clicking on the timeline to seek
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    onSeek(percent * totalDuration);
  };

  const handlePrevScene = () => {
    const prevIndex = Math.max(0, currentSceneIndex - 1);
    onSeekToScene(prevIndex);
  };

  const handleNextScene = () => {
    const nextIndex = Math.min(scenes.length - 1, currentSceneIndex + 1);
    onSeekToScene(nextIndex);
  };

  // Calculate playhead position
  const playheadPosition = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="border-t border-border/50 bg-card/50 p-4">
      {/* Playback Controls */}
      <div className="flex items-center gap-2 mb-4">
        <Button size="icon" variant="ghost" onClick={handlePrevScene} disabled={currentSceneIndex === 0}>
          <SkipBack className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="default" onClick={onTogglePlay} className="bg-primary hover:bg-primary/90">
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={handleNextScene} disabled={currentSceneIndex === scenes.length - 1}>
          <SkipForward className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onToggleMute}>
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </Button>
        <div className="text-sm text-muted-foreground font-mono ml-2">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </div>
      </div>

      {/* Timeline with Playhead */}
      <div className="relative" ref={timelineRef}>
        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-primary z-20 pointer-events-none transition-all duration-100"
          style={{ left: `${playheadPosition}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full shadow-lg" />
        </div>

        {/* Click area for seeking */}
        <div
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={handleTimelineClick}
        />

        {/* Scenes */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={scenes.map((s) => s.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex gap-1 overflow-x-auto pb-2 relative">
              {scenes.map((scene, index) => (
                <TimelineScene
                  key={scene.id}
                  scene={scene}
                  isSelected={selectedSceneId === scene.id}
                  isPlaying={isPlaying && currentSceneIndex === index}
                  widthPercent={(scene.duration_ms / totalDuration) * 100}
                  onSelect={() => onSelectScene(scene.id)}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeScene && (
              <div className="h-16 min-w-[80px] rounded-lg border-2 border-primary bg-primary/20 shadow-xl backdrop-blur-sm flex items-center justify-center">
                <span className="text-xs text-foreground font-medium px-2 truncate">
                  {activeScene.headline || "Scene"}
                </span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
