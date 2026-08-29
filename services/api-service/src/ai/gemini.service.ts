import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

/**
 * Reached over plain HTTP rather than through the Google SDK, matching how
 * every other outbound integration in this repo works (see ExpoPushService):
 * three endpoints do not justify a dependency, and the SDK's model surface
 * moves faster than our lockfile does.
 *
 * Degrades instead of throwing at construction, like StripeService — a missing
 * key must not stop the API from booting, so `isConfigured` goes false and the
 * calls that need a key raise 503 with something actionable.
 */

/** Text generation and speech-to-text. Both are the same multimodal model. */
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL ?? 'gemini-3.6-flash';

/**
 * Text-to-speech is a separate model. Note the version skew is deliberate, not
 * stale: the 2.5 TTS preview rejects every request with "Model tried to
 * generate text, but it should only be used for TTS", and 3.6 has no audio
 * output modality at all.
 */
const TTS_MODEL =
  process.env.GEMINI_TTS_MODEL ?? 'gemini-3.1-flash-tts-preview';

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * The chat model spends most of its budget on internal reasoning that never
 * reaches the caller — a 25-token answer measured 339 thinking tokens. That
 * spend counts against maxOutputTokens, so a budget sized to the visible reply
 * truncates it mid-sentence with finishReason MAX_TOKENS. `thinkingConfig` is
 * not accepted on this model, so headroom is the only lever.
 */
const CHAT_OUTPUT_TOKENS = 2000;

/** Generation is slow enough that the platform default would cut it off. */
const REQUEST_TIMEOUT_MS = 60_000;

export interface GeminiSpeechResult {
  /** A complete RIFF/WAVE file — playable as-is, unlike the raw API output. */
  audio: Buffer;
  mimeType: string;
  durationMs: number;
}

export interface ConversationTurn {
  role: 'user' | 'model';
  text: string;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string | null;

