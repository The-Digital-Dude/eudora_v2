import { NextRequest, NextResponse } from "next/server";

// In-memory cache for audio buffers to avoid redundant API calls and stay strictly in the free tier
const audioCache = new Map<string, { buffer: string; mimeType: string; timestamp: number }>();
const MAX_CACHE_SIZE = 200;

function hashKey(text: string, voice: string, rate: number, pitch: number): string {
  return `${voice}_${rate}_${pitch}_${text.trim().toLowerCase()}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      text,
      voice = "en-US-Journey-F",
      rate = 0.88,
      pitch = 1.5,
    } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const key = hashKey(text, voice, rate, pitch);

    // 1. Check cache first
    const cached = audioCache.get(key);
    if (cached) {
      return NextResponse.json({
        audioBase64: cached.buffer,
        mimeType: cached.mimeType,
        cached: true,
      });
    }

    // 2. Check if Google Cloud TTS or Gemini API Key is configured
    const apiKey = process.env.GOOGLE_TTS_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Return fallback notice so frontend uses on-device Web Speech API with 0 cost
      return NextResponse.json({
        fallback: true,
        message: "No cloud key configured. Use Web Speech API.",
      });
    }

    // 3. Call Google Cloud TTS REST API directly (Free tier: 1 million characters / month for Neural2/Journey, 4M for Standard)
    const googleTtsUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

    const ttsPayload = {
      input: { text },
      voice: {
        languageCode: "en-US",
        name: voice,
        ssmlGender: "FEMALE",
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: rate,
        pitch: pitch,
      },
    };

    const res = await fetch(googleTtsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ttsPayload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.warn("Cloud TTS API returned status:", res.status, errData);
      return NextResponse.json({
        fallback: true,
        message: "Cloud TTS unavailable. Falling back to Web Speech API.",
      });
    }

    const data = await res.json();
    const audioContent = data.audioContent; // Base64 encoded MP3

    if (audioContent) {
      if (audioCache.size >= MAX_CACHE_SIZE) {
        // Evict oldest
        const firstKey = audioCache.keys().next().value;
        if (firstKey) audioCache.delete(firstKey);
      }
      audioCache.set(key, {
        buffer: audioContent,
        mimeType: "audio/mp3",
        timestamp: Date.now(),
      });

      return NextResponse.json({
        audioBase64: audioContent,
        mimeType: "audio/mp3",
        cached: false,
      });
    }

    return NextResponse.json({
      fallback: true,
      message: "No audio generated. Falling back to Web Speech API.",
    });
  } catch (error) {
    console.error("TTS Route error:", error);
    return NextResponse.json({
      fallback: true,
      message: "TTS error. Falling back to Web Speech API.",
    });
  }
}
