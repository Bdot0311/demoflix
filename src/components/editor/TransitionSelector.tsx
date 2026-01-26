import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, ArrowRight, ZoomIn, Layers, Film, Clapperboard } from "lucide-react";

export type TransitionType =
  | "fade"
  | "slide-left"
  | "slide-right"
  | "slide-up"
  | "slide-down"
  | "zoom-in"
  | "zoom-out"
  | "dissolve"
  | "wipe-left"
  | "wipe-right"
  | "cross-zoom"
  | "flash"
  | "glitch"
  | "blur"
  | "spin";

interface TransitionOption {
  value: TransitionType;
  label: string;
  category: "basic" | "cinematic" | "creative";
  icon: React.ReactNode;
  description: string;
}

const transitionOptions: TransitionOption[] = [
  // Basic transitions
  {
    value: "fade",
    label: "Fade",
    category: "basic",
    icon: <Sparkles className="w-4 h-4" />,
    description: "Smooth fade between scenes",
  },
  {
    value: "dissolve",
    label: "Dissolve",
    category: "basic",
    icon: <Layers className="w-4 h-4" />,
    description: "Cross-dissolve blend",
  },
  {
    value: "slide-left",
    label: "Slide Left",
    category: "basic",
    icon: <ArrowRight className="w-4 h-4 rotate-180" />,
    description: "Slide from right to left",
  },
  {
    value: "slide-right",
    label: "Slide Right",
    category: "basic",
    icon: <ArrowRight className="w-4 h-4" />,
    description: "Slide from left to right",
  },
  {
    value: "slide-up",
    label: "Slide Up",
    category: "basic",
    icon: <ArrowRight className="w-4 h-4 -rotate-90" />,
    description: "Slide from bottom to top",
  },
  {
    value: "slide-down",
    label: "Slide Down",
    category: "basic",
    icon: <ArrowRight className="w-4 h-4 rotate-90" />,
    description: "Slide from top to bottom",
  },
  // Cinematic transitions
  {
    value: "zoom-in",
    label: "Zoom In",
    category: "cinematic",
    icon: <ZoomIn className="w-4 h-4" />,
    description: "Dramatic zoom into scene",
  },
  {
    value: "zoom-out",
    label: "Zoom Out",
    category: "cinematic",
    icon: <ZoomIn className="w-4 h-4 rotate-180" />,
    description: "Pull back reveal",
  },
  {
    value: "cross-zoom",
    label: "Cross Zoom",
    category: "cinematic",
    icon: <Film className="w-4 h-4" />,
    description: "Zoom out then in - film style",
  },
  {
    value: "wipe-left",
    label: "Wipe Left",
    category: "cinematic",
    icon: <Clapperboard className="w-4 h-4" />,
    description: "Classic film wipe transition",
  },
  {
    value: "wipe-right",
    label: "Wipe Right",
    category: "cinematic",
    icon: <Clapperboard className="w-4 h-4 scale-x-[-1]" />,
    description: "Reverse film wipe",
  },
  // Creative transitions
  {
    value: "flash",
    label: "Flash",
    category: "creative",
    icon: <Sparkles className="w-4 h-4" />,
    description: "Bright flash cut",
  },
  {
    value: "glitch",
    label: "Glitch",
    category: "creative",
    icon: <Sparkles className="w-4 h-4" />,
    description: "Digital glitch effect",
  },
  {
    value: "blur",
    label: "Blur",
    category: "creative",
    icon: <Layers className="w-4 h-4" />,
    description: "Soft blur transition",
  },
  {
    value: "spin",
    label: "Spin",
    category: "creative",
    icon: <Film className="w-4 h-4" />,
    description: "Rotating transition",
  },
];

interface TransitionSelectorProps {
  value: TransitionType;
  onChange: (value: TransitionType) => void;
  className?: string;
}

export const TransitionSelector = ({
  value,
  onChange,
  className,
}: TransitionSelectorProps) => {
  const selectedOption = transitionOptions.find((opt) => opt.value === value);

  return (
    <div className={cn("space-y-3", className)}>
      <Select value={value} onValueChange={(v) => onChange(v as TransitionType)}>
        <SelectTrigger className="w-full bg-input border-border">
          <SelectValue placeholder="Select transition">
            {selectedOption && (
              <div className="flex items-center gap-2">
                {selectedOption.icon}
                <span>{selectedOption.label}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          <div className="py-1.5 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Basic
          </div>
          {transitionOptions
            .filter((opt) => opt.category === "basic")
            .map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {option.icon}
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                </div>
              </SelectItem>
            ))}
          
          <div className="py-1.5 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
            Cinematic
          </div>
          {transitionOptions
            .filter((opt) => opt.category === "cinematic")
            .map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {option.icon}
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                </div>
              </SelectItem>
            ))}
          
          <div className="py-1.5 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
            Creative
          </div>
          {transitionOptions
            .filter((opt) => opt.category === "creative")
            .map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {option.icon}
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                </div>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      {/* Transition Preview */}
      <TransitionPreview type={value} />
    </div>
  );
};

const TransitionPreview = ({ type }: { type: TransitionType }) => {
  return (
    <div className="relative h-16 rounded-lg overflow-hidden bg-muted/50 border border-border">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-2">
          {/* Scene A */}
          <div className="w-12 h-10 rounded bg-primary/30 border border-primary/50 flex items-center justify-center text-xs text-muted-foreground">
            A
          </div>
          
          {/* Transition Arrow */}
          <div className="flex flex-col items-center gap-0.5">
            <div className="text-[10px] text-muted-foreground capitalize">
              {type.replace("-", " ")}
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>
          
          {/* Scene B */}
          <div className="w-12 h-10 rounded bg-secondary/30 border border-secondary/50 flex items-center justify-center text-xs text-muted-foreground">
            B
          </div>
        </div>
      </div>
    </div>
  );
};

export { transitionOptions };
