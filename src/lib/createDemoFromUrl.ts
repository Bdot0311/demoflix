import { supabase } from "@/integrations/supabase/client";

interface BrandingData {
  logo?: string;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
  };
  fonts?: { family: string }[];
  tagline?: string;
}

interface PageData {
  url: string;
  title: string;
  screenshot?: string;
  description?: string;
  markdown?: string;
  headlines?: string[];
}

interface FeatureData {
  title: string;
  description?: string;
  icon?: string;
  image?: string;
}

interface TestimonialData {
  quote: string;
  author?: string;
  role?: string;
  company?: string;
  avatar?: string;
}

interface StatData {
  value: string;
  label: string;
}

interface ContentData {
  companyName?: string;
  tagline?: string;
  valueProposition?: string;
  headlines: string[];
  features: FeatureData[];
  testimonials: TestimonialData[];
  stats: StatData[];
  ctaTexts: string[];
  painPoints: string[];
  benefits: string[];
  demoVideos: string[];
  productImages: string[];
}

interface ScrapeResult {
  success: boolean;
  screenshot?: string;
  pages?: PageData[];
  images?: string[];
  videos?: string[];
  branding?: BrandingData;
  metadata?: {
    title: string;
    description?: string;
    sourceURL: string;
  };
  content?: ContentData;
  error?: string;
}

export type ProgressStep = 1 | 2 | 3 | 4 | 5;

export interface CreationProgress {
  step: ProgressStep;
  message: string;
  detail?: string;
}

const STEPS = {
  SCRAPING: { step: 1 as ProgressStep, message: "Scraping everything from website..." },
  CREATING: { step: 2 as ProgressStep, message: "Creating your project..." },
  UPLOADING: { step: 3 as ProgressStep, message: "Processing media assets..." },
  GENERATING: { step: 4 as ProgressStep, message: "AI is crafting your cinematic story..." },
  FINISHING: { step: 5 as ProgressStep, message: "Preparing editor..." },
};

function detectStyleFromBranding(branding?: BrandingData): string {
  if (!branding?.colors) return "startup";
  
  const { primary, background } = branding.colors;
  
  // Check if dark theme
  const isDarkBackground = background && isColorDark(background);
  
  if (isDarkBackground) {
    // Dark backgrounds → cyber or netflix style
    if (primary && isColorReddish(primary)) return "netflix";
    if (primary && isColorPurplish(primary)) return "cyber";
    return "cyber";
  }
  
  // Light backgrounds
  if (primary && isColorBlueish(primary)) return "startup";
  if (primary && isColorGreenish(primary)) return "growth";
  
  // Minimal/neutral → apple style
  return "apple";
}

function isColorDark(color: string): boolean {
  const hex = color.replace("#", "");
  if (hex.length !== 6) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

function isColorReddish(color: string): boolean {
  const hex = color.replace("#", "");
  if (hex.length !== 6) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return r > 150 && r > g * 1.5 && r > b * 1.5;
}

function isColorPurplish(color: string): boolean {
  const hex = color.replace("#", "");
  if (hex.length !== 6) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return r > 100 && b > 100 && b >= r * 0.7 && g < r * 0.8;
}

function isColorBlueish(color: string): boolean {
  const hex = color.replace("#", "");
  if (hex.length !== 6) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return b > 150 && b > r * 1.2 && b > g;
}

function isColorGreenish(color: string): boolean {
  const hex = color.replace("#", "");
  if (hex.length !== 6) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return g > 150 && g > r * 1.2 && g > b * 1.2;
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace("www.", "").split(".")[0];
  } catch {
    return "Demo Project";
  }
}

async function screenshotToBlob(screenshot: string): Promise<Blob | null> {
  // Check if it's a URL (Firecrawl returns URLs, not base64)
  if (screenshot.startsWith('http://') || screenshot.startsWith('https://')) {
    try {
      const response = await fetch(screenshot);
      if (!response.ok) {
        console.error('Failed to fetch screenshot URL:', response.status);
        return null;
      }
      return await response.blob();
    } catch (err) {
      console.error('Error fetching screenshot URL:', err);
      return null;
    }
  }
  
  // Handle data URL format (data:image/png;base64,...)
  if (screenshot.startsWith('data:')) {
    try {
      const base64Data = screenshot.split(",")[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray], { type: "image/png" });
    } catch (err) {
      console.error('Error decoding base64:', err);
      return null;
    }
  }
  
  // Try raw base64
  try {
    const byteCharacters = atob(screenshot);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: "image/png" });
  } catch (err) {
    console.error('Error decoding raw base64:', err);
    return null;
  }
}

