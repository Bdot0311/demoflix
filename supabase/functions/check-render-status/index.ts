import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { renderId, shotstackRenderIds } = await req.json();

    if (!renderId || !shotstackRenderIds) {
      return new Response(
        JSON.stringify({ error: "renderId and shotstackRenderIds are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SHOTSTACK_API_KEY = Deno.env.get("SHOTSTACK_API_KEY");
    if (!SHOTSTACK_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Video rendering not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check status of all renders
    const statusChecks = await Promise.all(
      Object.entries(shotstackRenderIds).map(async ([format, id]) => {
        if (!id) return { format, status: "skipped", url: null };
        
        const response = await fetch(`https://api.shotstack.io/v1/render/${id}`, {
          headers: { "x-api-key": SHOTSTACK_API_KEY },
        });
        const data = await response.json();
        
        return {
          format,
          status: data.response?.status || "unknown",
          url: data.response?.url || null,
          progress: data.response?.progress || 0,
        };
      })
    );

    console.log("Render status checks:", statusChecks);

    // Calculate overall progress
    const completedCount = statusChecks.filter(s => s.status === "done").length;
    const totalCount = statusChecks.filter(s => s.status !== "skipped").length;
    const avgProgress = statusChecks.reduce((sum, s) => sum + (s.progress || 0), 0) / totalCount;

    // Check if all renders are complete
    const allComplete = statusChecks.every(s => s.status === "done" || s.status === "skipped");
    const anyFailed = statusChecks.some(s => s.status === "failed");

    if (anyFailed) {
      await supabase
        .from("renders")
        .update({
          status: "failed",
          error_message: "One or more renders failed",
        })
        .eq("id", renderId);

      return new Response(
        JSON.stringify({ status: "failed", error: "Rendering failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (allComplete) {
      // Update render with video URLs
      const horizontalUrl = statusChecks.find(s => s.format === "horizontal")?.url;
      const verticalUrl = statusChecks.find(s => s.format === "vertical")?.url;
      const squareUrl = statusChecks.find(s => s.format === "square")?.url;

      await supabase
        .from("renders")
        .update({
          status: "completed",
          progress: 100,
          video_url: horizontalUrl,
          video_url_vertical: verticalUrl,
          video_url_square: squareUrl,
          completed_at: new Date().toISOString(),
        })
        .eq("id", renderId);

      return new Response(
        JSON.stringify({
          status: "completed",
          progress: 100,
          urls: {
            horizontal: horizontalUrl,
            vertical: verticalUrl,
            square: squareUrl,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update progress
    await supabase
      .from("renders")
      .update({ progress: Math.round(avgProgress) })
      .eq("id", renderId);

    return new Response(
      JSON.stringify({
        status: "processing",
        progress: Math.round(avgProgress),
        details: statusChecks,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Status check error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
