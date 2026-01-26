import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Scene {
  id: string;
  asset_id: string | null;
  order_index: number;
  headline: string | null;
  subtext: string | null;
  duration_ms: number;
  transition: string | null;
  zoom_level: number | null;
  pan_x: number | null;
  pan_y: number | null;
}

interface Asset {
  id: string;
  file_url: string;
  file_type: string;
}

// Map our transitions to Shotstack transitions
const transitionMap: Record<string, string> = {
  fade: "fade",
  slideLeft: "slideLeft",
  slideRight: "slideRight",
  slideUp: "slideUp",
  slideDown: "slideDown",
  zoom: "zoom",
  wipeLeft: "wipeLeft",
  wipeRight: "wipeRight",
};

// Netflix-style text effects
const getTextStyle = (sceneType: string, sceneIndex: number, totalScenes: number) => {
  const isFirst = sceneIndex === 0;
  const isLast = sceneIndex === totalScenes - 1;
  
  return {
    font: {
      family: "Montserrat",
      size: isFirst || isLast ? 56 : 48,
      weight: 800,
      color: "#ffffff",
    },
    position: "center",
    offset: {
      x: 0,
      y: isFirst ? 0 : -0.05,
    },
    transition: {
      in: isFirst ? "slideUp" : "fade",
      out: "fade",
    },
    effect: isFirst ? "zoomIn" : "none",
  };
};

interface BrandingOptions {
  logo_url?: string | null;
  brand_color?: string | null;
  brand_color_secondary?: string | null;
  logo_position?: string | null;
  logo_size?: string | null;
  show_logo_on_all_scenes?: boolean | null;
}

