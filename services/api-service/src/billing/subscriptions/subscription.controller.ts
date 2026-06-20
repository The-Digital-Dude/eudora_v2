import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { ChangePlanDto } from './dto/change-plan.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Roles('SUPER_ADMIN', 'ADMIN')
@Controller('billing/subscriptions')
@UseGuards(RolesGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  /**
   * Subscribe a campus to a plan.
   * Automatically creates a Stripe customer + subscription with a 14-day trial.
   */
  @Post()
  create(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionService.create(dto);
  }

  /**
   * Get the active subscription and plan details for a campus.
   */
  @Get('campus/:campusId')
  findByCampus(@Param('campusId') campusId: string) {
    return this.subscriptionService.findByCampus(campusId);
  }

  /**
   * Get a subscription by its ID.
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subscriptionService.findOne(id);
  }

  /**
   * Upgrade or downgrade a subscription to a different plan.
   * Stripe prorations are applied automatically.
   */
  @Patch(':id/change-plan')
  changePlan(@Param('id') id: string, @Body() dto: ChangePlanDto) {
    return this.subscriptionService.changePlan(id, dto);
  }

  /**
   * Cancel subscription at end of current billing period.
   */
  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.subscriptionService.cancel(id);
  }

  /**
   * Get current usage stats (students, programs) vs. plan limits.
   */
  @Get('campus/:campusId/usage')
  getUsageStats(@Param('campusId') campusId: string) {
    return this.subscriptionService.getUsageStats(campusId);
  }
}
