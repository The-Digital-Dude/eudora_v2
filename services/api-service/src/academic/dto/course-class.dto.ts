import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsPositive,
  IsBoolean,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { CourseClassStatus } from '@prisma/client';

/**
 * A `CourseClass` is a batch — a dated cohort of a Course.
 *
 * `campusId` used to sit here and was dropped: multi-campus was removed in
 * `e86d9ac`, so it had been silently ignored ever since.
 */
export class CreateCourseClassDto {
  /**
   * The course this batch teaches. Optional only so pre-existing term-based
   * classes keep working; a batch with no course can never be sold, because
   * checkout looks batches up by course.
   */
  @IsUUID()
  @IsOptional()
  courseId?: string;

  /** Optional now — a rolling batch belongs to no school term. */
  @IsString()
  @IsOptional()
  termId?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsEnum(CourseClassStatus)
  @IsOptional()
  status?: CourseClassStatus;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  capacity?: number;

  @IsBoolean()
  @IsOptional()
  isOpenForEnrollment?: boolean;

  /** `endDate` is what a live purchase's access expiry tracks. */
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  /** After this the batch stops taking seats even if capacity remains. */
  @IsDateString()
  @IsOptional()
  enrollmentDeadline?: string;

  @IsUUID()
  @IsOptional()
  leadTeacherProfileId?: string;
}

export class UpdateCourseClassDto {
  @IsUUID()
  @IsOptional()
  courseId?: string;

  @IsString()
  @IsOptional()
  termId?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsEnum(CourseClassStatus)
  @IsOptional()
  status?: CourseClassStatus;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  capacity?: number;

  @IsBoolean()
  @IsOptional()
  isOpenForEnrollment?: boolean;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsDateString()
  @IsOptional()
  enrollmentDeadline?: string;

  @IsUUID()
  @IsOptional()
  leadTeacherProfileId?: string;
}
