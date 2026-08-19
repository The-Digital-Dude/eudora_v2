import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { TeacherApplicationStatus } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../auth/dto/current-user.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { MAX_RESUME_BYTES } from '../common/files/pdf-upload.validator';
import { TeacherApplicationsService } from './teacher-applications.service';
import {
  CreateTeacherApplicationDto,
  ReviewTeacherApplicationDto,
} from './dto/teacher-application.dto';

@Controller('teacher-applications')
export class TeacherApplicationsController {
  constructor(private readonly service: TeacherApplicationsService) {}

  /**
   * Apply to teach. Authenticated, so every stored CV is attributable to an
   * account — an anonymous upload endpoint is free object storage on our bill
   * with nobody to trace it to.
   *
   * Two per hour: this writes a file, and one application is all anyone needs.
   */
  @Post()
  @Throttle({ default: { ttl: 3_600_000, limit: 2 } })
  @UseInterceptors(
    FileInterceptor('resume', {
      // Rejected by Multer before the body reaches us, so an oversized upload
      // is not buffered in full first. The validator re-checks the size for
      // callers that reach the service by another route.
      limits: { fileSize: MAX_RESUME_BYTES },
    }),
  )
  async apply(
    @Body() dto: CreateTeacherApplicationDto,
    @UploadedFile() resume: any,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.service.apply(user.id, dto, resume);
  }

  /** The applicant's own status. Returns null when they have not applied. */
  @Get('me')
  async findMine(@CurrentUser() user: CurrentUserDto) {
    return this.service.findMine(user.id);
  }

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: TeacherApplicationStatus,
  ) {
    return this.service.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });
  }

  /**
   * The CV itself. Admin-only, and never a public URL: under S3 this redirects
   * to a five-minute signed URL, under local storage it streams the bytes.
   *
   * `inline` rather than `attachment` so a reviewer reads it in the browser
   * instead of accumulating strangers' CVs in their Downloads folder.
   */
  @Get(':id/resume')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async resume(@Param('id') id: string, @Res() res: Response) {
    const file = await this.service.readResume(id);

    if (file.kind === 'redirect') {
      return res.redirect(file.url);
    }

    res.setHeader('Content-Type', file.mimetype);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.originalName)}"`,
    );
    return res.send(file.body);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  /**
   * Approve or reject. This is the only path that grants TEACHER — the role
   * reaches student names, attendance and grades, so it is a human decision
   * every time and never a consequence of submitting a form.
   */
  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async review(
    @Param('id') id: string,
    @Body() dto: ReviewTeacherApplicationDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.service.review(id, user.id, dto);
  }
}
