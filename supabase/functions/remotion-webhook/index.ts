import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RemotionWebhookPayload {
  type: "success" | "error" | "timeout";
  renderId: string;
  outputUrl?: string;
  errors?: string[];
  costs?: {
    accruedSoFar: number;
    displayCost: string;
  };
  // Remotion sends custom data in customData field
  customData?: {
    projectId: string;
    dbRenderId: string;
    format: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: RemotionWebhookPayload = await req.json();
    console.log("Remotion webhook received:", JSON.stringify(payload));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { type, outputUrl, errors, customData } = payload;

    if (!customData?.dbRenderId) {
      console.log("No dbRenderId in webhook payload, ignoring");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { dbRenderId, format, projectId } = customData;

    // Get current render state
    const { data: render } = await supabase
      .from("renders")
      .select("*")
      .eq("id", dbRenderId)
      .single();

    if (!render) {
      console.log("Render not found:", dbRenderId);
      return new Response(JSON.stringify({ error: "Render not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "success" && outputUrl) {
      // Update the appropriate URL based on format
      const updates: Record<string, any> = {
        progress: render.progress + 33, // Approximate progress per format
      };

      switch (format) {
        case "horizontal":
          updates.video_url = outputUrl;
          break;
        case "vertical":
          updates.video_url_vertical = outputUrl;
          break;
        case "square":
          updates.video_url_square = outputUrl;
          break;
      }

      // Check if all formats are complete
      const { data: updatedRender } = await supabase
        .from("renders")
        .update(updates)
        .eq("id", dbRenderId)
        .select()
        .single();

      // Check completion
      const hasHorizontal = updatedRender?.video_url;
      const hasVertical = updatedRender?.video_url_vertical;
      const hasSquare = updatedRender?.video_url_square;

      if (hasHorizontal && hasVertical && hasSquare) {
        await supabase
          .from("renders")
          .update({
            status: "completed",
            progress: 100,
            completed_at: new Date().toISOString(),
          })
          .eq("id", dbRenderId);

        // Update project status
        await supabase
          .from("projects")
          .update({ status: "completed" })
          .eq("id", projectId);

        console.log("All renders complete for:", dbRenderId);
      }
    } else if (type === "error" || type === "timeout") {
      const errorMessage = errors?.join(", ") || `Render ${type}`;
      
      await supabase
        .from("renders")
        .update({
          status: "failed",
          error_message: `${format}: ${errorMessage}`,
        })
        .eq("id", dbRenderId);

      console.log("Render failed:", errorMessage);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
