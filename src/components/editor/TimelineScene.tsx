import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface Scene {
  id: string;
  headline: string;
  duration_ms: number;
}

interface TimelineSceneProps {
  scene: Scene;
  isSelected: boolean;
  isPlaying?: boolean;
  widthPercent: number;
  onSelect: () => void;
}

export const TimelineScene = ({ scene, isSelected, isPlaying, widthPercent, onSelect }: TimelineSceneProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms ease",
    width: `${widthPercent}%`,
    minWidth: "80px",
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      {...attributes}
      {...listeners}
      className={cn(
        "flex-shrink-0 h-16 rounded-lg border-2 transition-all cursor-grab active:cursor-grabbing relative overflow-hidden",
        isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
        isDragging ? "opacity-40 scale-95 ring-2 ring-primary/50" : "hover:scale-[1.02]",
        isPlaying && "ring-2 ring-primary ring-offset-1 ring-offset-background"
      )}
    >
      <div className="h-full bg-muted/50 rounded-md flex items-center justify-center text-xs text-muted-foreground p-2 truncate">
        {scene.headline || "Scene"}
      </div>
      {isPlaying && (
        <div className="absolute inset-0 bg-primary/5 animate-pulse" />
      )}
    </button>
  );
};
