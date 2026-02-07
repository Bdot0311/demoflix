import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Scene {
  headline: string;
  subtext: string;
  transition: string;
}

interface MusicTrack {
  id: string;
  name: string;
  category: string;
  artist?: string;
  duration_seconds: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scenes, availableTracks, projectStyle } = await req.json();
    
    // Validate required inputs
    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return new Response(
        JSON.stringify({ error: "scenes array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!availableTracks || !Array.isArray(availableTracks) || availableTracks.length === 0) {
      return new Response(
        JSON.stringify({ error: "availableTracks array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context from scenes
    const sceneDescriptions = scenes.map((scene: Scene, index: number) =>
      `Scene ${index + 1}: "${scene.headline || 'No headline'}" - ${scene.subtext || 'No subtext'} (Transition: ${scene.transition || 'fade'})`
    ).join("\n");

    const trackDescriptions = availableTracks.map((track: MusicTrack) =>
      `- "${track.name}" by ${track.artist || 'Unknown'} (Category: ${track.category}, Duration: ${track.duration_seconds}s)`
    ).join("\n");

    const systemPrompt = `You are a music director for video trailers. Analyze the storyboard scenes and recommend the best matching music track based on mood, pacing, and style.

Consider these factors:
1. Overall emotional tone of the headlines and subtext
2. Transition styles used (fast transitions = energetic music, smooth transitions = ambient)
3. Project style: ${projectStyle || 'cinematic'}

Be specific about WHY each track matches the mood.`;

    const userPrompt = `Here is the storyboard:
${sceneDescriptions}

Available music tracks:
${trackDescriptions}

Analyze the mood and recommend the TOP 3 music tracks that best match this storyboard. Return your response as a JSON object with this exact structure:
{
  "recommendations": [
    {
      "track_id": "track id",
      "track_name": "track name",
      "match_score": 95,
      "reason": "Brief explanation of why this track matches"
    }
  ],
  "overall_mood": "One or two words describing the storyboard mood",
  "suggested_tempo": "slow/medium/fast"
}`;

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
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from response (handle markdown code blocks)
    let recommendations;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1].trim();
      recommendations = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Return a default response
      recommendations = {
        recommendations: availableTracks.slice(0, 3).map((track: MusicTrack, index: number) => ({
          track_id: track.id,
          track_name: track.name,
          match_score: 90 - index * 10,
          reason: `${track.category} style matches your storyboard`
        })),
        overall_mood: "cinematic",
        suggested_tempo: "medium"
      };
    }

    return new Response(JSON.stringify(recommendations), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Music recommendation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
