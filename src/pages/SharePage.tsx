import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Play, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import demoflixLogo from "@/assets/demoflix-logo.png";

const SharePage = () => {
  const { shareId } = useParams();
  const [render, setRender] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadShare = async () => {
      if (!shareId) return;

      // Load render by share ID
      const { data: renderData, error } = await supabase
        .from("renders")
        .select("*, project:projects(*)")
        .eq("share_id", shareId)
        .single();

      if (error || !renderData) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setRender(renderData);
      setProject(renderData.project);

      // Load assets for preview
      const { data: assetsData } = await supabase
        .from("assets")
        .select("*")
        .eq("project_id", renderData.project_id)
        .order("order_index")
        .limit(1);

      setAssets(assetsData || []);
      setIsLoading(false);
    };

    loadShare();
  }, [shareId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center animate-pulse-glow">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-6">
            <img src={demoflixLogo} alt="DemoFlix" className="w-12 h-auto opacity-50" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-foreground">Trailer Not Found</h1>
          <p className="text-muted-foreground">
            This trailer may have been removed or the link is incorrect.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--primary)/0.1)_0%,_transparent_60%)]" />

      <div className="relative z-10 container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="flex items-center justify-center gap-2 mb-4">
              <img src={demoflixLogo} alt="DemoFlix" className="h-10 w-auto" />
            </div>
            <h1 className="text-3xl font-bold mb-2 text-foreground">{project?.name}</h1>
            <p className="text-muted-foreground">
              Created with DemoFlix - Cinematic Product Trailers
            </p>
          </div>

          {/* Video Player */}
          <div className="relative rounded-2xl overflow-hidden border border-border shadow-cinema animate-scale-in">
            <div className="aspect-video">
              {assets[0] ? (
                assets[0].file_type === "video" ? (
                  <video
                    src={assets[0].file_url}
                    className="w-full h-full object-cover"
                    controls
                    autoPlay
                    muted
                  />
                ) : (
                  <div className="relative w-full h-full">
                    <img
                      src={assets[0].file_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                      <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:scale-105 transition-transform animate-pulse-glow">
                        <Play className="w-10 h-10 text-primary-foreground ml-1" />
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <p className="text-muted-foreground">Preview not available</p>
                </div>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <p className="text-muted-foreground mb-4">
              Want to create your own cinematic product trailer?
            </p>
            <a href="/" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="bg-primary hover:bg-primary/90 glow">
                Create Your Trailer
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharePage;
