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
  quality?: "draft" | "standard" | "high";
  renderer?: "remotion" | "remotion-dev" | "shotstack";
}

const DEFAULT_SERVE_URL =
  "https://remotionlambda-useast1-kio865im8w.s3.us-east-1.amazonaws.com/sites/saas-demo-generator/index.html";

const buildRecreateInput = (project: any, scenes: any[]) => {
  const projectName = project?.name || "Demo";
  const brandPrimary = project?.brand_color || "#7B38D9";
  const mappedScenes = (scenes || [])
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map((scene, idx) => ({
      id: scene.id,
      title: scene.headline || `Scene ${idx + 1}`,
      body: scene.subtext || "",
      duration: Math.max(3, Math.round((scene.duration_ms || 3000) / 1000)),
      layout: "feature-glass",
    }));

  return {
    title: `${projectName} Demo`,
    brand: {
      name: projectName,
      primary: brandPrimary,
      secondary: project?.brand_color_secondary || "#FFFFFF",
      background: "#F7F8FB",
      fontFamily: "\"Space Grotesk\", \"Manrope\", system-ui",
      logoUrl: project?.logo_url || undefined,
    },
    scenes: [
      {
        id: "hook",
        title: projectName,
        body: project?.description || "Cinematic product demo",
        duration: 4,
        layout: "feature-glass",
      },
      ...mappedScenes,
      {
        id: "cta",
        title: "Start Free Trial",
        body: "Turn conversations into demos.",
        duration: 4,
        layout: "cta",
      },
    ],
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, renderId, format = "all", quality = "standard", renderer }: RenderRequest = await req.json();

    if (!projectId || !renderId) {
      return new Response(
        JSON.stringify({ error: "projectId and renderId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Optional local renderer (dev) to use a custom render service
    const localRenderUrl = Deno.env.get("LOCAL_RENDER_URL");
    if (renderer === "remotion-dev" && localRenderUrl) {
      const input = buildRecreateInput(project, scenes);
      const localResponse = await fetch(`${localRenderUrl}/api/recreate/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, jobId: renderId }),
      });
      const localData = await localResponse.json();
      const videoPath = localData.url || localData.path;
      const finalUrl = videoPath?.startsWith("http") ? videoPath : `${localRenderUrl}${videoPath}`;

      await supabase
        .from("renders")
        .update({
          status: "completed",
          progress: 100,
          video_url: finalUrl,
          completed_at: new Date().toISOString(),
        })
        .eq("id", renderId);

      return new Response(
        JSON.stringify({ renderer: "remotion-dev", renderIds: { horizontal: `local-${renderId}` }, url: finalUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for required AWS secrets
    const awsAccessKey = Deno.env.get("AWS_ACCESS_KEY_ID");
    const awsSecretKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
    const awsRegion = Deno.env.get("REMOTION_AWS_REGION") || "us-east-1";
    const functionName = Deno.env.get("REMOTION_FUNCTION_NAME");

    // If AWS is not configured, fall back to Shotstack
    if (!awsAccessKey || !awsSecretKey || !functionName) {
      console.error("Remotion Lambda not configured: missing AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, or REMOTION_FUNCTION_NAME");
      
      // Fall back to dev simulation mode
      await supabase
        .from("renders")
        .update({ status: "processing", progress: 10 })
        .eq("id", renderId);

      return new Response(
        JSON.stringify({
          success: true,
          renderer: "remotion-dev",
          renderIds: {
            horizontal: `dev-horizontal-${Date.now()}`,
          },
          message: "Remotion Lambda not configured. Using development simulation mode.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build input props for saas-demo-generator recreate composition
    const inputProps = buildRecreateInput(project, scenes);

    // Quality presets: resolution & codec settings
    const qualitySettings = {
      draft:    { scale: 0.5, crf: 28, jpegQuality: 60, framesPerLambda: 60 },
      standard: { scale: 1.0, crf: 18, jpegQuality: 80, framesPerLambda: 40 },
      high:     { scale: 1.0, crf: 12, jpegQuality: 95, framesPerLambda: 20 },
    }[quality];

    // Define render configurations
    const renderConfigs: { id: string; width: number; height: number; compositionId: string }[] = [
      { id: "horizontal", width: Math.round(1920 * qualitySettings.scale), height: Math.round(1080 * qualitySettings.scale), compositionId: "recreate-16-9" },
    ];

    // Calculate total duration
    const totalFrames = scenes.reduce((sum: number, scene: Scene) => 
      sum + Math.round((scene.duration_ms / 1000) * 30), 0
    );

    // Trigger Remotion Lambda renders
    const renderIds: Record<string, string> = {};

    const awsAccessKeyId = awsAccessKey;
    const awsSecretAccessKey = awsSecretKey;
    const remotionVersion = Deno.env.get("REMOTION_VERSION");
    if (!remotionVersion) {
      return new Response(
        JSON.stringify({ error: "REMOTION_VERSION is not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const webhookUrl = `${supabaseUrl}/functions/v1/remotion-webhook`;
    const remotionBucket = Deno.env.get("REMOTION_BUCKET_NAME") || "remotionlambda-useast1-kio865im8w";

    for (const config of renderConfigs) {
      try {
        const propsWithDimensions = {
          ...inputProps,
          width: config.width,
          height: config.height,
        };

        // Serialize inputProps using Remotion's expected format
        // For small payloads: { type: "payload", payload: "<json>" }
        // For large payloads (>~195KB): upload to S3 as { type: "bucket-url", hash, bucketName }
        const propsJson = JSON.stringify(propsWithDimensions);
        const propsSize = new TextEncoder().encode(propsJson).length;
        const MAX_INLINE_SIZE = 195_000; // ~195KB threshold for video renders

        let serializedInputProps: Record<string, any>;

        if (propsSize > MAX_INLINE_SIZE) {
          const propsHash = await sha256Hex(propsJson);
          const propsS3Key = `input-props/${propsHash}.json`;

          await uploadToS3({
            bucket: remotionBucket,
            key: propsS3Key,
            body: propsJson,
            contentType: "application/json",
            region: awsRegion,
            accessKeyId: awsAccessKeyId!,
            secretAccessKey: awsSecretAccessKey!,
          });

          console.log(`Serialized inputProps to S3: ${propsS3Key} (${propsSize} bytes)`);
          serializedInputProps = {
            type: "bucket-url",
            hash: propsHash,
            bucketName: remotionBucket,
          };
        } else {
          console.log(`Passing inputProps inline (${propsSize} bytes)`);
          serializedInputProps = {
            type: "payload",
            payload: propsJson,
          };
        }

        const serveUrl = Deno.env.get("REMOTION_SERVE_URL") || DEFAULT_SERVE_URL;
        console.log(`Using serveUrl: ${serveUrl}`);

        const lambdaPayload = {
          type: "start",
          version: remotionVersion,
          serveUrl,
          composition: config.compositionId,
          bucketName: remotionBucket,
          inputProps: serializedInputProps,
          codec: "h264",
          imageFormat: "jpeg",
          jpegQuality: qualitySettings.jpegQuality,
          crf: qualitySettings.crf,
          maxRetries: quality === "draft" ? 1 : 2,
          privacy: "public",
          logLevel: "info",
          framesPerLambda: qualitySettings.framesPerLambda,
          concurrencyPerLambda: 1,
          muted: false,
          overwrite: true,
          forcePathStyle: false,
          envVariables: {},
          metadata: {},
          chromiumOptions: {},
          scale: qualitySettings.scale,
          timeoutInMilliseconds: 120000,
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
  method: "POST" | "GET" | "PUT";
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

async function uploadToS3(params: {
  bucket: string;
  key: string;
  body: string;
  contentType: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}): Promise<boolean> {
  try {
    const host = `${params.bucket}.s3.${params.region}.amazonaws.com`;
    const path = `/${params.key}`;
    const url = `https://${host}${path}`;

    const { amzDate, dateStamp } = getAwsDates();

    const signed = await signAwsRequest({
      method: "PUT" as any,
      host,
      path,
      region: params.region,
      service: "s3",
      accessKeyId: params.accessKeyId,
      secretAccessKey: params.secretAccessKey,
      amzDate,
      dateStamp,
      body: params.body,
      contentType: params.contentType,
    });

    const response = await fetch(url, {
      method: "PUT",
      headers: signed.headers,
      body: params.body,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`S3 upload failed for ${params.key}:`, text);
      return false;
    }

    console.log(`Uploaded input props to s3://${params.bucket}/${params.key}`);
    return true;
  } catch (err) {
    console.error("S3 upload error:", err);
    return false;
  }
}
