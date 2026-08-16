import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CreateCheckoutSessionDto, ResolveSkuDto } from './dto/checkout.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CurrentUserDto } from '../../auth/dto/current-user.dto';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

/**
 * Only relative, same-origin paths are accepted for post-checkout redirects.
 * Stripe will send the buyer wherever these point, so an absolute URL here
 * would be an open redirect carrying the order id.
 */
function safeUrl(path: string | undefined, fallback: string): string {
  const candidate = path ?? fallback;
  if (!candidate.startsWith('/') || candidate.startsWith('//')) {
    throw new BadRequestException(
      'Redirect paths must be relative to this site',
    );
  }
  return `${APP_URL}${candidate}`;
}

@Controller('billing')
@UseGuards(RolesGuard)
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  /**
   * What this student would pay, including any upgrade credit. Drives the
   * checkout summary — the client never computes price itself.
   */
  @Post('resolve-sku')
  @Roles('SUPER_ADMIN', 'ADMIN', 'GUARDIAN')
  async resolveSku(@Body() dto: ResolveSkuDto) {
    return this.checkout.resolveSku(
      dto.studentProfileId,
      dto.skuType,
      dto.skuId,
    );
  }

  /** Batches with seats left, for the checkout batch picker on LIVE courses. */
  @Get('courses/:courseId/batches')
  @Roles('SUPER_ADMIN', 'ADMIN', 'GUARDIAN')
  async listOpenBatches(@Param('courseId') courseId: string) {
    return this.checkout.listOpenBatches(courseId);
  }

  @Post('checkout-session')
  @Roles('SUPER_ADMIN', 'ADMIN', 'GUARDIAN')
  async createSession(
    @Body() dto: CreateCheckoutSessionDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return this.checkout.createCheckoutSession({
      guardianUserId: user.id,
      studentProfileId: dto.studentProfileId,
      skuType: dto.skuType,
      skuId: dto.skuId,
      billingMode: dto.billingMode,
      batchId: dto.batchId,
      successUrl: safeUrl(
        dto.successPath,
        '/checkout/success?session_id={CHECKOUT_SESSION_ID}',
      ),
      cancelUrl: safeUrl(dto.cancelPath, '/checkout/cancelled'),
    });
  }

  /**
   * Polled by the success page. The webhook may not have landed yet, so the
   * client waits on this rather than assuming payment completed.
   */
  @Get('orders/:id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'GUARDIAN')
  async getOrder(@Param('id') id: string, @CurrentUser() user: CurrentUserDto) {
    return this.checkout.getOrder(id, user.id);
  }

  /** What this guardian owns, grouped by child. */
  @Get('my-entitlements')
  @Roles('SUPER_ADMIN', 'ADMIN', 'GUARDIAN')
  async myEntitlements(@CurrentUser() user: CurrentUserDto) {
    return this.checkout.listEntitlementsForGuardian(user.id);
  }

  /**
   * Redirect target for card management and instalment cancellation. Hosted by
   * Stripe deliberately — none of that should be rebuilt here.
   */
  @Post('billing-portal')
  @Roles('SUPER_ADMIN', 'ADMIN', 'GUARDIAN')
  async billingPortal(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: { returnPath?: string },
  ) {
    return this.checkout.createBillingPortalSession(
      user.id,
      safeUrl(body?.returnPath, '/parent'),
    );
  }

  @Get('orders')
  @Roles('SUPER_ADMIN', 'ADMIN', 'GUARDIAN')
  async listOrders(
    @CurrentUser() user: CurrentUserDto,
    @Query('limit') limit?: string,
  ) {
    return this.checkout.listOrders(
      user.id,
      limit ? parseInt(limit, 10) : undefined,
    );
  }
}
