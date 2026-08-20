import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TeacherApplicationStatus } from '@prisma/client';

/**
 * Arrives as multipart/form-data alongside the CV, so every field is a string
 * on the wire — @Type(() => Number) is what turns `yearsExperience` back into
 * one before @IsInt sees it.
 */
export class CreateTeacherApplicationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  specialization?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  // Not a real ceiling so much as a typo guard: "2015" in a years field.
  @Max(70)
  yearsExperience?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;
}

/**
 * A reviewer's decision. PENDING is absent deliberately — an application
 * cannot be moved back to "never looked at".
 */
export class ReviewTeacherApplicationDto {
  @IsEnum(TeacherApplicationStatus)
  status: TeacherApplicationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewNotes?: string;

  /**
   * Set on the teacher profile that approval creates. Ignored for any other
   * decision.
   */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  employeeCode?: string;
}
