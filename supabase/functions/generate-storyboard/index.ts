import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

// Motion config based on scene type
const getMotionConfigForSceneType = (sceneType: string): MotionConfig => {
  switch (sceneType) {
    case "pain-point":
    case "hook":
      return {
        animation_style: "fade-scale",
        spring: springPresets.smooth,
        stagger_delay_frames: 0,
        entrance_delay_frames: 3,
        effects: ["vignette"],
      };
    case "solution":
    case "result":
    case "cta":
      return {
        animation_style: "zoom",
        spring: springPresets.bounce,
        stagger_delay_frames: 0,
        entrance_delay_frames: 4,
        effects: ["vignette"],
      };
    case "workflow":
    case "feature":
    case "how-it-works":
    default:
      return {
        animation_style: "slide",
        spring: springPresets.fast,
        stagger_delay_frames: 0,
        entrance_delay_frames: 3,
        effects: ["vignette"],
      };
  }
};

// Transition based on scene type
const getTransitionForSceneType = (sceneType: string, sceneIndex: number): string => {
  if (sceneIndex === 0) return "fade";
  
  switch (sceneType) {
    case "solution":
    case "result":
    case "cta":
      return "zoom";
    case "workflow":
    case "feature":
      return "slide";
    default:
      return "fade";
  }
};

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

    // Claude-optimized system prompt with XML structure
    const systemPrompt = `You are a Netflix trailer director creating punchy product demo videos.

<narrative_structure>
1. PAIN-POINT: Hook with frustration (2-4 words max)
2. SOLUTION: "Meet [Product]" pivot moment
3. WORKFLOW: Feature demonstrations (action verbs)
4. RESULT: Show transformation with stats if available
5. CTA: Compelling call to action
</narrative_structure>

<rules>
- Headlines: 2-5 words MAX
- Use power verbs: Launch, Build, Create, Transform, Automate
- Match brand tone from website content
- Every scene must evoke emotion
- Return ONLY valid JSON, no explanation
</rules>${contentContext}`;

    const userPrompt = `Create ${targetSceneCount} scenes for a ${duration}-second trailer.

${websiteContent?.companyName ? `Company: ${websiteContent.companyName}` : ""}
${websiteContent?.features?.length > 0 ? `Features: ${websiteContent.features.slice(0, 3).map((f: any) => f.title).join(", ")}` : ""}

FOR EACH SCENE provide:
- headline: 2-5 word power statement
- subtext: short supporting line (optional)
- scene_type: "pain-point", "solution", "workflow", "feature", "result", or "cta"
- zoom_level: 1.0-1.5
- pan_direction: "left", "right", "up", "down", or "center"

Return ONLY a valid JSON array like this example:
[{"order_index":0,"headline":"STILL DOING THIS MANUALLY?","subtext":"","duration_ms":${sceneDuration},"scene_type":"pain-point","zoom_level":1.3,"pan_direction":"center"},{"order_index":1,"headline":"TIME TO CHANGE","subtext":"Meet the smarter way","duration_ms":${sceneDuration},"scene_type":"solution","zoom_level":1.2,"pan_direction":"left"}]`;

    // Build content with images for Claude vision
    const content: any[] = [{ type: "text", text: userPrompt }];

    if (imageUrls?.length > 0) {
      for (const url of imageUrls.slice(0, 8)) {
        if (url.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
          content.push({
            type: "image",
            source: {
              type: "url",
              url: url,
            },
          });
        }
      }
    }

    console.log("Calling Claude API with", content.length, "content blocks");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
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

    console.log("Claude Response:", content_text.slice(0, 500));

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

    // Fallback scenes if AI fails
    if (!scenes || scenes.length < 3) {
      console.log("Using fallback scenes");
      
      const fallbackScenes = [
        { headline: "STILL DOING THIS MANUALLY?", subtext: "", type: "pain-point", zoom: 1.3, pan: "center" },
        { headline: "TIME TO CHANGE", subtext: "Meet the smarter way", type: "solution", zoom: 1.2, pan: "left" },
        { headline: "SIMPLE. FAST. POWERFUL.", subtext: "Get started in seconds", type: "workflow", zoom: 1.15, pan: "right" },
        { headline: "SEE RESULTS INSTANTLY", subtext: "", type: "feature", zoom: 1.25, pan: "up" },
        { headline: "TEAMS LOVE IT", subtext: "Join thousands of users", type: "result", zoom: 1.2, pan: "center" },
        { headline: "START FREE TODAY", subtext: "", type: "cta", zoom: 1.0, pan: "center" },
      ];

      scenes = Array.from({ length: targetSceneCount }, (_, i) => {
        const scene = i === 0 ? fallbackScenes[0] 
          : i === targetSceneCount - 1 ? fallbackScenes[fallbackScenes.length - 1]
          : fallbackScenes[Math.min(i, fallbackScenes.length - 2)];
        
        return {
          order_index: i,
          headline: scene.headline,
          subtext: scene.subtext,
          duration_ms: sceneDuration,
          scene_type: scene.type,
          zoom_level: scene.zoom,
          pan_direction: scene.pan,
        };
      });
    }

    // Enhance scenes with motion config
    const enhancedScenes: SceneData[] = scenes.map((scene, i) => {
      const sceneType = scene.scene_type || "feature";
      const motionConfig = getMotionConfigForSceneType(sceneType);
      const transition = getTransitionForSceneType(sceneType, i);

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
