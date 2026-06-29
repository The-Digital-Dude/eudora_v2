import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class CreatePortalDto {
  @IsString()
  @IsNotEmpty()
  campusId: string;

  /**
   * Where Stripe returns the customer after they leave the billing portal.
   * Falls back to FRONTEND_URL when omitted.
   */
  @IsUrl({ require_tld: false })
  @IsOptional()
  returnUrl?: string;
}
