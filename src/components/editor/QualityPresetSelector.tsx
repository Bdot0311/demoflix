import { Zap, Monitor, Gem } from "lucide-react";
import { cn } from "@/lib/utils";

export type QualityPreset = "draft" | "standard" | "high";

interface QualityPresetSelectorProps {
  value: QualityPreset;
  onChange: (preset: QualityPreset) => void;
}

const presets: { id: QualityPreset; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: "draft",
    label: "Draft",
    description: "Fast preview · Lower quality",
    icon: <Zap className="w-4 h-4" />,
  },
  {
    id: "standard",
    label: "Standard",
    description: "Balanced speed & quality",
    icon: <Monitor className="w-4 h-4" />,
  },
  {
    id: "high",
    label: "High",
    description: "Maximum fidelity · Slower",
    icon: <Gem className="w-4 h-4" />,
  },
];

export const QualityPresetSelector = ({ value, onChange }: QualityPresetSelectorProps) => {
  return (
    <div className="flex gap-2">
      {presets.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onChange(preset.id)}
          className={cn(
            "flex-1 flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-all cursor-pointer",
            value === preset.id
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
          )}
        >
          {preset.icon}
          <span className="font-medium">{preset.label}</span>
          <span className="text-[10px] text-muted-foreground leading-tight text-center">
            {preset.description}
          </span>
        </button>
      ))}
    </div>
  );
};
