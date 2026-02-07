import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Globe, Check, Loader2, Sparkles, Wand2, ArrowRight } from "lucide-react";
import type { CreationProgress, ProgressStep } from "@/lib/createDemoFromUrl";

interface CreateFromUrlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (url: string) => void;
  isCreating: boolean;
  progress: CreationProgress | null;
}

const steps: { id: ProgressStep; label: string; icon: React.ReactNode }[] = [
  { id: 1, label: "Capturing website", icon: <Globe className="w-4 h-4" /> },
  { id: 2, label: "Creating project", icon: <Sparkles className="w-4 h-4" /> },
  { id: 3, label: "Processing assets", icon: <Wand2 className="w-4 h-4" /> },
  { id: 4, label: "Generating storyboard", icon: <Sparkles className="w-4 h-4" /> },
  { id: 5, label: "Preparing editor", icon: <Check className="w-4 h-4" /> },
];

export function CreateFromUrlDialog({
  open,
  onOpenChange,
  onSubmit,
  isCreating,
  progress,
}: CreateFromUrlDialogProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim());
    }
  };

  const currentStep = progress?.step || 0;
  const progressPercent = currentStep > 0 ? (currentStep / steps.length) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            {isCreating ? "Creating your demo..." : "Create from URL"}
          </DialogTitle>
        </DialogHeader>

        {!isCreating ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="url"
                placeholder="https://your-product.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-input"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Paste any website URL and we'll automatically capture screenshots and generate a demo trailer
              </p>
            </div>

            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wand2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">AI-Powered Creation</p>
                  <p className="text-xs text-muted-foreground">
                    Auto-detects branding, captures pages, generates storyboard
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!url.trim()}>
                Create Demo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6 py-4">
            {/* Progress bar */}
            <div className="space-y-2">
              <Progress value={progressPercent} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">
                {progress?.message}
                {progress?.detail && (
                  <span className="text-xs ml-1">({progress.detail})</span>
                )}
              </p>
            </div>

            {/* Steps list */}
            <div className="space-y-3">
              {steps.map((step) => {
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                
                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      isCurrent
                        ? "bg-primary/10 border border-primary/30"
                        : isCompleted
                        ? "bg-muted/50"
                        : "opacity-50"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? "bg-primary text-primary-foreground"
                          : isCurrent
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        step.icon
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        isCurrent || isCompleted
                          ? "text-foreground font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
