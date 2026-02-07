import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Scene types for motion graphics videos
type SceneType = "intro" | "pain-point" | "solution" | "feature" | "stats" | "testimonial" | "cta";

interface MotionGraphicsScene {
  order_index: number;
  type: SceneType;
  headline: string;
  subtext?: string;
  voiceover_text?: string;
  duration_ms: number;
  transition: "fade" | "slide" | "zoom";
  visual_elements?: {
    features?: Array<{ title: string; description?: string; icon?: string }>;
    stats?: Array<{ value: string; label: string }>;
    testimonial?: {
      quote: string;
      author?: string;
      role?: string;
      company?: string;
    };
    ctaText?: string;
  };
  background?: {
    type: "gradient" | "particles" | "grid" | "orbs" | "full";
    colors?: string[];
  };
  animation_style: "dramatic" | "smooth" | "punchy";
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

    // Scene count: 5-7 scenes for motion graphics
    const targetSceneCount = Math.max(5, Math.min(7, Math.floor(duration / 4)));
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
        parts.push(`VALUE_PROP: ${websiteContent.valueProposition}`);
      }
      if (websiteContent.painPoints?.length > 0) {
        parts.push(`PAIN_POINTS: ${websiteContent.painPoints.slice(0, 3).join(" | ")}`);
      }
      if (websiteContent.headlines?.length > 0) {
        parts.push(`HEADLINES: ${websiteContent.headlines.slice(0, 5).join(" | ")}`);
      }
      if (websiteContent.features?.length > 0) {
        const featureList = websiteContent.features.slice(0, 4).map((f: any) => 
          `${f.title}${f.description ? ': ' + f.description.slice(0, 50) : ''}`
        ).join(" | ");
        parts.push(`FEATURES: ${featureList}`);
      }
      if (websiteContent.testimonials?.length > 0) {
        const quote = websiteContent.testimonials[0];
        parts.push(`TESTIMONIAL: "${quote.quote?.slice(0, 80)}" - ${quote.author || 'Customer'}`);
      }
      if (websiteContent.stats?.length > 0) {
        const statList = websiteContent.stats.slice(0, 3).map((s: any) => `${s.value} ${s.label}`).join(", ");
        parts.push(`STATS: ${statList}`);
      }
      if (websiteContent.ctaTexts?.length > 0) {
        parts.push(`CTAs: ${websiteContent.ctaTexts.slice(0, 2).join(", ")}`);
      }
      
      if (parts.length > 0) {
        contentContext = `\n\n<website_content>\n${parts.join("\n")}\n</website_content>`;
      }
    }

    // MOTION GRAPHICS DIRECTOR PROMPT - Gojiberry style
    const systemPrompt = `You are a motion graphics director creating Gojiberry-style product demo videos. You design PURE MOTION GRAPHICS videos - no screenshots, no website images. The scraped content BECOMES the visuals.

<narrative_structure>
1. HOOK: Pain point that resonates (2-4 dramatic words)
2. SOLUTION: "Meet [Product]" with tagline
3. FEATURES: 2-3 scenes showing key features with animated icons
4. PROOF: Stats counter or testimonial quote
5. CTA: Compelling call to action
</narrative_structure>

<visual_design_rules>
Each scene has:
- Dark animated background (gradient/particles/orbs)
- Kinetic typography as the PRIMARY VISUAL
- Optional: animated icons, stat counters, testimonial cards
- NO screenshots, NO website images

Scene Types:
- "intro" / "pain-point": Dramatic headline, character-split animation
- "solution": Brand reveal, word-by-word animation
- "feature": Icon grid + headline, smooth animations
- "stats": Large animated number counters
- "testimonial": Quote card with avatar placeholder
- "cta": Pulsing button graphic, line-reveal headline
</visual_design_rules>

<animation_styles>
- "dramatic": Character-split, scale-pop, high contrast
- "smooth": Word-by-word, fade-up, elegant flow
- "punchy": Fast cuts, bounce, high energy
</animation_styles>

<rules>
- Headlines: 2-5 POWER WORDS MAX (Impact > information)
- Subtext: Optional, 5-10 words
- Use active verbs: Launch, Build, Create, Transform, Automate
- Match brand tone from content
- Return ONLY valid JSON, no explanation
</rules>${contentContext}`;

    const userPrompt = `Create ${targetSceneCount} motion graphics scenes for a ${duration}-second video.
Each scene is approximately ${Math.round(sceneDuration / 1000)} seconds.

${websiteContent?.companyName ? `Company: ${websiteContent.companyName}` : ""}
${websiteContent?.features?.length > 0 ? `Features: ${websiteContent.features.slice(0, 3).map((f: any) => f.title).join(", ")}` : ""}

Return a JSON array with this structure:
[
  {
    "order_index": 0,
    "type": "pain-point",
    "headline": "STILL DOING THIS MANUALLY?",
    "subtext": "",
    "voiceover_text": "10-20 word script for narrator",
    "duration_ms": ${sceneDuration},
    "transition": "fade",
    "visual_elements": {},
    "background": { "type": "full", "colors": ["#0a0a0f", "#1a1a2e"] },
    "animation_style": "dramatic"
  }
]

IMPORTANT: 
- type must be one of: intro, pain-point, solution, feature, stats, testimonial, cta
- For "feature" scenes, include visual_elements.features array
- For "stats" scenes, include visual_elements.stats array
- For "testimonial" scenes, include visual_elements.testimonial object
- For "cta" scenes, include visual_elements.ctaText string`;

    console.log("Calling Claude API for motion graphics storyboard");

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
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", response.status, errorText);
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Invalid Anthropic API key" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 429 || response.status === 529) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again." }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const contentText = data.content?.[0]?.text || "";

    console.log("Claude Response:", contentText.slice(0, 500));

    // Parse JSON from response
    let scenes: MotionGraphicsScene[] = [];
    try {
      const jsonMatch = contentText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        scenes = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse Claude response:", parseError);
    }

    // Fallback scenes if AI fails
    if (!scenes || scenes.length < 3) {
      console.log("Using fallback motion graphics scenes");
      scenes = generateFallbackScenes(targetSceneCount, sceneDuration, websiteContent);
    }

    // Enrich scenes with visual elements from content
    const enrichedScenes = scenes.map((scene, i) => {
      const enriched = { ...scene, order_index: i };
      
      // Add visual elements based on scene type if not present
      if (!enriched.visual_elements) {
        enriched.visual_elements = {};
      }
      
      if (scene.type === "feature" && websiteContent?.features?.length > 0) {
        enriched.visual_elements.features = websiteContent.features.slice(0, 3);
      }
      if (scene.type === "stats" && websiteContent?.stats?.length > 0) {
        enriched.visual_elements.stats = websiteContent.stats.slice(0, 3);
      }
      if (scene.type === "testimonial" && websiteContent?.testimonials?.length > 0) {
        enriched.visual_elements.testimonial = websiteContent.testimonials[0];
      }
      if (scene.type === "cta" && websiteContent?.ctaTexts?.length > 0) {
        enriched.visual_elements.ctaText = websiteContent.ctaTexts[0];
      }
      
      // Ensure background config exists
      if (!enriched.background) {
        enriched.background = { type: "full", colors: ["#0a0a0f", "#1a1a2e"] };
      }
      
      // Ensure transition exists
      if (!enriched.transition) {
        enriched.transition = i === 0 ? "fade" : scene.type === "cta" ? "zoom" : "slide";
      }
      
      return enriched;
    });

    console.log("Generated", enrichedScenes.length, "motion graphics scenes");

    return new Response(
      JSON.stringify({ 
        scenes: enrichedScenes,
        targetSceneCount,
        isMotionGraphics: true,
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

// Generate fallback motion graphics scenes
function generateFallbackScenes(
  count: number, 
  durationMs: number, 
  content?: any
): MotionGraphicsScene[] {
  const companyName = content?.companyName || "Our Solution";
  const tagline = content?.tagline || "The smarter way to work";
  const painPoint = content?.painPoints?.[0] || "Still doing things the hard way?";
  const ctaText = content?.ctaTexts?.[0] || "Get Started Free";
  
  const baseScenes: MotionGraphicsScene[] = [
    {
      order_index: 0,
      type: "pain-point",
      headline: "STILL STRUGGLING?",
      subtext: painPoint.slice(0, 50),
      voiceover_text: painPoint,
      duration_ms: durationMs,
      transition: "fade",
      background: { type: "full", colors: ["#0a0a0f", "#1a1a2e"] },
      animation_style: "dramatic",
    },
    {
      order_index: 1,
      type: "solution",
      headline: `MEET ${companyName.toUpperCase()}`,
      subtext: tagline,
      voiceover_text: `Introducing ${companyName}. ${tagline}`,
      duration_ms: durationMs,
      transition: "zoom",
      background: { type: "full", colors: ["#0a0a0f", "#1a1a2e"] },
      animation_style: "smooth",
    },
    {
      order_index: 2,
      type: "feature",
      headline: "POWERFUL FEATURES",
      subtext: "Everything you need",
      duration_ms: durationMs,
      transition: "slide",
      visual_elements: {
        features: content?.features?.slice(0, 3) || [
          { title: "Fast", description: "Lightning quick performance" },
          { title: "Simple", description: "Easy to use interface" },
          { title: "Reliable", description: "Always there when you need it" },
        ],
      },
      background: { type: "full", colors: ["#0a0a0f", "#1a1a2e"] },
      animation_style: "smooth",
    },
    {
      order_index: 3,
      type: "stats",
      headline: "PROVEN RESULTS",
      duration_ms: durationMs,
      transition: "slide",
      visual_elements: {
        stats: content?.stats?.slice(0, 3) || [
          { value: "10K+", label: "Happy Users" },
          { value: "99%", label: "Uptime" },
          { value: "5x", label: "Faster" },
        ],
      },
      background: { type: "full", colors: ["#0a0a0f", "#1a1a2e"] },
      animation_style: "punchy",
    },
    {
      order_index: 4,
      type: "cta",
      headline: "START TODAY",
      subtext: ctaText,
      voiceover_text: `Ready to transform your workflow? ${ctaText}.`,
      duration_ms: durationMs,
      transition: "zoom",
      visual_elements: {
        ctaText: ctaText,
      },
      background: { type: "full", colors: ["#0a0a0f", "#1a1a2e"] },
      animation_style: "dramatic",
    },
  ];

  // Return requested number of scenes
  return baseScenes.slice(0, count);
}
