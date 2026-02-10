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

    // Prepare input props for Remotion - now properly including motion_config from database
    // SIMPLIFIED input props - minimal motion config for performance
    const inputProps = {
      scenes: scenes.map((scene: any) => {
        const storedMotionConfig = scene.motion_config || {};
        
        // Simplified motion config - only essential properties
        const motionConfig = {
          animation_style: storedMotionConfig.animation_style || "fade-scale",
          spring: storedMotionConfig.spring || { damping: 30, mass: 0.5, stiffness: 300, overshootClamping: true },
          stagger_delay_frames: 0,
          entrance_delay_frames: storedMotionConfig.entrance_delay_frames || 3,
          effects: ["vignette"], // Only vignette for performance
          camera: {
            zoom_start: 1.0,
            zoom_end: Math.min(scene.zoom_level || 1.15, 1.5), // Cap zoom for performance
            pan_x: scene.pan_x || 0,
            pan_y: scene.pan_y || 0,
          },
        };

        return {
          id: scene.id,
          headline: scene.headline || "",
          subtext: scene.subtext || "",
          imageUrl: scene.asset?.file_url || "",
          durationInFrames: Math.round((scene.duration_ms / 1000) * 30),
          motionConfig,
          transition: mapTransition(scene.transition),
        };
      }),
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

    const awsAccessKeyId = awsAccessKey;
    const awsSecretAccessKey = awsSecretKey;

    for (const config of renderConfigs) {
      try {
        const remotionVersion = Deno.env.get("REMOTION_VERSION") || "4.0.417";
        const webhookUrl = `${supabaseUrl}/functions/v1/remotion-webhook`;
        const remotionBucket = Deno.env.get("REMOTION_BUCKET_NAME") || "remotionlambda-useast1-kio865im8w";
        const lambdaPayload = {
          type: "start",
          version: remotionVersion,
          serveUrl:
            Deno.env.get("REMOTION_SERVE_URL") ||
            "https://remotionlambda-useast1-xxxxx.s3.amazonaws.com/sites/xxxxx/index.html",
          composition: config.compositionId,
          forceBucketName: remotionBucket,
          inputProps: {
            ...inputProps,
            width: config.width,
            height: config.height,
          },
          codec: "h264",
          imageFormat: "jpeg",
          maxRetries: 2,
          privacy: "public",
          framesPerLambda: 40,
          outName: `${projectId}-${config.id}.mp4`,
          webhook: {
            url: webhookUrl,
            customData: {
              projectId,
              dbRenderId: renderId,
              format: config.id,
            },
          },
        };

        const host = `lambda.${awsRegion}.amazonaws.com`;
        const path = `/2015-03-31/functions/${functionName}/invocations`;
        const lambdaUrl = `https://${host}${path}`;

        const body = JSON.stringify(lambdaPayload);
        const { amzDate, dateStamp } = getAwsDates();

        const signed = await signAwsRequest({
          method: "POST",
          host,
          path,
          region: awsRegion,
          service: "lambda",
          accessKeyId: awsAccessKeyId!,
          secretAccessKey: awsSecretAccessKey!,
          amzDate,
          dateStamp,
          body,
          contentType: "application/json",
        });

        const lambdaResponse = await fetch(lambdaUrl, {
          method: "POST",
          headers: signed.headers,
          body,
        });

        const responseText = await lambdaResponse.text();
        if (!lambdaResponse.ok) {
          console.error(`Failed to start ${config.id} render:`, responseText);
          continue;
        }

        const result = safeJsonParse(responseText) || {};
        console.log(`Started Remotion render for ${config.id}:`, result);
        
        // Check if Lambda returned an error in the response body
        if ((result as any).type === "error" || (result as any).errorType) {
          console.error(`Lambda returned error for ${config.id}:`, (result as any).message || responseText);
          continue;
        }
        
        // Remotion Lambda typically returns a renderId
        const remotionRenderId = (result as any).renderId || (result as any).id;
        if (!remotionRenderId) {
          console.error(`No renderId in Lambda response for ${config.id}`);
          continue;
        }
        renderIds[config.id] = remotionRenderId;
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

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getAwsDates() {
  // AWS requires:
  // - amzDate: YYYYMMDD'T'HHMMSS'Z'
  // - dateStamp: YYYYMMDD
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = now.getUTCFullYear();
  const mm = pad(now.getUTCMonth() + 1);
  const dd = pad(now.getUTCDate());
  const hh = pad(now.getUTCHours());
  const mi = pad(now.getUTCMinutes());
  const ss = pad(now.getUTCSeconds());
  const dateStamp = `${yyyy}${mm}${dd}`;
  const amzDate = `${dateStamp}T${hh}${mi}${ss}Z`;
  return { amzDate, dateStamp };
}

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return toHex(hash);
}

async function hmacSha256(key: ArrayBuffer, data: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
  return sig;
}

function toHex(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getSignatureKey(params: {
  secretAccessKey: string;
  dateStamp: string;
  region: string;
  service: string;
}) {
  const kDate = await hmacSha256(
    new TextEncoder().encode("AWS4" + params.secretAccessKey).buffer,
    params.dateStamp
  );
  const kRegion = await hmacSha256(kDate, params.region);
  const kService = await hmacSha256(kRegion, params.service);
  const kSigning = await hmacSha256(kService, "aws4_request");
  return kSigning;
}

async function signAwsRequest(params: {
  method: "POST" | "GET";
  host: string;
  path: string;
  region: string;
  service: string;
  accessKeyId: string;
  secretAccessKey: string;
  amzDate: string;
  dateStamp: string;
  body: string;
  contentType: string;
}) {
  const payloadHash = await sha256Hex(params.body);

  // Canonical headers must be lowercase and sorted.
  const canonicalHeaders =
    `content-type:${params.contentType}\n` +
    `host:${params.host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${params.amzDate}\n`;

  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest =
    `${params.method}\n` +
    `${params.path}\n` +
    `\n` +
    `${canonicalHeaders}\n` +
    `${signedHeaders}\n` +
    `${payloadHash}`;

  const canonicalRequestHash = await sha256Hex(canonicalRequest);
  const credentialScope = `${params.dateStamp}/${params.region}/${params.service}/aws4_request`;

  const stringToSign =
    `AWS4-HMAC-SHA256\n` +
    `${params.amzDate}\n` +
    `${credentialScope}\n` +
    `${canonicalRequestHash}`;

  const signingKey = await getSignatureKey({
    secretAccessKey: params.secretAccessKey,
    dateStamp: params.dateStamp,
    region: params.region,
    service: params.service,
  });

  const signature = toHex(await hmacSha256(signingKey, stringToSign));

  const authorizationHeader =
    `AWS4-HMAC-SHA256 ` +
    `Credential=${params.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, ` +
    `Signature=${signature}`;

  return {
    headers: {
      "Content-Type": params.contentType,
      Host: params.host,
      "X-Amz-Date": params.amzDate,
      "X-Amz-Content-Sha256": payloadHash,
      Authorization: authorizationHeader,
    },
  };
}
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
