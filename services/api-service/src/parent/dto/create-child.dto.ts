import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Gender } from '@prisma/client';

export class CreateChildDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName: string;

  /** Required by `StudentProfile`, and the basis for age-appropriate content. */
  @IsDateString()
  birthDate: string;

  /** The child's grade level. */
  @IsOptional()
  @IsUUID()
  classId?: string;

  /**
   * Not asked for in the guardian-facing form — it is not needed to deliver a
   * course, and every field between a parent and paying costs conversions.
   * Defaults to OTHER.
   */
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}
