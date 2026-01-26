import { useState } from "react";
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
  const [hoveredTransition, setHoveredTransition] = useState<TransitionType | null>(null);
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
              <SelectItem 
                key={option.value} 
                value={option.value}
                onMouseEnter={() => setHoveredTransition(option.value)}
                onMouseLeave={() => setHoveredTransition(null)}
              >
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
              <SelectItem 
                key={option.value} 
                value={option.value}
                onMouseEnter={() => setHoveredTransition(option.value)}
                onMouseLeave={() => setHoveredTransition(null)}
              >
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
              <SelectItem 
                key={option.value} 
                value={option.value}
                onMouseEnter={() => setHoveredTransition(option.value)}
                onMouseLeave={() => setHoveredTransition(null)}
              >
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

      {/* Animated Transition Preview */}
      <TransitionPreview 
        type={hoveredTransition || value} 
        isAnimating={hoveredTransition !== null}
      />
    </div>
  );
};

const TransitionPreview = ({ 
  type, 
  isAnimating 
}: { 
  type: TransitionType; 
  isAnimating: boolean;
}) => {
  // Get animation keyframes based on transition type
  const getAnimationStyle = (): React.CSSProperties => {
    if (!isAnimating) return {};
    
    const baseAnimation = "1.2s ease-in-out infinite";
    
    switch (type) {
      case "fade":
      case "dissolve":
        return { animation: `fadePreview ${baseAnimation}` };
      case "slide-left":
        return { animation: `slideLeftPreview ${baseAnimation}` };
      case "slide-right":
        return { animation: `slideRightPreview ${baseAnimation}` };
      case "slide-up":
        return { animation: `slideUpPreview ${baseAnimation}` };
      case "slide-down":
        return { animation: `slideDownPreview ${baseAnimation}` };
      case "zoom-in":
        return { animation: `zoomInPreview ${baseAnimation}` };
      case "zoom-out":
        return { animation: `zoomOutPreview ${baseAnimation}` };
      case "cross-zoom":
        return { animation: `crossZoomPreview ${baseAnimation}` };
      case "wipe-left":
        return { animation: `wipeLeftPreview ${baseAnimation}` };
      case "wipe-right":
        return { animation: `wipeRightPreview ${baseAnimation}` };
      case "flash":
        return { animation: `flashPreview 0.8s ease-in-out infinite` };
      case "glitch":
        return { animation: `glitchPreview 0.6s steps(3) infinite` };
      case "blur":
        return { animation: `blurPreview ${baseAnimation}` };
      case "spin":
        return { animation: `spinPreview ${baseAnimation}` };
      default:
        return {};
    }
  };

  return (
    <>
      {/* Inject keyframes */}
      <style>{`
        @keyframes fadePreview {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes slideLeftPreview {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-100%); }
        }
        @keyframes slideRightPreview {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(100%); }
        }
        @keyframes slideUpPreview {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-100%); }
        }
        @keyframes slideDownPreview {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(100%); }
        }
        @keyframes zoomInPreview {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes zoomOutPreview {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.5); opacity: 0; }
        }
        @keyframes crossZoomPreview {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(0.8); }
          75% { transform: scale(1.2); }
        }
        @keyframes wipeLeftPreview {
          0%, 100% { clip-path: inset(0 0 0 0); }
          50% { clip-path: inset(0 100% 0 0); }
        }
        @keyframes wipeRightPreview {
          0%, 100% { clip-path: inset(0 0 0 0); }
          50% { clip-path: inset(0 0 0 100%); }
        }
        @keyframes flashPreview {
          0%, 100% { filter: brightness(1); background: hsl(var(--primary) / 0.3); }
          50% { filter: brightness(2); background: white; }
        }
        @keyframes glitchPreview {
          0%, 100% { transform: translateX(0); filter: hue-rotate(0deg); }
          33% { transform: translateX(-3px); filter: hue-rotate(90deg); }
          66% { transform: translateX(3px); filter: hue-rotate(180deg); }
        }
        @keyframes blurPreview {
          0%, 100% { filter: blur(0px); opacity: 1; }
          50% { filter: blur(8px); opacity: 0.5; }
        }
        @keyframes spinPreview {
          0%, 100% { transform: rotate(0deg) scale(1); opacity: 1; }
          50% { transform: rotate(180deg) scale(0.7); opacity: 0.5; }
        }
      `}</style>
      
      <div className="relative h-16 rounded-lg overflow-hidden bg-muted/50 border border-border">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2">
            {/* Scene A - Static */}
            <div className="w-12 h-10 rounded bg-primary/30 border border-primary/50 flex items-center justify-center text-xs text-muted-foreground">
              A
            </div>
            
            {/* Transition Animation Demo */}
            <div 
              className="w-8 h-8 rounded bg-gradient-to-r from-primary/30 to-secondary/30 border border-border flex items-center justify-center overflow-hidden"
              style={getAnimationStyle()}
            >
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
            </div>
            
            {/* Scene B */}
            <div className="w-12 h-10 rounded bg-secondary/30 border border-secondary/50 flex items-center justify-center text-xs text-muted-foreground">
              B
            </div>
          </div>
        </div>
        
        {/* Transition name label */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
          <span className="text-[10px] text-muted-foreground capitalize px-1.5 py-0.5 bg-background/80 rounded">
            {type.replace("-", " ")}
          </span>
        </div>
      </div>
    </>
  );
};

export { transitionOptions };
