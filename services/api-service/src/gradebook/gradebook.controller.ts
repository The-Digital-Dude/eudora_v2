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
import {
  CreateManualGradeDto,
  UpdateGradeEntryDto,
  BulkUpsertGradesDto,
} from './dto/gradebook.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../auth/dto/current-user.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { GuardianAccessService } from '../family/guardian-access.service';

@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
@Controller('gradebook')
@UseGuards(RolesGuard)
export class GradebookController {
  constructor(
    private readonly gradebookService: GradebookService,
    private readonly gradeCalculationService: GradeCalculationService,
    private readonly prisma: PrismaService,
    private readonly guardianAccessService: GuardianAccessService,
  ) {}

  @Post('manual-entry')
  @RequirePermissions({ action: 'create', subject: 'Gradebook' })
  createManualGrade(
    @Body() dto: CreateManualGradeDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.gradebookService.createManualGrade(dto, user.id);
  }

  @Patch('entries/:id')
  @RequirePermissions({ action: 'update', subject: 'Gradebook' })
  updateGradeEntry(
    @Param('id') id: string,
    @Body() dto: UpdateGradeEntryDto,
    @CurrentUser() user: CurrentUserDto,
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
  bulkUpsertGrades(
    @Body() dto: BulkUpsertGradesDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.gradebookService.bulkUpsertGrades(dto, user.id);
  }

  @Get('batch/:batchId')
  @RequirePermissions({ action: 'read', subject: 'Gradebook' })
  getGradebookForClass(
    @Param('batchId') batchId: string,
    @Query('termId') termId?: string,
  ) {
    return this.gradebookService.getGradebookForClass(batchId, termId);
  }

  @Get('class-section/:classSectionId')
  @RequirePermissions({ action: 'read', subject: 'Gradebook' })
  getGradebookForClassSection(
    @Param('classSectionId') classSectionId: string,
    @Query('termId') termId?: string,
  ) {
    return this.gradebookService.getGradebookForClassSection(
      classSectionId,
      termId,
    );
  }

  @Get('student/:studentProfileId')
  @RequirePermissions({ action: 'read', subject: 'Gradebook' })
  async getStudentGrades(
    @Param('studentProfileId') studentProfileId: string,
    @CurrentUser() user: CurrentUserDto,
    @Query('termId') termId?: string,
  ) {
    await this.guardianAccessService.assertCanAccessStudentRecord(
      user,
      studentProfileId,
    );
    return this.gradebookService.getStudentGrades(studentProfileId, termId);
  }

  @Get('student/:studentProfileId/summary')
  @RequirePermissions({ action: 'read', subject: 'Gradebook' })
  async getStudentSummary(
    @Param('studentProfileId') studentProfileId: string,
    @CurrentUser() user: CurrentUserDto,
    @Query('termId') termId?: string,
  ) {
    await this.guardianAccessService.assertCanAccessStudentRecord(
      user,
      studentProfileId,
    );
    return this.gradeCalculationService.calculateStudentAverages(
      studentProfileId,
      termId,
    );
  }

  @Get('batch/:batchId/summary')
  @RequirePermissions({ action: 'read', subject: 'Gradebook' })
  getClassSummary(
    @Param('batchId') batchId: string,
    @Query('termId') termId?: string,
  ) {
    return this.gradeCalculationService.getClassGradebookSummary(
      batchId,
      termId,
    );
  }

  @Post('sync')
  @RequirePermissions({ action: 'update', subject: 'Gradebook' })
  syncGrades() {
    return this.gradebookService.syncAllSourceGrades();
  }
}
