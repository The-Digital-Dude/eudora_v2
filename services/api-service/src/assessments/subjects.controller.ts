import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateLookupDto,
  LookupQueryDto,
  UpdateLookupDto,
} from './dto/assessments.dto';
import { SubjectsService } from './subjects.service';
import { Roles } from '../auth/decorators/roles.decorator';

@Roles('SUPER_ADMIN', 'ADMIN')
@Controller('subjects')
@UseGuards(CsrfGuard, PermissionsGuard)
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  @RequirePermissions({ action: 'read', subject: 'Assessment' })
  async listSubjects(@Query() query: LookupQueryDto) {
    return this.subjectsService.listSubjects(query);
  }

  @Post()
  @RequirePermissions({ action: 'manage', subject: 'Assessment' })
  async createSubject(
    @Body() body: CreateLookupDto,
    @CurrentUser() user: any,
  ) {
    return this.subjectsService.createSubject(body, user.id);
  }

  @Put(':id')
  @RequirePermissions({ action: 'manage', subject: 'Assessment' })
  async updateSubject(
    @Param('id') id: string,
    @Body() body: UpdateLookupDto,
    @CurrentUser() user: any,
  ) {
    return this.subjectsService.updateSubject(id, body, user.id);
  }
}
