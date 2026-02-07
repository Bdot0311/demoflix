import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CursorPath {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  clickFrame?: number;
}

interface UIHighlight {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  delay: number;
  duration: number;
}

interface ZoomTarget {
  x: number;
  y: number;
  scale: number;
  startFrame: number;
  endFrame: number;
}

interface MotionConfig {
  animation_style: "fade-scale" | "slide" | "zoom";
  spring: {
    damping: number;
    mass: number;
    stiffness: number;
    overshootClamping: boolean;
  };
  stagger_delay_frames: number;
  entrance_delay_frames: number;
  effects: ("vignette")[];
  camera: {
    zoom_start: number;
    zoom_end: number;
    pan_x: number;
    pan_y: number;
  };
  cursor_path?: CursorPath;
  ui_highlights?: UIHighlight[];
  zoom_targets?: ZoomTarget[];
}

interface SceneData {
  order_index: number;
  headline: string;
  subtext: string;
  duration_ms: number;
  scene_type: string;
  zoom_level: number;
  pan_direction: string;
  transition: string;
  motion_config: MotionConfig;
}

// Simplified spring presets
const springPresets = {
  fast: { damping: 30, mass: 0.5, stiffness: 300, overshootClamping: true },
  smooth: { damping: 25, mass: 0.8, stiffness: 150, overshootClamping: true },
  bounce: { damping: 15, mass: 1, stiffness: 200, overshootClamping: false },
};