// Build Shotstack timeline for Netflix-style trailer
function buildShotstackTimeline(
  scenes: Scene[],
  assets: Asset[],
  style: string,
  outputFormat: "16:9" | "9:16" | "1:1" = "16:9",
  musicUrl?: string,
  musicVolume: number = 80,
  branding?: BrandingOptions
) {
  const assetMap = new Map(assets.map((a) => [a.id, a]));
  const tracks: any[] = [];
  let startTime = 0;

  // Background track with scenes
  const backgroundClips: any[] = [];
  const textClips: any[] = [];
  const logoClips: any[] = [];
  const overlayClips: any[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const asset = scene.asset_id ? assetMap.get(scene.asset_id) : null;
    const durationSec = scene.duration_ms / 1000;
    const transition = transitionMap[scene.transition || "fade"] || "fade";
    const transitionDuration = 0.5;

    if (asset) {
      // Ken Burns zoom effect for cinematic feel
      const zoomLevel = scene.zoom_level || 1.2;
      const panX = scene.pan_x || 0;
      const panY = scene.pan_y || 0;

      backgroundClips.push({
        asset: {
          type: asset.file_type === "video" ? "video" : "image",
          src: asset.file_url,
        },
        start: startTime,
        length: durationSec,
        fit: "cover",
        scale: zoomLevel,
        position: "center",
        offset: {
          x: panX * 0.1,
          y: panY * 0.1,
        },
        transition: {
          in: transition,
          out: i === scenes.length - 1 ? "fade" : undefined,
        },
        effect: "zoomInSlow", // Netflix-style slow zoom
      });
    }

    // Dark vignette overlay for cinematic look
    overlayClips.push({
      asset: {
        type: "html",
        html: `<div style="width:100%;height:100%;background:radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%);"></div>`,
        width: outputFormat === "9:16" ? 1080 : 1920,
        height: outputFormat === "9:16" ? 1920 : 1080,
      },
      start: startTime,
      length: durationSec,
      position: "center",
    });

    // Headlines with Netflix-style typography
    if (scene.headline) {
      const textStyle = getTextStyle(
        i === 0 ? "hook" : i === scenes.length - 1 ? "cta" : "feature",
        i,
        scenes.length
      );

      textClips.push({
        asset: {
          type: "html",
          html: `
            <div style="
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              text-align: center;
              padding: 40px;
            ">
              <h1 style="
                font-family: 'Montserrat', sans-serif;
                font-size: ${textStyle.font.size}px;
                font-weight: ${textStyle.font.weight};
                color: ${textStyle.font.color};
                text-transform: uppercase;
                letter-spacing: 4px;
                text-shadow: 0 4px 20px rgba(0,0,0,0.8), 0 0 40px rgba(229,9,20,0.3);
                margin: 0;
                line-height: 1.2;
              ">${scene.headline}</h1>
              ${scene.subtext ? `
                <p style="
                  font-family: 'Open Sans', sans-serif;
                  font-size: 24px;
                  font-weight: 400;
                  color: rgba(255,255,255,0.85);
                  margin-top: 20px;
                  text-shadow: 0 2px 10px rgba(0,0,0,0.8);
                ">${scene.subtext}</p>
              ` : ""}
            </div>
          `,
          width: outputFormat === "9:16" ? 1080 : 1920,
          height: outputFormat === "9:16" ? 1920 : 1080,
        },
        start: startTime + 0.3, // Slight delay for text entrance
        length: durationSec - 0.3,
        position: "center",
        transition: {
          in: i === 0 ? "slideUp" : "fade",
          out: "fade",
        },
      });
    }

    startTime += durationSec - transitionDuration; // Overlap for smooth transitions
  }

  // Build tracks (bottom to top rendering order)
  tracks.push({ clips: backgroundClips }); // Background images/videos
  tracks.push({ clips: overlayClips }); // Vignette overlay
  tracks.push({ clips: textClips }); // Text on top

  // Add logo overlay if provided
  if (branding?.logo_url) {
    const totalDuration = scenes.reduce((sum, s) => sum + s.duration_ms / 1000, 0);
    
    // Calculate logo position
    const positionMap: Record<string, { x: number; y: number }> = {
      "top-left": { x: -0.4, y: -0.4 },
      "top-right": { x: 0.4, y: -0.4 },
      "bottom-left": { x: -0.4, y: 0.4 },
      "bottom-right": { x: 0.4, y: 0.4 },
      "center": { x: 0, y: 0 },
    };
    
    // Calculate logo scale based on size
    const sizeMap: Record<string, number> = {
      "small": 0.1,
      "medium": 0.15,
      "large": 0.2,
    };
    
    const position = positionMap[branding.logo_position || "bottom-right"] || positionMap["bottom-right"];
    const scale = sizeMap[branding.logo_size || "medium"] || 0.15;

    if (branding.show_logo_on_all_scenes) {
      // Show logo throughout entire video
      logoClips.push({
        asset: {
          type: "image",
          src: branding.logo_url,
        },
        start: 0,
        length: totalDuration,
        fit: "none",
        scale: scale,
        position: "center",
        offset: position,
        opacity: 0.9,
        transition: {
          in: "fade",
          out: "fade",
        },
      });
    } else {
      // Show logo only on last scene
      const lastSceneDuration = scenes[scenes.length - 1]?.duration_ms / 1000 || 3;
      const lastSceneStart = totalDuration - lastSceneDuration;
      
      logoClips.push({
        asset: {
          type: "image",
          src: branding.logo_url,
        },
        start: lastSceneStart + 0.5, // Fade in slightly after scene starts
        length: lastSceneDuration - 0.5,
        fit: "none",
        scale: scale,
        position: "center",
        offset: position,
        opacity: 0.9,
        transition: {
          in: "fade",
          out: "fade",
        },
      });
    }
    
    tracks.push({ clips: logoClips });
  }

  // Add background music track if provided
  if (musicUrl) {
    const totalDuration = scenes.reduce((sum, s) => sum + s.duration_ms / 1000, 0);
    tracks.push({
      clips: [
        {
          asset: {
            type: "audio",
            src: musicUrl,
            volume: musicVolume / 100, // Convert 0-100 to 0-1
          },
          start: 0,
          length: totalDuration,
          transition: {
            in: "fadeIn",
            out: "fadeOut",
          },
        },
      ],
    });
  }

  // Resolution based on format
  const resolution = outputFormat === "9:16" 
    ? { width: 1080, height: 1920 } 
    : outputFormat === "1:1"
      ? { width: 1080, height: 1080 }
      : { width: 1920, height: 1080 };

  return {
    timeline: {
      background: "#000000",
      tracks,
      fonts: [
        {
          src: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800&display=swap",
        },
        {
          src: "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap",
        },
      ],
    },
    output: {
      format: "mp4",
      resolution: "hd",
      aspectRatio: outputFormat,
      size: resolution,
      fps: 30,
      quality: "high",
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, renderId } = await req.json();

    if (!projectId || !renderId) {
      return new Response(
        JSON.stringify({ error: "projectId and renderId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SHOTSTACK_API_KEY = Deno.env.get("SHOTSTACK_API_KEY");
    if (!SHOTSTACK_API_KEY) {
      console.error("SHOTSTACK_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Video rendering not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch project data
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error("Project not found");
    }

    // Fetch scenes
    const { data: scenes, error: scenesError } = await supabase
      .from("scenes")
      .select("*")
      .eq("project_id", projectId)
      .order("order_index");

    if (scenesError || !scenes || scenes.length === 0) {
      throw new Error("No scenes found");
    }

    // Fetch assets
    const { data: assets, error: assetsError } = await supabase
      .from("assets")
      .select("*")
      .eq("project_id", projectId);

    if (assetsError) {
      throw new Error("Failed to fetch assets");
    }

    // Fetch selected music track if set
    let musicUrl: string | undefined;
    let musicVolume = 80;
    
    if (project.selected_music_track) {
      const { data: musicTrack } = await supabase
        .from("music_tracks")
        .select("file_url")
        .eq("id", project.selected_music_track)
        .single();
      
      if (musicTrack) {
        musicUrl = musicTrack.file_url;
        musicVolume = project.music_volume || 80;
      }
    }

    // Extract branding options
    const branding: BrandingOptions = {
      logo_url: project.logo_url,
      brand_color: project.brand_color,
      brand_color_secondary: project.brand_color_secondary,
      logo_position: project.logo_position,
      logo_size: project.logo_size,
      show_logo_on_all_scenes: project.show_logo_on_all_scenes,
    };

    // Update render status to processing
    await supabase
      .from("renders")
      .update({ status: "processing", started_at: new Date().toISOString() })
      .eq("id", renderId);

    // Build Shotstack timeline with music and branding
    const shotstackPayload = buildShotstackTimeline(
      scenes as Scene[],
      (assets || []) as Asset[],
      project.style || "netflix",
      "16:9",
      musicUrl,
      musicVolume,
      branding
    );

    console.log("Submitting to Shotstack:", JSON.stringify(shotstackPayload, null, 2));

    // Submit to Shotstack
    const shotstackResponse = await fetch("https://api.shotstack.io/v1/render", {
      method: "POST",
      headers: {
        "x-api-key": SHOTSTACK_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(shotstackPayload),
    });

    const shotstackData = await shotstackResponse.json();

    if (!shotstackResponse.ok) {
      console.error("Shotstack error:", shotstackData);
      await supabase
        .from("renders")
        .update({
          status: "failed",
          error_message: shotstackData.message || "Rendering failed",
        })
        .eq("id", renderId);

      return new Response(
        JSON.stringify({ error: shotstackData.message || "Rendering failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shotstackRenderIds = {
      horizontal: shotstackData.response?.id,
    };

    // Also queue vertical and square renders with branding
    const verticalPayload = buildShotstackTimeline(
      scenes as Scene[],
      (assets || []) as Asset[],
      project.style || "netflix",
      "9:16",
      musicUrl,
      musicVolume,
      branding
    );
    
    const squarePayload = buildShotstackTimeline(
      scenes as Scene[],
      (assets || []) as Asset[],
      project.style || "netflix",
      "1:1",
      musicUrl,
      musicVolume,
      branding
    );

    const [verticalRes, squareRes] = await Promise.all([
      fetch("https://api.shotstack.io/v1/render", {
        method: "POST",
        headers: {
          "x-api-key": SHOTSTACK_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(verticalPayload),
      }),
      fetch("https://api.shotstack.io/v1/render", {
        method: "POST",
        headers: {
          "x-api-key": SHOTSTACK_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(squarePayload),
      }),
    ]);

    const verticalData = await verticalRes.json();
    const squareData = await squareRes.json();

    console.log("Renders submitted:", {
      horizontal: shotstackRenderIds.horizontal,
      vertical: verticalData.response?.id,
      square: squareData.response?.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        renderIds: {
          horizontal: shotstackRenderIds.horizontal,
          vertical: verticalData.response?.id,
          square: squareData.response?.id,
        },
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
