import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { CatalogStatus, PathUnlockMode } from '@prisma/client';

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

  @IsInt()
  @IsOptional()
  estimatedHours?: number;

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
