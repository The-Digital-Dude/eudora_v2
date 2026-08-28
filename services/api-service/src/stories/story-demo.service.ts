import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Decides what the public demo is allowed to expose.
 *
 * Separated from the controller so the "is this actually the demo story?"
 * question has exactly one answer used by every public route. The failure mode
 * this prevents is a future route being added that serves media without asking,
 * which would turn the demo into an unauthenticated read of paid content.
 *
 * Every check returns 404 rather than 403 on a miss: a stranger asking about a
 * paid story should not learn that it exists.
 */
@Injectable()
export class StoryDemoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The story currently on public offer, or null.
   *
   * If several are flagged, the most recently updated wins — that is the one
   * someone was last working on, and it makes swapping the demo a matter of
   * publishing the new one rather than remembering to unpublish the old.
   */
  async currentStoryId(): Promise<string | null> {
    const story = await this.prisma.story.findFirst({
      where: { isPublicDemo: true },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });
    return story?.id ?? null;
  }

  async assertSegmentIsDemo(segmentId: string): Promise<void> {
    const segment = await this.prisma.storySegment.findUnique({
      where: { id: segmentId },
      select: {
        chapter: { select: { story: { select: { isPublicDemo: true } } } },
      },
    });
    if (!segment?.chapter.story.isPublicDemo) {
      throw new NotFoundException('Not found');
    }
  }

  async assertAssetIsDemo(assetId: string): Promise<void> {
    const asset = await this.prisma.storyAsset.findUnique({
      where: { id: assetId },
      select: { story: { select: { isPublicDemo: true } } },
    });
    if (!asset?.story.isPublicDemo) {
      throw new NotFoundException('Not found');
    }
  }
}
