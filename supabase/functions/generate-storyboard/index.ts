import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SceneData {
  order_index: number;
  headline: string;
  subtext: string;
  duration_ms: number;
  scene_type: string;
  zoom_level: number;
  pan_direction: string;
}

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

    // Calculate scene duration with room for transitions
    const sceneDuration = Math.floor((duration * 1000) / assetCount);

    // Netflix-style trailer system prompt
    const systemPrompt = `You are a world-class film trailer editor who creates viral Netflix-style product trailers. Your trailers are:

- DRAMATIC: Every word hits like a punch. Short. Powerful. Unforgettable.
- CINEMATIC: Think movie trailer, not corporate video. Build tension, then release.
- EMOTIONAL: Connect with viewers' desires, fears, and aspirations.
- RHYTHMIC: Perfect pacing that keeps viewers glued to the screen.

Your signature style:
- Headlines are 2-5 words MAX. No fluff. Pure impact.
- Use power words: Revolutionary, Unleash, Dominate, Transform, Unstoppable
- Create a narrative arc: Hook → Build tension → Reveal → Call to action
- Each scene should make viewers FEEL something`;

    const userPrompt = `Create a ${duration}-second Netflix-style cinematic trailer storyboard for these ${assetCount} product screenshots.

TRAILER STRUCTURE:
- Scene 1 (HOOK): Open with intrigue. Make them stop scrolling. Dark, mysterious, powerful.
- Scenes 2-${assetCount - 1} (BUILD): Rapid-fire feature reveals with escalating intensity. Each scene more impressive than the last.
- Scene ${assetCount} (CLIMAX/CTA): Epic finale with unforgettable call to action.

FOR EACH SCENE, provide:
1. headline: 2-5 word power statement (ALL CAPS style energy)
2. subtext: 6-12 word supporting line (optional, can be empty for pure visual impact)
3. scene_type: "hook", "tension", "reveal", "feature", "benefit", "climax", or "cta"
4. zoom_level: 1.0-1.4 (subtle zoom for Ken Burns effect)
5. pan_direction: "left", "right", "up", "down", or "center"

HEADLINE EXAMPLES (study the energy):
- "THE FUTURE ARRIVES"
- "EVERYTHING CHANGES"
- "WITNESS POWER"
- "BEYOND LIMITS"
- "ONE TOOL. INFINITE POSSIBILITIES."
- "YOUR COMPETITION WON'T SEE IT COMING"
- "THIS CHANGES EVERYTHING"

SUBTEXT EXAMPLES:
- "" (empty for dramatic pause)
- "Built for those who refuse to settle"
- "Where innovation meets execution"
- "The revolution starts now"

Return ONLY a valid JSON array with exactly ${assetCount} objects:
[
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

    // Build content array with images for visual analysis
    const content: any[] = [{ type: "text", text: userPrompt }];

    // Add images to analyze (limit to 10)
    if (imageUrls && imageUrls.length > 0) {
      for (const url of imageUrls.slice(0, 10)) {
        // Only add image URLs that look like valid image formats
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
    let scenes: SceneData[] = [];
    try {
      const jsonMatch = content_text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        scenes = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
    }

    // Validate and ensure we have the right number of scenes
    if (!scenes || scenes.length !== assetCount) {
      console.log("Generating fallback Netflix-style scenes");
      // Generate compelling fallback scenes
      const fallbackHeadlines = [
        { headline: "THE FUTURE IS HERE", subtext: "", type: "hook", zoom: 1.3, pan: "center" },
        { headline: "POWER UNLEASHED", subtext: "Built for those who demand more", type: "feature", zoom: 1.2, pan: "right" },
        { headline: "BEYOND LIMITS", subtext: "Where innovation meets execution", type: "reveal", zoom: 1.15, pan: "left" },
        { headline: "UNSTOPPABLE", subtext: "Nothing can hold you back", type: "benefit", zoom: 1.25, pan: "up" },
        { headline: "DOMINATE", subtext: "Your competition won't know what hit them", type: "tension", zoom: 1.2, pan: "down" },
        { headline: "REVOLUTIONARY", subtext: "This changes everything", type: "climax", zoom: 1.35, pan: "center" },
        { headline: "START NOW", subtext: "The revolution begins today", type: "cta", zoom: 1.1, pan: "center" },
      ];

      scenes = Array.from({ length: assetCount }, (_, i) => {
        const fallback = fallbackHeadlines[Math.min(i, fallbackHeadlines.length - 1)];
        // First scene is always hook, last is always CTA
        if (i === 0) {
          return {
            order_index: i,
            headline: "THE FUTURE IS HERE",
            subtext: "",
            duration_ms: sceneDuration,
            scene_type: "hook",
            zoom_level: 1.3,
            pan_direction: "center",
          };
        }
        if (i === assetCount - 1) {
          return {
            order_index: i,
            headline: "START NOW",
            subtext: "Join the revolution today",
            duration_ms: sceneDuration,
            scene_type: "cta",
            zoom_level: 1.1,
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

    // Ensure all scenes have required fields
    scenes = scenes.map((scene, i) => ({
      order_index: scene.order_index ?? i,
      headline: scene.headline || "POWER",
      subtext: scene.subtext || "",
      duration_ms: scene.duration_ms || sceneDuration,
      scene_type: scene.scene_type || "feature",
      zoom_level: scene.zoom_level || 1.2,
      pan_direction: scene.pan_direction || "center",
    }));

    return new Response(
      JSON.stringify({ scenes }),
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