// Fetch image and convert to base64
async function fetchImageAsBase64(url: string): Promise<{ mediaType: string; data: string } | null> {
  try {
    const response = await fetch(url, { 
      headers: { 'Accept': 'image/*' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      console.log(`Failed to fetch image ${url}: ${response.status}`);
      return null;
    }
    
    const contentType = response.headers.get('content-type') || 'image/png';
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);
    
    let mediaType = 'image/png';
    if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      mediaType = 'image/jpeg';
    } else if (contentType.includes('gif')) {
      mediaType = 'image/gif';
    } else if (contentType.includes('webp')) {
      mediaType = 'image/webp';
    }
    
    return { mediaType, data: base64 };
  } catch (error) {
    console.error(`Error fetching image ${url}:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrls, style, duration, assetCount, websiteContent } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    // Scene count: 5-7 for single asset, or match asset count
    const isSingleAsset = assetCount === 1;
    const targetSceneCount = isSingleAsset 
      ? Math.max(5, Math.min(7, Math.floor(duration / 4)))
      : assetCount;

    const sceneDuration = Math.floor((duration * 1000) / targetSceneCount);
    const sceneDurationFrames = Math.round((sceneDuration / 1000) * 30); // 30 FPS

    // Build context from scraped website content
    let contentContext = "";
    if (websiteContent) {
      const parts: string[] = [];
      
      if (websiteContent.companyName) {
        parts.push(`COMPANY: ${websiteContent.companyName}`);
      }
      if (websiteContent.tagline) {
        parts.push(`TAGLINE: ${websiteContent.tagline}`);
      }
      if (websiteContent.headlines?.length > 0) {
        parts.push(`HEADLINES: ${websiteContent.headlines.slice(0, 5).join(" | ")}`);
      }
      if (websiteContent.features?.length > 0) {
        const featureList = websiteContent.features.slice(0, 4).map((f: any) => f.title).join(", ");
        parts.push(`FEATURES: ${featureList}`);
      }
      if (websiteContent.testimonials?.length > 0) {
        const quote = websiteContent.testimonials[0];
        parts.push(`TESTIMONIAL: "${quote.quote?.slice(0, 80)}"`);
      }
      if (websiteContent.stats?.length > 0) {
        const statList = websiteContent.stats.slice(0, 2).map((s: any) => `${s.value} ${s.label}`).join(", ");
        parts.push(`STATS: ${statList}`);
      }
      if (websiteContent.ctaTexts?.length > 0) {
        parts.push(`CTAs: ${websiteContent.ctaTexts.slice(0, 2).join(", ")}`);
      }
      
      if (parts.length > 0) {
        contentContext = `\n\n<website_content>\n${parts.join("\n")}\n</website_content>`;
      }
    }

    // CINEMATIC MOTION DESIGNER PROMPT
    const systemPrompt = `You are a cinematic motion designer creating Figma/Cursor-style product demo videos. You analyze screenshots to create immersive product walkthroughs with animated cursors and UI highlights.

<narrative_structure>
1. PAIN-POINT: Hook with frustration (2-4 words max)
2. SOLUTION: "Meet [Product]" pivot moment  
3. WORKFLOW: Feature demonstrations with cursor pointing to key UI
4. RESULT: Show transformation with stats if available
5. CTA: Compelling call to action
</narrative_structure>

<motion_design_rules>
For EACH scene, you must generate:

1. headline + subtext (2-5 words MAX)

2. cursor_path: Simulate a user navigating the product
   - startX, startY: Where cursor begins (0-100 percentage)
   - endX, endY: Where cursor moves to (0-100 percentage)
   - clickFrame: Frame number when click happens (usually 50-70% through scene)
   - Move cursor TO buttons, inputs, key UI elements you see in the screenshot

3. ui_highlights: Array of 1-2 UI elements to highlight per scene
   - x, y: Center position (0-100 percentage)
   - width, height: Size in pixels (scaled for 1920x1080)
   - label: Short text like "Click here" or feature name
   - delay: Frames before highlight appears (10-30)
   - duration: How long highlight shows (40-60 frames)

4. zoom_targets: For hero moments, zoom into specific UI regions
   - x, y: Center point to zoom into (0-100 percentage)
   - scale: Zoom level (1.5-2.0 for emphasis)
   - startFrame, endFrame: Timing of zoom (use for key moments)

ANALYZE THE SCREENSHOTS to identify:
- Buttons and CTAs (common positions: top-right nav, center hero, bottom)
- Input fields and forms
- Feature cards or sections
- Navigation elements
- Hero images or product screenshots
</motion_design_rules>

<rules>
- Headlines: 2-5 words MAX
- Use power verbs: Launch, Build, Create, Transform, Automate
- Match brand tone from website content
- Every scene must evoke emotion
- Return ONLY valid JSON, no explanation
</rules>${contentContext}`;

    const userPrompt = `Create ${targetSceneCount} scenes for a ${duration}-second cinematic trailer.
Each scene is ${sceneDurationFrames} frames at 30fps.

${websiteContent?.companyName ? `Company: ${websiteContent.companyName}` : ""}
${websiteContent?.features?.length > 0 ? `Features: ${websiteContent.features.slice(0, 3).map((f: any) => f.title).join(", ")}` : ""}

FOR EACH SCENE provide:
- headline: 2-5 word power statement
- subtext: short supporting line (optional)
- scene_type: "pain-point", "solution", "workflow", "feature", "result", or "cta"
- zoom_level: 1.0-1.5
- pan_direction: "left", "right", "up", "down", or "center"
- cursor_path: { startX, startY, endX, endY, clickFrame } - simulate user interaction
- ui_highlights: Array of { x, y, width, height, label, delay, duration } - highlight key UI
- zoom_targets: Array of { x, y, scale, startFrame, endFrame } - for dramatic moments

IMPORTANT: Analyze any provided screenshots to place cursor and highlights at REAL UI elements.

Return ONLY a valid JSON array. Example:
[
  {
    "order_index": 0,
    "headline": "STILL DOING THIS MANUALLY?",
    "subtext": "",
    "duration_ms": ${sceneDuration},
    "scene_type": "pain-point",
    "zoom_level": 1.3,
    "pan_direction": "center",
    "cursor_path": { "startX": 20, "startY": 30, "endX": 75, "endY": 45, "clickFrame": ${Math.round(sceneDurationFrames * 0.6)} },
    "ui_highlights": [{ "x": 75, "y": 45, "width": 200, "height": 50, "label": "Old way", "delay": 15, "duration": 50 }],
    "zoom_targets": [{ "x": 50, "y": 50, "scale": 1.8, "startFrame": 20, "endFrame": ${sceneDurationFrames - 10} }]
  }
]`;

    // Build content with images for Claude vision
    const content: any[] = [{ type: "text", text: userPrompt }];

    // Process up to 4 images
    if (imageUrls?.length > 0) {
      const imagesToProcess = imageUrls
        .filter((url: string) => url.match(/\.(jpg|jpeg|png|gif|webp)/i))
        .slice(0, 4);
      
      console.log(`Processing ${imagesToProcess.length} images for vision analysis`);
      
      for (const url of imagesToProcess) {
        const imageData = await fetchImageAsBase64(url);
        if (imageData) {
          content.push({
            type: "image",
            source: {
              type: "base64",
              media_type: imageData.mediaType,
              data: imageData.data,
            },
          });
        }
      }
    }

    console.log("Calling Claude API with", content.length, "content blocks for cinematic storyboard");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          { role: "user", content },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", response.status, errorText);
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Invalid Anthropic API key. Please check your credentials." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 529) {
        return new Response(
          JSON.stringify({ error: "Claude is overloaded. Please try again shortly." }),
          { status: 529, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content_text = data.content?.[0]?.text || "";

    console.log("Claude Response:", content_text.slice(0, 800));

    // Parse JSON from response
    let scenes: any[] = [];
    try {
      const jsonMatch = content_text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        scenes = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse Claude response:", parseError);
    }

    // Fallback scenes with cinematic motion if AI fails
    if (!scenes || scenes.length < 3) {
      console.log("Using fallback cinematic scenes");
      
      const fallbackScenes = [
        { 
          headline: "STILL DOING THIS MANUALLY?", 
          subtext: "", 
          type: "pain-point",
          cursor: { startX: 20, startY: 20, endX: 80, endY: 60, clickFrame: Math.round(sceneDurationFrames * 0.7) },
          highlights: [{ x: 80, y: 60, width: 180, height: 45, label: "Old way", delay: 20, duration: 50 }],
          zoom: { x: 50, y: 50, scale: 1.6, start: 25, end: sceneDurationFrames - 10 }
        },
        { 
          headline: "TIME TO CHANGE", 
          subtext: "Meet the smarter way", 
          type: "solution",
          cursor: { startX: 10, startY: 50, endX: 50, endY: 50, clickFrame: Math.round(sceneDurationFrames * 0.6) },
          highlights: [{ x: 50, y: 50, width: 250, height: 60, label: "New solution", delay: 15, duration: 55 }],
          zoom: null
        },
        { 
          headline: "SIMPLE. FAST. POWERFUL.", 
          subtext: "Get started in seconds", 
          type: "workflow",
          cursor: { startX: 30, startY: 30, endX: 70, endY: 70, clickFrame: Math.round(sceneDurationFrames * 0.65) },
          highlights: [
            { x: 70, y: 70, width: 150, height: 50, label: "Click here", delay: 20, duration: 45 }
          ],
          zoom: null
        },
        { 
          headline: "SEE RESULTS INSTANTLY", 
          subtext: "", 
          type: "feature",
          cursor: { startX: 50, startY: 20, endX: 50, endY: 80, clickFrame: Math.round(sceneDurationFrames * 0.7) },
          highlights: [],
          zoom: { x: 50, y: 60, scale: 1.8, start: 15, end: sceneDurationFrames - 15 }
        },
        { 
          headline: "TEAMS LOVE IT", 
          subtext: "Join thousands of users", 
          type: "result",
          cursor: null,
          highlights: [],
          zoom: null
        },
        { 
          headline: "START FREE TODAY", 
          subtext: "", 
          type: "cta",
          cursor: { startX: 30, startY: 40, endX: 50, endY: 60, clickFrame: Math.round(sceneDurationFrames * 0.8) },
          highlights: [{ x: 50, y: 60, width: 200, height: 55, label: "Get Started", delay: 25, duration: 50 }],
          zoom: null
        },
      ];

      scenes = Array.from({ length: targetSceneCount }, (_, i) => {
        const sceneIdx = i === 0 ? 0 
          : i === targetSceneCount - 1 ? fallbackScenes.length - 1
          : Math.min(i, fallbackScenes.length - 2);
        const scene = fallbackScenes[sceneIdx];
        
        return {
          order_index: i,
          headline: scene.headline,
          subtext: scene.subtext,
          duration_ms: sceneDuration,
          scene_type: scene.type,
          zoom_level: 1.2,
          pan_direction: "center",
          cursor_path: scene.cursor,
          ui_highlights: scene.highlights,
          zoom_targets: scene.zoom ? [scene.zoom] : [],
        };
      });
    }

    // Enhance scenes with full motion config
    const enhancedScenes: SceneData[] = scenes.map((scene, i) => {
      const sceneType = scene.scene_type || "feature";
      const sceneFrames = Math.round((scene.duration_ms || sceneDuration) / 1000 * 30);
      
      // Build camera config
      const camera = {
        zoom_start: 1.0,
        zoom_end: Math.min(scene.zoom_level || 1.15, 1.5),
        pan_x: scene.pan_direction === "left" ? -3 : scene.pan_direction === "right" ? 3 : 0,
        pan_y: scene.pan_direction === "up" ? -2 : scene.pan_direction === "down" ? 2 : 0,
      };

      // Build motion config with cursor, highlights, zoom targets
      const motionConfig: MotionConfig = {
        animation_style: sceneType === "cta" || sceneType === "result" ? "zoom" 
          : sceneType === "workflow" ? "slide" : "fade-scale",
        spring: sceneType === "cta" ? springPresets.bounce : springPresets.fast,
        stagger_delay_frames: 0,
        entrance_delay_frames: 3,
        effects: ["vignette"],
        camera,
        cursor_path: scene.cursor_path || undefined,
        ui_highlights: (scene.ui_highlights || []).map((h: any) => ({
          x: h.x || 50,
          y: h.y || 50,
          width: h.width || 150,
          height: h.height || 50,
          label: h.label,
          delay: h.delay || 15,
          duration: h.duration || Math.min(50, sceneFrames - 20),
        })),
        zoom_targets: (scene.zoom_targets || []).map((z: any) => ({
          x: z.x || 50,
          y: z.y || 50,
          scale: z.scale || 1.5,
          startFrame: z.startFrame || z.start || 20,
          endFrame: z.endFrame || z.end || sceneFrames - 10,
        })),
      };

      // Determine transition
      let transition = "fade";
      if (sceneType === "solution" || sceneType === "cta") {
        transition = "zoom";
      } else if (sceneType === "workflow" || sceneType === "feature") {
        transition = "slide";
      }
      if (i === 0) transition = "fade";

      return {
        order_index: scene.order_index ?? i,
        headline: scene.headline || "POWER",
        subtext: scene.subtext || "",
        duration_ms: scene.duration_ms || sceneDuration,
        scene_type: sceneType,
        zoom_level: scene.zoom_level || 1.2,
        pan_direction: scene.pan_direction || "center",
        transition,
        motion_config: motionConfig,
      };
    });

    console.log("Generated", enhancedScenes.length, "cinematic scenes with cursor/highlights/zooms");

    return new Response(
      JSON.stringify({ 
        scenes: enhancedScenes,
        isSingleAsset,
        targetSceneCount
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Storyboard generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
