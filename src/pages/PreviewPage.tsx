import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Download,
  Share2,
  Copy,
  Check,
  Play,
  Plus,
  ArrowLeft,
  Monitor,
  Smartphone,
  Square,
  Loader2,
} from "lucide-react";
import demoflixLogo from "@/assets/demoflix-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PreviewPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [project, setProject] = useState<any>(null);
  const [render, setRender] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<"horizontal" | "vertical" | "square">("horizontal");

  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return;

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

      // Load render
      const { data: renderData } = await supabase
        .from("renders")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (renderData) {
        setRender(renderData);
      }

      // Load assets for preview
      const { data: assetsData } = await supabase
        .from("assets")
        .select("*")
        .eq("project_id", projectId)
        .order("order_index")
        .limit(1);

      setAssets(assetsData || []);
      setIsLoading(false);
    };

    loadData();
  }, [projectId, navigate]);

  const handleCopyLink = async () => {
    if (!render?.share_id) return;
    
    const shareUrl = `${window.location.origin}/share/${render.share_id}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({
      title: "Link copied!",
      description: "Share link has been copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    toast({
      title: "Download started",
      description: `Downloading ${selectedFormat} format...`,
    });
    // In a real app, this would trigger the actual download
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center animate-pulse-glow">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <img src={demoflixLogo} alt="DemoFlix" className="h-8 w-auto" />
              <span className="font-semibold text-foreground">{project?.name}</span>
            </div>
          </div>
          <Link to="/new-demo">
            <Button variant="outline" className="border-border">
              <Plus className="w-4 h-4 mr-2" />
              Create Another
            </Button>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Success Message */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-green-500/20 flex items-center justify-center mb-6">
              <Check className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold mb-2 text-foreground">Your Trailer is Ready!</h1>
            <p className="text-muted-foreground">
              Download your cinematic product demo or share it with the world
            </p>
          </div>

          {/* Video Preview */}
          <div className="relative rounded-2xl overflow-hidden border border-border shadow-cinema mb-8 animate-scale-in">
            <div 
              className={`transition-all duration-300 ${
                selectedFormat === "horizontal" ? "aspect-video" :
                selectedFormat === "vertical" ? "aspect-[9/16] max-w-sm mx-auto" :
                "aspect-square max-w-lg mx-auto"
              }`}
            >
              {assets[0] ? (
                assets[0].file_type === "video" ? (
                  <video
                    src={assets[0].file_url}
                    className="w-full h-full object-cover"
                    controls
                    poster={assets[0].file_url}
                  />
                ) : (
                  <div className="relative w-full h-full">
                    <img
                      src={assets[0].file_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                      <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
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

          {/* Format Selection */}
          <div className="flex justify-center gap-4 mb-8">
            <Button
              variant={selectedFormat === "horizontal" ? "default" : "outline"}
              onClick={() => setSelectedFormat("horizontal")}
              className={selectedFormat !== "horizontal" ? "border-border" : ""}
            >
              <Monitor className="w-4 h-4 mr-2" />
              Horizontal (16:9)
            </Button>
            <Button
              variant={selectedFormat === "vertical" ? "default" : "outline"}
              onClick={() => setSelectedFormat("vertical")}
              className={selectedFormat !== "vertical" ? "border-border" : ""}
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Vertical (9:16)
            </Button>
            <Button
              variant={selectedFormat === "square" ? "default" : "outline"}
              onClick={() => setSelectedFormat("square")}
              className={selectedFormat !== "square" ? "border-border" : ""}
            >
              <Square className="w-4 h-4 mr-2" />
              Square (1:1)
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button
              size="lg"
              onClick={handleDownload}
              className="bg-primary hover:bg-primary/90 glow text-lg px-8"
            >
              <Download className="w-5 h-5 mr-2" />
              Download {selectedFormat.charAt(0).toUpperCase() + selectedFormat.slice(1)}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleCopyLink}
              className="border-border text-lg px-8"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5 mr-2" />
                  Share Link
                </>
              )}
            </Button>
          </div>

          {/* Share Link Preview */}
          {render?.share_id && (
            <div className="mt-8 p-4 rounded-xl bg-card border border-border flex items-center justify-between max-w-xl mx-auto">
              <code className="text-sm text-muted-foreground truncate">
                {window.location.origin}/share/{render.share_id}
              </code>
              <Button size="icon" variant="ghost" onClick={handleCopyLink}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Project Stats */}
          <div className="mt-12 grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="text-center p-4 rounded-xl bg-card border border-border/50">
              <div className="text-2xl font-bold text-foreground">{project?.duration}s</div>
              <div className="text-sm text-muted-foreground">Duration</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-card border border-border/50">
              <div className="text-2xl font-bold text-foreground capitalize">{project?.style}</div>
              <div className="text-sm text-muted-foreground">Style</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-card border border-border/50">
              <div className="text-2xl font-bold text-foreground">HD</div>
              <div className="text-sm text-muted-foreground">Quality</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewPage;
