import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GeminiService } from '../ai/gemini.service';
import { narrationMatchesText, stripNarrationTags } from './narration-text';

/**
 * Turns pasted prose into a story someone can review, edit and narrate.
 *
 * This exists because the alternative is asking an author to hand-split a story
 * into a JSON array of segments and hand-place emotion tags, which is the sort
 * of task that stops a story library from ever reaching a second story.
 *
 * Nothing here is written to the database. The model proposes a structure, the
 * author corrects it, and only then is it imported — because a model splitting
 * someone's writing at the wrong beat is a normal outcome, not an error, and
 * the fix is a person looking at it rather than a better prompt.
 */

/** Kept small: a child's page is a sentence or two, not a paragraph. */
const MAX_SOURCE_CHARS = 20_000;

export interface DraftSegment {
  text: string;
  /** The same words with emotion markup, or null if plain delivery suits. */
  narrationText: string | null;
}

export interface DraftChapter {
  title: string;
  segments: DraftSegment[];
}

export interface StoryDraft {
  title: string;
  synopsis: string;
  characters: { name: string; description: string }[];
  chapters: DraftChapter[];
  /**
   * Segments where the model's tagged version did not strip back to the plain
   * text, and was therefore discarded. Surfaced rather than hidden so the
   * author knows those lines will be read flat.
   */
  droppedNarrationCount: number;
}

@Injectable()
export class StoryDraftService {
  private readonly logger = new Logger(StoryDraftService.name);

  constructor(private readonly gemini: GeminiService) {}

  async draftFromProse(params: {
    source: string;
    title?: string;
  }): Promise<StoryDraft> {
    const source = params.source.trim();
    if (!source) {
      throw new BadRequestException('Paste a story first');
    }
    if (source.length > MAX_SOURCE_CHARS) {
      throw new BadRequestException(
        `That story is longer than this can handle (${MAX_SOURCE_CHARS} characters)`,
      );
    }

    const raw = await this.gemini.converse({
      systemInstruction: this.instruction(),
      userText: params.title
        ? `TITLE: ${params.title}\n\nSTORY:\n${source}`
        : `STORY:\n${source}`,
      /**
       * The reply restates the whole story twice — plain and performed — inside
       * JSON, on top of the model's own reasoning. Budgeting from the source
       * length rather than a fixed number keeps a long story from truncating
       * mid-object, which surfaces only as a parse failure.
       */
      maxOutputTokens: Math.min(60_000, 4_000 + source.length),
    });

    return this.parse(raw, params.title);
  }

  private instruction(): string {
    return [
      'You prepare children’s stories for narration. You are given prose and you',
      'return JSON. Return JSON only — no prose around it, no code fences.',
      '',
      'Shape:',
      '{"title":string,"synopsis":string,',
      ' "characters":[{"name":string,"description":string}],',
      ' "chapters":[{"title":string,"segments":[{"text":string,"narrationText":string|null}]}]}',
      '',
      'RULES:',
      '1. `text` must be taken VERBATIM from the story. Do not rewrite, shorten,',
      '   modernise, correct or improve a single word. Concatenating every `text`',
      '   in order must reproduce the original story exactly.',
      '2. Split into segments at natural read-aloud beats — usually one or two',
      '   sentences, the amount an adult reads before glancing up at the child.',
      '   A segment is a page: it should be one image, one moment.',
      '3. Group segments into chapters at real turns in the story, and give each',
      '   chapter a short title. One chapter is fine for a short story.',
      '4. `narrationText` is `text` with emotion markup added for the narrator,',
      '   e.g. "[nervously] She looked at the puddle." Use it where the delivery',
      '   should change; use null where plain reading is right. Do not overuse it.',
      '   Removing every [tag] from `narrationText` must leave `text` EXACTLY —',
      '   same words, same punctuation. Add tags; change nothing else.',
      '5. Useful tags: [excited] [nervously] [sadly] [whispers] [laughs]',
      '   [curious] [gently] [proudly]. Place them before the words they affect.',
      '6. `synopsis` is one or two lines for a card. `characters` lists only those',
      '   who actually appear.',
    ].join('\n');
  }

  /**
   * Models wrap JSON in prose or fences no matter how firmly asked not to, so
   * the outermost braces are extracted rather than trusting the whole reply.
   */
  private parse(raw: string, fallbackTitle?: string): StoryDraft {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end <= start) {
      this.logger.error(
        `Draft reply contained no JSON object: ${raw.slice(0, 200)}`,
      );
      throw new ServiceUnavailableException(
        'The story could not be prepared — try again.',
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw.slice(start, end + 1));
    } catch {
      this.logger.error(`Draft reply was not valid JSON: ${raw.slice(0, 200)}`);
      throw new ServiceUnavailableException(
        'The story could not be prepared — try again.',
      );
    }

    let dropped = 0;
    const chapters: DraftChapter[] = (parsed.chapters ?? [])
      .map((chapter: any, index: number) => ({
        title: String(chapter?.title ?? `Chapter ${index + 1}`).trim(),
        segments: (chapter?.segments ?? [])
          .map((segment: any) => {
            const text = String(segment?.text ?? '').trim();
            if (!text) return null;

            const tagged =
              typeof segment?.narrationText === 'string'
                ? segment.narrationText.trim()
                : '';

            // The model is asked to add tags and change nothing else. When it
            // does change something, the performed version is dropped rather
            // than corrected: a silently reworded line is exactly the failure
            // the strip-and-compare rule exists to catch, and the segment still
            // reads correctly without it.
            if (tagged && !narrationMatchesText(tagged, text)) {
              dropped++;
              return { text, narrationText: null };
            }
            // Tags that strip to nothing new are noise; keep only real markup.
            const isPlain =
              !tagged || stripNarrationTags(tagged).display === tagged;
            return { text, narrationText: isPlain ? null : tagged };
          })
          .filter(Boolean) as DraftSegment[],
      }))
      .filter((chapter: DraftChapter) => chapter.segments.length > 0);

    if (chapters.length === 0) {
      throw new ServiceUnavailableException(
        'The story could not be split into pages — try again.',
      );
    }

    return {
      title: String(parsed.title ?? fallbackTitle ?? 'Untitled story').trim(),
      synopsis: String(parsed.synopsis ?? '').trim(),
      characters: (parsed.characters ?? [])
        .map((c: any) => ({
          name: String(c?.name ?? '').trim(),
          description: String(c?.description ?? '').trim(),
        }))
        .filter((c: { name: string }) => c.name),
      chapters,
      droppedNarrationCount: dropped,
    };
  }
}
