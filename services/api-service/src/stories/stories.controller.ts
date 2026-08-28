import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { StoriesService } from './stories.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { ACTING_STUDENT_HEADER } from '../entitlements/acting-student.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../auth/dto/current-user.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
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
 * Authoring is staff-only; reading is gated by the same entitlement check
 * every other piece of course content goes through. A story is content a family
 * bought, so it must not be reachable just because its id was guessed.
 */
@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
@Controller('stories')
@UseGuards(RolesGuard)
export class StoriesController {
  constructor(
    private readonly stories: StoriesService,
    private readonly entitlements: EntitlementsService,
  ) {}

  // ─── Read ─────────────────────────────────────────────────────────────────

  /**
   * The player's entry point: the module item is what the catalog links to, and
   * what the entitlement check is expressed in terms of.
   */
  @Get('by-module-item/:moduleItemId')
  async readByModuleItem(
    @Param('moduleItemId') moduleItemId: string,
    @CurrentUser() user: CurrentUserDto,
    @Headers(ACTING_STUDENT_HEADER) actingStudentId?: string,
  ) {
    const allowed = await this.entitlements.canAccessModuleItem(
      user.id,
      user.roles,
      moduleItemId,
      actingStudentId,
    );
    if (!allowed) {
      throw new ForbiddenException('This story is not part of your courses');
    }
    return this.stories.findByModuleItem(moduleItemId);
  }

  /** Staff-only by id, for the authoring screens. */
  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  findOne(@Param('id') id: string) {
    return this.stories.findOne(id);
  }

  // ─── Authoring ────────────────────────────────────────────────────────────

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  create(@Body() dto: CreateStoryDto) {
    return this.stories.create(dto);
  }

  @Post('import')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  import(@Body() dto: ImportStoryDto) {
    return this.stories.import(dto);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  update(@Param('id') id: string, @Body() dto: UpdateStoryDto) {
    return this.stories.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  remove(@Param('id') id: string) {
    return this.stories.remove(id);
  }

  @Post(':id/chapters')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  addChapter(@Param('id') id: string, @Body() dto: CreateChapterDto) {
    return this.stories.addChapter(id, dto);
  }

  @Post(':id/chapters/reorder')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  reorderChapters(@Param('id') id: string, @Body() dto: ReorderDto) {
    return this.stories.reorderChapters(id, dto);
  }

  @Patch('chapters/:chapterId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  updateChapter(
    @Param('chapterId') chapterId: string,
    @Body() dto: UpdateChapterDto,
  ) {
    return this.stories.updateChapter(chapterId, dto);
  }

  @Delete('chapters/:chapterId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  removeChapter(@Param('chapterId') chapterId: string) {
    return this.stories.removeChapter(chapterId);
  }

  @Post('chapters/:chapterId/segments')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  addSegment(
    @Param('chapterId') chapterId: string,
    @Body() dto: CreateSegmentDto,
  ) {
    return this.stories.addSegment(chapterId, dto);
  }

  @Post('chapters/:chapterId/segments/reorder')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  reorderSegments(
    @Param('chapterId') chapterId: string,
    @Body() dto: ReorderDto,
  ) {
    return this.stories.reorderSegments(chapterId, dto);
  }

  @Patch('segments/:segmentId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  updateSegment(
    @Param('segmentId') segmentId: string,
    @Body() dto: UpdateSegmentDto,
  ) {
    return this.stories.updateSegment(segmentId, dto);
  }

  @Delete('segments/:segmentId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  removeSegment(@Param('segmentId') segmentId: string) {
    return this.stories.removeSegment(segmentId);
  }

  @Post(':id/assets')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  addAsset(@Param('id') id: string, @Body() dto: CreateAssetDto) {
    return this.stories.addAsset(id, dto);
  }

  @Delete('assets/:assetId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  removeAsset(@Param('assetId') assetId: string) {
    return this.stories.removeAsset(assetId);
  }

  @Post(':id/characters')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  addCharacter(@Param('id') id: string, @Body() dto: CreateCharacterDto) {
    return this.stories.addCharacter(id, dto);
  }

  @Delete('characters/:characterId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
  removeCharacter(@Param('characterId') characterId: string) {
    return this.stories.removeCharacter(characterId);
  }
}
