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
          error: render.error_message,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if AWS Lambda is configured
    const awsAccessKey = Deno.env.get("AWS_ACCESS_KEY_ID");
    const awsSecretKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
    const awsRegion = Deno.env.get("REMOTION_AWS_REGION") || "us-east-1";
    const functionName = Deno.env.get("REMOTION_FUNCTION_NAME");

    // If dev mode (no AWS), simulate progress
    if (!awsAccessKey || !awsSecretKey || !functionName || !remotionRenderIds) {
      // Check if it's a dev render (starts with "dev-")
      const isDevRender = Object.values(remotionRenderIds || {}).some(
        (id: any) => typeof id === 'string' && id.startsWith("dev-")
      );

      if (isDevRender) {
        // Simulate progress for development
        const newProgress = Math.min(render.progress + 15, 95);
        
        if (newProgress >= 95) {
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
              note: "Development mode - placeholder URLs",
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
            note: "Development mode - simulated progress",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fall back to Shotstack status check
      if (remotionRenderIds && Object.keys(remotionRenderIds).length > 0) {
        const shotstackResponse = await supabase.functions.invoke("check-render-status", {
          body: { renderId, shotstackRenderIds: remotionRenderIds },
        });
        
        return new Response(
          JSON.stringify(shotstackResponse.data || { status: "processing", progress: render.progress }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Query Remotion Lambda for actual status
    const statusResults: Record<string, any> = {};
    
    for (const [format, remotionId] of Object.entries(remotionRenderIds || {})) {
      if (!remotionId) continue;
      
      try {
        // In production, this would call Remotion's getRenderProgress API
        // For now, we rely on webhook updates
        statusResults[format] = {
          status: "processing",
          id: remotionId,
        };
      } catch (err) {
        console.error(`Error checking ${format} status:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        status: render.status,
        progress: render.progress,
        details: statusResults,
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
