import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  MoreVertical, 
  Play, 
  Copy, 
  Trash2, 
  LogOut,
  Sparkles,
  Edit3,
  Loader2
} from "lucide-react";
import demoflixLogo from "@/assets/demoflix-logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: string;
  name: string;
  style: string;
  duration: number;
  status: string;
  thumbnail_url: string | null;
  created_at: string;
}

const Dashboard = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      loadProjects(session.user.id);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadProjects = async (userId: string) => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading projects:", error);
    } else {
      setProjects(data || []);
    }
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "See you next time!",
    });
  };

  const handleDelete = async (projectId: string) => {
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete project.",
      });
    } else {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      toast({
        title: "Deleted",
        description: "Project has been deleted.",
      });
    }
  };

  const handleDuplicate = async (project: Project) => {
    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: `${project.name} (Copy)`,
        style: project.style,
        duration: project.duration,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to duplicate project.",
      });
    } else {
      setProjects((prev) => [data, ...prev]);
      toast({
        title: "Duplicated",
        description: "Project has been duplicated.",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-500";
      case "rendering":
        return "bg-yellow-500/10 text-yellow-500";
      default:
        return "bg-primary/10 text-primary";
    }
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
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src={demoflixLogo} alt="DemoFlix" className="h-10 w-auto" />
            <span className="text-xl font-bold tracking-tight text-foreground">DemoFlix</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/new-demo">
              <Button className="bg-primary hover:bg-primary/90 glow-sm">
                <Plus className="w-4 h-4 mr-2" />
                New Demo
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full bg-muted">
                  <span className="text-sm font-medium text-foreground">
                    {user?.email?.[0]?.toUpperCase() || "U"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Your Projects</h1>
          <p className="text-muted-foreground">Create and manage your cinematic demo trailers</p>
        </div>

        {projects.length === 0 ? (
          /* Empty State */
          <div className="max-w-md mx-auto text-center py-20">
            <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 animate-float">
              <Sparkles className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-foreground">Create your first trailer</h2>
            <p className="text-muted-foreground mb-8">
              Upload your screenshots and let AI transform them into a cinematic product demo.
            </p>
            <Link to="/new-demo">
              <Button size="lg" className="bg-primary hover:bg-primary/90 glow">
                <Plus className="w-5 h-5 mr-2" />
                Create New Demo
              </Button>
            </Link>
          </div>
        ) : (
          /* Projects Grid */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group rounded-2xl bg-card border border-border/50 overflow-hidden hover-glow transition-all"
              >
                {/* Thumbnail */}
                <Link to={project.status === "completed" ? `/preview/${project.id}` : `/editor/${project.id}`}>
                  <div className="aspect-video bg-muted relative cursor-pointer">
                    {project.thumbnail_url ? (
                      <img 
                        src={project.thumbnail_url} 
                        alt={project.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-muted">
                        <img src={demoflixLogo} alt="DemoFlix" className="w-16 h-auto opacity-50" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" className="rounded-full bg-primary/90">
                        {project.status === "completed" ? (
                          <Play className="w-5 h-5" />
                        ) : (
                          <Edit3 className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </Link>
                
                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">{formatDate(project.created_at)}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-border">
                        <DropdownMenuItem 
                          onClick={() => handleDuplicate(project)}
                          className="cursor-pointer"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(project.id)}
                          className="text-destructive focus:text-destructive cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full capitalize ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                    <span className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">
                      {project.duration}s
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
