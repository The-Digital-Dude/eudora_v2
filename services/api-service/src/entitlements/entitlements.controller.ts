import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { EntitlementStatus } from '@prisma/client';
import { EntitlementsService } from './entitlements.service';
import { ACTING_STUDENT_HEADER } from './acting-student.service';
import {
  GrantEntitlementDto,
  RevokeEntitlementDto,
} from './dto/entitlements.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../auth/dto/current-user.dto';

@Controller('entitlements')
@UseGuards(RolesGuard)
export class EntitlementsController {
  constructor(private readonly entitlements: EntitlementsService) {}

  /**
   * What the signed-in student may consume. Drives "owned" badges in the UI.
   *
   * Honours the acting-student header like every other entitlement-aware
   * route: without it a guardian's badges reflected whichever child
   * `resolve()` defaulted to rather than the one selected on screen, so a
   * course owned for one child looked owned for all of them.
   */
  @Get('me')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  async myEntitlements(
    @CurrentUser() user: CurrentUserDto,
    @Headers(ACTING_STUDENT_HEADER) actingStudentId?: string,
  ) {
    const { isStaff, courseIds } = await this.entitlements.entitledCourseIds(
      user.id,
      user.roles,
      actingStudentId,
    );
    return { isStaff, courseIds: [...courseIds] };
  }

  @Get('course/:courseId/access')
  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  async checkCourseAccess(
    @Param('courseId') courseId: string,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.entitlements.resolveCourseAccess(user.id, user.roles, courseId);
  }

  /** Support search across every entitlement — refunds, comps, access disputes. */
  @Get('search')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async search(
    @Query('query') query?: string,
    @Query('status') status?: EntitlementStatus,
    @Query('limit') limit?: string,
  ) {
    return this.entitlements.search({
      query,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN')
  async listForStudent(@Query('studentProfileId') studentProfileId: string) {
    if (!studentProfileId) {
      throw new BadRequestException('studentProfileId is required');
    }
    return this.entitlements.listForStudent(studentProfileId);
  }

  @Post('grant')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async grant(
    @Body() dto: GrantEntitlementDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    // Mirrors the `entitlements_exactly_one_target` CHECK constraint so a
    // malformed request is a 400 rather than a 500 from the database.
    if (!dto.programId === !dto.courseId) {
      throw new BadRequestException(
        'Provide exactly one of programId or courseId',
      );
    }
    return this.entitlements.grant({
      studentProfileId: dto.studentProfileId,
      programId: dto.programId,
      courseId: dto.courseId,
      accessExpiresAt: dto.accessExpiresAt
        ? new Date(dto.accessExpiresAt)
        : null,
      note: dto.note,
      grantedByUserId: user.id,
    });
  }

  @Post(':id/revoke')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async revoke(@Param('id') id: string, @Body() dto: RevokeEntitlementDto) {
    return this.entitlements.revoke(id, dto.note);
  }
}
