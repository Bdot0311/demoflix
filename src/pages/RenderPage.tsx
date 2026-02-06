import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Sparkles, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import demoflixLogo from "@/assets/demoflix-logo.png";

const processingMessages = [
  "Analyzing your visuals...",
  "Crafting cinematic transitions...",
  "Applying Netflix-style effects...",
  "Building your trailer...",
  "Rendering horizontal format...",
  "Rendering vertical format...",
  "Rendering square format...",
  "Adding finishing touches...",
  "Almost there...",
];

const RenderPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [project, setProject] = useState<any>(null);
  const [renderId, setRenderId] = useState<string | null>(null);
  const [renderIds, setRenderIds] = useState<Record<string, string> | null>(null);
  const [renderer, setRenderer] = useState<"remotion" | "shotstack" | "remotion-dev">("remotion");
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);

  // Start the render
  const startRender = useCallback(async () => {
    if (!projectId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      // Load project
      const { data: projectData } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectData) {
        setProject(projectData);
      }

      // Create render record
      const shareId = crypto.randomUUID().slice(0, 8);
      const { data: render, error: renderError } = await supabase
        .from("renders")
        .insert({
          project_id: projectId,
          user_id: session.user.id,
          status: "pending",
          progress: 0,
          share_id: shareId,
        })
        .select()
        .single();

      if (renderError) throw renderError;
      setRenderId(render.id);

      // Start the actual render - try Remotion first, falls back to Shotstack
      const { data, error: fnError } = await supabase.functions.invoke("render-remotion", {
        body: { projectId, renderId: render.id },
      });

      if (fnError) throw fnError;

      if (data.error) {
        throw new Error(data.error);
      }

      // Store render IDs (works for both Remotion and Shotstack fallback)
      setRenderIds(data.renderIds);
      setRenderer(data.renderer || "remotion");
      setIsStarting(false);
      setProgress(10);

      toast({
        title: "Rendering started!",
        description: "Your Netflix-style trailer is being created...",
      });
    } catch (err: any) {
      console.error("Render start error:", err);
      setError(err.message || "Failed to start rendering");
      setIsStarting(false);
    }
  }, [projectId, navigate, toast]);

  // Check render status periodically
  useEffect(() => {
    if (!renderId || !renderIds || error) return;

    const checkStatus = async () => {
      try {
        // Use the appropriate status checker based on renderer
        const statusFunction = renderer === "shotstack" 
          ? "check-render-status" 
          : "check-remotion-status";
        
        // Send render IDs with the correct key for each status checker
        const body = renderer === "shotstack"
          ? { renderId, shotstackRenderIds: renderIds }
          : { renderId, remotionRenderIds: renderIds };
        
        const { data, error: fnError } = await supabase.functions.invoke(statusFunction, {
          body,
        });

        if (fnError) throw fnError;

        if (data.status === "completed") {
          setProgress(100);
          
          // Update project status
          await supabase
            .from("projects")
            .update({ status: "completed" })
            .eq("id", projectId);

          toast({
            title: "Trailer complete!",
            description: renderer === "remotion-dev" 
              ? "Development mode complete. Configure AWS for real renders."
              : "Your Netflix-style trailer is ready to view.",
          });

          setTimeout(() => {
            navigate(`/preview/${projectId}`);
          }, 1500);
          return;
        }

        if (data.status === "failed") {
          setError(data.error || "Rendering failed");
          return;
        }

        // Update progress
        setProgress(Math.max(10, data.progress || 10));
      } catch (err: any) {
        console.error("Status check error:", err);
        // Don't set error for transient failures, just log
      }
    };

    // Check every 3 seconds
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [renderId, renderIds, projectId, navigate, toast, error, renderer]);

  // Start render on mount
  useEffect(() => {
    startRender();
  }, [startRender]);

  // Cycle through messages
  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % processingMessages.length);
    }, 4000);

    return () => clearInterval(messageInterval);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--destructive)/0.1)_0%,_transparent_60%)]" />
        
        <div className="relative z-10 text-center max-w-lg px-6">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-destructive/20 flex items-center justify-center mb-8">
            <AlertCircle className="w-12 h-12 text-destructive" />
          </div>
          
          <h1 className="text-2xl font-bold mb-4 text-foreground">Rendering Failed</h1>
          <p className="text-muted-foreground mb-8">{error}</p>
          
          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={() => navigate(`/editor/${projectId}`)}>
              Back to Editor
            </Button>
            <Button onClick={() => {
              setError(null);
              setIsStarting(true);
              setProgress(0);
              startRender();
            }}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--primary)/0.1)_0%,_transparent_60%)]" />
      
      {/* Animated background elements */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-neon-purple/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-neon-cyan/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />

      <div className="relative z-10 text-center max-w-lg px-6">
        {/* Animated Logo */}
        <div className="mb-12">
          <div className="relative">
            <img src={demoflixLogo} alt="DemoFlix" className="w-48 h-auto mx-auto animate-pulse-glow" />
            <div className="absolute inset-0 rounded-3xl border-2 border-primary/50 animate-ping" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold mb-4 text-foreground">
          {isStarting ? "Starting Render..." : "Creating Your Trailer"}
        </h1>
        
        {/* Project Name */}
        {project && (
          <p className="text-lg text-muted-foreground mb-8">
            {project.name}
          </p>
        )}

        {/* Progress */}
        <div className="mb-6">
          <Progress value={Math.min(progress, 100)} className="h-2 bg-muted" />
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>{Math.round(Math.min(progress, 100))}%</span>
            <span>{progress >= 100 ? "Complete!" : "Processing..."}</span>
          </div>
        </div>

        {/* Status Message */}
        <div className="flex items-center justify-center gap-2 text-muted-foreground animate-fade-in">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          <span>{processingMessages[messageIndex]}</span>
        </div>

        {/* Tips */}
        <div className="mt-12 p-6 rounded-2xl bg-card/50 border border-border/50">
          <p className="text-sm text-muted-foreground">
            <span className="text-foreground font-medium">Creating 3 formats:</span> Horizontal (16:9), Vertical (9:16), and Square (1:1) for all your social platforms.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RenderPage;
