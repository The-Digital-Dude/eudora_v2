import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ACTING_STUDENT_HEADER,
  ActingStudentService,
} from '../entitlements/acting-student.service';

import { CurrentUserDto } from '../auth/dto/current-user.dto';

/**
 * Every route here is about one learner's progress, so none of them can read
 * the caller's own student profile and stop there.
 *
 * These endpoints used to resolve `studentProfile where userId = caller`, which
 * made them unreachable for the audience the product is now built around: a
 * guardian owns no student profile, so XP, streaks, goals, badges and the
 * leaderboard all 404'd for them. A child created through the family portal has
 * no password and cannot sign in to see their own, so that data had no reader
 * at all. Resolution goes through ActingStudentService like catalog, lessons
 * and homework already do — the guardian-child link is re-checked from the
 * database on every request, and a student caller always resolves to
 * themselves regardless of what header they send.
 */
@Controller('gamification')
@UseGuards(RolesGuard)
@Roles('USER', 'GUARDIAN', 'TEACHER', 'ADMIN', 'SUPER_ADMIN')
export class GamificationController {
  constructor(
    private readonly gamificationService: GamificationService,
    private readonly actingStudent: ActingStudentService,
  ) {}

  /**
   * A null resolution means the caller is neither a student nor acting for one
   * — almost always a guardian who has not picked a child yet. That is a
   * different situation from "this learner has no profile", and saying so lets
   * the client prompt for a choice instead of showing a broken empty state.
   */
  private async resolveStudentId(
    user: CurrentUserDto,
    actingStudentId?: string,
  ): Promise<string> {
    const studentProfileId = await this.actingStudent.resolve(
      user.id,
      actingStudentId ?? null,
    );
    if (!studentProfileId) {
      throw new ForbiddenException(
        'Select which child you are viewing, or sign in as the learner',
      );
    }
    return studentProfileId;
  }

  @Get('me')
  async getMe(
    @CurrentUser() user: CurrentUserDto,
    @Headers(ACTING_STUDENT_HEADER) actingStudentId?: string,
  ) {
    return this.gamificationService.getMe(
      await this.resolveStudentId(user, actingStudentId),
    );
  }

  @Get('leaderboard')
  async getLeaderboard(
    @CurrentUser() user: CurrentUserDto,
    @Query('scope') scope?: 'class' | 'year',
    @Headers(ACTING_STUDENT_HEADER) actingStudentId?: string,
  ) {
    return this.gamificationService.getLeaderboard(
      await this.resolveStudentId(user, actingStudentId),
      scope || 'class',
    );
  }

  @Get('me/badges')
  async getBadges(
    @CurrentUser() user: CurrentUserDto,
    @Headers(ACTING_STUDENT_HEADER) actingStudentId?: string,
  ) {
    return this.gamificationService.getBadges(
      await this.resolveStudentId(user, actingStudentId),
    );
  }

  @Get('today')
  async getToday(
    @CurrentUser() user: CurrentUserDto,
    @Headers(ACTING_STUDENT_HEADER) actingStudentId?: string,
  ) {
    return this.gamificationService.getToday(
      await this.resolveStudentId(user, actingStudentId),
    );
  }
}
