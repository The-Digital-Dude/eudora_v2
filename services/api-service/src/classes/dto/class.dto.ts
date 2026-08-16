import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CatalogStatus } from '@prisma/client';

/**
 * `Class` outgrew the shared `CreateLookupDto`/`UpdateLookupDto` when it
 * absorbed the old `Level` model and became the taxonomy master.
 *
 * Those DTOs still validate `status` as 'active' | 'inactive' | 'archived' for
 * `AssessmentType`, while Class moved to `CatalogStatus`. The mismatch made
 * status unsettable entirely: 'PUBLISHED' failed DTO validation, and 'active'
 * passed the DTO only to be rejected by the service. Splitting the DTOs fixes
 * that without disturbing AssessmentType.
 */
export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** Controls display order — grade levels are inherently ordered. */
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  /** Defaults to DRAFT so a half-built class never reaches the public catalog. */
  @IsOptional()
  @IsEnum(CatalogStatus)
  status?: CatalogStatus;
}

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsEnum(CatalogStatus)
  status?: CatalogStatus;
}
