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
  animation_style: "bounce-in" | "typewriter" | "slide-mask" | "fade-scale" | "word-stagger";
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

// Spring presets for different animation feels
const springPresets = {
  bouncy: { damping: 12, mass: 1, stiffness: 100, overshootClamping: false },
  snappy: { damping: 20, mass: 0.5, stiffness: 200, overshootClamping: false },
  smooth: { damping: 30, mass: 1, stiffness: 80, overshootClamping: true },
  gentle: { damping: 25, mass: 1.5, stiffness: 60, overshootClamping: false },
  elastic: { damping: 8, mass: 0.8, stiffness: 150, overshootClamping: false },
};

// Generate cursor paths and zoom targets for demo-style scenes
// Uses percentage-based coordinates for proper positioning across all viewport sizes
const generateDemoEffects = (sceneType: string, sceneIndex: number, durationFrames: number): Partial<MotionConfig> => {
  const effects: Partial<MotionConfig> = {};
  
  // Add cursor animation for MORE scene types (not just feature/reveal)
  // Using percentage-based positions that translate to screen coordinates
  if (["feature", "reveal", "benefit", "tension"].includes(sceneType)) {
    // Generate varied cursor paths across the screen (20-80% range)
    const baseX = 200 + (sceneIndex * 150) % 600; // 200-800px range on 1920 width
    const baseY = 150 + (sceneIndex * 100) % 400; // 150-550px range on 1080 height
    effects.cursor_path = {
      startX: baseX,
      startY: baseY,
      endX: baseX + 300 + (sceneIndex * 80) % 200, // Move 300-500px right
      endY: baseY + 200 + (sceneIndex * 60) % 150, // Move 200-350px down
      clickFrame: Math.floor(durationFrames * 0.65),
    };
  }
  
  // Add zoom spotlight targets to MORE scenes for dramatic focus effect
  if (["tension", "climax", "feature", "reveal", "hook"].includes(sceneType)) {
    effects.zoom_targets = [{
      x: 35 + (sceneIndex * 12) % 35, // 35-70% from left (centered area)
      y: 30 + (sceneIndex * 10) % 30, // 30-60% from top
      scale: 1.5 + (sceneIndex * 0.15) % 0.5, // 1.5-2.0x zoom
      startFrame: Math.floor(durationFrames * 0.1),
      endFrame: Math.floor(durationFrames * 0.75),
    }];
  }
  
  // Add UI highlight callouts to benefit, feature, AND reveal scenes
  if (["benefit", "feature", "reveal"].includes(sceneType)) {
    effects.ui_highlights = [{
      x: 250 + (sceneIndex * 130) % 550, // Spread across screen
      y: 150 + (sceneIndex * 90) % 350,
      width: 240,
      height: 70,
      label: sceneIndex % 2 === 0 ? "Key Feature" : undefined,
      delay: 18,
      duration: durationFrames - 35,
    }];
  }
  
  return effects;
};

// Map scene type to recommended animation style and effects
const getMotionConfigForSceneType = (sceneType: string, sceneIndex: number, totalScenes: number): MotionConfig => {
  const isFirst = sceneIndex === 0;
  const isLast = sceneIndex === totalScenes - 1;
  
  switch (sceneType) {
    case "hook":
      // Hook scenes now get zoom targets for dramatic opening
      return {
        animation_style: "bounce-in",
        spring: springPresets.elastic,
        stagger_delay_frames: 2,
        entrance_delay_frames: 5,
        effects: ["vignette", "glow", "particles"],
      };
    case "tension":
      return {
        animation_style: "slide-mask",
        spring: springPresets.snappy,
        stagger_delay_frames: 1,
        entrance_delay_frames: 8,
        effects: ["vignette", "scanlines"],
      };
    case "reveal":
      return {
        animation_style: "word-stagger",
        spring: springPresets.bouncy,
        stagger_delay_frames: 3,
        entrance_delay_frames: 10,
        effects: ["glow", "particles"],
      };
    case "feature":
      return {
        animation_style: "fade-scale",
        spring: springPresets.smooth,
        stagger_delay_frames: 2,
        entrance_delay_frames: 12,
        effects: ["vignette", "glow"],
      };
    case "benefit":
      return {
        animation_style: "bounce-in",
        spring: springPresets.gentle,
        stagger_delay_frames: 2,
        entrance_delay_frames: 8,
        effects: ["particles", "vignette"],
      };
    case "climax":
      return {
        animation_style: "word-stagger",
        spring: springPresets.elastic,
        stagger_delay_frames: 2,
        entrance_delay_frames: 5,
        effects: ["vignette", "glow", "particles", "scanlines"],
      };
    case "cta":
      return {
        animation_style: "fade-scale",
        spring: springPresets.bouncy,
        stagger_delay_frames: 3,
        entrance_delay_frames: 10,
        effects: ["glow", "vignette"],
      };
    default:
      return {
        animation_style: "bounce-in",
        spring: springPresets.bouncy,
        stagger_delay_frames: 2,
        entrance_delay_frames: 10,
        effects: ["vignette", "glow"],
      };
  }
};

