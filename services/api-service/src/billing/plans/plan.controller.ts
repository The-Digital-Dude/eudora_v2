import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PlanService } from './plan.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Roles('SUPER_ADMIN')
@Controller('billing/plans')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  /**
   * Public endpoint — lists all active, public-facing plans
   * (for pricing page, checkout)
   */
  @Public()
  @Get('public')
  findAllPublic() {
    return this.planService.findAllPublic();
  }

  /**
   * Admin endpoint — lists all plans including inactive/private ones
   */
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get()
  findAll() {
    return this.planService.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.planService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePlanDto) {
    return this.planService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.planService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.planService.remove(id);
  }
}