  constructor() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      this.logger.warn(
        'GEMINI_API_KEY is not set — narration, transcription and the story ' +
          'agent are disabled. Set GEMINI_API_KEY to enable them.',
      );
      this.apiKey = null;
      return;
    }
    this.apiKey = key;
  }

  get isConfigured(): boolean {
    return this.apiKey !== null;
  }

  private requireKey(): string {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'The voice service is not configured on this server',
      );
    }
    return this.apiKey;
  }

  /**
   * Answers as the story's narrator. `systemInstruction` carries the grounding
   * — the story text plus the rule to answer only from it — and is built by the
   * caller, because only the caller knows which story the child is in.
   */
  async converse(params: {
    systemInstruction: string;
    history?: ConversationTurn[];
    userText: string;
    /**
     * Raise for replies that are structured rather than conversational. A story
     * draft returns the whole text twice — once plain, once with performance
     * markup — so the default, sized for two sentences to a child, truncates it
     * mid-JSON and the parse fails with no obvious cause.
     */
    maxOutputTokens?: number;
  }): Promise<string> {
    const contents = [
      ...(params.history ?? []).map((turn) => ({
        role: turn.role,
        parts: [{ text: turn.text }],
      })),
      { role: 'user', parts: [{ text: params.userText }] },
    ];

    const body = await this.post(CHAT_MODEL, {
      systemInstruction: { parts: [{ text: params.systemInstruction }] },
      contents,
      generationConfig: {
        maxOutputTokens: params.maxOutputTokens ?? CHAT_OUTPUT_TOKENS,
      },
    });

    const candidate = body?.candidates?.[0];
    const text = candidate?.content?.parts
      ?.map((part: any) => part?.text ?? '')
      .join('')
      .trim();

    if (!text) {
      // A blocked or truncated generation arrives shaped like a success, so
      // the finish reason is the only signal that something went wrong.
      this.logger.warn(
        `Chat returned no text (finishReason=${candidate?.finishReason ?? 'none'})`,
      );
      // A truncated reply is a budget problem, not an outage, and the two want
      // different fixes — raising maxOutputTokens versus waiting and retrying.
      throw new ServiceUnavailableException(
        candidate?.finishReason === 'MAX_TOKENS'
          ? 'That reply was longer than the space allowed for it'
          : 'The story assistant could not answer just now',
      );
    }
    return text;
  }

  /**
   * `styleDirection` rides in the prompt rather than a parameter — the API has
   * no prosody controls, and a plain-language instruction ("read this gently,
   * to a small child") is how the model is steered.
   */
  async synthesizeSpeech(params: {
    text: string;
    voiceName: string;
    styleDirection?: string;
  }): Promise<GeminiSpeechResult> {
    const prompt = params.styleDirection
      ? `${params.styleDirection}\n\n${params.text}`
      : params.text;

    const body = await this.post(TTS_MODEL, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: params.voiceName } },
        },
      },
    });

    const inline = body?.candidates?.[0]?.content?.parts?.find(
      (part: any) => part?.inlineData?.data,
    )?.inlineData;

    if (!inline?.data) {
      throw new ServiceUnavailableException(
        'The narrator could not record that line just now',
      );
    }

    // The API returns headerless PCM — "audio/L16;rate=24000". Nothing plays
    // that, so the RIFF header goes on here rather than in every caller.
    const pcm = Buffer.from(inline.data, 'base64');
    const sampleRate = GeminiService.sampleRateOf(inline.mimeType);

    return {
      audio: GeminiService.toWav(pcm, sampleRate),
      mimeType: 'audio/wav',
      // Exact, not estimated: 16-bit mono means two bytes per sample.
      durationMs: Math.round((pcm.length / (sampleRate * 2)) * 1000),
    };
  }

  /** Speech to text. Returns the words only — no commentary, no punctuation fixes. */
  async transcribe(params: {
    audio: Buffer;
    mimeType: string;
  }): Promise<string> {
    const body = await this.post(CHAT_MODEL, {
      systemInstruction: {
        parts: [
          {
            text:
              'Transcribe the audio verbatim. Output only the words spoken, ' +
              'nothing else. If there is no intelligible speech, output nothing.',
          },
        ],
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: params.mimeType,
                data: params.audio.toString('base64'),
              },
            },
          ],
        },
      ],
      generationConfig: { maxOutputTokens: CHAT_OUTPUT_TOKENS },
    });

    return (
      body?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part?.text ?? '')
        .join('')
        .trim() ?? ''
    );
  }

  private async post(model: string, payload: unknown): Promise<any> {
    const key = this.requireKey();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${API_ROOT}/${model}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );

      const body = await response.json().catch(() => null);

      if (!response.ok || body?.error) {
        // The key travels in the query string, so the URL must never reach the
        // log. Only the model and the upstream message do.
        this.logger.error(
          `Gemini ${model} failed: ${response.status} ${
            body?.error?.message ?? 'no message'
          }`,
        );
        // 429 is not an outage and should not read like one. The free tier
        // allows twenty requests a minute, which a handful of simultaneous
        // visitors will reach, and "we are busy, try again" is both true and
        // survivable in front of an audience — where "unavailable" is not.
        throw new ServiceUnavailableException(
          response.status === 429
            ? 'Lots of children are reading right now — try again in a moment.'
            : 'The voice service is unavailable right now',
        );
      }

      return body;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      const reason =
        (error as Error)?.name === 'AbortError'
          ? `timed out after ${REQUEST_TIMEOUT_MS}ms`
          : (error as Error)?.message;
      this.logger.error(`Gemini ${model} request failed: ${reason}`);
      throw new ServiceUnavailableException(
        'The voice service is unavailable right now',
      );
    } finally {
      clearTimeout(timer);
    }
  }

  /** Reads the rate out of "audio/L16;rate=24000", falling back to the usual 24k. */
  private static sampleRateOf(mimeType: string | undefined): number {
    const match = /rate=(\d+)/i.exec(mimeType ?? '');
    const rate = match ? Number(match[1]) : NaN;
    return Number.isFinite(rate) && rate > 0 ? rate : 24_000;
  }

  /** Minimal RIFF header for 16-bit mono PCM. */
  private static toWav(pcm: Buffer, sampleRate: number): Buffer {
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcm.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // PCM chunk size
    header.writeUInt16LE(1, 20); // format: PCM
    header.writeUInt16LE(1, 22); // channels: mono
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * 2, 28); // byte rate
    header.writeUInt16LE(2, 32); // block align
    header.writeUInt16LE(16, 34); // bits per sample
    header.write('data', 36);
    header.writeUInt32LE(pcm.length, 40);
    return Buffer.concat([header, pcm]);
  }
}