// Map scene type to transition
const getTransitionForSceneType = (sceneType: string, sceneIndex: number): string => {
  if (sceneIndex === 0) return "fade"; // First scene always fades in
  
  switch (sceneType) {
    case "hook":
      return "zoom";
    case "tension":
      return "slide-left";
    case "reveal":
      return "fade";
    case "feature":
      return "slide-right";
    case "benefit":
      return "slide-left";
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
    const { imageUrls, style, duration, assetCount } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // For single assets, we generate multiple scenes (5-7 based on duration)
    const isSingleAsset = assetCount === 1;
    const targetSceneCount = isSingleAsset 
      ? Math.max(5, Math.min(7, Math.floor(duration / 5)))
      : assetCount;

    const sceneDuration = Math.floor((duration * 1000) / targetSceneCount);

    // Enhanced system prompt for Claude to generate motion-aware storyboards
    const systemPrompt = `You are a world-class motion graphics director who creates viral Netflix-style product trailers with Framer-quality animations. Your trailers are:

- DRAMATIC: Every word hits like a punch. Short. Powerful. Unforgettable.
- CINEMATIC: Think movie trailer, not corporate video. Build tension, then release.
- EMOTIONAL: Connect with viewers' desires, fears, and aspirations.
- RHYTHMIC: Perfect pacing that keeps viewers glued to the screen.
- MOTION-AWARE: You think in terms of animations, timing, and visual flow.

Your signature style:
- Headlines are 2-5 words MAX. No fluff. Pure impact.
- Use power words: Revolutionary, Unleash, Dominate, Transform, Unstoppable
- Create a narrative arc: Hook → Build tension → Reveal → Call to action
- Each scene should make viewers FEEL something
- You consider how text will animate in (bounce, slide, typewriter, stagger)
- You think about camera movement (Ken Burns zoom/pan for drama)
${isSingleAsset ? `
IMPORTANT: You are creating a multi-scene trailer from a SINGLE screenshot. 
Each scene will show the same image with DIFFERENT:
- Headlines and text overlays with varied animation styles
- Zoom levels and pan directions (Ken Burns effect)
- This creates a dynamic, cinematic feel from one static image` : ''}`;

    const userPrompt = isSingleAsset 
      ? `Create a ${duration}-second Netflix-style cinematic trailer from ONE product screenshot. Generate ${targetSceneCount} distinct scenes that will all use the same background image but with different headlines and camera movements.

TRAILER STRUCTURE (${targetSceneCount} scenes total):
- Scene 1 (HOOK): Open with intrigue. Zoom in dramatically. Make them stop scrolling.
- Scenes 2-${targetSceneCount - 1} (BUILD): Feature reveals with different zoom/pan combos. Each headline more powerful than the last.
- Scene ${targetSceneCount} (CLIMAX/CTA): Pull back for full view. Epic call to action.

IMPORTANT: Each scene MUST have a DIFFERENT zoom_level and pan_direction to create visual variety from one image!

FOR EACH SCENE, provide:
1. headline: 2-5 word power statement (ALL CAPS style energy)
2. subtext: 6-12 word supporting line (optional, can be empty for pure visual impact)
3. scene_type: "hook", "tension", "reveal", "feature", "benefit", "climax", or "cta"
4. zoom_level: VARY between 1.0-1.5 (crucial for visual variety!)
5. pan_direction: VARY between "left", "right", "up", "down", "center"

Return ONLY a valid JSON array with exactly ${targetSceneCount} objects.`
      : `Create a ${duration}-second Netflix-style cinematic trailer storyboard for these ${assetCount} product screenshots.

TRAILER STRUCTURE:
- Scene 1 (HOOK): Open with intrigue. Make them stop scrolling. Dark, mysterious, powerful.
- Scenes 2-${assetCount - 1} (BUILD): Rapid-fire feature reveals with escalating intensity. Each scene more impressive than the last.
- Scene ${assetCount} (CLIMAX/CTA): Epic finale with unforgettable call to action.

FOR EACH SCENE, provide:
1. headline: 2-5 word power statement (ALL CAPS style energy)
2. subtext: 6-12 word supporting line (optional, can be empty for pure visual impact)
3. scene_type: "hook", "tension", "reveal", "feature", "benefit", "climax", or "cta"
4. zoom_level: VARY between 1.0-2.0 (dramatic zooms for visual impact!)
5. pan_direction: VARY between "left", "right", "up", "down", "center" for dynamic camera movement

Return ONLY a valid JSON array with exactly ${assetCount} objects.`;

    const exampleJson = `[
  {
    "order_index": 0,
    "headline": "THE GAME HAS CHANGED",
    "subtext": "",
    "duration_ms": ${sceneDuration},
    "scene_type": "hook",
    "zoom_level": 1.3,
    "pan_direction": "center"
  }
]`;

    const fullPrompt = userPrompt + "\n\nJSON Format Example:\n" + exampleJson;

    // Build content array with images for visual analysis
    const content: any[] = [{ type: "text", text: fullPrompt }];

    // Add images to analyze (limit to 10)
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
        model: "google/gemini-3-flash-preview",
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

    // Validate and ensure we have the right number of scenes
    if (!scenes || scenes.length !== targetSceneCount) {
      console.log("Generating fallback Netflix-style scenes for", targetSceneCount, "scenes");
      
      const fallbackHeadlines = [
        { headline: "THE FUTURE IS HERE", subtext: "", type: "hook", zoom: 1.3, pan: "center" },
        { headline: "POWER UNLEASHED", subtext: "Built for those who demand more", type: "feature", zoom: 1.2, pan: "right" },
        { headline: "BEYOND LIMITS", subtext: "Where innovation meets execution", type: "reveal", zoom: 1.15, pan: "left" },
        { headline: "UNSTOPPABLE", subtext: "Nothing can hold you back", type: "benefit", zoom: 1.25, pan: "up" },
        { headline: "DOMINATE", subtext: "Your competition won't know what hit them", type: "tension", zoom: 1.2, pan: "down" },
        { headline: "REVOLUTIONARY", subtext: "This changes everything", type: "climax", zoom: 1.35, pan: "center" },
        { headline: "START NOW", subtext: "The revolution begins today", type: "cta", zoom: 1.1, pan: "center" },
      ];

      scenes = Array.from({ length: targetSceneCount }, (_, i) => {
        const fallback = fallbackHeadlines[i % fallbackHeadlines.length];
        if (i === 0) {
          return {
            order_index: i,
            headline: "THE FUTURE IS HERE",
            subtext: "",
            duration_ms: sceneDuration,
            scene_type: "hook",
            zoom_level: 1.4,
            pan_direction: "center",
          };
        }
        if (i === targetSceneCount - 1) {
          return {
            order_index: i,
            headline: "START NOW",
            subtext: "Join the revolution today",
            duration_ms: sceneDuration,
            scene_type: "cta",
            zoom_level: 1.0,
            pan_direction: "center",
          };
        }
        return {
          order_index: i,
          headline: fallback.headline,
          subtext: fallback.subtext,
          duration_ms: sceneDuration,
          scene_type: fallback.type,
          zoom_level: fallback.zoom,
          pan_direction: fallback.pan,
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
