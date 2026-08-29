import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StoriesService } from './stories.service';
import { PrismaService } from '../prisma/prisma.service';
import { ACTIVE_STORAGE_PROVIDER } from '../uploads/storage.provider';

describe('StoriesService', () => {
  let service: StoriesService;

  const mockPrisma: any = {
    moduleItem: { findUnique: jest.fn() },
    story: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    storyChapter: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    storySegment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    storyAsset: { create: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn((fn: any) => fn(mockPrisma)),
  };

  const mockStorage: any = {
    getSignedUrl: jest.fn().mockResolvedValue('https://signed.example/asset'),
  };

  /** Minimal shape `findOne` needs so the read-back after a write resolves. */
  const emptyStory = {
    id: 'story-1',
    cover: null,
    assets: [],
    chapters: [],
    characters: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoriesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ACTIVE_STORAGE_PROVIDER, useValue: mockStorage },
      ],
    }).compile();

    service = module.get(StoriesService);
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
    mockPrisma.story.findUnique.mockResolvedValue(emptyStory);
  });

  describe('create', () => {
    it('refuses a module item that is not a STORY slot', async () => {
      mockPrisma.moduleItem.findUnique.mockResolvedValue({
        id: 'mi-1',
        kind: 'VIDEO',
        deletedAt: null,
        story: null,
      });

      await expect(
        service.create({ moduleItemId: 'mi-1', title: 'A Story' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.story.create).not.toHaveBeenCalled();
    });

    it('refuses a slot that already holds a story', async () => {
      mockPrisma.moduleItem.findUnique.mockResolvedValue({
        id: 'mi-1',
        kind: 'STORY',
        deletedAt: null,
        story: { id: 'existing' },
      });

      await expect(
        service.create({ moduleItemId: 'mi-1', title: 'A Story' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates against a free STORY slot', async () => {
      mockPrisma.moduleItem.findUnique.mockResolvedValue({
        id: 'mi-1',
        kind: 'STORY',
        deletedAt: null,
        story: null,
      });
      mockPrisma.story.create.mockResolvedValue({ id: 'story-1' });

      await service.create({ moduleItemId: 'mi-1', title: 'A Story' });

      expect(mockPrisma.story.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            moduleItemId: 'mi-1',
            title: 'A Story',
          }),
        }),
      );
    });
  });

  describe('import', () => {
    it('numbers chapters and segments from the document order', async () => {
      mockPrisma.moduleItem.findUnique.mockResolvedValue({
        id: 'mi-1',
        kind: 'STORY',
        deletedAt: null,
        story: null,
      });
      mockPrisma.story.create.mockResolvedValue({ id: 'story-1' });
      mockPrisma.storyChapter.create
        .mockResolvedValueOnce({ id: 'ch-1' })
        .mockResolvedValueOnce({ id: 'ch-2' });

      await service.import({
        moduleItemId: 'mi-1',
        title: 'Bramble and the Bridge',
        chapters: [
          {
            title: 'One',
            segments: [
              { text: 'First beat.' },
              { text: 'Second beat.', narrationText: '[excited] Second beat.' },
            ],
          },
          { title: 'Two', segments: [{ text: 'Third beat.' }] },
        ],
      });

      const chapterOrders = mockPrisma.storyChapter.create.mock.calls.map(
        (c: any) => c[0].data.sortOrder,
      );
      expect(chapterOrders).toEqual([1, 2]);

      const segmentCalls = mockPrisma.storySegment.create.mock.calls.map(
        (c: any) => [c[0].data.chapterId, c[0].data.sortOrder],
      );
      // Positions restart per chapter — they are unique per chapter, not
      // per story.
      expect(segmentCalls).toEqual([
        ['ch-1', 1],
        ['ch-1', 2],
        ['ch-2', 1],
      ]);
    });

    it('stores the performed narration alongside the words', async () => {
      mockPrisma.moduleItem.findUnique.mockResolvedValue({
        id: 'mi-1',
        kind: 'STORY',
        deletedAt: null,
        story: null,
      });
      mockPrisma.story.create.mockResolvedValue({ id: 'story-1' });
      mockPrisma.storyChapter.create.mockResolvedValue({ id: 'ch-1' });

      await service.import({
        moduleItemId: 'mi-1',
        title: 'A Story',
        chapters: [
          {
            title: 'One',
            segments: [
              { text: 'She jumped.', narrationText: '[excited] She jumped.' },
              { text: 'She landed.' },
            ],
          },
        ],
      });

      const written = mockPrisma.storySegment.create.mock.calls.map(
        (c: any) => [c[0].data.text, c[0].data.narrationText],
      );
      // Null rather than a copy of the text: the narrator only pays for the
      // slower expressive model where there is something to perform.
      expect(written).toEqual([
        ['She jumped.', '[excited] She jumped.'],
        ['She landed.', null],
      ]);
    });
  });

  describe('updateSegment', () => {
    const segment = {
      id: 'seg-1',
      chapterId: 'ch-1',
      sortOrder: 1,
      text: 'The bridge was old.',
      chapter: { storyId: 'story-1' },
    };

    it('drops generated narration when the words change', async () => {
      mockPrisma.storySegment.findUnique.mockResolvedValue(segment);

      await service.updateSegment('seg-1', { text: 'The bridge was ancient.' });

      const { data } = mockPrisma.storySegment.update.mock.calls[0][0];
      // Stale audio saying something the page no longer says is worse than
      // no audio.
      expect(data.narrationAudioKey).toBeNull();
      expect(data.narrationDurationMs).toBeNull();
    });

    it('keeps narration when only the position changes', async () => {
      mockPrisma.storySegment.findUnique.mockResolvedValue(segment);
      mockPrisma.storySegment.findFirst.mockResolvedValue(null);

      await service.updateSegment('seg-1', { sortOrder: 3 });

      const { data } = mockPrisma.storySegment.update.mock.calls[0][0];
      expect('narrationAudioKey' in data).toBe(false);
    });

    it('rejects a position already taken in that chapter', async () => {
      mockPrisma.storySegment.findUnique.mockResolvedValue(segment);
      mockPrisma.storySegment.findFirst.mockResolvedValue({ id: 'other' });

      await expect(
        service.updateSegment('seg-1', { sortOrder: 2 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reorderChapters', () => {
    it('moves through negative positions so the unique index never collides', async () => {
      mockPrisma.storyChapter.findMany.mockResolvedValue([
        { id: 'a' },
        { id: 'b' },
      ]);

      await service.reorderChapters('story-1', { ids: ['b', 'a'] });

      const orders = mockPrisma.storyChapter.update.mock.calls.map(
        (c: any) => c[0].data.sortOrder,
      );
      // Every row is parked out of range before any takes its final slot;
      // a straight 1..n rewrite would collide mid-swap.
      expect(orders).toEqual([-1, -2, 1, 2]);
    });

    it('refuses a partial list, which would leave gaps', async () => {
      mockPrisma.storyChapter.findMany.mockResolvedValue([
        { id: 'a' },
        { id: 'b' },
      ]);

      await expect(
        service.reorderChapters('story-1', { ids: ['a'] }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.storyChapter.update).not.toHaveBeenCalled();
    });
  });

  describe('addAsset', () => {
    it('refuses to bind an asset to a segment in a different story', async () => {
      mockPrisma.storySegment.findUnique.mockResolvedValue({
        id: 'seg-9',
        chapter: { storyId: 'other-story' },
      });

      await expect(
        service.addAsset('story-1', {
          storageKey: 'k',
          altText: 'a bridge',
          segmentId: 'seg-9',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    const illustrated = {
      ...emptyStory,
      cover: { id: 'a1', storageKey: 'covers/one.png' },
      assets: [{ id: 'a1', storageKey: 'covers/one.png' }],
      chapters: [
        {
          id: 'ch-1',
          segments: [
            {
              id: 's1',
              narrationAudioKey: 'story-narration/s1.mp3',
              assets: [{ id: 'a2', storageKey: 'art/two.png' }],
            },
            { id: 's2', narrationAudioKey: null, assets: [] },
          ],
        },
      ],
    };

    it('points media at this API rather than at the storage backend', async () => {
      mockPrisma.story.findUnique.mockResolvedValue(illustrated);

      const story: any = await service.findOne('story-1');

      expect(story.cover.url).toBe('/api/stories/assets/a1/file');
      expect(story.chapters[0].segments[0].assets[0].url).toBe(
        '/api/stories/assets/a2/file',
      );
      // The regression this guards: signing here raised a 500 for every story
      // with artwork, because local disk — the only working backend — throws
      // from getSignedUrl by design rather than returning a URL.
      expect(mockStorage.getSignedUrl).not.toHaveBeenCalled();
    });

    it('points media at the demo routes when asked to', async () => {
      mockPrisma.story.findUnique.mockResolvedValue(illustrated);

      const story: any = await service.findOne('story-1', '/api/stories/demo');

      // The public demo serves the same story through unauthenticated routes.
      // Handing a visitor the authenticated URLs makes every play button 401.
      expect(story.cover.url).toBe('/api/stories/demo/assets/a1/file');
      expect(story.chapters[0].segments[0].narrationUrl).toBe(
        '/api/stories/demo/segments/s1/narration',
      );
    });

    it('offers a narration URL only where narration exists', async () => {
      mockPrisma.story.findUnique.mockResolvedValue(illustrated);

      const story: any = await service.findOne('story-1');
      const [narrated, silent] = story.chapters[0].segments;

      expect(narrated.narrationUrl).toBe('/api/stories/segments/s1/narration');
      // Null, not a URL that would 404 — the reader uses this to decide
      // whether to show a play button at all.
      expect(silent.narrationUrl).toBeNull();
    });

    it('throws when the story does not exist', async () => {
      mockPrisma.story.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
    });
  });
});
