import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScriptSegment {
  sceneType: string;
  voiceoverText: string;
  headline: string;
  subtext?: string;
  estimatedDuration: number;
}

interface ContentData {
  companyName?: string;
  tagline?: string;
  valueProposition?: string;
  headlines?: string[];
  features?: Array<{ title: string; description?: string }>;
  stats?: Array<{ value: string; label: string }>;
  testimonials?: Array<{ quote: string; author?: string; role?: string; company?: string }>;
  ctaTexts?: string[];
  painPoints?: string[];
  benefits?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, duration = 30, style = "professional" } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    if (!content) {
      throw new Error("Content data is required");
    }

    const websiteContent = content as ContentData;
    
    // Calculate target scene count based on duration (aim for 4-5 second scenes)
    const targetSceneCount = Math.max(5, Math.min(8, Math.floor(duration / 4)));
    const avgSceneDuration = Math.floor((duration * 1000) / targetSceneCount);

    // Build content context for Claude
    const contextParts: string[] = [];
    
    if (websiteContent.companyName) {
      contextParts.push(`Company: ${websiteContent.companyName}`);
    }
    if (websiteContent.tagline) {
      contextParts.push(`Tagline: ${websiteContent.tagline}`);
    }
    if (websiteContent.valueProposition) {
      contextParts.push(`Value Prop: ${websiteContent.valueProposition}`);
    }
    if (websiteContent.painPoints?.length) {
      contextParts.push(`Pain Points: ${websiteContent.painPoints.slice(0, 3).join("; ")}`);
    }
    if (websiteContent.features?.length) {
      const featureList = websiteContent.features.slice(0, 4).map(f => f.title).join(", ");
      contextParts.push(`Features: ${featureList}`);
    }
    if (websiteContent.stats?.length) {
      const statList = websiteContent.stats.slice(0, 3).map(s => `${s.value} ${s.label}`).join(", ");
      contextParts.push(`Stats: ${statList}`);
    }
    if (websiteContent.testimonials?.length) {
      const quote = websiteContent.testimonials[0].quote?.slice(0, 100);
      contextParts.push(`Testimonial: "${quote}"`);
    }
    if (websiteContent.ctaTexts?.length) {
      contextParts.push(`CTA: ${websiteContent.ctaTexts[0]}`);
    }

    const systemPrompt = `You are a professional video script writer creating voiceover scripts for motion graphics product demo videos.

Your task is to create a compelling narrative that:
1. Opens with a relatable PAIN POINT (hook the viewer)
2. Introduces the SOLUTION (the product)
3. Highlights 2-3 KEY FEATURES with benefits
4. Shows PROOF (stats or testimonial)
5. Ends with a strong CTA

RULES:
- Each segment should be 10-20 words for voiceover
- Headlines are 2-5 words (power words, emotional impact)
- Use active voice, present tense
- Be conversational, not salesy
- Return ONLY valid JSON

STYLE: ${style}`;

    const userPrompt = `Create a ${targetSceneCount}-scene video script from this content:

${contextParts.join("\n")}

Return a JSON array with this structure:
[
  {
    "sceneType": "pain-point|solution|feature|stats|testimonial|cta",
    "headline": "2-5 word headline",
    "subtext": "optional supporting text",
    "voiceoverText": "10-20 word voiceover script",
    "estimatedDuration": ${Math.floor(avgSceneDuration / 1000)}
  }
]

Narrative flow: pain-point → solution → features (2-3) → proof → cta`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", response.status, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const contentText = data.content?.[0]?.text || "";

    // Parse JSON from response
    let segments: ScriptSegment[] = [];
    try {
      const jsonMatch = contentText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        segments = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse Claude response:", parseError);
    }

    // Fallback if parsing fails
    if (!segments || segments.length < 3) {
      console.log("Using fallback script segments");
      segments = [
        {
          sceneType: "pain-point",
          headline: "STILL STRUGGLING?",
          subtext: "There's a better way",
          voiceoverText: websiteContent.painPoints?.[0] || "Tired of wasting time on manual processes?",
          estimatedDuration: 4,
        },
        {
          sceneType: "solution",
          headline: `MEET ${(websiteContent.companyName || "THE SOLUTION").toUpperCase()}`,
          subtext: websiteContent.tagline || "The smarter way to work",
          voiceoverText: `Introducing ${websiteContent.companyName || "our platform"}. ${websiteContent.tagline || "Built to make your life easier."}`,
          estimatedDuration: 4,
        },
        {
          sceneType: "feature",
          headline: "POWERFUL FEATURES",
          subtext: "Everything you need",
          voiceoverText: websiteContent.features?.[0]?.description || "All the tools you need in one place.",
          estimatedDuration: 4,
        },
        {
          sceneType: "stats",
          headline: "PROVEN RESULTS",
          voiceoverText: websiteContent.stats?.length 
            ? websiteContent.stats.slice(0, 2).map(s => `${s.value} ${s.label}`).join(". ") + "."
            : "Thousands of teams trust us every day.",
          estimatedDuration: 4,
        },
        {
          sceneType: "cta",
          headline: "GET STARTED",
          subtext: websiteContent.ctaTexts?.[0] || "Start Free Today",
          voiceoverText: "Ready to transform your workflow? Get started today.",
          estimatedDuration: 3,
        },
      ];
    }

    // Add visual elements data to each segment
    const enrichedSegments = segments.map((segment, index) => ({
      ...segment,
      visualElements: getVisualElementsForScene(segment.sceneType, websiteContent),
    }));

    return new Response(
      JSON.stringify({ 
        segments: enrichedSegments,
        totalScenes: enrichedSegments.length,
        estimatedDuration: enrichedSegments.reduce((sum, s) => sum + s.estimatedDuration, 0),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Script generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper to extract visual elements based on scene type
function getVisualElementsForScene(sceneType: string, content: ContentData): Record<string, any> {
  switch (sceneType) {
    case "feature":
      return {
        features: content.features?.slice(0, 3) || [],
      };
    case "stats":
      return {
        stats: content.stats?.slice(0, 3) || [],
      };
    case "testimonial":
      return {
        testimonial: content.testimonials?.[0] || null,
      };
    case "cta":
      return {
        ctaText: content.ctaTexts?.[0] || "Get Started",
      };
    default:
      return {};
  }
}
