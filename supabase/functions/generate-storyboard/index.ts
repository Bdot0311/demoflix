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

    const styleDescriptions: Record<string, string> = {
      netflix: "dramatic, bold, cinematic with suspenseful reveals and powerful statements",
      startup: "energetic, modern, growth-focused with dynamic momentum",
      futuristic: "sleek, tech-forward, innovative with cutting-edge vibes",
      apple: "minimal, elegant, premium with clean sophistication",
      cyber: "edgy, powerful, mysterious with dark intensity",
      growth: "high-energy, conversion-focused with bold sales messaging",
    };

    const styleContext = styleDescriptions[style] || styleDescriptions.netflix;
    const sceneDuration = Math.floor((duration * 1000) / assetCount);

    // Build content array with images
    const content: any[] = [
      {
        type: "text",
        text: `You are a creative director for cinematic product trailers. Analyze these ${assetCount} product screenshots/images and create a storyboard for a ${duration}-second trailer.

Style: ${style} - ${styleContext}

For each of the ${assetCount} scenes, generate:
1. A punchy headline (3-6 words) that creates impact
2. A brief subtext (5-10 words) that adds context
3. The scene type (hook, feature, benefit, momentum, cta)

The trailer structure should follow:
- Scene 1: Hook - A bold opening statement or problem
- Middle scenes: Feature reveals and benefits
- Last scene: Strong CTA or closing statement

Return ONLY a JSON array with exactly ${assetCount} objects. Each object must have:
{
  "order_index": number (0-based),
  "headline": string,
  "subtext": string,
  "duration_ms": ${sceneDuration},
  "scene_type": string
}

Example headlines by style:
- Netflix: "The Future Awaits", "Beyond Limits", "Witness the Revolution"
- Startup: "Built for Scale", "Your Workflow. Supercharged.", "Growth Unleashed"
- Apple: "Simplicity. Perfected.", "Designed with Intent", "Pure. Powerful."
- Cyber: "Enter the Grid", "Hack Your Workflow", "Digital Dominance"
- Growth: "10X Your Results", "Explode Your Revenue", "Unstoppable Growth"`,
      },
    ];

    // Add images to the content if provided
    if (imageUrls && imageUrls.length > 0) {
      for (const url of imageUrls.slice(0, 10)) {
        content.push({
          type: "image_url",
          image_url: { url },
        });
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
          {
            role: "user",
            content,
          },
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

    // Extract JSON from the response
    let scenes: SceneData[] = [];
    try {
      // Try to parse the entire response as JSON
      const jsonMatch = content_text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        scenes = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Generate fallback scenes
      scenes = Array.from({ length: assetCount }, (_, i) => ({
        order_index: i,
        headline: i === 0 ? "Introducing..." : i === assetCount - 1 ? "Get Started Today" : `Feature ${i}`,
        subtext: i === 0 ? "The future of your workflow" : "",
        duration_ms: sceneDuration,
        scene_type: i === 0 ? "hook" : i === assetCount - 1 ? "cta" : "feature",
      }));
    }

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
