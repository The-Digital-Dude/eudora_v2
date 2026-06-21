import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GradebookService } from './gradebook.service';
import { GradeCalculationService } from './grade-calculation.service';
import { CreateManualGradeDto, UpdateGradeEntryDto, BulkUpsertGradesDto } from './dto/gradebook.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
@Controller('gradebook')
@UseGuards(RolesGuard)
export class GradebookController {
  constructor(
    private readonly gradebookService: GradebookService,
    private readonly gradeCalculationService: GradeCalculationService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('manual-entry')
  @RequirePermissions({ action: 'create', subject: 'Gradebook' })
  createManualGrade(@Body() dto: CreateManualGradeDto, @CurrentUser() user: any) {
    return this.gradebookService.createManualGrade(dto, user.id);
  }

  @Patch('entries/:id')
  @RequirePermissions({ action: 'update', subject: 'Gradebook' })
  updateGradeEntry(
    @Param('id') id: string,
    @Body() dto: UpdateGradeEntryDto,
    @CurrentUser() user: any,
  ) {
    return this.gradebookService.updateGradeEntry(id, dto, user.id);
  }

  @Delete('entries/:id')
  @RequirePermissions({ action: 'delete', subject: 'Gradebook' })
  deleteGradeEntry(@Param('id') id: string) {
    return this.gradebookService.deleteGradeEntry(id);
  }

  @Post('entries/bulk')
  @RequirePermissions({ action: 'create', subject: 'Gradebook' })
  bulkUpsertGrades(@Body() dto: BulkUpsertGradesDto, @CurrentUser() user: any) {
    return this.gradebookService.bulkUpsertGrades(dto, user.id);
  }

  @Get('course-class/:courseClassId')
  @RequirePermissions({ action: 'read', subject: 'Gradebook' })
  getGradebookForClass(
    @Param('courseClassId') courseClassId: string,
    @Query('termId') termId?: string,
  ) {
    return this.gradebookService.getGradebookForClass(courseClassId, termId);
  }

  @Get('class-section/:classSectionId')
  @RequirePermissions({ action: 'read', subject: 'Gradebook' })
  getGradebookForClassSection(
    @Param('classSectionId') classSectionId: string,
    @Query('termId') termId?: string,
  ) {
    return this.gradebookService.getGradebookForClassSection(classSectionId, termId);
  }

  @Get('student/:studentProfileId')
  @RequirePermissions({ action: 'read', subject: 'Gradebook' })
  getStudentGrades(
    @Param('studentProfileId') studentProfileId: string,
    @Query('termId') termId?: string,
  ) {
    return this.gradebookService.getStudentGrades(studentProfileId, termId);
  }

  @Get('student/:studentProfileId/summary')
  @RequirePermissions({ action: 'read', subject: 'Gradebook' })
  getStudentSummary(
    @Param('studentProfileId') studentProfileId: string,
    @Query('termId') termId?: string,
  ) {
    return this.gradeCalculationService.calculateStudentAverages(studentProfileId, termId);
  }

  @Get('course-class/:courseClassId/summary')
  @RequirePermissions({ action: 'read', subject: 'Gradebook' })
  getClassSummary(
    @Param('courseClassId') courseClassId: string,
    @Query('termId') termId?: string,
  ) {
    return this.gradeCalculationService.getClassGradebookSummary(courseClassId, termId);
  }

  @Post('sync')
  @RequirePermissions({ action: 'update', subject: 'Gradebook' })
  syncGrades() {
    return this.gradebookService.syncAllSourceGrades();
  }
}
