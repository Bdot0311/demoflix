import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  ArrowRight, 
  Check,
  Sparkles,
  Clock,
  Loader2,
  Wand2
} from "lucide-react";
import demoflixEmblem from "@/assets/demoflix-emblem.png";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileUploadZone, UploadedFile } from "@/components/upload/FileUploadZone";
import { ThemeToggle } from "@/components/ThemeToggle";

const trailerStyles = [
  { id: "netflix", name: "Netflix Series Intro", description: "Dramatic, bold, cinematic reveals", color: "from-red-600 to-red-900" },
  { id: "startup", name: "Startup Launch Trailer", description: "Energetic, modern, growth-focused", color: "from-blue-500 to-purple-600" },
  { id: "futuristic", name: "AI / Futuristic", description: "Sleek, tech-forward, innovative", color: "from-cyan-400 to-blue-600" },
  { id: "apple", name: "Clean Apple-style", description: "Minimal, elegant, premium", color: "from-gray-400 to-gray-600" },
  { id: "cyber", name: "Dark SaaS / Cyber", description: "Edgy, powerful, mysterious", color: "from-purple-600 to-pink-600" },
  { id: "growth", name: "Bold Growth / Sales-Driven", description: "High-energy, conversion-focused", color: "from-orange-500 to-red-500" },
];

const durations = [
  { value: 15, label: "15 seconds", description: "Quick teaser, social ads" },
  { value: 30, label: "30 seconds", description: "Standard trailer length" },
  { value: 45, label: "45 seconds", description: "Detailed feature showcase" },
  { value: 60, label: "60 seconds", description: "Full product story" },
];

