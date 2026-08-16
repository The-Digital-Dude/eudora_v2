import { IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { BillingMode } from '@prisma/client';

export class ResolveSkuDto {
  @IsUUID()
  studentProfileId: string;

  @IsIn(['PROGRAM', 'COURSE'])
  skuType: 'PROGRAM' | 'COURSE';

  @IsUUID()
  skuId: string;
}

export class CreateCheckoutSessionDto {
  @IsUUID()
  studentProfileId: string;

  @IsIn(['PROGRAM', 'COURSE'])
  skuType: 'PROGRAM' | 'COURSE';

  @IsUUID()
  skuId: string;

  @IsEnum(BillingMode)
  billingMode: BillingMode;

  /** Required when the course is delivered LIVE — a seat in a dated cohort. */
  @IsOptional()
  @IsUUID()
  courseClassId?: string;

  /**
   * Relative paths only — validated in the controller. Accepting an absolute
   * URL here would let a crafted request bounce a buyer to an attacker's page
   * carrying the order id.
   */
  @IsOptional()
  @IsString()
  successPath?: string;

  @IsOptional()
  @IsString()
  cancelPath?: string;
}
