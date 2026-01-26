import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Scene {
  id: string;
  headline: string;
  duration_ms: number;
}

interface TimelineSceneProps {
  scene: Scene;
  isSelected: boolean;
  widthPercent: number;
  onSelect: () => void;
}

export const TimelineScene = ({ scene, isSelected, widthPercent, onSelect }: TimelineSceneProps) => {
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
    transition,
    width: `${widthPercent}%`,
    minWidth: "80px",
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      {...attributes}
      {...listeners}
      className={`flex-shrink-0 h-16 rounded-lg border-2 transition-all cursor-grab active:cursor-grabbing ${
        isSelected
          ? "border-primary"
          : "border-border hover:border-primary/50"
      } ${isDragging ? "z-50 shadow-lg" : ""}`}
    >
      <div className="h-full bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground p-2 truncate">
        {scene.headline || "Scene"}
      </div>
    </button>
  );
};
