import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { ImportChapterDto, ImportStoryDto } from './story.dto';

/**
 * Exercises the DTO through the same transform-then-validate path the global
 * ValidationPipe runs, because the coercion under test lives in a @Transform
 * and never executes when a service is called directly in a unit test.
 */
function build(payload: unknown) {
  // Options match the global ValidationPipe in main.ts exactly. Notably NOT
  // enableImplicitConversion: it replaces the segments transform output with
  // an empty array, so a test using it would pass while the real pipe worked
  // and vice versa.
  const dto = plainToInstance(ImportStoryDto, payload);
  return { dto, errors: validateSync(dto, { whitelist: true }) };
}

const base = {
  moduleItemId: '3f1e2d4c-5b6a-4c8d-9e0f-1a2b3c4d5e6f',
  title: 'A Story',
};

describe('ImportStoryDto segments', () => {
  it('accepts the fuller shape, keeping the performed narration', () => {
    const { dto, errors } = build({
      ...base,
      chapters: [
        {
          title: 'One',
          segments: [
            { text: 'She jumped.', narrationText: '[excited] She jumped.' },
          ],
        },
      ],
    });

    expect(errors).toHaveLength(0);
    expect(dto.chapters[0].segments[0].narrationText).toBe(
      '[excited] She jumped.',
    );
  });

  it('still accepts a bare string per segment', () => {
    // The shape that predates emotion markup. Breaking it would break every
    // story imported by script before this field existed.
    const { dto, errors } = build({
      ...base,
      chapters: [{ title: 'One', segments: ['She jumped.', 'She landed.'] }],
    });

    expect(errors).toHaveLength(0);
    expect(dto.chapters[0].segments).toEqual([
      { text: 'She jumped.' },
      { text: 'She landed.' },
    ]);
  });

  it('rejects a segment with no words', () => {
    const { errors } = build({
      ...base,
      chapters: [{ title: 'One', segments: [{ narrationText: '[sad]' }] }],
    });

    expect(errors.length).toBeGreaterThan(0);
  });

  it('leaves a non-array segments value for the validator to reject', () => {
    const chapter = plainToInstance(ImportChapterDto, {
      title: 'One',
      segments: 'not an array',
    });
    expect(validateSync(chapter).length).toBeGreaterThan(0);
  });
});
