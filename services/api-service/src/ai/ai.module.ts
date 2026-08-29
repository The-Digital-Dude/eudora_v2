import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { ElevenLabsService } from './elevenlabs.service';
import { SpeechService } from './speech.service';

/**
 * Holds the model providers on their own so the modules that use them —
 * narration, the story agent — depend on a capability rather than on a vendor.
 *
 * Callers should take SpeechService, not the two providers behind it: which
 * vendor speaks is a decision this module makes, and swapping one out should
 * not reach the code that only wanted a voice.
 */
@Module({
  providers: [GeminiService, ElevenLabsService, SpeechService],
  exports: [GeminiService, SpeechService],
})
export class AiModule {}
