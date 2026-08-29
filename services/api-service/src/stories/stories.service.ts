import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CatalogStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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

/**
 * What a caller needs to know to decide whether someone may read a story.
 *
 * A story reached three ways needs three answers: published means anyone may
 * read it, a course slot means the course's entitlement check decides, and
 * neither means staff only. Returning both facts together keeps that decision
 * in one place instead of scattering "what if it has no module item" through
 * every media route.
 */
export interface StoryAccess {
  id: string;
  status: CatalogStatus;
  moduleItemId: string | null;
}

const STORY_ACCESS_SELECT = {
  id: true,
  status: true,
  moduleItemId: true,
} as const;

/**
 * Authoring and reading for interactive stories.
 *
 * The voice agent lives in StoryAgentService and narration in NarrationService;
 * this file stays responsible for the content itself.
 */
@Injectable()
export class StoriesService {
  constructor(private readonly prisma: PrismaService) {}

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
    // Where the story sits, if anywhere. The editor shows this so an author
    // can see at a glance whether a story is in a course, in the library, both
    // or neither — which are four real states, not a single status.
    moduleItem: { select: { id: true, title: true, status: true } },
  };

  // ─── Story ────────────────────────────────────────────────────────────────

  /**
   * A story can be created with nowhere to live. Attaching it to a course is a
   * separate decision, made later or never — see `attach`.
   */
  async create(dto: CreateStoryDto) {
    if (dto.moduleItemId) {
      await this.assertSlotIsFree(dto.moduleItemId);
    }

    const story = await this.prisma.story.create({
      data: {
        moduleItemId: dto.moduleItemId ?? null,
        title: dto.title,
        synopsis: dto.synopsis ?? null,
        gradeBand: dto.gradeBand ?? null,
        agentGuidance: dto.agentGuidance ?? null,
      },
    });
    return this.findOne(story.id);
  }

  /** Puts an existing story into a course chapter. */
  async attach(storyId: string, moduleItemId: string) {
    await this.requireStory(storyId);
    await this.assertSlotIsFree(moduleItemId, storyId);

    await this.prisma.story.update({
      where: { id: storyId },
      data: { moduleItemId },
    });
    return this.findOne(storyId);
  }

  /**
   * Takes the story back out of its course, leaving the story itself alone.
   *
   * The empty module item is removed with it: a STORY slot with no story is a
   * lesson that renders nothing, and leaving one behind in a live course is a
   * worse outcome than the detach failing.
   */
  async detach(storyId: string) {
    const story = await this.requireStory(storyId);
    if (!story.moduleItemId) {
      throw new BadRequestException('That story is not in a course');
    }

    const moduleItemId = story.moduleItemId;
    await this.prisma.$transaction(async (tx) => {
      await tx.story.update({
        where: { id: storyId },
        data: { moduleItemId: null },
      });
      await tx.moduleItem.delete({ where: { id: moduleItemId } });
    });
    return this.findOne(storyId);
  }

  /**
   * Makes this the story the public demo shows, or takes it off.
   *
   * Exclusive by construction: setting one clears every other. The demo picks
   * its story with `findFirst(... orderBy: updatedAt desc)`, so with two
   * flagged the live one would change whenever somebody edited the other —
   * a badge reading "Public" on a story nobody can reach. One flag, one story.
   */
  async setPublicDemo(storyId: string, isPublicDemo: boolean) {
    await this.requireStory(storyId);

    await this.prisma.$transaction(async (tx) => {
      if (isPublicDemo) {
        await tx.story.updateMany({
          where: { isPublicDemo: true, id: { not: storyId } },
          data: { isPublicDemo: false },
        });
      }
      await tx.story.update({
        where: { id: storyId },
        data: { isPublicDemo },
      });
    });

    return this.findOne(storyId);
  }

  /** Whether students can find this story on its own. */
  async setStatus(storyId: string, status: CatalogStatus) {
    await this.requireStory(storyId);
    await this.prisma.story.update({
      where: { id: storyId },
      data: { status },
    });
    return this.findOne(storyId);
  }

  private async assertSlotIsFree(moduleItemId: string, movingStoryId?: string) {
    const item = await this.prisma.moduleItem.findUnique({
      where: { id: moduleItemId },
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
    if (item.story && item.story.id !== movingStoryId) {
      throw new BadRequestException('That module item already has a story');
    }
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
        for (const [si, segment] of chapter.segments.entries()) {
          await tx.storySegment.create({
            data: {
              chapterId: row.id,
              text: segment.text,
              narrationText: segment.narrationText ?? null,
              sortOrder: si + 1,
            },
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

  /**
   * Every story, for the authoring list.
   *
   * Returns counts rather than the chapters themselves: the list needs to say
   * how much is written and how much is narrated, and pulling every segment of
   * every story to count them in memory would grow with the library.
   */
  async findAll() {
    const stories = await this.prisma.story.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        moduleItem: { select: { id: true, title: true, status: true } },
        chapters: {
          select: {
            segments: { select: { narrationAudioKey: true } },
          },
        },
      },
    });

    return stories.map((story) => {
      const segments = story.chapters.flatMap((chapter) => chapter.segments);
      return {
        id: story.id,
        title: story.title,
        synopsis: story.synopsis,
        gradeBand: story.gradeBand,
        isPublicDemo: story.isPublicDemo,
        status: story.status,
        updatedAt: story.updatedAt,
        moduleItem: story.moduleItem,
        chapterCount: story.chapters.length,
        segmentCount: segments.length,
        narratedCount: segments.filter((s) => s.narrationAudioKey).length,
      };
    });
  }

  /**
   * The story library: everything published, whether or not it also sits in a
   * course. No entitlement check — published means free to read, which is the
   * whole point of having a library separate from the catalogue.
   *
   * Only narrated stories appear. A published story with no audio is a page of
   * text where a child expected a voice, and the fix is to narrate it rather
   * than to show it half-finished.
   */
  async findPublished() {
    const stories = await this.prisma.story.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { updatedAt: 'desc' },
      include: {
        cover: true,
        chapters: {
          select: { segments: { select: { narrationAudioKey: true } } },
        },
      },
    });

    return stories
      .map((story) => {
        const segments = story.chapters.flatMap((c) => c.segments);
        return {
          id: story.id,
          title: story.title,
          synopsis: story.synopsis,
          gradeBand: story.gradeBand,
          // The same media route the reader uses; its gate lets published
          // stories through without an entitlement, so a library card renders
          // for a child who owns no courses at all.
          coverUrl: story.cover
            ? `/api/stories/assets/${story.cover.id}/file`
            : null,
          pageCount: segments.length,
          narrated:
            segments.length > 0 && segments.every((s) => s.narrationAudioKey),
        };
      })
      .filter((story) => story.narrated);
  }

  /**
   * `mediaBase` decides which route family the returned media URLs point at.
   * The public demo serves the same story through its own unauthenticated
   * endpoints, and handing a visitor the authenticated URLs means every play
   * button 401s.
   */
  async findOne(id: string, mediaBase?: string) {
    const story = await this.prisma.story.findUnique({
      where: { id },
      include: this.detailInclude,
    });
    if (!story) throw new NotFoundException('Story not found');
    return this.withMediaUrls(story, mediaBase);
  }

  async findByModuleItem(moduleItemId: string) {
    const story = await this.prisma.story.findUnique({
      where: { moduleItemId },
      include: this.detailInclude,
    });
    if (!story) throw new NotFoundException('Story not found');
    return this.withMediaUrls(story);
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
    const narrationTextChanged =
      dto.narrationText !== undefined &&
      (dto.narrationText || null) !== segment.narrationText;

    await this.prisma.storySegment.update({
      where: { id: segmentId },
      data: {
        ...(dto.text !== undefined ? { text: dto.text } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.narrationText !== undefined
          ? { narrationText: dto.narrationText || null }
          : {}),
        // Rewriting the words also discards the performed version, which was
        // markup over the old words and would now be refused at narration time
        // for not matching. Better to drop it than to leave the author holding
        // a line that cannot be narrated until they notice why.
        ...(textChanged && dto.narrationText === undefined
          ? { narrationText: null }
          : {}),
        // Changing either the words or their delivery makes existing audio
        // stale, and stale audio saying something the page does not is worse
        // than no audio at all.
        ...(textChanged || narrationTextChanged
          ? {
              narrationAudioKey: null,
              narrationDurationMs: null,
              narrationTimings: Prisma.DbNull,
            }
          : {}),
      },
    });
    return this.findOne(segment.chapter.storyId);
  }

  /**
   * Joins a section into the one before it, and closes the gap.
   *
   * The primitive that fixes a story chunked too finely — the common case
   * being one drafted before sections replaced sentences. Doing it from the
   * client would be three round trips racing the unique index on
   * (chapterId, sortOrder); here it is one transaction.
   *
   * Only within a chapter. Merging across a chapter boundary would silently
   * decide which chapter the text now belongs to, and that is an editorial
   * call, not a mechanical one.
   */
  async mergeSegmentUp(segmentId: string) {
    const segment = await this.prisma.storySegment.findUnique({
      where: { id: segmentId },
      include: { chapter: true },
    });
    if (!segment) throw new NotFoundException('Segment not found');

    const previous = await this.prisma.storySegment.findFirst({
      where: {
        chapterId: segment.chapterId,
        sortOrder: { lt: segment.sortOrder },
      },
      orderBy: { sortOrder: 'desc' },
    });
    if (!previous) {
      throw new BadRequestException(
        'This is the first section in its chapter — there is nothing above it to join',
      );
    }

    const joinedText = `${previous.text.trim()} ${segment.text.trim()}`.trim();
    // The performed versions join only if both have one; otherwise the result
    // would be half-tagged markup that no longer strips back to the text, and
    // narration would refuse it. Dropping to plain is recoverable; a broken
    // pair is a puzzle for whoever hits it.
    const joinedNarration =
      previous.narrationText && segment.narrationText
        ? `${previous.narrationText.trim()} ${segment.narrationText.trim()}`.trim()
        : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.storySegment.delete({ where: { id: segmentId } });
      await tx.storySegment.update({
        where: { id: previous.id },
        data: {
          text: joinedText,
          narrationText: joinedNarration,
          // Different words mean the recording no longer matches.
          narrationAudioKey: null,
          narrationDurationMs: null,
          narrationTimings: Prisma.DbNull,
        },
      });
      await this.closeSegmentGaps(tx, segment.chapterId);
    });

    return this.findOne(segment.chapter.storyId);
  }

  /**
   * Breaks one section in two at `at`, a character offset into its text.
   *
   * The inverse of merge, for a section that turned out to hold two scenes.
   * Everything below shifts down inside the transaction, so the unique index
   * never sees two rows claiming a position.
   */
  async splitSegment(segmentId: string, at: number) {
    const segment = await this.prisma.storySegment.findUnique({
      where: { id: segmentId },
      include: { chapter: true },
    });
    if (!segment) throw new NotFoundException('Segment not found');

    const head = segment.text.slice(0, at).trim();
    const tail = segment.text.slice(at).trim();
    if (!head || !tail) {
      throw new BadRequestException(
        'Split somewhere inside the text — both halves need words',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Move everything after this section down one, working from the bottom
      // up so no two rows ever share a position.
      const below = await tx.storySegment.findMany({
        where: {
          chapterId: segment.chapterId,
          sortOrder: { gt: segment.sortOrder },
        },
        orderBy: { sortOrder: 'desc' },
        select: { id: true, sortOrder: true },
      });
      for (const row of below) {
        await tx.storySegment.update({
          where: { id: row.id },
          data: { sortOrder: row.sortOrder + 1 },
        });
      }

      await tx.storySegment.update({
        where: { id: segmentId },
        data: {
          text: head,
          // Splitting tagged narration would cut markup in half, so both
          // halves start plain and are re-tagged by the author.
          narrationText: null,
          narrationAudioKey: null,
          narrationDurationMs: null,
          narrationTimings: Prisma.DbNull,
        },
      });
      await tx.storySegment.create({
        data: {
          chapterId: segment.chapterId,
          text: tail,
          sortOrder: segment.sortOrder + 1,
        },
      });
    });

    return this.findOne(segment.chapter.storyId);
  }

  /** Renumbers a chapter's sections to 1..n, preserving their order. */
  private async closeSegmentGaps(tx: any, chapterId: string) {
    const rows = await tx.storySegment.findMany({
      where: { chapterId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true },
    });
    // Through a negative window first: a straight 1..n rewrite collides the
    // moment two rows briefly share a position, which is the same reason
    // reorderSegments does this.
    for (const [i, row] of rows.entries()) {
      await tx.storySegment.update({
        where: { id: row.id },
        data: { sortOrder: -(i + 1) },
      });
    }
    for (const [i, row] of rows.entries()) {
      await tx.storySegment.update({
        where: { id: row.id },
        data: { sortOrder: i + 1 },
      });
    }
  }

  async removeSegment(segmentId: string) {
    const segment = await this.prisma.storySegment.findUnique({
      where: { id: segmentId },
      include: { chapter: true },
    });
    if (!segment) throw new NotFoundException('Segment not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.storySegment.delete({ where: { id: segmentId } });
      // Otherwise positions keep the hole, and the next insert-at-position
      // has to reason about gaps that mean nothing.
      await this.closeSegmentGaps(tx, segment.chapterId);
    });

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

  // ─── Ownership lookups ────────────────────────────────────────────────────
  //
  // Media and agent routes are reached by segment, asset or story id, but the
  // entitlement check is expressed in terms of the module item that owns them.
  // These walk back up to it so the gate has something to check.

  async accessForStory(storyId: string): Promise<StoryAccess> {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      select: STORY_ACCESS_SELECT,
    });
    if (!story) throw new NotFoundException('Story not found');
    return story;
  }

  async accessForSegment(segmentId: string): Promise<StoryAccess> {
    const segment = await this.prisma.storySegment.findUnique({
      where: { id: segmentId },
      select: {
        chapter: { select: { story: { select: STORY_ACCESS_SELECT } } },
      },
    });
    if (!segment) throw new NotFoundException('Segment not found');
    return segment.chapter.story;
  }

  async accessForAsset(assetId: string): Promise<StoryAccess> {
    const asset = await this.prisma.storyAsset.findUnique({
      where: { id: assetId },
      select: { story: { select: STORY_ACCESS_SELECT } },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset.story;
  }

  /**
   * Storage keys become URLs pointing back at this API rather than at the
   * storage backend, and the endpoints behind them either stream the bytes or
   * redirect to a signed URL depending on which backend is active.
   *
   * This used to sign the keys here instead. That was wrong in the one way that
   * mattered: LocalStorageService.getSignedUrl throws on purpose — signing is
   * meaningless on a local disk — so reading any story that had so much as a
   * cover image raised a 500 under the only storage backend that currently
   * works. Routing through our own endpoints also means the client has a single
   * shape to handle, and no URL that expires while a child is mid-chapter.
   */
  private withMediaUrls(story: any, base = '/api/stories') {
    const decorate = (asset: any) =>
      asset ? { ...asset, url: `${base}/assets/${asset.id}/file` } : asset;

    return {
      ...story,
      cover: decorate(story.cover),
      assets: (story.assets ?? []).map(decorate),
      chapters: (story.chapters ?? []).map((chapter: any) => ({
        ...chapter,
        segments: (chapter.segments ?? []).map((segment: any) => ({
          ...segment,
          assets: (segment.assets ?? []).map(decorate),
          // Null rather than a dead link when narration has not been generated
          // — the reader uses this to decide whether to offer a play button.
          narrationUrl: segment.narrationAudioKey
            ? `${base}/segments/${segment.id}/narration`
            : null,
        })),
      })),
    };
  }
}
