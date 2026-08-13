import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsPositive,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { CourseClassStatus } from '@prisma/client';

export class CreateCourseClassDto {
  @IsString()
  @IsNotEmpty()
  termId: string;

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

  @IsUUID()
  @IsOptional()
  campusId?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  capacity?: number;

  @IsBoolean()
  @IsOptional()
  isOpenForEnrollment?: boolean;
}

export class UpdateCourseClassDto {
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

  @IsUUID()
  @IsOptional()
  campusId?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  capacity?: number;

  @IsBoolean()
  @IsOptional()
  isOpenForEnrollment?: boolean;
}
