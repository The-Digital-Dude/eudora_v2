import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ACTIVE_STORAGE_PROVIDER } from '../uploads/storage.provider';
// `import type` because it is an interface referenced in a decorated
// constructor: with emitDecoratorMetadata a value import would emit a runtime
// reference to something that does not exist after compilation.
import type { StorageProvider } from '../uploads/storage.provider';
import {
  CreateAssetDto,
  CreateChapterDto,
  CreateCharacterDto,
  CreateSegmentDto,
  CreateStoryDto,
  ImportStoryDto,
  ReorderDto,
  UpdateChapterDto,
  UpdateSegmentDto,
  UpdateStoryDto,
} from './dto/story.dto';

/** Long enough to read a story through without a refetch mid-chapter. */
const ASSET_URL_TTL_SECONDS = 60 * 60;

/**
 * Authoring and reading for interactive stories.
 *
 * Deliberately no narration and no voice agent yet — a story is fully
 * authorable, readable and illustrated without either, and having the content
 * model settled first is what keeps the audio work from also being a schema
 * negotiation.
 */
@Injectable()
export class StoriesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ACTIVE_STORAGE_PROVIDER)
    private readonly storage: StorageProvider,
  ) {}

  private readonly detailInclude = {
    characters: { orderBy: { sortOrder: 'asc' as const } },
    chapters: {
      orderBy: { sortOrder: 'asc' as const },
      include: {
        segments: {
          orderBy: { sortOrder: 'asc' as const },
          include: { assets: { orderBy: { sortOrder: 'asc' as const } } },
        },
      },
    },
    assets: { orderBy: { sortOrder: 'asc' as const } },
    cover: true,
  };

  // ─── Story ────────────────────────────────────────────────────────────────

  async create(dto: CreateStoryDto) {
    const item = await this.prisma.moduleItem.findUnique({
      where: { id: dto.moduleItemId },
      include: { story: true },
    });
    if (!item || item.deletedAt) {
      throw new NotFoundException('Module item not found');
    }
    // The slot has to actually be a story slot, or the catalog would render it
    // as whatever kind it claims to be and never reach this content.
    if (item.kind !== 'STORY') {
      throw new BadRequestException(
        `Module item is a ${item.kind} item; a story can only fill a STORY item`,
      );
    }
    if (item.story) {
      throw new BadRequestException('That module item already has a story');
    }

    const story = await this.prisma.story.create({
      data: {
        moduleItemId: dto.moduleItemId,
        title: dto.title,
        synopsis: dto.synopsis ?? null,
        gradeBand: dto.gradeBand ?? null,
        agentGuidance: dto.agentGuidance ?? null,
      },
    });
    return this.findOne(story.id);
  }

  /** Whole story in one call, for authoring from a document. */
  async import(dto: ImportStoryDto) {
    const created = await this.create({
      moduleItemId: dto.moduleItemId,
      title: dto.title,
      synopsis: dto.synopsis,
      gradeBand: dto.gradeBand,
      agentGuidance: dto.agentGuidance,
    });

    await this.prisma.$transaction(async (tx) => {
      for (const [ci, chapter] of dto.chapters.entries()) {
        const row = await tx.storyChapter.create({
          data: {
            storyId: created.id,
            title: chapter.title,
            sortOrder: ci + 1,
          },
        });
        for (const [si, text] of chapter.segments.entries()) {
          await tx.storySegment.create({
            data: { chapterId: row.id, text, sortOrder: si + 1 },
          });
        }
      }
      for (const [i, character] of (dto.characters ?? []).entries()) {
        await tx.storyCharacter.create({
          data: {
            storyId: created.id,
            name: character.name,
            description: character.description ?? null,
            sortOrder: character.sortOrder ?? i + 1,
          },
        });
      }
    });

    return this.findOne(created.id);
  }

  async findOne(id: string) {
    const story = await this.prisma.story.findUnique({
      where: { id },
      include: this.detailInclude,
    });
    if (!story) throw new NotFoundException('Story not found');
    return this.withSignedAssetUrls(story);
  }

  async findByModuleItem(moduleItemId: string) {
    const story = await this.prisma.story.findUnique({
      where: { moduleItemId },
      include: this.detailInclude,
    });
    if (!story) throw new NotFoundException('Story not found');
    return this.withSignedAssetUrls(story);
  }

  async update(id: string, dto: UpdateStoryDto) {
    await this.requireStory(id);

    if (dto.coverAssetId) {
      const asset = await this.prisma.storyAsset.findUnique({
        where: { id: dto.coverAssetId },
      });
      if (!asset || asset.storyId !== id) {
        throw new BadRequestException(
          'Cover must be an asset belonging to this story',
        );
      }
    }

    await this.prisma.story.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.synopsis !== undefined ? { synopsis: dto.synopsis } : {}),
        ...(dto.gradeBand !== undefined ? { gradeBand: dto.gradeBand } : {}),
        ...(dto.agentGuidance !== undefined
          ? { agentGuidance: dto.agentGuidance }
          : {}),
        ...(dto.coverAssetId !== undefined
          ? { coverAssetId: dto.coverAssetId }
          : {}),
      },
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.requireStory(id);
    await this.prisma.story.delete({ where: { id } });
    return { message: 'Story deleted' };
  }

  // ─── Chapters ─────────────────────────────────────────────────────────────

  async addChapter(storyId: string, dto: CreateChapterDto) {
    await this.requireStory(storyId);
    const sortOrder = dto.sortOrder ?? (await this.nextChapterOrder(storyId));
    await this.assertChapterOrderFree(storyId, sortOrder);

    await this.prisma.storyChapter.create({
      data: { storyId, title: dto.title, sortOrder },
    });
    return this.findOne(storyId);
  }

  async updateChapter(chapterId: string, dto: UpdateChapterDto) {
    const chapter = await this.prisma.storyChapter.findUnique({
      where: { id: chapterId },
    });
    if (!chapter) throw new NotFoundException('Chapter not found');

    if (dto.sortOrder !== undefined && dto.sortOrder !== chapter.sortOrder) {
      await this.assertChapterOrderFree(chapter.storyId, dto.sortOrder);
    }

    await this.prisma.storyChapter.update({
      where: { id: chapterId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
    return this.findOne(chapter.storyId);
  }

  async removeChapter(chapterId: string) {
    const chapter = await this.prisma.storyChapter.findUnique({
      where: { id: chapterId },
    });
    if (!chapter) throw new NotFoundException('Chapter not found');
    await this.prisma.storyChapter.delete({ where: { id: chapterId } });
    return this.findOne(chapter.storyId);
  }

  /**
   * Reorders in one transaction, via a temporary negative window.
   *
   * `@@unique([storyId, sortOrder])` means a straight 1..n rewrite collides the
   * moment two rows briefly share a position, which any non-trivial reorder
   * does. Moving everything out of the positive range first sidesteps that
   * without dropping the constraint that keeps ordering meaningful.
   */
  async reorderChapters(storyId: string, dto: ReorderDto) {
    const chapters = await this.prisma.storyChapter.findMany({
      where: { storyId },
      select: { id: true },
    });
    this.assertSameSet(
      chapters.map((c) => c.id),
      dto.ids,
      'chapters',
    );

    await this.prisma.$transaction(async (tx) => {
      for (const [i, id] of dto.ids.entries()) {
        await tx.storyChapter.update({
          where: { id },
          data: { sortOrder: -(i + 1) },
        });
      }
      for (const [i, id] of dto.ids.entries()) {
        await tx.storyChapter.update({
          where: { id },
          data: { sortOrder: i + 1 },
        });
      }
    });
    return this.findOne(storyId);
  }

  // ─── Segments ─────────────────────────────────────────────────────────────

  async addSegment(chapterId: string, dto: CreateSegmentDto) {
    const chapter = await this.prisma.storyChapter.findUnique({
      where: { id: chapterId },
    });
    if (!chapter) throw new NotFoundException('Chapter not found');

    const sortOrder = dto.sortOrder ?? (await this.nextSegmentOrder(chapterId));
    await this.assertSegmentOrderFree(chapterId, sortOrder);

    await this.prisma.storySegment.create({
      data: { chapterId, text: dto.text, sortOrder },
    });
    return this.findOne(chapter.storyId);
  }

  async updateSegment(segmentId: string, dto: UpdateSegmentDto) {
    const segment = await this.prisma.storySegment.findUnique({
      where: { id: segmentId },
      include: { chapter: true },
    });
    if (!segment) throw new NotFoundException('Segment not found');

    if (dto.sortOrder !== undefined && dto.sortOrder !== segment.sortOrder) {
      await this.assertSegmentOrderFree(segment.chapterId, dto.sortOrder);
    }

    // Editing the words invalidates any narration generated from them. Clearing
    // it is the honest move: stale audio saying something the page no longer
    // says is worse than no audio at all.
    const textChanged = dto.text !== undefined && dto.text !== segment.text;

    await this.prisma.storySegment.update({
      where: { id: segmentId },
      data: {
        ...(dto.text !== undefined ? { text: dto.text } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(textChanged
          ? { narrationAudioKey: null, narrationDurationMs: null }
          : {}),
      },
    });
    return this.findOne(segment.chapter.storyId);
  }

  async removeSegment(segmentId: string) {
    const segment = await this.prisma.storySegment.findUnique({
      where: { id: segmentId },
      include: { chapter: true },
    });
    if (!segment) throw new NotFoundException('Segment not found');
    await this.prisma.storySegment.delete({ where: { id: segmentId } });
    return this.findOne(segment.chapter.storyId);
  }

  async reorderSegments(chapterId: string, dto: ReorderDto) {
    const chapter = await this.prisma.storyChapter.findUnique({
      where: { id: chapterId },
      include: { segments: { select: { id: true } } },
    });
    if (!chapter) throw new NotFoundException('Chapter not found');
    this.assertSameSet(
      chapter.segments.map((s) => s.id),
      dto.ids,
      'segments',
    );

    await this.prisma.$transaction(async (tx) => {
      for (const [i, id] of dto.ids.entries()) {
        await tx.storySegment.update({
          where: { id },
          data: { sortOrder: -(i + 1) },
        });
      }
      for (const [i, id] of dto.ids.entries()) {
        await tx.storySegment.update({
          where: { id },
          data: { sortOrder: i + 1 },
        });
      }
    });
    return this.findOne(chapter.storyId);
  }

  // ─── Assets & characters ──────────────────────────────────────────────────

  async addAsset(storyId: string, dto: CreateAssetDto) {
    await this.requireStory(storyId);

    if (dto.segmentId) {
      const segment = await this.prisma.storySegment.findUnique({
        where: { id: dto.segmentId },
        include: { chapter: true },
      });
      if (!segment || segment.chapter.storyId !== storyId) {
        throw new BadRequestException(
          'Segment must belong to the same story as the asset',
        );
      }
    }

    await this.prisma.storyAsset.create({
      data: {
        storyId,
        segmentId: dto.segmentId ?? null,
        kind: dto.kind ?? 'ILLUSTRATION',
        storageKey: dto.storageKey,
        altText: dto.altText,
        sortOrder: dto.sortOrder ?? 1,
      },
    });
    return this.findOne(storyId);
  }

  async removeAsset(assetId: string) {
    const asset = await this.prisma.storyAsset.findUnique({
      where: { id: assetId },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    await this.prisma.storyAsset.delete({ where: { id: assetId } });
    return this.findOne(asset.storyId);
  }

  async addCharacter(storyId: string, dto: CreateCharacterDto) {
    await this.requireStory(storyId);
    await this.prisma.storyCharacter.create({
      data: {
        storyId,
        name: dto.name,
        description: dto.description ?? null,
        sortOrder: dto.sortOrder ?? 1,
      },
    });
    return this.findOne(storyId);
  }

  async removeCharacter(characterId: string) {
    const character = await this.prisma.storyCharacter.findUnique({
      where: { id: characterId },
    });
    if (!character) throw new NotFoundException('Character not found');
    await this.prisma.storyCharacter.delete({ where: { id: characterId } });
    return this.findOne(character.storyId);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async requireStory(id: string) {
    const story = await this.prisma.story.findUnique({ where: { id } });
    if (!story) throw new NotFoundException('Story not found');
    return story;
  }

  private async nextChapterOrder(storyId: string) {
    const last = await this.prisma.storyChapter.findFirst({
      where: { storyId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    return (last?.sortOrder ?? 0) + 1;
  }

  private async nextSegmentOrder(chapterId: string) {
    const last = await this.prisma.storySegment.findFirst({
      where: { chapterId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    return (last?.sortOrder ?? 0) + 1;
  }

  private async assertChapterOrderFree(storyId: string, sortOrder: number) {
    const clash = await this.prisma.storyChapter.findFirst({
      where: { storyId, sortOrder },
      select: { id: true },
    });
    if (clash) {
      throw new BadRequestException(
        `Chapter position ${sortOrder} is taken. Reorder instead of inserting into an occupied slot.`,
      );
    }
  }

  private async assertSegmentOrderFree(chapterId: string, sortOrder: number) {
    const clash = await this.prisma.storySegment.findFirst({
      where: { chapterId, sortOrder },
      select: { id: true },
    });
    if (clash) {
      throw new BadRequestException(
        `Segment position ${sortOrder} is taken. Reorder instead of inserting into an occupied slot.`,
      );
    }
  }

  /** A reorder must name every row exactly once, or it would leave gaps. */
  private assertSameSet(actual: string[], given: string[], label: string) {
    const a = [...actual].sort();
    const b = [...given].sort();
    if (a.length !== b.length || a.some((id, i) => id !== b[i])) {
      throw new BadRequestException(
        `Reorder must list every one of this story's ${label} exactly once`,
      );
    }
  }

  /**
   * Storage keys become signed URLs at read time. They are not stored as URLs
   * because a signed URL expires, so persisting one would rot in the database.
   */
  private async withSignedAssetUrls(story: any) {
    const cache = new Map<string, string>();
    const sign = async (key: string) => {
      const hit = cache.get(key);
      if (hit) return hit;
      const url = await this.storage.getSignedUrl(
        key,
        undefined,
        ASSET_URL_TTL_SECONDS,
      );
      cache.set(key, url);
      return url;
    };

    const decorate = async (asset: any) =>
      asset ? { ...asset, url: await sign(asset.storageKey) } : asset;

    return {
      ...story,
      cover: await decorate(story.cover),
      assets: await Promise.all((story.assets ?? []).map(decorate)),
      chapters: await Promise.all(
        (story.chapters ?? []).map(async (chapter: any) => ({
          ...chapter,
          segments: await Promise.all(
            (chapter.segments ?? []).map(async (segment: any) => ({
              ...segment,
              assets: await Promise.all((segment.assets ?? []).map(decorate)),
            })),
          ),
        })),
      ),
    };
  }
}
