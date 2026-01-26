import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import {
  ArrowLeft,
  Type,
  Clock,
  Music,
  Palette,
  Sparkles,
  Save,
  Wand2,
  Loader2,
  Shuffle,
  Undo2,
  Redo2,
  Keyboard,
  Brain,
  Download,
  Monitor,
  Smartphone,
  Square,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import demoflixLogo from "@/assets/demoflix-logo.png";
import { TransitionSelector, TransitionType } from "@/components/editor/TransitionSelector";
import { KeyboardShortcutsModal } from "@/components/editor/KeyboardShortcutsModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePlayback } from "@/hooks/usePlayback";
import { useHistory } from "@/hooks/useHistory";
import { SortableScene } from "@/components/editor/SortableScene";
import { PreviewPlayer } from "@/components/editor/PreviewPlayer";
import { TimelineTrack } from "@/components/editor/TimelineTrack";
import { MusicSelector } from "@/components/editor/MusicSelector";

interface Scene {
  id: string;
  order_index: number;
  headline: string;
  subtext: string;
  duration_ms: number;
  transition: string;
  asset?: {
    file_url: string;
    file_type: string;
  };
}

interface Project {
  id: string;
  name: string;
  style: string;
  duration: number;
  status: string;
  selected_music_track: string | null;
  music_volume: number;
}

interface MusicTrack {
  id: string;
  name: string;
  artist: string | null;
  category: string;
  duration_seconds: number;
  file_url: string;
  preview_url: string | null;
}

interface MusicRecommendation {
  track_id: string;
  track_name: string;
  match_score: number;
  reason: string;
}

interface MusicRecommendation {
  track_id: string;
  track_name: string;
  match_score: number;
  reason: string;
}

const Editor = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [latestRender, setLatestRender] = useState<{
    video_url: string | null;
    video_url_vertical: string | null;
    video_url_square: string | null;
    status: string;
  } | null>(null);
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [musicVolume, setMusicVolume] = useState(80);
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#ef4444");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [isRecommendingMusic, setIsRecommendingMusic] = useState(false);
  const [musicRecommendations, setMusicRecommendations] = useState<MusicRecommendation[]>([]);
  const [storyboardMood, setStoryboardMood] = useState<string | null>(null);

  // History for undo/redo
  const {
    state: scenesHistory,
    set: setSceneHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    reset: resetHistory,
  } = useHistory<Scene[]>([]);

  // Playback hook for real-time preview
  const handleSceneChange = useCallback((sceneId: string) => {
    setSelectedScene(sceneId);
  }, []);

  const {
    isPlaying,
    currentTime,
    currentSceneIndex,
    currentSceneProgress,
    totalDuration,
    toggle: togglePlayback,
    seek,
    seekToScene,
    reset: resetPlayback,
  } = usePlayback({ scenes, onSceneChange: handleSceneChange });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Keyboard shortcuts for playback controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      // Handle Ctrl/Cmd shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.code) {
          case "KeyZ":
            e.preventDefault();
            if (e.shiftKey) {
              // Ctrl+Shift+Z: Redo
              if (canRedo) {
                redo();
                toast({ title: "Redo", description: "Changes restored" });
              }
            } else {
              // Ctrl+Z: Undo
              if (canUndo) {
                undo();
                toast({ title: "Undo", description: "Changes reverted" });
              }
            }
            return;
          case "KeyS":
            e.preventDefault();
            handleSave();
            return;
        }
      }

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlayback();
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (e.shiftKey) {
            seekToScene(0);
          } else {
            const prevIndex = Math.max(0, currentSceneIndex - 1);
            seekToScene(prevIndex);
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (e.shiftKey) {
            seekToScene(scenes.length - 1);
          } else {
            const nextIndex = Math.min(scenes.length - 1, currentSceneIndex + 1);
            seekToScene(nextIndex);
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (selectedScene) {
            const currentIdx = scenes.findIndex((s) => s.id === selectedScene);
            if (currentIdx > 0) {
              setSelectedScene(scenes[currentIdx - 1].id);
            }
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (selectedScene) {
            const currentIdx = scenes.findIndex((s) => s.id === selectedScene);
            if (currentIdx < scenes.length - 1) {
              setSelectedScene(scenes[currentIdx + 1].id);
            }
          }
          break;
        case "Home":
          e.preventDefault();
          seekToScene(0);
          break;
        case "End":
          e.preventDefault();
          seekToScene(scenes.length - 1);
          break;
        case "KeyM":
          e.preventDefault();
          setIsMuted((prev) => !prev);
          break;
        case "Slash":
          // ? key (Shift + /)
          if (e.shiftKey) {
            e.preventDefault();
            setShowShortcutsModal(true);
          }
          break;
        case "Digit1":
        case "Digit2":
        case "Digit3":
        case "Digit4":
        case "Digit5":
        case "Digit6":
        case "Digit7":
        case "Digit8":
        case "Digit9":
          e.preventDefault();
          const sceneNum = parseInt(e.code.replace("Digit", "")) - 1;
          if (sceneNum < scenes.length) {
            seekToScene(sceneNum);
            setSelectedScene(scenes[sceneNum].id);
          }
          break;
        case "Escape":
          e.preventDefault();
          if (isPlaying) {
            togglePlayback();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlayback, seekToScene, currentSceneIndex, scenes, selectedScene, isPlaying, canUndo, canRedo, undo, redo, toast]);

  // Sync history state with scenes
  useEffect(() => {
    if (scenesHistory.length > 0) {
      setScenes(scenesHistory);
    }
  }, [scenesHistory]);

  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      // Load project
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectError || !projectData) {
        toast({
          variant: "destructive",
          title: "Project not found",
          description: "The project you're looking for doesn't exist.",
        });
        navigate("/dashboard");
        return;
      }

      setProject(projectData);
      setSelectedTrack(projectData.selected_music_track || null);
      setMusicVolume(projectData.music_volume || 80);

      // Load music tracks from database
      const { data: tracksData } = await supabase
        .from("music_tracks")
        .select("*")
        .order("category", { ascending: true });

      setMusicTracks(tracksData || []);

      // Load assets
      const { data: assetsData } = await supabase
        .from("assets")
        .select("*")
        .eq("project_id", projectId)
        .order("order_index");

      setAssets(assetsData || []);

      // Load latest render for export
      const { data: renderData } = await supabase
        .from("renders")
        .select("video_url, video_url_vertical, video_url_square, status")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (renderData) {
        setLatestRender(renderData);
      }
      // Load or create scenes
      const { data: scenesData } = await supabase
        .from("scenes")
        .select("*, asset:assets(*)")
        .eq("project_id", projectId)
        .order("order_index");

      if (scenesData && scenesData.length > 0) {
        setScenes(scenesData);
        resetHistory(scenesData);
        setSelectedScene(scenesData[0]?.id || null);
      } else if (assetsData && assetsData.length > 0) {
        // Auto-generate scenes from assets
        const generatedScenes = assetsData.map((asset, index) => ({
          id: crypto.randomUUID(),
          project_id: projectId,
          asset_id: asset.id,
          order_index: index,
          headline: index === 0 ? "Introducing..." : `Feature ${index}`,
          subtext: "",
          duration_ms: Math.floor((projectData.duration * 1000) / assetsData.length),
          transition: "fade",
        }));

        // Save scenes to database
        const { data: insertedScenes } = await supabase
          .from("scenes")
          .insert(generatedScenes)
          .select("*, asset:assets(*)");

        setScenes(insertedScenes || []);
        resetHistory(insertedScenes || []);
        if (insertedScenes?.[0]) setSelectedScene(insertedScenes[0].id);
      }

      setIsLoading(false);
    };

    loadProject();
  }, [projectId, navigate, toast]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = scenes.findIndex((s) => s.id === active.id);
      const newIndex = scenes.findIndex((s) => s.id === over.id);

      const newScenes = arrayMove(scenes, oldIndex, newIndex).map((scene, index) => ({
        ...scene,
        order_index: index,
      }));

      setScenes(newScenes);

      // Update order in database
      for (const scene of newScenes) {
        await supabase
          .from("scenes")
          .update({ order_index: scene.order_index })
          .eq("id", scene.id);
      }
    }
  };

  const activeScene = activeId ? scenes.find((s) => s.id === activeId) : null;

  const updateScene = async (sceneId: string, updates: Partial<Scene>) => {
    const newScenes = scenes.map((s) => 
      s.id === sceneId ? { ...s, ...updates } : s
    );
    setScenes(newScenes);
    setSceneHistory(newScenes);

    await supabase.from("scenes").update(updates).eq("id", sceneId);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save all scenes
      for (const scene of scenes) {
        await supabase
          .from("scenes")
          .update({
            headline: scene.headline,
            subtext: scene.subtext,
            duration_ms: scene.duration_ms,
            order_index: scene.order_index,
            transition: scene.transition || "fade",
          })
          .eq("id", scene.id);
      }

      toast({
        title: "Saved!",
        description: "Your changes have been saved.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error saving",
        description: "Failed to save changes.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!project) return;
    
    // Update project status
    await supabase
      .from("projects")
      .update({ status: "rendering" })
      .eq("id", project.id);

    navigate(`/render/${project.id}`);
  };

  const handleAIGenerate = async () => {
    if (!project || assets.length === 0) {
      toast({
        variant: "destructive",
        title: "No assets",
        description: "Please upload some images first.",
      });
      return;
    }

    setIsGeneratingAI(true);
    try {
      // Get image URLs from assets
      const imageUrls = assets
        .filter((a) => a.file_type === "image")
        .slice(0, 10)
        .map((a) => a.file_url);

      const response = await supabase.functions.invoke("generate-storyboard", {
        body: {
          imageUrls,
          style: project.style || "netflix",
          duration: project.duration || 30,
          assetCount: assets.length,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to generate storyboard");
      }

      const { scenes: generatedScenes } = response.data;

      if (!generatedScenes || generatedScenes.length === 0) {
        throw new Error("No scenes generated");
      }

      // Update existing scenes with AI-generated content
      const updatedScenes = scenes.map((scene, index) => {
        const aiScene = generatedScenes[index];
        if (aiScene) {
          return {
            ...scene,
            headline: aiScene.headline || scene.headline,
            subtext: aiScene.subtext || scene.subtext,
            duration_ms: aiScene.duration_ms || scene.duration_ms,
          };
        }
        return scene;
      });

      // Save to database
      for (const scene of updatedScenes) {
        await supabase
          .from("scenes")
          .update({
            headline: scene.headline,
            subtext: scene.subtext,
            duration_ms: scene.duration_ms,
          })
          .eq("id", scene.id);
      }

      setScenes(updatedScenes);

      toast({
        title: "AI Storyboard Generated!",
        description: "Scene headlines and structure have been created.",
      });
    } catch (error) {
      console.error("AI generation error:", error);
      toast({
        variant: "destructive",
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate storyboard",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleRecommendMusic = async () => {
    if (scenes.length === 0) {
      toast({
        variant: "destructive",
        title: "No scenes",
        description: "Create some scenes first to get music recommendations.",
      });
      return;
    }

    setIsRecommendingMusic(true);
    try {
      const response = await supabase.functions.invoke("recommend-music", {
        body: {
          scenes: scenes.map((s) => ({
            headline: s.headline,
            subtext: s.subtext,
            transition: s.transition,
          })),
          availableTracks: musicTracks,
          projectStyle: project?.style || "cinematic",
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to get recommendations");
      }

      const { recommendations, overall_mood } = response.data;
      
      setMusicRecommendations(recommendations || []);
      setStoryboardMood(overall_mood || null);

      // Auto-select the top recommendation by matching track name
      if (recommendations?.[0]?.track_name) {
        const matchedTrack = musicTracks.find(t => t.name === recommendations[0].track_name);
        if (matchedTrack) {
          handleSelectTrack(matchedTrack.id);
        }
      }

      toast({
        title: "Music Recommendations Ready!",
        description: `Mood detected: ${overall_mood || "cinematic"}`,
      });
    } catch (error) {
      console.error("Music recommendation error:", error);
      toast({
        variant: "destructive",
        title: "Recommendation failed",
        description: error instanceof Error ? error.message : "Failed to analyze storyboard",
      });
    } finally {
      setIsRecommendingMusic(false);
    }
  };

  const handleSelectTrack = async (trackId: string) => {
    setSelectedTrack(trackId);
    
    // Save to database
    if (projectId) {
      await supabase
        .from("projects")
        .update({ selected_music_track: trackId })
        .eq("id", projectId);
    }
  };

  const handleVolumeChange = async (volume: number) => {
    setMusicVolume(volume);
    
    // Save to database (debounced effect would be better for production)
    if (projectId) {
      await supabase
        .from("projects")
        .update({ music_volume: volume })
        .eq("id", projectId);
    }
  };

  type ExportFormat = {
    id: string;
    name: string;
    aspect: string;
    urlKey: "video_url" | "video_url_vertical" | "video_url_square";
    icon: React.ReactNode;
  };

  const exportFormats: ExportFormat[] = [
    { id: "horizontal", name: "Horizontal", aspect: "16:9", urlKey: "video_url", icon: <Monitor className="w-4 h-4" /> },
    { id: "vertical", name: "Vertical", aspect: "9:16", urlKey: "video_url_vertical", icon: <Smartphone className="w-4 h-4" /> },
    { id: "square", name: "Square", aspect: "1:1", urlKey: "video_url_square", icon: <Square className="w-4 h-4" /> },
  ];

  const socialFormats: ExportFormat[] = [
    { id: "youtube", name: "YouTube", aspect: "16:9", urlKey: "video_url", icon: <Monitor className="w-4 h-4" /> },
    { id: "tiktok", name: "TikTok / Reels", aspect: "9:16", urlKey: "video_url_vertical", icon: <Smartphone className="w-4 h-4" /> },
    { id: "instagram-feed", name: "Instagram Feed", aspect: "1:1", urlKey: "video_url_square", icon: <Square className="w-4 h-4" /> },
    { id: "instagram-story", name: "Instagram Story", aspect: "9:16", urlKey: "video_url_vertical", icon: <Smartphone className="w-4 h-4" /> },
    { id: "twitter", name: "Twitter / X", aspect: "16:9", urlKey: "video_url", icon: <Monitor className="w-4 h-4" /> },
    { id: "linkedin", name: "LinkedIn", aspect: "16:9", urlKey: "video_url", icon: <Monitor className="w-4 h-4" /> },
  ];

  const handleExportVideo = (format: ExportFormat) => {
    if (!project) return;

    // Check if there's a completed render
    if (!latestRender || latestRender.status !== "completed") {
      toast({
        variant: "destructive",
        title: "No video available",
        description: "Generate your trailer first, then come back to export the MP4.",
      });
      return;
    }

    const videoUrl = latestRender[format.urlKey];
    if (!videoUrl) {
      toast({
        variant: "destructive",
        title: "Format not available",
        description: `The ${format.name} format hasn't been rendered yet.`,
      });
      return;
    }

    // Download the MP4 file
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `${project.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${format.id}.mp4`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast({
      title: "Download Started",
      description: `Downloading ${format.name} (${format.aspect}) format...`,
    });
  };

  const selectedSceneData = scenes.find((s) => s.id === selectedScene);

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation */}
      <nav className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
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
          <div className="flex items-center gap-2">
            {/* Undo/Redo */}
            <Button
              variant="ghost"
              size="icon"
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-4 h-4" />
            </Button>
            
            <div className="w-px h-6 bg-border mx-1" />
            
            {/* Keyboard Shortcuts */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowShortcutsModal(true)}
              title="Keyboard Shortcuts (?)"
            >
              <Keyboard className="w-4 h-4" />
            </Button>
            
            <div className="w-px h-6 bg-border mx-1" />
            
            <Button 
              variant="outline" 
              onClick={handleAIGenerate} 
              disabled={isGeneratingAI || assets.length === 0}
              className="border-border"
            >
              {isGeneratingAI ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              {isGeneratingAI ? "Generating..." : "AI Generate"}
            </Button>
            <Button variant="outline" onClick={handleSave} disabled={isSaving} className="border-border">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="border-border"
                  disabled={!latestRender?.video_url}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export MP4
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card border-border z-50">
                <DropdownMenuLabel>Standard Formats</DropdownMenuLabel>
                {exportFormats.map((format) => (
                  <DropdownMenuItem
                    key={format.id}
                    onClick={() => handleExportVideo(format)}
                    className="cursor-pointer"
                  >
                    {format.icon}
                    <span className="ml-2">{format.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{format.aspect}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Social Platforms</DropdownMenuLabel>
                {socialFormats.map((format) => (
                  <DropdownMenuItem
                    key={format.id}
                    onClick={() => handleExportVideo(format)}
                    className="cursor-pointer"
                  >
                    {format.icon}
                    <span className="ml-2">{format.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{format.aspect}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleGenerate} className="bg-primary hover:bg-primary/90 glow-sm">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Trailer
            </Button>
          </div>
        </div>
      </nav>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        open={showShortcutsModal}
        onOpenChange={setShowShortcutsModal}
      />

      <div className="flex-1 flex">
        {/* Left Sidebar - Scene List */}
        <div className="w-72 border-r border-border/50 bg-card/30 p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
            Scenes (drag to reorder)
          </h3>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={scenes.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {scenes.map((scene, index) => (
                  <SortableScene
                    key={scene.id}
                    scene={scene}
                    index={index}
                    isSelected={selectedScene === scene.id}
                    onSelect={() => setSelectedScene(scene.id)}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeScene && (
                <div className="p-3 rounded-xl bg-primary/30 border border-primary shadow-lg backdrop-blur-sm">
                  <div className="text-sm font-medium text-foreground truncate">
                    {activeScene.headline || "Scene"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(activeScene.duration_ms / 1000).toFixed(1)}s
                  </div>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Main Preview Area */}
        <div className="flex-1 flex flex-col">
          {/* Preview */}
          <div className="flex-1 flex items-center justify-center p-8">
            <PreviewPlayer
              scenes={scenes}
              currentSceneIndex={currentSceneIndex}
              currentSceneProgress={currentSceneProgress}
              isPlaying={isPlaying}
              onTogglePlay={togglePlayback}
              fallbackAsset={assets[0]}
            />
          </div>

          {/* Timeline */}
          <TimelineTrack
            scenes={scenes}
            selectedSceneId={selectedScene}
            currentTime={currentTime}
            totalDuration={totalDuration}
            currentSceneIndex={currentSceneIndex}
            isPlaying={isPlaying}
            isMuted={isMuted}
            activeId={activeId}
            onSelectScene={(id) => {
              setSelectedScene(id);
              const index = scenes.findIndex((s) => s.id === id);
              if (index >= 0) seekToScene(index);
            }}
            onTogglePlay={togglePlayback}
            onToggleMute={() => setIsMuted(!isMuted)}
            onSeek={seek}
            onSeekToScene={seekToScene}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            sensors={sensors}
          />
        </div>

        {/* Right Sidebar - Properties */}
        <div className="w-80 border-l border-border/50 bg-card/30 p-4 overflow-y-auto">
          {selectedSceneData ? (
            <div className="space-y-6">
              {/* Text Controls */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  Text
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Headline</label>
                    <Input
                      value={selectedSceneData.headline || ""}
                      onChange={(e) => updateScene(selectedSceneData.id, { headline: e.target.value })}
                      placeholder="Enter headline..."
                      className="bg-input border-border"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Subtext</label>
                    <Input
                      value={selectedSceneData.subtext || ""}
                      onChange={(e) => updateScene(selectedSceneData.id, { subtext: e.target.value })}
                      placeholder="Enter subtext..."
                      className="bg-input border-border"
                    />
                  </div>
                </div>
              </div>

              {/* Transition */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
                  <Shuffle className="w-4 h-4" />
                  Transition
                </h3>
                <TransitionSelector
                  value={(selectedSceneData.transition as TransitionType) || "fade"}
                  onChange={(value) => updateScene(selectedSceneData.id, { transition: value })}
                />
              </div>

              {/* Timing */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Duration
                </h3>
                <div className="space-y-3">
                  <Slider
                    value={[selectedSceneData.duration_ms]}
                    onValueChange={(value) => updateScene(selectedSceneData.id, { duration_ms: value[0] })}
                    min={1000}
                    max={15000}
                    step={500}
                    className="w-full"
                  />
                  <div className="text-sm text-muted-foreground text-center">
                    {(selectedSceneData.duration_ms / 1000).toFixed(1)} seconds
                  </div>
                </div>
              </div>

              {/* Music Selector */}
              <MusicSelector
                tracks={musicTracks}
                selectedTrackId={selectedTrack}
                onSelectTrack={handleSelectTrack}
                recommendations={musicRecommendations}
                storyboardMood={storyboardMood}
                isRecommending={isRecommendingMusic}
                onRecommend={handleRecommendMusic}
                volume={musicVolume}
                onVolumeChange={handleVolumeChange}
                disabled={scenes.length === 0}
              />

              {/* Brand Colors */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Brand Color
                </h3>
                <div className="flex gap-2">
                  {["#ef4444", "#3b82f6", "#22c55e", "#a855f7", "#f59e0b"].map((color) => (
                    <button
                      key={color}
                      onClick={() => setPrimaryColor(color)}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        primaryColor === color ? "border-foreground scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <p>Select a scene to edit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Editor;
