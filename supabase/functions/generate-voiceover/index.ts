import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VoiceoverRequest {
  scenes: {
    headline: string;
    subtext?: string;
    duration_ms: number;
  }[];
  voiceId?: string;
  style?: 'professional' | 'conversational' | 'energetic';
}

interface VoiceoverResponse {
  success: boolean;
  audioUrl?: string;
  audioBase64?: string;
  scripts?: string[];
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scenes, voiceId = 'JBFqnCBsd6RMkjVDRZzb', style = 'professional' }: VoiceoverRequest = await req.json();

    if (!scenes || scenes.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Scenes are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      console.error('ELEVENLABS_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'ElevenLabs not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Generate voiceover script from scene headlines using AI
    console.log('Generating voiceover script...');
    
    const sceneDescriptions = scenes.map((s, i) => 
      `Scene ${i + 1} (${(s.duration_ms / 1000).toFixed(1)}s): "${s.headline}"${s.subtext ? ` - ${s.subtext}` : ''}`
    ).join('\n');

    const styleGuides = {
      professional: 'Use clear, confident language suitable for a B2B product demo. Be concise and value-focused.',
      conversational: 'Use friendly, approachable language like talking to a colleague. Include natural pauses and flow.',
      energetic: 'Use enthusiastic, dynamic language. Be punchy and exciting. Build momentum through the demo.',
    };

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a professional voiceover script writer for product demo videos. 
${styleGuides[style]}

Write natural-sounding narration that:
- Flows smoothly from scene to scene
- Matches the approximate duration of each scene (reading pace: ~150 words per minute)
- Highlights key product benefits
- Uses active voice and engaging language
- Avoids technical jargon unless necessary

Output ONLY the voiceover text, separated by newlines for each scene. No scene numbers or annotations.`,
          },
          {
            role: 'user',
            content: `Generate voiceover narration for this product demo video:\n\n${sceneDescriptions}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const error = await aiResponse.text();
      console.error('AI script generation failed:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to generate voiceover script' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const fullScript = aiData.choices?.[0]?.message?.content || '';
    const scripts = fullScript.split('\n').filter((line: string) => line.trim().length > 0);

    console.log('Generated scripts:', scripts.length);

    // Step 2: Generate voiceover audio using ElevenLabs
    console.log('Generating voiceover audio...');

    // Voice settings based on style
    const voiceSettings = {
      professional: { stability: 0.7, similarity_boost: 0.8, style: 0.3 },
      conversational: { stability: 0.5, similarity_boost: 0.75, style: 0.5 },
      energetic: { stability: 0.4, similarity_boost: 0.7, style: 0.7 },
    };

    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: scripts.join('\n\n'), // Join with pauses between scenes
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            ...voiceSettings[style],
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const error = await ttsResponse.text();
      console.error('ElevenLabs TTS failed:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to generate voiceover audio', scripts }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    const audioBase64 = base64Encode(audioBuffer);

    console.log('Voiceover generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        audioBase64,
        scripts,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating voiceover:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate voiceover';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
