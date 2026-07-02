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
import { LiveClassesService } from './live-classes.service';
import {
  CreateLiveClassDto,
  ListLiveClassesQueryDto,
  RescheduleLiveClassDto,
} from './dto/live-class.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../auth/dto/current-user.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER')
@Controller('live-classes')
@UseGuards(RolesGuard)
export class LiveClassesController {
  constructor(private readonly liveClassesService: LiveClassesService) {}

  @Post()
  @RequirePermissions({ action: 'create', subject: 'LiveClass' })
  scheduleLiveClass(
    @Body() dto: CreateLiveClassDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.liveClassesService.scheduleLiveClass(dto, user.id);
  }

  @Get()
  @RequirePermissions({ action: 'read', subject: 'LiveClass' })
  listLiveClasses(@Query() query: ListLiveClassesQueryDto) {
    return this.liveClassesService.listLiveClasses(query);
  }

  @Get(':id')
  @RequirePermissions({ action: 'read', subject: 'LiveClass' })
  getLiveClassById(@Param('id') id: string) {
    return this.liveClassesService.getLiveClassById(id);
  }

  @Patch(':id')
  @RequirePermissions({ action: 'update', subject: 'LiveClass' })
  rescheduleLiveClass(
    @Param('id') id: string,
    @Body() dto: RescheduleLiveClassDto,
  ) {
    return this.liveClassesService.rescheduleLiveClass(id, dto);
  }

  @Patch(':id/cancel')
  @RequirePermissions({ action: 'update', subject: 'LiveClass' })
  cancelLiveClass(@Param('id') id: string) {
    return this.liveClassesService.cancelLiveClass(id);
  }

  @Patch(':id/start')
  @RequirePermissions({ action: 'update', subject: 'LiveClass' })
  startLiveClass(@Param('id') id: string) {
    return this.liveClassesService.startLiveClass(id);
  }

  @Patch(':id/end')
  @RequirePermissions({ action: 'update', subject: 'LiveClass' })
  endLiveClass(@Param('id') id: string) {
    return this.liveClassesService.endLiveClass(id);
  }
}
