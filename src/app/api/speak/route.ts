import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsClient } from 'elevenlabs';

// Initialize ElevenLabs client
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVEN_LABS_KEY || process.env.ELEVEN_LABS_API_KEY!,
});

// Voice configurations for easy switching (2025 optimized)
const VOICE_CONFIGS = {
  jessa: "yj30vwTGJxSHezdAGsv9", // Jessa - USER'S PREFERRED VOICE! Perfect for Tal! (NEW DEFAULT!)
  dorothy: "ThT5KcBeYPX3keUQqHPh", // Dorothy - British, bubbly, warm
  bella: "EXAVITQu4vr4xnSDxMaL", // Bella - American, soft, bubbly
  rachel: "21m00Tcm4TlvDq8ikWAM", // Rachel - Natural, warm, reliable
  drew: "29vD33N1CtxCmqQRPOHJ", // Drew - Professional, clear
  clyde: "2EiwWnXFnvU5JabPnv8n", // Clyde - Warm, friendly
  domi: "AZnzlk1XvdvUeBnXmlld", // Domi - Strong, confident
  dave: "CYw3kZ02Hs0563khs1Fj", // Dave - Conversational
  fin: "D38z5RcWu1voky8WS1ja", // Fin - Pleasant, clear
  sarah: "EXAVITQu4vr4xnSDxMaL", // Sarah - Friendly, engaging
  antoni: "ErXwobaYiN019PkySvjV", // Antoni - Well-rounded
  thomas: "GBv7mTt0atIp3Br8iCZE", // Thomas - Calm, authoritative
  charlie: "IKne3meq5aSn9XLyUdCD", // Charlie - Natural, friendly
  emily: "LcfcDJNUP1GQjkzn1xUU", // Emily - Calm, pleasant
  elli: "MF3mGyEYCl7XYWbV9V6O", // Elli - Emotional range
  callum: "N2lVS1w4EtoT3dr4eOWO", // Callum - Hoarse, intense
  patrick: "ODq5zmih8GrVes37Dizd", // Patrick - Pleasant, clear
  harry: "SOYHLrjzK2X1ezoPC6cr", // Harry - Young, energetic
  liam: "TX3LPaxmHKxFdv7VOQHJ", // Liam - Clear, friendly
};

export async function POST(req: NextRequest) {
  try {
    const { text, voice, model, voiceSettings } = await req.json();
    
    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Text is required' },
        { status: 400 }
      );
    }

    if (!process.env.ELEVEN_LABS_KEY && !process.env.ELEVEN_LABS_API_KEY) {
      console.error('❌ ElevenLabs API key not configured');
      return NextResponse.json(
        { success: false, error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    console.log('🔊 Converting text to speech:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));

    // Voice selection: use provided voice ID, or look up by name, or default to Rachel
    let voiceId: string;
    if (voice) {
      // If voice is a direct ID (length 20 alphanumeric), use it directly
      if (typeof voice === 'string' && voice.length === 20 && /^[A-Za-z0-9]+$/.test(voice)) {
        voiceId = voice;
      } else {
        // Otherwise, try to find it in our voice configs (case-insensitive)
        const voiceName = voice.toLowerCase();
        voiceId = VOICE_CONFIGS[voiceName as keyof typeof VOICE_CONFIGS] || VOICE_CONFIGS.jessa;
      }
    } else {
      voiceId = VOICE_CONFIGS.jessa; // Default to Jessa - user's preferred voice!
    }

    const modelId = model || "eleven_turbo_v2_5"; // 2025 optimal model - perfect balance of quality & speed

    console.log(`🎤 Using voice: ${voiceId}, model: ${modelId}`);

    // Generate speech using ElevenLabs TTS with 2025 optimized settings for bubbly Tal
    const audio = await elevenlabs.textToSpeech.convert(voiceId, {
      text: text,
      model_id: modelId,
      voice_settings: voiceSettings || {
        stability: 0.3,          // Lower = more expressive/varied (perfect for bubbly personality!)
        similarity_boost: 0.75,   // Higher = more consistent character voice
        style: 0.85,             // Higher = more exaggerated/enthusiastic delivery  
        use_speaker_boost: true   // Enhanced voice clarity
      },
      output_format: "mp3_44100_128", // High quality audio
      language_code: "en"        // Explicit English for better performance
    });

    // Convert audio stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    console.log('✅ Audio generated successfully, size:', audioBuffer.length, 'bytes');

    // Return audio as MP3 response with proper headers
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*', // Allow cross-origin requests
        'Accept-Ranges': 'bytes',
      },
    });

  } catch (error: any) {
    console.error('❌ TTS error:', error);
    
    // Handle specific ElevenLabs API errors
    let errorMessage = 'Failed to generate speech';
    let statusCode = 500;
    
    if (error?.message?.includes('quota') || error?.message?.includes('limit')) {
      errorMessage = 'ElevenLabs API quota exceeded. Please try again later.';
      statusCode = 429;
    } else if (error?.message?.includes('voice')) {
      errorMessage = 'Invalid voice selection. Please use a valid voice ID or name.';
      statusCode = 400;
    } else if (error?.message?.includes('unauthorized') || error?.message?.includes('API key')) {
      errorMessage = 'ElevenLabs API authentication failed. Please check your API key.';
      statusCode = 401;
    } else if (error?.message) {
      errorMessage = `TTS Error: ${error.message}`;
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: statusCode }
    );
  }
}