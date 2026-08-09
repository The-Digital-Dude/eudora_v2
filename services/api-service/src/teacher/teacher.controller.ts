import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import {
  UpdateMyTeacherProfileDto,
  UpdateTeacherDto,
} from './dto/update-teacher.dto';
import { AssignClassDto } from './dto/assign-class.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../auth/dto/current-user.dto';
import { TeacherStatus } from '@prisma/client';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Roles('SUPER_ADMIN', 'ADMIN')
@Controller('teacher-profiles')
@UseGuards(RolesGuard)
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Roles('TEACHER')
  @Get('me')
  @RequirePermissions({ action: 'read', subject: 'Teacher' })
  async getMe(@CurrentUser() user: CurrentUserDto) {
    return this.teacherService.findByUserId(user.id);
  }

  // No `@RequirePermissions` here, deliberately — a teacher doesn't hold
  // `update:Teacher` (that's an admin permission for editing other
  // teachers), and shouldn't need to for their own profile.
  @Roles('TEACHER')
  @Patch('me')
  async updateMe(
    @Body() dto: UpdateMyTeacherProfileDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.teacherService.updateMyProfile(user.id, dto);
  }

  @Post()
  @RequirePermissions({ action: 'create', subject: 'Teacher' })
  async create(@Body() dto: CreateTeacherDto) {
    return this.teacherService.create(dto);
  }

  @Get()
  @RequirePermissions({ action: 'read', subject: 'Teacher' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: TeacherStatus,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.teacherService.findAll(pageNum, limitNum, status, search);
  }

  @Get(':id')
  @RequirePermissions({ action: 'read', subject: 'Teacher' })
  async findOne(@Param('id') id: string) {
    return this.teacherService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions({ action: 'update', subject: 'Teacher' })
  async update(@Param('id') id: string, @Body() dto: UpdateTeacherDto) {
    return this.teacherService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({ action: 'delete', subject: 'Teacher' })
  async remove(@Param('id') id: string) {
    return this.teacherService.delete(id);
  }

  @Post(':id/classes')
  @RequirePermissions({ action: 'manage', subject: 'Teacher' })
  async assignClass(@Param('id') id: string, @Body() dto: AssignClassDto) {
    return this.teacherService.assignClass(id, dto);
  }

  @Delete(':id/classes/:classSectionId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions({ action: 'manage', subject: 'Teacher' })
  async removeClass(
    @Param('id') id: string,
    @Param('classSectionId') classSectionId: string,
  ) {
    return this.teacherService.removeClass(id, classSectionId);
  }
}
