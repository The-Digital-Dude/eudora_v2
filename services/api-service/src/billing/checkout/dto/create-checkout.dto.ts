import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUrl } from 'class-validator';
import { PlanInterval } from '@prisma/client';

export class CreateCheckoutDto {
  @IsString()
  @IsNotEmpty()
  campusId: string;

  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsEnum(PlanInterval)
  @IsOptional()
  interval?: PlanInterval;

  /**
   * Optional override for where Stripe redirects after a successful payment.
   * Falls back to FRONTEND_URL when omitted.
   */
  @IsUrl({ require_tld: false })
  @IsOptional()
  successUrl?: string;

  /**
   * Optional override for where Stripe redirects when the customer cancels.
   * Falls back to FRONTEND_URL when omitted.
   */
  @IsUrl({ require_tld: false })
  @IsOptional()
  cancelUrl?: string;
}
