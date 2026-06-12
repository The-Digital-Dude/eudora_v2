import {
  Controller,
  Post,
  Req,
  Headers,
  BadRequestException,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import Stripe from 'stripe';
import { StripeWebhookService } from './stripe-webhook.service';
import { Public } from '../../auth/decorators/public.decorator';

/**
 * Stripe Webhook Controller
 *
 * IMPORTANT: This endpoint MUST receive the raw request body (Buffer) for
 * Stripe signature validation. See BillingModule where we register the raw
 * body middleware specifically for this path.
 */
@Controller('billing/webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(private readonly webhookService: StripeWebhookService) {}

  @Public()
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody as Buffer;
    if (!rawBody) {
      throw new BadRequestException(
        'Raw body not available. Ensure rawBody middleware is applied.',
      );
    }

    let event: any;
    try {
      event = this.webhookService.constructEvent(rawBody, signature);
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    await this.webhookService.handleEvent(event);
    return { received: true };
  }
}
