import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Scene {
  id: string;
  headline: string;
  subtext: string;
  duration_ms: number;
  transition?: string;
  zoom_level?: number;
  pan_x?: number;
  pan_y?: number;
  asset?: {
    file_url: string;
    file_type: string;
  };
}

interface RenderRequest {
  projectId: string;
  renderId: string;
  format?: "horizontal" | "vertical" | "square" | "all";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, renderId, format = "all" }: RenderRequest = await req.json();

    if (!projectId || !renderId) {
      return new Response(
        JSON.stringify({ error: "projectId and renderId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for required AWS secrets
    const awsAccessKey = Deno.env.get("AWS_ACCESS_KEY_ID");
    const awsSecretKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
    const awsRegion = Deno.env.get("REMOTION_AWS_REGION") || "us-east-1";
    const functionName = Deno.env.get("REMOTION_FUNCTION_NAME");

    // If AWS is not configured, fall back to Shotstack
    if (!awsAccessKey || !awsSecretKey || !functionName) {
      console.log("Remotion Lambda not configured, falling back to Shotstack");
      
      // Call the legacy render-video function
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const response = await fetch(`${supabaseUrl}/functions/v1/render-video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": req.headers.get("Authorization") || "",
        },
        body: JSON.stringify({ projectId, renderId }),
      });

      const data = await response.json();
      return new Response(
        JSON.stringify({ ...data, renderer: "shotstack" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load project and scenes
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: scenes, error: scenesError } = await supabase
      .from("scenes")
      .select("*, asset:assets(*)")
      .eq("project_id", projectId)
      .order("order_index");

    if (scenesError || !scenes || scenes.length === 0) {
      return new Response(
        JSON.stringify({ error: "No scenes found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update render status to processing
    await supabase
      .from("renders")
      .update({ status: "processing", started_at: new Date().toISOString(), progress: 5 })
      .eq("id", renderId);

    // Prepare input props for Remotion
    const inputProps = {
      scenes: scenes.map((scene: Scene) => ({
        id: scene.id,
        headline: scene.headline || "",
        subtext: scene.subtext || "",
        imageUrl: scene.asset?.file_url || "",
        durationInFrames: Math.round((scene.duration_ms / 1000) * 30),
        motionConfig: {
          animation_style: "bounce-in",
          spring: { damping: 10, mass: 1, stiffness: 100, overshootClamping: false },
          stagger_delay_frames: 2,
          entrance_delay_frames: 5,
          effects: ["vignette", "glow", "particles"],
          camera: {
            zoom_start: 1.0,
            zoom_end: scene.zoom_level || 1.15,
            pan_x: scene.pan_x || 0,
            pan_y: scene.pan_y || 0,
          },
        },
        transition: mapTransition(scene.transition),
      })),
      brandColor: project.brand_color || "#8B5CF6",
      logoUrl: project.logo_url || undefined,
      fps: 30,
    };

    // Define render configurations
    const renderConfigs: { id: string; width: number; height: number; compositionId: string }[] = [];
    
    if (format === "all" || format === "horizontal") {
      renderConfigs.push({ id: "horizontal", width: 1920, height: 1080, compositionId: "DemoTrailer" });
    }
    if (format === "all" || format === "vertical") {
      renderConfigs.push({ id: "vertical", width: 1080, height: 1920, compositionId: "DemoTrailerVertical" });
    }
    if (format === "all" || format === "square") {
      renderConfigs.push({ id: "square", width: 1080, height: 1080, compositionId: "DemoTrailerSquare" });
    }

    // Calculate total duration
    const totalFrames = scenes.reduce((sum: number, scene: Scene) => 
      sum + Math.round((scene.duration_ms / 1000) * 30), 0
    );

    // Trigger Remotion Lambda renders
    const renderIds: Record<string, string> = {};
    
    for (const config of renderConfigs) {
      try {
        // Call AWS Lambda directly using AWS Signature V4
        const lambdaPayload = {
          type: "start",
          serveUrl: Deno.env.get("REMOTION_SERVE_URL") || "https://remotionlambda-useast1-xxxxx.s3.amazonaws.com/sites/xxxxx/index.html",
          composition: config.compositionId,
          inputProps: {
            ...inputProps,
            width: config.width,
            height: config.height,
          },
          codec: "h264",
          imageFormat: "jpeg",
          maxRetries: 1,
          privacy: "public",
          framesPerLambda: 10,
          outName: `${projectId}-${config.id}.mp4`,
        };

        // Use fetch with AWS Signature (simplified - in production use proper AWS SDK)
        const lambdaUrl = `https://lambda.${awsRegion}.amazonaws.com/2015-03-31/functions/${functionName}/invocations`;
        
        const lambdaResponse = await fetch(lambdaUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Amz-Date": new Date().toISOString().replace(/[:-]|\.\d{3}/g, ""),
            // Note: In production, use proper AWS Signature V4 signing
            // This is a placeholder - actual implementation requires aws4 signing
          },
          body: JSON.stringify(lambdaPayload),
        });

        if (lambdaResponse.ok) {
          const result = await lambdaResponse.json();
          renderIds[config.id] = result.renderId || `remotion-${config.id}-${Date.now()}`;
          console.log(`Started Remotion render for ${config.id}:`, result);
        } else {
          console.error(`Failed to start ${config.id} render:`, await lambdaResponse.text());
          // Continue with other formats
        }
      } catch (err) {
        console.error(`Error starting ${config.id} render:`, err);
      }
    }

    // If no renders started, fall back to mock progress
    if (Object.keys(renderIds).length === 0) {
      console.log("No Remotion renders started, using simulated progress");
      
      // Simulate render progress for development/testing
      await supabase
        .from("renders")
        .update({ 
          status: "processing", 
          progress: 10,
        })
        .eq("id", renderId);

      // Return mock render IDs for status checking
      return new Response(
        JSON.stringify({
          success: true,
          renderer: "remotion-dev",
          renderIds: {
            horizontal: `dev-horizontal-${Date.now()}`,
            vertical: `dev-vertical-${Date.now()}`,
            square: `dev-square-${Date.now()}`,
          },
          totalFrames,
          message: "Remotion Lambda not fully configured. Using development mode.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        renderer: "remotion",
        renderIds,
        totalFrames,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Render error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function mapTransition(transition?: string): string {
  switch (transition) {
    case "slide-left":
    case "slide-right":
    case "zoom":
    case "fade":
      return transition;
    case "slide-up":
    case "slide-down":
    case "dissolve":
      return "fade";
    case "zoom-in":
    case "zoom-out":
    case "cross-zoom":
      return "zoom";
    default:
      return "fade";
  }
}