const NewDemo = () => {
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedStyle, setSelectedStyle] = useState("netflix");
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setUser(session.user);
    };
    checkAuth();
  }, [navigate]);

  const generateStoryboard = async (projectId: string, assetUrls: string[]) => {
    setIsGeneratingStoryboard(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-storyboard", {
        body: {
          imageUrls: assetUrls,
          style: selectedStyle,
          duration: selectedDuration,
          assetCount: files.length,
        },
      });

      if (error) throw error;

      if (data?.scenes && Array.isArray(data.scenes)) {
        // Get assets to link with scenes
        const { data: assets } = await supabase
          .from("assets")
          .select("id")
          .eq("project_id", projectId)
          .order("order_index");

        // For single asset trailers, all scenes use the same asset
        const isSingleAsset = data.isSingleAsset || files.length === 1;

        // Create scenes with AI-generated Netflix-style content including full motion config
        const scenesToInsert = data.scenes.map((scene: any, index: number) => ({
          project_id: projectId,
          // For single asset, all scenes use the first asset
          asset_id: isSingleAsset ? (assets?.[0]?.id || null) : (assets?.[index]?.id || null),
          order_index: scene.order_index || index,
          headline: scene.headline || `Scene ${index + 1}`,
          subtext: scene.subtext || "",
          duration_ms: scene.duration_ms || Math.floor((selectedDuration * 1000) / data.scenes.length),
          transition: scene.transition || (scene.scene_type === "hook" ? "fade" : "slide-left"),
          zoom_level: scene.zoom_level || 1.2,
          pan_x: scene.pan_direction === "left" ? -5 : scene.pan_direction === "right" ? 5 : 0,
          pan_y: scene.pan_direction === "up" ? -3 : scene.pan_direction === "down" ? 3 : 0,
          // Store the full motion config from AI generation
          motion_config: scene.motion_config || null,
        }));

        await supabase.from("scenes").insert(scenesToInsert);

        toast({
          title: "AI Storyboard Generated!",
          description: "Your trailer scenes have been created automatically.",
        });
      }
    } catch (error: any) {
      console.error("Storyboard generation error:", error);
      toast({
        variant: "destructive",
        title: "AI Generation Failed",
        description: "Using default scene structure instead.",
      });
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };

  const handleCreate = async () => {
    if (!user || !projectName.trim() || files.length === 0) return;
    
    setIsCreating(true);
    try {
      // Create project
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: projectName.trim(),
          style: selectedStyle,
          duration: selectedDuration,
          status: "draft",
        })
        .select()
        .single();

      if (projectError) throw projectError;

      const assetUrls: string[] = [];

      // Upload files to storage and create asset records
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = `${user.id}/${project.id}/${file.id}-${file.file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from("project-assets")
          .upload(filePath, file.file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("project-assets")
          .getPublicUrl(filePath);

        assetUrls.push(publicUrl);

        await supabase.from("assets").insert({
          project_id: project.id,
          user_id: user.id,
          file_name: file.file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.file.size,
          order_index: i,
        });
      }

      // Generate AI storyboard
      await generateStoryboard(project.id, assetUrls);

      toast({
        title: "Project created!",
        description: "Redirecting to the editor...",
      });

      navigate(`/editor/${project.id}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating project",
        description: error.message,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return files.length > 0 && !files.some((f) => f.uploading);
    if (step === 2) return selectedStyle !== "";
    if (step === 3) return selectedDuration > 0;
    if (step === 4) return projectName.trim() !== "";
    return false;
  };

  const isProcessing = isCreating || isGeneratingStoryboard;

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src={demoflixEmblem} alt="DemoFlix" className="h-10 w-auto" />
            <span className="text-xl font-bold tracking-tight text-foreground">DemoFlix</span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link to="/dashboard">
              <Button variant="ghost" className="text-muted-foreground">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Progress Steps */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-3xl mx-auto mb-12">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    s === step
                      ? "bg-primary text-primary-foreground glow-sm"
                      : s < step
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s < step ? <Check className="w-5 h-5" /> : s}
                </div>
                {s < 4 && (
                  <div
                    className={`w-24 md:w-32 h-1 mx-2 rounded-full transition-all ${
                      s < step ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-sm">
            <span className={step >= 1 ? "text-foreground" : "text-muted-foreground"}>Upload</span>
            <span className={step >= 2 ? "text-foreground" : "text-muted-foreground"}>Style</span>
            <span className={step >= 3 ? "text-foreground" : "text-muted-foreground"}>Duration</span>
            <span className={step >= 4 ? "text-foreground" : "text-muted-foreground"}>Create</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-4xl mx-auto">
          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2 text-foreground">Upload Your Assets</h1>
                <p className="text-muted-foreground">
                  Add screenshots, images, or videos of your product
                </p>
              </div>
              <FileUploadZone files={files} setFiles={setFiles} maxFiles={20} />
            </div>
          )}

          {/* Step 2: Style */}
          {step === 2 && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2 text-foreground">Choose Your Style</h1>
                <p className="text-muted-foreground">
                  Select a trailer style that matches your brand
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trailerStyles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-6 rounded-2xl border-2 text-left transition-all hover-glow ${
                      selectedStyle === style.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <div
                      className={`w-full h-24 rounded-xl bg-gradient-to-br ${style.color} mb-4`}
                    />
                    <h3 className="font-semibold text-foreground mb-1">{style.name}</h3>
                    <p className="text-sm text-muted-foreground">{style.description}</p>
                    {selectedStyle === style.id && (
                      <div className="mt-3 flex items-center gap-2 text-primary">
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-medium">Selected</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Duration */}
          {step === 3 && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2 text-foreground">Select Duration</h1>
                <p className="text-muted-foreground">
                  How long should your trailer be?
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {durations.map((duration) => (
                  <button
                    key={duration.value}
                    onClick={() => setSelectedDuration(duration.value)}
                    className={`p-6 rounded-2xl border-2 text-left transition-all hover-glow ${
                      selectedDuration === duration.value
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Clock className="w-7 h-7 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{duration.label}</h3>
                        <p className="text-sm text-muted-foreground">{duration.description}</p>
                      </div>
                    </div>
                    {selectedDuration === duration.value && (
                      <div className="mt-4 flex items-center gap-2 text-primary">
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-medium">Selected</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Name & Create */}
          {step === 4 && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2 text-foreground">Name Your Project</h1>
                <p className="text-muted-foreground">
                  Give your demo trailer a memorable name
                </p>
              </div>

              <div className="max-w-md mx-auto">
                <Input
                  placeholder="e.g., Product Launch Trailer"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="text-lg py-6 bg-input border-border"
                />

                <div className="mt-8 p-6 rounded-2xl bg-card border border-border">
                  <h3 className="font-semibold mb-4 text-foreground">Project Summary</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Files</span>
                      <span className="text-foreground">{files.length} assets</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Style</span>
                      <span className="text-foreground">
                        {trailerStyles.find((s) => s.id === selectedStyle)?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="text-foreground">{selectedDuration} seconds</span>
                    </div>
                  </div>
                </div>

                {/* AI Feature Callout */}
                <div className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/30 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Wand2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">AI-Powered Storyboard</p>
                    <p className="text-xs text-muted-foreground">
                      AI will analyze your assets and generate headlines automatically
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-12">
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 1 || isProcessing}
              className="border-border"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {step < 4 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed()}
                className="bg-primary hover:bg-primary/90"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleCreate}
                disabled={!canProceed() || isProcessing}
                className="bg-primary hover:bg-primary/90 glow"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isGeneratingStoryboard ? "Generating Storyboard..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Project
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewDemo;
