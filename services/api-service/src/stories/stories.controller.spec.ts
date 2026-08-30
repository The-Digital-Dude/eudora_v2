import { ForbiddenException } from '@nestjs/common';

import { StoriesController } from './stories.controller';
import type { CurrentUserDto } from '../auth/dto/current-user.dto';

/**
 * The read gate, which is the only reason `library/:id` exists as a route of
 * its own. `GET /stories/:id` beside it is staff-only, so without these the
 * library would list stories nobody could open — which is exactly the state
 * this route was added to fix.
 */
describe('StoriesController — library read gate', () => {
  const child = { id: 'user-1', roles: ['USER'] } as CurrentUserDto;

  const build = (
    access: { id: string; status: string; moduleItemId: string | null },
    canAccessModuleItem = jest.fn().mockResolvedValue(false),
  ) => {
    const stories: any = {
      accessForStory: jest.fn().mockResolvedValue(access),
      findOne: jest.fn().mockResolvedValue({ id: access.id, title: 'Luna' }),
    };
    const entitlements: any = { canAccessModuleItem };
    const controller = new StoriesController(
      stories,
      {} as any,
      {} as any,
      {} as any,
      entitlements,
      {} as any,
    );
    return { controller, stories, entitlements };
  };

  it('opens a published story for a child who owns nothing', async () => {
    const { controller, stories, entitlements } = build({
      id: 'story-1',
      status: 'PUBLISHED',
      moduleItemId: null,
    });

    await expect(controller.libraryStory('story-1', child)).resolves.toEqual({
      id: 'story-1',
      title: 'Luna',
    });
    // Published is free: the entitlement check must not even be consulted,
    // or the library would silently require a purchase.
    expect(entitlements.canAccessModuleItem).not.toHaveBeenCalled();
    expect(stories.findOne).toHaveBeenCalledWith('story-1');
  });

  it('refuses an unpublished story that belongs to no course', async () => {
    const { controller, stories } = build({
      id: 'story-2',
      status: 'DRAFT',
      moduleItemId: null,
    });

    await expect(controller.libraryStory('story-2', child)).rejects.toThrow(
      ForbiddenException,
    );
    expect(stories.findOne).not.toHaveBeenCalled();
  });

  it('refuses a draft in a course the child has not bought', async () => {
    const { controller, stories } = build({
      id: 'story-3',
      status: 'DRAFT',
      moduleItemId: 'item-1',
    });

    await expect(controller.libraryStory('story-3', child)).rejects.toThrow(
      ForbiddenException,
    );
    expect(stories.findOne).not.toHaveBeenCalled();
  });

  it('opens a draft in a course the child has bought', async () => {
    const { controller, entitlements } = build(
      { id: 'story-4', status: 'DRAFT', moduleItemId: 'item-1' },
      jest.fn().mockResolvedValue(true),
    );

    await expect(
      controller.libraryStory('story-4', child, 'student-9'),
    ).resolves.toBeDefined();
    // The acting-student header has to reach the entitlement check, or a
    // guardian reading with their child is judged on their own entitlements.
    expect(entitlements.canAccessModuleItem).toHaveBeenCalledWith(
      'user-1',
      ['USER'],
      'item-1',
      'student-9',
    );
  });
});