export async function createDemoFromUrl(
  url: string,
  userId: string,
  onProgress: (progress: CreationProgress) => void
): Promise<string> {
  // Step 1: Scrape website
  onProgress(STEPS.SCRAPING);
  
  const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke<ScrapeResult>(
    "scrape-website",
    { body: { url, mode: "full" } }
  );
  
  if (scrapeError || !scrapeData?.success) {
    throw new Error(scrapeData?.error || scrapeError?.message || "Failed to capture website");
  }
  
  // Step 2: Create project with auto-detected settings
  onProgress(STEPS.CREATING);
  
  const projectName = scrapeData.metadata?.title || extractDomain(url);
  const style = detectStyleFromBranding(scrapeData.branding);
  const duration = 30; // Default duration
  
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name: projectName.slice(0, 100), // Limit name length
      style,
      duration,
      status: "draft",
      brand_color: scrapeData.branding?.colors?.primary || null,
      brand_color_secondary: scrapeData.branding?.colors?.secondary || null,
      logo_url: scrapeData.branding?.logo || null,
    })
    .select()
    .single();
  
  if (projectError) throw projectError;
  
  // Step 3: Upload screenshots as assets
  onProgress({ ...STEPS.UPLOADING, detail: `0 of ${scrapeData.pages?.length || 0} pages` });
  
  const assetUrls: string[] = [];
  const pages = scrapeData.pages || [];
  
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (!page.screenshot) continue;
    
    onProgress({ 
      ...STEPS.UPLOADING, 
      detail: `${i + 1} of ${pages.length} pages` 
    });
    
    try {
      const blob = await screenshotToBlob(page.screenshot);
      if (!blob) {
        console.error("Failed to convert screenshot to blob");
        continue;
      }
      
      const fileName = `page-${i + 1}.png`;
      const filePath = `${userId}/${project.id}/${Date.now()}-${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from("project-assets")
        .upload(filePath, blob, { contentType: "image/png" });
      
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
        user_id: userId,
        file_name: page.title || fileName,
        file_url: publicUrl,
        file_type: "image",
        file_size: blob.size,
        order_index: i,
      });
    } catch (err) {
      console.error("Error processing screenshot:", err);
    }
  }
  
  if (assetUrls.length === 0) {
    // Fallback: use main screenshot if no pages captured
    if (scrapeData.screenshot) {
      const blob = await screenshotToBlob(scrapeData.screenshot);
      if (blob) {
        const filePath = `${userId}/${project.id}/${Date.now()}-main.png`;
        
        await supabase.storage
          .from("project-assets")
          .upload(filePath, blob, { contentType: "image/png" });
        
        const { data: { publicUrl } } = supabase.storage
          .from("project-assets")
          .getPublicUrl(filePath);
      
        assetUrls.push(publicUrl);
        
        await supabase.from("assets").insert({
          project_id: project.id,
          user_id: userId,
          file_name: "Homepage",
          file_url: publicUrl,
          file_type: "image",
          file_size: blob.size,
          order_index: 0,
        });
      }
    }
  }
  
  // Step 4: Generate AI storyboard with ALL scraped content
  onProgress(STEPS.GENERATING);
  
  try {
    const { data: storyboardData, error: storyboardError } = await supabase.functions.invoke(
      "generate-storyboard",
      {
        body: {
          imageUrls: assetUrls,
          style,
          duration,
          assetCount: assetUrls.length,
          // Pass ALL the scraped website content to AI
          websiteContent: scrapeData.content || {
            companyName: scrapeData.metadata?.title,
            tagline: scrapeData.branding?.tagline,
            valueProposition: scrapeData.metadata?.description,
            headlines: [],
            features: [],
            testimonials: [],
            stats: [],
            ctaTexts: [],
            painPoints: [],
            benefits: [],
            demoVideos: scrapeData.videos || [],
            productImages: scrapeData.images || [],
          },
        },
      }
    );
    
    if (!storyboardError && storyboardData?.scenes) {
      const { data: assets } = await supabase
        .from("assets")
        .select("id")
        .eq("project_id", project.id)
        .order("order_index");
      
      const isMotionGraphics = storyboardData.isMotionGraphics === true;
      
      // Create scenes with motion graphics config stored in motion_config
      const scenesToInsert = storyboardData.scenes.map((scene: any, index: number) => ({
        project_id: project.id,
        // For motion graphics, we don't need assets - the content IS the visual
        asset_id: isMotionGraphics ? null : (assets?.[index]?.id || assets?.[0]?.id || null),
        order_index: scene.order_index || index,
        headline: scene.headline || `Scene ${index + 1}`,
        subtext: scene.subtext || "",
        duration_ms: scene.duration_ms || Math.floor((duration * 1000) / storyboardData.scenes.length),
        transition: scene.transition || "fade",
        zoom_level: scene.zoom_level || 1.0,
        pan_x: 0,
        pan_y: 0,
        // Store ALL motion graphics data in motion_config
        motion_config: {
          // Motion graphics mode flag
          is_motion_graphics: isMotionGraphics,
          // Scene type for motion graphics
          scene_type: scene.type || "intro",
          // Animation style
          animation_style: scene.animation_style || "smooth",
          // Visual elements (features, stats, testimonials, CTA)
          visual_elements: scene.visual_elements || {},
          // Background configuration
          background: scene.background || { type: "full", colors: ["#0a0a0f", "#1a1a2e"] },
          // Voiceover text for narration sync
          voiceover_text: scene.voiceover_text || "",
        },
      }));
      
      await supabase.from("scenes").insert(scenesToInsert);
    }
  } catch (err) {
    console.error("Storyboard generation error:", err);
    // Continue anyway - user can add scenes manually
  }
  
  // Step 5: Finishing
  onProgress(STEPS.FINISHING);
  
  return project.id;
}

export { detectStyleFromBranding, extractDomain };
