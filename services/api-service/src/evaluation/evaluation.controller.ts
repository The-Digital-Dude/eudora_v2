import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { CreateConceptDto, UpdateConceptDto } from './dto/curriculum.dto';
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
  getConcepts(@Query('courseId') courseId?: string) {
    return this.evaluationService.getConcepts(courseId);
  }

  @Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')
  @Get('concepts/:id')
  getConceptById(@Param('id') id: string) {
    return this.evaluationService.getConceptById(id);
  }

  @Roles('SUPER_ADMIN', 'ADMIN')
  @Patch('concepts/:id')
  updateConcept(@Param('id') id: string, @Body() dto: UpdateConceptDto) {
    return this.evaluationService.updateConcept(id, dto);
  }
}
