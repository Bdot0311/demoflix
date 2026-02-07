import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatusCheckRequest {
  renderId: string;
  remotionRenderIds: Record<string, string>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { renderId, remotionRenderIds }: StatusCheckRequest = await req.json();

    if (!renderId) {
      return new Response(
        JSON.stringify({ error: "renderId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current render state from database
    const { data: render, error } = await supabase
      .from("renders")
      .select("*")
      .eq("id", renderId)
      .single();

    if (error || !render) {
      return new Response(
        JSON.stringify({ error: "Render not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already completed or failed
    if (render.status === "completed") {
      return new Response(
        JSON.stringify({
          status: "completed",
          progress: 100,
          urls: {
            horizontal: render.video_url,
            vertical: render.video_url_vertical,
            square: render.video_url_square,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (render.status === "failed") {
      return new Response(
        JSON.stringify({
          status: "failed",
          error: render.error_message || "Render failed",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if AWS Lambda is configured
    const awsAccessKey = Deno.env.get("AWS_ACCESS_KEY_ID");
    const awsSecretKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
    const functionName = Deno.env.get("REMOTION_FUNCTION_NAME");

    // DEVELOPMENT MODE: Fast progress simulation (30 seconds total)
    if (!awsAccessKey || !awsSecretKey || !functionName) {
      // Progress increment: 20% per call = ~5 calls to complete
      const progressIncrement = 20;
      const newProgress = Math.min(render.progress + progressIncrement, 100);
      
      if (newProgress >= 100) {
        // Complete with placeholder URLs
        await supabase
          .from("renders")
          .update({
            status: "completed",
            progress: 100,
            video_url: "https://placeholder.dev/demo-horizontal.mp4",
            video_url_vertical: "https://placeholder.dev/demo-vertical.mp4",
            video_url_square: "https://placeholder.dev/demo-square.mp4",
            completed_at: new Date().toISOString(),
          })
          .eq("id", renderId);

        return new Response(
          JSON.stringify({
            status: "completed",
            progress: 100,
            urls: {
              horizontal: "https://placeholder.dev/demo-horizontal.mp4",
              vertical: "https://placeholder.dev/demo-vertical.mp4",
              square: "https://placeholder.dev/demo-square.mp4",
            },
            mode: "development",
            message: "Development mode complete. Configure AWS Lambda for production renders.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase
        .from("renders")
        .update({ progress: newProgress })
        .eq("id", renderId);

      return new Response(
        JSON.stringify({
          status: "processing",
          progress: newProgress,
          mode: "development",
          message: "Development mode. Configure AWS Lambda for production renders.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PRODUCTION MODE: Check actual Remotion Lambda status
    // For now, rely on webhook updates - return current database state
    return new Response(
      JSON.stringify({
        status: render.status,
        progress: render.progress,
        mode: "production",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Status check error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        status: "error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
