import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { CreateConceptDto, CreateCompetencyDto } from './dto/curriculum.dto';
import { CreateRubricDto } from './dto/rubric.dto';
import { RecordEvidenceDto, CreateAssessmentDto } from './dto/assessment.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
@Controller('evaluation')
@UseGuards(RolesGuard)
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  // ─── Concept Endpoints ───────────────────────────────────────────────────────

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('concepts')
  createConcept(@Body() dto: CreateConceptDto) {
    return this.evaluationService.createConcept(dto);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  @Get('concepts')
  getConcepts() {
    return this.evaluationService.getConcepts();
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  @Get('concepts/:id')
  getConceptById(@Param('id') id: string) {
    return this.evaluationService.getConceptById(id);
  }

  // ─── Competency Endpoints ────────────────────────────────────────────────────

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('competencies')
  createCompetency(@Body() dto: CreateCompetencyDto) {
    return this.evaluationService.createCompetency(dto);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  @Get('competencies')
  getCompetencies(@Query('conceptId') conceptId?: string) {
    return this.evaluationService.getCompetencies(conceptId);
  }

  // ─── Rubric Endpoints ────────────────────────────────────────────────────────

  @Post('rubrics')
  createRubric(@Body() dto: CreateRubricDto) {
    return this.evaluationService.createRubric(dto);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  @Get('rubrics/competency/:competencyId')
  getRubricByCompetency(@Param('competencyId') competencyId: string) {
    return this.evaluationService.getRubricByCompetency(competencyId);
  }

  // ─── Evidence Endpoints ──────────────────────────────────────────────────────

  @Post('evidence')
  recordEvidence(@Body() dto: RecordEvidenceDto) {
    return this.evaluationService.recordEvidence(dto);
  }

  @Get('evidence')
  getEvidence(
    @Query('studentProfileId') studentProfileId?: string,
    @Query('competencyId') competencyId?: string,
  ) {
    return this.evaluationService.getEvidence(studentProfileId, competencyId);
  }

  @Get('evidence/:id')
  getEvidenceById(@Param('id') id: string) {
    return this.evaluationService.getEvidenceById(id);
  }

  // ─── Assessment Endpoints ────────────────────────────────────────────────────

  @Post('assessments')
  evaluateEvidence(@Body() dto: CreateAssessmentDto, @CurrentUser() user: any) {
    return this.evaluationService.evaluateEvidence(dto, user.id);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  @Get('assessments/:id')
  getAssessmentById(@Param('id') id: string) {
    return this.evaluationService.getAssessmentById(id);
  }

  // ─── Mastery Sheet Endpoints ─────────────────────────────────────────────────

  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  @Get('mastery/student/:studentProfileId')
  getStudentMasterySheet(@Param('studentProfileId') studentProfileId: string) {
    return this.evaluationService.getStudentMasterySheet(studentProfileId);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  @Get('mastery/student/:studentProfileId/competency/:competencyId')
  getStudentCompetencyHistory(
    @Param('studentProfileId') studentProfileId: string,
    @Param('competencyId') competencyId: string,
  ) {
    return this.evaluationService.getStudentCompetencyHistory(
      studentProfileId,
      competencyId,
    );
  }
}
