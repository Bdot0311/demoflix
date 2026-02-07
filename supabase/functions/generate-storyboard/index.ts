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

interface ZoomTarget {
  x: number;
  y: number;
  scale: number;
  startFrame: number;
  endFrame: number;
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

interface MotionConfig {
  animation_style: "line-reveal" | "blur-in" | "scale-pop" | "word-stagger" | "fade-scale" | "slide-mask" | "bounce-in" | "typewriter";
  spring: {
    damping: number;
    mass: number;
    stiffness: number;
    overshootClamping: boolean;
  };
  stagger_delay_frames: number;
  entrance_delay_frames: number;
  effects: ("particles" | "vignette" | "glow" | "scanlines")[];
  cursor_path?: CursorPath;
  zoom_targets?: ZoomTarget[];
  ui_highlights?: UIHighlight[];
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

// NEW: Fast cinematic spring presets
const springPresets = {
  instant: { damping: 30, mass: 0.3, stiffness: 400, overshootClamping: true },
  crisp: { damping: 25, mass: 0.4, stiffness: 300, overshootClamping: true },
  cinematic: { damping: 35, mass: 0.8, stiffness: 120, overshootClamping: true },
  punch: { damping: 18, mass: 0.5, stiffness: 350, overshootClamping: false },
  // Legacy presets
  bouncy: { damping: 12, mass: 1, stiffness: 100, overshootClamping: false },
  snappy: { damping: 20, mass: 0.5, stiffness: 200, overshootClamping: false },
  smooth: { damping: 30, mass: 1, stiffness: 80, overshootClamping: true },
};

// Generate cursor paths and zoom targets for demo-style scenes
const generateDemoEffects = (sceneType: string, sceneIndex: number, durationFrames: number): Partial<MotionConfig> => {
  const effects: Partial<MotionConfig> = {};
  
  // Add cursor animation for workflow scenes
  if (["workflow", "feature", "reveal", "how-it-works"].includes(sceneType)) {
    const baseX = 200 + (sceneIndex * 150) % 600;
    const baseY = 150 + (sceneIndex * 100) % 400;
    effects.cursor_path = {
      startX: baseX,
      startY: baseY,
      endX: baseX + 300 + (sceneIndex * 80) % 200,
      endY: baseY + 200 + (sceneIndex * 60) % 150,
      clickFrame: Math.floor(durationFrames * 0.6),
    };
  }
  
  // Add zoom spotlight targets for dramatic scenes
  if (["pain-point", "solution", "result", "climax", "hook"].includes(sceneType)) {
    effects.zoom_targets = [{
      x: 40 + (sceneIndex * 10) % 30,
      y: 35 + (sceneIndex * 8) % 25,
      scale: 1.6 + (sceneIndex * 0.1) % 0.4,
      startFrame: Math.floor(durationFrames * 0.08),
      endFrame: Math.floor(durationFrames * 0.7),
    }];
  }
  
  // Add UI highlight callouts for feature scenes
  if (["feature", "workflow", "how-it-works"].includes(sceneType)) {
    effects.ui_highlights = [{
      x: 250 + (sceneIndex * 130) % 550,
      y: 150 + (sceneIndex * 90) % 350,
      width: 240,
      height: 70,
      label: sceneIndex % 2 === 0 ? "Key Feature" : undefined,
      delay: 12,
      duration: durationFrames - 25,
    }];
  }
  
  return effects;
};

// Map scene type to cinematic animation style and effects
const getMotionConfigForSceneType = (sceneType: string, sceneIndex: number, totalScenes: number): MotionConfig => {
  switch (sceneType) {
    case "pain-point":
      return {
        animation_style: "blur-in",
        spring: springPresets.cinematic,
        stagger_delay_frames: 1,
        entrance_delay_frames: 3,
        effects: ["vignette"],
      };
    case "solution":
      return {
        animation_style: "scale-pop",
        spring: springPresets.punch,
        stagger_delay_frames: 1,
        entrance_delay_frames: 4,
        effects: ["glow", "vignette"],
      };
    case "hook":
      return {
        animation_style: "line-reveal",
        spring: springPresets.crisp,
        stagger_delay_frames: 1,
        entrance_delay_frames: 3,
        effects: ["vignette", "glow"],
      };
    case "workflow":
    case "how-it-works":
      return {
        animation_style: "fade-scale",
        spring: springPresets.instant,
        stagger_delay_frames: 1,
        entrance_delay_frames: 5,
        effects: ["vignette"],
      };
    case "feature":
      return {
        animation_style: "line-reveal",
        spring: springPresets.crisp,
        stagger_delay_frames: 1,
        entrance_delay_frames: 4,
        effects: ["vignette"],
      };
    case "result":
      return {
        animation_style: "scale-pop",
        spring: springPresets.punch,
        stagger_delay_frames: 1,
        entrance_delay_frames: 3,
        effects: ["glow", "vignette"],
      };
    case "climax":
      return {
        animation_style: "word-stagger",
        spring: springPresets.punch,
        stagger_delay_frames: 2,
        entrance_delay_frames: 3,
        effects: ["vignette", "glow"],
      };
    case "cta":
      return {
        animation_style: "scale-pop",
        spring: springPresets.punch,
        stagger_delay_frames: 1,
        entrance_delay_frames: 4,
        effects: ["glow", "vignette"],
      };
    default:
      return {
        animation_style: "line-reveal",
        spring: springPresets.crisp,
        stagger_delay_frames: 1,
        entrance_delay_frames: 4,
        effects: ["vignette"],
      };
  }
};

// Map scene type to cinematic transition
const getTransitionForSceneType = (sceneType: string, sceneIndex: number): string => {
  if (sceneIndex === 0) return "fade";
  
  switch (sceneType) {
    case "pain-point":
      return "cross-dissolve";
    case "solution":
      return "wipe";
    case "hook":
      return "zoom";
    case "workflow":
    case "how-it-works":
      return "slide-left";
    case "feature":
      return "slide-right";
    case "result":
      return "cross-dissolve";
    case "climax":
      return "zoom";
    case "cta":
      return "fade";
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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // For single assets, generate 5-7 scenes based on duration
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
      if (websiteContent.valueProposition) {
        parts.push(`VALUE PROP: ${websiteContent.valueProposition}`);
      }
      if (websiteContent.headlines && websiteContent.headlines.length > 0) {
        parts.push(`KEY HEADLINES: ${websiteContent.headlines.slice(0, 8).join(" | ")}`);
      }
      if (websiteContent.features && websiteContent.features.length > 0) {
        const featureList = websiteContent.features.slice(0, 5).map((f: any) => 
          f.title + (f.description ? `: ${f.description.slice(0, 50)}` : "")
        ).join("; ");
        parts.push(`FEATURES: ${featureList}`);
      }
      if (websiteContent.testimonials && websiteContent.testimonials.length > 0) {
        const quote = websiteContent.testimonials[0];
        parts.push(`TESTIMONIAL: "${quote.quote?.slice(0, 100)}" - ${quote.author || "Customer"}`);
      }
      if (websiteContent.stats && websiteContent.stats.length > 0) {
        const statList = websiteContent.stats.slice(0, 3).map((s: any) => `${s.value} ${s.label}`).join(", ");
        parts.push(`STATS: ${statList}`);
      }
      if (websiteContent.painPoints && websiteContent.painPoints.length > 0) {
        parts.push(`PAIN POINTS: ${websiteContent.painPoints.slice(0, 3).join("; ")}`);
      }
      if (websiteContent.benefits && websiteContent.benefits.length > 0) {
        parts.push(`BENEFITS: ${websiteContent.benefits.slice(0, 3).join("; ")}`);
      }
      if (websiteContent.ctaTexts && websiteContent.ctaTexts.length > 0) {
        parts.push(`CTAs: ${websiteContent.ctaTexts.slice(0, 3).join(", ")}`);
      }
      
      if (parts.length > 0) {
        contentContext = `\n\n## WEBSITE CONTENT TO USE (IMPORTANT - use this actual copy!)\n${parts.join("\n")}`;
      }
    }

    // STORY-DRIVEN system prompt for Netflix-style trailers
    const systemPrompt = `You are a world-class motion graphics director who creates viral Netflix-style product demo trailers. Your trailers follow a PROVEN narrative structure that keeps viewers hooked:

## NARRATIVE STRUCTURE (MANDATORY)
Every trailer MUST follow this emotional arc:

1. **PAIN POINT** (Scene 1): Open with the viewer's frustration. Make them FEEL the problem.
   - Examples: "Drowning in spreadsheets?", "Another day, zero replies", "Tired of manual work?"
   
2. **SOLUTION INTRO** (Scene 2): The pivotal "change is possible" moment.
   - Examples: "It's time to change.", "Meet [Product].", "There's a better way."
   
3. **HOW IT WORKS** (Scenes 3-5): Step-by-step feature walkthrough with action verbs.
   - Examples: "Connect in seconds", "Automate everything", "See results instantly"
   
4. **RESULT/PROOF** (Scene 6): Show the transformation/outcome with real stats if available.
   - Examples: "3x more conversions", "Hours saved every week", "Teams love it"
   
5. **CTA** (Final Scene): Urgent, compelling call to action.
   - Examples: "Start free today", "Join 10,000+ teams", "Try it now"

## CRITICAL: USE THE WEBSITE CONTENT
When website content is provided:
- USE the actual company name, features, and tagline
- INCORPORATE real stats and testimonials
- ADAPT headlines from the website copy
- MATCH the brand's tone and language
- DO NOT make up generic copy - use what's provided!

## YOUR SIGNATURE STYLE
- Headlines are 2-5 words MAX. Pure impact.
- Use power verbs: Crush, Launch, Dominate, Transform, Automate
- Build TENSION then RELEASE
- Think movie trailer, not corporate video
- Every scene makes viewers FEEL something

## MOTION AWARENESS
You design for animation - each scene type gets specific treatment:
- pain-point: Slow blur-in reveal (dark, tense mood)
- solution: Quick scale-pop (eureka moment)
- workflow/how-it-works: Clean line-reveal (clarity)
- result: Dramatic scale-pop (celebration)
- cta: Punchy scale-pop (urgency)${contentContext}`;

    const userPrompt = isSingleAsset 
      ? `Create a ${duration}-second STORY-DRIVEN Netflix-style trailer from ONE product screenshot. Generate exactly ${targetSceneCount} scenes following this structure:

SCENE STRUCTURE:
- Scene 1 (PAIN-POINT): ${targetSceneCount > 5 ? "Start with viewer's frustration" : "Hook with a problem"}
- Scene 2 (SOLUTION): "It's time to change" pivot moment  
- Scenes 3-${targetSceneCount - 2} (WORKFLOW): Feature demonstrations with action verbs
- Scene ${targetSceneCount - 1} (RESULT): Show the transformation/benefit${websiteContent?.stats?.length > 0 ? " - USE REAL STATS!" : ""}
- Scene ${targetSceneCount} (CTA): Compelling call to action${websiteContent?.ctaTexts?.length > 0 ? " - USE PROVIDED CTAs!" : ""}

${websiteContent?.companyName ? `COMPANY NAME: ${websiteContent.companyName}` : ""}
${websiteContent?.features?.length > 0 ? `USE THESE FEATURES: ${websiteContent.features.slice(0, 4).map((f: any) => f.title).join(", ")}` : ""}

CRITICAL: Use DIFFERENT zoom_level (1.0-1.8) and pan_direction for EACH scene!

FOR EACH SCENE, provide:
1. headline: 2-5 word power statement (action-oriented)
2. subtext: 6-12 word supporting line (optional, "" for impact scenes)
3. scene_type: "pain-point", "solution", "workflow", "feature", "result", or "cta"
4. zoom_level: VARY 1.0-1.8 for dramatic effect
5. pan_direction: VARY between "left", "right", "up", "down", "center"

Return ONLY a valid JSON array.`
      : `Create a ${duration}-second STORY-DRIVEN Netflix-style trailer for ${assetCount} product screenshots.

NARRATIVE ARC:
- Scene 1 (PAIN-POINT): Hook with viewer's frustration
- Scene 2 (SOLUTION): Pivot to hope/solution
- Scenes 3-${assetCount - 2} (WORKFLOW): Feature walkthroughs
- Scene ${assetCount - 1} (RESULT): Show transformation${websiteContent?.stats?.length > 0 ? " with REAL STATS" : ""}
- Scene ${assetCount} (CTA): Call to action${websiteContent?.ctaTexts?.length > 0 ? " using PROVIDED CTA" : ""}

${websiteContent?.companyName ? `COMPANY: ${websiteContent.companyName}` : ""}
${websiteContent?.features?.length > 0 ? `FEATURES TO HIGHLIGHT: ${websiteContent.features.slice(0, 5).map((f: any) => f.title).join(", ")}` : ""}

FOR EACH SCENE:
1. headline: 2-5 word power statement
2. subtext: Supporting line (optional)
3. scene_type: "pain-point", "solution", "workflow", "feature", "result", or "cta"
4. zoom_level: 1.0-2.0
5. pan_direction: "left", "right", "up", "down", or "center"

Return ONLY a valid JSON array.`;

    const exampleJson = `[
  {
    "order_index": 0,
    "headline": "STILL DOING THIS MANUALLY?",
    "subtext": "",
    "duration_ms": ${sceneDuration},
    "scene_type": "pain-point",
    "zoom_level": 1.4,
    "pan_direction": "center"
  },
  {
    "order_index": 1,
    "headline": "IT'S TIME TO CHANGE",
    "subtext": "Meet the future of automation",
    "duration_ms": ${sceneDuration},
    "scene_type": "solution",
    "zoom_level": 1.2,
    "pan_direction": "left"
  }
]`;

    const fullPrompt = userPrompt + "\n\nJSON Example:\n" + exampleJson;

    // Build content array with images for visual analysis
    const content: any[] = [{ type: "text", text: fullPrompt }];

    if (imageUrls && imageUrls.length > 0) {
      for (const url of imageUrls.slice(0, 10)) {
        if (url.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
          content.push({
            type: "image_url",
            image_url: { url },
          });
        }
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content_text = data.choices?.[0]?.message?.content || "";

    console.log("AI Response:", content_text);

    // Extract JSON from the response
    let scenes: any[] = [];
    try {
      const jsonMatch = content_text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        scenes = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
    }

    // Generate story-driven fallback scenes if AI fails
    if (!scenes || scenes.length !== targetSceneCount) {
      console.log("Generating story-driven fallback scenes for", targetSceneCount, "scenes");
      
      const storyScenes = [
        { headline: "STILL DOING THIS MANUALLY?", subtext: "", type: "pain-point", zoom: 1.4, pan: "center" },
        { headline: "IT'S TIME TO CHANGE", subtext: "Meet the smarter way to work", type: "solution", zoom: 1.2, pan: "left" },
        { headline: "CONNECT IN SECONDS", subtext: "Simple setup, powerful results", type: "workflow", zoom: 1.3, pan: "right" },
        { headline: "AUTOMATE EVERYTHING", subtext: "Let the platform do the heavy lifting", type: "workflow", zoom: 1.15, pan: "up" },
        { headline: "SEE RESULTS INSTANTLY", subtext: "Real-time insights at your fingertips", type: "feature", zoom: 1.25, pan: "down" },
        { headline: "3X FASTER RESULTS", subtext: "Teams report 3x productivity gains", type: "result", zoom: 1.35, pan: "center" },
        { headline: "START FREE TODAY", subtext: "Join thousands of happy teams", type: "cta", zoom: 1.0, pan: "center" },
      ];

      scenes = Array.from({ length: targetSceneCount }, (_, i) => {
        const sceneIndex = Math.min(i, storyScenes.length - 1);
        // For first and last scenes, always use pain-point and cta
        let story;
        if (i === 0) {
          story = storyScenes[0];
        } else if (i === targetSceneCount - 1) {
          story = storyScenes[storyScenes.length - 1];
        } else {
          story = storyScenes[Math.min(i, storyScenes.length - 2)];
        }
        
        return {
          order_index: i,
          headline: story.headline,
          subtext: story.subtext,
          duration_ms: sceneDuration,
          scene_type: story.type,
          zoom_level: story.zoom,
          pan_direction: story.pan,
        };
      });
    }

    // Enhance scenes with motion config, transitions, and demo effects
    const fps = 30;
    const enhancedScenes: SceneData[] = scenes.map((scene, i) => {
      const sceneType = scene.scene_type || "feature";
      const baseMotionConfig = getMotionConfigForSceneType(sceneType, i, targetSceneCount);
      const transition = getTransitionForSceneType(sceneType, i);
      const durationMs = scene.duration_ms || sceneDuration;
      const durationFrames = Math.floor((durationMs / 1000) * fps);
      
      // Add demo-style effects (cursor, zoom, highlights)
      const demoEffects = generateDemoEffects(sceneType, i, durationFrames);
      const motionConfig: MotionConfig = {
        ...baseMotionConfig,
        ...demoEffects,
      };

      return {
        order_index: scene.order_index ?? i,
        headline: scene.headline || "POWER",
        subtext: scene.subtext || "",
        duration_ms: durationMs,
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
