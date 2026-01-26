import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Play, Sparkles, Zap, Film, Palette, Clock, Download, ArrowRight } from "lucide-react";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center glow-sm">
              <Film className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">DemoFlix</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Log in
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-primary hover:bg-primary/90 glow-sm">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--primary)/0.15)_0%,_transparent_70%)]" />
        
        {/* Animated background elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-cyan/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center stagger-children">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/50 mb-8">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm text-muted-foreground">AI-Powered Video Generation</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
              Turn Screenshots Into{" "}
              <span className="text-gradient">Cinematic Trailers</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Transform boring SaaS screenshots and screen recordings into Netflix-style product demo trailers. No editing skills required.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup">
                <Button size="lg" className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 glow animate-pulse-glow">
                  <Play className="w-5 h-5 mr-2" />
                  Create Your Trailer
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-border hover:bg-muted">
                Watch Demo
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>

          {/* Hero Preview */}
          <div className="mt-20 max-w-5xl mx-auto">
            <div className="relative rounded-xl overflow-hidden border border-border/50 shadow-cinema animate-cinema-reveal">
              <div className="aspect-video bg-card-gradient flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
                    <Play className="w-12 h-12 text-primary" />
                  </div>
                  <p className="text-muted-foreground">Demo video preview</p>
                </div>
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-xl" style={{ boxShadow: "inset 0 0 60px hsl(var(--primary) / 0.1)" }} />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to{" "}
              <span className="text-gradient">Create Magic</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful AI features that transform your product visuals into cinematic experiences
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 stagger-children">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-8 rounded-2xl bg-card border border-border/50 hover-glow transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:glow-sm transition-all">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Styles Showcase */}
      <section className="py-32 relative bg-muted/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Choose Your{" "}
              <span className="text-gradient">Trailer Style</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Six distinct cinematic styles to match your brand's personality
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trailerStyles.map((style, index) => (
              <div
                key={index}
                className="group relative rounded-2xl overflow-hidden border border-border/50 hover-glow cursor-pointer"
              >
                <div className="aspect-video bg-gradient-to-br from-card to-muted flex items-center justify-center">
                  <div className="text-center p-6">
                    <h3 className="text-lg font-semibold mb-2 text-foreground">{style.name}</h3>
                    <p className="text-sm text-muted-foreground">{style.description}</p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <Button size="sm" className="w-full bg-primary/90 hover:bg-primary">
                    Preview Style
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-32 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Trusted by{" "}
              <span className="text-gradient">SaaS Teams</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Join hundreds of teams creating cinematic demos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="p-8 rounded-2xl bg-card border border-border/50">
                <p className="text-lg text-foreground mb-6">&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-lg font-semibold text-foreground">{testimonial.author[0]}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--primary)/0.1)_0%,_transparent_60%)]" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Create{" "}
              <span className="text-gradient">Your Trailer?</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-10">
              Start creating cinematic product demos in minutes. No editing skills required.
            </p>
            <Link to="/signup">
              <Button size="lg" className="text-lg px-10 py-6 bg-primary hover:bg-primary/90 glow">
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Film className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">DemoFlix</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 DemoFlix. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground cinematic-underline">
                Privacy
              </Link>
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground cinematic-underline">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const features = [
  {
    icon: Sparkles,
    title: "AI Visual Analysis",
    description: "Our AI automatically detects UI sections, dashboards, and key screens to highlight in your trailer.",
  },
  {
    icon: Film,
    title: "Auto Storyboarding",
    description: "Generate a structured trailer flow with hooks, feature reveals, and compelling CTAs.",
  },
  {
    icon: Zap,
    title: "Instant Generation",
    description: "Transform your screenshots into polished trailers in minutes, not hours.",
  },
  {
    icon: Palette,
    title: "Brand Customization",
    description: "Match your brand colors, upload your logo, and personalize every detail.",
  },
  {
    icon: Clock,
    title: "Multiple Durations",
    description: "Choose from 15s, 30s, 45s, or 60s trailers optimized for different platforms.",
  },
  {
    icon: Download,
    title: "Multi-Format Export",
    description: "Download in horizontal, vertical, or square formats for any platform.",
  },
];

const trailerStyles = [
  { name: "Netflix Series Intro", description: "Dramatic, bold, cinematic reveals" },
  { name: "Startup Launch Trailer", description: "Energetic, modern, growth-focused" },
  { name: "AI / Futuristic", description: "Sleek, tech-forward, innovative" },
  { name: "Clean Apple-style", description: "Minimal, elegant, premium" },
  { name: "Dark SaaS / Cyber", description: "Edgy, powerful, mysterious" },
  { name: "Bold Growth / Sales-Driven", description: "High-energy, conversion-focused" },
];

const testimonials = [
  {
    quote: "DemoFlix turned our boring product screenshots into a trailer that looks like it was made by a professional studio.",
    author: "Sarah Chen",
    role: "CEO at StartupXYZ",
  },
  {
    quote: "We saw a 3x increase in demo requests after adding our DemoFlix trailer to our landing page.",
    author: "Marcus Johnson",
    role: "Head of Marketing",
  },
  {
    quote: "The AI-generated storyboard saved us weeks of planning. It just understood what we needed.",
    author: "Elena Rodriguez",
    role: "Product Manager",
  },
];

export default LandingPage;
