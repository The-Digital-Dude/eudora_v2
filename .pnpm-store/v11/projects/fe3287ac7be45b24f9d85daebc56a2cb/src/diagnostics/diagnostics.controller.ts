import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { DiagnosticsService } from './diagnostics.service';
import { PlacementService } from './placement.service';
import {
  ListPlacementRecommendationsQueryDto,
  PlacementDecisionDto,
} from './dto/placement-decision.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../auth/dto/current-user.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
@Controller('diagnostics')
@UseGuards(RolesGuard)
export class DiagnosticsController {
  constructor(
    private readonly diagnosticsService: DiagnosticsService,
    private readonly placementService: PlacementService,
  ) {}

  // ─── Diagnostic Attempts ─────────────────────────────────────────────────────

  @Get()
  @RequirePermissions({ action: 'read', subject: 'Diagnostic' })
  listDiagnosticAttempts(@Query('studentProfileId') studentProfileId?: string) {
    return this.diagnosticsService.listDiagnosticAttempts(studentProfileId);
  }

  // ─── Placement Recommendations (registered before ':id' to avoid shadowing) ──

  @Get('placements')
  @RequirePermissions({ action: 'read', subject: 'Placement' })
  listRecommendations(@Query() query: ListPlacementRecommendationsQueryDto) {
    return this.placementService.listRecommendations(query);
  }

  @Get('placements/:id')
  @RequirePermissions({ action: 'read', subject: 'Placement' })
  getRecommendationById(@Param('id') id: string) {
    return this.placementService.getRecommendationById(id);
  }

  @Patch('placements/:id/decision')
  @RequirePermissions({ action: 'update', subject: 'Placement' })
  decideRecommendation(
    @Param('id') id: string,
    @Body() dto: PlacementDecisionDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.placementService.decideRecommendation(id, dto, user.id);
  }

  @Post(':attemptId/placement-recommendation')
  @RequirePermissions({ action: 'create', subject: 'Placement' })
  generateRecommendation() {
    return this.placementService.generateRecommendation();
  }

  @Post()
  @RequirePermissions({ action: 'create', subject: 'Diagnostic' })
  scheduleDiagnostic() {
    return this.diagnosticsService.scheduleDiagnostic();
  }

  @Get(':id')
  @RequirePermissions({ action: 'read', subject: 'Diagnostic' })
  getDiagnosticAttemptById(@Param('id') id: string) {
    return this.diagnosticsService.getDiagnosticAttemptById(id);
  }
}
