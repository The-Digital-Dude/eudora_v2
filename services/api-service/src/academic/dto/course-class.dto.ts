import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
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
}
