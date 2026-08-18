import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  CatalogStatus,
  DeliveryMode,
  GradeBand,
  PathUnlockMode,
} from '@prisma/client';

export class CreateLearningSubjectDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class UpdateLearningSubjectDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsString()
  @IsOptional()
  status?: string;
}

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  learningSubjectId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsOptional()
  description?: string;

  /** Content effort. Distinct from `durationWeeks` (calendar length). */
  @IsInt()
  @IsOptional()
  estimatedHours?: number;

  @IsInt()
  @IsOptional()
  durationWeeks?: number;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  /**
   * The only thing that categorises a standalone micro-course, which belongs
   * to no Program and so has no Class to derive a level from. Drives the
   * public /kids browse filter.
   */
  @IsEnum(GradeBand)
  @IsOptional()
  gradeBand?: GradeBand;

  @IsEnum(DeliveryMode)
  @IsOptional()
  deliveryMode?: DeliveryMode;

  // Null/omitted = not sold a la carte; reachable only via a Program.
  @IsInt()
  @Min(0)
  @IsOptional()
  priceOneTimeCents?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  priceMonthlyCents?: number;

  @IsInt()
  @Min(2)
  @IsOptional()
  installmentCount?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(CatalogStatus)
  @IsOptional()
  status?: CatalogStatus;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class UpdateCourseDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  estimatedHours?: number;

  @IsInt()
  @IsOptional()
  durationWeeks?: number;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @IsEnum(GradeBand)
  @IsOptional()
  gradeBand?: GradeBand;

  @IsEnum(DeliveryMode)
  @IsOptional()
  deliveryMode?: DeliveryMode;

  @IsInt()
  @Min(0)
  @IsOptional()
  priceOneTimeCents?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  priceMonthlyCents?: number;

  @IsInt()
  @Min(2)
  @IsOptional()
  installmentCount?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(CatalogStatus)
  @IsOptional()
  status?: CatalogStatus;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class CreateLearningPathDto {
  @IsString()
  @IsNotEmpty()
  learningSubjectId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PathUnlockMode)
  @IsOptional()
  unlockMode?: PathUnlockMode;

  @IsEnum(CatalogStatus)
  @IsOptional()
  status?: CatalogStatus;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class UpdateLearningPathDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PathUnlockMode)
  @IsOptional()
  unlockMode?: PathUnlockMode;

  @IsEnum(CatalogStatus)
  @IsOptional()
  status?: CatalogStatus;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class AddCourseToPathDto {
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;
}

export class ReorderPathCoursesDto {
  courses: { courseId: string; sortOrder: number }[];
}

export class AttachCourseTeacherDto {
  @IsString()
  @IsNotEmpty()
  teacherProfileId: string;

  /** LEAD or ASSISTANT. Defaults to LEAD server-side. */
  @IsIn(['LEAD', 'ASSISTANT'])
  @IsOptional()
  role?: string;
}
