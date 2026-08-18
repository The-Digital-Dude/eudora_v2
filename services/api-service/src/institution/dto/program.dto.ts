import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { CatalogStatus, DeliveryMode } from '@prisma/client';

/**
 * Minimum price for anything sellable, in minor units (cents).
 *
 * At Stripe's international rate (4.4% + $0.30) a $5 sale loses 10.4% to fees;
 * below roughly $9 the fee drag plus a single support interaction erases the
 * margin entirely. Standalone micro-courses are expected to sit at $19+.
 */
export const MIN_SELLABLE_PRICE_CENTS = 900;

export class CreateProgramDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  /** Derived from `name` when omitted. Must be unique — it is the public URL. */
  @IsOptional()
  @IsString()
  slug?: string;

  /**
   * Omit for a standalone bundle (e.g. the K-6 micro-course packs), which sits
   * outside the academic Class -> Program tree but is sold the same way.
   */
  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  outcomes?: string[];

  @IsOptional()
  @IsUUID()
  syllabusFileId?: string;

  @IsOptional()
  @IsEnum(DeliveryMode)
  deliveryMode?: DeliveryMode;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMonths?: number;

  // Money is integer minor units throughout. Billing mode is derived, not
  // stored: a monthly price present means installments are offered.
  @IsOptional()
  @IsInt()
  @Min(0)
  priceOneTimeCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceMonthlyCents?: number;

  @IsOptional()
  @IsInt()
  @Min(2)
  installmentCount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(CatalogStatus)
  status?: CatalogStatus;
}

export class UpdateProgramDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsUUID()
  classId?: string | null;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  outcomes?: string[];

  @IsOptional()
  @IsUUID()
  syllabusFileId?: string | null;

  @IsOptional()
  @IsEnum(DeliveryMode)
  deliveryMode?: DeliveryMode;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMonths?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceOneTimeCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceMonthlyCents?: number;

  @IsOptional()
  @IsInt()
  @Min(2)
  installmentCount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(CatalogStatus)
  status?: CatalogStatus;
}

export class AttachProgramCourseDto {
  @IsUUID()
  courseId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

export class ReorderProgramCoursesDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  courseIds: string[];
}
