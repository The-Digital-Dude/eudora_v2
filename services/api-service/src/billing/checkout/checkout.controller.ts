import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CreatePortalDto } from './dto/create-portal.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Roles('SUPER_ADMIN', 'ADMIN')
@Controller('billing/checkout')
@UseGuards(RolesGuard)
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  /**
   * Start a hosted Stripe Checkout session for a campus + plan.
   * Returns `{ url }` to redirect the customer to Stripe's payment page.
   */
  @Post()
  createCheckout(@Body() dto: CreateCheckoutDto) {
    return this.checkoutService.createCheckoutSession(dto);
  }

  /**
   * Open the Stripe Billing Portal for a campus to manage payment methods,
   * invoices and cancellation. Returns `{ url }`.
   */
  @Post('portal')
  createPortal(@Body() dto: CreatePortalDto) {
    return this.checkoutService.createPortalSession(dto);
  }
}
