import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Film, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

const processingMessages = [
  "Analyzing your visuals...",
  "Crafting cinematic transitions...",
  "Applying style effects...",
  "Syncing to the beat...",
  "Adding finishing touches...",
  "Rendering final output...",
];

const RenderPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (data) {
        setProject(data);
      }
    };

    loadProject();
  }, [projectId, navigate]);

  useEffect(() => {
    // Simulate rendering progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.random() * 3;
      });
    }, 200);

    // Cycle through messages
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % processingMessages.length);
    }, 3000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, []);

  useEffect(() => {
    // When progress is complete, create render record and navigate
    const completeRender = async () => {
      if (progress >= 100 && projectId) {
        // Create a render record
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const shareId = crypto.randomUUID().slice(0, 8);

        await supabase.from("renders").insert({
          project_id: projectId,
          user_id: session.user.id,
          status: "completed",
          progress: 100,
          share_id: shareId,
          completed_at: new Date().toISOString(),
        });

        // Update project status
        await supabase
          .from("projects")
          .update({ status: "completed" })
          .eq("id", projectId);

        // Navigate to preview
        setTimeout(() => {
          navigate(`/preview/${projectId}`);
        }, 1000);
      }
    };

    completeRender();
  }, [progress, projectId, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--primary)/0.1)_0%,_transparent_60%)]" />
      
      {/* Animated background elements */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-neon-purple/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-neon-cyan/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />

      <div className="relative z-10 text-center max-w-lg px-6">
        {/* Animated Logo */}
        <div className="mb-12">
          <div className="w-32 h-32 mx-auto rounded-3xl bg-primary/20 flex items-center justify-center animate-pulse-glow relative">
            <Film className="w-16 h-16 text-primary" />
            <div className="absolute inset-0 rounded-3xl border-2 border-primary/50 animate-ping" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold mb-4 text-foreground">
          Creating Your Trailer
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
            <span className="text-foreground font-medium">Tip:</span> Your trailer is being rendered in HD quality. This usually takes 30-60 seconds depending on duration.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RenderPage;
