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
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Roles('SUPER_ADMIN', 'ADMIN')
@Controller('billing/subscriptions')
@UseGuards(RolesGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  /**
   * Subscribe a campus to a FREE plan directly.
   * Paid plans must go through the Checkout session endpoint below, since they
   * require a payment method.
   */
  @Post()
  create(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionService.create(dto);
  }

  /**
   * Start a Stripe Checkout session for a paid plan.
   * Returns `{ sessionId, url }` — redirect the browser to `url`. The
   * subscription is created locally once Stripe confirms via webhook.
   */
  @Post('checkout-session')
  createCheckoutSession(@Body() dto: CreateCheckoutSessionDto) {
    return this.subscriptionService.createCheckoutSession(dto);
  }

  /**
   * Open the Stripe Billing Portal for a campus, where admins can update their
   * card, download invoices, or cancel. Returns `{ url }` to redirect to.
   */
  @Post('campus/:campusId/portal-session')
  createPortalSession(@Param('campusId') campusId: string) {
    return this.subscriptionService.createPortalSession(campusId);
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
