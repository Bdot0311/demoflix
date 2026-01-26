import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface Scene {
  id: string;
  order_index: number;
  headline: string;
  subtext: string;
  duration_ms: number;
}

interface SortableSceneProps {
  scene: Scene;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}

export const SortableScene = ({ scene, index, isSelected, onSelect }: SortableSceneProps) => {
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
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`w-full p-3 rounded-xl text-left transition-all flex items-center gap-3 ${
        isSelected
          ? "bg-primary/20 border border-primary/50"
          : "bg-muted/30 border border-transparent hover:bg-muted/50"
      } ${isDragging ? "opacity-40 scale-95 ring-2 ring-primary/50 shadow-lg" : "hover:scale-[1.01]"}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">
          {scene.headline || `Scene ${index + 1}`}
        </div>
        <div className="text-xs text-muted-foreground">
          {(scene.duration_ms / 1000).toFixed(1)}s
        </div>
      </div>
    </div>
  );
};
